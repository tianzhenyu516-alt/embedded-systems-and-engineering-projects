// API 配置
// 统一使用同源 /api，由前端服务代理到后端
(function () {
    window.API_BASE_URL = '/api';

    if (window.console && typeof window.console.log === 'function') {
        window.console.log('API配置 - 使用同源代理:', window.API_BASE_URL);
    }
})();
