// User widgets (Phase 5a): widget packages a user brought, in DATA_DIR/widgets/<key>/, one folder per package. The package
// format is one for recipes (now) and code widgets (Phase 6): `manifest.json` lists every other file with its size and SHA-256,
// then the files. The server stores and serves packages and nothing more, as it does packs (packs.rs): the recipe validator
// (src/widgets/recipe/validate.ts) runs in the studio at import and again in the kiosk every time a recipe is loaded, and is the
// only reader of a recipe's meaning. What the server does itself is path safety, size, and the manifest: a key and a file are
// matched against strict patterns before any path is built, a file is canonicalised and must stay inside its folder (a link is
// never followed), and a folder whose files are not exactly the manifest's, byte for byte (the hashes are taken on every read),
// is not a package: not listed, not served.
//
// A package's key is its id with the namespace's colon as a dot (`recipe:cpu-card` is `recipe.cpu-card`), safe in a route and a
// folder name (Gate 0 answer 5). Code widgets (`ext:<publisher>.<id>`, kind `code`) are refused until 6a adds their signatures.
//
// GET /api/widgets                 list: id, kind, name, version, size and origin of each package (`X-User-Widgets: off` when off)
// POST /api/widgets                import: `{ "files": [{ "path", "data" (base64) }], "origin"?: "studio" | "import" }`, replaces
//                                  the package of that id
//
// Where a package came from (Phase 5b: the Widgets page's Yours and Imported) is the server's word, not the package's: the
// studio's builder saves with `origin: "studio"`, a file import is `"import"` (the default). It is kept in `.origin` beside the
// package's files, outside the manifest and its hashes: never a package file, never served, so an export leaves it out.
// GET/HEAD /api/widgets/<key>/<file>   one file, typed by its extension, `nosniff`, a CSP that allows nothing
// DELETE /api/widgets/<key>        remove a package
//
// Writes need `X-Dashboard-Widget: 1` and come from this computer unless ALLOW_REMOTE_UPLOAD=1 (the packs' rule). The rollback
// switch: `USER_WIDGETS=off` turns the folder read and every route off (the list is empty, a file is 404, a write 403); each
// answer then says `X-User-Widgets: off`, which the kiosk reads to draw no user widget at all.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use axum::body::Body;
use axum::http::{HeaderValue, Method, Response};
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::http::{self, Req};
use crate::{js, App};

/// A package is at most this many bytes, a file at most `FILE_MAX_BYTES`, a package at most `FILE_COUNT_MAX` files (the
/// validator's `PACKAGE_MAX_BYTES`, `FILE_MAX_BYTES` and `FILE_COUNT_MAX`).
pub const PACKAGE_MAX_BYTES: u64 = 512_000;
pub const FILE_MAX_BYTES: u64 = 256_000;
pub const FILE_COUNT_MAX: usize = 32;
/// At most this many packages, and this many bytes of them in all.
pub const WIDGETS_MAX: usize = 64;
pub const WIDGETS_TOTAL_BYTES: u64 = 16_000_000;
/// An import body: the package as base64 in JSON, with room for the paths.
const IMPORT_BODY_MAX: usize = (PACKAGE_MAX_BYTES as usize) * 4 / 3 + 64 * 1024;

const MANIFEST: &str = "manifest.json";
const RECIPE: &str = "recipe.json";
const IMAGES: &str = "images";
/// The sidecar the server writes beside a package's files: where it came from, one of `ORIGINS`.
const ORIGIN: &str = ".origin";
const ORIGINS: [&str; 2] = ["studio", "import"];
/// The start of a folder an import writes into; a leftover is swept at start.
const TEMP_PREFIX: &str = ".import-";
/// The start of a replaced package set aside as `.import-old-<key>-<uuid>`; the sweep puts it back when the package's own folder is gone.
const ASIDE_PREFIX: &str = ".import-old-";
const UUID_LEN: usize = 36;
/// The extensions an image may have (`images/<name>.<ext>`).
const IMAGE_EXTS: [&str; 3] = ["png", "jpg", "webp"];
const RECIPE_NS: &str = "recipe.";

/// A name Windows keeps for a device (`con`, `nul`, `com1`, ... with or without an extension).
fn is_device_name(s: &str) -> bool {
    let stem = s.split('.').next().unwrap_or("");
    matches!(stem, "con" | "prn" | "aux" | "nul") || (stem.len() == 4 && (stem.starts_with("com") || stem.starts_with("lpt")) && matches!(stem.as_bytes()[3], b'1'..=b'9'))
}

