/**
 * 系统韧性模块 - 错误恢复与健康检查
 * 提供资源加载监控、API健康检查、用户状态管理、监控诊断
 */

const SystemResilience = (() => {
    // ========== 配置 ==========
    const CONFIG = {
        resourceTimeout: 15000,
        resourceRetries: 3,
        healthCheckInterval: 60000,
        healthCheckTimeout: 10000,
        errorReportEndpoint: '/api/logs/frontend-error',
        maxErrorBuffer: 50,
        dedupeWindow: 30000,
    };

    // ========== 状态存储 ==========
    const state = {
        resources: new Map(),
        apiHealth: new Map(),
        errors: [],
        metrics: { loadTimes: {}, apiLatencies: {}, errorCounts: {} },
        degradedFeatures: new Set(),
        listeners: new Map(),
    };

    // ========== 工具函数 ==========
    function log(level, message, data = {}) {
        const entry = { timestamp: new Date().toISOString(), level, message, ...data };
        if (window.logger && typeof window.logger[level] === 'function') {
            window.logger[level]('[SystemResilience]', message, data);
        } else if (console[level]) {
            console[level]('[SystemResilience]', message, data);
        }
        return entry;
    }

    function emit(event, payload) {
        const handlers = state.listeners.get(event) || [];
        handlers.forEach(fn => {
            try {
                fn(payload);
            } catch (e) {
                /* ignore */
            }
        });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========== 1. 资源加载监控 ==========
    const ResourceLoader = {
        registry: {
            'chart.js': {
                urls: [
                    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
                    'https://unpkg.com/chart.js@4.4.1/dist/chart.umd.min.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
                ],
                check: () => typeof Chart !== 'undefined',
                fallback: () => {
                    window.Chart = { __placeholder: true };
                },
            },
        },

        async load(name, options = {}) {
            const config = this.registry[name];
            if (!config) {
                log('warn', `未知资源: ${name}`);
                return false;
            }
            if (config.check()) {
                state.resources.set(name, { status: 'loaded', loadedAt: Date.now() });
                return true;
            }

            const urls = options.urls || config.urls || [];
            const retries = options.retries ?? CONFIG.resourceRetries;
            const timeout = options.timeout ?? CONFIG.resourceTimeout;

            for (let attempt = 1; attempt <= retries; attempt++) {
                for (const url of urls) {
                    try {
                        log('info', `加载资源 ${name} (尝试 ${attempt}/${retries})`, { url });
                        await this._loadScript(url, timeout);
                        if (config.check()) {
                            const loadTime = Date.now();
                            state.resources.set(name, {
                                status: 'loaded',
                                url,
                                loadedAt: loadTime,
                            });
                            state.metrics.loadTimes[name] = loadTime;
                            emit('resource:loaded', { name, url, attempt });
                            return true;
                        }
                    } catch (e) {
                        log('warn', `资源加载失败: ${name}`, { url, error: e.message });
                    }
                }
                if (attempt < retries) {
                    await sleep(500 * attempt);
                }
            }

            // 所有尝试失败，执行降级
            if (typeof config.fallback === 'function') {
                config.fallback();
                state.resources.set(name, { status: 'fallback', loadedAt: Date.now() });
                state.degradedFeatures.add(name);
                emit('resource:fallback', { name });
                log('warn', `资源降级: ${name}`);
            } else {
                state.resources.set(name, { status: 'failed', loadedAt: Date.now() });
                emit('resource:failed', { name });
            }
            return false;
        },

        _loadScript(url, timeout) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                const timer = setTimeout(() => {
                    script.remove();
                    reject(new Error('timeout'));
                }, timeout);
                script.onload = () => {
                    clearTimeout(timer);
                    resolve();
                };
                script.onerror = () => {
                    clearTimeout(timer);
                    script.remove();
                    reject(new Error('load error'));
                };
                document.head.appendChild(script);
            });
        },

        getStatus(name) {
            return state.resources.get(name) || { status: 'unknown' };
        },

        isAvailable(name) {
            const info = state.resources.get(name);
            return info && (info.status === 'loaded' || info.status === 'fallback');
        },
    };

    // ========== 2. API 健康检查 ==========
    const APIHealthChecker = {
        providers: {
            deepseek: { endpoint: 'https://api.deepseek.com/v1/models', method: 'GET' },
            openai: { endpoint: 'https://api.openai.com/v1/models', method: 'GET' },
            proxy: { endpoint: '/api/proxy/ai/health', method: 'GET' },
        },

        async check(provider) {
            const config = this.providers[provider];
            if (!config) {
                return { available: false, reason: 'unknown_provider' };
            }

            const start = Date.now();
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), CONFIG.healthCheckTimeout);
                const headers = this._getAuthHeaders(provider);
                const res = await fetch(config.endpoint, {
                    method: config.method,
                    headers,
                    signal: controller.signal,
                });
                clearTimeout(timer);
                const latency = Date.now() - start;
                state.metrics.apiLatencies[provider] = latency;

                const available = res.ok || res.status === 401; // 401 means service reachable but key issue
                const health = { available, latency, status: res.status, checkedAt: Date.now() };
                state.apiHealth.set(provider, health);
                emit('api:health', { provider, health });
                return health;
            } catch (e) {
                const health = {
                    available: false,
                    reason: e.name === 'AbortError' ? 'timeout' : e.message,
                    checkedAt: Date.now(),
                };
                state.apiHealth.set(provider, health);
                emit('api:health', { provider, health });
                return health;
            }
        },

        async checkAll() {
            const results = {};
            for (const provider of Object.keys(this.providers)) {
                results[provider] = await this.check(provider);
            }
            return results;
        },

        getBestProvider(preferredOrder = ['deepseek', 'openai', 'proxy']) {
            for (const p of preferredOrder) {
                const h = state.apiHealth.get(p);
                if (h && h.available) {
                    return p;
                }
            }
            return null;
        },

        _getAuthHeaders(provider) {
            const headers = { 'Content-Type': 'application/json' };
            const keys = window.AI_CONFIG?.API_KEYS || {};
            const key = keys[provider] || '';
            if (key) {
                headers['Authorization'] = `Bearer ${key}`;
            }
            return headers;
        },

        startPeriodicCheck(interval = CONFIG.healthCheckInterval) {
            if (this._intervalId) {
                clearInterval(this._intervalId);
            }
            this._intervalId = setInterval(() => this.checkAll(), interval);
            this.checkAll(); // immediate
        },

        stopPeriodicCheck() {
            if (this._intervalId) {
                clearInterval(this._intervalId);
            }
        },
    };

    // ========== 3. 用户状态管理 ==========
    const UserStateManager = {
        notify(message, type = 'info', duration = 5000) {
            emit('user:notification', { message, type, duration });
            // 尝试使用全局 toast
            if (window.showToast) {
                window.showToast(message, type, duration);
            } else if (window.Toastify) {
                window
                    .Toastify({
                        text: message,
                        duration,
                        gravity: 'top',
                        position: 'center',
                        style: {
                            background:
                                type === 'error'
                                    ? '#e74c3c'
                                    : type === 'warning'
                                        ? '#f39c12'
                                        : '#3498db',
                        },
                    })
                    .showToast();
            } else {
                log(type === 'error' ? 'error' : 'info', message);
            }
        },

        degradeFeature(feature, reason) {
            if (state.degradedFeatures.has(feature)) {
                return;
            }
            state.degradedFeatures.add(feature);
            emit('feature:degraded', { feature, reason });
            this.notify(`${feature} 功能暂时受限：${reason}`, 'warning');
        },

        restoreFeature(feature) {
            if (!state.degradedFeatures.has(feature)) {
                return;
            }
            state.degradedFeatures.delete(feature);
            emit('feature:restored', { feature });
        },

        isFeatureDegraded(feature) {
            return state.degradedFeatures.has(feature);
        },

        getDegradedFeatures() {
            return Array.from(state.degradedFeatures);
        },
    };

    // ========== 4. 监控与诊断 ==========
    const Monitor = {
        _errorHashes: new Map(),

        captureError(error, context = {}) {
            const entry = {
                message: error.message || String(error),
                stack: error.stack,
                context,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
            };

            // 去重
            const hash = `${entry.message}:${context.source || ''}`;
            const last = this._errorHashes.get(hash);
            if (last && Date.now() - last < CONFIG.dedupeWindow) {
                return;
            }
            this._errorHashes.set(hash, Date.now());

            state.errors.push(entry);
            if (state.errors.length > CONFIG.maxErrorBuffer) {
                state.errors.shift();
            }

            state.metrics.errorCounts[context.source || 'unknown']
                = (state.metrics.errorCounts[context.source || 'unknown'] || 0) + 1;

            emit('error:captured', entry);
            log('error', entry.message, { context });

            // 异步上报
            this._report(entry);
        },

        async _report(entry) {
            if (!CONFIG.errorReportEndpoint) {
                return;
            }
            try {
                await fetch(CONFIG.errorReportEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entry),
                    keepalive: true,
                });
            } catch (e) {
                /* ignore */
            }
        },

        getMetrics() {
            return {
                ...state.metrics,
                degradedFeatures: Array.from(state.degradedFeatures),
                apiHealth: Object.fromEntries(state.apiHealth),
            };
        },

        getRecentErrors(limit = 20) {
            return state.errors.slice(-limit);
        },

        installGlobalHandler() {
            window.addEventListener('error', event => {
                this.captureError(event.error || new Error(event.message), {
                    source: 'window.onerror',
                    filename: event.filename,
                    lineno: event.lineno,
                });
            });
            window.addEventListener('unhandledrejection', event => {
                this.captureError(event.reason || new Error('Unhandled rejection'), {
                    source: 'unhandledrejection',
                });
            });
        },
    };

    // ========== 事件订阅 ==========
    function on(event, handler) {
        if (!state.listeners.has(event)) {
            state.listeners.set(event, []);
        }
        state.listeners.get(event).push(handler);
    }

    function off(event, handler) {
        const handlers = state.listeners.get(event);
        if (handlers) {
            const idx = handlers.indexOf(handler);
            if (idx !== -1) {
                handlers.splice(idx, 1);
            }
        }
    }

    // ========== 初始化 ==========
    async function init(options = {}) {
        log('info', '系统韧性模块初始化');
        Monitor.installGlobalHandler();

        // 加载关键资源
        const resources = options.resources || ['chart.js'];
        for (const res of resources) {
            await ResourceLoader.load(res);
        }

        // 启动 API 健康检查
        if (options.enableHealthCheck !== false) {
            APIHealthChecker.startPeriodicCheck(options.healthCheckInterval);
        }

        emit('system:ready', { degradedFeatures: UserStateManager.getDegradedFeatures() });
    }

    // ========== 公开 API ==========
    return {
        init,
        ResourceLoader,
        APIHealthChecker,
        UserStateManager,
        Monitor,
        on,
        off,
        getState: () => ({
            ...state,
            resources: Object.fromEntries(state.resources),
            apiHealth: Object.fromEntries(state.apiHealth),
        }),
    };
})();

// 挂载到 window
window.SystemResilience = SystemResilience;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemResilience;
}
