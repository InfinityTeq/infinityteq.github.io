// language: JavaScript, file: collectors/sensors.js
// *full DeviceMotion + DeviceOrientation capture — matches monolith sensor block*

export class SensorCollector {
    constructor() { this.name = 'sensors'; }

    async collect() {
        return {
            battery: await this.getBatteryInfo(),
            orientation: await this.getOrientation(),
            motion: await this.getMotion(),
            vibration: this.getVibrationSupport(),
            timestamp: Date.now(),
        };
    }

    async getBatteryInfo() {
        try {
            if ('getBattery' in navigator) {
                const b = await navigator.getBattery();
                return {
                    level: Math.round(b.level * 100),
                    charging: b.charging,
                    chargingTime: (b.chargingTime === Infinity || !isFinite(b.chargingTime)) ? -1 : b.chargingTime,
                    dischargingTime: (b.dischargingTime === Infinity || !isFinite(b.dischargingTime)) ? -1 : b.dischargingTime,
                };
            }
        } catch (e) {}
        return null;
    }

    getOrientation() {
        return new Promise((resolve) => {
            if (!window.DeviceOrientationEvent) return resolve(null);
            const handler = (e) => {
                resolve({
                    alpha: e.alpha, beta: e.beta, gamma: e.gamma,
                    absolute: e.absolute,
                    timestamp: Date.now(),
                });
                window.removeEventListener('deviceorientation', handler);
            };
            window.addEventListener('deviceorientation', handler);
            setTimeout(() => {
                window.removeEventListener('deviceorientation', handler);
                resolve(null);
            }, 2000);
        });
    }

    getMotion() {
        return new Promise((resolve) => {
            if (!window.DeviceMotionEvent) return resolve(null);
            const handler = (e) => {
                resolve({
                    acceleration: {
                        x: e.acceleration?.x, y: e.acceleration?.y, z: e.acceleration?.z,
                    },
                    accelerationIncludingGravity: {
                        x: e.accelerationIncludingGravity?.x,
                        y: e.accelerationIncludingGravity?.y,
                        z: e.accelerationIncludingGravity?.z,
                    },
                    rotationRate: {
                        alpha: e.rotationRate?.alpha,
                        beta: e.rotationRate?.beta,
                        gamma: e.rotationRate?.gamma,
                    },
                    interval: e.interval,
                    timestamp: Date.now(),
                });
                window.removeEventListener('devicemotion', handler);
            };
            window.addEventListener('devicemotion', handler);
            setTimeout(() => {
                window.removeEventListener('devicemotion', handler);
                resolve(null);
            }, 2000);
        });
    }

    getVibrationSupport() {
        return {
            supported: 'vibrate' in navigator,
            pattern: navigator.vibrate ? 'available' : 'unavailable',
        };
    }
}