/// A lowercase name of letters, digits and hyphens, 1 to `max` characters, not starting with a hyphen, not a device name.
fn is_name(s: &str, max: usize) -> bool {
    (1..=max).contains(&s.len()) && !is_device_name(s) && !s.starts_with('-') && s.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

/// A package key: `recipe.<name>` with a name of up to 48 (the id `recipe:<name>`).
pub fn is_widget_key(s: &str) -> bool {
    s.strip_prefix(RECIPE_NS).is_some_and(|name| is_name(name, 48))
}

/// The key of a package id (`recipe:<name>` -> `recipe.<name>`), when the id is a recipe's.
pub fn key_of(id: &str) -> Option<String> {
    let name = id.strip_prefix("recipe:")?;
    let key = format!("{RECIPE_NS}{name}");
    is_widget_key(&key).then_some(key)
}

/// A file of a package by its path from the package folder: `manifest.json`, `recipe.json` or `images/<name>.<ext>`. Nothing else
/// is a path: no separator but the one after `images`, no dot but the extension's, no `%`, backslash, colon, NUL or non-ASCII.
pub fn is_widget_file(s: &str) -> bool {
    if s == MANIFEST || s == RECIPE {
        return true;
    }
    let Some(name) = s.strip_prefix("images/") else {
        return false;
    };
    name.rsplit_once('.').is_some_and(|(stem, ext)| is_name(stem, 64) && IMAGE_EXTS.contains(&ext))
}

/// The `Content-Type` of a package file, by its extension.
fn mime_of(file: &str) -> Option<&'static str> {
    Some(match file.rsplit_once('.')?.1 {
        "json" => "application/json; charset=utf-8",
        "png" => "image/png",
        "jpg" => "image/jpeg",
        "webp" => "image/webp",
        _ => return None,
    })
}

/// The lowercase hex SHA-256 of `bytes`.
pub fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes).iter().map(|b| format!("{b:02x}")).collect()
}

/// The decoded files of a package: path and bytes.
type Files = Vec<(String, Vec<u8>)>;

/// A refused import: its status and message.
struct Refused(u16, String);

fn refuse(status: u16, message: impl Into<String>) -> Refused {
    Refused(status, message.into())
}

/// What a valid manifest says of its package.
#[derive(Debug, PartialEq)]
pub struct Listed {
    pub id: String,
    pub kind: String,
    pub name: String,
    pub version: String,
}

