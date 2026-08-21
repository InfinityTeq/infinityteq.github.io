// collectors/device.js

export class DeviceCollector {
    constructor() {
        this.name = 'device';
    }

    async collect() {
        const ua = navigator.userAgent;
        return {
            userAgent: ua,
            platform: navigator.platform,
            vendor: navigator.vendor,
            language: navigator.language,
            languages: navigator.languages,
            deviceMemory: navigator.deviceMemory,
            hardwareConcurrency: navigator.hardwareConcurrency,
            maxTouchPoints: navigator.maxTouchPoints,
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth
            },
            window: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                outerWidth: window.outerWidth,
                outerHeight: window.outerHeight
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: new Date().getTimezoneOffset(),
            online: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            webdriver: navigator.webdriver,
            deviceType: this.detectDeviceType(ua),
            browser: this.detectBrowser(ua),
            os: this.detectOS(ua),
            engine: this.detectEngine(ua)
        };
    }

    detectDeviceType(ua) {
        ua = ua.toLowerCase();
        if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
        if (/tablet|ipad/.test(ua)) return 'tablet';
        return 'desktop';
    }

    detectBrowser(ua) {
        if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) return 'Chrome';
        if (/firefox/i.test(ua)) return 'Firefox';
        if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
        if (/edge|edg/i.test(ua)) return 'Edge';
        if (/opera|opr/i.test(ua)) return 'Opera';
        return 'Unknown';
    }

    detectOS(ua) {
        if (/windows/i.test(ua)) return 'Windows';
        if (/macintosh|mac os x/i.test(ua)) return 'macOS';
        if (/android/i.test(ua)) return 'Android';
        if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
        if (/linux/i.test(ua)) return 'Linux';
        if (/cros/i.test(ua)) return 'ChromeOS';
        return 'Unknown';
    }

    detectEngine(ua) {
        if (/webkit/i.test(ua)) return 'WebKit';
        if (/gecko/i.test(ua)) return 'Gecko';
        if (/trident/i.test(ua)) return 'Trident';
        if (/presto/i.test(ua)) return 'Presto';
        return 'Unknown';
    }
}