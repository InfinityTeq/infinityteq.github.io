// language: JavaScript, file: collectors/fingerprint.js
// *full canvas/WebGL/audio fingerprints — monolith only sent sampleRate, this sends renderer version too*

export class FingerprintCollector {
    constructor() { this.name = 'fingerprint'; }

    async collect() {
        return {
            canvas: await this.getCanvasFingerprint(),
            webgl: this.getWebGLFingerprint(),
            audio: await this.getAudioFingerprint(),
            fonts: await this.detectFonts(),
            plugins: navigator.plugins.length,
            mimeTypes: navigator.mimeTypes.length,
            timestamp: Date.now(),
        };
    }

    async getCanvasFingerprint() {
        try {
            let canvas = document.getElementById('stealthCanvas');
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.width = 200; canvas.height = 200;
            }
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.textBaseline = 'top';
            ctx.font = "14px 'Arial'";
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('Fingerprint', 2, 15);
            ctx.fillStyle = 'rgba(102,204,0,0.7)';
            ctx.fillText('Fingerprint', 4, 17);
            ctx.beginPath();
            ctx.arc(50, 50, 30, 0, Math.PI * 2);
            ctx.fillStyle = '#ff0000'; ctx.fill();
            ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 3; ctx.stroke();
            const g = ctx.createLinearGradient(0, 0, canvas.width, 0);
            g.addColorStop(0, 'red'); g.addColorStop(0.5, 'green'); g.addColorStop(1, 'blue');
            ctx.fillStyle = g; ctx.fillRect(150, 150, 50, 50);
            return canvas.toDataURL();
        } catch (e) { return { error: e.message }; }
    }

    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return null;
            const dbg = gl.getExtension('WEBGL_debug_renderer_info');
            return {
                renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
                vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
                extensions: gl.getSupportedExtensions() || [],
            };
        } catch (e) { return { error: e.message }; }
    }

    async getAudioFingerprint() {
        try {
            const ac = new (window.AudioContext || window.webkitAudioContext)();
            return {
                sampleRate: ac.sampleRate,
                channelCount: ac.destination.channelCount,
                state: ac.state,
                baseLatency: ac.baseLatency,
                outputLatency: ac.outputLatency,
            };
        } catch (e) { return null; }
    }

    async detectFonts() {
        const fonts = [
            'Arial','Arial Black','Comic Sans MS','Courier New','Georgia','Impact',
            'Times New Roman','Trebuchet MS','Verdana','Helvetica','Tahoma','Geneva',
            'Monaco','Palatino','Bookman','New York','Apple Chancery','Courier',
            'American Typewriter','Andale Mono','Roboto','Noto Sans','Droid Sans',
        ];
        let container = document.getElementById('stealthContainer');
        if (!container) {
            container = document.createElement('div');
            document.body.appendChild(container);
        }
        const testStr = 'mmmmmmmmmmlli';
        const size = '72px';
        const avail = [];

        const base = document.createElement('span');
        base.style.fontSize = size; base.textContent = testStr;
        container.appendChild(base);
        const bw = base.offsetWidth, bh = base.offsetHeight;
        container.removeChild(base);

        for (const f of fonts) {
            const span = document.createElement('span');
            span.style.fontFamily = `'${f}', monospace`;
            span.style.fontSize = size;
            span.textContent = testStr;
            container.appendChild(span);
            if (span.offsetWidth !== bw || span.offsetHeight !== bh) avail.push(f);
            container.removeChild(span);
        }
        return avail;
    }
}