/// Checks a package's files against its manifest: every file a package has, within the caps, the manifest a recipe's naming
/// `key`'s id, every other file listed once with its exact size and SHA-256, and `recipe.json` JSON naming the same id and version.
fn checked_files(files: &Files, key: Option<&str>) -> Result<Listed, Refused> {
    if files.len() > FILE_COUNT_MAX {
        return Err(refuse(413, format!("{} files, at most {FILE_COUNT_MAX}", files.len())));
    }
    let mut total = 0u64;
    for (path, bytes) in files {
        if !is_widget_file(path) {
            return Err(refuse(400, format!("{} is not a file a widget package has", path.chars().take(60).collect::<String>())));
        }
        if files.iter().filter(|(p, _)| p == path).count() > 1 {
            return Err(refuse(400, format!("{path} is given twice")));
        }
        if bytes.len() as u64 > FILE_MAX_BYTES {
            return Err(refuse(413, format!("{path} is over {FILE_MAX_BYTES} bytes")));
        }
        total += bytes.len() as u64;
    }
    if total > PACKAGE_MAX_BYTES {
        return Err(refuse(413, format!("the package is over {PACKAGE_MAX_BYTES} bytes")));
    }
    let json = |name: &str| -> Result<Value, Refused> {
        let bytes = files.iter().find(|(p, _)| p == name).map(|(_, b)| b).ok_or_else(|| refuse(400, format!("{name} is missing")))?;
        serde_json::from_slice::<Value>(bytes).ok().filter(Value::is_object).ok_or_else(|| refuse(400, format!("{name} is not a JSON object")))
    };
    let manifest = json(MANIFEST)?;
    let text = |v: &Value, field: &str| v.get(field).and_then(Value::as_str).map(str::to_string);
    let kind = text(&manifest, "kind").unwrap_or_default();
    if kind != "recipe" {
        return Err(refuse(400, format!("kind {:?}: this server takes recipe packages only (code widgets need signatures, Phase 6)", kind.chars().take(20).collect::<String>())));
    }
    if manifest.get("signature").is_some() {
        return Err(refuse(400, "a recipe package carries no signature"));
    }
    let id = text(&manifest, "id").unwrap_or_default();
    let Some(own) = key_of(&id) else {
        return Err(refuse(400, "the manifest's id is not recipe:<name> (lowercase letters, digits and hyphens, 48 at most)"));
    };
    if key.is_some_and(|k| k != own) {
        return Err(refuse(400, "the manifest names another package than its folder"));
    }
    let version = text(&manifest, "version").unwrap_or_default();
    let recipe = json(RECIPE)?;
    if text(&recipe, "id").as_deref() != Some(id.as_str()) || text(&recipe, "version").as_deref() != Some(version.as_str()) {
        return Err(refuse(400, "recipe.json names another id or version than the manifest"));
    }
    let list = manifest.get("files").and_then(Value::as_array).ok_or_else(|| refuse(400, "the manifest lists no files"))?;
    let mut listed: Vec<&str> = Vec::new();
    for entry in list {
        let path = entry.get("path").and_then(Value::as_str).unwrap_or("");
        if listed.contains(&path) {
            return Err(refuse(400, format!("{} is listed twice", path.chars().take(60).collect::<String>())));
        }
        listed.push(path);
        let Some((_, bytes)) = files.iter().find(|(p, _)| p == path && p != MANIFEST) else {
            return Err(refuse(400, format!("{} is listed and not in the package", path.chars().take(60).collect::<String>())));
        };
        if entry.get("bytes").and_then(Value::as_u64) != Some(bytes.len() as u64) || entry.get("sha256").and_then(Value::as_str) != Some(sha256_hex(bytes).as_str()) {
            return Err(refuse(400, format!("{path} is not the file the manifest lists (size or SHA-256)")));
        }
    }
    if let Some((path, _)) = files.iter().find(|(p, _)| p != MANIFEST && !listed.contains(&p.as_str())) {
        return Err(refuse(400, format!("{path} is not in the manifest")));
    }
    let name = text(&manifest, "name").or_else(|| text(&recipe, "name")).unwrap_or_else(|| id.clone()).chars().take(80).collect();
    Ok(Listed { id, kind, name, version })
}

/// The user-widget store: its folder, whether it is read at all, and who may write.
pub struct Widgets {
    dir: PathBuf,
    enabled: bool,
    allow_remote: bool,
    /// Held across an import's cap checks and write, and a remove, so two at once cannot both pass the caps.
    write: Mutex<()>,
}

impl Widgets {
    /// The store in `dir`. `USER_WIDGETS=off` (or `0`) is the rollback switch.
    pub fn new(dir: PathBuf, allow_remote: bool) -> Self {
        let enabled = !matches!(std::env::var("USER_WIDGETS").ok().as_deref(), Some("off" | "0"));
        let widgets = Self { dir, enabled, allow_remote, write: Mutex::new(()) };
        widgets.sweep();
        widgets
    }

    #[cfg(test)]
    fn with(dir: PathBuf, enabled: bool) -> Self {
        Self { dir, enabled, allow_remote: false, write: Mutex::new(()) }
    }

    /// Whether the store is read at all.
    pub fn enabled(&self) -> bool {
        self.enabled
    }

