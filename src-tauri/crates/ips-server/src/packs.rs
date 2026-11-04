// User packs (P12b): theme packs a user brought, in DATA_DIR/packs/<id>/, one folder per pack. The server stores and serves
// them and nothing more: the pack validator (src/looks/pack-validate.ts) runs in the studio at import and again in the
// loader before a pack is worn, and it is the only reader of a pack's meaning. What the server does itself is path safety
// and size: an id and a file are matched against strict patterns before any path is built, the file is canonicalised and
// must stay inside its pack folder (a symlink is never followed), a pack over the caps is not served, and an import is
// refused unless every file is one a pack has (`pack.css` among the ones it names: a user pack carries none).
//
// GET /api/packs                list: id, name and size of each pack that is within the caps (`X-User-Packs: off` when switched off)
// POST /api/packs               import: `{ "id", "files": [{ "path", "data" (base64) }] }`, replaces a pack of that id
// GET/HEAD /api/packs/<id>/<file>   one file, typed by its extension, `nosniff`, a CSP that allows nothing
// DELETE /api/packs/<id>        remove a pack
//
// Writes need `X-Dashboard-Pack: 1` and come from this computer unless ALLOW_REMOTE_UPLOAD=1 (the asset store's rule).
// The rollback switch: `USER_PACKS=off` turns the folder read and every route off (the list is empty, a file is 404, a write
// 403), so the built-in packs are unaffected.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use axum::body::Body;
use axum::http::{HeaderValue, Method, Response};
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use serde_json::{json, Value};

use crate::asset_types::SVG_CSP;
use crate::http::{self, Req};
use crate::{js, App};

/// A pack folder is at most this many bytes, a file at most `FILE_MAX_BYTES`, a pack at most `FILE_COUNT_MAX` files
/// (the validator's `PACK_CEILING_BYTES`, `FILE_MAX_BYTES` and `FILE_COUNT_MAX`).
pub const PACK_CEILING_BYTES: u64 = 512_000;
pub const FILE_MAX_BYTES: u64 = 256_000;
pub const FILE_COUNT_MAX: usize = 64;
/// An import body: the pack as base64 in JSON, with room for the paths.
const IMPORT_BODY_MAX: usize = (PACK_CEILING_BYTES as usize) * 4 / 3 + 64 * 1024;

/// At most this many packs, and this many bytes of them in all (the packs a user brings are a few hundred kB each).
pub const PACKS_MAX: usize = 32;
pub const PACKS_TOTAL_BYTES: u64 = 16_000_000;

/// The start of a folder an import writes into; a leftover is swept at start.
const TEMP_PREFIX: &str = ".import-";
/// The start of a replaced pack set aside as `.import-old-<id>-<uuid>`; the sweep puts it back when the pack's own folder is gone.
const ASIDE_PREFIX: &str = ".import-old-";
/// The length of the uuid that ends a set-aside name.
const UUID_LEN: usize = 36;
/// The files at the top of a pack folder, by name.
const ROOT_FILES: [&str; 7] = ["pack.json", "look.json", "icons.json", "OFL.txt", "thumb.png", "thumb.jpg", "thumb.webp"];
/// The extensions an asset may have (`assets/<name>.<ext>`) and their types.
const ASSET_EXTS: [&str; 5] = ["woff2", "png", "jpg", "webp", "svg"];
const NO_PACK_CSS: &str = "a user pack carries no pack.css";

/// A name Windows keeps for a device (`con`, `nul`, `com1`, ... with or without an extension): never a pack id or a file's stem.
fn is_device_name(s: &str) -> bool {
    let stem = s.split('.').next().unwrap_or("");
    matches!(stem, "con" | "prn" | "aux" | "nul") || (stem.len() == 4 && (stem.starts_with("com") || stem.starts_with("lpt")) && matches!(stem.as_bytes()[3], b'1'..=b'9'))
}

