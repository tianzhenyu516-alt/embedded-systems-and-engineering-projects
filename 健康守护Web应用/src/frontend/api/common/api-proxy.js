class APIProxy {
    constructor() {
        let proxyUrl = window.API_PROXY_URL || '/api/proxy';
        if (proxyUrl.startsWith('/') && window.BASE_CONFIG) {
            proxyUrl = window.BASE_CONFIG.basePath + proxyUrl;
        }
        this.baseURL = proxyUrl;
        const config = this._getDefaultConfig();
        this.timeout = config.timeout;
        this.retryConfig = {
            maxRetries: config.maxRetries,
            retryDelay: config.retryDelay,
            retryableStatuses: config.retryableStatuses,
        };
        this.requestQueue = [];
        this.maxConcurrentRequests = config.maxConcurrentRequests;
        this.currentRequests = 0;
        this.aiProvidersCache = null;
        this.aiProvidersCacheAt = 0;
        this.aiProvidersCacheTTL = 60 * 1000;
    }

    _generateTraceId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    _buildGatewayHeaders(headers = {}, traceId = this._generateTraceId()) {
        return {
            ...headers,
            'X-Trace-Id': traceId,
            'X-Api-Gateway': 'core',
            'X-Client-Layer': 'frontend-business',
        };
    }

    _getDefaultConfig() {
        if (typeof window !== 'undefined' && window.DEFAULT_CONFIG && window.RETRYABLE_STATUSES) {
            return {
                timeout: window.DEFAULT_CONFIG.DEFAULT_TIMEOUT,
                maxRetries: window.DEFAULT_CONFIG.MAX_RETRIES,
                retryDelay: window.DEFAULT_CONFIG.RETRY_DELAY,
                retryableStatuses: window.RETRYABLE_STATUSES,
                maxConcurrentRequests: window.DEFAULT_CONFIG.MAX_CONCURRENT_REQUESTS,
            };
        }
        // 降级方案
        return {
            timeout: 15000,
            maxRetries: 1,
            retryDelay: 500,
            retryableStatuses: [408, 429, 500, 502, 503, 504],
            maxConcurrentRequests: 5,
        };
    }

    /**
     * 发送请求
     */
    async request(endpoint, options = {}) {
        // 等待队列中的位置
        await this.waitForQueue();

        this.currentRequests++;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

            const requestOptions = {
                ...options,
                signal: controller.signal,
            };
            const traceId = options.traceId || this._generateTraceId();
            requestOptions.traceId = traceId;
            requestOptions.headers = this._buildGatewayHeaders({
                'Content-Type': 'application/json',
                ...options.headers,
            }, traceId);

            // 添加认证信息（如果存在）
            const authToken = this.getAuthToken();
            if (authToken) {
                requestOptions.headers['Authorization'] = `Bearer ${authToken}`;
            }

            let response;
            let lastError;

            // 重试逻辑
            for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
                try {
                    response = await fetch(`${this.baseURL}${endpoint}`, requestOptions);

                    // 检查是否需要重试
                    if (this.shouldRetry(response.status, attempt)) {
                        const delay = this.retryConfig.retryDelay * Math.pow(2, attempt);
                        await this.sleep(delay);
                        continue;
                    }

                    break; // 成功或不可重试的错误
                } catch (error) {
                    lastError = error;

                    // 网络错误可以重试
                    if (
                        attempt < this.retryConfig.maxRetries
                        && (error.name === 'AbortError' || error.name === 'TypeError')
                    ) {
                        const delay = this.retryConfig.retryDelay * Math.pow(2, attempt);
                        await this.sleep(delay);
                        continue;
                    }

                    throw error;
                } finally {
                    clearTimeout(timeoutId);
                }
            }

            if (!response) {
                throw lastError || new Error('请求失败');
            }

            // 检查响应状态
            if (!response.ok) {
                const errorData = await this.parseErrorResponse(response);

                // 确保 errorMessage 是字符串，并且不是 '[object Object]'
                let errorMessage = errorData.message || `请求失败: ${response.status}`;

                // 如果 errorMessage 是对象，尝试提取字符串
                if (typeof errorMessage !== 'string') {
                    if (errorMessage && typeof errorMessage === 'object') {
                        // 尝试从对象中提取 message 字段
                        if (errorMessage.message && typeof errorMessage.message === 'string') {
                            errorMessage = errorMessage.message;
                        } else {
                            try {
                                errorMessage = JSON.stringify(errorMessage);
                            } catch (e) {
                                errorMessage = String(errorMessage);
                            }
                        }
                    } else {
                        errorMessage = String(errorMessage);
                    }
                }

                // 如果仍然是 '[object Object]'，使用备用消息
                if (errorMessage === '[object Object]' || errorMessage.trim() === '') {
                    if (errorData.originalData) {
                        // 尝试从原始数据中提取错误信息
                        const original = errorData.originalData;
                        if (original.error && typeof original.error === 'object') {
                            errorMessage
                                = original.error.message
                                || original.error.code
                                || `HTTP ${response.status} 错误`;
                        } else if (original.message && typeof original.message === 'string') {
                            errorMessage = original.message;
                        } else if (original.error && typeof original.error === 'string') {
                            errorMessage = original.error;
                        } else {
                            errorMessage = `HTTP ${response.status} 错误`;
                        }
                    } else {
                        errorMessage = `HTTP ${response.status} 错误`;
                    }
                }

                // 根据状态码提供更友好的错误消息
                if (response.status === 400) {
                    if (!errorMessage.includes('400') && !errorMessage.includes('请求参数')) {
                        errorMessage = `请求参数错误 (400): ${errorMessage}`;
                    }
                } else if (response.status === 401) {
                    errorMessage = '认证失败，请重新登录';
                } else if (response.status === 403) {
                    errorMessage = '权限不足，无法访问此资源';
                } else if (response.status === 404) {
                    errorMessage = `接口不存在 (404): ${endpoint}`;
                } else if (response.status === 500) {
                    errorMessage = `服务器内部错误 (500): ${errorMessage}`;
                }

                // 创建详细的错误对象
                const error = new Error(errorMessage);
                error.status = response.status;
                error.code = errorData.code || `HTTP_${response.status}`;
                error.details = errorData.details;
                error.originalData = errorData.originalData;

                // 重写 toString 方法，确保错误信息能正确显示
                error.toString = function () {
                    return this.message;
                };

                // 对于 API 密钥未配置的错误，使用 warn 而不是 error
                const isConfigError
                    = errorMessage.includes('API密钥未配置')
                    || errorMessage.includes('API密钥无效')
                    || errorData.code === 'API_KEY_INVALID';

                if (isConfigError) {
                    // 配置错误只记录一次，使用 warn 级别
                    this._log('warn', 'AI服务配置未完成:', errorMessage);
                } else {
                    this._log('error', 'API请求失败:', {
                        endpoint,
                        status: response.status,
                        message: errorMessage,
                        code: errorData.code,
                        details: errorData.details,
                    });
                }

                throw error;
            }

            // 解析响应
            const data = await response.json();

            this._log('debug', 'API 请求成功:', endpoint);

            return data;
        } catch (error) {
            // 确保错误信息是字符串格式
            if (error && error.message) {
                if (typeof error.message !== 'string') {
                    if (error.message && typeof error.message === 'object') {
                        // 尝试从对象中提取 message 字段
                        if (error.message.message && typeof error.message.message === 'string') {
                            error.message = error.message.message;
                        } else {
                            try {
                                error.message = JSON.stringify(error.message);
                            } catch (e) {
                                error.message = String(error.message);
                            }
                        }
                    } else {
                        error.message = String(error.message);
                    }
                }

                // 如果错误信息仍然是 [object Object]，尝试从其他属性提取
                if (error.message === '[object Object]' || error.message.trim() === '') {
                    if (error.originalData) {
                        try {
                            const original = error.originalData;
                            const msg
                                = original.error?.message || original.message || original.error;
                            if (msg && typeof msg === 'string') {
                                error.message = msg;
                            } else {
                                error.message = `API请求失败: ${endpoint} (${error.status || '未知状态'})`;
                            }
                        } catch (e) {
                            error.message = `API请求失败: ${endpoint} (${error.status || '未知状态'})`;
                        }
                    } else if (error.status) {
                        error.message = `API请求失败: ${endpoint} (HTTP ${error.status})`;
                    } else {
                        error.message = `API请求失败: ${endpoint}`;
                    }
                }
            } else if (error && typeof error === 'object') {
                // 如果 error 没有 message 属性，尝试从其他属性构造
                try {
                    error.message = error.status
                        ? `API请求失败: ${endpoint} (HTTP ${error.status})`
                        : `API请求失败: ${endpoint}`;
                } catch (e) {
                    error.message = `API请求失败: ${endpoint}`;
                }
            } else {
                // 如果 error 不是对象，创建一个新的错误对象
                const newError = new Error(error ? String(error) : `API请求失败: ${endpoint}`);
                newError.originalError = error;
                error = newError;
            }

            // 对于 API 密钥未配置的错误，使用 warn 而不是 error
            const isConfigError
                = error.message?.includes('API密钥未配置')
                || error.message?.includes('API密钥无效')
                || error.code === 'API_KEY_INVALID';

            if (isConfigError) {
                // 配置错误只记录一次，使用 warn 级别
                this._log('warn', 'AI服务配置未完成:', error.message);
            } else {
                this._log('error', 'API 请求失败:', endpoint, {
                    message: error.message,
                    status: error.status,
                    code: error.code,
                    details: error.details,
                    stack: error.stack,
                });
            }

            // 对于配置错误，不调用全局错误处理器（避免重复记录）
            if (!isConfigError) {
                // 处理错误
                this.handleRequestError(error, endpoint);
            }

            if (
                error.status === 401
                && window.AuthGuard
                && typeof window.AuthGuard.handleSessionExpired === 'function'
            ) {
                window.AuthGuard.handleSessionExpired(error.message || '登录状态已失效，请重新登录');
            }
            throw error;
        } finally {
            this.currentRequests--;
            this.processQueue();
        }
    }

    /**
     * 统一的日志记录方法
     * @private
     * @param {string} level - 日志级别: 'debug', 'info', 'warn', 'error'
     * @param {...any} args - 日志参数
     */
    _log(level, ...args) {
        if (window.logger) {
            window.logger[level](...args);
        } else {
            // 降级方案：使用 console
            const consoleMethod = level === 'debug' ? 'log' : level;
            console[consoleMethod](...args);
        }
    }

    /**
     * 等待队列
     */
    async waitForQueue() {
        if (this.currentRequests < this.maxConcurrentRequests) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.requestQueue.push(resolve);
        });
    }

    /**
     * 处理队列
     */
    processQueue() {
        if (this.requestQueue.length > 0 && this.currentRequests < this.maxConcurrentRequests) {
            const resolve = this.requestQueue.shift();
            resolve();
        }
    }

    /**
     * 判断是否应该重试
     */
    shouldRetry(status, attempt) {
        if (attempt >= this.retryConfig.maxRetries) {
            return false;
        }

        return this.retryConfig.retryableStatuses.includes(status);
    }

    /**
     * 解析错误响应
     */
    async parseErrorResponse(response) {
        try {
            const data = await response.json();

            // 处理后端标准错误格式: { success: false, error: { code, message, details } }
            let errorMessage = `HTTP ${response.status}`;
            let errorCode = response.status;
            let errorDetails = null;

            if (data.error) {
                // 如果 error 是对象，提取 message
                if (typeof data.error === 'object' && data.error !== null) {
                    // 优先使用 message，然后是 code，最后是默认值
                    const msg = data.error.message || data.error.code;
                    if (msg) {
                        errorMessage = typeof msg === 'string' ? msg : String(msg);
                    }
                    errorCode = data.error.code || errorCode;
                    errorDetails = data.error.details || null;
                } else if (typeof data.error === 'string') {
                    errorMessage = data.error;
                } else {
                    errorMessage = String(data.error);
                }
            } else if (data.message) {
                // 如果直接有 message 字段
                if (typeof data.message === 'string') {
                    errorMessage = data.message;
                } else if (typeof data.message === 'object') {
                    // 如果 message 是对象，尝试提取其中的 message 字段
                    if (data.message.message && typeof data.message.message === 'string') {
                        errorMessage = data.message.message;
                    } else {
                        errorMessage = JSON.stringify(data.message);
                    }
                } else {
                    errorMessage = String(data.message);
                }
            }

            // 最终确保 errorMessage 是字符串
            if (typeof errorMessage !== 'string') {
                try {
                    errorMessage = JSON.stringify(errorMessage);
                } catch (e) {
                    errorMessage = String(errorMessage);
                }
            }

            // 如果 errorMessage 仍然是 '[object Object]' 或为空，尝试从其他字段提取
            if (errorMessage === '[object Object]' || errorMessage.trim() === '') {
                try {
                    // 尝试多种方式提取错误消息
                    let fallbackMsg = null;

                    // 1. 尝试从 error.message 提取
                    if (data.error && typeof data.error === 'object' && data.error.message) {
                        fallbackMsg = data.error.message;
                    }
                    // 2. 尝试从 data.message 提取
                    else if (data.message) {
                        fallbackMsg = data.message;
                    }
                    // 3. 尝试从 error.code 提取
                    else if (data.error && typeof data.error === 'object' && data.error.code) {
                        fallbackMsg = data.error.code;
                    }
                    // 4. 尝试从 data.code 提取
                    else if (data.code) {
                        fallbackMsg = data.code;
                    }
                    // 5. 使用默认消息
                    else {
                        fallbackMsg = `HTTP ${response.status} 错误`;
                    }

                    // 确保 fallbackMsg 是字符串
                    if (typeof fallbackMsg === 'string') {
                        errorMessage = fallbackMsg;
                    } else if (typeof fallbackMsg === 'object') {
                        // 如果仍然是对象，尝试 JSON 序列化
                        try {
                            errorMessage = JSON.stringify(fallbackMsg);
                        } catch (e) {
                            errorMessage = `HTTP ${response.status} 错误`;
                        }
                    } else {
                        errorMessage = String(fallbackMsg);
                    }
                } catch (e) {
                    errorMessage = `HTTP ${response.status} 错误`;
                }
            }

            // 对于 400 错误，提供更详细的错误信息
            if (response.status === 400 && errorDetails) {
                // 如果 details 是对象，尝试提取更多信息
                if (typeof errorDetails === 'object') {
                    const detailsStr = JSON.stringify(errorDetails);
                    if (detailsStr && detailsStr !== '{}') {
                        errorMessage += ` (详情: ${detailsStr})`;
                    }
                }
            }

            return {
                message: errorMessage,
                code: errorCode,
                details: errorDetails || data.details || null,
                originalData: data, // 保存原始数据用于调试
            };
        } catch (e) {
            // 如果无法解析 JSON，返回状态码信息
            return {
                message: `HTTP ${response.status}: ${response.statusText}`,
                code: response.status,
                details: null,
            };
        }
    }

    /**
     * 处理请求错误
     */
    handleRequestError(error, endpoint) {
        // 如果存在全局错误处理器，使用它
        if (window.errorHandler) {
            window.errorHandler.handleError(error, `API请求: ${endpoint}`);
        }
    }

    /**
     * 获取认证令牌
     */
    getAuthToken() {
        const storageSources = [sessionStorage, localStorage];

        for (const storage of storageSources) {
            try {
                const loginInfo = storage.getItem('loginInfo');
                if (loginInfo) {
                    const info = JSON.parse(loginInfo);
                    if (info?.token) {
                        return info.token;
                    }
                }

                const authToken = storage.getItem('authToken');
                if (authToken) {
                    return authToken;
                }
            } catch (e) {
                // 忽略单个存储源读取错误，继续尝试下一个
            }
        }

        return null;
    }

    /**
     * 睡眠函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取 AI 提供商状态
     */
    async getAIProviders(forceRefresh = false) {
        const now = Date.now();
        if (
            !forceRefresh
            && this.aiProvidersCache
            && now - this.aiProvidersCacheAt < this.aiProvidersCacheTTL
        ) {
            return this.aiProvidersCache;
        }

        const response = await this.request('/ai/providers', {
            method: 'GET',
        });

        const data = response?.success && response.data ? response.data : response;
        this.aiProvidersCache = data || null;
        this.aiProvidersCacheAt = now;
        return this.aiProvidersCache;
    }

    /**
     * 获取当前可用的 AI 提供商列表
     */
    async getAvailableAIProviders(preferredProviders = [], forceRefresh = false) {
        const data = await this.getAIProviders(forceRefresh);
        const configuredProviders = Array.isArray(data?.providers)
            ? data.providers
                .filter(item => item?.enabled && item?.configured && item?.status === 'healthy' && !item?.circuitOpen)
                .map(item => item.provider)
            : [];

        if (!configuredProviders.length) {
            return [];
        }

        const preferred = Array.isArray(preferredProviders)
            ? preferredProviders.filter(provider => typeof provider === 'string' && provider.trim())
            : [];

        if (!preferred.length) {
            return configuredProviders;
        }

        const filteredPreferred = preferred.filter(provider => configuredProviders.includes(provider));
        const remainder = configuredProviders.filter(provider => !filteredPreferred.includes(provider));
        return [...filteredPreferred, ...remainder];
    }

    /**
     * AI API 调用（通过代理）
     */
    async callAI(messages, provider, options = {}) {
        // 验证参数
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            throw new Error('messages参数无效：必须是非空数组');
        }

        if (!provider || typeof provider !== 'string' || provider.trim() === '') {
            throw new Error('provider参数无效：不能为空');
        }

        // 构建请求体，只包含后端需要的字段
        const requestBody = {
            messages,
            provider: provider.trim(),
        };

        // 添加可选参数
        if (options.temperature !== undefined) {
            requestBody.temperature = options.temperature;
        }
        if (options.maxTokens !== undefined) {
            requestBody.maxTokens = options.maxTokens;
        }
        if (options.model !== undefined) {
            requestBody.model = options.model;
        }
        if (options.stream !== undefined) {
            requestBody.stream = options.stream;
        }

        this._log('debug', '调用AI代理:', {
            provider,
            messageCount: messages.length,
            hasTemperature: options.temperature !== undefined,
            hasMaxTokens: options.maxTokens !== undefined,
            hasModel: options.model !== undefined,
            stream: options.stream === true,
            timeout: options.timeout,
        });

        const requestOptions = {
            method: 'POST',
            body: JSON.stringify(requestBody),
            traceId: options.traceId || this._generateTraceId(),
        };

        if (options.timeout !== undefined) {
            requestOptions.timeout = options.timeout;
        }

        if (options.stream === true) {
            const controller = new AbortController();
            const traceId = options.traceId || this._generateTraceId();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);
            const headers = this._buildGatewayHeaders({
                'Content-Type': 'application/json',
            }, traceId);
            const authToken = this.getAuthToken();
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            try {
                const response = await fetch(`${this.baseURL}/ai`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(requestBody),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const errorData = await this.parseErrorResponse(response);
                    const error = new Error(errorData.message || `请求失败: ${response.status}`);
                    error.status = response.status;
                    error.code = errorData.code || `HTTP_${response.status}`;
                    error.details = errorData.details;
                    throw error;
                }

                return response;
            } finally {
                clearTimeout(timeoutId);
            }
        }

        // baseURL 已经包含 `/api/proxy`，这里不要再拼接 `/proxy`
        const response = await this.request('/ai', requestOptions);
        
        // 处理响应，确保返回正确格式
        // 后端返回格式: {success: true, data: {content: ...}}
        if (response && response.success && response.data) {
            return response.data;
        }
        
        return response;
    }

    /**
     * Fitbit API 调用（通过代理）
     */
    async callFitbit(endpoint, options = {}) {
        return this.request(`/fitbit${endpoint}`, {
            method: options.method || 'GET',
            ...options,
        });
    }

    /**
     * 地理位置 API 调用（通过代理）
     */
    async callGeocoding(address, provider) {
        return this.request('/geocoding', {
            method: 'POST',
            body: JSON.stringify({ address, provider }),
        });
    }

    /**
     * 获取地理编码API并发控制统计
     */
    async getGeocodingStats() {
        return this.request('/geocoding/stats', {
            method: 'GET',
        });
    }
}

// 创建全局单例
window.apiProxy = new APIProxy();

// 如果没有后端代理，提供一个降级方案（使用 CORS 代理）
if (!window.API_PROXY_URL || window.API_PROXY_URL === '/api/proxy') {
    // 检查是否有可用的 CORS 代理服务
    window.apiProxy.fallbackCORSProxy = async function (url, options = {}) {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(proxyUrl, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`CORS代理请求失败: ${response.status}`);
            }

            const data = await response.json();

            if (!data.contents) {
                throw new Error('CORS代理返回数据格式错误');
            }

            return JSON.parse(data.contents);
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    };
}
