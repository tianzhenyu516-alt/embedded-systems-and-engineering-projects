/**
 * 页面滚动管理器
 * 处理页面切换时的自动滚动到顶部功能
 * 优化版：在状态恢复时禁用自动滚动到顶部
 */

class PageScrollManager {
    constructor(options = {}) {
        // 默认配置
        this.config = {
            enabled: true,
            smoothScroll: true,
            scrollDuration: 300,
            scrollOffset: 0,
            disabledPages: [],
            disabledScenarios: [],
            waitForContent: true,
            contentWaitTimeout: 2000,
            ...options
        };

        this.isInitialized = false;
        this._init();
    }

    /**
     * 初始化滚动管理器
     * @private
     */
    _init() {
        if (this.isInitialized) return;

        console.log('[PageScrollManager] 初始化页面滚动管理器');

        // 监听页面加载完成事件（适用于 MPA 页面跳转）
        window.addEventListener('load', () => {
            this.handlePageLoad();
        });

        // 监听 DOMContentLoaded 事件
        document.addEventListener('DOMContentLoaded', () => {
            this.handleDOMContentLoaded();
        });

        // 监听浏览器前进/后退按钮
        window.addEventListener('popstate', () => {
            this.handlePopState();
        });

        this.isInitialized = true;
    }

    /**
     * 检查是否处于状态恢复模式
     * @private
     */
    _isInRestoreMode() {
        return typeof window.StatePersistor !== 'undefined' && 
               window.StatePersistor.isInRestoreMode && 
               window.StatePersistor.isInRestoreMode();
    }

    /**
     * 处理页面加载完成事件
     */
    handlePageLoad() {
        console.log('[PageScrollManager] 页面加载完成');
        // 在状态恢复期间禁用自动滚动到顶部
        if (this.config.enabled && !this._isInRestoreMode()) {
            this.scrollToTop();
        } else if (this._isInRestoreMode()) {
            console.log('[PageScrollManager] 处于状态恢复模式，跳过自动滚动到顶部');
        }
    }

    /**
     * 处理 DOM 内容加载完成事件
     */
    handleDOMContentLoaded() {
        console.log('[PageScrollManager] DOM 内容加载完成');
    }

    /**
     * 处理浏览器前进/后退事件
     */
    handlePopState() {
        console.log('[PageScrollManager] 检测到浏览器历史记录变化');
        // 在状态恢复期间禁用自动滚动到顶部
        if (this.config.enabled && !this._isInRestoreMode()) {
            // 对于历史记录导航，我们可以根据需要决定是否滚动
            // 默认情况下，保持浏览器的默认行为
            // 但可以通过配置来启用
        }
    }

    /**
     * 滚动到页面顶部
     * @param {Object} options - 滚动配置选项
     */
    scrollToTop(options = {}) {
        const mergedOptions = {
            smooth: this.config.smoothScroll,
            duration: this.config.scrollDuration,
            offset: this.config.scrollOffset,
            waitForContent: this.config.waitForContent,
            ...options
        };

        // 检查是否需要禁用此操作
        if (this._shouldDisableScroll(options)) {
            console.log('[PageScrollManager] 当前场景禁用滚动到顶部');
            return;
        }

        console.log('[PageScrollManager] 执行滚动到顶部');

        if (mergedOptions.waitForContent) {
            this._waitForContentAndScroll(mergedOptions);
        } else {
            this._performScroll(mergedOptions);
        }
    }

    /**
     * 等待内容加载完成后再滚动
     * @private
     * @param {Object} options - 滚动配置
     */
    _waitForContentAndScroll(options) {
        const startTime = Date.now();
        const timeout = options.timeout || this.config.contentWaitTimeout;

        const checkContentAndScroll = () => {
            const elapsed = Date.now() - startTime;
            
            // 检查主要内容区域是否已加载
            const mainContent = document.querySelector('main, #content, .content') || document.body;
            
            // 简单的内容检测逻辑 - 检查是否有足够的子元素或内容
            const hasContent = mainContent && (
                mainContent.children.length > 0 || 
                mainContent.textContent.trim().length > 0
            );

            if (hasContent || elapsed >= timeout) {
                if (elapsed >= timeout) {
                    console.warn('[PageScrollManager] 内容加载超时，直接执行滚动');
                }
                this._performScroll(options);
            } else {
                // 继续等待
                requestAnimationFrame(checkContentAndScroll);
            }
        };

        checkContentAndScroll();
    }

