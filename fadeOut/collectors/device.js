// language: JavaScript, file: collectors/device.js
// *matches monolithic DEVICE INFORMATION block: language, colorDepth, touch points*

export class DeviceCollector {
    constructor() { this.name = 'device'; }

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
            engine: this.detectEngine(ua),
            timestamp: Date.now(),
        };
    }

    detectDeviceType(ua) {
        ua = ua.toLowerCase();
        if (/tablet|ipad/.test(ua) && !/mobile/.test(ua)) return 'tablet';
        if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
        return 'desktop';
    }

    detectBrowser(ua) {
        if (/edg/i.test(ua)) return 'Edge';
        if (/opr|opera/i.test(ua)) return 'Opera';
        if (/chrome/i.test(ua) && !/edg|opr/i.test(ua)) return 'Chrome';
        if (/firefox/i.test(ua)) return 'Firefox';
        if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
        return 'Unknown';
    }

    detectOS(ua) {
        if (/windows/i.test(ua)) return 'Windows';
        if (/macintosh|mac os x/i.test(ua)) return 'macOS';
        if (/android/i.test(ua)) return 'Android';
        if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
        if (/cros/i.test(ua)) return 'ChromeOS';
        if (/linux/i.test(ua)) return 'Linux';
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