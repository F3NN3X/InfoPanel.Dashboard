; Removes the coding agent hooks before uninstalling, so none is left pointing at a deleted
; node.exe. Only when the app installed them (it keeps the marker file while they are on), so a
; repo-based install (node tools/agent-install.mjs) is left alone.
!macro NSIS_HOOK_PREUNINSTALL
  ${If} ${FileExists} "$APPDATA\dev.f3nn3x.infopanel-studio\agents-installed"
    nsExec::Exec '"$INSTDIR\node\node.exe" "$INSTDIR\app\tools\agent-install.mjs" --remove --apply --json'
    Pop $0
    Delete "$APPDATA\dev.f3nn3x.infopanel-studio\agents-installed"
  ${EndIf}
!macroend
