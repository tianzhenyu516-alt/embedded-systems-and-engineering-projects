// Fitbit API 配置文件
// 注意：在生产环境中，这些配置应该从环境变量或安全的配置文件中读取

const FITBIT_CONFIG = {
    // Fitbit API 基础URL
    API_BASE_URL: 'https://api.fitbit.com',

    // OAuth2 认证URL
    AUTH_URL: 'https://www.fitbit.com/oauth2/authorize',
    TOKEN_URL: 'https://api.fitbit.com/oauth2/token',

    // 应用配置 - 需要在 Fitbit 开发者控制台注册应用获取
    CLIENT_ID: '23TP6R', // 替换为您的客户端ID
    CLIENT_SECRET: '', // 替换为您的客户端密钥
    // 回调URL - 自动检测项目路径
    get REDIRECT_URI() {
        const configuredUri = window.FITBIT_REDIRECT_URI;
        if (configuredUri && /^https?:\/\//i.test(configuredUri)) {
            return configuredUri;
        }

        const basePath = window.BASE_CONFIG ? window.BASE_CONFIG.basePath : '';
        return `${window.location.origin + basePath}/views/user/dashboard/fitbit-callback.html`;
    },

    // 请求的数据范围
    SCOPES: [
        'activity', // 活动数据
        'heartrate', // 心率数据
        'sleep', // 睡眠数据
        'profile', // 用户资料
        'settings', // 设置
        'location', // 位置数据
        'social', // 社交数据
        'weight', // 体重数据
        'nutrition', // 营养数据
    ],

    // API 端点
    ENDPOINTS: {
        PROFILE: '/1/user/-/profile.json',
        ACTIVITIES: '/1/user/-/activities.json',
        ACTIVITIES_STEPS: '/1/user/-/activities/steps/date/today/1d.json',
        ACTIVITIES_HEART: '/1/user/-/activities/heart/date/today/1d.json',
        SLEEP: '/1.2/user/-/sleep/date/today.json',
        HEARTRATE: '/1/user/-/activities/heart/date/today/1d.json',
        WEIGHT: '/1/user/-/body/log/weight/date/today.json',
        DEVICES: '/1/user/-/devices.json',
    },

    // 数据刷新间隔（毫秒）
    REFRESH_INTERVAL: 5 * 60 * 1000, // 5分钟

    // 本地存储键名
    STORAGE_KEYS: {
        ACCESS_TOKEN: '',
        REFRESH_TOKEN: '',
        TOKEN_EXPIRES: 'fitbit_token_expires',
        USER_ID: 'fitbit_user_id',
    },
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FITBIT_CONFIG;
} else {
    window.FITBIT_CONFIG = FITBIT_CONFIG;
}