/// A pack id: lowercase letters, digits and hyphens, 1 to 48 characters, not starting with a hyphen, not a Windows device name.
pub fn is_pack_id(s: &str) -> bool {
    (1..=48).contains(&s.len()) && !is_device_name(s) && !s.starts_with('-') && s.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

/// An asset's own name (before the extension): the same characters as an id, up to 64.
fn is_asset_name(s: &str) -> bool {
    (1..=64).contains(&s.len()) && !is_device_name(s) && !s.starts_with('-') && s.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

/// A file of a pack by its path from the pack folder: one of the fixed names, or `assets/<name>.<ext>`. Nothing else is a
/// path: no separator but the one after `assets`, no dot but the extension's, no `%`, no backslash, colon, NUL or non-ASCII.
pub fn is_pack_file(s: &str) -> bool {
    if ROOT_FILES.contains(&s) {
        return true;
    }
    let Some(name) = s.strip_prefix("assets/") else {
        return false;
    };
    name.rsplit_once('.').is_some_and(|(stem, ext)| is_asset_name(stem) && ASSET_EXTS.contains(&ext))
}

/// The `Content-Type` of a pack file, by its extension.
fn mime_of(file: &str) -> Option<&'static str> {
    Some(match file.rsplit_once('.')?.1 {
        "json" => "application/json; charset=utf-8",
        "woff2" => "font/woff2",
        "png" => "image/png",
        "jpg" => "image/jpeg",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "txt" => "text/plain; charset=utf-8",
        _ => return None,
    })
}

/// The user-pack store: its folder, whether the folder is read at all, and who may write.
pub struct Packs {
    dir: PathBuf,
    enabled: bool,
    allow_remote: bool,
    /// Held across an import's cap checks and write, and a remove, so two at once cannot both pass the caps.
    write: Mutex<()>,
}

impl Packs {
    /// The store in `dir`. `USER_PACKS=off` (or `0`) is the rollback switch.
    pub fn new(dir: PathBuf, allow_remote: bool) -> Self {
        let enabled = !matches!(std::env::var("USER_PACKS").ok().as_deref(), Some("off" | "0"));
        let packs = Self { dir, enabled, allow_remote, write: Mutex::new(()) };
        packs.sweep();
        packs
    }

    /// Recovers from a crash in an import. A pack set aside whose own folder is gone is put back (the replace died between
    /// its two renames), the newest first when there are several for an id; one whose folder is there is the old copy of a
    /// finished replace and goes. The half-written folders go last, so the only copy of a pack is never deleted.
    fn sweep(&self) {
        if !self.enabled {
            return;
        }
        let Ok(entries) = std::fs::read_dir(&self.dir) else {
            return;
        };
        let (mut asides, mut temps) = (Vec::new(), Vec::new());
        for entry in entries.filter_map(Result::ok) {
            let name = entry.file_name().to_string_lossy().into_owned();
            if !entry.file_type().is_ok_and(|t| t.is_dir()) || !name.starts_with(TEMP_PREFIX) {
                continue;
            }
            match name.strip_prefix(ASIDE_PREFIX) {
                Some(rest) => asides.push((aside_id(&entry.path(), rest), entry.path())),
                None => temps.push(entry.path()),
            }
        }
        asides.sort_by_key(|(_, path)| std::cmp::Reverse((std::fs::metadata(path.join("pack.json")).and_then(|m| m.modified()).ok(), path.clone())));
        let mut kept = false;
        for (id, path) in asides {
            let dest = id.map(|id| self.dir.join(id));
            match dest {
                Some(dest) if std::fs::symlink_metadata(&dest).is_err() => kept |= std::fs::rename(&path, &dest).is_err(),
                _ => {
                    let _ = std::fs::remove_dir_all(&path);
                }
            }
        }
        if !kept {
            for path in temps {
                let _ = std::fs::remove_dir_all(path);
            }
        }
    }

    /// Stores a checked import: the caps are checked and the pack written under the write lock. The pack is written beside
    /// its place under a name no id has, then moved in, so a half-written pack is never a pack; a replaced pack is set aside
    /// (`.import-old-<id>-<uuid>`, which the sweep puts back after a crash) until the new one is in place.
    fn store(&self, id: &str, files: &Files) -> std::io::Result<Result<(), Refused>> {
        let _held = self.write.lock().unwrap_or_else(|e| e.into_inner());
        let others: Vec<u64> = listed(self).into_iter().filter(|(other, _)| other != id).map(|(_, bytes)| bytes).collect();
        if others.len() + 1 > PACKS_MAX {
            return Ok(Err(refuse(413, format!("{PACKS_MAX} packs are stored; remove one first"))));
        }
        if others.iter().sum::<u64>() + files.iter().map(|(_, b)| b.len() as u64).sum::<u64>() > PACKS_TOTAL_BYTES {
            return Ok(Err(refuse(413, format!("the packs would take over {PACKS_TOTAL_BYTES} bytes in all; remove one first"))));
        }
        std::fs::create_dir_all(&self.dir)?;
        let temp = self.dir.join(format!("{TEMP_PREFIX}{}", uuid::Uuid::new_v4()));
        let written = (|| -> std::io::Result<()> {
            for (path, bytes) in files {
                let target = temp.join(path);
                if let Some(parent) = target.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                std::fs::write(target, bytes)?;
            }
            let dest = self.dir.join(id);
            let aside = self.dir.join(format!("{ASIDE_PREFIX}{id}-{}", uuid::Uuid::new_v4()));
            let had = std::fs::symlink_metadata(&dest).is_ok();
            if had {
                std::fs::rename(&dest, &aside)?;
            }
            if let Err(e) = std::fs::rename(&temp, &dest) {
                if had {
                    let _ = std::fs::rename(&aside, &dest);
                }
                return Err(e);
            }
            if had {
                let _ = std::fs::remove_dir_all(&aside);
            }
            Ok(())
        })();
        if let Err(e) = written {
            let _ = std::fs::remove_dir_all(&temp);
            return Err(e);
        }
        Ok(Ok(()))
    }

    #[cfg(test)]
    fn with(dir: PathBuf, enabled: bool) -> Self {
        Self { dir, enabled, allow_remote: false, write: Mutex::new(()) }
    }

    /// The file of `file` in pack `id`, or `None` for anything not a pack file inside its pack folder: the names are
    /// matched first, then the path is canonicalised (links resolved) and must stay under the canonical `packs/<id>/`; a
    /// folder or a file that is a link is refused whatever it points at.
    pub fn path_of(&self, id: &str, file: &str) -> Option<PathBuf> {
        if !self.enabled || !is_pack_id(id) || !is_pack_file(file) {
            return None;
        }
        let root = self.pack_dir(id)?;
        let path = root.join(file);
        if std::fs::symlink_metadata(&path).ok()?.file_type().is_symlink() {
            return None;
        }
        let real = std::fs::canonicalize(&path).ok()?;
        (real.starts_with(&root) && real.is_file()).then_some(real)
    }

    /// Removes a pack under the write lock, so that of two removes at once the second finds it gone. `false`: no such pack.
    fn remove(&self, id: &str) -> std::io::Result<bool> {
        let _held = self.write.lock().unwrap_or_else(|e| e.into_inner());
        let Some(root) = is_pack_id(id).then(|| self.pack_dir(id)).flatten() else {
            return Ok(false);
        };
        std::fs::remove_dir_all(root)?;
        Ok(true)
    }

    /// The canonical folder of pack `id` under the canonical packs folder, when it is a real folder (not a link).
    fn pack_dir(&self, id: &str) -> Option<PathBuf> {
        let base = std::fs::canonicalize(&self.dir).ok()?;
        let dir = base.join(id);
        if std::fs::symlink_metadata(&dir).ok()?.file_type().is_symlink() {
            return None;
        }
        let real = std::fs::canonicalize(&dir).ok()?;
        (real.parent() == Some(base.as_path()) && real.is_dir()).then_some(real)
    }

    /// The reason a write is refused, or `None`.
    fn write_refusal(&self, req: &Req) -> Option<&'static str> {
        if !self.enabled {
            return Some("user packs are off");
        }
        if req.header("x-dashboard-pack").as_deref() != Some("1") {
            return Some("missing X-Dashboard-Pack header");
        }
        (!self.allow_remote && !req.is_loopback()).then_some("packs are accepted from this computer only")
    }
}

