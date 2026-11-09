// The publisher keys a widget package may be signed with (Phase 6a), and the revoked ones.
//
// - The owner's key is built into the app (`OWNER_KEY`): a minisign key of its own, never the updater's (a leak of one must not
//   compromise the other). It is empty until the owner generates it and adds the public key here (docs/security.md, "Widget
//   publisher keys"); until then the slot is "not set up" and trusts nothing.
// - Themely's key (`THEMELY_KEY`) is a slot that stays disabled until Themely signs packages.
// - User keys are added, named, in the app's Settings window only, through the app's own commands (src-tauri/src/commands.rs
//   `trust_widget_key`, gated by the settings window's capability like every Settings write): never from an import or install
//   prompt, and never over HTTP (`/api/widget-keys` answers writes with 403). They are kept in DATA_DIR/widget-keys.json, outside
//   any package, with the built-in keys the user removed ("Remove key" works on every trusted key, Gate 0 answer 4).
// - The revoke list (`widget-keys-revoked.json`, built in) ships with app updates only, with no network fetch (Gate 0 answer 4).
//   A key on it refuses everything it signed, whoever trusts it.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use serde_json::{json, Value};

use crate::widget_sign::{Key, Keyring, Signer};

/// The owner's public key (minisign's key line), or `None` while the owner has not set it up.
pub const OWNER_KEY: Option<&str> = None;
/// Themely's public key, once Themely signs packages; `THEMELY_ENABLED` turns the slot on.
pub const THEMELY_KEY: Option<&str> = None;
pub const THEMELY_ENABLED: bool = false;
/// The revoke list for the owner's and Themely's keys, shipped with the app.
const REVOKED: &str = include_str!("widget-keys-revoked.json");

/// The store's file in the data folder.
pub const FILE: &str = "widget-keys.json";
/// At most this many user keys; a name has 1 to `NAME_MAX` characters.
pub const USER_KEYS_MAX: usize = 32;
pub const NAME_MAX: usize = 40;
const OWNER: &str = "owner";
const THEMELY: &str = "themely";

/// Every write to a store file, in this process (the app's commands and the server run in one).
static WRITE: Mutex<()> = Mutex::new(());

/// One key as Settings shows it.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct KeyView {
    /// `owner`, `themely`, or a user key's fingerprint: what "Remove key" names.
    pub id: String,
    /// `owner`, `themely` or `user`.
    pub kind: &'static str,
    pub name: String,
    /// minisign's key id; `None` for an empty slot.
    pub fingerprint: Option<String>,
    /// `trusted`, `not-set-up` (the owner's empty slot), `not-available` (Themely's), `removed` (a built-in key the user removed)
    /// or `revoked`.
    pub state: &'static str,
}

/// The revoked keys in a revoke list's JSON (`{ "revoked": [{ "key", "reason"? }] }`); an entry that is not a key is skipped.
pub fn revoked_keys(text: &str) -> Vec<Key> {
    let list: Value = serde_json::from_str(text).unwrap_or(Value::Null);
    list.get("revoked").and_then(Value::as_array).into_iter().flatten().filter_map(|e| Key::parse(e.get("key")?.as_str()?).ok()).collect()
}

/// The key store: the user's file, the built-in slots and the revoke list.
pub struct KeyStore {
    path: PathBuf,
    owner: Option<&'static str>,
    revoked: Vec<Key>,
}

/// What the file holds.
#[derive(Default)]
struct Stored {
    /// Name, key line, added (ms since the epoch).
    keys: Vec<(String, String, u64)>,
    /// The built-in slots the user removed.
    removed: Vec<String>,
}

impl KeyStore {
    /// The store of the data folder `data_dir`.
    pub fn new(data_dir: &Path) -> Self {
        Self { path: data_dir.join(FILE), owner: OWNER_KEY, revoked: revoked_keys(REVOKED) }
    }

