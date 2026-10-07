/**
 * 设备检测工具
 * 自动检测设备类型（手机/平板/电脑）并应用相应的样式和布局
 */

(function () {
    'use strict';

    // 设备类型枚举
    const DeviceType = {
        MOBILE: 'mobile',
        TABLET: 'tablet',
        DESKTOP: 'desktop',
    };

    /**
     * 检测设备类型
     * @returns {string} 设备类型
     */
    function detectDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const width = window.innerWidth || document.documentElement.clientWidth;

        // 移动设备User-Agent检测
        const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
            userAgent,
        );

        // 根据屏幕宽度判断
        if (width <= 480) {
            return DeviceType.MOBILE;
        } else if (width <= 768) {
            return DeviceType.TABLET;
        } else {
            // 如果屏幕宽度大于768但User-Agent是移动设备，可能是横屏的平板
            if (isMobileUA && width <= 1024) {
                return DeviceType.TABLET;
            }
            return DeviceType.DESKTOP;
        }
    }

    /**
     * 检测是否为触摸设备
     * @returns {boolean}
     */
    function isTouchDevice() {
        return (
            'ontouchstart' in window
            || navigator.maxTouchPoints > 0
            || navigator.msMaxTouchPoints > 0
        );
    }

    /**
     * 应用设备相关的类到body
     */
    function applyDeviceClasses() {
        const deviceType = detectDevice();
        const isTouch = isTouchDevice();
        const body = document.body;

        // 移除旧的设备类
        body.classList.remove(
            'device-mobile',
            'device-tablet',
            'device-desktop',
            'touch-device',
            'no-touch',
        );

        // 添加新的设备类
        body.classList.add(`device-${deviceType}`);

        if (isTouch) {
            body.classList.add('touch-device');
        } else {
            body.classList.add('no-touch');
        }

        // 存储设备信息到全局
        window.deviceInfo = {
            type: deviceType,
            isTouch,
            width: window.innerWidth,
            height: window.innerHeight,
            userAgent: navigator.userAgent,
        };

        console.log('设备检测完成:', window.deviceInfo);
    }

    /**
     * 初始化设备检测
     */
    function init() {
        // 立即执行一次
        applyDeviceClasses();

        // 监听窗口大小变化（防抖处理）
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                applyDeviceClasses();
            }, 250);
        });

        // 监听设备方向变化（移动设备）
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                applyDeviceClasses();
            }, 100);
        });
    }

    // DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 导出到全局
    window.DeviceDetector = {
        detect: detectDevice,
        isTouch: isTouchDevice,
        getInfo() {
            return window.deviceInfo || {};
        },
    };
})();