/// The pack a set-aside folder holds, from what follows `.import-old-` in its name: the `<id>-<uuid>` an import writes, else
/// (an old-format `<uuid>`, or a name no import wrote) the id in the folder's own `pack.json`.
fn aside_id(path: &Path, rest: &str) -> Option<String> {
    let named = rest.len().checked_sub(UUID_LEN + 1).and_then(|n| {
        let uuid = rest.get(n..)?.strip_prefix('-')?;
        uuid::Uuid::try_parse(uuid).ok()?;
        rest.get(..n)
    });
    let own = || {
        let text = std::fs::read_to_string(path.join("pack.json")).ok()?;
        serde_json::from_str::<Value>(&text).ok()?.get("id")?.as_str().map(str::to_string)
    };
    named.map(str::to_string).or_else(own).filter(|id| is_pack_id(id))
}

/// The file count and total bytes of a pack folder: every file at its top and in `assets/`. A folder with anything else in it
/// (a sub-folder, a link, a stray name), a file over its cap or a pack over its caps is `None`: not a pack this server wrote.
fn measure(root: &Path) -> Option<(usize, u64)> {
    let mut count = 0;
    let mut total = 0;
    for (dir, prefix) in [(root.to_path_buf(), ""), (root.join("assets"), "assets/")] {
        let Ok(entries) = std::fs::read_dir(&dir) else {
            if prefix.is_empty() {
                return None;
            }
            continue;
        };
        for entry in entries.filter_map(Result::ok) {
            let meta = std::fs::symlink_metadata(entry.path()).ok()?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if meta.is_dir() && prefix.is_empty() && name == "assets" {
                continue;
            }
            if !meta.is_file() || !is_pack_file(&format!("{prefix}{name}")) {
                return None;
            }
            count += 1;
            total += meta.len();
            if meta.len() > FILE_MAX_BYTES {
                return None;
            }
        }
    }
    (count <= FILE_COUNT_MAX && total <= PACK_CEILING_BYTES).then_some((count, total))
}

