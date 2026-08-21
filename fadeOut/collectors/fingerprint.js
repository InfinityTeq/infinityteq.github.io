// collectors/fingerprint.js

export class FingerprintCollector {
    constructor() {
        this.name = 'fingerprint';
    }

    async collect() {
        return {
            canvas: await this.getCanvasFingerprint(),
            webgl: this.getWebGLFingerprint(),
            audio: await this.getAudioFingerprint(),
            fonts: await this.detectFonts(),
            plugins: navigator.plugins.length,
            mimeTypes: navigator.mimeTypes.length,
            timestamp: Date.now()
        };
    }

    async getCanvasFingerprint() {
        try {
            const canvas = document.getElementById('stealthCanvas');
            const ctx = canvas.getContext('2d');
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw complex shapes
            ctx.textBaseline = "top";
            ctx.font = "14px 'Arial'";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = "#069";
            ctx.fillText("Fingerprint", 2, 15);
            ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
            ctx.fillText("Fingerprint", 4, 17);
            
            // Draw additional shapes
            ctx.beginPath();
            ctx.arc(50, 50, 30, 0, Math.PI * 2);
            ctx.fillStyle = "#ff0000";
            ctx.fill();
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, 'red');
            gradient.addColorStop(0.5, 'green');
            gradient.addColorStop(1, 'blue');
            ctx.fillStyle = gradient;
            ctx.fillRect(150, 150, 50, 50);
            
            return canvas.toDataURL();
        } catch (error) {
            return { error: error.message };
        }
    }

    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) return null;

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const extensions = gl.getSupportedExtensions() || [];
            
            return {
                renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
                vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                vendorUnmasked: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
                rendererUnmasked: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
                maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
                maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
                maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
                maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
                extensions: extensions
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getAudioFingerprint() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            oscillator.stop();
            
            return {
                sampleRate: audioContext.sampleRate,
                channelCount: audioContext.destination.channelCount,
                state: audioContext.state,
                latencyHint: audioContext.baseLatency,
                outputLatency: audioContext.outputLatency
            };
        } catch (error) {
            return null;
        }
    }

    async detectFonts() {
        const fonts = [
            'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia',
            'Impact', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Helvetica',
            'Tahoma', 'Geneva', 'Monaco', 'Palatino', 'Bookman', 'New York',
            'Apple Chancery', 'Courier', 'American Typewriter', 'Andale Mono'
        ];
        
        const available = [];
        const container = document.getElementById('stealthContainer');
        const testString = "mmmmmmmmmmlli";
        const testSize = "72px";
        
        // Get default width
        const defaultSpan = document.createElement('span');
        defaultSpan.style.fontSize = testSize;
        defaultSpan.innerHTML = testString;
        container.appendChild(defaultSpan);
        const defaultWidth = defaultSpan.offsetWidth;
        const defaultHeight = defaultSpan.offsetHeight;
        container.removeChild(defaultSpan);
        
        for (const font of fonts) {
            const span = document.createElement('span');
            span.style.fontFamily = `'${font}', monospace`;
            span.style.fontSize = testSize;
            span.innerHTML = testString;
            container.appendChild(span);
            
            if (span.offsetWidth !== defaultWidth || span.offsetHeight !== defaultHeight) {
                available.push(font);
            }
            
            container.removeChild(span);
        }
        
        return available;
    }
}