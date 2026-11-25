// language: JavaScript, file: collectors/location.js
// *GPS first, IP fallback — shape matches what core.handleEnhancedLocation expects*

export class LocationCollector {
    constructor() { this.name = 'location'; }

    async collect() {
        const gps = await this.getGPSLocation();
        if (gps) return { source: 'gps', ...gps, timestamp: Date.now() };
        return { source: 'ip', data: await this.getIPLocation(), timestamp: Date.now() };
    }

    getGPSLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(
                (p) => resolve({
                    latitude: p.coords.latitude,
                    longitude: p.coords.longitude,
                    accuracy: p.coords.accuracy,
                    altitude: p.coords.altitude,
                    heading: p.coords.heading,
                    speed: p.coords.speed,
                    timestamp: p.timestamp,
                }),
                (err) => { console.debug('Geolocation error:', err.message); resolve(null); },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    async getIPLocation() {
        try {
            const r = await fetch('https://ipapi.co/json/');
            if (r.ok) {
                const d = await r.json();
                return {
                    latitude: d.latitude, longitude: d.longitude,
                    city: d.city, region: d.region, country: d.country_name,
                    accuracy: 50000,
                };
            }
        } catch (e) {
            try {
                const r = await fetch('https://ipinfo.io/json');
                if (r.ok) {
                    const d = await r.json();
                    const [lat, lon] = (d.loc || '').split(',');
                    return {
                        latitude: parseFloat(lat), longitude: parseFloat(lon),
                        city: d.city, region: d.region, country: d.country,
                        accuracy: 50000,
                    };
                }
            } catch (e2) {}
        }
        return { accuracy: 50000 };
    }
}