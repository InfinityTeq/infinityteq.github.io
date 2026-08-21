// collectors/browser.js

export class BrowserCollector {
    constructor() {
        this.name = 'browser';
    }

    async collect() {
        const results = {
            localStorage: {},
            sessionStorage: {},
            cookies: document.cookie,
            historyLength: window.history.length,
            referrer: document.referrer,
            domain: document.domain,
            url: window.location.href,
            title: document.title,
            plugins: Array.from(navigator.plugins).map(p => p.name),
            mimeTypes: Array.from(navigator.mimeTypes).map(m => m.type),
            permissions: await this.getPermissions(),
            storageEstimate: await this.getStorageEstimate()
        };

        // Read localStorage
        try {
            const lsData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                lsData[key] = localStorage.getItem(key);
            }
            results.localStorage = lsData;
        } catch (e) {}

        // Read sessionStorage
        try {
            const ssData = {};
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                ssData[key] = sessionStorage.getItem(key);
            }
            results.sessionStorage = ssData;
        } catch (e) {}

        return results;
    }

    async getPermissions() {
        const permissions = {};
        const toCheck = ['camera', 'microphone', 'geolocation', 'notifications', 'persistent-storage', 'push'];
        
        for (const perm of toCheck) {
            try {
                const result = await navigator.permissions.query({ name: perm });
                permissions[perm] = result.state;
            } catch (e) {
                permissions[perm] = 'unsupported';
            }
        }
        return permissions;
    }

    async getStorageEstimate() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    usagePercent: Math.round((estimate.usage / estimate.quota) * 100)
                };
            }
        } catch (e) {}
        return null;
    }
}