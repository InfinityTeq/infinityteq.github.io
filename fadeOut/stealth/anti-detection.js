// stealth/anti-detection.js

export class StealthLayer {
    constructor() {
        this.originalConsole = null;
        this.isActive = false;
    }

    async activate() {
        if (this.isActive) return;
        
        // Disable context menu
        document.addEventListener('contextmenu', this.preventDefault.bind(this));
        
        // Disable DevTools shortcuts
        document.addEventListener('keydown', this.preventDevTools.bind(this));
        
        // Detect DevTools
        this.detectDevTools();
        
        // Override console
        this.overrideConsole();
        
        // Spoof navigator properties
        this.spoofNavigator();
        
        // Spoof canvas fingerprint
        this.spoofCanvas();
        
        // Prevent selection
        document.addEventListener('selectstart', this.preventDefault.bind(this));
        
        // Prevent copy
        document.addEventListener('copy', this.preventDefault.bind(this));
        
        this.isActive = true;
        console.debug('Stealth layer activated');
    }

    preventDefault(e) {
        e.preventDefault();
        return false;
    }

    preventDevTools(e) {
        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, F12
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const key = e.key;
        
        if (ctrl && shift && (key === 'I' || key === 'J')) {
            e.preventDefault();
            return false;
        }
        
        if (ctrl && key === 'U') {
            e.preventDefault();
            return false;
        }
        
        if (key === 'F12') {
            e.preventDefault();
            return false;
        }
        
        return true;
    }

    detectDevTools() {
        const threshold = 160;
        let lastCheck = Date.now();
        
        const check = () => {
            const now = Date.now();
            if (now - lastCheck < 1000) return;
            lastCheck = now;
            
            const heightDiff = window.outerHeight - window.innerHeight;
            const widthDiff = window.outerWidth - window.innerWidth;
            
            if (heightDiff > threshold || widthDiff > threshold) {
                console.debug('DevTools detected');
                // Optional: self-destruct or redirect
                // window.location.href = 'about:blank';
            }
            
            if (this.isActive) {
                setTimeout(check, 2000);
            }
        };
        
        setTimeout(check, 2000);
    }

    overrideConsole() {
        if (window._originalConsole) return;
        
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            debug: console.debug,
            info: console.info
        };
        
        const noop = () => {};
        
        // Override with no-ops
        console.log = noop;
        console.warn = noop;
        console.error = noop;
        console.debug = noop;
        console.info = noop;
        
        // Keep trace for debugging (can be disabled)
        if (window._DEBUG) {
            console.log = this.originalConsole.log;
            console.warn = this.originalConsole.warn;
            console.error = this.originalConsole.error;
        }
    }

    spoofNavigator() {
        // Spoof webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
        
        // Spoof plugins
        if (!navigator.plugins.length) {
            Object.defineProperty(navigator, 'plugins', {
                get: () => {
                    const fakePlugin = {
                        length: 5,
                        item: () => null,
                        namedItem: () => null
                    };
                    return fakePlugin;
                }
            });
        }
        
        // Spoof languages
        if (!navigator.languages || navigator.languages.length === 0) {
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
        }
        
        // Spoof hardware concurrency
        if (!navigator.hardwareConcurrency || navigator.hardwareConcurrency === 0) {
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 4
            });
        }
    }

    spoofCanvas() {
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        
        CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
            const data = originalGetImageData.call(this, x, y, w, h);
            
            // Add tiny noise to fingerprint
            for (let i = 0; i < data.data.length; i += 4) {
                if (Math.random() < 0.001) {
                    data.data[i] = Math.min(255, Math.max(0, data.data[i] + Math.floor(Math.random() * 10 - 5)));
                }
            }
            
            return data;
        };
    }

    deactivate() {
        this.isActive = false;
        
        // Restore console
        if (this.originalConsole) {
            console.log = this.originalConsole.log;
            console.warn = this.originalConsole.warn;
            console.error = this.originalConsole.error;
            console.debug = this.originalConsole.debug;
            console.info = this.originalConsole.info;
        }
        
        // Restore canvas
        // (can't easily restore prototype)
    }
}