    /// A store with its own owner key and revoke list (tests: the built-in ones are empty).
    pub fn with(data_dir: &Path, owner: Option<&'static str>, revoked: &str) -> Self {
        Self { path: data_dir.join(FILE), owner, revoked: revoked_keys(revoked) }
    }

    fn read(&self) -> Stored {
        let Some(file) = crate::store::read_json(&self.path) else {
            return Stored::default();
        };
        let text = |v: &Value, k: &str| v.get(k).and_then(Value::as_str).map(str::to_string);
        let keys = file.get("keys").and_then(Value::as_array).into_iter().flatten();
        Stored {
            keys: keys.filter_map(|k| Some((text(k, "name")?, text(k, "key")?, k.get("added").and_then(Value::as_u64).unwrap_or(0)))).collect(),
            removed: file.get("removed").and_then(Value::as_array).into_iter().flatten().filter_map(|v| v.as_str().map(str::to_string)).collect(),
        }
    }

    /// Writes the file: beside it first, then moved over it, so a crash leaves the old file or the new one.
    fn write(&self, stored: &Stored) -> Result<(), String> {
        let keys: Vec<Value> = stored.keys.iter().map(|(name, key, added)| json!({ "name": name, "key": key, "added": added })).collect();
        let text = serde_json::to_string_pretty(&json!({ "format": 1, "keys": keys, "removed": stored.removed })).map_err(|e| e.to_string())?;
        let io = |e: std::io::Error| format!("the key file could not be written: {e}");
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(io)?;
        }
        let temp = self.path.with_file_name(format!(".{FILE}-{}", uuid::Uuid::new_v4()));
        std::fs::write(&temp, text).map_err(io)?;
        std::fs::rename(&temp, &self.path).map_err(|e| {
            let _ = std::fs::remove_file(&temp);
            io(e)
        })
    }

    fn is_revoked(&self, key: &Key) -> bool {
        self.revoked.iter().any(|r| r.id == key.id || r.bytes == key.bytes)
    }

    /// The keys packages are verified against: the built-in ones the user has not removed, the user's, and the revoke list.
    pub fn keyring(&self) -> Keyring {
        let stored = self.read();
        let mut trusted = Vec::new();
        if let Some(owner) = self.owner.and_then(|k| Key::parse(k).ok()).filter(|_| !stored.removed.iter().any(|r| r == OWNER)) {
            trusted.push((Signer::Owner, owner));
        }
        if let Some(themely) = THEMELY_KEY.filter(|_| THEMELY_ENABLED).and_then(|k| Key::parse(k).ok()).filter(|_| !stored.removed.iter().any(|r| r == THEMELY)) {
            trusted.push((Signer::Themely, themely));
        }
        for (name, line, _) in &stored.keys {
            if let Ok(key) = Key::parse(line) {
                trusted.push((Signer::User(name.clone()), key));
            }
        }
        Keyring { trusted, revoked: self.revoked.clone() }
    }

    /// Every key and slot, as Settings lists them: the owner's, Themely's, then the user's in the order they were added.
    pub fn list(&self) -> Vec<KeyView> {
        let stored = self.read();
        let removed = |id: &str| stored.removed.iter().any(|r| r == id);
        let owner = self.owner.and_then(|k| Key::parse(k).ok());
        let mut out = vec![KeyView {
            id: OWNER.into(),
            kind: OWNER,
            name: "InfoPanel Studio".into(),
            fingerprint: owner.as_ref().map(Key::fingerprint),
            state: match &owner {
                None => "not-set-up",
                Some(k) if self.is_revoked(k) => "revoked",
                Some(_) if removed(OWNER) => "removed",
                Some(_) => "trusted",
            },
        }];
        let themely = THEMELY_KEY.and_then(|k| Key::parse(k).ok()).filter(|_| THEMELY_ENABLED);
        out.push(KeyView {
            id: THEMELY.into(),
            kind: THEMELY,
            name: "Themely".into(),
            fingerprint: themely.as_ref().map(Key::fingerprint),
            state: match &themely {
                None => "not-available",
                Some(k) if self.is_revoked(k) => "revoked",
                Some(_) if removed(THEMELY) => "removed",
                Some(_) => "trusted",
            },
        });
        for (name, line, _) in &stored.keys {
            if let Ok(key) = Key::parse(line) {
                let state = if self.is_revoked(&key) { "revoked" } else { "trusted" };
                out.push(KeyView { id: key.fingerprint(), kind: "user", name: name.clone(), fingerprint: Some(key.fingerprint()), state });
            }
        }
        out
    }

    /// Trusts a user key under `name` (Settings only). Refused: a bad name or key, a name or key already there, a revoked key,
    /// a built-in key, or more than `USER_KEYS_MAX`.
    pub fn add_user(&self, name: &str, key: &str) -> Result<Vec<KeyView>, String> {
        let name = name.trim();
        if name.is_empty() || name.chars().count() > NAME_MAX || name.chars().any(|c| c.is_control() || c == '<' || c == '>') {
            return Err(format!("give the key a name of 1 to {NAME_MAX} characters, without < or >"));
        }
        let parsed = Key::parse(key)?;
        if self.is_revoked(&parsed) {
            return Err(format!("this key ({}) is revoked", parsed.fingerprint()));
        }
        let builtin = [self.owner, THEMELY_KEY].into_iter().flatten().filter_map(|k| Key::parse(k).ok());
        if builtin.into_iter().any(|k| k.id == parsed.id || k.bytes == parsed.bytes) {
            return Err("this is a built-in key; it is listed above".into());
        }
        let _held = WRITE.lock().unwrap_or_else(|e| e.into_inner());
        let mut stored = self.read();
        for (other, line, _) in &stored.keys {
            if other.to_lowercase() == name.to_lowercase() {
                return Err(format!("a key named {other} is already trusted"));
            }
            if Key::parse(line).is_ok_and(|k| k.id == parsed.id || k.bytes == parsed.bytes) {
                return Err(format!("this key ({}) is already trusted as {other}", parsed.fingerprint()));
            }
        }
        if stored.keys.len() >= USER_KEYS_MAX {
            return Err(format!("{USER_KEYS_MAX} keys are trusted; remove one first"));
        }
        let added = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_millis() as u64);
        stored.keys.push((name.to_string(), parsed.line.clone(), added));
        self.write(&stored)?;
        Ok(self.list())
    }

    /// Removes a key (Settings only): a user key by its fingerprint, or a built-in one (`owner`, `themely`), which stays removed
    /// until `restore`. `Err` when there is no such key.
    pub fn remove(&self, id: &str) -> Result<Vec<KeyView>, String> {
        let _held = WRITE.lock().unwrap_or_else(|e| e.into_inner());
        let mut stored = self.read();
        if id == OWNER || id == THEMELY {
            if !self.list().iter().any(|k| k.id == id && k.state == "trusted") {
                return Err("that key is not trusted now".into());
            }
            stored.removed.push(id.to_string());
        } else {
            let before = stored.keys.len();
            stored.keys.retain(|(_, line, _)| !Key::parse(line).is_ok_and(|k| k.fingerprint() == id));
            if stored.keys.len() == before {
                return Err("no such key".into());
            }
        }
        self.write(&stored)?;
        Ok(self.list())
    }

    /// Trusts a removed built-in key again (Settings only).
    pub fn restore(&self, id: &str) -> Result<Vec<KeyView>, String> {
        let _held = WRITE.lock().unwrap_or_else(|e| e.into_inner());
        let mut stored = self.read();
        let before = stored.removed.len();
        stored.removed.retain(|r| r != id);
        if stored.removed.len() == before {
            return Err("that key was not removed".into());
        }
        self.write(&stored)?;
        Ok(self.list())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// tests/fixtures/widgets/TEST-ONLY-other.pub's key line: a throwaway key whose secret half was never kept.
    const KEY_A: &str = "RWT3gIgjr6IvWewflS+qBvZJiha4+kV/3/tINeghUUybv79lqw1BQH/3";

    fn test_key() -> String {
        std::fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/widgets/TEST-ONLY-publisher.pub")).unwrap()
    }

    #[test]
    fn the_owner_slot_ships_empty_and_themely_disabled() {
        assert_eq!(OWNER_KEY, None, "the owner adds the key (docs/security.md); never a test key");
        const { assert!(!THEMELY_ENABLED) };
        assert!(revoked_keys(REVOKED).is_empty(), "the built-in revoke list parses");
        let dir = tempfile::tempdir().unwrap();
        let store = KeyStore::new(dir.path());
        let list = store.list();
        assert_eq!((list[0].id.as_str(), list[0].state, list[0].fingerprint.clone()), ("owner", "not-set-up", None));
        assert_eq!((list[1].id.as_str(), list[1].state), ("themely", "not-available"));
        assert!(store.keyring().trusted.is_empty());
        assert!(store.remove("owner").is_err() && store.remove("themely").is_err(), "an empty slot has nothing to remove");
    }

    #[test]
    fn a_user_key_is_added_named_listed_with_its_fingerprint_and_removed() {
        let dir = tempfile::tempdir().unwrap();
        let store = KeyStore::new(dir.path());
        let list = store.add_user("My key", &test_key()).unwrap();
        let fp = Key::parse(&test_key()).unwrap().fingerprint();
        assert_eq!(list[2], KeyView { id: fp.clone(), kind: "user", name: "My key".into(), fingerprint: Some(fp.clone()), state: "trusted" });
        assert_eq!(store.keyring().trusted[0].0, Signer::User("My key".into()));
        assert!(store.add_user("Other", &test_key()).unwrap_err().contains("already trusted"), "the same key twice");
        assert!(store.add_user("my KEY", KEY_A).unwrap_err().contains("already trusted"), "the same name twice");
        for bad in ["", " ", "<b>", &"n".repeat(NAME_MAX + 1)] {
            assert!(store.add_user(bad, KEY_A).is_err(), "{bad:?}");
        }
        assert!(store.add_user("Junk", "not a key").is_err());
        assert_eq!(store.remove(&fp).unwrap().len(), 2);
        assert!(store.keyring().trusted.is_empty());
        assert!(store.remove(&fp).is_err(), "gone");
    }

    #[test]
    fn a_revoked_key_cannot_be_added_and_lists_as_revoked() {
        let dir = tempfile::tempdir().unwrap();
        let revoked = json!({ "revoked": [{ "key": KEY_A, "reason": "test" }] }).to_string();
        let store = KeyStore::with(dir.path(), None, &revoked);
        assert!(store.add_user("Old", KEY_A).unwrap_err().contains("revoked"));
        assert_eq!(store.keyring().revoked.len(), 1);
    }

    #[test]
    fn a_built_in_key_is_removed_and_restored() {
        let dir = tempfile::tempdir().unwrap();
        let store = KeyStore::with(dir.path(), Some(KEY_A), r#"{"revoked":[]}"#);
        assert_eq!(store.list()[0].state, "trusted");
        assert_eq!(store.keyring().trusted[0].0, Signer::Owner);
        assert!(store.add_user("Mine", KEY_A).is_err(), "a built-in key is not added again");
        assert_eq!(store.remove("owner").unwrap()[0].state, "removed");
        assert!(store.keyring().trusted.is_empty());
        assert_eq!(store.restore("owner").unwrap()[0].state, "trusted");
        let revoked = json!({ "revoked": [{ "key": KEY_A }] }).to_string();
        assert_eq!(KeyStore::with(dir.path(), Some(KEY_A), &revoked).list()[0].state, "revoked");
    }
}
