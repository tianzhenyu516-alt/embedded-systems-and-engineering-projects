/**
 * 移动设备触摸滑动优化脚本
 * 确保在移动设备上上下和左右滑动操作正常工作
 */

(function () {
    'use strict';

    console.log('[TouchScrollOptimizer] 触摸滑动优化已加载');

    // 标记当前是否正在滚动
    let isScrolling = false;
    let scrollTimeout = null;

    // 确保触摸事件不被意外阻止
    function ensureTouchEvents() {
        // 监听文档级别的触摸事件，确保它们不会被意外阻止
        document.addEventListener(
            'touchstart',
            e => {
                // 不阻止默认行为，允许正常的触摸交互
            },
            { passive: true },
        );

        document.addEventListener(
            'touchmove',
            e => {
                // 使用 passive: true 以提高滚动性能
            },
            { passive: true },
        );

        document.addEventListener(
            'touchend',
            e => {
                // 不阻止默认行为
            },
            { passive: true },
        );

        // 监听滚动开始和结束
        document.addEventListener(
            'scroll',
            () => {
                isScrolling = true;

                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                }

                scrollTimeout = setTimeout(() => {
                    isScrolling = false;
                }, 150);
            },
            { passive: true },
        );
    }

    // 为特定元素添加滚动优化
    function optimizeScrollableElements() {
        const scrollableElements = document.querySelectorAll(
            '.main-content, .chat-messages, [style*="overflow"]',
        );

        scrollableElements.forEach(el => {
            // 确保元素有正确的触摸行为
            el.style.webkitOverflowScrolling = 'touch';
            el.style.touchAction = 'auto';
        });
    }

    // 检测并修复可能阻止触摸的元素
    function fixTouchBlockingElements() {
        const allElements = document.querySelectorAll('*');

        allElements.forEach(el => {
            const style = window.getComputedStyle(el);

            // 检查是否有可能阻止触摸的样式
            if (style.pointerEvents === 'none') {
                // 除非明确需要，否则不阻止pointer-events
                // 这里我们不自动修改，只记录日志
                console.log('[TouchScrollOptimizer] 检测到 pointer-events: none 元素:', el);
            }

            if (style.touchAction === 'none') {
                console.log('[TouchScrollOptimizer] 检测到 touch-action: none 元素:', el);
                // 恢复为auto
                el.style.touchAction = 'auto';
            }
        });
    }

    // 为移动设备添加视口优化
    function optimizeViewport() {
        // 检查现有viewport meta标签
        let viewportMeta = document.querySelector('meta[name="viewport"]');

        if (!viewportMeta) {
            viewportMeta = document.createElement('meta');
            viewportMeta.name = 'viewport';
            document.head.appendChild(viewportMeta);
        }

        // 设置最佳的viewport配置
        viewportMeta.content
            = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
    }

    // 页面加载完成后初始化
    function init() {
        ensureTouchEvents();
        optimizeScrollableElements();
        optimizeViewport();

        // DOM变化后重新优化
        const observer = new MutationObserver(() => {
            optimizeScrollableElements();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        console.log('[TouchScrollOptimizer] 初始化完成');
    }

    // 页面加载后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 暴露给全局，方便调试
    window.TouchScrollOptimizer = {
        init,
        fixTouchBlockingElements,
        optimizeScrollableElements,
    };
})();
