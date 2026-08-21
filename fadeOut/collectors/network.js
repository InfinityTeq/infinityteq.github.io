// collectors/network.js

export class NetworkCollector {
    constructor() {
        this.name = 'network';
        this.ipServices = [
            'https://api.ipify.org?format=json',
            'https://api64.ipify.org?format=json',
            'https://ipapi.co/json/',
            'https://ipwhois.app/json/',
            'https://ipinfo.io/json'
        ];
    }

    async collect() {
        const ipData = await this.getIPData();
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        return {
            ipv4: ipData.ip || 'Unknown',
            ipv6: ipData.ipv6 || null,
            country: ipData.country || ipData.country_name || ipData.countryCode,
            region: ipData.region || ipData.region_name || ipData.regionName,
            city: ipData.city || ipData.city_name,
            isp: ipData.org || ipData.isp || ipData.asn,
            timezone: ipData.timezone || ipData.time_zone,
            location: ipData.loc || (ipData.latitude && ipData.longitude ? `${ipData.latitude},${ipData.longitude}` : null),
            coordinates: ipData.latitude && ipData.longitude ? {
                lat: parseFloat(ipData.latitude),
                lon: parseFloat(ipData.longitude)
            } : null,
            asn: ipData.asn || ipData.as,
            organization: ipData.organization || ipData.org,
            online: navigator.onLine,
            connection: connection ? {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData,
                type: connection.type
            } : null
        };
    }

    async getIPData() {
        for (const service of this.ipServices) {
            try {
                const response = await fetch(service, { 
                    cache: 'no-store',
                    timeout: 5000
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.ip || data.query) {
                        return data;
                    }
                }
            } catch (e) {
                continue;
            }
        }
        return {};
    }
}