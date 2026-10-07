/**
 * 地理API速率限制器
 * 限制并发调用：3次/秒
 */
class RateLimiter {
    /**
     * @param {number} maxRequests - 最大请求数
     * @param {number} timeWindow - 时间窗口（毫秒）
     */
    constructor(maxRequests = 3, timeWindow = 1000) {
        if (typeof maxRequests !== 'number' || maxRequests <= 0) {
            throw new Error('maxRequests 必须是大于0的数字');
        }
        if (typeof timeWindow !== 'number' || timeWindow <= 0) {
            throw new Error('timeWindow 必须是大于0的数字');
        }

        this.maxRequests = maxRequests; // 最大请求数
        this.timeWindow = timeWindow; // 时间窗口（毫秒）
        this.requests = []; // 请求时间戳队列
        this.queue = []; // 等待队列
        this.bufferTime = 10; // 缓冲时间（毫秒）
    }

    /**
     * 检查是否可以发送请求
     * @returns {boolean} 是否可以发送请求
     */
    canMakeRequest() {
        const now = Date.now();

        // 移除超出时间窗口的请求记录
        this.requests = this.requests.filter(timestamp => now - timestamp < this.timeWindow);

        // 检查是否还有剩余配额
        return this.requests.length < this.maxRequests;
    }

    /**
     * 添加请求记录
     */
    addRequest() {
        this.requests.push(Date.now());
    }

    /**
     * 等待直到可以发送请求
     * @returns {Promise<void>}
     */
    async waitForSlot() {
        return new Promise(resolve => {
            const checkSlot = () => {
                if (this.canMakeRequest()) {
                    this.addRequest();
                    resolve();
                } else {
                    // 计算需要等待的时间
                    const oldestRequest = Math.min(...this.requests);
                    const waitTime
                        = this.timeWindow - (Date.now() - oldestRequest) + this.bufferTime;
                    setTimeout(checkSlot, Math.max(waitTime, this.bufferTime));
                }
            };
            checkSlot();
        });
    }

    /**
     * 执行带速率限制的请求
     * @param {Function} fn - 要执行的异步函数
     * @returns {Promise<any>} 函数执行结果
     */
    async execute(fn) {
        if (typeof fn !== 'function') {
            throw new Error('fn 必须是一个函数');
        }

        await this.waitForSlot();
        try {
            return await fn();
        } catch (error) {
            // 记录错误但不影响速率限制
            if (window.logger) {
                window.logger.error('速率限制请求执行失败:', error);
            }
            throw error;
        }
    }

    /**
     * 清理旧记录（可选，用于长时间运行的应用）
     */
    cleanup() {
        const now = Date.now();
        this.requests = this.requests.filter(timestamp => now - timestamp < this.timeWindow * 2);
    }
}

// 创建全局速率限制器实例
// 使用常量配置（如果可用）
const getDefaultConfig = () => {
    if (typeof window !== 'undefined' && window.DEFAULT_CONFIG) {
        return {
            maxRequests: window.DEFAULT_CONFIG.RATE_LIMIT_REQUESTS,
            timeWindow: window.DEFAULT_CONFIG.RATE_LIMIT_WINDOW,
            cleanupInterval: window.DEFAULT_CONFIG.CLEANUP_INTERVAL,
        };
    }
    return {
        maxRequests: 3,
        timeWindow: 1000,
        cleanupInterval: 10000,
    };
};

const config = getDefaultConfig();
const geocodeRateLimiter = new RateLimiter(config.maxRequests, config.timeWindow);

// 定期清理旧记录
let cleanupIntervalId = null;
if (typeof window !== 'undefined') {
    cleanupIntervalId = setInterval(() => {
        geocodeRateLimiter.cleanup();
    }, config.cleanupInterval);
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.geocodeRateLimiter = geocodeRateLimiter;
    window.RateLimiter = RateLimiter;
}
