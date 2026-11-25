// language: JavaScript, file: stealth/vm-detection.js
// *plugin check dropped — 0 plugins is normal on every modern Chromium*

export class VMDetector {
    constructor() { this.flags = []; this.isVM = false; }

    async detect() {
        const checks = await Promise.all([
            this.checkWebGL(),
            this.checkNavigatorProperties(),
            this.checkPerformanceTiming(),
            this.checkScreenResolution(),
            this.checkUserAgent(),
            this.checkBattery(),
            this.checkTouchSupport(),
            this.checkLanguages(),
            this.checkFonts(),
        ]);
        const flagged = checks.filter(r => r.isVM);
        this.flags = flagged;
        this.isVM = flagged.length > 2;
        return {
            isVM: this.isVM,
            flags: flagged.map(f => f.reason),
            confidence: Math.min(100, flagged.length * 12),
            details: flagged,
        };
    }

    checkWebGL() {
        try {
            const c = document.createElement('canvas');
            const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
            if (!gl) return { isVM: false, reason: 'no webgl' };
            const dbg = gl.getExtension('WEBGL_debug_renderer_info');
            if (!dbg) return { isVM: false, reason: 'no debug info' };
            const r = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '';
            const vm = ['VMware','VirtualBox','Hyper-V','Parallels','QEMU','llvmpipe','Microsoft Basic Render'];
            const hit = vm.some(v => r.toLowerCase().includes(v.toLowerCase()));
            return { isVM: hit, reason: hit ? `webgl: ${r}` : 'webgl clean' };
        } catch (e) { return { isVM: false, reason: 'webgl error' }; }
    }

    checkNavigatorProperties() {
        const f = [];
        if (typeof navigator.hardwareConcurrency === 'undefined') f.push('no cores');
        if (typeof navigator.deviceMemory === 'undefined') f.push('no mem');
        if (navigator.webdriver) f.push('webdriver');
        return { isVM: f.length > 1, reason: f.join(',') || 'nav clean' };
    }

    checkPerformanceTiming() {
        try {
            const t = performance.timing;
            const load = t.loadEventEnd - t.navigationStart;
            const dom = t.domComplete - t.domLoading;
            const hit = load > 0 && load < 100 && dom < 50;
            return { isVM: hit, reason: hit ? `load ${load}ms` : 'timing ok' };
        } catch (e) { return { isVM: false, reason: 'timing error' }; }
    }

    checkScreenResolution() {
        const w = screen.width, h = screen.height;
        const common = [[1024,768],[1280,720],[1366,768],[1920,1080],[800,600]];
        const hit = common.some(([a,b]) => w === a && h === b);
        return { isVM: hit, reason: hit ? `${w}x${h}` : 'res ok' };
    }

    checkUserAgent() {
        const ua = navigator.userAgent.toLowerCase();
        const kw = ['vmware','virtualbox','hyper-v','qemu','parallels','bochs','headless','phantom','puppeteer','selenium'];
        const hit = kw.some(k => ua.includes(k));
        return { isVM: hit, reason: hit ? 'ua keyword' : 'ua clean' };
    }

    checkBattery() {
        return new Promise((resolve) => {
            if (!('getBattery' in navigator)) return resolve({ isVM: false, reason: 'no battery api' });
            navigator.getBattery().then(b => {
                const hit = b.charging && b.level === 1;
                resolve({ isVM: hit, reason: hit ? 'battery 100% charging' : 'battery ok' });
            }).catch(() => resolve({ isVM: false, reason: 'battery err' }));
        });
    }

    checkTouchSupport() {
        const hit = !('ontouchstart' in window) && navigator.maxTouchPoints === 0;
        return { isVM: hit, reason: hit ? 'no touch' : 'touch ok' };
    }

    checkLanguages() {
        const l = navigator.languages || [];
        return { isVM: l.length === 0, reason: l.length ? 'lang ok' : 'no languages' };
    }

    async checkFonts() {
        const fonts = ['Arial','Times New Roman','Courier New','Verdana','Georgia'];
        const c = document.createElement('div');
        c.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
        document.body.appendChild(c);
        let n = 0;
        for (const f of fonts) {
            const s = document.createElement('span');
            s.style.fontFamily = `'${f}', monospace`;
            s.style.fontSize = '72px';
            s.textContent = 'mmmmmmmmmmlli';
            c.appendChild(s);
            if (s.offsetWidth > 0) n++;
            c.removeChild(s);
        }
        document.body.removeChild(c);
        return { isVM: n < 3, reason: n < 3 ? `${n} fonts` : 'fonts ok' };
    }
}