// language: JavaScript, file: collectors/browser.js
// *rich browser block: permissions split, storage estimate, small LS dump*

export class BrowserCollector {
    constructor() { this.name = 'browser'; }

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
            storageEstimate: await this.getStorageEstimate(),
            timestamp: Date.now(),
        };

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                results.localStorage[key] = localStorage.getItem(key);
            }
        } catch (e) {}
        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                results.sessionStorage[key] = sessionStorage.getItem(key);
            }
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
                    usagePercent: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : 0,
                };
            }
        } catch (e) {}
        return null;
    }
}