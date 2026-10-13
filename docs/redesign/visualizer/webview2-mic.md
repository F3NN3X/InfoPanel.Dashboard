# WebView2 mic / getUserMedia in InfoPanel web view

## Source state
- Upstream habibrehmansg/infopanel: default branch 1.4.x @ 8a3062d (2026-04-19); origin/main (fork) 8e01a96 2025-10-22. NEITHER contains any WebView2/CoreWebView2 code (my shallow clone of upstream: grep empty).
- The web view feature exists ONLY in the user's fork F3NN3X/infopanel (remote `origin`), branch feature/webview2-profiles (8bb7e27 "feat: add WebView2 web page mode for desktop profiles", F3NN3X author) and inherited by feature/databridge-export.
- Local clone E:\GitHub\PublicRepos\infopanel: branch feature/databridge-export, HEAD f595a6e (2026-10-11), in sync with origin/feature/databridge-export; 340 commits ahead of origin/main; upstream/main (`1.4.x`) fetched, 0 commits behind (HEAD contains 8a3062d).
- Package: Microsoft.Web.WebView2 1.0.2903.40 (InfoPanel/InfoPanel.csproj:214).

## Code: InfoPanel/Views/DisplayWindow.WebView.cs (only WebView2 file)
- l.20-21 user data folder = %LOCALAPPDATA%\InfoPanel\WebView2 (persistent, shared by all profiles).
- l.63-69 `new WebView2 { CreationProperties = new CoreWebView2CreationProperties { UserDataFolder = ... } }` -> no CoreWebView2Environment options, no AdditionalBrowserArguments (so no --use-fake-ui-for-media-stream, no --autoplay-policy).
- l.98 EnsureCoreWebView2Async(); l.117-150 only sets IsStatusBarEnabled=false, AreDevToolsEnabled=false, NewWindowRequested (navigate in place), ProcessFailed.
- No PermissionRequested handler anywhere (git grep PermissionRequested|BrowserArguments over *.cs: none). No ScreenCaptureStarting handler.
- URL: Profile.WebViewUrl, normalised l.392-404: http/https/file/about/data kept; bare host -> https://. No virtual host mapping, so a dashboard is http://localhost:PORT/ or http://127.0.0.1:PORT/ (secure context) or file:// (user's choice).
- Settings: Profile.WebViewEnabled/Url/Interactive/DisableCache/AutoRefreshSeconds (Models/Profile.cs ~l.271+). Nothing media-related is exposed.
- WebView is IsEnabled=false unless WebViewInteractive (l.~66), so the user cannot click a prompt unless Interactive is on.

## User's repo E:\GitHub\MyRepos\InfoPanel.WebViewDemo
Only markdown (simple.md, simple-part2/3.md): Vite dev app on http://localhost:5173 reading DataBridge SSE at http://127.0.0.1:3921/events. No WebView2 code. Hosted over http://localhost = secure context, fine for getUserMedia.

## WebView2 docs
- PermissionRequested unhandled: args.State default = Default (https://learn.microsoft.com/dotnet/api/microsoft.web.webview2.core.corewebview2permissionrequestedeventargs.state). Default = WebView2 shows its own built-in Edge-style permission prompt (from enum semantics/permissions concept doc; exact wording not retrieved).
- Persistence: "The permission state set from the PermissionRequested event is saved in the profile by default; persisted across sessions" (.../corewebview2permissionrequestedeventargs.savesinprofile). The built-in prompt's Allow/Block (with remember) is likewise stored in the user data folder (%LOCALAPPDATA%\InfoPanel\WebView2), so one prompt per origin (http://localhost:5173 vs :3921 are different origins) then persists. Inferred for built-in UI.
- Host can replace UI: https://learn.microsoft.com/microsoft-edge/webview2/concepts/overview-features-apis (Permissions section).
- enumerateDevices: labels are empty until mic permission is granted for that origin (Chromium behaviour); after grant, labels and deviceIds appear.
- getDisplayMedia: WebView2 has CoreWebView2.ScreenCaptureStarting (ICoreWebView2_27) fired "before the UI is shown" when a page uses the Screen Capture API, so the API is supported and the host may cancel/handle. System-audio loopback depends on the user ticking "share system audio" in the picker; not documented on Learn, unverified. Needs user interaction (user gesture) so unsuited to unattended panel. Line-in/virtual-cable via getUserMedia is the robust path.

## Verdict
Works after a one-time prompt, but only if the web view is Interactive (disabled HwndHost swallows clicks), prompt is shown on the panel/display window, and the page is in a secure context (http://localhost / 127.0.0.1 / https; file:// works but prompt not remembered). Not blocked by InfoPanel, but not silently allowed either.
Smallest change (fork, DisplayWindow.WebView.cs after l.117): `core.PermissionRequested += (_, e) => { if (e.PermissionKind == CoreWebView2PermissionKind.Microphone) e.State = CoreWebView2PermissionState.Allow; };` (optionally restrict by e.Uri host localhost/127.0.0.1). No user config option exists; alternatives: toggle profile to Interactive once and click Allow; or add AdditionalBrowserArguments --use-fake-ui-for-media-stream via CoreWebView2CreationProperties (not needed with handler).
