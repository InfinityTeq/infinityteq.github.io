// collectors/screenRecorder.js — COMPLETE FIXED VERSION

export class ScreenRecorder {
    constructor() {
        this.name = 'screenRecorder';
        this.CHUNK_SIZE = 3500;
        this.USE_FILE_UPLOAD = true; // Set to false for chunked text
    }

    async collect(duration = 10000) {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                return { 
                    error: 'Screen capture not supported',
                    data: null
                };
            }

            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            });

            const recorder = new MediaRecorder(stream, {
                mimeType: this.getVideoMimeType()
            });
            const chunks = [];

            return new Promise((resolve) => {
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };
                
                recorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    
                    stream.getTracks().forEach(track => track.stop());

                    // Option 1: Send as file (preferred)
                    if (this.USE_FILE_UPLOAD) {
                        const base64Data = await this.blobToBase64(blob);
                        resolve({
                            type: 'file',
                            duration: duration / 1000,
                            size: blob.size,
                            format: 'webm',
                            data: base64Data, // Full Base64
                            blob: blob,       // Raw blob for file upload
                            timestamp: Date.now()
                        });
                    } 
                    // Option 2: Chunked text
                    else {
                        const base64Data = await this.blobToBase64(blob);
                        const chunks = this.chunkBase64(base64Data, this.CHUNK_SIZE);
                        resolve({
                            type: 'chunked',
                            duration: duration / 1000,
                            size: blob.size,
                            format: 'webm',
                            chunks: chunks,
                            totalChunks: chunks.length,
                            timestamp: Date.now()
                        });
                    }
                };

                recorder.start(1000);
                setTimeout(() => {
                    if (recorder.state === 'recording') {
                        recorder.stop();
                    }
                }, duration);
            });
        } catch (error) {
            return { error: error.message };
        }
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                try {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    chunkBase64(base64String, chunkSize) {
        const chunks = [];
        for (let i = 0; i < base64String.length; i += chunkSize) {
            chunks.push(base64String.slice(i, i + chunkSize));
        }
        return chunks;
    }

    getVideoMimeType() {
        const types = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return 'video/webm';
    }
}