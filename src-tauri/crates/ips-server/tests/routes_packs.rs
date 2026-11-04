// The user-pack routes over a real socket (/api/packs, /api/packs/<id>/<file>): a server on a free port with a temp data
// folder, and raw HTTP/1.1 requests. A pack is files in DATA_DIR/packs/<id>/; the checks here are path safety (every
// spelling of a way out of the pack folder), the caps, the types and headers, and an import's structure.

use std::path::{Path, PathBuf};
use std::time::Duration;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use ips_server::{bind_with_home, ServerConfig};
use serde_json::{json, Value};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::oneshot;

struct Server {
    port: u16,
    dir: tempfile::TempDir,
    stop: Option<oneshot::Sender<()>>,
    done: tokio::task::JoinHandle<()>,
}

impl Server {
    fn packs(&self) -> PathBuf {
        self.dir.path().join("data").join("packs")
    }

    async fn stop(mut self) {
        let _ = self.stop.take().unwrap().send(());
        tokio::time::timeout(Duration::from_secs(5), &mut self.done).await.expect("graceful stop").unwrap();
    }
}

fn config(dir: &Path) -> ServerConfig {
    ServerConfig {
        host: "127.0.0.1".into(),
        port: 0,
        allowed_hosts: vec![],
        allow_remote_edit: false,
        allow_remote_upload: false,
        dist: dir.join("dist"),
        data_dir: dir.join("data"),
        infopanel_dir: dir.join("infopanel"),
        debug: false,
        version: "9.9.9".into(),
    }
}

async fn start() -> Server {
    let dir = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(dir.path().join("dist")).unwrap();
    std::fs::write(dir.path().join("dist/index.html"), "<p>index</p>").unwrap();
    let cfg = config(dir.path());
    let home = cfg.data_dir.with_file_name("home");
    let bound = bind_with_home(cfg, home).await.unwrap();
    let port = bound.port();
    let (stop, stopped) = oneshot::channel::<()>();
    let done = tokio::spawn(bound.serve(async {
        let _ = stopped.await;
    }));
    Server { port, dir, stop: Some(stop), done }
}

struct Reply {
    status: u16,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}

impl Reply {
    fn header(&self, name: &str) -> Option<&str> {
        self.headers.iter().find(|(k, _)| k.eq_ignore_ascii_case(name)).map(|(_, v)| v.as_str())
    }

    fn text(&self) -> String {
        String::from_utf8_lossy(&self.body).into_owned()
    }
}

fn dechunk(mut raw: &[u8]) -> Vec<u8> {
    let mut out = Vec::new();
    while let Some(end) = raw.windows(2).position(|w| w == b"\r\n") {
        let size = usize::from_str_radix(std::str::from_utf8(&raw[..end]).unwrap().trim(), 16).unwrap();
        if size == 0 {
            break;
        }
        out.extend_from_slice(&raw[end + 2..end + 2 + size]);
        raw = &raw[end + 4 + size..];
    }
    out
}

/// Sends `method path` and reads the whole answer; a socket the server closes before a head is a status 0.
async fn send(port: u16, method: &str, path: &str, headers: &[(&str, &str)], body: &str) -> Reply {
    let mut stream = TcpStream::connect(("127.0.0.1", port)).await.unwrap();
    let mut request = format!("{method} {path} HTTP/1.1\r\nConnection: close\r\n");
    if !headers.iter().any(|(k, _)| k.eq_ignore_ascii_case("host")) {
        request.push_str(&format!("Host: 127.0.0.1:{port}\r\n"));
    }
    for (k, v) in headers {
        request.push_str(&format!("{k}: {v}\r\n"));
    }
    request.push_str(&format!("Content-Length: {}\r\n\r\n{body}", body.len()));
    let _ = stream.write_all(request.as_bytes()).await;
    let mut raw = Vec::new();
    let _ = tokio::time::timeout(Duration::from_secs(5), stream.read_to_end(&mut raw)).await;
    let Some(split) = raw.windows(4).position(|w| w == b"\r\n\r\n") else {
        return Reply { status: 0, headers: vec![], body: vec![] };
    };
    let head = String::from_utf8_lossy(&raw[..split]).into_owned();
    let mut lines = head.split("\r\n");
    let status = lines.next().unwrap().split(' ').nth(1).unwrap().parse().unwrap();
    let headers: Vec<(String, String)> = lines.filter_map(|l| l.split_once(':')).map(|(k, v)| (k.trim().to_string(), v.trim().to_string())).collect();
    let rest = &raw[split + 4..];
    let chunked = headers.iter().any(|(k, v)| k.eq_ignore_ascii_case("transfer-encoding") && v == "chunked");
    Reply { status, body: if chunked { dechunk(rest) } else { rest.to_vec() }, headers }
}

