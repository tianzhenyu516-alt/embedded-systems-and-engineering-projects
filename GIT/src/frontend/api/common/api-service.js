/**
 * API 服务类
 * 统一封装前端与后端 API 的交互能力，并保留必要的本地初始化兜底逻辑
 */
class APIService {
    constructor() {
        this.useLocalStorage = false;
        this.notificationApiUnavailable = false;

        // 后端服务配置
        this.apiConfig = {
            baseURL: window.API_BASE_URL || '/api',
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        };

        // 初始化本地存储兜底数据
        this.initLocalStorage();

        // 记录初始化信息
        this._log('info', 'API 服务初始化完成，当前默认使用后端接口模式');
    }

    /**
     * 统一的日志记录方法
     * @private
     * @param {string} level - 日志级别: 'debug', 'info', 'warn', 'error'
     * @param {...any} args - 日志参数
     */
    _log(level, ...args) {
        if (window.logger) {
            window.logger[level](...args);
        } else {
            // 降级方案：使用 console
            const consoleMethod = level === 'debug' ? 'log' : level;
            console[consoleMethod](...args);
        }
    }

    /**
     * 初始化本地存储数据结构
     */
    initLocalStorage() {
        // 初始化用户数据存储
        if (!localStorage.getItem('users')) {
            const defaultUsers = [
                {
                    id: 'user_001',
                    username: 'testuser',
                    password: '',
                    email: 'contact@example.invalid',
                    nickname: '测试用户',
                    phone: '00000000000',
                    gender: '男',
                    birthDate: '1990-01-01',
                    province: '北京市',
                    city: '北京市',
                    address: '朝阳区建国路88号',
                    createdAt: new Date().toISOString(),
                },
            ];
            localStorage.setItem('users', JSON.stringify(defaultUsers));
        }

        // 初始化医院数据存储
        if (!localStorage.getItem('hospitals')) {
            const defaultHospitals = [
                {
                    id: 'hospital_001',
                    username: 'hospital1',
                    password: '',
                    name: '北京协和医院',
                    province: '北京市',
                    city: '北京市',
                    address: '东城区帅府园1号',
                    phone: '010-69156114',
                    email: 'contact@example.invalid',
                    level: '三甲',
                    beds: 2000,
                    lat: 39.91,
                    lng: 116.41,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'hospital_002',
                    username: 'hospital2',
                    password: '',
                    name: '上海瑞金医院',
                    province: '上海市',
                    city: '上海市',
                    address: '黄浦区瑞金二路197号',
                    phone: '021-64370045',
                    email: 'contact@example.invalid',
                    level: '三甲',
                    beds: 1800,
                    lat: 31.21,
                    lng: 121.46,
                    createdAt: new Date().toISOString(),
                },
            ];
            localStorage.setItem('hospitals', JSON.stringify(defaultHospitals));
        }

        // 初始化管理员数据存储
        let admins = this._readAdmins();
        if (admins.length === 0) {
            admins = [
                {
                    id: 'admin_001',
                    username: 'admin',
                    password: '',
                    role: 'admin',
                    email: 'contact@example.invalid',
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'subadmin_001',
                    username: 'subadmin',
                    password: '',
                    role: 'sub',
                    province: '北京市',
                    email: 'contact@example.invalid',
                    createdAt: new Date().toISOString(),
                },
            ];
            this._writeAdmins(admins);
        }

        // 初始化授权码存储
        if (!localStorage.getItem('authCodes')) {
            const defaultAuthCodes = [
                { code: 'AUTH123', province: '北京市', used: false },
                { code: 'AUTH456', province: '上海市', used: false },
                { code: 'AUTH789', province: '广东省', used: false },
            ];
            localStorage.setItem('authCodes', JSON.stringify(defaultAuthCodes));
        }

        // 初始化健康数据存储（按用户）
        if (!localStorage.getItem('healthData')) {
            const defaultHealthData = {
                testuser: {},
            };

            // 为测试用户生成最近7天的健康数据
            const today = new Date();
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                defaultHealthData.testuser[dateStr] = {
                    date: dateStr,
                    heartRate: 65 + Math.floor(Math.random() * 20),
                    bloodPressure: `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)}`,
                    steps: 5000 + Math.floor(Math.random() * 8000),
                    sleepHours: 6 + Math.floor(Math.random() * 3),
                    weight: 65 + Math.floor(Math.random() * 10),
                    updatedAt: new Date().toISOString(),
                };
            }

            localStorage.setItem('healthData', JSON.stringify(defaultHealthData));
        }

        // 初始化API监控数据
        if (!localStorage.getItem('apiMonitoring')) {
            const defaultApiMonitoring = {
                services: [
                    {
                        serviceType: 'smart-device',
                        serviceName: '智能设备API',
                        status: 'normal',
                        responseTime: 120,
                        statusCode: 200,
                        lastChecked: new Date().toISOString(),
                        errorMessage: null,
                    },
                    {
                        serviceType: 'ai-settings',
                        serviceName: 'AI设置API',
                        status: 'normal',
                        responseTime: 85,
                        statusCode: 200,
                        lastChecked: new Date().toISOString(),
                        errorMessage: null,
                    },
                    {
                        serviceType: 'geolocation',
                        serviceName: '地理位置API',
                        status: 'normal',
                        responseTime: 200,
                        statusCode: 200,
                        lastChecked: new Date().toISOString(),
                        errorMessage: null,
                    },
                ],
                history: {},
            };

            // 为每个服务生成历史记录
            ['smart-device', 'ai-settings', 'geolocation'].forEach(type => {
                defaultApiMonitoring.history[type] = [];
                for (let i = 0; i < 20; i++) {
                    const checkTime = new Date();
                    checkTime.setMinutes(checkTime.getMinutes() - i * 30);
                    defaultApiMonitoring.history[type].push({
                        status:
                            Math.random() > 0.1
                                ? 'normal'
                                : Math.random() > 0.5
                                    ? 'abnormal'
                                    : 'offline',
                        response_time: 50 + Math.floor(Math.random() * 200),
                        checked_at: checkTime.toISOString(),
                    });
                }
            });

            localStorage.setItem('apiMonitoring', JSON.stringify(defaultApiMonitoring));
        }

        // 初始化预约数据
        if (!localStorage.getItem('appointments')) {
            localStorage.setItem('appointments', JSON.stringify([]));
        }

