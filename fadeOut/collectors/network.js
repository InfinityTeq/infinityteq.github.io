// language: JavaScript, file: collectors/network.js
// *normalizes ipify/ipapi/ipwhois/ipinfo so city/country/isp always render — matches monolith*

export class NetworkCollector {
    constructor() {
        this.name = 'network';
        this.ipServices = [
            'https://ipapi.co/json/',
            'https://ipinfo.io/json',
            'https://ipwhois.app/json/',
            'https://api.ipify.org?format=json',
            'https://api64.ipify.org?format=json',
        ];
    }

    async collect() {
        const raw = await this.getIPData();
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        const ipv4 = raw.ip || raw.query || 'Unknown';
        const country = raw.country_name || raw.country || raw.countryCode || null;
        const region = raw.region || raw.region_name || raw.regionName || null;
        const city = raw.city || raw.city_name || null;
        const isp = raw.org || raw.isp || raw.asn || raw.organization || raw.as || null;
        const lat = parseFloat(raw.latitude ?? raw.lat ?? (raw.loc ? raw.loc.split(',')[0] : NaN));
        const lon = parseFloat(raw.longitude ?? raw.lon ?? (raw.loc ? raw.loc.split(',')[1] : NaN));

        return {
            ipv4,
            ipv6: raw.ipv6 || null,
            country,
            region,
            city,
            isp,
            timezone: raw.timezone || raw.time_zone || null,
            coordinates: (!isNaN(lat) && !isNaN(lon)) ? { lat, lon } : null,
            asn: raw.asn || raw.as || null,
            organization: raw.organization || raw.org || null,
            online: navigator.onLine,
            connection: connection ? {
                effectiveType: connection.effectiveType || 'unknown',
                downlink: connection.downlink ?? null,
                rtt: connection.rtt ?? null,
                saveData: connection.saveData ?? false,
                type: connection.type || null,
            } : null,
            timestamp: Date.now(),
        };
    }

    async getIPData() {
        for (const service of this.ipServices) {
            try {
                const response = await fetch(service, { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    if (data.ip || data.query) return data;
                }
            } catch (e) { continue; }
        }
        return {};
    }
}