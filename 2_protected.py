#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PROTECTED APPLICATION - DO NOT MODIFY
Protected with Commercial Obfuscator Pro v10.0.0
"""

import sys
import os
import hashlib
import base64
import zlib
import platform
import uuid
from datetime import datetime

# ==================== ANTI-DEBUGGING ====================

def __anti_debug():
    """Multi-layer anti-debugging protection"""
    
    # Layer 1: Check for debugger
    if sys.gettrace() is not None:
        print("Debugger detected! Exiting...")
        os._exit(1)
    
    # Layer 2: Check debug environment variables
    debug_vars = [
        'PYCHARM_HOSTED', 
        'PYDEVD_LOAD_VALUES_ASYNC', 
        'VSCODE_DEBUG', 
        'DEBUGPY',
        'PYTHONDEBUG',
        'PYTHONVERBOSE'
    ]
    if any(v in os.environ for v in debug_vars):
        print("Debug environment detected! Exiting...")
        os._exit(1)
    
    # Layer 3: Check for debug modules
    debug_modules = ['pdb', 'pdbpp', 'ipdb', 'pudb', 'pydevd', 'debugpy', 'pydevd_file_utils']
    if any(m in sys.modules for m in debug_modules):
        print("Debug module detected! Exiting...")
        os._exit(1)
    
    # Layer 4: Time-based anti-debug
    try:
        start = time.perf_counter()
        _ = [x**2 for x in range(10000)]
        elapsed = time.perf_counter() - start
        if elapsed > 0.05:  # If slower than expected, debugger might be attached
            print("Suspicious execution detected! Exiting...")
            os._exit(1)
    except:
        pass
    
    # Layer 5: Windows specific
    if sys.platform == 'win32':
        try:
            import ctypes
            # Check for debugger via Windows API
            if ctypes.windll.kernel32.IsDebuggerPresent():
                print("Windows debugger detected! Exiting...")
                os._exit(1)
        except:
            pass
    
    # Layer 6: Linux specific
    if sys.platform.startswith('linux'):
        try:
            # Check if ptrace is being used (common for debuggers)
            with open('/proc/self/status', 'r') as f:
                for line in f:
                    if 'TracerPid' in line:
                        pid = line.split(':')[1].strip()
                        if pid != '0':
                            print("Debugger detected! Exiting...")
                            os._exit(1)
                        break
        except:
            pass
    
    # Layer 7: Check for common debugging tools
    try:
        import inspect
        frame = inspect.currentframe()
        if frame and frame.f_back and frame.f_back.f_code.co_name == '<module>':
            # Additional checks can be added here
            pass
    except:
        pass

# ==================== ANTI-TAMPER ====================

def __anti_tamper():
    """Detect if the file has been modified"""
    try:
        with open(__file__, 'rb') as f:
            content = f.read()
        # Check the hash of the protected section
        # This is a simplified check - the actual hash is embedded
        pass
    except:
        pass

# ==================== MAIN PROTECTION ====================

# Run anti-debug checks immediately
__anti_debug()

# The actual application code (compressed and encoded)
__ENCODED_CODE = """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"""
__CHECKSUM = "68980296dc32d73a"

def __run_protected():
    """Decode and execute the protected code"""
    try:
        # Decode and decompress
        __decompressed = zlib.decompress(base64.b64decode(__ENCODED_CODE))
        __code = __decompressed.decode('utf-8')
        
        # Execute the code
        exec(__code, globals())
    except Exception as e:
        # Silent exit to avoid revealing errors
        print("Application error. Please contact support.")
        sys.exit(1)

# Run the application
if __name__ == '__main__':
    try:
        # Additional runtime protection
        __anti_debug()
        __run_protected()
    except KeyboardInterrupt:
        pass
    except Exception:
        print("Application error. Please contact support.")
        sys.exit(1)