    /**
     * 执行实际的滚动操作
     * @private
     * @param {Object} options - 滚动配置
     */
    _performScroll(options) {
        const targetY = options.offset || 0;
        const behavior = options.smooth ? 'smooth' : 'auto';

        // 优先使用现代浏览器 API
        if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({
                top: targetY,
                left: 0,
                behavior: behavior
            });
        } else {
            // 兼容性降级 - 使用自定义动画
            this._animateScroll(targetY, options.duration || this.config.scrollDuration);
        }

        console.log('[PageScrollManager] 滚动到顶部完成');
    }

    /**
     * 自定义滚动动画（兼容性方案）
     * @private
     * @param {number} targetY - 目标滚动位置
     * @param {number} duration - 动画持续时间（毫秒）
     */
    _animateScroll(targetY, duration) {
        const startY = window.scrollY || window.pageYOffset;
        const distance = targetY - startY;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用 easeOutQuad 缓动函数
            const easeProgress = this._easeOutQuad(progress);
            
            window.scrollTo(0, startY + distance * easeProgress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * easeOutQuad 缓动函数
     * @private
     * @param {number} t - 进度值 (0-1)
     * @returns {number} 缓动后的进度值
     */
    _easeOutQuad(t) {
        return t * (2 - t);
    }

    /**
     * 检查是否应该禁用滚动
     * @private
     * @param {Object} options - 配置选项
     * @returns {boolean} 是否禁用
     */
    _shouldDisableScroll(options = {}) {
        // 如果全局禁用
        if (!this.config.enabled) {
            return true;
        }

        // 检查是否在禁用页面列表中
        if (options.pageName && this.config.disabledPages.includes(options.pageName)) {
            return true;
        }

        // 检查是否在禁用场景列表中
        if (options.scenario && this.config.disabledScenarios.includes(options.scenario)) {
            return true;
        }

        // 检查单个请求是否禁用
        if (options.disabled) {
            return true;
        }

        return false;
    }

    /**
     * 启用/禁用全局滚动功能
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        console.log(`[PageScrollManager] 全局滚动功能已${enabled ? '启用' : '禁用'}`);
    }

    /**
     * 添加禁用页面
     * @param {string} pageName - 页面名称
     */
    addDisabledPage(pageName) {
        if (!this.config.disabledPages.includes(pageName)) {
            this.config.disabledPages.push(pageName);
            console.log(`[PageScrollManager] 已添加禁用页面: ${pageName}`);
        }
    }

    /**
     * 移除禁用页面
     * @param {string} pageName - 页面名称
     */
    removeDisabledPage(pageName) {
        const index = this.config.disabledPages.indexOf(pageName);
        if (index !== -1) {
            this.config.disabledPages.splice(index, 1);
            console.log(`[PageScrollManager] 已移除禁用页面: ${pageName}`);
        }
    }

    /**
     * 添加禁用场景
     * @param {string} scenario - 场景名称
     */
    addDisabledScenario(scenario) {
        if (!this.config.disabledScenarios.includes(scenario)) {
            this.config.disabledScenarios.push(scenario);
            console.log(`[PageScrollManager] 已添加禁用场景: ${scenario}`);
        }
    }

    /**
     * 移除禁用场景
     * @param {string} scenario - 场景名称
     */
    removeDisabledScenario(scenario) {
        const index = this.config.disabledScenarios.indexOf(scenario);
        if (index !== -1) {
            this.config.disabledScenarios.splice(index, 1);
            console.log(`[PageScrollManager] 已移除禁用场景: ${scenario}`);
        }
    }

    /**
     * 更新配置
     * @param {Object} newConfig - 新的配置对象
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[PageScrollManager] 配置已更新', this.config);
    }

    /**
     * 获取当前配置
     * @returns {Object} 当前配置
     */
    getConfig() {
        return { ...this.config };
    }
}

// 导出到全局对象
window.PageScrollManager = PageScrollManager;

// 创建默认实例
let pageScrollManager;
document.addEventListener('DOMContentLoaded', () => {
    pageScrollManager = new PageScrollManager({
        disabledPages: [],
        disabledScenarios: ['pagination']
    });
    console.log('[PageScrollManager] 默认实例已创建');
});

// 提供便捷的全局访问方法
window.scrollToTop = function(options) {
    if (pageScrollManager) {
        pageScrollManager.scrollToTop(options);
    } else {
        // 如果实例还未创建，直接滚动
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
};

window.getPageScrollManager = function() {
    return pageScrollManager;
};
