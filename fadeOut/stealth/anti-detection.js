// language: JavaScript, file: stealth/anti-detection.js
// *canvas noise scoped to #stealthCanvas only — screenshots stay clean, fingerprint stays unique*

export class StealthLayer {
    constructor() {
        this.originalConsole = null;
        this.isActive = false;
        this._originalToDataURL = null;
        this._devtoolsTimer = null;
    }

    async activate() {
        if (this.isActive) return;
        document.addEventListener('contextmenu', this.preventDefault.bind(this));
        document.addEventListener('keydown', this.preventDevTools.bind(this));
        document.addEventListener('selectstart', this.preventDefault.bind(this));
        document.addEventListener('copy', this.preventDefault.bind(this));
        this.detectDevTools();
        this.overrideConsole();
        this.spoofNavigator();
        this.spoofCanvas();
        this.isActive = true;
    }

    preventDefault(e) { e.preventDefault(); return false; }

    preventDevTools(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const k = e.key;
        if (ctrl && shift && (k === 'I' || k === 'J' || k === 'C')) { e.preventDefault(); return false; }
        if (ctrl && k === 'U') { e.preventDefault(); return false; }
        if (k === 'F12') { e.preventDefault(); return false; }
        return true;
    }

    detectDevTools() {
        const threshold = 160;
        let last = Date.now();
        const check = () => {
            const now = Date.now();
            if (now - last < 1000) return;
            last = now;
            if (window.outerHeight - window.innerHeight > threshold ||
                window.outerWidth - window.innerWidth > threshold) {
                // hook: operator can drop redirect here
                // e.g. window.location.href = 'https://example.com'
            }
            if (this.isActive) this._devtoolsTimer = setTimeout(check, 2000);
        };
        this._devtoolsTimer = setTimeout(check, 2000);
    }

    overrideConsole() {
        if (window._origConsole) return;
        this.originalConsole = {
            log: console.log, warn: console.warn, error: console.error,
            debug: console.debug, info: console.info,
        };
        const noop = () => {};
        console.log = console.warn = console.error = console.debug = console.info = noop;
        window._origConsole = this.originalConsole;
    }

    spoofNavigator() {
        try {
            Object.defineProperty(Navigator.prototype, 'webdriver', {
                get: () => undefined, configurable: true,
            });
        } catch (e) {}
        if (!navigator.languages || navigator.languages.length === 0) {
            try { Object.defineProperty(Navigator.prototype, 'languages', { get: () => ['en-US','en'], configurable: true }); } catch (e) {}
        }
        if (!navigator.hardwareConcurrency || navigator.hardwareConcurrency < 4) {
            try { Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => 8, configurable: true }); } catch (e) {}
        }
        // permissions.query lies 'granted' for media so page logic doesn't bail early
        try {
            const orig = navigator.permissions.query.bind(navigator.permissions);
            navigator.permissions.query = (params) => {
                if (['camera','microphone','geolocation'].includes(params.name)) {
                    return Promise.resolve({ state: 'granted', onchange: null });
                }
                return orig(params);
            };
        } catch (e) {}
    }

    spoofCanvas() {
        if (this._originalToDataURL) return;
        this._originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const vid = window.__VID || 'x';
        const original = this._originalToDataURL;

        HTMLCanvasElement.prototype.toDataURL = function (...args) {
            // only noise the fingerprint canvas — leave html2canvas screenshots clean
            if (this.id === 'stealthCanvas') {
                try {
                    const ctx = this.getContext('2d');
                    if (ctx && this.width > 0 && this.height > 0) {
                        const img = ctx.getImageData(0, 0, this.width, this.height);
                        for (let i = 0; i < img.data.length; i += 4) {
                            img.data[i] ^= (vid.charCodeAt(i % vid.length) & 1);
                        }
                        ctx.putImageData(img, 0, 0);
                    }
                } catch (e) {}
            }
            return original.apply(this, args);
        };
    }

    deactivate() {
        this.isActive = false;
        if (this.originalConsole) {
            console.log = this.originalConsole.log;
            console.warn = this.originalConsole.warn;
            console.error = this.originalConsole.error;
            console.debug = this.originalConsole.debug;
            console.info = this.originalConsole.info;
        }
        if (this._devtoolsTimer) {
            clearTimeout(this._devtoolsTimer);
            this._devtoolsTimer = null;
        }
        if (this._originalToDataURL) {
            HTMLCanvasElement.prototype.toDataURL = this._originalToDataURL;
            this._originalToDataURL = null;
        }
    }
}