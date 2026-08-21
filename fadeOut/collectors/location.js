// collectors/location.js

export class LocationCollector {
    constructor() {
        this.name = 'location';
    }

    async collect() {
        // Try GPS first
        const gpsLocation = await this.getGPSLocation();
        if (gpsLocation) {
            return {
                source: 'gps',
                ...gpsLocation
            };
        }

        // Fallback to IP-based
        return {
            source: 'ip',
            data: await this.getIPLocation()
        };
    }

    getGPSLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    console.debug('Geolocation error:', error.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    async getIPLocation() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                return {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    city: data.city,
                    region: data.region,
                    country: data.country_name,
                    accuracy: 50000 // IP location ~50km accuracy
                };
            }
        } catch (e) {
            // Fallback to ipinfo
            try {
                const resp = await fetch('https://ipinfo.io/json');
                if (resp.ok) {
                    const data = await resp.json();
                    const [lat, lon] = data.loc?.split(',') || [null, null];
                    return {
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lon),
                        city: data.city,
                        region: data.region,
                        country: data.country,
                        accuracy: 50000
                    };
                }
            } catch (e2) {}
        }
        return { accuracy: 50000 };
    }

    // Helper methods for map generation
    generateGoogleMapsLink(lat, lon) {
        return `https://www.google.com/maps?q=${lat},${lon}&z=15&t=m`;
    }

    generateOpenStreetMapLink(lat, lon) {
        return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
    }

    generateBingMapsLink(lat, lon) {
        return `https://bing.com/maps/default.aspx?cp=${lat}~${lon}&lvl=15`;
    }

    generateAppleMapsLink(lat, lon) {
        return `https://maps.apple.com/?q=${lat},${lon}&z=15&t=s`;
    }

    generateStaticMap(lat, lon, zoom = 15, size = '600x300') {
        return `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&z=${zoom}&size=${size}&l=map&pt=${lon},${lat},pmwtm1`;
    }

    generateWhat3Words(lat, lon) {
        const words = ['apple', 'brave', 'chair', 'dream', 'eagle', 'flame', 'grape', 'house', 'island', 'jazz', 'koala', 'lion'];
        const latHash = Math.abs(Math.floor(lat * 1000)) % words.length;
        const lonHash = Math.abs(Math.floor(lon * 1000)) % words.length;
        const altHash = Math.abs(Math.floor((lat + lon) * 1000)) % words.length;
        return `${words[latHash]}.${words[lonHash]}.${words[altHash]}`;
    }

    convertToDMS(lat, lon) {
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        const latAbs = Math.abs(lat);
        const lonAbs = Math.abs(lon);
        const latDeg = Math.floor(latAbs);
        const latMin = Math.floor((latAbs - latDeg) * 60);
        const latSec = ((latAbs - latDeg - latMin/60) * 3600).toFixed(1);
        const lonDeg = Math.floor(lonAbs);
        const lonMin = Math.floor((lonAbs - lonDeg) * 60);
        const lonSec = ((lonAbs - lonDeg - lonMin/60) * 3600).toFixed(1);
        return `${latDeg}°${latMin}'${latSec}"${latDir} ${lonDeg}°${lonMin}'${lonSec}"${lonDir}`;
    }
}