    /// Recovers from a crash in an import, as the packs' sweep does: a package set aside whose own folder is gone is put back,
    /// one whose folder is there goes, and the half-written folders go last.
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
                Some(rest) => asides.push((aside_key(rest), entry.path())),
                None => temps.push(entry.path()),
            }
        }
        asides.sort_by_key(|(_, path)| std::cmp::Reverse((std::fs::metadata(path.join(MANIFEST)).and_then(|m| m.modified()).ok(), path.clone())));
        let mut kept = false;
        for (key, path) in asides {
            match key.map(|k| self.dir.join(k)) {
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

    /// Stores a checked import under the write lock: written beside its place under a name no key has, then moved in, so a
    /// half-written package is never a package; a replaced one is set aside until the new one is in place.
    fn store(&self, key: &str, files: &Files, origin: &str) -> std::io::Result<Result<(), Refused>> {
        let _held = self.write.lock().unwrap_or_else(|e| e.into_inner());
        let others: Vec<u64> = listed(self).into_iter().filter(|(other, _)| other != key).map(|(_, (_, bytes))| bytes).collect();
        if others.len() + 1 > WIDGETS_MAX {
            return Ok(Err(refuse(413, format!("{WIDGETS_MAX} widgets are stored; remove one first"))));
        }
        if others.iter().sum::<u64>() + files.iter().map(|(_, b)| b.len() as u64).sum::<u64>() > WIDGETS_TOTAL_BYTES {
            return Ok(Err(refuse(413, format!("the widgets would take over {WIDGETS_TOTAL_BYTES} bytes in all; remove one first"))));
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
            std::fs::write(temp.join(ORIGIN), origin)?;
            let dest = self.dir.join(key);
            let aside = self.dir.join(format!("{ASIDE_PREFIX}{key}-{}", uuid::Uuid::new_v4()));
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

    /// The file `file` of package `key`, or `None` for anything not a package file inside its folder: the names are matched first,
    /// then the path is canonicalised and must stay under the canonical `widgets/<key>/`; a link is refused whatever it points at.
    pub fn path_of(&self, key: &str, file: &str) -> Option<PathBuf> {
        if !self.enabled || !is_widget_key(key) || !is_widget_file(file) {
            return None;
        }
        let root = self.package_dir(key)?;
        let path = root.join(file);
        if std::fs::symlink_metadata(&path).ok()?.file_type().is_symlink() {
            return None;
        }
        let real = std::fs::canonicalize(&path).ok()?;
        (real.starts_with(&root) && real.is_file()).then_some(real)
    }

    /// The `recipe.json` of the package with id `id`, parsed, when it is there (the weather source reads a recipe's place lists; the
    /// validator, not this, decides whether it may be drawn).
    pub fn recipe_json(&self, id: &str) -> Option<Value> {
        crate::store::read_json(&self.path_of(&key_of(id)?, RECIPE)?)
    }

    /// Removes a package under the write lock. `false`: no such package.
    fn remove(&self, key: &str) -> std::io::Result<bool> {
        let _held = self.write.lock().unwrap_or_else(|e| e.into_inner());
        let Some(root) = is_widget_key(key).then(|| self.package_dir(key)).flatten() else {
            return Ok(false);
        };
        std::fs::remove_dir_all(root)?;
        Ok(true)
    }

    /// The canonical folder of package `key` under the canonical widgets folder, when it is a real folder (not a link).
    fn package_dir(&self, key: &str) -> Option<PathBuf> {
        let base = std::fs::canonicalize(&self.dir).ok()?;
        let dir = base.join(key);
        if std::fs::symlink_metadata(&dir).ok()?.file_type().is_symlink() {
            return None;
        }
        let real = std::fs::canonicalize(&dir).ok()?;
        (real.parent() == Some(base.as_path()) && real.is_dir()).then_some(real)
    }

    /// The reason a write is refused, or `None`.
    fn write_refusal(&self, req: &Req) -> Option<&'static str> {
        if !self.enabled {
            return Some("user widgets are off");
        }
        if req.header("x-dashboard-widget").as_deref() != Some("1") {
            return Some("missing X-Dashboard-Widget header");
        }
        (!self.allow_remote && !req.is_loopback()).then_some("widgets are accepted from this computer only")
    }
}

/// The package a set-aside folder holds, from what follows `.import-old-` in its name (`<key>-<uuid>`), else its manifest's id.
fn aside_key(rest: &str) -> Option<String> {
    let named = rest.len().checked_sub(UUID_LEN + 1).and_then(|n| {
        let uuid = rest.get(n..)?.strip_prefix('-')?;
        uuid::Uuid::try_parse(uuid).ok()?;
        rest.get(..n)
    });
    named.map(str::to_string).filter(|k| is_widget_key(k))
}

/// A package folder's files: every file at its top and in `images/`. `None` for a folder with anything else in it (a sub-folder,
/// a link, a stray name) or a file over its cap: not a package this server wrote.
fn read_files(root: &Path) -> Option<Files> {
    let mut files = Vec::new();
    for (dir, prefix) in [(root.to_path_buf(), ""), (root.join(IMAGES), "images/")] {
        let Ok(entries) = std::fs::read_dir(&dir) else {
            if prefix.is_empty() {
                return None;
            }
            continue;
        };
        for entry in entries.filter_map(Result::ok) {
            let meta = std::fs::symlink_metadata(entry.path()).ok()?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if prefix.is_empty() && ((meta.is_dir() && name == IMAGES) || (meta.is_file() && name == ORIGIN)) {
                continue;
            }
            let path = format!("{prefix}{name}");
            if !meta.is_file() || !is_widget_file(&path) || meta.len() > FILE_MAX_BYTES || files.len() >= FILE_COUNT_MAX {
                return None;
            }
            files.push((path, std::fs::read(entry.path()).ok()?));
        }
    }
    Some(files)
}

/// What a folder holds when it is a package that may be served: its manifest's word, checked against the files as they are now.
fn measured(root: &Path, key: &str) -> Option<(Listed, u64)> {
    let files = read_files(root)?;
    let listed = checked_files(&files, Some(key)).ok()?;
    Some((listed, files.iter().map(|(_, b)| b.len() as u64).sum()))
}

/// Where the package in `root` came from: its `.origin`, else `import` (a package from before origins, or one put there by hand).
fn origin_of(root: &Path) -> &'static str {
    let found = std::fs::read_to_string(root.join(ORIGIN)).unwrap_or_default();
    ORIGINS.into_iter().find(|o| *o == found.trim()).unwrap_or("import")
}

/// The packages in the widgets folder that may be served, by key, with their manifest's word and size, sorted.
fn listed(widgets: &Widgets) -> Vec<(String, (Listed, u64))> {
    let mut found = Vec::new();
    if !widgets.enabled {
        return found;
    }
    let Ok(entries) = std::fs::read_dir(&widgets.dir) else {
        return found;
    };
    for entry in entries.filter_map(Result::ok) {
        let key = entry.file_name().to_string_lossy().into_owned();
        if let Some(done) = is_widget_key(&key).then(|| widgets.package_dir(&key)).flatten().and_then(|root| measured(&root, &key)) {
            found.push((key, done));
        }
    }
    found.sort_by(|a, b| a.0.cmp(&b.0));
    found
}

/// The answer's word that the store is off, on every route.
fn off(mut reply: Response<Body>) -> Response<Body> {
    reply.headers_mut().insert("X-User-Widgets", HeaderValue::from_static("off"));
    reply
}

fn handle_list(app: &App) -> Response<Body> {
    let widgets = &app.widgets;
    let items: Vec<Value> = listed(widgets)
        .into_iter()
        .map(|(key, (l, size))| {
            let origin = widgets.package_dir(&key).map_or("import", |root| origin_of(&root));
            json!({ "id": l.id, "kind": l.kind, "name": l.name, "version": l.version, "size": size, "origin": origin })
        })
        .collect();
    let reply = http::json(200, &Value::Array(items));
    if widgets.enabled { reply } else { off(reply) }
}

/// An import's body as files: `{ files: [{ path, data }] }`, each path checked before it is decoded.
fn decoded(body: &Value) -> Result<Files, Refused> {
    let list = body.get("files").and_then(Value::as_array).ok_or_else(|| refuse(400, "no files"))?;
    if list.len() > FILE_COUNT_MAX {
        return Err(refuse(413, format!("{} files, at most {FILE_COUNT_MAX}", list.len())));
    }
    let mut files = Vec::new();
    for f in list {
        let path = f.get("path").and_then(Value::as_str).unwrap_or("");
        if !is_widget_file(path) {
            return Err(refuse(400, format!("{} is not a file a widget package has", path.chars().take(60).collect::<String>())));
        }
        let bytes = STANDARD.decode(f.get("data").and_then(Value::as_str).unwrap_or("")).map_err(|_| refuse(400, format!("{path} is not base64")))?;
        files.push((path.to_string(), bytes));
    }
    Ok(files)
}

async fn handle_import(app: &App, mut req: Req) -> std::io::Result<Response<Body>> {
    let widgets = &app.widgets;
    if let Some(refusal) = widgets.write_refusal(&req) {
        let reply = http::text(403, refusal);
        return Ok(if widgets.enabled { reply } else { off(reply) });
    }
    let length = req.header("content-length").map_or(f64::NAN, |v| js::string_to_number(&v));
    if length > IMPORT_BODY_MAX as f64 {
        return Ok(http::closing(http::empty(413)));
    }
    let Ok(text) = req.read_body(IMPORT_BODY_MAX).await else {
        return Ok(http::closing(http::text(413, "the package is too large")));
    };
    let Ok(body) = serde_json::from_str::<Value>(&text) else {
        return Ok(http::text(400, "the body is not JSON"));
    };
    let origin = match body.get("origin") {
        None => "import",
        Some(v) => match ORIGINS.into_iter().find(|o| v.as_str() == Some(*o)) {
            Some(o) => o,
            None => return Ok(http::text(400, "origin is \"studio\" or \"import\"")),
        },
    };
    let checked = decoded(&body).and_then(|files| checked_files(&files, None).map(|l| (files, l)));
    let (files, listed) = match checked {
        Ok(done) => done,
        Err(Refused(status, message)) => return Ok(http::text(status, message)),
    };
    let key = key_of(&listed.id).unwrap_or_default();
    if let Err(Refused(status, message)) = widgets.store(&key, &files, origin)? {
        return Ok(http::text(status, message));
    }
    let size: u64 = files.iter().map(|(_, b)| b.len() as u64).sum();
    Ok(http::json(200, &json!({ "id": listed.id, "kind": listed.kind, "name": listed.name, "version": listed.version, "size": size, "origin": origin })))
}

fn handle_delete(app: &App, req: &Req, key: &str) -> std::io::Result<Response<Body>> {
    let widgets = &app.widgets;
    if let Some(refusal) = widgets.write_refusal(req) {
        let reply = http::text(403, refusal);
        return Ok(if widgets.enabled { reply } else { off(reply) });
    }
    Ok(http::empty(if widgets.remove(key)? { 204 } else { 404 }))
}

/// One file of a package: refused whole (413) when the folder is not a package within the caps and its manifest, typed by its extension.
fn serve_file(app: &App, req: &Req, key: &str, file: &str) -> Response<Body> {
    let widgets = &app.widgets;
    if !widgets.enabled {
        return off(http::empty(404));
    }
    let Some(path) = widgets.path_of(key, file) else {
        return http::empty(404);
    };
    if widgets.package_dir(key).and_then(|root| measured(&root, key)).is_none() {
        return http::empty(413);
    }
    let (Some(mime), Ok(bytes)) = (mime_of(file), std::fs::read(&path)) else {
        return http::empty(404);
    };
    let length = bytes.len();
    Response::builder()
        .status(200)
        .header("Content-Type", mime)
        .header("Content-Length", length.to_string())
        .header("Cache-Control", "no-cache")
        .header("X-Content-Type-Options", "nosniff")
        .header("Content-Security-Policy", "default-src 'none'; sandbox")
        .body(if req.method == Method::HEAD { Body::empty() } else { Body::from(bytes) })
        .unwrap_or_default()
}

/// /api/widgets and /api/widgets/<key>/<file>.
pub async fn handle(app: &App, req: Req) -> std::io::Result<Response<Body>> {
    if req.path == "/api/widgets" {
        return match req.method {
            Method::GET => Ok(handle_list(app)),
            Method::POST => handle_import(app, req).await,
            _ => Ok(http::empty(405)),
        };
    }
    let rest = req.path.strip_prefix("/api/widgets/").unwrap_or("");
    let (key, file) = rest.split_once('/').map_or((rest, None), |(key, file)| (key, Some(file)));
    match (&req.method, file) {
        (&Method::DELETE, None) => handle_delete(app, &req, key),
        (&Method::GET | &Method::HEAD, Some(file)) => Ok(serve_file(app, &req, key, file)),
        (&Method::GET | &Method::HEAD | &Method::DELETE, _) => Ok(http::empty(404)),
        _ => Ok(http::empty(405)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_are_recipe_names_of_at_most_48() {
        for ok in ["recipe.a", "recipe.cpu-card", "recipe.0x", &format!("recipe.{}", "a".repeat(48))] {
            assert!(is_widget_key(ok), "{ok}");
        }
        for bad in ["recipe.", "recipe.nul", "recipe.com1", "recipe.-a", "recipe.A", "recipe.a_b", "recipe.a.b", "recipe.a/b", "recipe:a", "Recipe.a", "ext.me.a", "a", "..", "", "recipe.é", &format!("recipe.{}", "a".repeat(49))] {
            assert!(!is_widget_key(bad), "{bad:?}");
        }
        assert_eq!(key_of("recipe:cpu-card").as_deref(), Some("recipe.cpu-card"));
        assert_eq!(key_of("ext:me.card"), None);
        assert_eq!(key_of("recipe:../x"), None);
    }

    #[test]
    fn files_are_the_two_json_files_or_an_image_of_a_known_type() {
        for ok in ["manifest.json", "recipe.json", "images/logo.png", "images/a.jpg", "images/a-b.webp"] {
            assert!(is_widget_file(ok), "{ok}");
        }
        for bad in [
            "", "pack.json", "Manifest.json", "../recipe.json", "images/../recipe.json", "images/", "images/a", "images/a.svg", "images/a.gif", "images/a.PNG", "images/a/b.png",
            "images\\a.png", "images/a%2epng", "images/a.png ", "images/a.png\0", "images/é.png", "C:/x.png", "//x/y.png", "images/con.png", "images/-a.png", "recipe.json/", "./recipe.json",
            "bundle.js", "images/a.png:stream",
        ] {
            assert!(!is_widget_file(bad), "{bad:?}");
        }
    }

    fn package(id: &str) -> Files {
        let recipe = json!({ "id": id, "version": "1.0.0", "name": "N" }).to_string().into_bytes();
        let manifest = json!({ "format": 1, "kind": "recipe", "id": id, "version": "1.0.0", "author": "a", "files": [{ "path": "recipe.json", "bytes": recipe.len(), "sha256": sha256_hex(&recipe) }] });
        vec![("manifest.json".into(), manifest.to_string().into_bytes()), ("recipe.json".into(), recipe)]
    }

    #[test]
    fn a_package_is_its_manifest_byte_for_byte() {
        let ok = package("recipe:mine");
        assert_eq!(checked_files(&ok, Some("recipe.mine")).map(|l| l.id).ok().as_deref(), Some("recipe:mine"));
        let refused = |files: &Files| checked_files(files, None).err().map(|Refused(s, _)| s);
        let mut edited = ok.clone();
        edited[1].1.push(b' ');
        assert_eq!(refused(&edited), Some(400), "a changed file");
        let mut extra = ok.clone();
        extra.push(("images/a.png".into(), b"x".to_vec()));
        assert_eq!(refused(&extra), Some(400), "a file not listed");
        assert_eq!(refused(&vec![ok[0].clone()]), Some(400), "a listed file missing");
        assert_eq!(checked_files(&ok, Some("recipe.other")).err().map(|Refused(s, _)| s), Some(400), "another folder's");
    }

    fn write(dir: &Path, key: &str, files: &Files) -> PathBuf {
        let root = dir.join(key);
        for (path, bytes) in files {
            std::fs::create_dir_all(root.join(path).parent().unwrap()).unwrap();
            std::fs::write(root.join(path), bytes).unwrap();
        }
        root
    }

    #[test]
    fn a_crash_leftover_is_swept_and_a_set_aside_package_is_put_back() {
        let dir = tempfile::tempdir().unwrap();
        write(dir.path(), "recipe.kept", &package("recipe:kept"));
        write(dir.path(), ".import-1", &package("recipe:half"));
        write(dir.path(), ".import-old-recipe.back-11111111-2222-3333-4444-555555555555", &package("recipe:back"));
        Widgets::with(dir.path().to_path_buf(), true).sweep();
        let mut names: Vec<String> = std::fs::read_dir(dir.path()).unwrap().map(|e| e.unwrap().file_name().to_string_lossy().into_owned()).collect();
        names.sort();
        assert_eq!(names, ["recipe.back", "recipe.kept"]);
    }

    #[test]
    fn two_imports_at_once_cannot_pass_the_count_cap_together() {
        for round in 0..10 {
            let dir = tempfile::tempdir().unwrap();
            let widgets = Widgets::with(dir.path().to_path_buf(), true);
            for k in 0..WIDGETS_MAX - 1 {
                write(dir.path(), &format!("recipe.p{k}"), &package(&format!("recipe:p{k}")));
            }
            let gate = std::sync::Barrier::new(2);
            let (a, b) = (package("recipe:a"), package("recipe:b"));
            let stored = std::thread::scope(|scope| {
                let x = scope.spawn(|| {
                    gate.wait();
                    widgets.store("recipe.a", &a, "import").unwrap().is_ok()
                });
                let y = scope.spawn(|| {
                    gate.wait();
                    widgets.store("recipe.b", &b, "import").unwrap().is_ok()
                });
                [x.join().unwrap(), y.join().unwrap()]
            });
            assert_eq!(stored.iter().filter(|ok| **ok).count(), 1, "round {round}: {stored:?}");
        }
    }
}
