/**
 * 性能优化工具
 * 实现图片懒加载和资源预加载策略
 */

/**
 * 图片懒加载
 * @param {string} selector 图片选择器
 */
export const lazyLoadImages = (selector = 'img[data-src]') => {
    const images = document.querySelectorAll(selector);

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => {
        imageObserver.observe(img);
    });
};

/**
 * 资源预加载
 * @param {Array} resources 资源列表
 */
export const preloadResources = (resources = []) => {
    resources.forEach(resource => {
        if (resource.type === 'image') {
            const img = new Image();
            img.src = resource.url;
        } else if (resource.type === 'script') {
            const script = document.createElement('script');
            script.src = resource.url;
            script.defer = true;
            document.head.appendChild(script);
        } else if (resource.type === 'style') {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = resource.url;
            document.head.appendChild(link);
        }
    });
};

/**
 * 防抖函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 等待时间
 * @returns {Function} 防抖后的函数
 */
export const debounce = (func, wait) => {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
};

/**
 * 节流函数
 * @param {Function} func 要执行的函数
 * @param {number} limit 时间限制
 * @returns {Function} 节流后的函数
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function () {
        const context = this;
        const args = arguments;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

/**
 * 检测首屏加载时间
 * @param {Function} callback 回调函数
 */
export const measureFirstPaint = callback => {
    if (window.performance && window.performance.getEntriesByType) {
        const paintMetrics = window.performance.getEntriesByType('paint');
        paintMetrics.forEach(metric => {
            if (metric.name === 'first-paint') {
                callback(metric.startTime);
            }
        });
    }
};

/**
 * 检测DOMContentLoaded时间
 * @param {Function} callback 回调函数
 */
export const measureDOMContentLoaded = callback => {
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const domContentLoadedTime = timing.domContentLoadedEventEnd - timing.navigationStart;
        callback(domContentLoadedTime);
    }
};

/**
 * 检测页面加载完成时间
 * @param {Function} callback 回调函数
 */
export const measureLoadTime = callback => {
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        callback(loadTime);
    }
};
