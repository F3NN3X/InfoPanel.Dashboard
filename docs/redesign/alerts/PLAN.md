# Alerts (plan)

Status: **done 2026-10-13** (A1–A5; results in §Verification). Context: `../ROADMAP.md` §A; outputs ride the control
channel from `../pages/PLAN.md` (P3).

## Decisions (user, 2026-10-13)

- Sources: sensor thresholds (high GPU temperature, power, usage…) and Windows notifications (as the
  Notifications plugin does), plus plugin events where available.
- Outputs: kiosk alert display, switch to a page, highlight the widget. Not a Stream Deck key flash.
  **No sound for now** (scrapped; no fork change).
- Display: toast, banner or a full overlay (background blurred / dimmed in the kiosk), with alignment
  options.
- Alerts show on every kiosk by default; a rule can be limited to profiles.
- The Notifications plugin's own WPF toasts and CPU alert are retired in favour of dashboard alerts.
- Expand the Notifications plugin for the Windows side.

## A0 spike result (done)

A console app on .NET 9 / Windows SDK 22621, unpackaged (as InfoPanel is):
`UserNotificationListener.Current.RequestAccessAsync()` → **Allowed**; `GetNotificationsAsync(Toast)`
read 8 live notifications with app name and text. The `NotificationChanged` event throws
`0x80070490` without package identity, so the plugin **polls** (1 s) and diffs by notification id.

## Shape

```
Windows notification centre ─poll─► InfoPanel.Notifications plugin ─► Data API entries
Data API (sensors + notification entries) ─SSE─► dashboard server: alert engine (rules from config)
alert engine ─► control state `alerts` ─SSE /events/control─► kiosks (display, highlight, page)
                                                            └► studio (live list, history, ack)
```

- **Rules are dashboard config** (`config.alerts`, edited in the studio, undoable); **active alerts and
  history are runtime state** in the server (not undoable), so alerts fire with no studio open and
  every kiosk shows the same alert, cooldown and acknowledgement.
- The engine runs in `server.mjs` (`server/alerts.mjs`, pure evaluator + a Data API subscription for
  just the keys the rules use).

## Model

```ts
interface AlertsConfig {
  enabled: boolean;                 // master switch, default true once a rule exists
  rules: AlertRule[];
  quietHours?: { from: "23:00"; to: "07:00"; minSeverity: Severity };
  defaults: AlertDisplay & { seconds: number };
}
interface AlertRule {
  id; name; enabled; severity: "info" | "warning" | "critical";
  source:
    | { kind: "sensor"; key: string; op: ">" | ">=" | "<" | "<=" | "=" | "≠" | "changes" | "contains";
        value: number | string; forSeconds: number; clearBelow?: number /* hysteresis */ }
    | { kind: "notification"; apps?: string[]; exclude?: string[]; match?: string /* text contains */ };
  cooldownSeconds: number;          // no refire within this after it clears
  outputs: {
    display?: Partial<AlertDisplay> & { seconds?: number /* 0 = until acknowledged */;
               text?: string /* template: {name} {value} {unit} {app} {title} {body} */ };
    page?: { profile?: string; page: string; returnAfter?: boolean };
    highlight?: { zones?: string[] /* default: zones bound to the sensor */ };
  };
  profiles?: string[];              // where it shows; default every profile
}
interface AlertDisplay {
  style: "toast" | "banner" | "overlay";   // card / full-width strip / centred panel over the dashboard
  position: "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right";
  backdrop: "none" | "dim" | "blur";       // behind an overlay (or any style): dim and/or blur the dashboard
  size: "s" | "m" | "l";
}
```

Presets: GPU temperature high, GPU hotspot high, GPU power near limit, CPU temperature high, CPU
usage sustained, RAM almost full, VRAM almost full, drive almost full, FPS drop, network down, "any
Discord message", "any notification from …".

## Phases (build + tests green at each end)

| # | Phase | Output |
|---|---|---|
| A1 | Engine | `AlertsConfig` types + `normalizeAlerts` (absent = no rules, no migration needed); `server/alerts.mjs`: evaluator (thresholds with duration, hysteresis, cooldown, `changes`, `contains`, notification filters), Data API subscription for the rule keys, active alerts + history (`alerts.json`, last 200) in the control state; `POST /api/control/alert` `{ id, action: "ack" \| "dismiss" \| "test" }`. Tests for every rule kind, timing with fake clocks, history cap, ack. |
| A2 | Kiosk outputs | Alert display in three styles (toast, banner, overlay) at nine positions and three sizes, backdrop none / dim / blur, theme + severity look, stacking (max 3), countdown bar, reduced motion; widget highlight (ring on the zones); page switch and return through the control channel. Quiet hours. A tap on the alert acknowledges it. |
| A3 | Studio | Alerts rail panel: rule list (on/off, severity, last fired), rule editor (sensor picker with live value and a preview of when it would fire, outputs, profiles), presets, "Test" (fires through the real path), live active list and history with acknowledge. Undo per rule edit. |
| A4 | Windows notifications | Notifications plugin: poll `UserNotificationListener` (1 s), publish `notifications.*` Data API entries (latest app / title / body / id / time, count, a JSON ring of the last 20), app list for the studio's filter picker; the access prompt surfaced in the plugin's status. Dashboard: `notification` rules end to end. |
| A5 | Verification | Real threshold (stress a sensor or lower a limit), a real notification (a test toast), the kiosk on the live display, the studio flow, docs, FEATURE_MAP rows. |

## Risks

- **Notification access** can be revoked in Windows privacy settings: the plugin reports "denied" and
  the studio shows it.
- **Rule storms** (a flapping sensor): duration + hysteresis + cooldown, and at most 3 toasts on screen.

## Verification (2026-10-13)

- `npm run typecheck`, `npm test` and `npm run build` exit 0.
- Production build on a throwaway server (copy of the live config) against the live Data API:
  - **Sensor rule**: the "GPU power near limit" preset picked `libre.nvidia_geforce_rtx_5090_gpu_package`
    (W) after the unit fix; with the threshold at 200 W it fired for real ("267.5 W"), showed on the
    kiosk as a centred overlay, a tap acknowledged it, and Test fired a one-shot with the blur backdrop
    and countdown.
  - **Windows notification**: Notifications plugin 2.0.0 (branch `feat/windows-notifications`)
    publishes `plugins.InfoPanel.Notifications.windows.{latest,count,apps,recent,access}`
    (access `Allowed`); a PowerShell toast reached `latest` within the 1 s poll; a notification rule
    filtered on "Windows PowerShell" fired and the kiosk showed it as a warning banner.
- Fixed during verification: presets match the threshold's unit; a rule without a sensor is kept and
  subscribes to nothing; the body no longer repeats the rule name; the engine and studio use the
  plugin's real keys.
- Not verified: quiet hours and page switching on a live display (unit tests only).
