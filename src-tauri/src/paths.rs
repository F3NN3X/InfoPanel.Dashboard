// Where the app keeps its settings and logs, and where the bundled runtime lives.

use std::path::{Path, PathBuf};

pub const IDENTIFIER: &str = "dev.f3nn3x.infopanel-studio";

#[derive(Debug, Clone)]
pub struct Paths {
    /// settings.json and the agents marker.
    pub config_dir: PathBuf,
    /// app.log, server.log, metrics.csv.
    pub log_dir: PathBuf,
    /// The installed resources: node/node.exe and app/ (server.mjs, server/, dist/, tools/).
    pub resource_dir: PathBuf,
    /// The server's data folder for test runs (INFOPANEL_STUDIO_DATA_DIR); None = server default.
    pub data_dir: Option<PathBuf>,
}

fn env_path(name: &str) -> Option<PathBuf> {
    std::env::var_os(name)
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
}

impl Paths {
    /// `%APPDATA%\<id>` for settings and `%LOCALAPPDATA%\<id>\logs` for logs, both under
    /// INFOPANEL_STUDIO_CONFIG_DIR when that is set.
    pub fn from_env(resource_dir: PathBuf) -> Self {
        let (config_dir, log_dir) = match env_path("INFOPANEL_STUDIO_CONFIG_DIR") {
            Some(dir) => (dir.clone(), dir.join("logs")),
            None => {
                let roaming = env_path("APPDATA").unwrap_or_else(std::env::temp_dir);
                let local = env_path("LOCALAPPDATA").unwrap_or_else(std::env::temp_dir);
                (
                    roaming.join(IDENTIFIER),
                    local.join(IDENTIFIER).join("logs"),
                )
            }
        };
        Self {
            config_dir,
            log_dir,
            resource_dir,
            data_dir: env_path("INFOPANEL_STUDIO_DATA_DIR"),
        }
    }

    pub fn node_exe(&self) -> PathBuf {
        self.resource_dir.join("node").join("node.exe")
    }

    pub fn app_dir(&self) -> PathBuf {
        self.resource_dir.join("app")
    }

    pub fn server_script(&self) -> PathBuf {
        self.app_dir().join("server.mjs")
    }

    pub fn dist_dir(&self) -> PathBuf {
        self.app_dir().join("dist")
    }

    pub fn agent_install_script(&self) -> PathBuf {
        self.app_dir().join("tools").join("agent-install.mjs")
    }

    /// Present while the agent hooks are installed; the uninstaller only removes hooks then.
    pub fn agents_marker(&self) -> PathBuf {
        self.config_dir.join("agents-installed")
    }
}

/// A path as Windows tools want it: without the `\\?\` prefix Tauri's resource dir can carry.
pub fn display(path: &Path) -> String {
    let s = path.to_string_lossy();
    s.strip_prefix(r"\\?\").unwrap_or(&s).to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_strips_the_verbatim_prefix() {
        assert_eq!(
            display(Path::new(r"\\?\C:\Apps\node.exe")),
            r"C:\Apps\node.exe"
        );
        assert_eq!(display(Path::new(r"C:\x")), r"C:\x");
    }

    #[test]
    fn resource_layout() {
        let p = Paths {
            config_dir: "c".into(),
            log_dir: "l".into(),
            resource_dir: PathBuf::from("r"),
            data_dir: None,
        };
        assert_eq!(p.node_exe(), Path::new("r/node/node.exe"));
        assert_eq!(p.server_script(), Path::new("r/app/server.mjs"));
        assert_eq!(
            p.agent_install_script(),
            Path::new("r/app/tools/agent-install.mjs")
        );
    }
}
