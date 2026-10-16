// The optional Claude Code / Codex hooks, installed and removed by the bundled
// tools/agent-install.mjs run with the bundled node.

use crate::paths::{self, Paths};
use crate::settings::{AgentInstall, Settings};
use serde::Serialize;
use serde_json::Value;

/// The arguments after node.exe. agent-install leaves an existing hook alone, so installing is
/// always a removal followed by an apply (see `install_steps`).
pub fn agent_args(script: &str, node: &str, url: &str, install: bool) -> Vec<String> {
    let mut args = vec![script.to_owned()];
    if install {
        args.push("--apply".into());
        args.push(format!("--node={node}"));
        args.push(format!("--url={url}"));
    } else {
        args.push("--remove".into());
        args.push("--apply".into());
    }
    args.push("--json".into());
    args
}

/// Turning on (or refreshing) removes the old hooks first so the new node path and URL land.
pub fn install_steps(enable: bool) -> &'static [bool] {
    if enable {
        &[false, true]
    } else {
        &[false]
    }
}

/// The base URL the hooks post to.
pub fn hook_url(s: &Settings) -> String {
    crate::settings::server_origin(s)
}

pub fn install_record(s: &Settings, version: &str, node: &str) -> AgentInstall {
    AgentInstall {
        version: version.into(),
        url: hook_url(s),
        node: node.into(),
    }
}

/// True when the hooks are on but were written for another app version, URL or node path.
pub fn needs_reinstall(s: &Settings, version: &str, node: &str) -> bool {
    s.agents.enabled && s.agents.installed.as_ref() != Some(&install_record(s, version, node))
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StepResult {
    pub step: &'static str,
    pub ok: bool,
    /// agent-install's `--json` output: `{ apply, results: [...] }`.
    pub output: Option<Value>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentResult {
    pub ok: bool,
    pub enabled: bool,
    pub steps: Vec<StepResult>,
}

/// The JSON object agent-install printed (the whole output, or its last JSON line).
pub fn parse_output(stdout: &str) -> Option<Value> {
    serde_json::from_str::<Value>(stdout.trim())
        .ok()
        .or_else(|| {
            stdout
                .lines()
                .rev()
                .find_map(|l| serde_json::from_str::<Value>(l.trim()).ok())
        })
        .filter(Value::is_object)
}

/// A result list where any agent reported `error` counts as a failed step.
pub fn output_has_error(v: &Value) -> bool {
    v.get("results").and_then(Value::as_array).is_some_and(|r| {
        r.iter()
            .any(|x| x.get("status").and_then(Value::as_str) == Some("error"))
    })
}

fn run_step(paths: &Paths, s: &Settings, install: bool) -> StepResult {
    let step = if install { "install" } else { "remove" };
    let node = paths::display(&paths.node_exe());
    let script = paths::display(&paths.agent_install_script());
    let args = agent_args(&script, &node, &hook_url(s), install);
    log::debug!("agents: {node} {}", args.join(" "));
    let out = crate::sidecar::hidden_command(&node)
        .args(&args)
        .current_dir(paths::display(&paths.app_dir()))
        .output();
    match out {
        Err(e) => StepResult {
            step,
            ok: false,
            output: None,
            error: Some(format!("could not run the bundled node: {e}")),
        },
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            let output = parse_output(&stdout);
            let failed = !o.status.success() || output.as_ref().is_none_or(output_has_error);
            let error = failed.then(|| {
                let stderr = String::from_utf8_lossy(&o.stderr).trim().to_owned();
                if stderr.is_empty() {
                    format!("agent-install exited with {}", o.status)
                } else {
                    stderr
                }
            });
            StepResult {
                step,
                ok: !failed,
                output,
                error,
            }
        }
    }
}

/// Installs (`enable`) or removes the hooks, then writes or deletes the uninstaller's marker.
pub fn apply(paths: &Paths, s: &Settings, enable: bool) -> AgentResult {
    let mut steps = Vec::new();
    for &install in install_steps(enable) {
        let r = run_step(paths, s, install);
        let ok = r.ok;
        steps.push(r);
        if !ok {
            break;
        }
    }
    let ok = steps.iter().all(|r| r.ok);
    if ok {
        let marker = paths.agents_marker();
        let _ = if enable {
            std::fs::write(&marker, paths::display(&paths.node_exe()))
        } else {
            std::fs::remove_file(&marker).or(Ok(()))
        };
    }
    log::info!("agents: {} -> ok={ok}", if enable { "on" } else { "off" });
    AgentResult {
        ok,
        enabled: enable,
        steps,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn install_args() {
        let args = agent_args(
            r"C:\S\app\tools\agent-install.mjs",
            r"C:\S\node\node.exe",
            "http://127.0.0.1:3942",
            true,
        );
        assert_eq!(
            args,
            vec![
                r"C:\S\app\tools\agent-install.mjs",
                "--apply",
                r"--node=C:\S\node\node.exe",
                "--url=http://127.0.0.1:3942",
                "--json"
            ]
        );
    }

    #[test]
    fn remove_args() {
        let args = agent_args("x.mjs", "node.exe", "http://127.0.0.1:3922", false);
        assert_eq!(args, vec!["x.mjs", "--remove", "--apply", "--json"]);
    }

    #[test]
    fn enabling_removes_first() {
        assert_eq!(install_steps(true), &[false, true]);
        assert_eq!(install_steps(false), &[false]);
    }

    #[test]
    fn hook_url_follows_the_connect_host() {
        let s = Settings {
            host: "0.0.0.0".into(),
            port: 3942,
            ..Settings::default()
        };
        assert_eq!(hook_url(&s), "http://127.0.0.1:3942");
    }

    #[test]
    fn reinstall_on_version_port_or_node_change() {
        let mut s = Settings::default();
        assert!(!needs_reinstall(&s, "1.0.0", "n"));
        s.agents.enabled = true;
        assert!(needs_reinstall(&s, "1.0.0", "n"));
        s.agents.installed = Some(install_record(&s, "1.0.0", "n"));
        assert!(!needs_reinstall(&s, "1.0.0", "n"));
        assert!(needs_reinstall(&s, "1.1.0", "n"));
        assert!(needs_reinstall(&s, "1.0.0", "m"));
        s.port = 3942;
        assert!(needs_reinstall(&s, "1.0.0", "n"));
    }

    #[test]
    fn parses_json_output() {
        let v = parse_output("note\n{\"apply\":true,\"results\":[]}\n").unwrap();
        assert_eq!(v["apply"], true);
        assert!(parse_output("nothing").is_none());
        let bad =
            serde_json::json!({ "results": [{ "status": "installed" }, { "status": "error" }] });
        assert!(output_has_error(&bad));
        assert!(!output_has_error(&serde_json::json!({ "results": [] })));
    }
}