        // 初始化操作日志
        if (!localStorage.getItem('operationLogs')) {
            localStorage.setItem('operationLogs', JSON.stringify([]));
        }
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    /**
     * 尝试将响应解析为 JSON，兼容代理错误导致的 gzip/deflate 二进制响应
     * @private
     * @param {Response} response
     * @returns {Promise<any>}
     */
    async _parseJsonResponse(response) {
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const contentType = String(response.headers.get('content-type') || '').toLowerCase();

        const tryParseText = text => {
            const normalizedText = String(text || '').trim();
            if (!normalizedText) {
                return null;
            }

            if (/^<!doctype html/i.test(normalizedText) || /^<html[\s>]/i.test(normalizedText)) {
                const htmlError = new Error('服务器返回了 HTML 页面而不是 JSON');
                htmlError.code = 'HTML_RESPONSE';
                throw htmlError;
            }

            if (contentType.includes('text/plain') && !/^[\[{]/.test(normalizedText)) {
                return { message: normalizedText };
            }

            return JSON.parse(normalizedText);
        };

        try {
            const text = new TextDecoder('utf-8').decode(bytes);
            return tryParseText(text);
        } catch (error) {
            if (error?.code === 'HTML_RESPONSE') {
                throw error;
            }
            this._log('warn', '按纯文本解析响应失败，尝试解压后再解析:', error);
        }

        const compressionFormats = [
            {
                name: 'gzip',
                match: value => value[0] === 0x1f && value[1] === 0x8b,
            },
            {
                name: 'deflate',
                match: value => value[0] === 0x78,
            },
        ];

        for (const format of compressionFormats) {
            if (!format.match(bytes)) {
                continue;
            }

            if (typeof DecompressionStream === 'undefined') {
                break;
            }

            try {
                const decompressionStream = new DecompressionStream(format.name);
                const decompressedStream = new Response(
                    new Blob([bytes]).stream().pipeThrough(decompressionStream)
                );
                const decompressedText = await decompressedStream.text();
                const parsed = tryParseText(decompressedText);
                this._log('warn', `检测到异常的 ${format.name} 压缩响应，已自动解压解析`);
                return parsed;
            } catch (error) {
                this._log('warn', `尝试按 ${format.name} 解压响应失败:`, error);
            }
        }

        throw new Error('服务器响应格式错误');
    }

    _handleHospitalProfileFallback(endpoint, method, data) {
        if (!this._isHospitalProfileRequest(endpoint)) {
            return null;
        }

        const normalizedMethod = String(method || 'GET').toUpperCase();
        if (!['GET', 'POST', 'PUT'].includes(normalizedMethod)) {
            return null;
        }

        const loginInfo = JSON.parse(
            sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo') || '{}',
        );
        const username = loginInfo.username
            || loginInfo.user?.username
            || loginInfo.user?.account
            || loginInfo.user?.userId;
        const hospitalId = loginInfo.user?.id || loginInfo.user?.hospitalId;

        if (!username && !hospitalId) {
            return null;
        }

        const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
        const hospitalIndex = hospitals.findIndex(h => (
            (username && (h.username === username || h.account === username))
            || (hospitalId && (h.id === hospitalId || h.hospitalId === hospitalId))
        ));

        if (hospitalIndex === -1) {
            return null;
        }

        if (normalizedMethod === 'GET') {
            return hospitals[hospitalIndex];
        }

        hospitals[hospitalIndex] = {
            ...hospitals[hospitalIndex],
            ...(data || {}),
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('hospitals', JSON.stringify(hospitals));
        return hospitals[hospitalIndex];
    }

    _isNotificationRequest(endpoint = '') {
        return endpoint === '/notifications'
            || endpoint === '/notifications/read-all'
            || /^\/notifications\/[^/]+$/.test(endpoint)
            || /^\/notifications\/[^/]+\/read$/.test(endpoint);
    }

    shouldUseLocalNotificationFallback(endpoint = '') {
        return this.useLocalStorage || (this.notificationApiUnavailable && this._isNotificationRequest(endpoint));
    }

    readUserNotificationsFromStorage() {
        const notifications = JSON.parse(localStorage.getItem('userNotifications') || '{"items": []}');
        if (!Array.isArray(notifications.items)) {
            notifications.items = [];
        }
        return notifications;
    }

    writeUserNotificationsToStorage(notifications) {
        localStorage.setItem('userNotifications', JSON.stringify({
            items: Array.isArray(notifications?.items) ? notifications.items : [],
        }));
    }

    _handleNotificationFallback(endpoint, method, data) {
        if (!this._isNotificationRequest(endpoint)) {
            return null;
        }

        const normalizedMethod = String(method || 'GET').toUpperCase();
        const notifications = this.readUserNotificationsFromStorage();

        if (endpoint === '/notifications' && normalizedMethod === 'GET') {
            const limit = Number(data?.limit || 100);
            return notifications.items.slice(0, limit);
        }

        if (endpoint === '/notifications' && normalizedMethod === 'POST') {
            const newNotification = {
                id: this.generateId(),
                title: data?.title,
                content: data?.content,
                level: data?.level || 'info',
                type: data?.type || 'general',
                appointmentId: data?.appointmentId || null,
                appointmentNumber: data?.appointmentNumber || null,
                isRead: false,
                read: false,
                createdAt: new Date().toISOString(),
            };
            notifications.items.unshift(newNotification);
            this.writeUserNotificationsToStorage(notifications);
            return newNotification;
        }

        if (endpoint === '/notifications/read-all' && normalizedMethod === 'PUT') {
            notifications.items = notifications.items.map(item => ({
                ...item,
                isRead: true,
                read: true,
            }));
            this.writeUserNotificationsToStorage(notifications);
            return { success: true };
        }

        const notificationIdMatch = endpoint.match(/^\/notifications\/([^/]+)$/);
        if (notificationIdMatch && normalizedMethod === 'DELETE') {
            const notificationId = notificationIdMatch[1];
            const initialLength = notifications.items.length;
            notifications.items = notifications.items.filter(item => item.id !== notificationId);
            this.writeUserNotificationsToStorage(notifications);
            return { success: true, alreadyDeleted: notifications.items.length === initialLength };
        }

        const notificationReadMatch = endpoint.match(/^\/notifications\/([^/]+)\/read$/);
        if (notificationReadMatch && normalizedMethod === 'PUT') {
            const notificationId = notificationReadMatch[1];
            notifications.items = notifications.items.map(item => {
                if (item.id === notificationId) {
                    return { ...item, isRead: true, read: true };
                }
                return item;
            });
            this.writeUserNotificationsToStorage(notifications);
            return { success: true };
        }

        return null;
    }

    _isHospitalProfileRequest(endpoint = '') {
        return endpoint === '/hospital/profile'
            || endpoint === '/hospitals/profile'
            || endpoint === '/hospital/account/profile';
    }

    /**
     * 通用的HTTP请求方法
     * @private
     * @param {string} endpoint - API端点
     * @param {string} method - 请求方法: 'GET', 'POST', 'PUT', 'DELETE'
     * @param {object} data - 请求数据
     * @param {object} headers - 额外的请求头
     * @returns {Promise<any>} - 响应数据
     */
    async _request(endpoint, method = 'GET', data = null, headers = {}) {
        let finalUrl = `${this.apiConfig.baseURL}${endpoint}`;

        // 添加查询参数 (GET请求)
        if (data && method === 'GET') {
            const params = new URLSearchParams();
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
                    params.append(key, data[key]);
                }
            });
            const paramsString = params.toString();
            if (paramsString) {
                const separator = finalUrl.includes('?') ? '&' : '?';
                finalUrl = `${finalUrl}${separator}${paramsString}`;
            }
        }

        this._log('debug', '发起请求:', {
            method,
            url: finalUrl,
            data: data ? { ...data, password: '' } : null,
        });

        const controller = new AbortController();
        const timeoutMs = Number(this.apiConfig.timeout) || 15000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // 构建请求配置
        const config = {
            method,
            headers: {
                ...this.apiConfig.headers,
                ...headers,
            },
            credentials: 'include',
            signal: controller.signal,
        };

        // 添加认证token
        const token = this.getToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // 添加请求数据 (POST/PUT请求)
        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        try {
            // 发送请求
            const response = await fetch(finalUrl, config);
            this._log('debug', '收到响应:', {
                status: response.status,
                ok: response.ok,
                url: finalUrl,
            });

            // 处理响应
            if (!response.ok) {
                // 尝试解析错误响应
                let errorData;
                try {
                    errorData = await this._parseJsonResponse(response);
                    this._log('debug', '错误响应数据:', errorData);
                } catch (e) {
                    const isHtmlError = e?.code === 'HTML_RESPONSE';
                    const fallbackMessage = isHtmlError
                        ? (response.status === 404
                            ? '请求的接口不存在，请确认后端服务已更新并重启'
                            : '服务器返回了异常页面，请稍后重试')
                        : response.status >= 500
                            ? '服务器内部错误，请稍后重试；如果刚更新过后端，请先重启后端服务'
                            : response.statusText;
                    errorData = { message: fallbackMessage };
                    this._log(
                        isHtmlError ? 'info' : 'warn',
                        isHtmlError ? '检测到非 JSON 的 HTML 错误页，已使用更友好的默认错误消息' : '解析错误响应失败，使用默认错误',
                    );
                }

                // 处理401错误（未授权）
                if (response.status === 401) {
                    const isLoginRequest = endpoint === '/auth/login';
                    if (!isLoginRequest) {
                        if (window.AuthGuard && typeof window.AuthGuard.handleSessionExpired === 'function') {
                            window.AuthGuard.handleSessionExpired('登录状态已失效，请重新登录');
                        } else {
                            this.logout();
                        }
                        throw new Error('登录已过期，请重新登录');
                    }
                }

                // 构建更友好的错误消息
                let errorMessage = '请求失败';
                if (errorData && errorData.error && errorData.error.message) {
                    errorMessage = errorData.error.message;
                } else if (errorData && errorData.message) {
                    errorMessage = errorData.message;
                } else {
                    errorMessage = `请求失败: ${response.status}`;
                }

                if (response.status === 404 && this._isHospitalProfileRequest(endpoint)) {
                    const fallbackHospital = this._handleHospitalProfileFallback(endpoint, method, data);
                    if (fallbackHospital) {
                        this._log('warn', '医院资料接口不存在，已自动回退到本地存储');
                        return { success: true, data: fallbackHospital, fallback: true };
                    }
                }

                if (response.status === 404 && this._isNotificationRequest(endpoint)) {
                    const fallbackNotificationResult = this._handleNotificationFallback(endpoint, method, data);
                    if (fallbackNotificationResult !== null) {
                        this.notificationApiUnavailable = true;
                        this._log('warn', '通知接口不存在，已自动回退到本地存储');
                        return { success: true, data: fallbackNotificationResult, fallback: true };
                    }
                }

                throw new Error(errorMessage);
            }

            // 解析响应数据
            let responseData;
            try {
                responseData = await this._parseJsonResponse(response);
                this._log('debug', '解析后的响应数据:', responseData);
            } catch (e) {
                this._log('error', '解析响应JSON失败:', e);
                throw new Error('服务器响应格式错误');
            }

            return responseData;
        } catch (error) {
            if (error?.name === 'AbortError') {
                const timeoutError = new Error(`请求超时，请检查后端服务是否正常（>${Math.round(timeoutMs / 1000)}秒）`);
                this._log('error', 'HTTP请求超时:', {
                    url: finalUrl,
                    timeoutMs,
                });
                throw timeoutError;
            }

            this._log('error', 'HTTP请求失败:', error);

            // 对于其他错误（如401, 500等），直接抛出，不要自动降级
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * 检查后端服务是否可用
     * @returns {Promise<boolean>}
     */
    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.apiConfig.baseURL}/health`, {
                method: 'GET',
                headers: { Accept: 'application/json' },
            });
            return response.ok;
        } catch (error) {
            this._log('warn', '后端健康检查失败:', error);
            return false;
        }
    }

    /**
     * 强制重新连接后端服务
     */
    async reconnectBackend() {
        this._log('info', '尝试重新连接后端服务...');
        this.useLocalStorage = true;
        const isHealthy = await this.checkBackendHealth();
        if (isHealthy) {
            this._log('info', '后端服务连接成功！');
            return true;
        } else {
            this._log('warn', '后端服务连接失败，保持本地存储模式');
            return false;
        }
    }

    /**
     * 读取管理员列表，兼容数组和对象两种旧格式
     * @private
     */
    _readAdmins() {
        try {
            const raw = localStorage.getItem('admins');
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed;
            }
            if (parsed && typeof parsed === 'object') {
                return Object.values(parsed).filter(Boolean);
            }
        } catch (error) {
            this._log('warn', '解析管理员数据失败:', error);
        }
        return [];
    }

    /**
     * 保存管理员列表，确保以数组形式落盘
     * @private
     */
    _writeAdmins(admins = []) {
        let normalized = admins;
        if (!Array.isArray(normalized)) {
            if (normalized && typeof normalized === 'object') {
                normalized = Object.values(normalized).filter(Boolean);
            } else {
                normalized = [];
            }
        }
        localStorage.setItem('admins', JSON.stringify(normalized));
    }

    /**
     * 获取当前登录用户标识
     * @returns {string|null}
     */
    getCurrentUserIdentifier() {
        try {
            let loginInfo = sessionStorage.getItem('loginInfo');
            if (!loginInfo) {
                loginInfo = localStorage.getItem('loginInfo');
            }
            if (!loginInfo) {
                return null;
            }
            const info = JSON.parse(loginInfo);
            return info?.user?.id || info?.username || null;
        } catch (e) {
            this._log('error', '获取当前登录用户标识失败:', e);
            return null;
        }
    }

    /**
     * 获取用户通知本地存储键
     * @returns {string|null}
     */
    getUserNotificationsStorageKey() {
        const userIdentifier = this.getCurrentUserIdentifier();
        return userIdentifier ? `userNotifications_${userIdentifier}` : null;
    }

    /**
     * 读取当前用户通知
     * @returns {{items: Array}}
     */
    readUserNotificationsFromStorage() {
        const storageKey = this.getUserNotificationsStorageKey();
        if (!storageKey) {
            return { items: [] };
        }
        return JSON.parse(localStorage.getItem(storageKey) || '{"items": []}');
    }

    /**
     * 保存当前用户通知
     * @param {{items: Array}} notifications
     */
    writeUserNotificationsToStorage(notifications) {
        const storageKey = this.getUserNotificationsStorageKey();
        if (!storageKey) {
            return;
        }
        localStorage.setItem(storageKey, JSON.stringify(notifications));
    }

    /**
     * 获取当前登录角色
     * @returns {string|null}
     */
    getCurrentRole() {
        try {
            let loginInfo = sessionStorage.getItem('loginInfo');
            if (!loginInfo) {
                loginInfo = localStorage.getItem('loginInfo');
            }
            if (!loginInfo) {
                return null;
            }
            const info = JSON.parse(loginInfo);
            return info?.role || info?.user?.role || null;
        } catch (e) {
            this._log('error', '获取当前登录角色失败:', e);
            return null;
        }
    }

    /**
     * 当前账号是否允许访问管理员通知接口
     * @returns {boolean}
     */
    canAccessAdminNotifications() {
        const role = this.getCurrentRole();
        return role === 'admin' || role === 'sub';
    }

    /**
     * 获取Token
     */
    getToken() {
        try {
            let loginInfo = sessionStorage.getItem('loginInfo');
            if (!loginInfo) {
                loginInfo = localStorage.getItem('loginInfo');
            }
            if (loginInfo) {
                const info = JSON.parse(loginInfo);
                return info.token;
            }
        } catch (e) {
            this._log('error', '获取Token失败:', e);
        }
        return null;
    }

    /**
     * 刷新Token（本地存储模式下不需要）
     */
    async refreshToken() {
        return true;
    }

    /**
     * 登出
     */
    logout() {
        sessionStorage.removeItem('loginInfo');
        localStorage.removeItem('loginInfo');
        localStorage.removeItem('rememberedUsername');
    }

    // ==================== 认证相关接口 ====================

    /**
     * 根据用户名识别推荐登录角色
     * @param {string} username
     * @returns {Promise<{matched: boolean, role: string|null, roleName: string|null, username: string}>}
     */
    async getRoleHint(username) {
        const trimmedUsername = String(username || '').trim();
        if (!trimmedUsername) {
            return {
                matched: false,
                role: null,
                roleName: null,
                username: '',
            };
        }

        if (this.useLocalStorage) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            const admins = this._readAdmins();
            const matchedUser = users.find(item => item.username === trimmedUsername);
            if (matchedUser) {
                return { matched: true, role: 'user', roleName: '用户', username: trimmedUsername };
            }
            const matchedHospital = hospitals.find(item => item.username === trimmedUsername);
            if (matchedHospital) {
                return { matched: true, role: 'hospital', roleName: '医院', username: trimmedUsername };
            }
            const matchedAdmin = admins.find(item => item.username === trimmedUsername);
            if (matchedAdmin) {
                return { matched: true, role: 'admin', roleName: '管理员', username: trimmedUsername };
            }
            return { matched: false, role: null, roleName: null, username: trimmedUsername };
        }

        const response = await this._request('/auth/role-hint', 'GET', {
            username: trimmedUsername,
        });
        const responseData = response && response.success && response.data ? response.data : response;

        return {
            matched: !!responseData?.matched,
            role: responseData?.role || null,
            roleName: responseData?.roleName || null,
            username: responseData?.username || trimmedUsername,
        };
    }

    /**
     * 用户登录
     */
    async login(username, password, role, rememberMe = false) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            this._log('debug', '本地登录:', { username, role, rememberMe });

            try {
                // 从本地存储获取用户数据
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
                const admins = this._readAdmins();

                // 兼容 accounts 数据结构（注册页面使用的结构）
                let accountsUsers = [];
                let accountsHospitals = [];
                let accountsAdmins = [];
                try {
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                    accountsUsers = accounts.user || [];
                    accountsHospitals = accounts.hospital || [];
                    accountsAdmins = accounts.admin || [];
                } catch (e) {
                    this._log('warn', '读取 accounts 数据结构失败:', e);
                }

                // 兼容旧的数据结构：检查 localStorage.accounts.admin
                let oldAdmins = [];
                try {
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                    oldAdmins = accounts.admin || [];
                } catch (e) {
                    this._log('warn', '读取旧数据结构失败:', e);
                }

                // 合并所有数据源
                const allUsers = [...users, ...accountsUsers];
                const allHospitals = [...hospitals, ...accountsHospitals];
                const allAdmins = [...admins, ...oldAdmins, ...accountsAdmins];

                let user = null;

                // 根据角色查找用户
                if (role === 'user') {
                    user = allUsers.find(u => u.username === username && u.password === password);
                } else if (role === 'hospital') {
                    user = allHospitals.find(
                        h => h.username === username && h.password === password,
                    );
                } else if (role === 'admin' || role === 'sub') {
                    // 管理员和副管理员都在admins中查找
                    user = allAdmins.find(a => a.username === username && a.password === password);
                }

                if (!user) {
                    throw new Error('用户名或密码错误');
                }

                // 如果是用户角色，尝试从其他数据源中查找更完整的信息（特别是头像）
                if (role === 'user') {
                    // 合并查找，确保获取到完整的用户信息（包括头像）
                    let completeUser = user;
                    
                    // 检查 users 数组是否有更完整的信息
                    const userFromUsers = users.find(u => u.username === username);
                    if (userFromUsers) {
                        completeUser = { ...completeUser, ...userFromUsers };
                    }
                    
                    // 检查 accounts.user 数组是否有更完整的信息
                    const userFromAccounts = accountsUsers.find(u => u.username === username);
                    if (userFromAccounts) {
                        completeUser = { ...completeUser, ...userFromAccounts };
                    }
                    
                    user = completeUser;
                }

                // 生成token（简单实现）
                const token = `local_token_${this.generateId()}`;

                // 确定用户角色（如果是副管理员，role应该是'sub'）
                let userRole = role;
                if (user.role === 'sub' || user.role === 'sub-admin') {
                    userRole = 'sub';
                } else if (user.role === 'admin' || user.role === 'main') {
                    userRole = 'admin';
                }

                const loginInfo = {
                    username: user.username,
                    role: userRole,
                    token,
                    refreshToken: `local_refresh_${this.generateId()}`,
                    expiresIn: 3600 * 24 * 7, // 7天
                    user: {
                        ...user,
                        role: userRole,
                        id: user.id || user.userId || this.generateId(),
                        adminRole: user.role === 'sub' ? 'sub' : 'main', // 用于区分主副管理员
                        province: user.province || null, // 副管理员的省份
                    },
                    loginTime: new Date().toISOString(),
                };

                sessionStorage.setItem('loginInfo', JSON.stringify(loginInfo));

                // 记住用户名
                if (rememberMe) {
                    localStorage.setItem('rememberedUsername', username);
                } else {
                    localStorage.removeItem('rememberedUsername');
                }

                this._log('info', '登录成功:', loginInfo.username, '角色:', userRole);
                return { user: loginInfo.user, token: loginInfo.token };
            } catch (error) {
                this._log('error', '登录失败:', error);
                throw error;
            }
        } else {
            // 使用后端服务模式
            this._log('debug', '后端登录:', { username, role, rememberMe });

            try {
                // 调用后端登录API
                const response = await this._request('/auth/login', 'POST', {
                    username,
                    password,
                    role,
                    rememberMe,
                });

                this._log('debug', '登录API响应:', response);

                // 检查响应数据（支持 {success, data} 格式和直接返回格式）
                let responseData;
                if (response && response.success && response.data) {
                    responseData = response.data;
                } else {
                    responseData = response;
                }

                this._log('debug', '处理后的响应数据:', responseData);

                // 验证响应数据完整性
                if (!responseData || !responseData.user || !responseData.token) {
                    throw new Error('响应数据格式错误，请稍后重试');
                }

                // 确定用户角色
                let userRole = role;
                if (
                    responseData.user
                    && (responseData.user.role === 'sub' || responseData.user.role === 'sub-admin')
                ) {
                    userRole = 'sub';
                } else if (
                    responseData.user
                    && (responseData.user.role === 'admin' || responseData.user.role === 'main')
                ) {
                    userRole = 'admin';
                }

                // 保存登录信息
                const resolvedUserId = responseData.user.id || responseData.user.userId || null;
                if (!resolvedUserId) {
                    throw new Error('登录响应缺少用户标识，请重新登录');
                }

                const loginInfo = {
                    username: responseData.user.username,
                    role: userRole,
                    token: responseData.token,
                    refreshToken: responseData.refreshToken || '',
                    expiresIn: responseData.expiresIn || 3600 * 24 * 7, // 7天
                    user: {
                        ...responseData.user,
                        role: userRole,
                        id: resolvedUserId,
                        adminRole: responseData.user.role === 'sub' ? 'sub' : 'main', // 用于区分主副管理员
                        province: responseData.user.province || null, // 副管理员的省份
                    },
                    loginTime: new Date().toISOString(),
                };

                sessionStorage.setItem('loginInfo', JSON.stringify(loginInfo));

                // 记住用户名
                if (rememberMe) {
                    localStorage.setItem('rememberedUsername', username);
                } else {
                    localStorage.removeItem('rememberedUsername');
                }

                this._log('info', '登录成功:', loginInfo.username, '角色:', userRole);
                return { user: loginInfo.user, token: loginInfo.token };
            } catch (error) {
                this._log('error', '登录失败:', error);
                throw error;
            }
        }
    }

    /**
     * 用户注册
     */
    async registerUser(userData) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            this._log('debug', '本地注册用户:', userData);

            try {
                const users = JSON.parse(localStorage.getItem('users') || '[]');

                // 检查用户名是否已存在
                if (users.find(u => u.username === userData.username)) {
                    throw new Error('用户名已存在');
                }

                // 创建新用户
                const newUser = {
                    id: this.generateId(),
                    username: userData.username,
                    password: userData.password, // 实际应用中应该加密
                    email: userData.email || '',
                    nickname: userData.nickname || userData.username,
                    phone: userData.phone || '',
                    gender: userData.gender || '',
                    birthDate: userData.birthDate || '',
                    province: userData.province || '',
                    city: userData.city || '',
                    address: userData.address || '',
                    createdAt: new Date().toISOString(),
                };

                users.push(newUser);
                localStorage.setItem('users', JSON.stringify(users));

                this._log('info', '用户注册成功:', newUser.username);
                return newUser;
            } catch (error) {
                this._log('error', '注册失败:', error);
                throw error;
            }
        } else {
            // 使用后端服务模式
            this._log('debug', '后端注册用户:', userData);

            try {
                // 调用后端注册API
                const response = await this._request('/auth/register', 'POST', userData);

                // 检查响应数据
                let responseData;
                if (response && response.success && response.data) {
                    responseData = response.data;
                } else if (response && response.user) {
                    responseData = response.user;
                } else {
                    responseData = response;
                }

                if (!responseData) {
                    throw new Error('注册响应数据格式错误');
                }

                this._log('info', '用户注册成功:', responseData.username);
                return responseData;
            } catch (error) {
                this._log('error', '注册失败:', error);
                throw error;
            }
        }
    }

    /**
     * 医院注册
     */
    async registerHospital(hospitalData) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            this._log('debug', '本地注册医院:', hospitalData);

            try {
                const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
                const authCodes = JSON.parse(localStorage.getItem('authCodes') || '[]');

                // 验证授权码
                const authCode = authCodes.find(
                    code => code.code === hospitalData.authCode && !code.used,
                );

                if (!authCode) {
                    throw new Error('授权码无效或已使用');
                }

                // 验证授权码省份与医院地址省份是否匹配
                if (authCode.province && hospitalData.address) {
                    // 从地址中提取省份
                    const addressProvince = this.extractProvinceFromAddress(hospitalData.address);

                    if (addressProvince && addressProvince !== authCode.province) {
                        throw new Error(
                            `授权码省份（${authCode.province}）与医院地址省份（${addressProvince}）不匹配，请检查地址或使用对应省份的授权码`,
                        );
                    }
                }

                // 检查用户名是否已存在
                if (hospitals.find(h => h.username === hospitalData.username)) {
                    throw new Error('用户名已存在');
                }

                // 创建新医院
                const newHospital = {
                    id: this.generateId(),
                    username: hospitalData.username,
                    password: hospitalData.password,
                    name: hospitalData.hospitalName || hospitalData.name || hospitalData.username,
                    province: authCode.province || hospitalData.province || '',
                    city: hospitalData.city || '',
                    address: hospitalData.address || '',
                    phone: hospitalData.phone || '',
                    email: hospitalData.email || '',
                    level: hospitalData.level || '',
                    beds: hospitalData.beds || 0,
                    lat: hospitalData.lat || null,
                    lng: hospitalData.lng || null,
                    authCode: hospitalData.authCode,
                    createdAt: new Date().toISOString(),
                };

                hospitals.push(newHospital);
                localStorage.setItem('hospitals', JSON.stringify(hospitals));

                // 标记授权码为已使用
                authCode.used = true;
                authCode.usedAt = new Date().toISOString();
                authCode.hospitalId = newHospital.id;
                localStorage.setItem('authCodes', JSON.stringify(authCodes));

                this._log('info', '医院注册成功:', newHospital.name);
                return newHospital;
            } catch (error) {
                this._log('error', '注册失败:', error);
                throw error;
            }
        } else {
            // 使用后端服务模式
            this._log('debug', '后端注册医院:', hospitalData);

            try {
                // 调用后端注册API
                const response = await this._request(
                    '/auth/register-hospital',
                    'POST',
                    hospitalData,
                );

                // 检查响应数据
                let responseData;
                if (response && response.success && response.data) {
                    responseData = response.data;
                } else if (response && response.hospital) {
                    responseData = response.hospital;
                } else {
                    responseData = response;
                }

                if (!responseData) {
                    throw new Error('注册响应数据格式错误');
                }

                this._log('info', '医院注册成功:', responseData.name);
                return responseData;
            } catch (error) {
                this._log('error', '注册失败:', error);
                throw error;
            }
        }
    }

    /**
     * 从地址中提取省份
     * @param {string} address - 地址字符串
     * @returns {string|null} 省份完整名称，如果未找到则返回 null
     */
    extractProvinceFromAddress(address) {
        // 使用公共省份工具函数
        if (typeof window !== 'undefined' && window.extractProvinceFromAddress) {
            return window.extractProvinceFromAddress(address);
        }

        // 降级方案：如果省份工具未加载，使用内联实现
        if (!address) {
            return null;
        }

        const PROVINCES = [
            '北京市',
            '天津市',
            '河北省',
            '山西省',
            '内蒙古自治区',
            '辽宁省',
            '吉林省',
            '黑龙江省',
            '上海市',
            '江苏省',
            '浙江省',
            '安徽省',
            '福建省',
            '江西省',
            '山东省',
            '河南省',
            '湖北省',
            '湖南省',
            '广东省',
            '广西壮族自治区',
            '海南省',
            '重庆市',
            '四川省',
            '贵州省',
            '云南省',
            '西藏自治区',
            '陕西省',
            '甘肃省',
            '青海省',
            '宁夏回族自治区',
            '新疆维吾尔自治区',
            '台湾省',
            '香港特别行政区',
            '澳门特别行政区',
        ];

        for (const province of PROVINCES) {
            if (address.includes(province)) {
                return province;
            }
        }

        const provinceShortNames = {
            北京: '北京市',
            天津: '天津市',
            河北: '河北省',
            山西: '山西省',
            内蒙古: '内蒙古自治区',
            辽宁: '辽宁省',
            吉林: '吉林省',
            黑龙江: '黑龙江省',
            上海: '上海市',
            江苏: '江苏省',
            浙江: '浙江省',
            安徽: '安徽省',
            福建: '福建省',
            江西: '江西省',
            山东: '山东省',
            河南: '河南省',
            湖北: '湖北省',
            湖南: '湖南省',
            广东: '广东省',
            广西: '广西壮族自治区',
            海南: '海南省',
            重庆: '重庆市',
            四川: '四川省',
            贵州: '贵州省',
            云南: '云南省',
            西藏: '西藏自治区',
            陕西: '陕西省',
            甘肃: '甘肃省',
            青海: '青海省',
            宁夏: '宁夏回族自治区',
            新疆: '新疆维吾尔自治区',
            台湾: '台湾省',
            香港: '香港特别行政区',
            澳门: '澳门特别行政区',
        };

        for (const [short, full] of Object.entries(provinceShortNames)) {
            if (address.includes(short)) {
                return full;
            }
        }

        return null;
    }

    /**
     * 注销当前医院账号
     */
    async deactivateHospitalAccount() {
        const loginInfo = JSON.parse(
            sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo') || 'null',
        );
        const currentHospital = loginInfo?.user;

        if (!currentHospital) {
            throw new Error('当前登录状态已失效，请重新登录');
        }

        const clearHospitalLoginState = () => {
            sessionStorage.removeItem('loginInfo');
            localStorage.removeItem('loginInfo');
        };

        const removeHospitalFromLocalStorage = () => {
            const currentHospitalId = currentHospital.id || currentHospital.hospitalId || null;
            const currentUsername = currentHospital.username || loginInfo?.username || null;

            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            const filteredHospitals = hospitals.filter(
                item =>
                    item
                    && item.id !== currentHospitalId
                    && item.hospitalId !== currentHospitalId
                    && item.username !== currentUsername,
            );
            localStorage.setItem('hospitals', JSON.stringify(filteredHospitals));

            const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
            accounts.hospital = Array.isArray(accounts.hospital) ? accounts.hospital : [];
            accounts.hospital = accounts.hospital.filter(
                item =>
                    item
                    && item.id !== currentHospitalId
                    && item.hospitalId !== currentHospitalId
                    && item.username !== currentUsername,
            );
            localStorage.setItem('accounts', JSON.stringify(accounts));
        };

        if (this.useLocalStorage) {
            removeHospitalFromLocalStorage();
            clearHospitalLoginState();
            return { success: true };
        }

        try {
            const response = await this._request('/hospitals/me/deactivate', 'POST');
            clearHospitalLoginState();
            return response || { success: true };
        } catch (error) {
            const status = error?.status || error?.response?.status || null;
            const message = String(error?.message || '');
            const endpointUnavailable =
                status === 404
                || status === 405
                || message.includes('404')
                || message.includes('405');

            if (!endpointUnavailable) {
                this._log('error', '注销医院账号失败:', error);
                throw error;
            }

            this._log('warn', '医院注销接口不可用，回退到本地清理逻辑');
            removeHospitalFromLocalStorage();
            clearHospitalLoginState();
            return { success: true, fallback: true };
        }
    }

    /**
     * 登出
     */
    async logoutAPI() {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            this.logout();
        } else {
            // 使用后端服务模式
            try {
                // 调用后端登出API
                await this._request('/auth/logout', 'POST');

                // 清除本地登录信息
                this.logout();
            } catch (error) {
                this._log('error', '登出失败:', error);
                // 即使后端登出失败，也要清除本地登录信息
                this.logout();
            }
        }
    }

    // ==================== 用户管理接口 ====================

    /**
     * 获取用户列表
     */
    async getUsers(params = {}) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            const users = JSON.parse(localStorage.getItem('users') || '[]');

            // 简单的过滤逻辑
            let filtered = users;
            if (params.province) {
                filtered = filtered.filter(u => u.province === params.province);
            }

            return {
                list: filtered,
                total: filtered.length,
                page: params.page || 1,
                pageSize: params.pageSize || 30,
            };
        } else {
            // 使用后端服务模式
            try {
                // 调用后端API
                const response = await this._request('/users', 'GET', params);

                // 检查响应数据
                if (!response) {
                    throw new Error('获取用户列表响应数据格式错误');
                }

                return response;
            } catch (error) {
                this._log('error', '获取用户列表失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取用户信息
     */
    async getUser(userId) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            const admins = this._readAdmins();

            // 尝试在所有类型中查找
            let user = users.find(u => u.id === userId || u.username === userId);
            if (!user) {
                user = hospitals.find(h => h.id === userId || h.username === userId);
            }
            if (!user) {
                user = admins.find(a => a.id === userId || a.username === userId);
            }

            if (!user) {
                throw new Error('用户不存在');
            }

            return user;
        } else {
            // 使用后端服务模式
            try {
                // 调用后端API
                const response = await this._request(`/users/${userId}`, 'GET');

                // 检查响应数据
                if (!response || !response.user) {
                    throw new Error('获取用户信息响应数据格式错误');
                }

                return response.user;
            } catch (error) {
                this._log('error', '获取用户信息失败:', error);
                throw error;
            }
        }
    }

    /**
     * 更新用户信息
     */
    async updateUser(userId, userData) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            const admins = this._readAdmins();

            let userIndex = users.findIndex(u => u.id === userId || u.username === userId);
            let userList = users;

            if (userIndex === -1) {
                userIndex = hospitals.findIndex(h => h.id === userId || h.username === userId);
                userList = hospitals;
                if (userIndex !== -1) {
                    localStorage.setItem('hospitals', JSON.stringify(userList));
                }
            }

            if (userIndex === -1) {
                userIndex = admins.findIndex(a => a.id === userId || a.username === userId);
                userList = admins;
                if (userIndex !== -1) {
                    this._writeAdmins(userList);
                }
            }

            if (userIndex === -1) {
                throw new Error('用户不存在');
            }

            userList[userIndex] = { ...userList[userIndex], ...userData };
            localStorage.setItem('users', JSON.stringify(users));

            return userList[userIndex];
        } else {
            // 使用后端服务模式
            try {
                // 调用后端API
                const response = await this._request(`/users/${userId}`, 'PUT', userData);

                // 检查响应数据
                if (!response || !response.user) {
                    throw new Error('更新用户信息响应数据格式错误');
                }

                return response.user;
            } catch (error) {
                this._log('error', '更新用户信息失败:', error);
                throw error;
            }
        }
    }

    /**
     * 修改密码
     */
    async changePassword(userId, currentPassword, newPassword) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            const admins = this._readAdmins();

            let userIndex = users.findIndex(
                u => (u.id === userId || u.username === userId) && u.password === currentPassword,
            );
            let userList = users;

            if (userIndex === -1) {
                userIndex = hospitals.findIndex(
                    h =>
                        (h.id === userId || h.username === userId) && h.password === currentPassword,
                );
                userList = hospitals;
                if (userIndex !== -1) {
                    localStorage.setItem('hospitals', JSON.stringify(userList));
                }
            }

            if (userIndex === -1) {
                userIndex = admins.findIndex(
                    a =>
                        (a.id === userId || a.username === userId) && a.password === currentPassword,
                );
                userList = admins;
                if (userIndex !== -1) {
                    this._writeAdmins(userList);
                }
            }

            if (userIndex === -1) {
                throw new Error('当前密码错误');
            }

            userList[userIndex].password = newPassword;
            localStorage.setItem('users', JSON.stringify(users));

            return { success: true };
        } else {
            // 使用后端服务模式
            try {
                // 调用后端API
                const response = await this._request('/users/change-password', 'POST', {
                    userId,
                    currentPassword,
                    newPassword,
                });

                // 检查响应数据
                if (!response) {
                    throw new Error('修改密码响应数据格式错误');
                }

                return response;
            } catch (error) {
                this._log('error', '修改密码失败:', error);
                throw error;
            }
        }
    }

    /**
     * 更新用户头像
     */
    async updateUserAvatar(userId, avatarData) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            let updatedUser = null;
            let foundInList = null;
            let foundIndex = -1;
            
            // 1. 检查 users 数组
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            foundIndex = users.findIndex(u => u.id === userId || u.username === userId);
            if (foundIndex !== -1) {
                foundInList = 'users';
                users[foundIndex] = { ...users[foundIndex], avatar: avatarData };
                updatedUser = users[foundIndex];
                localStorage.setItem('users', JSON.stringify(users));
            }
            
            // 2. 检查 hospitals 数组
            if (foundIndex === -1) {
                const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
                foundIndex = hospitals.findIndex(h => h.id === userId || h.username === userId);
                if (foundIndex !== -1) {
                    foundInList = 'hospitals';
                    hospitals[foundIndex] = { ...hospitals[foundIndex], avatar: avatarData };
                    updatedUser = hospitals[foundIndex];
                    localStorage.setItem('hospitals', JSON.stringify(hospitals));
                }
            }
            
            // 3. 检查 admins 数组
            if (foundIndex === -1) {
                const admins = this._readAdmins();
                foundIndex = admins.findIndex(a => a.id === userId || a.username === userId);
                if (foundIndex !== -1) {
                    foundInList = 'admins';
                    admins[foundIndex] = { ...admins[foundIndex], avatar: avatarData };
                    updatedUser = admins[foundIndex];
                    this._writeAdmins(admins);
                }
            }
            
            // 4. 检查 accounts.user 数组（兼容性支持）
            if (foundIndex === -1) {
                try {
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                    const accountsUsers = accounts.user || [];
                    foundIndex = accountsUsers.findIndex(u => u.id === userId || u.username === userId);
                    if (foundIndex !== -1) {
                        foundInList = 'accounts.user';
                        accountsUsers[foundIndex] = { ...accountsUsers[foundIndex], avatar: avatarData };
                        updatedUser = accountsUsers[foundIndex];
                        accounts.user = accountsUsers;
                        localStorage.setItem('accounts', JSON.stringify(accounts));
                    }
                } catch (error) {
                    console.error('检查 accounts.user 失败:', error);
                }
            }
            
            // 5. 如果在任何地方都没找到，抛出错误
            if (foundIndex === -1 || !updatedUser) {
                throw new Error('用户不存在');
            }
            
            return updatedUser;
        } else {
            // 使用后端服务模式
            try {
                // 调用后端API
                const response = await this._request('/users/me/avatar', 'POST', { avatar: avatarData });

                // 检查响应数据
                if (!response) {
                    throw new Error('更新头像响应数据格式错误');
                }

                return response;
            } catch (error) {
                this._log('error', '更新头像失败:', error);
                throw error;
            }
        }
    }

    async getCurrentUserProfile() {
        if (this.useLocalStorage) {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo') || 'null');
            const currentUser = loginInfo?.user;
            if (!currentUser) {
                throw new Error('当前登录状态已失效，请重新登录');
            }

            return {
                success: true,
                data: currentUser,
            };
        }

        try {
            const response = await this._request('/users/me/profile', 'GET');
            if (!response) {
                throw new Error('获取个人信息响应数据格式错误');
            }
            return response;
        } catch (error) {
            this._log('error', '获取个人信息失败:', error);
            throw error;
        }
    }

    async updateCurrentUserProfile(profileData) {
        if (this.useLocalStorage) {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo') || 'null');
            const currentUser = loginInfo?.user;
            if (!currentUser) {
                throw new Error('当前登录状态已失效，请重新登录');
            }

            const updatedUser = {
                ...currentUser,
                ...profileData,
                updatedAt: new Date().toISOString(),
            };

            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex(item => item.id === currentUser.id || item.username === currentUser.username);
            if (userIndex !== -1) {
                users[userIndex] = {
                    ...users[userIndex],
                    ...profileData,
                    updatedAt: updatedUser.updatedAt,
                };
                localStorage.setItem('users', JSON.stringify(users));
            }

            try {
                const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                const accountUsers = Array.isArray(accounts.user) ? accounts.user : [];
                const accountUserIndex = accountUsers.findIndex(item => item.id === currentUser.id || item.username === currentUser.username);
                if (accountUserIndex !== -1) {
                    accountUsers[accountUserIndex] = {
                        ...accountUsers[accountUserIndex],
                        ...profileData,
                        updatedAt: updatedUser.updatedAt,
                    };
                    accounts.user = accountUsers;
                    localStorage.setItem('accounts', JSON.stringify(accounts));
                }
            } catch (error) {
                console.error('更新 accounts.user 失败:', error);
            }

            return {
                success: true,
                data: updatedUser,
                message: '个人信息更新成功',
            };
        }

        try {
            const response = await this._request('/users/me/profile', 'PUT', profileData);
            if (!response) {
                throw new Error('更新个人信息响应数据格式错误');
            }
            return response;
        } catch (error) {
            this._log('error', '更新个人信息失败:', error);
            throw error;
        }
    }

    async deleteCurrentUserAccount() {
        if (this.useLocalStorage) {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo') || 'null');
            const currentUser = loginInfo?.user;
            const currentUserId = currentUser?.id ?? currentUser?.userId ?? null;
            const currentUsername = currentUser?.username || loginInfo?.username || null;

            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const nextUsers = users.filter(item => item && item.id !== currentUserId && item.userId !== currentUserId && item.username !== currentUsername);
            localStorage.setItem('users', JSON.stringify(nextUsers));

            try {
                const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                if (Array.isArray(accounts.user)) {
                    accounts.user = accounts.user.filter(item => item && item.id !== currentUserId && item.userId !== currentUserId && item.username !== currentUsername);
                    localStorage.setItem('accounts', JSON.stringify(accounts));
                }
            } catch (error) {
                console.error('清理 accounts.user 失败:', error);
            }

            return {
                success: true,
                data: {
                    id: currentUserId,
                    username: currentUsername,
                },
                message: '用户账号已注销',
            };
        }

        try {
            const response = await this._request('/users/me/account', 'DELETE');
            if (!response) {
                throw new Error('注销用户账号响应数据格式错误');
            }
            return response;
        } catch (error) {
            this._log('error', '注销用户账号失败:', error);
            throw error;
        }
    }

    /**
     * 验证用户名和邮箱是否匹配（忘记密码第一步）
     */
    async verifyUserForReset(username, email) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            this._log('debug', '验证用户信息用于重置密码:', { username, email });

            try {
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
                const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                const accountsUsers = accounts.user || [];
                const accountsHospitals = accounts.hospital || [];
                const admins = accounts.admin || [];

                // 检查用户和邮箱是否匹配
                let matchedUser = null;

                // 检查 users 数组
                matchedUser = users.find(u => u.username === username && u.email === email);
                if (!matchedUser) {
                    // 检查 accounts.user 数组
                    matchedUser = accountsUsers.find(
                        u => u.username === username && u.email === email,
                    );
                }
                if (!matchedUser) {
                    // 检查 hospitals 数组
                    matchedUser = hospitals.find(h => h.username === username && h.email === email);
                }
                if (!matchedUser) {
                    // 检查 accounts.hospital 数组
                    matchedUser = accountsHospitals.find(
                        h => h.username === username && h.email === email,
                    );
                }
                if (!matchedUser) {
                    // 检查 admins 数组
                    matchedUser = admins.find(a => a.username === username && a.email === email);
                }

                if (!matchedUser) {
                    throw new Error('用户名与邮箱组合不匹配，请检查后重新输入');
                }

                this._log('info', '用户验证成功:', username);
                return { success: true, username: matchedUser.username };
            } catch (error) {
                this._log('error', '验证用户失败:', error);
                throw error;
            }
        } else {
            // 使用后端服务模式
            try {
                const response = await this._request('/auth/verify-reset', 'POST', {
                    username,
                    email,
                });

                if (!response) {
                    throw new Error('验证响应数据格式错误');
                }

                return response;
            } catch (error) {
                this._log('error', '验证用户失败:', error);
                throw error;
            }
        }
    }

    /**
     * 重置密码（忘记密码第二步）
     */
    async resetPassword(username, newPassword) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            this._log('debug', '重置密码:', { username });

            try {
                let updated = false;

                // 更新 users 数组
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const userIndex = users.findIndex(u => u.username === username);
                if (userIndex !== -1) {
                    users[userIndex].password = newPassword;
                    localStorage.setItem('users', JSON.stringify(users));
                    updated = true;
                }

                // 更新 accounts.user 数组
                if (!updated) {
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                    const accountsUsers = accounts.user || [];
                    const accountsUserIndex = accountsUsers.findIndex(u => u.username === username);
                    if (accountsUserIndex !== -1) {
                        accountsUsers[accountsUserIndex].password = newPassword;
                        accounts.user = accountsUsers;
                        localStorage.setItem('accounts', JSON.stringify(accounts));
                        updated = true;
                    }
                }

                // 更新 hospitals 数组
                if (!updated) {
                    const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
                    const hospitalIndex = hospitals.findIndex(h => h.username === username);
                    if (hospitalIndex !== -1) {
                        hospitals[hospitalIndex].password = newPassword;
                        localStorage.setItem('hospitals', JSON.stringify(hospitals));
                        updated = true;
                    }
                }

                // 更新 accounts.hospital 数组
                if (!updated) {
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                    const accountsHospitals = accounts.hospital || [];
                    const accountsHospitalIndex = accountsHospitals.findIndex(
                        h => h.username === username,
                    );
                    if (accountsHospitalIndex !== -1) {
                        accountsHospitals[accountsHospitalIndex].password = newPassword;
                        accounts.hospital = accountsHospitals;
                        localStorage.setItem('accounts', JSON.stringify(accounts));
                        updated = true;
                    }
                }

                // 更新 admins 数组
                if (!updated) {
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                    const admins = accounts.admin || [];
                    const adminIndex = admins.findIndex(a => a.username === username);
                    if (adminIndex !== -1) {
                        admins[adminIndex].password = newPassword;
                        accounts.admin = admins;
                        localStorage.setItem('accounts', JSON.stringify(accounts));
                        updated = true;
                    }
                }

                if (!updated) {
                    throw new Error('用户不存在，无法重置密码');
                }

                this._log('info', '密码重置成功:', username);
                return { success: true };
            } catch (error) {
                this._log('error', '重置密码失败:', error);
                throw error;
            }
        } else {
            // 使用后端服务模式
            try {
                const response = await this._request('/auth/reset-password', 'POST', {
                    username,
                    newPassword,
                });

                if (!response) {
                    throw new Error('重置密码响应数据格式错误');
                }

                return response;
            } catch (error) {
                this._log('error', '重置密码失败:', error);
                throw error;
            }
        }
    }

    // ==================== 健康数据接口 ====================

    /**
     * 获取健康数据
     */
    async getHealthData(date = null) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
            const username = loginInfo.username;

            if (!username) {
                return null;
            }

            const healthDataAll = JSON.parse(localStorage.getItem('healthData') || '{}');
            const userHealthData = healthDataAll[username] || {};

            if (!date) {
                date = new Date().toISOString().split('T')[0];
            }

            return userHealthData[date] || null;
        } else {
            // 使用后端服务模式
            try {
                // 调用后端API
                const params = date ? { date } : {};
                const response = await this._request('/health/data', 'GET', params);

                return response.data || response || null;
            } catch (error) {
                this._log('error', '获取健康数据失败:', error);
                throw error;
            }
        }
    }

    /**
     * 保存健康数据
     */
    async saveHealthData(healthData) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
            const username = loginInfo.username;

            if (!username) {
                throw new Error('未登录');
            }

            const healthDataAll = JSON.parse(localStorage.getItem('healthData') || '{}');
            if (!healthDataAll[username]) {
                healthDataAll[username] = {};
            }

            const date = healthData.date || new Date().toISOString().split('T')[0];
            healthDataAll[username][date] = {
                ...healthDataAll[username][date],
                ...healthData,
                date,
                updatedAt: new Date().toISOString(),
            };

            localStorage.setItem('healthData', JSON.stringify(healthDataAll));
            return healthDataAll[username][date];
        } else {
            // 使用后端服务模式
            try {
                // 调用后端API
                const response = await this._request('/health/data', 'POST', healthData);

                return response.data || response || null;
            } catch (error) {
                this._log('error', '保存健康数据失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取健康历史记录
     */
    async getHealthHistory(params = {}) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
            const username = loginInfo.username;

            if (!username) {
                return { list: [], days: 7, total: 0 };
            }

            const healthDataAll = JSON.parse(localStorage.getItem('healthData') || '{}');
            const userHealthData = healthDataAll[username] || {};

            let days = params.days || 7;
            let startStr = params.startDate;
            let endStr = params.endDate;

            const today = new Date();
            if (!startStr && !endStr) {
                const start = new Date();
                start.setDate(today.getDate() - parseInt(days, 10));
                startStr = start.toISOString().split('T')[0];
                endStr = today.toISOString().split('T')[0];
            } else if (!endStr) {
                endStr = today.toISOString().split('T')[0];
            } else if (!startStr) {
                startStr = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
            }

            const list = Object.keys(userHealthData)
                .filter(date => date >= startStr && date <= endStr)
                .sort((a, b) => b.localeCompare(a))
                .map(date => ({
                    id: `health_${date}`,
                    userId: username,
                    date,
                    ...userHealthData[date],
                }));

            return { list, days, total: list.length };
        } else {
            // 使用后端服务模式
            try {
                // 调用后端API
                const response = await this._request('/health/history', 'GET', params);

                return response.data || response || { list: [], days: 7, total: 0 };
            } catch (error) {
                this._log('error', '获取健康历史记录失败:', error);
                throw error;
            }
        }
    }

    async migrateLegacyHealthData() {
        if (this.useLocalStorage) {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
            const username = loginInfo.username;

            if (!username) {
                return { updatedCount: 0 };
            }

            const healthDataAll = JSON.parse(localStorage.getItem('healthData') || '{}');
            const userHealthData = healthDataAll[username] || {};
            let updatedCount = 0;

            Object.keys(userHealthData).forEach(date => {
                const record = userHealthData[date];
                if (!record || record.steps == null) {
                    return;
                }

                const numericSteps = Number(record.steps);
                if (!Number.isFinite(numericSteps) || numericSteps <= 720) {
                    return;
                }

                record.steps = Math.max(1, Math.round(numericSteps / 100));
                record.legacyStepsMigrated = true;
                record.legacyStepsOriginalValue = numericSteps;
                record.updatedAt = new Date().toISOString();
                updatedCount++;
            });

            localStorage.setItem('healthData', JSON.stringify(healthDataAll));
            return { updatedCount };
        }

        const response = await this._request('/health/migrate-legacy-steps', 'POST');
        return response.data || response || { updatedCount: 0 };
    }

    /**
     * 获取健康统计
     */
    async getHealthStats(params = {}) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
            const username = loginInfo.username;

            if (!username) {
                return {};
            }

            const healthDataAll = JSON.parse(localStorage.getItem('healthData') || '{}');
            const userHealthData = healthDataAll[username] || {};

            const period = params.period || 'week';
            let startDateStr = params.startDate;
            let endDateStr = params.endDate;

            const today = new Date();
            if (!startDateStr && !endDateStr) {
                const startDate = new Date();
                if (period === 'week') {
                    startDate.setDate(today.getDate() - 7);
                } else if (period === 'month') {
                    startDate.setMonth(today.getMonth() - 1);
                } else if (period === 'quarter') {
                    startDate.setMonth(today.getMonth() - 3);
                } else if (period === 'year') {
                    startDate.setFullYear(today.getFullYear() - 1);
                }
                startDateStr = startDate.toISOString().split('T')[0];
                endDateStr = today.toISOString().split('T')[0];
            } else if (!endDateStr) {
                endDateStr = today.toISOString().split('T')[0];
            } else if (!startDateStr) {
                startDateStr = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
            }

            const filtered = Object.keys(userHealthData)
                .filter(date => date >= startDateStr && date <= endDateStr)
                .map(date => userHealthData[date]);

            const count = filtered.length;
            const heartRates = filtered.map(d => d.heartRate).filter(Boolean);
            const steps = filtered.map(d => d.steps).filter(Boolean);
            const sleepHours = filtered.map(d => d.sleepHours).filter(Boolean);
            const weights = filtered.map(d => d.weight).filter(Boolean);

            return {
                period,
                startDate: startDateStr,
                endDate: endDateStr,
                count,
                heartRate: {
                    avg: heartRates.length ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length : 0,
                    min: heartRates.length ? Math.min(...heartRates) : 0,
                    max: heartRates.length ? Math.max(...heartRates) : 0,
                    latest: heartRates.length ? heartRates[heartRates.length - 1] : 0,
                },
                steps: {
                    avg: steps.length ? steps.reduce((a, b) => a + b, 0) / steps.length : 0,
                    min: steps.length ? Math.min(...steps) : 0,
                    max: steps.length ? Math.max(...steps) : 0,
                    total: steps.reduce((a, b) => a + b, 0),
                    latest: steps.length ? steps[steps.length - 1] : 0,
                },
                sleepHours: {
                    avg: sleepHours.length ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : 0,
                    min: sleepHours.length ? Math.min(...sleepHours) : 0,
                    max: sleepHours.length ? Math.max(...sleepHours) : 0,
                    latest: sleepHours.length ? sleepHours[sleepHours.length - 1] : 0,
                },
                weight: {
                    avg: weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0,
                    min: weights.length ? Math.min(...weights) : 0,
                    max: weights.length ? Math.max(...weights) : 0,
                    latest: weights.length ? weights[weights.length - 1] : 0,
                    change: weights.length > 1 ? weights[weights.length - 1] - weights[0] : 0,
                },
            };
        } else {
            // 使用后端服务模式
            try {
                // 调用后端API
                const response = await this._request('/health/stats', 'GET', params);

                return response.data || response || {};
            } catch (error) {
                this._log('error', '获取健康统计失败:', error);
                throw error;
            }
        }
    }

    async createAppointment(payload) {
        try {
            const response = await this._request('/appointments', 'POST', payload);
            return response.data || response;
        } catch (error) {
            this._log('error', '创建预约失败:', error);
            throw error;
        }
    }

    async getMyAppointments(params = {}) {
        try {
            const response = await this._request('/appointments/my', 'GET', params);
            return response.data || response;
        } catch (error) {
            this._log('error', '获取我的预约失败:', error);
            throw error;
        }
    }

    async getHospitalAppointments(days = 30) {
        try {
            const response = await this._request('/appointments/hospital', 'GET', { days });
            const payload = response.data || response;
            return payload.appointments || payload.list || [];
        } catch (error) {
            this._log('error', '获取医院预约失败:', error);
            throw error;
        }
    }

    async updateAppointmentStatus(appointmentId, status, reason = null, notifyUser = true) {
        try {
            const response = await this._request(
                `/appointments/${appointmentId}/status`,
                'PUT',
                { status, reason, notifyUser },
            );
            return response.data || response;
        } catch (error) {
            this._log('error', '更新预约状态失败:', error);
            throw error;
        }
    }

    async deleteAppointment(appointmentId) {
        try {
            const response = await this._request(`/appointments/${appointmentId}`, 'DELETE');
            return response || null;
        } catch (error) {
            this._log('error', '删除预约失败:', error);
            throw error;
        }
    }

    async rescheduleAppointment(appointmentId, appointmentTime) {
        try {
            const response = await this._request(`/appointments/${appointmentId}`, 'PUT', {
                appointmentTime,
            });
            return response.data || response;
        } catch (error) {
            this._log('error', '改签预约失败:', error);
            throw error;
        }
    }

    async updateAppointmentReminder(appointmentId, reminderMinutes) {
        try {
            const response = await this._request(`/appointments/${appointmentId}/reminder`, 'PUT', {
                reminderMinutes,
            });
            return response.data || response;
        } catch (error) {
            this._log('error', '保存预约提醒失败:', error);
            throw error;
        }
    }

    async createOperationLog(logData) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            this._log('debug', '本地创建操作日志:', logData);

            try {
                const logs = JSON.parse(localStorage.getItem('operationLogs') || '[]');

                const newLog = {
                    id: this.generateId(),
                    ...logData,
                    timestamp: new Date().toISOString(),
                };

                logs.push(newLog);
                localStorage.setItem('operationLogs', JSON.stringify(logs));

                this._log('info', '操作日志创建成功:', newLog.id);
                return newLog;
            } catch (error) {
                this._log('error', '创建操作日志失败:', error);
                return null;
            }
        } else {
            try {
                const response = await this._request('/logs/operation', 'POST', logData);
                return response || null;
            } catch (error) {
                this._log('error', '创建操作日志失败:', error);
                throw error;
            }
        }
    }

    async getMyOperationLogs() {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            this._log('debug', '本地获取我的操作日志');

            try {
                const logs = JSON.parse(localStorage.getItem('operationLogs') || '[]');
                const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
                const username = loginInfo.username;

                if (!username) {
                    return [];
                }

                // 简单过滤，实际应用中可能需要更复杂的逻辑
                const myLogs = logs.filter(
                    log => log.username === username || log.user === username,
                );

                return myLogs;
            } catch (error) {
                this._log('error', '获取我的操作日志失败:', error);
                return [];
            }
        } else {
            try {
                const response = await this._request('/logs/operation/my', 'GET');
                return response || [];
            } catch (error) {
                this._log('error', '获取我的操作日志失败:', error);
                throw error;
            }
        }
    }

    // ==================== Fitbit集成接口 ====================
    // 这些功能在没有后端的情况下无法实现，返回空数据或错误

    async connectFitbit(code, state = null) {
        this._log('warn', 'Fitbit连接需要后端支持');
        return { connected: false, message: 'Fitbit连接需要后端支持' };
    }

    async disconnectFitbit() {
        return { success: true };
    }

    async getFitbitStatus() {
        return { connected: false };
    }

    async syncFitbitData(date = null) {
        this._log('warn', 'Fitbit数据同步需要后端支持');
        return { success: false, message: 'Fitbit数据同步需要后端支持' };
    }

    // ==================== API代理服务接口 ====================
    // 地理编码等功能需要使用前端直接调用第三方API，不支持后端代理

    async callAI(messages, provider = 'openai', options = {}) {
        this._log('warn', 'AI服务代理需要后端支持');
        return null;
    }

    async callFitbitAPI(endpoint, method = 'GET', options = {}) {
        this._log('warn', 'Fitbit API代理需要后端支持');
        return null;
    }

    async geocode(address, apiKey = null, provider = 'amap') {
        // 无后端支持，返回null以便调用方使用降级方案
        this._log('warn', '地理编码代理需要后端支持，将使用前端直接调用');
        return null;
    }

    async amapGeocode(address, key = null) {
        return null;
    }

    async amapRegeocode(location, key = null) {
        this._log('warn', '高德地图逆地理编码需要后端支持');
        return null;
    }

    async baiduGeocode(address, apiKey = null) {
        return null;
    }

    async tencentGeocode(address, apiKey = null) {
        return null;
    }

    async updateMyHospital(hospitalData) {
        if (this.useLocalStorage) {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
            const username = loginInfo.username || loginInfo.user?.username;
            if (!username) {
                throw new Error('未登录');
            }

            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            const hospitalIndex = hospitals.findIndex(
                h => h.username === username || h.id === loginInfo.user?.id,
            );

            if (hospitalIndex === -1) {
                throw new Error('医院不存在');
            }

            hospitals[hospitalIndex] = {
                ...hospitals[hospitalIndex],
                ...hospitalData,
                updatedAt: new Date().toISOString(),
            };
            localStorage.setItem('hospitals', JSON.stringify(hospitals));

            return hospitals[hospitalIndex];
        } else {
            try {
                const response = await this._request('/hospital/account/profile', 'PUT', hospitalData);
                return response.data || response;
            } catch (error) {
                this._log('error', '更新医院信息失败:', error);
                throw error;
            }
        }
    }

    async getMyHospital() {
        if (this.useLocalStorage) {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
            const username = loginInfo.username || loginInfo.user?.username;
            if (!username) {
                throw new Error('未登录');
            }

            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            const hospital = hospitals.find(h => h.username === username || h.id === loginInfo.user?.id);
            if (!hospital) {
                throw new Error('医院不存在');
            }
            return hospital;
        } else {
            try {
                const response = await this._request('/hospital/account/profile', 'GET');
                return response.data || response;
            } catch (error) {
                this._log('error', '获取我的医院信息失败:', error);
                throw error;
            }
        }
    }

    async deactivateHospitalAccount() {
        return this.deleteMyHospitalAccount();
    }

    async deleteMyHospitalAccount() {
        if (this.useLocalStorage) {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo') || 'null');
            const currentHospital = loginInfo?.user || null;
            const currentHospitalId = currentHospital?.id ?? currentHospital?.hospitalId ?? null;
            const currentUsername = currentHospital?.username || loginInfo?.username || null;

            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            const nextHospitals = hospitals.filter(item => item && item.id !== currentHospitalId && item.hospitalId !== currentHospitalId && item.username !== currentUsername);
            localStorage.setItem('hospitals', JSON.stringify(nextHospitals));

            try {
                const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                if (Array.isArray(accounts.hospital)) {
                    accounts.hospital = accounts.hospital.filter(item => item && item.id !== currentHospitalId && item.hospitalId !== currentHospitalId && item.username !== currentUsername);
                    localStorage.setItem('accounts', JSON.stringify(accounts));
                }
            } catch (error) {
                console.error('清理 accounts.hospital 失败:', error);
            }

            if (currentUsername) {
                localStorage.removeItem(`hospitalConfig_${currentUsername}`);
                try {
                    const legacyConfig = JSON.parse(localStorage.getItem('hospitalConfig') || '{}');
                    if (legacyConfig && typeof legacyConfig === 'object') {
                        delete legacyConfig[`hospital_${currentUsername}`];
                        localStorage.setItem('hospitalConfig', JSON.stringify(legacyConfig));
                    }
                } catch (error) {
                    console.error('清理 hospitalConfig 失败:', error);
                }
            }

            return {
                success: true,
                data: {
                    id: currentHospitalId,
                    username: currentUsername,
                },
                message: '医院账号已注销',
            };
        }

        try {
            const response = await this._request('/hospital/account/profile', 'DELETE');
            if (!response) {
                throw new Error('注销医院账号响应数据格式错误');
            }
            return response.data || response;
        } catch (error) {
            this._log('error', '注销医院账号失败:', error);
            throw error;
        }
    }

    // ==================== 管理员接口 ====================

    /**
     * 获取用户列表（管理员）
     */
    async getAdminUsers(params = {}) {
        if (this.useLocalStorage) {
            return this.getUsers(params);
        } else {
            try {
                const response = await this._request('/admin/users', 'GET', params);
                return response.data || response || { list: [], total: 0, page: 1, pageSize: 30 };
            } catch (error) {
                this._log('error', '获取管理员用户列表失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取用户列表（兼容方法）
     */
    async getUserList(province = null) {
        return this.getUsers({ province });
    }

    /**
     * 删除用户（管理员）
     */
    async deleteAdminUser(userId) {
        if (this.useLocalStorage) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const filtered = users.filter(u => u.id !== userId && u.username !== userId);
            localStorage.setItem('users', JSON.stringify(filtered));
            return { success: true };
        } else {
            try {
                const response = await this._request(`/admin/users/${userId}`, 'DELETE');
                return response || { success: true };
            } catch (error) {
                this._log('error', '删除用户失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取医院列表（管理员）
     */
    async getAdminHospitals(params = {}) {
        if (this.useLocalStorage) {
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');

            let filtered = hospitals;
            if (params.province) {
                filtered = filtered.filter(h => h.province === params.province);
            }

            return {
                list: filtered,
                total: filtered.length,
                page: params.page || 1,
                pageSize: params.pageSize || 30,
            };
        } else {
            try {
                const response = await this._request('/admin/hospitals', 'GET', params);
                return response.data || response || { list: [], total: 0, page: 1, pageSize: 30 };
            } catch (error) {
                this._log('error', '获取医院列表失败:', error);
                throw error;
            }
        }
    }

    /**
     * 删除医院（管理员）
     */
    async deleteAdminHospital(hospitalId) {
        if (this.useLocalStorage) {
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            const filtered = hospitals.filter(
                h => h.id !== hospitalId && h.username !== hospitalId,
            );
            localStorage.setItem('hospitals', JSON.stringify(filtered));
            return { success: true };
        } else {
            try {
                const response = await this._request(`/admin/hospitals/${hospitalId}`, 'DELETE');
                return response || { success: true };
            } catch (error) {
                this._log('error', '删除医院失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取管理员列表
     */
    async getAdminAdmins(params = {}) {
        if (this.useLocalStorage) {
            let admins = this._readAdmins();
            // 简单过滤逻辑
            if (params.role) {
                admins = admins.filter(a => a.role === params.role || 
                    (params.role === 'sub' && a.role === 'sub'));
            }
            return { list: admins, total: admins.length };
        } else {
            try {
                const response = await this._request('/admin/admins', 'GET', params);
                // 处理后端返回的嵌套格式 { success: true, data: { list: [...], ... } }
                if (response && response.success && response.data) {
                    return response.data;
                }
                return response || { list: [], total: 0 };
            } catch (error) {
                this._log('error', '获取管理员列表失败:', error);
                throw error;
            }
        }
    }

    /**
     * 创建管理员
     */
    async createAdmin(adminData) {
        if (this.useLocalStorage) {
            const admins = this._readAdmins();

            // 检查用户名是否已存在
            if (admins.find(a => a.username === adminData.username)) {
                throw new Error('管理员用户名已存在');
            }

            const newAdmin = {
                id: this.generateId(),
                username: adminData.username,
                password: adminData.password,
                role: adminData.role || 'admin',
                province: adminData.province || null,
                permissions: adminData.permissions || [],
                createdBy: adminData.createdBy || null,
                createdAt: new Date().toISOString(),
            };

            admins.push(newAdmin);
            this._writeAdmins(admins);

            return newAdmin;
        } else {
            try {
                const response = await this._request('/admin/admins', 'POST', adminData);
                // 处理后端返回的嵌套格式 { success: true, data: adminObject }
                if (response && response.success && response.data) {
                    return response.data;
                }
                return response || null;
            } catch (error) {
                this._log('error', '创建管理员失败:', error);
                throw error;
            }
        }
    }

    /**
     * 更新管理员
     */
    async updateAdmin(adminId, adminData) {
        if (this.useLocalStorage) {
            const admins = this._readAdmins();
            const index = admins.findIndex(a => a.id === adminId || a.username === adminId);

            if (index === -1) {
                throw new Error('管理员不存在');
            }

            admins[index] = { ...admins[index], ...adminData };
            this._writeAdmins(admins);

            return admins[index];
        } else {
            try {
                const roleHint = String(adminData?.role || adminData?.adminRole || '').toLowerCase();
                const prefersSubAdminEndpoint = roleHint === 'sub';
                const endpoints = prefersSubAdminEndpoint
                    ? [`/admin/sub-admins/${adminId}`, `/admin/admins/${adminId}`]
                    : [`/admin/admins/${adminId}`, `/admin/sub-admins/${adminId}`];

                let lastError = null;

                for (let index = 0; index < endpoints.length; index++) {
                    const endpoint = endpoints[index];
                    try {
                        const response = await this._request(endpoint, 'PUT', adminData);
                        return response || null;
                    } catch (requestError) {
                        lastError = requestError;
                        const message = String(requestError?.message || '').toLowerCase();
                        const shouldFallback = index < endpoints.length - 1
                            && (message.includes('不存在') || message.includes('not found') || message.includes('404'));

                        if (!shouldFallback) {
                            throw requestError;
                        }

                        this._log(
                            'warn',
                            prefersSubAdminEndpoint
                                ? '副管理员端点失败，尝试通用管理员端点:'
                                : '通用管理员端点失败，尝试副管理员端点:',
                            requestError,
                        );
                    }
                }

                throw lastError || new Error('更新管理员失败');
            } catch (error) {
                this._log('error', '更新管理员失败:', error);
                throw error;
            }
        }
    }

    /**
     * 删除管理员
     */
    async deleteAdmin(adminId) {
        if (this.useLocalStorage) {
            const admins = this._readAdmins();
            const filtered = admins.filter(a => a.id !== adminId && a.username !== adminId);
            this._writeAdmins(filtered);
            return { success: true };
        } else {
            try {
                const response = await this._request(`/admin/admins/${adminId}`, 'DELETE');
                return response || { success: true };
            } catch (error) {
                this._log('error', '删除管理员失败:', error);
                throw error;
            }
        }
    }

    // ==================== 授权码管理接口 ====================

    /**
     * 生成授权码
     */
    async generateAuthCode(province = null, count = 1) {
        if (this.useLocalStorage) {
            const authCodes = JSON.parse(localStorage.getItem('authCodes') || '[]');

            const newCodes = [];
            for (let i = 0; i < count; i++) {
                const code = `AUTH${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
                const newCode = {
                    id: this.generateId(),
                    code,
                    province,
                    used: false,
                    createdAt: new Date().toISOString(),
                };
                authCodes.push(newCode);
                newCodes.push(code);
            }

            localStorage.setItem('authCodes', JSON.stringify(authCodes));

            if (count === 1) {
                return newCodes[0];
            }
            return newCodes;
        } else {
            try {
                const response = await this._request('/admin/auth-codes/generate', 'POST', {
                    province,
                    count,
                });
                return response || null;
            } catch (error) {
                this._log('error', '生成授权码失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取授权码列表
     */
    async getAuthCodes(params = {}) {
        if (this.useLocalStorage) {
            const authCodes = JSON.parse(localStorage.getItem('authCodes') || '[]');

            let filtered = authCodes;

            if (params.province) {
                filtered = filtered.filter(code => code.province === params.province);
            }

            if (params.used !== undefined) {
                filtered = filtered.filter(code => code.used === params.used);
            }

            return {
                list: filtered,
                total: filtered.length,
                page: params.page || 1,
                pageSize: params.pageSize || 30,
            };
        } else {
            try {
                const response = await this._request('/admin/auth-codes', 'GET', params);
                return response || { list: [], total: 0, page: 1, pageSize: 30 };
            } catch (error) {
                this._log('error', '获取授权码列表失败:', error);
                throw error;
            }
        }
    }

    /**
     * 删除授权码
     */
    async deleteAuthCode(authCodeId) {
        if (this.useLocalStorage) {
            const authCodes = JSON.parse(localStorage.getItem('authCodes') || '[]');
            const filtered = authCodes.filter(
                code => code.id !== authCodeId && code.code !== authCodeId,
            );
            localStorage.setItem('authCodes', JSON.stringify(filtered));
            return { success: true };
        } else {
            try {
                const response = await this._request(`/admin/auth-codes/${authCodeId}`, 'DELETE');
                return response || { success: true };
            } catch (error) {
                this._log('error', '删除授权码失败:', error);
                throw error;
            }
        }
    }

    /**
     * 批量删除已使用的授权码
     */
    async deleteUsedAuthCodes(province = null, deleteHospitals = false) {
        if (this.useLocalStorage) {
            const authCodes = JSON.parse(localStorage.getItem('authCodes') || '[]');
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');

            const filtered = authCodes.filter(code => !code.used);

            if (province) {
                const usedCodes = authCodes.filter(code => code.used && code.province === province);
                if (deleteHospitals) {
                    // 删除使用这些授权码的医院
                    const hospitalIds = usedCodes.map(code => code.hospitalId).filter(Boolean);
                    const filteredHospitals = hospitals.filter(h => !hospitalIds.includes(h.id));
                    localStorage.setItem('hospitals', JSON.stringify(filteredHospitals));
                }
            } else {
                const usedCodes = authCodes.filter(code => code.used);
                if (deleteHospitals) {
                    const hospitalIds = usedCodes.map(code => code.hospitalId).filter(Boolean);
                    const filteredHospitals = hospitals.filter(h => !hospitalIds.includes(h.id));
                    localStorage.setItem('hospitals', JSON.stringify(filteredHospitals));
                }
            }

            localStorage.setItem('authCodes', JSON.stringify(filtered));
            return { success: true };
        } else {
            try {
                const response = await this._request('/admin/auth-codes/delete-used', 'POST', {
                    province,
                    deleteHospitals,
                });
                return response || { success: true };
            } catch (error) {
                this._log('error', '批量删除已使用授权码失败:', error);
                throw error;
            }
        }
    }

    /**
     * 修复已被医院使用但状态仍异常的授权码
     */
    async repairUsedAuthCodes(province = null) {
        if (this.useLocalStorage) {
            const authCodes = JSON.parse(localStorage.getItem('authCodes') || '[]');
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            const repairedCodes = [];

            authCodes.forEach(code => {
                if (province && code.province !== province) {
                    return;
                }

                const linkedHospital = hospitals.find(h => h.authCode === code.code || h.authCodeUsed === code.code);
                if (!linkedHospital) {
                    return;
                }

                if (!code.used || code.status === 'active' || !code.usedAt || !code.usedBy) {
                    code.used = true;
                    code.usedAt = code.usedAt || linkedHospital.createdAt || new Date().toISOString();
                    code.usedBy = code.usedBy || linkedHospital.username || linkedHospital.name || linkedHospital.hospitalName || null;
                    code.status = 'revoked';
                    repairedCodes.push(code.code);
                }
            });

            localStorage.setItem('authCodes', JSON.stringify(authCodes));
            return {
                success: true,
                repairedCount: repairedCodes.length,
                repairedCodes,
            };
        } else {
            try {
                const response = await this._request('/admin/auth-codes/repair-used-status', 'POST', {
                    province,
                });
                return response || { success: true, repairedCount: 0, repairedCodes: [] };
            } catch (error) {
                this._log('error', '修复授权码状态失败:', error);
                throw error;
            }
        }
    }

    // ==================== 用户媒体管理接口 ====================

    /**
     * 上传媒体文件
     */
    async uploadMedia(file, options = {}) {
        if (this.useLocalStorage) {
            this._log('warn', 'uploadMedia 在离线模式下不可用');
            throw new Error('当前为离线模式，无法上传媒体文件');
        } else {
            try {
                const response = await this._request('/user-media/upload', 'POST', {
                    file,
                    fileType: options.fileType || 'other',
                    isPublic: options.isPublic || false,
                    originalName: options.originalName || 'file',
                });
                return response || null;
            } catch (error) {
                this._log('error', '上传媒体文件失败:', error);
                throw error;
            }
        }
    }

    /**
     * 上传用户头像
     */
    async uploadAvatar(avatarData) {
        if (this.useLocalStorage) {
            this._log('warn', 'uploadAvatar 在离线模式下不可用');
            throw new Error('当前为离线模式，无法上传头像');
        } else {
            try {
                const response = await this._request('/user-media/avatar', 'POST', {
                    avatar: avatarData,
                });
                return response || null;
            } catch (error) {
                this._log('error', '上传头像失败:', error);
                throw error;
            }
        }
    }

    /**
     * 上传用户照片
     */
    async uploadPhoto(photoData, options = {}) {
        if (this.useLocalStorage) {
            this._log('warn', 'uploadPhoto 在离线模式下不可用');
            throw new Error('当前为离线模式，无法上传照片');
        } else {
            try {
                const response = await this._request('/user-media/photo', 'POST', {
                    photo: photoData,
                    originalName: options.originalName,
                    isPublic: options.isPublic || false,
                });
                return response || null;
            } catch (error) {
                this._log('error', '上传照片失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取用户媒体列表
     */
    async getUserMediaList(params = {}) {
        if (this.useLocalStorage) {
            this._log('warn', 'getUserMediaList 在离线模式下返回空数据');
            return { media: [] };
        } else {
            try {
                const response = await this._request('/user-media', 'GET', params);
                return response || { media: [] };
            } catch (error) {
                this._log('error', '获取媒体列表失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取媒体详情
     */
    async getMedia(mediaId) {
        if (this.useLocalStorage) {
            this._log('warn', 'getMedia 在离线模式下返回 null');
            return null;
        } else {
            try {
                const response = await this._request(`/user-media/${mediaId}`, 'GET');
                return response || null;
            } catch (error) {
                this._log('error', '获取媒体详情失败:', error);
                throw error;
            }
        }
    }

    /**
     * 删除媒体文件
     */
    async deleteMedia(mediaId) {
        if (this.useLocalStorage) {
            this._log('warn', 'deleteMedia 在离线模式下不可用');
            throw new Error('当前为离线模式，无法删除媒体文件');
        } else {
            try {
                const response = await this._request(`/user-media/${mediaId}`, 'DELETE');
                return response || null;
            } catch (error) {
                this._log('error', '删除媒体失败:', error);
                throw error;
            }
        }
    }

    // ==================== API监控接口 ====================

    /**
     * 获取API监控状态
     */
    async getApiMonitoringStatus() {
        if (this.useLocalStorage) {
            const monitoringData = JSON.parse(
                localStorage.getItem('apiMonitoring') || '{"services":[]}',
            );
            return { success: true, data: monitoringData.services };
        } else {
            try {
                const response = await this._request('/admin/api-monitoring/status', 'GET');
                return response.data || response;
            } catch (error) {
                this._log('error', '获取API监控状态失败:', error);
                throw error;
            }
        }
    }

    /**
     * 检查所有API服务
     */
    async checkAllApiServices() {
        if (this.useLocalStorage) {
            const monitoringData = JSON.parse(
                localStorage.getItem('apiMonitoring') || '{"services":[]}',
            );

            // 模拟检查所有服务
            monitoringData.services = monitoringData.services.map(service => {
                const newStatus
                    = Math.random() > 0.1 ? 'normal' : Math.random() > 0.5 ? 'abnormal' : 'offline';
                const newResponseTime = 50 + Math.floor(Math.random() * 200);

                // 更新历史记录
                if (!monitoringData.history) {
                    monitoringData.history = {};
                }
                if (!monitoringData.history[service.serviceType]) {
                    monitoringData.history[service.serviceType] = [];
                }
                monitoringData.history[service.serviceType].unshift({
                    status: newStatus,
                    response_time: newResponseTime,
                    checked_at: new Date().toISOString(),
                });

                // 保持历史记录只保留最近20条
                if (monitoringData.history[service.serviceType].length > 20) {
                    monitoringData.history[service.serviceType] = monitoringData.history[
                        service.serviceType
                    ].slice(0, 20);
                }

                return {
                    ...service,
                    status: newStatus,
                    responseTime: newResponseTime,
                    statusCode: newStatus === 'normal' ? 200 : newStatus === 'abnormal' ? 500 : 0,
                    lastChecked: new Date().toISOString(),
                    errorMessage: newStatus !== 'normal' ? '模拟服务异常' : null,
                };
            });

            localStorage.setItem('apiMonitoring', JSON.stringify(monitoringData));
            return { success: true, data: monitoringData.services };
        } else {
            try {
                const response = await this._request('/admin/api-monitoring/check-all', 'POST');
                return response.data || response;
            } catch (error) {
                this._log('error', '检查所有API服务失败:', error);
                throw error;
            }
        }
    }

    /**
     * 检查单个API服务
     */
    async checkApiService(serviceType) {
        if (this.useLocalStorage) {
            const monitoringData = JSON.parse(
                localStorage.getItem('apiMonitoring') || '{"services":[]}',
            );

            const serviceIndex = monitoringData.services.findIndex(
                s => s.serviceType === serviceType,
            );
            if (serviceIndex !== -1) {
                const service = monitoringData.services[serviceIndex];
                const newStatus
                    = Math.random() > 0.1 ? 'normal' : Math.random() > 0.5 ? 'abnormal' : 'offline';
                const newResponseTime = 50 + Math.floor(Math.random() * 200);

                // 更新历史记录
                if (!monitoringData.history) {
                    monitoringData.history = {};
                }
                if (!monitoringData.history[serviceType]) {
                    monitoringData.history[serviceType] = [];
                }
                monitoringData.history[serviceType].unshift({
                    status: newStatus,
                    response_time: newResponseTime,
                    checked_at: new Date().toISOString(),
                });

                // 保持历史记录只保留最近20条
                if (monitoringData.history[serviceType].length > 20) {
                    monitoringData.history[serviceType] = monitoringData.history[serviceType].slice(
                        0,
                        20,
                    );
                }

                monitoringData.services[serviceIndex] = {
                    ...service,
                    status: newStatus,
                    responseTime: newResponseTime,
                    statusCode: newStatus === 'normal' ? 200 : newStatus === 'abnormal' ? 500 : 0,
                    lastChecked: new Date().toISOString(),
                    errorMessage: newStatus !== 'normal' ? '模拟服务异常' : null,
                };

                localStorage.setItem('apiMonitoring', JSON.stringify(monitoringData));
            }

            return { success: true };
        } else {
            try {
                const response = await this._request(
                    `/admin/api-monitoring/check/${serviceType}`,
                    'POST',
                );
                return response.data || response;
            } catch (error) {
                this._log('error', '检查API服务失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取API监控历史记录
     */
    async getApiMonitoringHistory(serviceType, days = 7) {
        if (this.useLocalStorage) {
            const monitoringData = JSON.parse(
                localStorage.getItem('apiMonitoring') || '{"history":{}}',
            );
            const history = monitoringData.history[serviceType] || [];
            return { success: true, data: history };
        } else {
            try {
                const response = await this._request(
                    `/admin/api-monitoring/history/${serviceType}?days=${days}`,
                    'GET',
                );
                return response.data || response;
            } catch (error) {
                this._log('error', '获取API监控历史失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取管理员仪表板数据
     */
    async getAdminDashboardStats() {
        if (this.useLocalStorage) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            return {
                success: true,
                totalUsers: users.length,
                activeUsers: Math.floor(users.length * 0.7),
                todayRequests: Math.floor(Math.random() * 1000) + 500,
                totalData: `${Math.floor(Math.random() * 10000) + 5000} MB`,
                totalHospitals: hospitals.length,
                pendingAppointments: 0,
                totalHealthRecords: Math.floor(Math.random() * 1000),
            };
        } else {
            try {
                const response = await this._request('/admin/dashboard', 'GET');
                return response.data || response;
            } catch (error) {
                this._log('error', '获取仪表板数据失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取授权码列表
     */
    async listAuthCodes(params = {}) {
        if (this.useLocalStorage) {
            const authCodes = JSON.parse(localStorage.getItem('authCodes') || '[]');
            let filtered = authCodes;
            if (params.status === 'active') {
                filtered = authCodes.filter(c => !c.used);
            } else if (params.status === 'revoked') {
                filtered = authCodes.filter(c => c.used);
            }
            if (params.province) {
                filtered = filtered.filter(c => c.province === params.province);
            }
            return {
                list: filtered,
                total: filtered.length,
                page: params.page || 1,
                pageSize: params.pageSize || 50,
            };
        } else {
            try {
                const response = await this._request('/admin/auth-codes', 'GET', params);
                const payload = response.data || response;
                const authCodeList = payload.list || payload.authCodes || [];
                return {
                    list: authCodeList,
                    total: payload.total || authCodeList.length,
                    page: payload.page || params.page || 1,
                    pageSize: payload.pageSize || params.pageSize || 50,
                    stats: payload.stats || null,
                };
            } catch (error) {
                this._log('error', '获取授权码列表失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取授权码统计
     */
    async getAuthCodeStats() {
        if (this.useLocalStorage) {
            const authCodes = JSON.parse(localStorage.getItem('authCodes') || '[]');
            const total = authCodes.length;
            const active = authCodes.filter(c => !c.used).length;
            const revoked = authCodes.filter(c => c.used).length;
            return { total, active, revoked };
        } else {
            try {
                const response = await this._request('/admin/auth-codes', 'GET');
                const payload = response.data || response;
                const authCodes = payload.list || payload.authCodes || [];
                const total = payload.stats?.total || payload.total || authCodes.length;
                const active = payload.stats?.unused ?? payload.stats?.active ?? authCodes.filter(c => !c.used).length;
                const revoked = payload.stats?.revoked ?? authCodes.filter(c => c.status === 'revoked' || c.used).length;
                return { total, active, revoked };
            } catch (error) {
                this._log('error', '获取授权码统计失败:', error);
                throw error;
            }
        }
    }

    /**
     * 创建授权码（新增API，返回 {id, code}）
     */
    async createAuthCode(payload = {}) {
        if (this.useLocalStorage) {
            const authCodes = JSON.parse(localStorage.getItem('authCodes') || '[]');
            const code = `AUTH${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
            const newCode = {
                id: this.generateId(),
                code,
                province: payload.province,
                used: false,
                createdAt: new Date().toISOString(),
            };
            authCodes.push(newCode);
            localStorage.setItem('authCodes', JSON.stringify(authCodes));
            return newCode;
        } else {
            try {
                const response = await this._request('/admin/auth-codes', 'POST', payload);
                const payloadData = response.data || response;
                if (payloadData.authCodes && payloadData.authCodes.length > 0) {
                    return payloadData.authCodes[0];
                }
                return payloadData;
            } catch (error) {
                this._log('error', '创建授权码失败:', error);
                throw error;
            }
        }
    }

    /**
     * 生成授权码
     */
    async generateAuthCode(province = '') {
        if (this.useLocalStorage) {
            const authCodes = JSON.parse(localStorage.getItem('authCodes') || '[]');
            const code = `AUTH${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            const newCode = { code, province, used: false, createdAt: new Date().toISOString() };
            authCodes.push(newCode);
            localStorage.setItem('authCodes', JSON.stringify(authCodes));
            return { success: true, authCodes: [newCode] };
        } else {
            try {
                const response = await this._request('/admin/auth-codes', 'POST', {
                    province,
                    count: 1,
                });
                return response.data || response;
            } catch (error) {
                this._log('error', '生成授权码失败:', error);
                throw error;
            }
        }
    }

    /**
     * 删除授权码
     */
    async deleteAuthCode(authCodeId) {
        if (this.useLocalStorage) {
            const authCodes = JSON.parse(localStorage.getItem('authCodes') || '[]');
            const filtered = authCodes.filter(c => c.code !== authCodeId && c.id !== authCodeId);
            localStorage.setItem('authCodes', JSON.stringify(filtered));
            return { success: true };
        } else {
            try {
                const response = await this._request(`/admin/auth-codes/${authCodeId}`, 'DELETE');
                return response.data || response;
            } catch (error) {
                this._log('error', '删除授权码失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取智能设备配置
     */
    async getSmartDevices() {
        if (this.useLocalStorage) {
            const devices = JSON.parse(localStorage.getItem('smartDevices') || '[]');
            return { success: true, devices };
        } else {
            try {
                const response = await this._request('/admin/smart-devices', 'GET');
                return response.data || response;
            } catch (error) {
                this._log('error', '获取智能设备配置失败:', error);
                throw error;
            }
        }
    }

    /**
     * 更新智能设备配置
     */
    async updateSmartDevice(deviceId, deviceData) {
        if (this.useLocalStorage) {
            const devices = JSON.parse(localStorage.getItem('smartDevices') || '[]');
            const index = devices.findIndex(d => d.id === deviceId);
            if (index !== -1) {
                devices[index] = { ...devices[index], ...deviceData };
                localStorage.setItem('smartDevices', JSON.stringify(devices));
            }
            return { success: true, devices };
        } else {
            try {
                const response = await this._request(
                    `/admin/smart-devices/${deviceId}`,
                    'PUT',
                    deviceData,
                );
                return response.data || response;
            } catch (error) {
                this._log('error', '更新智能设备配置失败:', error);
                throw error;
            }
        }
    }

    /**
     * 添加智能设备
     */
    async addSmartDevice(deviceData) {
        if (this.useLocalStorage) {
            const devices = JSON.parse(localStorage.getItem('smartDevices') || '[]');
            const newDevice = {
                id: this.generateId(),
                ...deviceData,
                enabled: true,
                createdAt: new Date().toISOString(),
            };
            devices.push(newDevice);
            localStorage.setItem('smartDevices', JSON.stringify(devices));
            return { success: true, devices };
        } else {
            try {
                const response = await this._request('/admin/smart-devices', 'POST', deviceData);
                return response.data || response;
            } catch (error) {
                this._log('error', '添加智能设备失败:', error);
                throw error;
            }
        }
    }

    /**
     * 删除智能设备
     */
    async deleteSmartDevice(deviceId) {
        if (this.useLocalStorage) {
            const devices = JSON.parse(localStorage.getItem('smartDevices') || '[]');
            const filtered = devices.filter(d => d.id !== deviceId);
            localStorage.setItem('smartDevices', JSON.stringify(filtered));
            return { success: true, devices: filtered };
        } else {
            try {
                const response = await this._request(`/admin/smart-devices/${deviceId}`, 'DELETE');
                return response.data || response;
            } catch (error) {
                this._log('error', '删除智能设备失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取AI设置
     */
    async getAISettings() {
        if (this.useLocalStorage) {
            const settings = JSON.parse(
                localStorage.getItem('aiSettings')
                    || '{"enabled":true,"provider":"openai","model":"gpt-4"}',
            );
            return { success: true, settings };
        } else {
            try {
                const response = await this._request('/admin/ai-settings', 'GET');
                return response.data || response;
            } catch (error) {
                this._log('error', '获取AI设置失败:', error);
                throw error;
            }
        }
    }

    /**
     * 更新AI设置
     */
    async updateAISettings(settings) {
        if (this.useLocalStorage) {
            localStorage.setItem('aiSettings', JSON.stringify(settings));
            return { success: true, settings };
        } else {
            try {
                const response = await this._request('/admin/ai-settings', 'PUT', settings);
                return response.data || response;
            } catch (error) {
                this._log('error', '更新AI设置失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取地理位置API设置
     */
    async getLocationSettings() {
        if (this.useLocalStorage) {
            const settings = JSON.parse(
                localStorage.getItem('locationSettings')
                    || '{"enabled":true,"provider":"amap","mapStyle":"normal"}',
            );
            return { success: true, settings };
        } else {
            try {
                const response = await this._request('/admin/location-settings', 'GET');
                return response.data || response;
            } catch (error) {
                this._log('error', '获取地理位置API设置失败:', error);
                throw error;
            }
        }
    }

    /**
     * 更新地理位置API设置
     */
    async updateLocationSettings(settings) {
        if (this.useLocalStorage) {
            localStorage.setItem('locationSettings', JSON.stringify(settings));
            return { success: true, settings };
        } else {
            try {
                const response = await this._request('/admin/location-settings', 'PUT', settings);
                return response.data || response;
            } catch (error) {
                this._log('error', '更新地理位置API设置失败:', error);
                throw error;
            }
        }
    }

    /**
     * 更新管理员密码
     */
    async updateAdminPassword(currentPassword, newPassword) {
        if (this.useLocalStorage) {
            const admins = this._readAdmins();
            const currentUser = this.getCurrentUser();
            const adminIndex = admins.findIndex(a => a.username === currentUser?.username);
            if (adminIndex !== -1 && admins[adminIndex].password === currentPassword) {
                admins[adminIndex].password = newPassword;
                this._writeAdmins(admins);
                return { success: true };
            }
            throw new Error('当前密码错误');
        } else {
            try {
                const response = await this._request('/admin/account/password', 'PUT', {
                    currentPassword,
                    newPassword,
                });
                return response.data || response;
            } catch (error) {
                this._log('error', '更新管理员密码失败:', error);
                throw error;
            }
        }
    }

    /**
     * 更新管理员信息
     */
    async updateAdminProfile(profileData) {
        if (this.useLocalStorage) {
            const admins = this._readAdmins();
            const currentUser = this.getCurrentUser();
            const adminIndex = admins.findIndex(a => a.username === currentUser?.username);
            if (adminIndex !== -1) {
                admins[adminIndex] = { ...admins[adminIndex], ...profileData };
                this._writeAdmins(admins);
                return { success: true };
            }
            throw new Error('管理员不存在');
        } else {
            try {
                const response = await this._request('/admin/account/profile', 'PUT', profileData);
                return response.data || response;
            } catch (error) {
                this._log('error', '更新管理员信息失败:', error);
                throw error;
            }
        }
    }

    /**
     * 推送用户设置到服务器
     */
    async pushUserSettings(settingsData) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            try {
                const userSettingsStore = JSON.parse(localStorage.getItem('userSettingsStore') || '{}');
                const normalizedSettings = {
                    id: settingsData.id,
                    user_id: settingsData.user_id,
                    settings: settingsData.settings,
                    version: settingsData.version,
                    updated_at: settingsData.updated_at,
                    device_id: settingsData.device_id,
                };
                userSettingsStore[settingsData.user_id] = normalizedSettings;
                localStorage.setItem('userSettingsStore', JSON.stringify(userSettingsStore));
                this._log('info', '用户设置本地保存成功');
                return {
                    success: true,
                    data: { settings: normalizedSettings.settings },
                    message: '设置保存成功',
                };
            } catch (error) {
                this._log('error', '保存用户设置失败:', error);
                return { success: false, message: error.message };
            }
        } else {
            // 使用后端服务模式
            try {
                const response = await this._request(`/settings/push/${settingsData.user_id}`, 'POST', { settings: settingsData.settings });
                return response;
            } catch (error) {
                this._log('error', '推送用户设置失败:', error);
                throw error;
            }
        }
    }

    /**
     * 从服务器拉取用户设置
     */
    async pullUserSettings(userId) {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            try {
                const userSettingsStore = JSON.parse(localStorage.getItem('userSettingsStore') || '{}');
                const settingsRecord = userSettingsStore[userId] || null;
                if (settingsRecord) {
                    this._log('info', '获取用户设置成功');
                } else {
                    this._log('info', '未找到用户设置，返回默认值');
                }
                return {
                    success: true,
                    data: { settings: settingsRecord?.settings || null },
                    message: settingsRecord ? '获取用户设置成功' : '未找到用户设置',
                };
            } catch (error) {
                this._log('error', '获取用户设置失败:', error);
                return { success: false, message: error.message };
            }
        } else {
            // 使用后端服务模式
            try {
                const response = await this._request(`/settings/pull/${userId}`, 'GET');
                return response;
            } catch (error) {
                this._log('error', '拉取用户设置失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取用户通知列表
     */
    async listUserNotifications(limit = 100) {
        if (this.shouldUseLocalNotificationFallback('/notifications')) {
            const notifications = this.readUserNotificationsFromStorage();
            return (notifications.items || []).slice(0, limit);
        }

        try {
            const response = await this._request('/notifications', 'GET', { limit });
            return response.data || response;
        } catch (error) {
            this._log('error', '获取用户通知失败:', error);
            throw error;
        }
    }

    /**
     * 创建用户通知
     */
    async createUserNotification(notificationData) {
        if (this.shouldUseLocalNotificationFallback('/notifications')) {
            const notifications = this.readUserNotificationsFromStorage();
            const newNotification = {
                id: this.generateId(),
                title: notificationData.title,
                content: notificationData.content,
                level: notificationData.level || 'info',
                type: notificationData.type || 'general',
                appointmentId: notificationData.appointmentId || null,
                appointmentNumber: notificationData.appointmentNumber || null,
                isRead: false,
                read: false,
                createdAt: new Date().toISOString(),
            };
            notifications.items.unshift(newNotification);
            this.writeUserNotificationsToStorage(notifications);
            return newNotification;
        }

        try {
            const response = await this._request('/notifications', 'POST', notificationData);
            return response.data || response;
        } catch (error) {
            this._log('error', '创建用户通知失败:', error);
            throw error;
        }
    }

    /**
     * 标记用户通知为已读
     */
    async markUserNotificationRead(notificationId) {
        if (this.shouldUseLocalNotificationFallback(`/notifications/${notificationId}/read`)) {
            const notifications = this.readUserNotificationsFromStorage();
            notifications.items = notifications.items.map(item => {
                if (item.id === notificationId) {
                    return { ...item, isRead: true, read: true };
                }
                return item;
            });
            this.writeUserNotificationsToStorage(notifications);
            return { success: true };
        }

        try {
            const response = await this._request(`/notifications/${notificationId}/read`, 'PUT');
            return response.data || response;
        } catch (error) {
            this._log('error', '标记用户通知为已读失败:', error);
            throw error;
        }
    }

    /**
     * 标记所有用户通知为已读
     */
    async markAllUserNotificationsRead() {
        if (this.shouldUseLocalNotificationFallback('/notifications/read-all')) {
            const notifications = this.readUserNotificationsFromStorage();
            notifications.items = notifications.items.map(item => ({
                ...item,
                isRead: true,
                read: true,
            }));
            this.writeUserNotificationsToStorage(notifications);
            return { success: true };
        }

        try {
            const response = await this._request('/notifications/read-all', 'PUT');
            return response.data || response;
        } catch (error) {
            this._log('error', '标记所有用户通知为已读失败:', error);
            throw error;
        }
    }

    /**
     * 删除用户通知
     */
    async deleteUserNotification(notificationId) {
        if (this.shouldUseLocalNotificationFallback(`/notifications/${notificationId}`)) {
            const notifications = this.readUserNotificationsFromStorage();
            const initialLength = notifications.items.length;
            notifications.items = notifications.items.filter(item => item.id !== notificationId);
            this.writeUserNotificationsToStorage(notifications);
            return { success: true, alreadyDeleted: notifications.items.length === initialLength };
        }

        try {
            const response = await this._request(`/notifications/${notificationId}`, 'DELETE');
            return response.data || response;
        } catch (error) {
            this._log('error', '删除用户通知失败:', error);
            throw error;
        }
    }

    /**
     * 获取管理员通知列表
     */
    async listAdminNotifications(limit = 100) {
        if (!this.canAccessAdminNotifications()) {
            return [];
        }

        if (this.useLocalStorage) {
            const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '{"items": []}');
            return notifications.items || [];
        } else {
            try {
                const response = await this._request('/admin/notifications', 'GET', { limit });
                return response.data || response;
            } catch (error) {
                const isPermissionError = error?.message?.includes('权限不足') || error?.message?.includes('未授权');
                if (isPermissionError) {
                    this._log('warn', '当前会话无权读取管理员通知，已返回空列表');
                    return [];
                }
                this._log('error', '获取管理员通知失败:', error);
                throw error;
            }
        }
    }

    /**
     * 创建管理员通知
     */
    async createAdminNotification(notificationData) {
        if (!this.canAccessAdminNotifications()) {
            return { success: false, skipped: true };
        }

        if (this.useLocalStorage) {
            const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '{"items": []}');
            const newNotification = {
                id: this.generateId(),
                title: notificationData.title,
                content: notificationData.content,
                level: notificationData.level || 'info',
                type: notificationData.type || 'general',
                isRead: false,
                read: false,
                createdAt: new Date().toISOString(),
            };
            notifications.items.unshift(newNotification);
            localStorage.setItem('adminNotifications', JSON.stringify(notifications));
            return newNotification;
        } else {
            try {
                const response = await this._request('/admin/notifications', 'POST', notificationData);
                return response.data || response;
            } catch (error) {
                this._log('error', '创建管理员通知失败:', error);
                throw error;
            }
        }
    }

    /**
     * 标记管理员通知为已读
     */
    async markAdminNotificationRead(notificationId) {
        if (!this.canAccessAdminNotifications()) {
            return { success: false, skipped: true };
        }

        if (this.useLocalStorage) {
            const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '{"items": []}');
            notifications.items = notifications.items.map(item => {
                if (item.id === notificationId) {
                    return { ...item, isRead: true, read: true };
                }
                return item;
            });
            localStorage.setItem('adminNotifications', JSON.stringify(notifications));
            return { success: true };
        } else {
            try {
                const response = await this._request(`/admin/notifications/${notificationId}/read`, 'PUT');
                return response;
            } catch (error) {
                if (error?.message?.includes('权限不足') || error?.message?.includes('未授权')) {
                    this._log('warn', '当前会话无权标记管理员通知已读，已跳过');
                    return { success: false, skipped: true };
                }
                this._log('error', '标记管理员通知为已读失败:', error);
                throw error;
            }
        }
    }

    /**
     * 标记所有管理员通知为已读
     */
    async markAllAdminNotificationsRead() {
        if (!this.canAccessAdminNotifications()) {
            return { success: false, skipped: true };
        }

        if (this.useLocalStorage) {
            const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '{"items": []}');
            notifications.items = notifications.items.map(item => ({
                ...item,
                isRead: true,
                read: true,
            }));
            localStorage.setItem('adminNotifications', JSON.stringify(notifications));
            return { success: true };
        } else {
            try {
                const response = await this._request('/admin/notifications/read-all', 'PUT');
                return response.data || response;
            } catch (error) {
                if (error?.message?.includes('权限不足') || error?.message?.includes('未授权')) {
                    this._log('warn', '当前会话无权批量标记管理员通知，已跳过');
                    return { success: false, skipped: true };
                }
                this._log('error', '标记所有管理员通知为已读失败:', error);
                throw error;
            }
        }
    }

    /**
     * 删除管理员通知
     */
    async deleteAdminNotification(notificationId) {
        if (!this.canAccessAdminNotifications()) {
            return { success: false, skipped: true };
        }

        if (this.useLocalStorage) {
            const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '{"items": []}');
            const initialLength = notifications.items.length;
            notifications.items = notifications.items.filter(item => item.id !== notificationId);
            localStorage.setItem('adminNotifications', JSON.stringify(notifications));
            return { success: true, alreadyDeleted: notifications.items.length === initialLength };
        } else {
            try {
                const response = await this._request(`/admin/notifications/${notificationId}`, 'DELETE');
                return response.data || response;
            } catch (error) {
                if (error?.message?.includes('权限不足') || error?.message?.includes('未授权')) {
                    this._log('warn', '当前会话无权删除管理员通知，已跳过');
                    return { success: false, skipped: true };
                }
                this._log('error', '删除管理员通知失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取当前管理员设置
     */
    async getMyAdminSettings() {
        if (this.useLocalStorage) {
            const settings = JSON.parse(localStorage.getItem('adminSettings') || '{}');
            return settings;
        } else {
            try {
                const response = await this._request('/admin/me/settings', 'GET');
                return response.data || response;
            } catch (error) {
                this._log('error', '获取当前管理员设置失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取管理员信息
     */
    async getAdmin(adminId) {
        if (this.useLocalStorage) {
            const admins = this._readAdmins();
            const admin = admins.find(a => a.id === adminId);
            if (admin) {
                return { ...admin, settings: JSON.parse(localStorage.getItem('adminSettings') || '{}') };
            }
            return null;
        } else {
            try {
                const response = await this._request(`/admin/admins/${adminId}`, 'GET');
                return response.data || response;
            } catch (error) {
                this._log('error', '获取管理员信息失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取系统状态
     */
    async getSystemStatus() {
        if (this.useLocalStorage) {
            return {
                cpu: 30 + Math.floor(Math.random() * 40),
                memory: 40 + Math.floor(Math.random() * 30),
                disk: 50 + Math.floor(Math.random() * 20),
                uptime: 86400 * Math.floor(Math.random() * 7),
                activeUsers: 10 + Math.floor(Math.random() * 50),
                requestsPerSecond: 5 + Math.floor(Math.random() * 20),
            };
        } else {
            try {
                const response = await this._request('/admin/system-status', 'GET');
                return response.data || response;
            } catch (error) {
                this._log('error', '获取系统状态失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取公开的管理员设置
     */
    async getPublicAdminSettings() {
        if (this.useLocalStorage) {
            // 使用本地存储模式
            this._log('debug', '本地获取公开管理员设置');
            
            try {
                // 从 localStorage 读取 admin_settings
                const settingsStr = localStorage.getItem('admin_settings');
                if (settingsStr) {
                    return JSON.parse(settingsStr);
                }
                // 如果没有找到，返回默认设置
                return null;
            } catch (error) {
                this._log('error', '获取公开管理员设置失败:', error);
                return null;
            }
        } else {
            try {
                const response = await this._request('/admin/public-settings', 'GET');
                const payload = response.data || response;
                return payload.settings || payload || null;
            } catch (error) {
                this._log('error', '获取公开管理员设置失败:', error);
                throw error;
            }
        }
    }

    // ==================== 医院查询接口 ====================

    /**
     * 获取医院列表
     */
    async getHospitals(params = {}) {
        if (this.useLocalStorage) {
            const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
            let filtered = hospitals;

            if (params.province) {
                filtered = filtered.filter(h => h.province === params.province);
            }
            if (params.city) {
                filtered = filtered.filter(h => h.city === params.city);
            }
            if (params.keyword) {
                const keyword = params.keyword.toLowerCase();
                filtered = filtered.filter(h => 
                    h.name.toLowerCase().includes(keyword) || 
                    h.address.toLowerCase().includes(keyword)
                );
            }

            return {
                list: filtered,
                total: filtered.length,
                page: params.page || 1,
                pageSize: params.pageSize || 30,
            };
        } else {
            try {
                const response = await this._request('/hospitals', 'GET', params);
                return response.data || response || { list: [], total: 0, page: 1, pageSize: 30 };
            } catch (error) {
                this._log('error', '获取医院列表失败:', error);
                throw error;
            }
        }
    }

    // ==================== AI服务接口 ====================

    /**
     * AI对话代理
     */
    async callAIChat(messages, options = {}) {
        if (this.useLocalStorage) {
            this._log('warn', 'AI服务需要后端支持');
            return { success: false, message: 'AI服务需要后端支持' };
        } else {
            try {
                const response = await this._request('/proxy/ai', 'POST', {
                    messages,
                    provider: options.provider || 'deepseek',
                    model: options.model,
                    temperature: options.temperature,
                    maxTokens: options.maxTokens,
                    stream: options.stream || false,
                });
                return response.data || response;
            } catch (error) {
                this._log('error', 'AI对话失败:', error);
                throw error;
            }
        }
    }

    // ==================== 地理编码接口 ====================

    /**
     * 地理编码
     */
    async geocodeAddress(address, provider = 'amap') {
        if (this.useLocalStorage) {
            this._log('warn', '地理编码需要后端支持');
            return null;
        } else {
            try {
                const response = await this._request('/geocoding', 'POST', {
                    address,
                    provider,
                });
                return response.data || response;
            } catch (error) {
                this._log('error', '地理编码失败:', error);
                throw error;
            }
        }
    }

    /**
     * 获取地理编码统计
     */
    async getGeocodingStats() {
        if (this.useLocalStorage) {
            return {
                concurrentRequests: 0,
                maxConcurrent: 5,
                queueLength: 0,
                totalRequestsToday: 0,
                totalRequestsThisMonth: 0,
            };
        } else {
            try {
                const response = await this._request('/geocoding/stats', 'GET');
                return response.data || response;
            } catch (error) {
                this._log('error', '获取地理编码统计失败:', error);
                throw error;
            }
        }
    }

    // ==================== Fitbit API代理接口 ====================

    /**
     * Fitbit API代理
     */
    async callFitbitAPI(endpoint, method = 'GET', data = null) {
        if (this.useLocalStorage) {
            this._log('warn', 'Fitbit API需要后端支持');
            return null;
        } else {
            try {
                const response = await this._request(`/fitbit/${endpoint}`, method, data);
                return response;
            } catch (error) {
                this._log('error', 'Fitbit API调用失败:', error);
                throw error;
            }
        }
    }

    // ==================== 重置密码补充接口 ====================

    /**
     * 重置密码（兼容confirmPassword参数）
     */
    async resetPasswordWithConfirm(username, newPassword, confirmPassword) {
        if (this.useLocalStorage) {
            return this.resetPassword(username, newPassword);
        } else {
            try {
                const response = await this._request('/auth/reset-password', 'POST', {
                    username,
                    newPassword,
                    confirmPassword,
                });
                return response;
            } catch (error) {
                this._log('error', '重置密码失败:', error);
                throw error;
            }
        }
    }
}

// 暴露到全局，供模块脚本与普通脚本共用
window.APIService = APIService;

try {
    // 创建全局实例
    window.apiService = new APIService();
    console.log('API服务初始化成功');
} catch (error) {
    console.error('API服务初始化失败:', error);
    // 创建一个备用对象，防止出现 undefined 错误
    window.apiService = {
        login: async () => {
            throw new Error('API服务初始化失败，请刷新页面重试');
        },
        _log: (level, ...args) => console[level === 'debug' ? 'log' : level](...args),
        deleteCurrentUserAccount: async () => {
            throw new Error('API服务初始化失败，请刷新页面重试');
        },
        deactivateHospitalAccount: async () => {
            throw new Error('API服务初始化失败，请刷新页面重试');
        },
        deleteMyHospitalAccount: async () => {
            throw new Error('API服务初始化失败，请刷新页面重试');
        },
    };
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}
