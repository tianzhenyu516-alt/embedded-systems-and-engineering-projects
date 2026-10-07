// Fitbit API 客户端
class FitbitAPI {
    constructor() {
        this.config = window.FITBIT_CONFIG || FITBIT_CONFIG;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpires = null;
        this.userId = null;

        // 从本地存储加载token
        this.loadTokens();

        // 设置自动刷新
        this.setupTokenRefresh();
    }

    // 加载存储的token
    loadTokens() {
        try {
            this.accessToken = localStorage.getItem(this.config.STORAGE_KEYS.ACCESS_TOKEN);
            this.refreshToken = localStorage.getItem(this.config.STORAGE_KEYS.REFRESH_TOKEN);
            this.tokenExpires = localStorage.getItem(this.config.STORAGE_KEYS.TOKEN_EXPIRES);
            this.userId = localStorage.getItem(this.config.STORAGE_KEYS.USER_ID);

            if (this.tokenExpires) {
                this.tokenExpires = new Date(this.tokenExpires);
            }
        } catch (error) {
            console.error('加载Fitbit token失败:', error);
        }
    }

    // 保存token到本地存储
    saveTokens(accessToken, refreshToken, expiresIn) {
        try {
            const expiresAt = new Date(Date.now() + expiresIn * 1000);

            localStorage.setItem(this.config.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            localStorage.setItem(this.config.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
            localStorage.setItem(this.config.STORAGE_KEYS.TOKEN_EXPIRES, expiresAt.toISOString());

            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.tokenExpires = expiresAt;
        } catch (error) {
            console.error('保存Fitbit token失败:', error);
        }
    }

    // 清除token
    clearTokens() {
        try {
            localStorage.removeItem(this.config.STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(this.config.STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(this.config.STORAGE_KEYS.TOKEN_EXPIRES);
            localStorage.removeItem(this.config.STORAGE_KEYS.USER_ID);

            this.accessToken = null;
            this.refreshToken = null;
            this.tokenExpires = null;
            this.userId = null;
        } catch (error) {
            console.error('清除Fitbit token失败:', error);
        }
    }

    // 检查token是否有效
    isTokenValid() {
        if (!this.accessToken || !this.tokenExpires) {
            return false;
        }

        const now = new Date();
        const buffer = 5 * 60 * 1000; // 5分钟缓冲时间

        return this.tokenExpires.getTime() > now.getTime() + buffer;
    }

    // 启动OAuth2认证流程
    startAuth() {
        const state = this.generateState();
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.config.CLIENT_ID,
            redirect_uri: this.config.REDIRECT_URI,
            scope: this.config.SCOPES.join(' '),
            state,
        });

        const authUrl = `${this.config.AUTH_URL}?${params.toString()}`;

        // 在新窗口中打开认证页面
        const authWindow = window.open(
            authUrl,
            'fitbit-auth',
            'width=600,height=700,scrollbars=yes,resizable=yes',
        );

        if (!authWindow) {
            this.onAuthError('无法打开 Fitbit 授权窗口，请检查浏览器弹窗设置');
            return;
        }

        // 监听认证完成
        this.listenForAuthComplete(authWindow, state);
    }

    // 生成随机状态参数
    generateState() {
        return (
            Math.random().toString(36).substring(2, 15)
            + Math.random().toString(36).substring(2, 15)
        );
    }

    // 监听认证完成
    listenForAuthComplete(authWindow, expectedState) {
        const cleanup = () => {
            window.removeEventListener('message', handleMessage);
            clearInterval(checkClosed);
        };

        const handleMessage = event => {
            if (event.origin !== window.location.origin || !event.data) {
                return;
            }

            if (event.data.type === 'fitbit_auth_success') {
                cleanup();
                if (authWindow && !authWindow.closed) {
                    authWindow.close();
                }

                const { code, state } = event.data;
                if (expectedState && state !== expectedState) {
                    this.onAuthError('认证失败：状态参数不匹配');
                    return;
                }

                if (code) {
                    this.exchangeCodeForToken(code);
                    return;
                }

                this.onAuthError('认证失败：未获取到授权码');
                return;
            }

            if (event.data.type === 'fitbit_auth_error') {
                cleanup();
                if (authWindow && !authWindow.closed) {
                    authWindow.close();
                }
                this.onAuthError(event.data.error || '认证失败');
            }
        };

        window.addEventListener('message', handleMessage);

        const checkClosed = setInterval(() => {
            if (authWindow.closed) {
                cleanup();
            }
        }, 1000);
    }

    // 用授权码换取访问token
    async exchangeCodeForToken(code) {
        try {
            const response = await fetch(this.config.TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${btoa(`${this.config.CLIENT_ID}:${this.config.CLIENT_SECRET}`)}`,
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: this.config.REDIRECT_URI,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            this.saveTokens(data.access_token, data.refresh_token, data.expires_in);
            this.userId = data.user_id;

            // 保存用户ID
            localStorage.setItem(this.config.STORAGE_KEYS.USER_ID, data.user_id);

            console.log('Fitbit认证成功');
            this.onAuthSuccess();
        } catch (error) {
            console.error('获取Fitbit token失败:', error);
            this.onAuthError(`认证失败：${error.message}`);
        }
    }

    // 刷新访问token
    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('没有刷新token');
        }

        try {
            const response = await fetch(this.config.TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${btoa(`${this.config.CLIENT_ID}:${this.config.CLIENT_SECRET}`)}`,
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.saveTokens(data.access_token, data.refresh_token, data.expires_in);

            console.log('Fitbit token刷新成功');
            return true;
        } catch (error) {
            console.error('刷新Fitbit token失败:', error);
            this.clearTokens();
            return false;
        }
    }

    // 设置自动刷新token
    setupTokenRefresh() {
        setInterval(async () => {
            if (this.accessToken && !this.isTokenValid()) {
                console.log('自动刷新Fitbit token...');
                await this.refreshAccessToken();
            }
        }, this.config.REFRESH_INTERVAL);
    }

    // 发送API请求
    async makeRequest(endpoint, options = {}) {
        if (!this.isTokenValid()) {
            const refreshed = await this.refreshAccessToken();
            if (!refreshed) {
                throw new Error('无法获取有效的访问token');
            }
        }

        const url = `${this.config.API_BASE_URL}${endpoint}`;
        const defaultOptions = {
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
        };

        const requestOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, requestOptions);

            if (response.status === 401) {
                // Token过期，尝试刷新
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // 重新发送请求
                    requestOptions.headers.Authorization = `Bearer ${this.accessToken}`;
                    const retryResponse = await fetch(url, requestOptions);
                    return await retryResponse.json();
                } else {
                    throw new Error('认证失败，请重新登录');
                }
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Fitbit API请求失败:', error);
            throw error;
        }
    }

    // 获取用户资料
    async getUserProfile() {
        return await this.makeRequest(this.config.ENDPOINTS.PROFILE);
    }

    // 获取今日步数
    async getTodaySteps() {
        try {
            const data = await this.makeRequest(this.config.ENDPOINTS.ACTIVITIES_STEPS);
            return data['activities-steps'][0]?.value || 0;
        } catch (error) {
            console.error('获取步数失败:', error);
            return 0;
        }
    }

    // 获取今日心率数据
    async getTodayHeartRate() {
        try {
            const data = await this.makeRequest(this.config.ENDPOINTS.ACTIVITIES_HEART);
            const heartRateData = data['activities-heart'][0];

            if (heartRateData && heartRateData.value) {
                const restingHeartRate = heartRateData.value.restingHeartRate;
                return restingHeartRate || 72; // 默认值
            }

            return 72; // 默认心率
        } catch (error) {
            console.error('获取心率失败:', error);
            return 72;
        }
    }

    // 获取今日睡眠数据
    async getTodaySleep() {
        try {
            const data = await this.makeRequest(this.config.ENDPOINTS.SLEEP);
            const sleepData = data.sleep[0];

            if (sleepData) {
                return {
                    duration: sleepData.duration / (1000 * 60 * 60), // 转换为小时
                    efficiency: sleepData.efficiency,
                    stages: {
                        deep: sleepData.levels.summary.deep.minutes / 60,
                        light: sleepData.levels.summary.light.minutes / 60,
                        rem: sleepData.levels.summary.rem.minutes / 60,
                        wake: sleepData.levels.summary.wake.minutes / 60,
                    },
                };
            }

            return {
                duration: 7.5,
                efficiency: 85,
                stages: {
                    deep: 2.5,
                    light: 5.0,
                    rem: 1.0,
                    wake: 0.5,
                },
            };
        } catch (error) {
            console.error('获取睡眠数据失败:', error);
            return {
                duration: 7.5,
                efficiency: 85,
                stages: {
                    deep: 2.5,
                    light: 5.0,
                    rem: 1.0,
                    wake: 0.5,
                },
            };
        }
    }

    // 获取设备列表
    async getDevices() {
        try {
            const data = await this.makeRequest(this.config.ENDPOINTS.DEVICES);
            return data;
        } catch (error) {
            console.error('获取设备列表失败:', error);
            return [];
        }
    }

    // 获取活动数据
    async getActivities(date = 'today') {
        try {
            const endpoint = `/1/user/-/activities/date/${date}.json`;
            const data = await this.makeRequest(endpoint);
            return data;
        } catch (error) {
            console.error('获取活动数据失败:', error);
            return null;
        }
    }

    // 认证成功回调
    onAuthSuccess() {
        // 触发自定义事件
        const event = new CustomEvent('fitbitAuthSuccess', {
            detail: { userId: this.userId },
        });
        window.dispatchEvent(event);
    }

    // 认证失败回调
    onAuthError(message) {
        // 触发自定义事件
        const event = new CustomEvent('fitbitAuthError', {
            detail: { message },
        });
        window.dispatchEvent(event);
    }

    // 检查是否已认证
    isAuthenticated() {
        return this.isTokenValid();
    }

    // 登出
    logout() {
        this.clearTokens();
        console.log('已登出Fitbit');
    }
}

// 创建全局实例
window.fitbitAPI = new FitbitAPI();

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FitbitAPI;
}
