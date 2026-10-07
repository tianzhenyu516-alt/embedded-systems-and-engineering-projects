/**
 * 基础URL配置
 * 统一管理项目中的路径与 URL 配置，确保在不同环境下都能正确访问
 */

// 获取基础路径
function getBasePath() {
    // 如果设置了全局BASE_PATH，使用它
    if (window.BASE_PATH) {
        return window.BASE_PATH;
    }

    // 根据当前页面路径自动检测
    const path = window.location.pathname;

    // 移除文件名，只保留目录路径
    let basePath = path.substring(0, path.lastIndexOf('/'));

    // 如果路径中包含某个模块目录，提取项目根路径
    const moduleDirs = ['/user/', '/admin/', '/hospital/', '/register/', '/sub-admin/', '/auth/'];
    for (const dir of moduleDirs) {
        const index = path.indexOf(dir);
        if (index !== -1) {
            basePath = path.substring(0, index);
            break;
        }
    }

    // 确保basePath不为空
    if (!basePath || basePath === '/') {
        basePath = '';
    }

    return basePath;
}

// 基础URL配置
const BASE_CONFIG = {
    // 获取项目根路径
    get basePath() {
        return getBasePath();
    },

    // 获取完整的base URL（包含协议和域名）
    get baseURL() {
        return window.location.origin + this.basePath;
    },

    // API基础URL配置
    get apiBaseURL() {
        if (window.API_BASE_URL) {
            return window.API_BASE_URL;
        }

        return '/api';
    },

    // 用户端路径
    user: {
        index: '/views/user/dashboard/index.html',
        login: '/views/auth/login.html',
        fitbitCallback: '/views/user/dashboard/fitbit-callback.html',
    },

    // 医院端路径
    hospital: {
        index: '/views/hospital/hospital.html',
    },

    // 管理员后台路径
    admin: {
        index: '/views/admin/admin.html',
    },

    // 副管理员后台路径
    subAdmin: {
        index: '/views/sub-admin/sub-admin.html',
    },

    // 注册页面路径
    register: {
        user: '/views/auth/register.html',
        hospital: '/views/auth/register.html',
    },

    // 公共资源路径
    common: {
        styles: '/common/styles.css',
        script: '/common/script.js',
        logger: '/common/logger.js',
        errorHandler: '/common/error-handler.js',
        apiProxy: '/common/api-proxy.js',
        aiConfig: '/common/ai-config.js',
        aiService: '/common/ai-service.js',
        fitbitConfig: '/common/fitbit-config.js',
        fitbitAPI: '/common/fitbit-api.js',
        rateLimiter: '/common/rate-limiter.js',
        mapPicker: '/common/map-picker.js',
    },

    // 辅助方法：获取完整URL
    getURL(path) {
        // 如果路径已经是完整URL，直接返回
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
            return path;
        }

        // 如果路径以/开头，使用basePath
        if (path.startsWith('/')) {
            return this.basePath + path;
        }

        // 相对路径，返回相对路径本身（由浏览器处理）
        return path;
    },

    // 辅助方法：获取绝对路径（相对于项目根）
    getAbsolutePath(path) {
        if (path.startsWith('/')) {
            return this.basePath + path;
        }
        return `${this.basePath}/${path}`;
    },

    // 辅助方法：跳转到指定页面
    navigate(path) {
        const url = this.getURL(path);
        window.location.href = url;
    },
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BASE_CONFIG;
} else {
    window.BASE_CONFIG = BASE_CONFIG;
}

// 兼容性：设置全局BASE_PATH（如果不存在）
if (!window.BASE_PATH) {
    window.BASE_PATH = BASE_CONFIG.basePath;
}

/**
 * 全局回车键管理器
 * - data-enter-action="functionName"：调用全局函数
 * - data-enter-target="#selector"：触发对应元素 click
 * - data-enter-submit="true"：提交所在表单
 * - data-enter-context=".selector"：限制 target 查询范围
 * 也支持通过 EnterKeyManager.register({ selector, actionName|triggerSelector|onEnter }) 进行动态注册
 */
(function setupEnterKeyManager() {
    const registry = [];
    const KEY = 'Enter';

    function normalizeAction(action = {}) {
        return {
            actionName: action.actionName || null,
            triggerSelector: action.triggerSelector || null,
            closestSelector: action.closestSelector || null,
            onEnter: typeof action.onEnter === 'function' ? action.onEnter : null,
            submitForm: action.submitForm ?? false,
            preventDefault: action.preventDefault !== false,
            stopPropagation: Boolean(action.stopPropagation),
            allowMultiple: Boolean(action.allowMultiple),
        };
    }

    function resolveDatasetAction(target) {
        if (!target || !target.dataset) {
            return null;
        }

        const { enterAction, enterTarget, enterSubmit, enterContext, enterStop } = target.dataset;
        if (!enterAction && !enterTarget && !enterSubmit) {
            return null;
        }

        return {
            actionName: enterAction || null,
            triggerSelector: enterTarget || null,
            closestSelector: enterContext || null,
            submitForm: enterSubmit === 'true',
            preventDefault: true,
            stopPropagation: enterStop === 'true',
        };
    }

    function clickTrigger(input, config) {
        if (!config.triggerSelector) {
            return false;
        }
        const root = config.closestSelector ? input.closest(config.closestSelector) : document;
        if (!root) {
            return false;
        }
        const trigger = root.querySelector(config.triggerSelector);
        if (trigger && typeof trigger.click === 'function') {
            trigger.click();
            return true;
        }
        return false;
    }

    function callAction(actionName, event) {
        if (!actionName) {
            return false;
        }
        const fn = window[actionName];
        if (typeof fn === 'function') {
            try {
                fn.call(window, event);
                return true;
            } catch (error) {
                console.error(`[EnterKeyManager] 执行 ${actionName} 失败:`, error);
            }
        }
        return false;
    }

    function submitForm(input) {
        if (!input || !input.form) {
            return false;
        }
        if (typeof input.form.requestSubmit === 'function') {
            input.form.requestSubmit();
        } else {
            input.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
        return true;
    }

    function executeAction(config, event, input) {
        if (!config) {
            return false;
        }
        const normalized = normalizeAction(config);

        if (normalized.preventDefault && event) {
            event.preventDefault();
        }
        if (normalized.stopPropagation && event) {
            event.stopPropagation();
        }

        if (normalized.onEnter) {
            normalized.onEnter({ event, input });
            return true;
        }
        if (callAction(normalized.actionName, event)) {
            return true;
        }
        if (clickTrigger(input, normalized)) {
            return true;
        }
        if (normalized.submitForm) {
            return submitForm(input);
        }
        return false;
    }

    function handleKeyDown(event) {
        if (event.key !== KEY || event.isComposing) {
            return;
        }
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        // 先处理data-*声明
        const datasetAction = resolveDatasetAction(target);
        if (datasetAction && executeAction(datasetAction, event, target)) {
            return;
        }

        // 再匹配注册表
        for (const action of registry) {
            if (!action.selector || !target.matches(action.selector)) {
                continue;
            }
            if (executeAction(action, event, target) && !action.allowMultiple) {
                return;
            }
        }
    }

    document.addEventListener('keydown', handleKeyDown, true);

    window.EnterKeyManager = {
        register(action) {
            if (!action || !action.selector) {
                return;
            }
            registry.push(action);
        },
        unregister(selector) {
            if (!selector) {
                return;
            }
            for (let i = registry.length - 1; i >= 0; i--) {
                if (registry[i].selector === selector) {
                    registry.splice(i, 1);
                }
            }
        },
        list() {
            return [...registry];
        },
    };
})();
