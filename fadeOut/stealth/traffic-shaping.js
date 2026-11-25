// stealth/traffic-shaping.js

export class TrafficShaper {
    constructor() {
        this.isActive = false;
        this.requests = [];
        this.beaconInterval = null;
        this.jitter = 0;
    }

    async activate() {
        if (this.isActive) return;
        
        // Add random jitter to requests
        this.jitter = Math.floor(Math.random() * 500);
        
        // Start beacon pings
        this.startBeaconPings();
        
        // Override fetch to add delay and noise
        this.overrideFetch();
        
        this.isActive = true;
        console.debug('Traffic shaping activated');
    }

    startBeaconPings() {
        // Send fake analytics beacons
        const endpoints = [
            'https://www.google-analytics.com/collect',
            'https://www.facebook.com/tr',
            'https://api.amplitude.com/2/httpapi'
        ];
        
        let index = 0;
        this.beaconInterval = setInterval(() => {
            const endpoint = endpoints[index % endpoints.length];
            this.sendFakeBeacon(endpoint);
            index++;
        }, 30000 + this.jitter);
    }

    sendFakeBeacon(endpoint) {
        try {
            const data = new URLSearchParams({
                v: '1',
                tid: 'UA-' + Math.random().toString(36).substring(2, 8),
                cid: Math.random().toString(36).substring(2, 12),
                t: 'event',
                ec: 'page_view',
                ea: 'load',
                el: window.location.href
            });
            
            navigator.sendBeacon(endpoint, data);
        } catch (e) {
            // Silently fail
        }
    }

    overrideFetch() {
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = function(...args) {
            // Add delay to mimic human behavior
            return new Promise((resolve, reject) => {
                const delay = Math.random() * 200 + 50 + self.jitter;
                setTimeout(() => {
                    originalFetch.apply(this, args)
                        .then(resolve)
                        .catch(reject);
                }, delay);
            });
        };
    }

    addRequestDelay(ms) {
        this.jitter = Math.floor(Math.random() * ms);
        return this.jitter;
    }

    async mimicHumanBehavior() {
        // Random mouse movements
        this.mimicMouseMovements();
        
        // Random scrolls
        this.mimicScrolling();
        
        // Random clicks
        this.mimicClicks();
    }

    mimicMouseMovements() {
        const events = ['mousemove', 'mousedown', 'mouseup'];
        let count = 0;
        
        const interval = setInterval(() => {
            if (count > 20) {
                clearInterval(interval);
                return;
            }
            
            const event = events[Math.floor(Math.random() * events.length)];
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            
            const mouseEvent = new MouseEvent(event, {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            });
            
            document.dispatchEvent(mouseEvent);
            count++;
        }, 2000 + Math.random() * 3000);
    }

    mimicScrolling() {
        let count = 0;
        const interval = setInterval(() => {
            if (count > 5) {
                clearInterval(interval);
                return;
            }
            
            window.scrollTo({
                top: Math.random() * document.documentElement.scrollHeight * 0.5,
                behavior: 'smooth'
            });
            
            count++;
        }, 3000 + Math.random() * 5000);
    }

    mimicClicks() {
        let count = 0;
        const interval = setInterval(() => {
            if (count > 10) {
                clearInterval(interval);
                return;
            }
            
            const element = document.querySelector('a, button, .btn, .card');
            if (element && Math.random() > 0.7) {
                element.click();
            }
            
            count++;
        }, 5000 + Math.random() * 10000);
    }

    deactivate() {
        this.isActive = false;
        
        if (this.beaconInterval) {
            clearInterval(this.beaconInterval);
            this.beaconInterval = null;
        }
        
        // Restore fetch
        // (can't easily restore prototype)
    }
}