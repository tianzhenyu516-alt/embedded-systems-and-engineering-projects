class RateLimiter {
    constructor(maxRequests, timeWindowMs, name = 'RateLimiter') {
        this.maxRequests = maxRequests;
        this.timeWindowMs = timeWindowMs;
        this.name = name;
        this.requests = [];
        this.queue = [];
        this.isProcessing = false;
        this.totalProcessed = 0;
        this.totalQueued = 0;
        this.logEnabled = true;
    }

    _log(message, data = {}) {
        if (this.logEnabled) {
            const stats = this.getStats();
            console.log(`[${this.name}] ${message}`, {
                timestamp: new Date().toISOString(),
                stats,
                ...data
            });
        }
    }

    async acquire() {
        this._log('请求等待获取许可', { queuePosition: this.queue.length + 1 });
        
        return new Promise((resolve) => {
            this.queue.push({ resolve, timestamp: Date.now() });
            this.totalQueued++;
            this.processQueue();
        });
    }

    processQueue() {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        const processNext = () => {
            const now = Date.now();
            this.requests = this.requests.filter(time => now - time < this.timeWindowMs);

            if (this.queue.length === 0) {
                this.isProcessing = false;
                return;
            }

            if (this.requests.length < this.maxRequests) {
                this.requests.push(now);
                const item = this.queue.shift();
                if (item) {
                    const waitTime = Date.now() - item.timestamp;
                    this._log('许可已分配', {
                        waitTimeMs: waitTime,
                        queueWaitTime: waitTime
                    });
                    this.totalProcessed++;
                    item.resolve();
                }
                processNext();
            } else {
                const oldestRequest = this.requests[0];
                const waitTime = this.timeWindowMs - (now - oldestRequest);
                
                this._log('达到并发限制，等待', {
                    waitTimeMs: waitTime,
                    currentRequests: this.requests.length,
                    maxRequests: this.maxRequests
                });
                
                if (waitTime > 0) {
                    setTimeout(() => {
                        processNext();
                    }, waitTime);
                } else {
                    processNext();
                }
            }
        };

        processNext();
    }

    getStats() {
        const now = Date.now();
        const currentRequests = this.requests.filter(time => now - time < this.timeWindowMs).length;
        return {
            currentRequests,
            maxRequests: this.maxRequests,
            timeWindowMs: this.timeWindowMs,
            queueLength: this.queue.length,
            totalProcessed: this.totalProcessed,
            totalQueued: this.totalQueued
        };
    }

    reset() {
        this.requests = [];
        this.queue = [];
        this.totalProcessed = 0;
        this.totalQueued = 0;
        this._log('限流器已重置');
    }
}

const geocodingRateLimiter = new RateLimiter(3, 1000, 'GeocodingRateLimiter');

export { RateLimiter, geocodingRateLimiter };
