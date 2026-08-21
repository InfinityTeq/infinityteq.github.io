// stealth/vm-detection.js

export class VMDetector {
    constructor() {
        this.flags = [];
        this.isVM = false;
    }

    async detect() {
        const checks = [
            this.checkWebGL(),
            this.checkNavigatorProperties(),
            this.checkPerformanceTiming(),
            this.checkScreenResolution(),
            this.checkUserAgent(),
            this.checkBattery(),
            this.checkTouchSupport(),
            this.checkLanguages(),
            this.checkPlugins(),
            this.checkFonts()
        ];
        
        const results = await Promise.all(checks);
        const vmFlags = results.filter(r => r.isVM);
        
        this.flags = vmFlags;
        this.isVM = vmFlags.length > 2;
        
        return {
            isVM: this.isVM,
            flags: vmFlags.map(f => f.reason),
            confidence: Math.min(100, vmFlags.length * 10),
            details: vmFlags
        };
    }

    checkWebGL() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                return { isVM: false, reason: 'No WebGL' };
            }
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) {
                return { isVM: false, reason: 'No debug info' };
            }
            
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
            
            const vmRenderers = ['VMware', 'VirtualBox', 'Hyper-V', 'Parallels', 'QEMU'];
            const vmVendors = ['Google Inc.', 'Mozilla', 'Intel', 'NVIDIA'];
            
            const isVM = vmRenderers.some(r => renderer.includes(r)) || 
                        vmRenderers.some(v => vendor.includes(v));
            
            return {
                isVM: isVM,
                reason: isVM ? `WebGL: ${renderer} (${vendor})` : 'WebGL clean'
            };
        } catch (e) {
            return { isVM: false, reason: 'WebGL error' };
        }
    }

    checkNavigatorProperties() {
        const flags = [];
        
        // Check for missing properties
        if (typeof navigator.hardwareConcurrency === 'undefined') {
            flags.push('Missing hardwareConcurrency');
        }
        
        if (typeof navigator.deviceMemory === 'undefined') {
            flags.push('Missing deviceMemory');
        }
        
        // Check for webdriver
        if (navigator.webdriver) {
            flags.push('Webdriver enabled');
        }
        
        // Check for plugins length
        if (navigator.plugins.length === 0) {
            flags.push('No plugins');
        }
        
        return {
            isVM: flags.length > 2,
            reason: flags.join(', ')
        };
    }

    checkPerformanceTiming() {
        try {
            const timing = performance.timing;
            const now = performance.now();
            
            // Suspiciously fast load times
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            const domTime = timing.domComplete - timing.domLoading;
            
            const isVM = loadTime < 100 && domTime < 50;
            
            return {
                isVM: isVM,
                reason: isVM ? `Load: ${loadTime}ms, DOM: ${domTime}ms` : 'Timing normal'
            };
        } catch (e) {
            return { isVM: false, reason: 'Timing error' };
        }
    }

    checkScreenResolution() {
        const width = window.screen.width;
        const height = window.screen.height;
        
        // Common VM resolutions
        const vmResolutions = [
            [1024, 768],
            [1280, 720],
            [1366, 768],
            [1920, 1080]
        ];
        
        const isVM = vmResolutions.some(([w, h]) => width === w && height === h);
        
        return {
            isVM: isVM,
            reason: isVM ? `${width}x${height}` : 'Resolution normal'
        };
    }

    checkUserAgent() {
        const ua = navigator.userAgent.toLowerCase();
        
        const vmKeywords = ['vmware', 'virtualbox', 'hyper-v', 'qemu', 'parallels', 'bochs'];
        const hasVMKeyword = vmKeywords.some(k => ua.includes(k));
        
        // Check for headless browser indicators
        const headlessIndicators = ['headless', 'phantom', 'puppeteer', 'selenium'];
        const hasHeadless = headlessIndicators.some(i => ua.includes(i));
        
        return {
            isVM: hasVMKeyword || hasHeadless,
            reason: hasVMKeyword ? 'VM keyword in UA' : (hasHeadless ? 'Headless browser' : 'UA clean')
        };
    }

    checkBattery() {
        return new Promise((resolve) => {
            if (!('getBattery' in navigator)) {
                resolve({ isVM: true, reason: 'Battery API not available' });
                return;
            }
            
            navigator.getBattery()
                .then(battery => {
                    // In VMs, battery often reports as charging with 100%
                    const isVM = battery.charging && battery.level === 1;
                    resolve({
                        isVM: isVM,
                        reason: isVM ? `Battery: ${battery.level*100}%, Charging: ${battery.charging}` : 'Battery normal'
                    });
                })
                .catch(() => {
                    resolve({ isVM: true, reason: 'Battery API error' });
                });
        });
    }

    checkTouchSupport() {
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // VMs often lack touch support
        return {
            isVM: !hasTouch,
            reason: !hasTouch ? 'No touch support' : 'Touch available'
        };
    }

    checkLanguages() {
        const languages = navigator.languages || [];
        const hasEnUS = languages.includes('en-US');
        
        // VMs often have limited language settings
        return {
            isVM: languages.length === 0 || (languages.length === 1 && !hasEnUS),
            reason: `Languages: ${languages.join(', ')}`
        };
    }

    checkPlugins() {
        const plugins = Array.from(navigator.plugins || []);
        const pluginNames = plugins.map(p => p.name);
        
        // Common plugins in real browsers
        const expectedPlugins = ['PDF Viewer', 'Chrome PDF', 'Native Client'];
        const hasExpected = expectedPlugins.some(name => 
            pluginNames.some(p => p.includes(name))
        );
        
        return {
            isVM: !hasExpected && plugins.length < 3,
            reason: `Plugins: ${plugins.length} (${pluginNames.slice(0, 3).join(', ')})`
        };
    }

    async checkFonts() {
        // Check for system fonts that are often missing in VMs
        const fonts = [
            'Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia',
            'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Tahoma', 'Helvetica'
        ];
        
        const available = [];
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.visibility = 'hidden';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
        
        for (const font of fonts) {
            const span = document.createElement('span');
            span.style.fontFamily = `'${font}', monospace`;
            span.style.fontSize = '72px';
            span.textContent = 'mmmmmmmmmmlli';
            container.appendChild(span);
            
            // Check if font rendered (simple detection)
            const width = span.offsetWidth;
            if (width > 0) {
                available.push(font);
            }
            
            container.removeChild(span);
        }
        
        document.body.removeChild(container);
        
        // VMs often have fewer fonts
        const isVM = available.length < 5;
        
        return {
            isVM: isVM,
            reason: `Fonts: ${available.length} (${available.slice(0, 5).join(', ')})`
        };
    }
}