async fn get(port: u16, path: &str) -> Reply {
    send(port, "GET", path, &[], "").await
}

const WRITE: [(&str, &str); 2] = [("Content-Type", "application/json"), ("X-Dashboard-Pack", "1")];

fn pack_json(id: &str) -> String {
    json!({ "id": id, "name": "Mine" }).to_string()
}

/// A pack's files on disk, as an import would leave them.
fn write_pack(server: &Server, id: &str) -> PathBuf {
    let root = server.packs().join(id);
    std::fs::create_dir_all(root.join("assets")).unwrap();
    std::fs::write(root.join("pack.json"), pack_json(id)).unwrap();
    std::fs::write(root.join("look.json"), json!({ "id": id }).to_string()).unwrap();
    std::fs::write(root.join("OFL.txt"), "licence").unwrap();
    std::fs::write(root.join("assets/hex.svg"), "<svg/>").unwrap();
    std::fs::write(root.join("assets/f.woff2"), b"wOF2").unwrap();
    std::fs::write(root.join("assets/p.png"), b"png").unwrap();
    root
}

fn import_body(id: &str, files: &[(&str, &str)]) -> String {
    let list: Vec<Value> = files.iter().map(|(p, c)| json!({ "path": p, "data": STANDARD.encode(c) })).collect();
    json!({ "id": id, "files": list }).to_string()
}

