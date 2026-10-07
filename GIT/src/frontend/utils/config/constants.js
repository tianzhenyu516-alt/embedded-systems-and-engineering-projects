/**
 * 应用常量配置
 * 集中管理应用中使用的常量，避免魔法数字和字符串
 */

/**
 * 存储键名常量
 */
const STORAGE_KEYS = {
    USERS: 'users',
    HOSPITALS: 'hospitals',
    ADMINS: 'admins',
    AUTH_CODES: 'authCodes',
    HEALTH_DATA: 'healthData',
    LOGIN_INFO: 'loginInfo',
    REMEMBERED_USERNAME: 'rememberedUsername',
    ADMIN_TOKEN: '',
    USER_DATA: 'admin_user_data',
    SETTINGS: 'admin_settings',
    ACCOUNTS: 'accounts',
    APP_ERRORS: 'app_errors',
};

/**
 * 用户角色常量
 */
const USER_ROLES = {
    USER: 'user',
    HOSPITAL: 'hospital',
    ADMIN: 'admin',
    SUB_ADMIN: 'sub',
    SUB: 'sub',
    MAIN: 'main',
};

/**
 * 默认配置常量
 */
const DEFAULT_CONFIG = {
    // 分页默认值
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 30,

    // Token 相关
    TOKEN_EXPIRES_IN: 3600 * 24 * 7, // 7天

    // 日志相关
    MAX_HISTORY_SIZE: 100,
    MAX_CHAT_HISTORY: 20,
    MAX_ERROR_COUNT: 10,
    MAX_STORED_ERRORS: 50,

    // 请求相关
    DEFAULT_TIMEOUT: 30000, // 30秒
    RETRY_DELAY: 1000, // 1秒
    MAX_RETRIES: 3,

    // 速率限制
    RATE_LIMIT_REQUESTS: 3,
    RATE_LIMIT_WINDOW: 1000, // 1秒
    MAX_CONCURRENT_REQUESTS: 5,

    // 清理间隔
    CLEANUP_INTERVAL: 10000, // 10秒
};

/**
 * HTTP 状态码常量
 */
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    PAYMENT_REQUIRED: 402,
    NOT_FOUND: 404,
    REQUEST_TIMEOUT: 408,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
};

/**
 * 可重试的 HTTP 状态码
 */
const RETRYABLE_STATUSES = [
    HTTP_STATUS.REQUEST_TIMEOUT,
    HTTP_STATUS.TOO_MANY_REQUESTS,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    HTTP_STATUS.BAD_GATEWAY,
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    HTTP_STATUS.GATEWAY_TIMEOUT,
];

/**
 * 错误消息常量
 */
const ERROR_MESSAGES = {
    NETWORK_ERROR: '网络连接失败，请检查您的网络设置后重试',
    SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试',
    BALANCE_INSUFFICIENT: '服务余额不足，请联系管理员',
    PERMISSION_DENIED: '您没有权限执行此操作',
    CONFIG_ERROR: '配置错误，请检查设置',
    INVALID_INPUT: '输入数据无效',
    UNKNOWN_ERROR: '发生未知错误，请稍后重试。如果问题持续存在，请联系技术支持',

    // API 相关
    API_KEY_INVALID: 'API密钥无效，请检查管理员后台的AI配置',
    API_BALANCE_INSUFFICIENT: 'API余额不足，请充值或切换API服务商',
    API_RATE_LIMIT: 'API请求频率过高，请稍后再试',
    API_NOT_CONFIGURED: '未配置AI API密钥',

    // 用户相关
    USER_NOT_FOUND: '用户不存在',
    USER_ALREADY_EXISTS: '用户名已存在',
    INVALID_CREDENTIALS: '用户名或密码错误',
    PASSWORD_INCORRECT: '当前密码错误',

    // 授权码相关
    AUTH_CODE_INVALID: '授权码无效或已使用',
    AUTH_CODE_PROVINCE_MISMATCH: '授权码省份与医院地址省份不匹配，请检查地址或使用对应省份的授权码',
};

/**
 * 成功消息常量
 */
const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: '登录成功',
    REGISTER_SUCCESS: '注册成功',
    UPDATE_SUCCESS: '更新成功',
    DELETE_SUCCESS: '删除成功',
    SAVE_SUCCESS: '保存成功',
};

/**
 * 导出到全局作用域（用于非模块环境）
 */
if (typeof window !== 'undefined') {
    window.STORAGE_KEYS = STORAGE_KEYS;
    window.USER_ROLES = USER_ROLES;
    window.DEFAULT_CONFIG = DEFAULT_CONFIG;
    window.HTTP_STATUS = HTTP_STATUS;
    window.RETRYABLE_STATUSES = RETRYABLE_STATUSES;
    window.ERROR_MESSAGES = ERROR_MESSAGES;
    window.SUCCESS_MESSAGES = SUCCESS_MESSAGES;
}
