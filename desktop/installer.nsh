; Extra cleanup is opt-in during an interactive uninstall only.
; Updates and silent maintenance keep the user's collection and saves.
!macro customUnInstall
  ${IfNot} ${isUpdated}
  ${AndIfNot} ${Silent}
    MessageBox MB_YESNOCANCEL|MB_ICONQUESTION|MB_DEFBUTTON2 `Also delete all MYjong data for this Windows user?$\r$\n$\r$\nYes: permanently delete MYjong's stored photo copies, saved games, scores, settings, backups stored inside MYjong's data folder, and caches.$\r$\n$\r$\nNo: keep that data for a future reinstall.$\r$\nCancel: stop uninstalling.$\r$\n$\r$\nYour original photo files and backups exported elsewhere will not be deleted.` IDYES myjongDeleteData IDNO myjongKeepData
    Goto myjongCancelUninstall
    myjongCancelUninstall:
      Abort
    myjongDeleteData:
      ; Electron stores data per user, including for an all-users install.
      SetShellVarContext current
      StrCmp $APPDATA "" myjongRestoreContext
      StrCmp $LOCALAPPDATA "" myjongRestoreContext
      RMDir /r "$APPDATA\MYjong"
      RMDir /r "$LOCALAPPDATA\myjong-updater"
      IfFileExists "$APPDATA\MYjong\*.*" myjongCleanupFailed
      IfFileExists "$LOCALAPPDATA\myjong-updater\*.*" myjongCleanupFailed myjongRestoreContext
    myjongCleanupFailed:
      MessageBox MB_OK|MB_ICONEXCLAMATION `Some MYjong data could not be removed. Close programs using these folders and remove them manually:$\r$\n$APPDATA\MYjong$\r$\n$LOCALAPPDATA\myjong-updater`
    myjongRestoreContext:
      ${If} $installMode == "all"
        SetShellVarContext all
      ${EndIf}
    myjongKeepData:
  ${EndIf}
!macroend
