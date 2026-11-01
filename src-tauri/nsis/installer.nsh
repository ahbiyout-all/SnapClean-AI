; =========================================================================
; SnapClean AI - NSIS Custom Unpacked Multi-File Installer Script
; Developer: AhBiYout (AhBiYout-all)
; Repository: https://github.com/AhBiYout-all/SnapCleanAI
; =========================================================================

!macro customHeader
  !define MUI_WELCOMEPAGE_TITLE "SnapClean AI Installer"
  !define MUI_WELCOMEPAGE_TEXT "Welcome to SnapClean AI Setup.\r\nThis installer will deploy the Unpacked Multi-File application structure with quiet firewall rules."
!macroend

!macro customInit
  ; Detect if previous version is installed
  ReadRegStr $R0 HKLM "Software\SnapClean AI" "InstallDir"
  ${If} $R0 != ""
    ${IfNot} ${Silent}
      MessageBox MB_YESNO|MB_ICONQUESTION \
        "An existing version of SnapClean AI is detected at:\r\n$R0\r\n\r\nDo you want to overwrite and replace the previous installation?" \
        IDYES continue_install IDNO cancel_install
      cancel_install:
        Abort "Installation cancelled by user."
      continue_install:
    ${EndIf}
  ${EndIf}
!macroend

!macro customInstall
  DetailPrint "Configuring quiet Windows Firewall rules..."
  
  ; Register Base Application Firewall Rule quietly
  ExecWait 'netsh advfirewall firewall add rule name="SnapClean AI" dir=in action=allow program="$INSTDIR\SnapClean.exe" enable=yes profile=any'
  
  ; Register Version-Stamped Application Firewall Rule quietly
  ExecWait 'netsh advfirewall firewall add rule name="SnapClean AI_v2.5.0" dir=in action=allow program="$INSTDIR\SnapClean.exe" enable=yes profile=any'
  
  DetailPrint "Firewall rules registered successfully."
!macroend