/// The pack ids that are folders in the packs folder and within the caps, sorted.
fn listed(packs: &Packs) -> Vec<(String, u64)> {
    let mut found = Vec::new();
    if !packs.enabled {
        return found;
    }
    let Ok(entries) = std::fs::read_dir(&packs.dir) else {
        return found;
    };
    for entry in entries.filter_map(Result::ok) {
        let id = entry.file_name().to_string_lossy().into_owned();
        let Some(root) = packs.pack_dir(&id).filter(|_| is_pack_id(&id)) else {
            continue;
        };
        if let Some((_, bytes)) = measure(&root).filter(|_| root.join("pack.json").is_file()) {
            found.push((id, bytes));
        }
    }
    found.sort();
    found
}

/// The `name` of a pack's `pack.json` (80 characters at most), else its id.
fn name_of(root: &Path, id: &str) -> String {
    let name = std::fs::read_to_string(root.join("pack.json")).ok().and_then(|t| serde_json::from_str::<Value>(&t).ok()).and_then(|v| v.get("name")?.as_str().map(str::to_string));
    name.map_or_else(|| id.to_string(), |n| n.chars().take(80).collect())
}

fn handle_list(app: &App) -> Response<Body> {
    let packs = &app.packs;
    let items: Vec<Value> = listed(packs)
        .into_iter()
        .map(|(id, size)| {
            let name = packs.pack_dir(&id).map_or_else(|| id.clone(), |root| name_of(&root, &id));
            json!({ "id": id, "name": name, "size": size })
        })
        .collect();
    let mut reply = http::json(200, &Value::Array(items));
    if !packs.enabled {
        reply.headers_mut().insert("X-User-Packs", HeaderValue::from_static("off"));
    }
    reply
}

/// The decoded files of an import: path and bytes.
type Files = Vec<(String, Vec<u8>)>;

/// A refused import: its status and message.
struct Refused(u16, String);

fn refuse(status: u16, message: impl Into<String>) -> Refused {
    Refused(status, message.into())
}

/// An import's files checked against the pack's shape: every path one a pack has, no repeat, the caps, `pack.json` and
/// `look.json` there as JSON objects naming the folder's id. Returns the decoded files.
fn checked_import(body: &Value) -> Result<(String, Files), Refused> {
    let id = body.get("id").and_then(Value::as_str).unwrap_or("");
    if !is_pack_id(id) {
        return Err(refuse(400, "the pack id is not lowercase letters, digits and hyphens (48 at most)"));
    }
    let list = body.get("files").and_then(Value::as_array).ok_or_else(|| refuse(400, "no files"))?;
    if list.len() > FILE_COUNT_MAX {
        return Err(refuse(413, format!("{} files, at most {FILE_COUNT_MAX}", list.len())));
    }
    let mut files: Files = Vec::new();
    let mut total = 0u64;
    for f in list {
        let path = f.get("path").and_then(Value::as_str).unwrap_or("");
        if path == "pack.css" {
            return Err(refuse(400, NO_PACK_CSS));
        }
        if !is_pack_file(path) {
            return Err(refuse(400, format!("{} is not a file a pack has", path.chars().take(60).collect::<String>())));
        }
        if files.iter().any(|(p, _)| p == path) {
            return Err(refuse(400, format!("{path} is given twice")));
        }
        let bytes = STANDARD.decode(f.get("data").and_then(Value::as_str).unwrap_or("")).map_err(|_| refuse(400, format!("{path} is not base64")))?;
        if bytes.len() as u64 > FILE_MAX_BYTES {
            return Err(refuse(413, format!("{path} is over {FILE_MAX_BYTES} bytes")));
        }
        total += bytes.len() as u64;
        files.push((path.to_string(), bytes));
    }
    if total > PACK_CEILING_BYTES {
        return Err(refuse(413, format!("the pack is over {PACK_CEILING_BYTES} bytes")));
    }
    for name in ["pack.json", "look.json"] {
        let bytes = files.iter().find(|(p, _)| p == name).map(|(_, b)| b).ok_or_else(|| refuse(400, format!("{name} is missing")))?;
        let parsed: Value = serde_json::from_slice(bytes).map_err(|_| refuse(400, format!("{name} is not JSON")))?;
        if parsed.get("id").and_then(Value::as_str) != Some(id) {
            return Err(refuse(400, format!("{name} names another id than {id}")));
        }
    }
    for (path, bytes) in &files {
        if path.ends_with(".json") && serde_json::from_slice::<Value>(bytes).is_err() {
            return Err(refuse(400, format!("{path} is not JSON")));
        }
    }
    Ok((id.to_string(), files))
}

