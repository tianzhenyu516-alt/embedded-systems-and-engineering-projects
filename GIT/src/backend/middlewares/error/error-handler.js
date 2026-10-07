class ErrorHandler {
    constructor() {
        this.setupGlobalErrorHandling();
        this.errorCount = 0;
        this.maxErrors = 10;
        this.recentErrors = new Map();
        this.errorDedupeWindow = 5000;
    }

    isExtensionError(error) {
        const message = error?.message || String(error) || '';
        const errorPatterns = [
            /runtime\.lastError/i,
            /message port closed/i,
            /Extension context invalidated/i,
            /Receiving end does not exist/i,
            /Could not establish connection/i,
            /chrome-extension:/i,
            /moz-extension:/i,
            /safari-extension:/i,
        ];

        return errorPatterns.some(pattern => pattern.test(message));
    }

    setupGlobalErrorHandling() {
        window.addEventListener('error', event => {
            if (event.target && event.target !== window) {
                console.warn('资源加载错误:', event.target.src || event.target.href);
                return;
            }
            if (this.isExtensionError(event.error || event.message)) {
                return;
            }
            const errorInfo = {
                message: event.message || event.error?.message || '未知错误',
                stack: event.error?.stack,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                type: 'javascript_error',
            };
            console.error('捕获到JavaScript错误:', errorInfo);
            this.handleError(errorInfo);
        });

        window.addEventListener('unhandledrejection', event => {
            if (this.isExtensionError(event.reason)) {
                event.preventDefault();
                return;
            }
            const errorInfo = {
                message: event.reason?.message || String(event.reason) || 'Promise 被拒绝',
                stack: event.reason?.stack,
                type: 'promise_rejection',
                reason: event.reason,
            };
            console.error('捕获到Promise拒绝:', errorInfo);
            this.handleError(errorInfo);
        });
    }

    getErrorKey(error, context) {
        const message = error?.message || String(error) || '未知错误';
        const code = error?.code || '';
        const status = error?.status || '';
        if (
            message.includes('API密钥未配置')
            || message.includes('API密钥无效')
            || code === 'API_KEY_INVALID'
            || status === 400
        ) {
            return `api_key_error:${context}`;
        }
        return `${message}:${code}:${status}:${context}`;
    }

    isDuplicateError(errorKey) {
        const now = Date.now();
        const errorInfo = this.recentErrors.get(errorKey);

        if (!errorInfo) {
            return false;
        }
        if (now - errorInfo.firstTime < this.errorDedupeWindow) {
            errorInfo.count++;
            errorInfo.lastTime = now;
            return true;
        }
        this.recentErrors.delete(errorKey);
        return false;
    }

    recordError(errorKey) {
        const now = Date.now();
        this.recentErrors.set(errorKey, {
            count: 1,
            firstTime: now,
            lastTime: now,
        });
        const cleanupTime = now - this.errorDedupeWindow * 2;
        for (const [key, info] of this.recentErrors.entries()) {
            if (info.lastTime < cleanupTime) {
                this.recentErrors.delete(key);
            }
        }
    }

    handleError(error, context = '') {
        this.errorCount++;
        if (this.errorCount > this.maxErrors) {
            return;
        }
        const errorKey = this.getErrorKey(error, context);
        if (this.isDuplicateError(errorKey)) {
            return;
        }
        this.recordError(errorKey);
        let errorMessage = '未知错误';
        if (error) {
            if (typeof error.message === 'string') {
                errorMessage = error.message;
            } else if (error.message) {
                try {
                    errorMessage = JSON.stringify(error.message);
                } catch (e) {
                    errorMessage = String(error.message);
                }
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                try {
                    errorMessage = JSON.stringify(error);
                } catch (e) {
                    errorMessage = String(error);
                }
            }
        }
        if (errorMessage === '[object Object]' && error) {
            if (error.originalData) {
                try {
                    const msg = error.originalData.error?.message || error.originalData.message;
                    if (msg && typeof msg === 'string') {
                        errorMessage = msg;
                    }
                } catch (e) {
                    // 忽略
                }
            }
            if (errorMessage === '[object Object]') {
                errorMessage = `错误: ${context || '未知错误'}`;
            }
        }
        const errorInfo = {
            message: errorMessage,
            stack: error?.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            type: error?.type || 'unknown',
        };
        const isConfigError
            = errorMessage.includes('API密钥未配置')
            || errorMessage.includes('API密钥无效')
            || error?.code === 'API_KEY_INVALID';
        if (isConfigError) {
            if (window.logger) {
                window.logger.warn('AI服务配置未完成:', errorMessage);
            } else {
                console.warn('AI服务配置未完成:', errorMessage);
            }
        } else {
            if (window.logger) {
                window.logger.error('错误:', errorInfo);
            } else {
                console.error('错误:', errorInfo);
            }
        }
        this.reportToErrorService(errorInfo);
        if (!isConfigError) {
            this.showUserFriendlyError(error);
        }
        if (this.isCriticalError(error)) {
            this.saveErrorToStorage(errorInfo);
        }
    }

    isCriticalError(error) {
        const criticalPatterns = [/network/i, /fetch/i, /timeout/i, /connection/i];

        const message = error.message || '';
        return criticalPatterns.some(pattern => pattern.test(message));
    }

    showUserFriendlyError(error) {
        const errorMessage = this.getErrorMessage(error);
        if (window.DEBUG_MODE || window.logger?.level === 'debug') {
            console.error('错误详情:', {
                message: error.message || error,
                stack: error.stack,
                type: error.type,
                filename: error.filename,
                lineno: error.lineno,
                colno: error.colno,
            });
        }
        if (typeof showModal === 'function') {
            try {
                showModal('错误', errorMessage);
            } catch (modalError) {
                console.error('显示模态框失败:', modalError);
                alert(`错误: ${errorMessage}`);
            }
        } else {
            alert(`错误: ${errorMessage}`);
        }
    }

    getErrorMessage(error) {
        const message = error.message || String(error);
        if (/syntax|parse|unexpected|token/i.test(message)) {
            return `代码错误: ${message}\n\n这可能是页面加载问题，请刷新页面重试。如果问题持续存在，请联系技术支持。`;
        }
        if (/network|fetch|connection|timeout|ECONNREFUSED|Failed to fetch/i.test(message)) {
            return '网络连接失败，请检查您的网络设置后重试';
        }
        if (/api|server|500|502|503|504/i.test(message)) {
            return '服务暂时不可用，请稍后重试';
        }
        if (/balance|payment|余额|quota/i.test(message)) {
            return '服务余额不足，请联系管理员';
        }
        if (/permission|unauthorized|401|403/i.test(message)) {
            return '您没有权限执行此操作';
        }
        if (/config|api.*key|missing/i.test(message)) {
            return '配置错误，请检查设置';
        }
        if (message && message !== '未知错误' && message.length < 200) {
            return `错误: ${message}\n\n如果问题持续存在，请联系技术支持。`;
        }
        return '发生未知错误，请稍后重试。如果问题持续存在，请联系技术支持';
    }

    reportToErrorService(errorInfo) {
        if (window.logger && window.logger.isDevelopment) {
            return;
        }
        try {
        } catch (e) {}
    }

    saveErrorToStorage(errorInfo) {
        try {
            const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');

            errors.push(errorInfo);
            if (errors.length > 50) {
                errors.shift();
            }
            localStorage.setItem('app_errors', JSON.stringify(errors));
        } catch (e) {}
    }

    getStoredErrors() {
        try {
            return JSON.parse(localStorage.getItem('app_errors') || '[]');
        } catch (e) {
            return [];
        }
    }

    clearStoredErrors() {
        try {
            localStorage.removeItem('app_errors');
        } catch (e) {}
    }

    wrapFunction(fn, context = '') {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleError(error, context);
                throw error;
            }
        };
    }
}

window.errorHandler = new ErrorHandler();

window.safeCall = function (fn, context = '') {
    return window.errorHandler.wrapFunction(fn, context);
};
