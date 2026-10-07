// 全局 Enter 键提交功能模块
// 版本: 1.0.0
// 功能: 允许用户在完成文本输入后按 Enter 键提交输入内容

const GlobalEnterSubmit = (function () {
    'use strict';

    // 配置选项
    let config = {
        debounceTime: 500,
        excludedInputTypes: [
            'button',
            'checkbox',
            'file',
            'hidden',
            'image',
            'radio',
            'reset',
            'submit',
        ],
        disabledClass: 'disable-enter-submit',
        disabledFormClass: 'disable-enter-submit-form',
    };

    // 提交状态跟踪，防止重复提交
    const submissionState = new WeakMap();

    // 合并用户配置
    function mergeConfig(userConfig) {
        config = { ...config, ...userConfig };
    }

    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 检查元素是否禁用 Enter 键提交
    function isElementDisabled(element) {
        return element.classList.contains(config.disabledClass);
    }

    // 检查表单是否禁用 Enter 键提交
    function isFormDisabled(form) {
        return form && form.classList.contains(config.disabledFormClass);
    }

    // 获取表单的提交按钮
    function getSubmitButton(form) {
        if (!form) {
            return null;
        }
        return form.querySelector('button[type="submit"], input[type="submit"]');
    }

    // 检查输入类型是否应该被排除
    function isExcludedInputType(input) {
        const type = input.type && input.type.toLowerCase();
        return config.excludedInputTypes.includes(type);
    }

    // 检查是否是 Textarea 并且用户按下了 Shift + Enter
    function isShiftEnterInTextarea(event, element) {
        return element.tagName.toLowerCase() === 'textarea' && event.shiftKey;
    }

    // 处理 Enter 键事件
    const handleKeyDown = debounce(event => {
        const element = event.target;

        // 只有在 Enter 键时才处理
        if (event.key !== 'Enter' && event.keyCode !== 13) {
            return;
        }

        // 检查是否是 Shift + Enter 在 Textarea 中（应该换行而不是提交）
        if (isShiftEnterInTextarea(event, element)) {
            return;
        }

        // 检查输入类型是否应该被排除
        if (isExcludedInputType(element)) {
            return;
        }

        // 检查元素或表单是否禁用 Enter 键提交
        if (isElementDisabled(element)) {
            return;
        }

        const form = element.closest('form');
        if (isFormDisabled(form)) {
            return;
        }

        // 检查是否已经在提交中
        if (form && submissionState.get(form)) {
            event.preventDefault();
            return;
        }

        // 阻止默认行为（防止某些浏览器的默认提交）
        event.preventDefault();

        if (form) {
            // 标记表单为正在提交
            submissionState.set(form, true);

            // 触发提交按钮点击或直接提交表单
            const submitBtn = getSubmitButton(form);
            if (submitBtn) {
                submitBtn.click();
            } else {
                form.submit();
            }

            // 一段时间后重置提交状态
            setTimeout(() => {
                submissionState.set(form, false);
            }, config.debounceTime);
        }
    }, 100);

    // 监听全局 keydown 事件
    function init(userConfig = {}) {
        mergeConfig(userConfig);
        document.addEventListener('keydown', handleKeyDown, true);
        console.log('Global Enter Submit initialized with config:', config);
    }

    // 销毁函数，移除事件监听器
    function destroy() {
        document.removeEventListener('keydown', handleKeyDown, true);
        console.log('Global Enter Submit destroyed');
    }

    // 暴露公共 API
    return {
        init,
        destroy,
        config: mergeConfig,
    };
})();

// 暴露到 window 对象，方便全局访问
window.GlobalEnterSubmit = GlobalEnterSubmit;

// 自动初始化（可通过禁用类覆盖）
document.addEventListener('DOMContentLoaded', () => {
    GlobalEnterSubmit.init();
});
