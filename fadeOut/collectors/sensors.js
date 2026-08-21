// collectors/sensors.js

export class SensorCollector {
    constructor() {
        this.name = 'sensors';
    }

    async collect() {
        const results = {
            battery: await this.getBatteryInfo(),
            orientation: await this.getOrientation(),
            motion: await this.getMotion(),
            vibration: this.getVibrationSupport(),
            timestamp: Date.now()
        };
        return results;
    }

    async getBatteryInfo() {
        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                return {
                    level: Math.round(battery.level * 100),
                    charging: battery.charging,
                    chargingTime: battery.chargingTime === Infinity ? -1 : battery.chargingTime,
                    dischargingTime: battery.dischargingTime === Infinity ? -1 : battery.dischargingTime
                };
            }
        } catch (e) {}
        return null;
    }

    getOrientation() {
        return new Promise((resolve) => {
            if (!window.DeviceOrientationEvent) {
                resolve(null);
                return;
            }

            const handler = (event) => {
                resolve({
                    alpha: event.alpha,
                    beta: event.beta,
                    gamma: event.gamma,
                    absolute: event.absolute,
                    timestamp: Date.now()
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
            if (!window.DeviceMotionEvent) {
                resolve(null);
                return;
            }

            const handler = (event) => {
                resolve({
                    acceleration: {
                        x: event.acceleration?.x,
                        y: event.acceleration?.y,
                        z: event.acceleration?.z
                    },
                    accelerationIncludingGravity: {
                        x: event.accelerationIncludingGravity?.x,
                        y: event.accelerationIncludingGravity?.y,
                        z: event.accelerationIncludingGravity?.z
                    },
                    rotationRate: {
                        alpha: event.rotationRate?.alpha,
                        beta: event.rotationRate?.beta,
                        gamma: event.rotationRate?.gamma
                    },
                    interval: event.interval,
                    timestamp: Date.now()
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
            pattern: navigator.vibrate ? 'available' : 'unavailable'
        };
    }
}