/// `(path, content)` pairs as borrowed text.
fn pairs<'a>(files: &'a [(&'a str, String)]) -> Vec<(&'a str, &'a str)> {
    files.iter().map(|(p, c)| (*p, c.as_str())).collect()
}

#[tokio::test]
async fn lists_ids_names_and_sizes_and_nothing_else() {
    let s = start().await;
    assert_eq!(get(s.port, "/api/packs").await.text(), "[]");
    write_pack(&s, "mine");
    std::fs::create_dir_all(s.packs().join("Not-An-Id")).unwrap();
    std::fs::create_dir_all(s.packs().join("empty")).unwrap();
    let reply = get(s.port, "/api/packs").await;
    assert_eq!(reply.status, 200);
    let list: Value = serde_json::from_slice(&reply.body).unwrap();
    assert_eq!(list.as_array().unwrap().len(), 1);
    assert_eq!(list[0]["id"], "mine");
    assert_eq!(list[0]["name"], "Mine");
    assert!(list[0]["size"].as_u64().unwrap() > 0);
    assert_eq!(list[0].as_object().unwrap().len(), 3, "ids, names and sizes only");
    s.stop().await;
}

#[tokio::test]
async fn serves_a_file_with_its_type_nosniff_and_a_csp_that_allows_nothing() {
    let s = start().await;
    write_pack(&s, "mine");
    for (file, mime) in [("pack.json", "application/json; charset=utf-8"), ("assets/f.woff2", "font/woff2"), ("assets/p.png", "image/png"), ("OFL.txt", "text/plain; charset=utf-8"), ("assets/hex.svg", "image/svg+xml")] {
        let reply = get(s.port, &format!("/api/packs/mine/{file}")).await;
        assert_eq!(reply.status, 200, "{file}");
        assert_eq!(reply.header("content-type"), Some(mime), "{file}");
        assert_eq!(reply.header("x-content-type-options"), Some("nosniff"), "{file}");
        assert!(reply.header("content-security-policy").unwrap().contains("default-src 'none'"), "{file}");
    }
    assert!(get(s.port, "/api/packs/mine/assets/hex.svg").await.header("content-security-policy").unwrap().contains("sandbox"));
    let head = send(s.port, "HEAD", "/api/packs/mine/pack.json", &[], "").await;
    assert_eq!(head.status, 200);
    assert!(head.body.is_empty());
    assert_eq!(get(s.port, "/api/packs/mine/pack.json").await.text(), pack_json("mine"));
    s.stop().await;
}

#[tokio::test]
async fn a_missing_pack_a_missing_file_and_a_wrong_type_are_404() {
    let s = start().await;
    let root = write_pack(&s, "mine");
    std::fs::write(root.join("assets/x.png"), b"x").unwrap();
    for path in [
        "/api/packs/nope/pack.json",
        "/api/packs/mine/icons.json",
        "/api/packs/mine/assets/none.png",
        "/api/packs/mine",
        "/api/packs/mine/",
        "/api/packs/",
        "/api/packs/mine/assets/hex.gif",
        "/api/packs/mine/assets/hex.exe",
        "/api/packs/mine/pack.css",
        "/api/packs/mine/LOOK.md",
        "/api/packs/mine/assets/x.PNG",
    ] {
        assert_eq!(get(s.port, path).await.status, 404, "{path}");
    }
    s.stop().await;
}

#[tokio::test]
async fn no_spelling_of_a_way_out_reaches_a_file_outside_the_pack() {
    let s = start().await;
    write_pack(&s, "mine");
    write_pack(&s, "other");
    std::fs::write(s.packs().join("secret.json"), "SECRET").unwrap();
    std::fs::write(s.dir.path().join("data").join("config.json"), "SECRET").unwrap();
    std::fs::write(s.dir.path().join("secret.json"), "SECRET").unwrap();
    let spellings = [
        "..",
        "../secret.json",
        "../../secret.json",
        "../../../secret.json",
        "..%2fsecret.json",
        "..%2Fsecret.json",
        "%2e%2e/secret.json",
        "%2e%2e%2fsecret.json",
        "%2E%2E/secret.json",
        ".%2e/secret.json",
        "..%5csecret.json",
        "..\\secret.json",
        "%5c..%5csecret.json",
        "..%c0%afsecret.json",
        "%c0%ae%c0%ae/secret.json",
        "%252e%252e/secret.json",
        "%252e%252e%252fsecret.json",
        "assets/../../secret.json",
        "assets/../pack.json/../../secret.json",
        "assets/%2e%2e/%2e%2e/secret.json",
        "./pack.json",
        "%2e/pack.json",
        "pack.json%00.png",
        "pack.json%00",
        "assets/a%00.png",
        "/etc/passwd",
        "%2fetc%2fpasswd",
        "//etc/passwd",
        "C:/Windows/win.ini",
        "C%3a/Windows/win.ini",
        "C:\\Windows\\win.ini",
        "c%3A%5CWindows%5Cwin.ini",
        "\\\\server\\share\\x",
        "%5c%5cserver%5cshare%5cx",
        "pack.json::$DATA",
        "pack.json:stream",
        "pack.json.",
        "pack.json%20",
        "pack.json ",
        "PACK.JSON",
        "Pack.json",
        "pack%2ejson",
        "assets%2fhex.svg",
        "assets/hex.svg%2f",
        "assets/hex.svg/",
        "assets//hex.svg",
        "%ef%bc%8e%ef%bc%8e/secret.json",
        "\u{ff0e}\u{ff0e}/secret.json",
        "\u{2025}/secret.json",
        "\u{2024}\u{2024}/secret.json",
        "assets/h\u{e9}x.svg",
        "CON",
        "NUL",
        "assets/con.svg",
        "assets/CON.svg",
        "mine/pack.json",
        "../other/pack.json",
        "../mine/pack.json",
        "..%2fother%2fpack.json",
    ];
    for spelling in spellings {
        for id in ["mine", "..", "%2e%2e", "mine%2f..%2fother", "MINE", ".", ""] {
            let reply = get(s.port, &format!("/api/packs/{id}/{spelling}")).await;
            assert!(!reply.text().contains("SECRET"), "{id} / {spelling:?} leaked");
            // a 200 is only ever one of the packs' own files, reached by a path that names it exactly (or, where the URL
            // itself climbs out of /api/packs, the app's own index page: not a file of the data folder)
            if reply.status == 200 {
                let own = [pack_json("mine"), pack_json("other"), "<svg/>".to_string(), "licence".to_string(), "<p>index</p>".to_string()];
                assert!(own.contains(&reply.text()), "{id} / {spelling:?} gave a 200 with {:?}", reply.text());
            }
        }
    }
    s.stop().await;
}

#[tokio::test]
async fn a_symlink_out_of_a_pack_is_not_followed() {
    let s = start().await;
    let root = write_pack(&s, "mine");
    std::fs::write(s.dir.path().join("secret.json"), "SECRET").unwrap();
    let target = s.dir.path().join("secret.json");
    #[cfg(windows)]
    let linked = std::os::windows::fs::symlink_file(&target, root.join("icons.json"));
    #[cfg(unix)]
    let linked = std::os::unix::fs::symlink(&target, root.join("icons.json"));
    if linked.is_err() {
        eprintln!("no symlink right here: the link case is skipped");
        s.stop().await;
        return;
    }
    let reply = get(s.port, "/api/packs/mine/icons.json").await;
    assert!(!reply.text().contains("SECRET"));
    assert_ne!(reply.status, 200);
    s.stop().await;
}

#[tokio::test]
async fn a_pack_over_a_cap_is_not_served_or_listed() {
    let s = start().await;
    let root = write_pack(&s, "fat");
    write_pack(&s, "ok");
    std::fs::write(root.join("assets/big.png"), vec![0u8; 256_001]).unwrap();
    assert_eq!(get(s.port, "/api/packs/fat/assets/big.png").await.status, 413, "a file over 256,000");
    assert_eq!(get(s.port, "/api/packs/fat/pack.json").await.status, 413, "the pack goes with it");
    std::fs::remove_file(root.join("assets/big.png")).unwrap();
    for k in 0..3 {
        std::fs::write(root.join(format!("assets/f{k}.png")), vec![0u8; 200_000]).unwrap();
    }
    assert_eq!(get(s.port, "/api/packs/fat/pack.json").await.status, 413, "a pack over 512,000");
    for k in 0..3 {
        std::fs::remove_file(root.join(format!("assets/f{k}.png"))).unwrap();
    }
    for k in 0..65 {
        std::fs::write(root.join(format!("assets/g{k}.png")), b"x").unwrap();
    }
    assert_eq!(get(s.port, "/api/packs/fat/pack.json").await.status, 413, "over 64 files");
    let list: Value = serde_json::from_slice(&get(s.port, "/api/packs").await.body).unwrap();
    assert_eq!(list.as_array().unwrap().iter().map(|p| p["id"].as_str().unwrap()).collect::<Vec<_>>(), ["ok"]);
    s.stop().await;
}

#[tokio::test]
async fn a_folder_with_a_stray_file_is_not_a_pack() {
    let s = start().await;
    let root = write_pack(&s, "mine");
    std::fs::write(root.join("pack.css"), "a{}").unwrap();
    assert_eq!(get(s.port, "/api/packs/mine/pack.json").await.status, 413);
    assert_eq!(get(s.port, "/api/packs/mine/pack.css").await.status, 404);
    assert_eq!(get(s.port, "/api/packs").await.text(), "[]");
    s.stop().await;
}

#[tokio::test]
async fn an_import_stores_a_pack_that_is_then_served_and_replaced() {
    let s = start().await;
    let files = [("pack.json", pack_json("mine")), ("look.json", json!({ "id": "mine" }).to_string()), ("assets/hex.svg", "<svg/>".to_string())];
    let reply = send(s.port, "POST", "/api/packs", &WRITE, &import_body("mine", &pairs(&files))).await;
    assert_eq!(reply.status, 200, "{}", reply.text());
    assert_eq!(get(s.port, "/api/packs/mine/assets/hex.svg").await.text(), "<svg/>");
    assert!(s.packs().read_dir().unwrap().all(|e| !e.unwrap().file_name().to_string_lossy().starts_with(".import-")), "no temp folder left");
    // a second import replaces the pack whole
    assert_eq!(send(s.port, "POST", "/api/packs", &WRITE, &import_body("mine", &pairs(&files[..2]))).await.status, 200);
    assert_eq!(get(s.port, "/api/packs/mine/assets/hex.svg").await.status, 404);
    s.stop().await;
}

#[tokio::test]
async fn an_import_refuses_pack_css_a_bad_path_a_bad_id_and_the_wrong_caller() {
    let s = start().await;
    let ok = [("pack.json", pack_json("mine")), ("look.json", json!({ "id": "mine" }).to_string())];
    let with = |extra: (&str, &str)| -> String {
        let mut list = pairs(&ok);
        list.push(extra);
        import_body("mine", &list)
    };
    for extra in [("pack.css", "a{}"), ("../x.json", "{}"), ("assets/../x.json", "{}"), ("assets/a.gif", "x"), ("assets/a.exe", "x"), ("/pack.json", "{}"), ("C:/x.json", "{}"), ("assets/a.svg\0", "x"), ("assets/CON.png", "x")] {
        let reply = send(s.port, "POST", "/api/packs", &WRITE, &with(extra)).await;
        assert_eq!(reply.status, 400, "{extra:?}: {}", reply.text());
    }
    assert!(send(s.port, "POST", "/api/packs", &WRITE, &with(("pack.css", "a{}"))).await.text().contains("no pack.css"));
    for id in ["Mine", "../mine", "a b", ""] {
        assert_eq!(send(s.port, "POST", "/api/packs", &WRITE, &import_body(id, &pairs(&ok))).await.status, 400, "{id}");
    }
    assert_eq!(send(s.port, "POST", "/api/packs", &[("Content-Type", "application/json")], &import_body("mine", &pairs(&ok))).await.status, 403, "no header");
    let foreign = [("Content-Type", "application/json"), ("X-Dashboard-Pack", "1"), ("Origin", "http://evil.example")];
    assert_eq!(send(s.port, "POST", "/api/packs", &foreign, &import_body("mine", &pairs(&ok))).await.status, 403, "cross-site");
    assert_eq!(send(s.port, "POST", "/api/packs", &WRITE, "not json").await.status, 400);
    assert_eq!(send(s.port, "POST", "/api/packs", &WRITE, &import_body("mine", &[("pack.json", "{}")])).await.status, 400, "no look.json");
    assert_eq!(get(s.port, "/api/packs").await.text(), "[]", "nothing was stored");
    s.stop().await;
}

#[tokio::test]
async fn an_import_over_the_caps_is_413() {
    let s = start().await;
    let big = "a".repeat(256_001);
    let half = "a".repeat(180_000);
    let ok = [("pack.json", pack_json("mine")), ("look.json", json!({ "id": "mine" }).to_string())];
    let mut list = pairs(&ok);
    list.push(("OFL.txt", &big));
    assert_eq!(send(s.port, "POST", "/api/packs", &WRITE, &import_body("mine", &list)).await.status, 413);
    let mut list = pairs(&ok);
    list.extend([("OFL.txt", half.as_str()), ("LICENSE.txt", half.as_str()), ("LICENCE.txt", half.as_str())]);
    assert_eq!(send(s.port, "POST", "/api/packs", &WRITE, &import_body("mine", &list)).await.status, 413, "over 512,000 in all");
    let names: Vec<String> = (0..65).map(|k| format!("assets/f{k}.png")).collect();
    let mut list = pairs(&ok);
    list.extend(names.iter().map(|n| (n.as_str(), "x")));
    assert_eq!(send(s.port, "POST", "/api/packs", &WRITE, &import_body("mine", &list)).await.status, 413, "over 64 files");
    s.stop().await;
}

#[tokio::test]
async fn a_pack_is_removed_by_its_id_from_this_computer_only() {
    let s = start().await;
    write_pack(&s, "mine");
    assert_eq!(send(s.port, "DELETE", "/api/packs/mine", &[], "").await.status, 403, "no header");
    assert_eq!(send(s.port, "DELETE", "/api/packs/..", &WRITE, "").await.status, 404);
    assert_eq!(send(s.port, "DELETE", "/api/packs/nope", &WRITE, "").await.status, 404);
    assert_eq!(send(s.port, "DELETE", "/api/packs/mine", &WRITE, "").await.status, 204);
    assert!(!s.packs().join("mine").exists());
    assert_eq!(send(s.port, "PUT", "/api/packs", &WRITE, "").await.status, 405);
    s.stop().await;
}
