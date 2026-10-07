/**
 * 请求工具类
 * 实现统一的API交互，包含请求/响应拦截器、错误处理和缓存策略
 */

const cache = new Map();
const pendingRequests = new Map();
const API_BASE_URL = window.API_BASE_URL || '/api';
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;
const DEFAULT_TIMEOUT = 15000;

function buildFullUrl(url) {
    return url.startsWith('http') ? url : `${API_BASE_URL}${url.replace(/^\/api/, '')}`;
}

function buildCacheKey(url, options = {}) {
    const { headers, body, signal, ...restOptions } = options;
    const normalizedHeaders = headers ? Object.entries(headers).sort(([a], [b]) => a.localeCompare(b)) : [];

    return JSON.stringify({
        url,
        ...restOptions,
        headers: normalizedHeaders,
        body: typeof body === 'string' ? body : body ? '[non-string-body]' : null,
    });
}

function getCachedValue(cacheKey) {
    const cached = cache.get(cacheKey);
    if (!cached) {
        return null;
    }

    if (cached.expiresAt <= Date.now()) {
        cache.delete(cacheKey);
        return null;
    }

    return cached.value;
}

function setCachedValue(cacheKey, value, ttl = DEFAULT_CACHE_TTL) {
    cache.set(cacheKey, {
        value,
        expiresAt: Date.now() + ttl,
    });
}

/**
 * 通用请求函数
 * @param {string} url 请求URL
 * @param {Object} options 请求选项
 * @param {boolean} useCache 是否使用缓存
 * @returns {Promise<any>} 请求结果
 */
export const request = async (url, options = {}, useCache = false) => {
    const fullUrl = buildFullUrl(url);
    const cacheKey = buildCacheKey(fullUrl, options);

    if (useCache) {
        const cachedValue = getCachedValue(cacheKey);
        if (cachedValue !== null) {
            return cachedValue;
        }

        const pendingRequest = pendingRequests.get(cacheKey);
        if (pendingRequest) {
            return pendingRequest;
        }
    }

    const requestPromise = (async () => {
        const interceptedOptions = await requestInterceptor(options);
        const { timeoutId, ...fetchOptions } = interceptedOptions;

        try {
            const response = await fetch(fullUrl, fetchOptions);
            const result = await responseInterceptor(response);

            if (useCache) {
                setCachedValue(cacheKey, result);
            }

            return result;
        } catch (error) {
            handleError(error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
            pendingRequests.delete(cacheKey);
        }
    })();

    if (useCache) {
        pendingRequests.set(cacheKey, requestPromise);
    }

    return requestPromise;
};

/**
 * 请求拦截器
 * @param {Object} options 请求选项
 * @returns {Promise<Object>} 拦截后的请求选项
 */
const requestInterceptor = async options => {
    const controller = new AbortController();
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const loginInfo = sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo');
    let token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

    if (!token && loginInfo) {
        try {
            const parsedLoginInfo = JSON.parse(loginInfo);
            token = parsedLoginInfo?.token || parsedLoginInfo?.authToken || '';
        } catch (error) {
            console.warn('解析 loginInfo 中的 token 失败:', error);
        }
    }
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers = {
        ...options.headers,
    };

    if (!isFormData && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (isFormData && headers['Content-Type']) {
        delete headers['Content-Type'];
    }

    return {
        ...options,
        headers,
        credentials: options.credentials || 'include',
        signal: options.signal || controller.signal,
        timeoutId,
    };
};

/**
 * 响应拦截器
 * @param {Response} response 响应对象
 * @returns {Promise<any>} 处理后的响应数据
 */
const responseInterceptor = async response => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error?.message || `HTTP Error: ${response.status}`);
    }

    return response.json();
};

/**
 * 错误处理
 * @param {Error} error 错误对象
 */
const handleError = error => {
    if (error?.name === 'AbortError') {
        console.error('API请求超时:', error);
        return;
    }

    console.error('API请求错误:', error);
};

/**
 * GET请求
 * @param {string} url 请求URL
 * @param {Object} params 查询参数
 * @param {boolean} useCache 是否使用缓存
 * @returns {Promise<any>} 请求结果
 */
export const get = (url, params = {}, useCache = false) => {
    const queryString = Object.keys(params)
        .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

    const fullUrl = queryString ? `${url}?${queryString}` : url;

    return request(
        fullUrl,
        {
            method: 'GET',
        },
        useCache,
    );
};

/**
 * POST请求
 * @param {string} url 请求URL
 * @param {Object|FormData} data 请求数据
 * @returns {Promise<any>} 请求结果
 */
export const post = (url, data = {}) => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;

    return request(url, {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data),
    });
};

/**
 * PUT请求
 * @param {string} url 请求URL
 * @param {Object|FormData} data 请求数据
 * @returns {Promise<any>} 请求结果
 */
export const put = (url, data = {}) => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;

    return request(url, {
        method: 'PUT',
        body: isFormData ? data : JSON.stringify(data),
    });
};

/**
 * DELETE请求
 * @param {string} url 请求URL
 * @returns {Promise<any>} 请求结果
 */
export const del = url => {
    return request(url, {
        method: 'DELETE',
    });
};

/**
 * 清除缓存
 * @param {string} url 可选，指定要清除的URL缓存
 */
export const clearCache = url => {
    if (!url) {
        cache.clear();
        pendingRequests.clear();
        return;
    }

    const fullUrl = buildFullUrl(url);
    for (const key of cache.keys()) {
        if (key.includes(`"url":"${fullUrl}`)) {
            cache.delete(key);
        }
    }
    for (const key of pendingRequests.keys()) {
        if (key.includes(`"url":"${fullUrl}`)) {
            pendingRequests.delete(key);
        }
    }
};