async fn handle_import(app: &App, mut req: Req) -> std::io::Result<Response<Body>> {
    let packs = &app.packs;
    if let Some(refusal) = packs.write_refusal(&req) {
        return Ok(http::text(403, refusal));
    }
    let length = req.header("content-length").map_or(f64::NAN, |v| js::string_to_number(&v));
    if length > IMPORT_BODY_MAX as f64 {
        return Ok(http::closing(http::empty(413)));
    }
    let Ok(text) = req.read_body(IMPORT_BODY_MAX).await else {
        return Ok(http::closing(http::text(413, "the pack is too large")));
    };
    let Ok(body) = serde_json::from_str::<Value>(&text) else {
        return Ok(http::text(400, "the body is not JSON"));
    };
    let (id, files) = match checked_import(&body) {
        Ok(done) => done,
        Err(Refused(status, message)) => return Ok(http::text(status, message)),
    };
    if let Err(Refused(status, message)) = packs.store(&id, &files)? {
        return Ok(http::text(status, message));
    }
    let size: u64 = files.iter().map(|(_, b)| b.len() as u64).sum();
    let name = packs.pack_dir(&id).map_or_else(|| id.clone(), |root| name_of(&root, &id));
    Ok(http::json(200, &json!({ "id": id, "name": name, "size": size })))
}

fn handle_delete(app: &App, req: &Req, id: &str) -> std::io::Result<Response<Body>> {
    let packs = &app.packs;
    if let Some(refusal) = packs.write_refusal(req) {
        return Ok(http::text(403, refusal));
    }
    Ok(http::empty(if packs.remove(id)? { 204 } else { 404 }))
}

/// One file of a pack: refused whole (413) when the pack is over the caps, typed by its extension.
fn serve_file(app: &App, req: &Req, id: &str, file: &str) -> Response<Body> {
    let packs = &app.packs;
    let Some(path) = packs.path_of(id, file) else {
        return http::empty(404);
    };
    if packs.pack_dir(id).and_then(|root| measure(&root)).is_none() {
        return http::empty(413);
    }
    let (Some(mime), Ok(bytes)) = (mime_of(file), std::fs::read(&path)) else {
        return http::empty(404);
    };
    let csp = if file.ends_with(".svg") { SVG_CSP } else { "default-src 'none'; sandbox" };
    let length = bytes.len();
    Response::builder()
        .status(200)
        .header("Content-Type", mime)
        .header("Content-Length", length.to_string())
        .header("Cache-Control", "no-cache")
        .header("X-Content-Type-Options", "nosniff")
        .header("Content-Security-Policy", csp)
        .body(if req.method == Method::HEAD { Body::empty() } else { Body::from(bytes) })
        .unwrap_or_default()
}

