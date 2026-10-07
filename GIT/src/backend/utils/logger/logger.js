/**
 * 日志工具类
 * 替代 console.log，提供统一的日志管理
 * 生产环境自动禁用调试日志
 */
class Logger {
    constructor() {
        // 判断是否为开发环境
        this.isDevelopment = this.detectDevelopment();

        // 日志级别
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
        };

        // 当前日志级别（生产环境默认 INFO，开发环境默认 DEBUG）
        this.currentLevel = this.isDevelopment ? this.levels.DEBUG : this.levels.INFO;

        // 日志历史（最多保存 100 条）
        this.history = [];
        this.maxHistorySize = 100;
    }

    /**
     * 检测是否为开发环境
     */
    detectDevelopment() {
        // 检查 hostname
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
            return true;
        }

        // 检查是否有调试参数
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true') {
            return true;
        }

        // 检查 localStorage 中的调试标志
        try {
            if (localStorage.getItem('debug') === 'true') {
                return true;
            }
        } catch (e) {
            // localStorage 不可用时忽略
        }

        return false;
    }

    /**
     * 添加日志到历史记录
     */
    addToHistory(level, message, ...args) {
        this.history.push({
            level,
            message,
            args: args.length > 0 ? args : undefined,
            timestamp: new Date().toISOString(),
        });

        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * 格式化日志消息
     */
    formatMessage(level, message) {
        const timestamp = new Date().toLocaleTimeString();
        const levelStr = level.toUpperCase().padEnd(5);
        return `[${timestamp}] [${levelStr}] ${message}`;
    }

    /**
     * 调试日志（仅在开发环境显示）
     */
    debug(message, ...args) {
        if (this.currentLevel <= this.levels.DEBUG) {
            if (this.isDevelopment) {
                console.debug(this.formatMessage('DEBUG', message), ...args);
            }
            this.addToHistory('DEBUG', message, ...args);
        }
    }

    /**
     * 信息日志
     */
    info(message, ...args) {
        if (this.currentLevel <= this.levels.INFO) {
            if (this.isDevelopment) {
                console.info(this.formatMessage('INFO', message), ...args);
            }
            this.addToHistory('INFO', message, ...args);
        }
    }

    /**
     * 警告日志
     */
    warn(message, ...args) {
        if (this.currentLevel <= this.levels.WARN) {
            console.warn(this.formatMessage('WARN', message), ...args);
            this.addToHistory('WARN', message, ...args);
        }
    }

    /**
     * 错误日志
     */
    error(message, ...args) {
        console.error(this.formatMessage('ERROR', message), ...args);
        this.addToHistory('ERROR', message, ...args);

        // 错误日志可以发送到错误追踪服务
        this.reportError(message, args);
    }

    /**
     * 报告错误到追踪服务（可选）
     */
    reportError(message, args) {
        // 生产环境可以将错误发送到错误追踪服务
        // 例如：Sentry, LogRocket 等
        if (!this.isDevelopment) {
            // 实现错误报告逻辑
            // this.sendToErrorService({ message, args, timestamp: new Date() });
        }
    }

    /**
     * 设置日志级别
     */
    setLevel(level) {
        if (typeof level === 'string') {
            level = this.levels[level.toUpperCase()];
        }
        if (level !== undefined) {
            this.currentLevel = level;
        }
    }

    /**
     * 获取日志历史
     */
    getHistory(level = null) {
        if (level) {
            return this.history.filter(log => log.level === level);
        }
        return this.history;
    }

    /**
     * 清空日志历史
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * 导出日志（用于调试）
     */
    exportLogs() {
        return JSON.stringify(this.history, null, 2);
    }

    /**
     * 日志分组（类似 console.group）
     */
    group(label) {
        if (this.isDevelopment) {
            console.group(label);
        }
    }

    /**
     * 结束日志分组
     */
    groupEnd() {
        if (this.isDevelopment) {
            console.groupEnd();
        }
    }

    /**
     * 日志表格（类似 console.table）
     */
    table(data) {
        if (this.isDevelopment) {
            console.table(data);
        }
    }
}

// 创建全局单例
window.logger = new Logger();

// 兼容旧代码：将 console.log 重定向到 logger.debug
const originalConsoleLog = console.log;
console.log = function (...args) {
    if (window.logger) {
        window.logger.debug(...args);
    } else {
        originalConsoleLog.apply(console, args);
    }
};