/// /api/packs and /api/packs/<id>/<file>.
pub async fn handle(app: &App, req: Req) -> std::io::Result<Response<Body>> {
    if req.path == "/api/packs" {
        return match req.method {
            Method::GET => Ok(handle_list(app)),
            Method::POST => handle_import(app, req).await,
            _ => Ok(http::empty(405)),
        };
    }
    let rest = req.path.strip_prefix("/api/packs/").unwrap_or("");
    let (id, file) = rest.split_once('/').map_or((rest, None), |(id, file)| (id, Some(file)));
    match (&req.method, file) {
        (&Method::DELETE, None) => handle_delete(app, &req, id),
        (&Method::GET | &Method::HEAD, Some(file)) => Ok(serve_file(app, &req, id, file)),
        (&Method::GET | &Method::HEAD | &Method::DELETE, _) => Ok(http::empty(404)),
        _ => Ok(http::empty(405)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_are_lowercase_names_of_at_most_48() {
        for ok in ["a", "my-pack", "0x", &"a".repeat(48)] {
            assert!(is_pack_id(ok), "{ok}");
        }
        for bad in ["nul", "con", "aux", "prn", "com1", "lpt9", "com1.x", "", "-a", "A", "a_b", "a.b", "a/b", "a\\b", "..", ".", "a%2eb", "a b", "é", "a\0", "C:", &"a".repeat(49)] {
            assert!(!is_pack_id(bad), "{bad:?}");
        }
    }

    #[test]
    fn windows_device_names_are_not_ids_or_asset_names() {
        for bad in ["nul", "con", "prn", "aux", "com1", "com9", "lpt1", "lpt9"] {
            assert!(!is_pack_id(bad), "{bad}");
            for ext in ["png", "woff2", "svg"] {
                assert!(!is_pack_file(&format!("assets/{bad}.{ext}")), "{bad}.{ext}");
            }
        }
        for ok in ["com0", "com10", "console", "nully", "lpt", "com-1"] {
            assert!(is_pack_id(ok), "{ok}");
        }
    }

    fn names(dir: &Path) -> Vec<String> {
        let mut left: Vec<String> = std::fs::read_dir(dir).unwrap().map(|e| e.unwrap().file_name().to_string_lossy().into_owned()).collect();
        left.sort();
        left
    }

    fn marked(root: &Path, text: &str) {
        std::fs::write(root.join("pack.json"), text).unwrap();
    }

    #[test]
    fn a_crash_leftover_with_no_pack_behind_it_is_swept_and_a_pack_is_not() {
        let dir = tempfile::tempdir().unwrap();
        pack(dir.path(), "mine");
        std::fs::create_dir_all(dir.path().join(".import-1/assets")).unwrap();
        Packs::with(dir.path().to_path_buf(), true).sweep();
        assert_eq!(names(dir.path()), ["mine"]);
    }

    const UUID: &str = "11111111-2222-3333-4444-555555555555";

    #[test]
    fn a_crash_after_the_first_rename_puts_the_old_pack_back() {
        // dest is gone: the old pack sits aside and the new one is still in its temp folder
        let dir = tempfile::tempdir().unwrap();
        marked(&pack(dir.path(), &format!(".import-old-my-pack-{UUID}")), "old");
        marked(&pack(dir.path(), ".import-9"), "new");
        Packs::with(dir.path().to_path_buf(), true).sweep();
        assert_eq!(names(dir.path()), ["my-pack"]);
        assert_eq!(std::fs::read_to_string(dir.path().join("my-pack/pack.json")).unwrap(), "old");
    }

    #[test]
    fn a_crash_after_the_second_rename_keeps_the_new_pack() {
        let dir = tempfile::tempdir().unwrap();
        marked(&pack(dir.path(), "my-pack"), "new");
        marked(&pack(dir.path(), &format!(".import-old-my-pack-{UUID}")), "old");
        Packs::with(dir.path().to_path_buf(), true).sweep();
        assert_eq!(names(dir.path()), ["my-pack"]);
        assert_eq!(std::fs::read_to_string(dir.path().join("my-pack/pack.json")).unwrap(), "new");
    }

    #[test]
    fn a_crash_before_the_cleanup_or_during_the_write_loses_nothing() {
        let dir = tempfile::tempdir().unwrap();
        marked(&pack(dir.path(), "mine"), "kept");
        pack(dir.path(), ".import-3");
        Packs::with(dir.path().to_path_buf(), true).sweep();
        assert_eq!(names(dir.path()), ["mine"]);
        assert_eq!(std::fs::read_to_string(dir.path().join("mine/pack.json")).unwrap(), "kept");
    }

    #[test]
    fn an_old_format_leftover_is_put_back_under_the_id_in_its_pack_json() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join(format!(".import-old-{UUID}"))).unwrap();
        std::fs::write(dir.path().join(format!(".import-old-{UUID}/pack.json")), r#"{"id":"my-pack"}"#).unwrap();
        Packs::with(dir.path().to_path_buf(), true).sweep();
        assert_eq!(names(dir.path()), ["my-pack"]);
    }

    #[test]
    fn a_set_aside_name_without_its_separator_or_uuid_is_not_read_as_an_id() {
        for name in [format!(".import-old-wrongX{UUID}"), format!(".import-old-wrong-{}", "z".repeat(UUID_LEN))] {
            let dir = tempfile::tempdir().unwrap();
            std::fs::create_dir_all(dir.path().join(&name)).unwrap();
            std::fs::write(dir.path().join(&name).join("pack.json"), r#"{"id":"right"}"#).unwrap();
            Packs::with(dir.path().to_path_buf(), true).sweep();
            assert_eq!(names(dir.path()), ["right"], "{name}");
        }
    }

    #[test]
    fn of_several_asides_for_one_id_the_newest_is_put_back() {
        const LATER: &str = "99999999-2222-3333-4444-555555555555";
        let aged = |root: &Path| {
            let long_ago = std::time::SystemTime::now() - std::time::Duration::from_secs(3600);
            std::fs::File::options().write(true).open(root.join("pack.json")).unwrap().set_modified(long_ago).unwrap();
        };
        let dir = tempfile::tempdir().unwrap();
        // whichever way the folder is read, one of these two pairs has its older copy first
        let (older, newer) = (pack(dir.path(), &format!(".import-old-first-{UUID}")), pack(dir.path(), &format!(".import-old-first-{LATER}")));
        marked(&older, "old");
        marked(&newer, "new");
        aged(&older);
        let (newer, older) = (pack(dir.path(), &format!(".import-old-second-{UUID}")), pack(dir.path(), &format!(".import-old-second-{LATER}")));
        marked(&older, "old");
        marked(&newer, "new");
        aged(&older);
        Packs::with(dir.path().to_path_buf(), true).sweep();
        assert_eq!(names(dir.path()), ["first", "second"]);
        assert_eq!(std::fs::read_to_string(dir.path().join("first/pack.json")).unwrap(), "new");
        assert_eq!(std::fs::read_to_string(dir.path().join("second/pack.json")).unwrap(), "new");
    }

    #[test]
    fn of_two_removes_at_once_one_removes_and_one_finds_nothing() {
        for round in 0..50 {
            let dir = tempfile::tempdir().unwrap();
            let packs = Packs::with(dir.path().to_path_buf(), true);
            pack(dir.path(), "mine");
            let gate = std::sync::Barrier::new(2);
            let removed = std::thread::scope(|scope| {
                let go = || {
                    let (packs, gate) = (&packs, &gate);
                    scope.spawn(move || {
                        gate.wait();
                        packs.remove("mine").unwrap()
                    })
                };
                let (a, b) = (go(), go());
                [a.join().unwrap(), b.join().unwrap()]
            });
            assert_eq!(removed.iter().filter(|gone| **gone).count(), 1, "round {round}: {removed:?}");
        }
    }

    #[test]
    fn two_imports_at_once_cannot_pass_the_pack_cap_together() {
        let files: Files = vec![("pack.json".into(), b"{\"id\":\"x\"}".to_vec())];
        for round in 0..20 {
            let dir = tempfile::tempdir().unwrap();
            let packs = Packs::with(dir.path().to_path_buf(), true);
            for k in 0..PACKS_MAX - 1 {
                pack(dir.path(), &format!("p{k}"));
            }
            let gate = std::sync::Barrier::new(2);
            let stored = std::thread::scope(|scope| {
                let go = |id: &'static str| {
                    let (packs, files, gate) = (&packs, &files, &gate);
                    scope.spawn(move || {
                        gate.wait();
                        packs.store(id, files).unwrap().is_ok()
                    })
                };
                let (a, b) = (go("a"), go("b"));
                [a.join().unwrap(), b.join().unwrap()]
            });
            assert_eq!(stored.iter().filter(|ok| **ok).count(), 1, "round {round}: {stored:?}");
            assert_eq!(listed(&packs).len(), PACKS_MAX);
        }
    }

    #[test]
    fn files_are_a_fixed_set_or_an_asset_of_a_known_type() {
        for ok in ["pack.json", "look.json", "icons.json", "OFL.txt", "thumb.png", "assets/hazard.svg", "assets/geist-400.woff2", "assets/a.png", "assets/a.jpg", "assets/a.webp"] {
            assert!(is_pack_file(ok), "{ok}");
        }
        for bad in [
            "", "pack.css", "pack.js", "Pack.json", "../pack.json", "assets/../pack.json", "assets/..", "assets//a.png", "/assets/a.png", "assets/", "assets/a", "assets/.png", "assets/a.PNG",
            "assets/a.gif", "assets/a.exe", "assets/a.svg.png", "assets/a/b.png", "assets\\a.png", "assets/a%2epng", "assets/a.png ", "assets/a.png\0", "assets/é.png", "C:/x.png", "//x/y.png",
            "assets/a b.png", "assets/-a.png", "assets/a:b.png", "assets/a.png:stream", "assets/CON.png", "pack.json.", "pack.json/", "./pack.json", "assets/./a.png", "LOOK.md",
        ] {
            assert!(!is_pack_file(bad), "{bad:?}");
        }
    }

    #[test]
    fn types_are_by_extension() {
        assert_eq!(mime_of("assets/a.woff2"), Some("font/woff2"));
        assert_eq!(mime_of("assets/a.svg"), Some("image/svg+xml"));
        assert_eq!(mime_of("OFL.txt"), Some("text/plain; charset=utf-8"));
        assert_eq!(mime_of("assets/a.gif"), None);
    }

    fn pack(dir: &Path, id: &str) -> PathBuf {
        let root = dir.join(id);
        std::fs::create_dir_all(root.join("assets")).unwrap();
        std::fs::write(root.join("pack.json"), format!(r#"{{"id":"{id}","name":"N"}}"#)).unwrap();
        root
    }

    #[test]
    fn a_path_is_inside_its_pack_or_none() {
        let dir = tempfile::tempdir().unwrap();
        let packs = Packs::with(dir.path().join("packs"), true);
        let root = pack(&dir.path().join("packs"), "mine");
        std::fs::write(root.join("assets/a.png"), b"x").unwrap();
        std::fs::write(dir.path().join("secret.json"), b"no").unwrap();
        assert!(packs.path_of("mine", "pack.json").is_some());
        assert!(packs.path_of("mine", "assets/a.png").is_some());
        assert!(packs.path_of("mine", "look.json").is_none(), "missing");
        assert!(packs.path_of("other", "pack.json").is_none(), "no such pack");
        assert!(packs.path_of("mine", "../secret.json").is_none());
        assert!(packs.path_of("..", "secret.json").is_none());
        assert!(Packs::with(dir.path().join("packs"), false).path_of("mine", "pack.json").is_none(), "switched off");
    }

    #[cfg(windows)]
    fn link_file(target: &Path, link: &Path) -> std::io::Result<()> {
        std::os::windows::fs::symlink_file(target, link)
    }

    #[cfg(unix)]
    fn link_file(target: &Path, link: &Path) -> std::io::Result<()> {
        std::os::unix::fs::symlink(target, link)
    }

    #[test]
    fn a_link_out_of_the_pack_is_not_followed() {
        let dir = tempfile::tempdir().unwrap();
        let packs = Packs::with(dir.path().join("packs"), true);
        let root = pack(&dir.path().join("packs"), "mine");
        std::fs::write(dir.path().join("secret.json"), b"no").unwrap();
        let linked = link_file(&dir.path().join("secret.json"), &root.join("look.json"));
        if linked.is_err() {
            eprintln!("no symlink right here: the link case is skipped");
            return;
        }
        assert!(packs.path_of("mine", "look.json").is_none());
    }

    #[test]
    fn a_pack_is_measured_and_a_stray_file_or_an_over_cap_pack_is_not_a_pack() {
        let dir = tempfile::tempdir().unwrap();
        let root = pack(dir.path(), "mine");
        assert_eq!(measure(&root).map(|m| m.0), Some(1));
        std::fs::write(root.join("assets/big.png"), vec![0u8; FILE_MAX_BYTES as usize + 1]).unwrap();
        assert!(measure(&root).is_none(), "a file over its cap");
        std::fs::remove_file(root.join("assets/big.png")).unwrap();
        for k in 0..3 {
            std::fs::write(root.join(format!("assets/f{k}.png")), vec![0u8; 200_000]).unwrap();
        }
        assert!(measure(&root).is_none(), "over the pack's cap");
        std::fs::remove_dir_all(root.join("assets")).unwrap();
        std::fs::create_dir_all(&root).unwrap();
        std::fs::write(root.join("pack.css"), b"").unwrap();
        assert!(measure(&root).is_none(), "a stray name");
    }

    fn files(list: &[(&str, &str)]) -> Value {
        let files: Vec<Value> = list.iter().map(|(p, c)| json!({ "path": p, "data": STANDARD.encode(c) })).collect();
        json!({ "id": "mine", "files": files })
    }

    #[test]
    fn an_import_needs_both_json_files_naming_the_id_and_refuses_pack_css() {
        let ok = [("pack.json", r#"{"id":"mine"}"#), ("look.json", r#"{"id":"mine"}"#)];
        assert!(checked_import(&files(&ok)).is_ok());
        let refused = |list: &[(&str, &str)]| checked_import(&files(list)).err().map(|Refused(s, _)| s);
        assert_eq!(refused(&[("pack.json", r#"{"id":"mine"}"#)]), Some(400), "look.json missing");
        assert_eq!(refused(&[("pack.json", r#"{"id":"x"}"#), ("look.json", r#"{"id":"mine"}"#)]), Some(400), "another id");
        assert_eq!(refused(&[ok[0], ok[1], ("pack.css", "a{}")]), Some(400));
        assert_eq!(refused(&[ok[0], ok[1], ("../x.json", "{}")]), Some(400));
        assert_eq!(refused(&[ok[0], ok[1], ("pack.json", "{}")]), Some(400), "twice");
        assert_eq!(refused(&[ok[0], ("look.json", "nope")]), Some(400), "not JSON");
        let big = "a".repeat(FILE_MAX_BYTES as usize + 1);
        assert_eq!(refused(&[ok[0], ok[1], ("OFL.txt", &big)]), Some(413));
        let mut many: Vec<(String, &str)> = (0..FILE_COUNT_MAX).map(|k| (format!("assets/f{k}.png"), "x")).collect();
        many.extend([("pack.json".to_string(), ok[0].1), ("look.json".to_string(), ok[1].1)]);
        let many: Vec<(&str, &str)> = many.iter().map(|(p, c)| (p.as_str(), *c)).collect();
        assert_eq!(refused(&many), Some(413), "over 64 files");
        assert!(checked_import(&json!({ "id": "Bad", "files": [] })).is_err());
    }
}
