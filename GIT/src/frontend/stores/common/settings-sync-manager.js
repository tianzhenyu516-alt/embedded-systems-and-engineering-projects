/**
 * 用户设置同步管理器
 * 专门处理用户个人设置的加密存储、云端同步和冲突解决
 */
class SettingsSyncManager {
    constructor() {
        this.STORAGE_KEY = 'encrypted_user_settings';
        this.SYNC_STATUS_KEY = 'settings_sync_status';
        this.LAST_SYNC_KEY = 'settings_last_sync';
        this.VERSION_KEY = 'settings_data_version';
        this.SETTINGS_VERSION = 1;

        this.syncStatus = {
            lastSync: null,
            status: 'idle', // idle, syncing, success, error
            message: '',
            hasChanges: false,
        };

        this.cachedSettings = null;
        this.syncListeners = [];
        this.conflictResolutionStrategy = 'last_write_wins'; // last_write_wins, manual, server_wins

        this.init();
    }

    /**
     * 初始化管理器
     */
    init() {
        this.loadSyncStatus();
        this.setupAutoSync();
    }

    /**
     * 简单加密方法（生产环境应使用更强的加密）
     */
    _simpleEncrypt(data, key) {
        const strData = JSON.stringify(data);
        const encoded = btoa(encodeURIComponent(strData));
        let result = '';
        for (let i = 0; i < encoded.length; i++) {
            const charCode = encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return btoa(result);
    }

    /**
     * 尝试使用指定密钥解密设置
     */
    _tryDecryptWithKey(encrypted, key) {
        const decoded = atob(encrypted);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        const decodedResult = decodeURIComponent(atob(result));
        return JSON.parse(decodedResult);
    }

    /**
     * 尝试解析历史明文设置
     */
    _parsePlainSettings(rawSettings) {
        if (!rawSettings) {
            return null;
        }

        try {
            const parsedSettings = JSON.parse(rawSettings);
            if (parsedSettings && typeof parsedSettings === 'object') {
                return this._mergeWithDefaultSettings(parsedSettings);
            }
        } catch (_error) {
            // 不是 JSON 明文，继续按加密格式处理
        }

        return null;
    }

    /**
     * 简单解密方法
     */
    _simpleDecrypt(encrypted, key) {
        const fallbackKeys = [key, 'default_encryption_key_fallback', 'default_encryption_key']
            .filter(Boolean)
            .filter((candidate, index, list) => list.indexOf(candidate) === index);

        for (const candidateKey of fallbackKeys) {
            try {
                return this._tryDecryptWithKey(encrypted, candidateKey);
            } catch (_error) {
                // 尝试下一个密钥
            }
        }

        return null;
    }

    /**
     * 构建合并后的设置对象
     */
    _mergeWithDefaultSettings(settings = {}) {
        const defaultSettings = this.getDefaultSettings();
        return {
            ...defaultSettings,
            ...settings,
            notification: {
                ...defaultSettings.notification,
                ...(settings.notification || {}),
            },
            privacy: {
                ...defaultSettings.privacy,
                ...(settings.privacy || {}),
            },
            ui: {
                ...defaultSettings.ui,
                ...(settings.ui || {}),
            },
        };
    }

    /**
     * 从旧存储格式恢复设置
     */
    _recoverLegacySettings(rawStoredSettings = null) {
        const plainSettings = this._parsePlainSettings(rawStoredSettings || localStorage.getItem(this.STORAGE_KEY));
        if (plainSettings) {
            console.warn('[SettingsSyncManager] 检测到历史明文 settings 数据，已自动迁移为加密存储');
            return plainSettings;
        }

        try {
            const notificationSettings = JSON.parse(localStorage.getItem('notificationSettings') || 'null');
            const privacySettings = JSON.parse(localStorage.getItem('privacySettings') || 'null');

            if (notificationSettings || privacySettings) {
                console.warn('[SettingsSyncManager] 检测到旧版通知/隐私设置，已自动合并迁移');
                return this._mergeWithDefaultSettings({
                    notification: notificationSettings || {},
                    privacy: privacySettings || {},
                });
            }
        } catch (_error) {
            // 忽略旧格式解析失败
        }

        return null;
    }

    /**
     * 清理损坏的本地设置
     */
    _clearInvalidLocalSettings() {
        console.warn('[SettingsSyncManager] 本地设置数据已损坏且无法恢复，已清理并回退默认设置');
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem('notificationSettings');
        localStorage.removeItem('privacySettings');
        this.cachedSettings = null;
    }

    /**
     * 获取加密密钥（从用户信息中生成）
     */
    _getEncryptionKey() {
        try {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo'));
            if (loginInfo && loginInfo.user && loginInfo.user.id) {
                return loginInfo.user.id + '_settings_key_' + loginInfo.user.username;
            }
            return 'default_encryption_key_fallback';
        } catch (error) {
            return 'default_encryption_key';
        }
    }

    /**
     * 生成用户设置ID
     */
    _getSettingsId() {
        try {
            const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo'));
            if (loginInfo && loginInfo.user) {
                return `settings_${loginInfo.user.id}`;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * 获取当前登录信息
     */
    _getCurrentLoginInfo() {
        try {
            const rawLoginInfo = sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo');
            return rawLoginInfo ? JSON.parse(rawLoginInfo) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * 获取当前用户ID
     */
    _getCurrentUserId() {
        const loginInfo = this._getCurrentLoginInfo();
        return loginInfo?.user?.id || null;
    }

    _isActiveUser(userId) {
        const currentUserId = this._getCurrentUserId();
        return Boolean(userId && currentUserId && userId === currentUserId);
    }

    _clearSyncStateForUserMismatch() {
        this.cachedSettings = null;
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.SYNC_STATUS_KEY);
        localStorage.removeItem(this.LAST_SYNC_KEY);
        localStorage.removeItem(this.VERSION_KEY);
    }

    /**
     * 从本地获取设置（解密后）
     */
    async getLocalSettings() {
        if (this.cachedSettings) {
            return { ...this.cachedSettings };
        }

        try {
            const encrypted = localStorage.getItem(this.STORAGE_KEY);
            if (!encrypted) {
                return this.getDefaultSettings();
            }

            const plainSettings = this._parsePlainSettings(encrypted);
            if (plainSettings) {
                console.warn('[SettingsSyncManager] 检测到历史明文 settings 数据，已自动迁移为加密存储');
                await this.saveLocalSettings(plainSettings);
                return { ...plainSettings };
            }

            const key = this._getEncryptionKey();
            const decrypted = this._simpleDecrypt(encrypted, key);

            if (decrypted) {
                this.cachedSettings = decrypted;
                return { ...decrypted };
            }

            const recoveredSettings = this._recoverLegacySettings();
            if (recoveredSettings) {
                console.info('[SettingsSyncManager] 已从旧格式或异常数据中恢复本地设置，并重新写入加密存储');
                await this.saveLocalSettings(recoveredSettings);
                return { ...recoveredSettings };
            }

            console.warn('[SettingsSyncManager] 本地加密设置解密失败，可能是损坏数据或用户密钥已变更');
            this._clearInvalidLocalSettings();
        } catch (error) {
            console.error('获取本地设置失败:', error);
        }

        return this.getDefaultSettings();
    }

    /**
     * 保存设置到本地（加密后）
     */
    async saveLocalSettings(settings) {
        try {
            const settingsToSave = {
                ...settings,
                _version: this.SETTINGS_VERSION,
                _updatedAt: Date.now(),
                _deviceId: this._getDeviceId(),
            };

            const key = this._getEncryptionKey();
            const encrypted = this._simpleEncrypt(settingsToSave, key);

            localStorage.setItem(this.STORAGE_KEY, encrypted);
            this.cachedSettings = settingsToSave;
            this.syncStatus.hasChanges = true;
            this.saveSyncStatus();

            return true;
        } catch (error) {
            console.error('保存本地设置失败:', error);
            return false;
        }
    }

    /**
     * 获取默认设置
     */
    getDefaultSettings() {
        return {
            notification: {
                healthReminders: true,
                appointmentNotifications: true,
                activityPush: false,
            },
            privacy: {
                dataCollection: true,
                locationAccess: true,
            },
            ui: {
                theme: 'light',
                language: 'zh-CN',
            },
            _version: this.SETTINGS_VERSION,
            _updatedAt: Date.now(),
            _deviceId: this._getDeviceId(),
        };
    }

    /**
     * 获取设备ID
     */
    _getDeviceId() {
        let deviceId = localStorage.getItem('settings_device_id');
        if (!deviceId) {
            deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('settings_device_id', deviceId);
        }
        return deviceId;
    }

    /**
     * 更新特定设置
     */
    async updateSetting(category, key, value) {
        const settings = await this.getLocalSettings();

        if (!settings[category]) {
            settings[category] = {};
        }

        settings[category][key] = value;
        await this.saveLocalSettings(settings);

        this.notifySyncListeners('setting_changed', { category, key, value });

        return true;
    }

    /**
     * 批量更新设置
     */
    async updateSettings(updates) {
        const settings = await this.getLocalSettings();

        Object.keys(updates).forEach(category => {
            if (!settings[category]) {
                settings[category] = {};
            }
            Object.assign(settings[category], updates[category]);
        });

        await this.saveLocalSettings(settings);
        this.notifySyncListeners('settings_updated', updates);

        return true;
    }

    /**
     * 推送设置到服务器
     */
    async pushSettings() {
        if (!window.apiService) {
            console.warn('API服务未初始化，无法推送设置');
            return { success: false, error: 'API服务未初始化' };
        }

        this.updateSyncStatus('syncing', '正在同步设置...');

        try {
            const settings = await this.getLocalSettings();
            const settingsId = this._getSettingsId();
            const userId = this._getCurrentUserId();

            if (!settingsId || !userId) {
                throw new Error('用户未登录');
            }

            const response = await window.apiService.pushUserSettings({
                id: settingsId,
                user_id: userId,
                settings: settings,
                version: settings._version || 1,
                updated_at: settings._updatedAt,
                device_id: settings._deviceId,
            });

            if (response.success) {
                this.syncStatus.hasChanges = false;
                this.syncStatus.lastSync = new Date().toISOString();
                this.updateSyncStatus('success', '设置同步成功');
                this.saveLastSyncTime();
                return { success: true };
            } else {
                throw new Error(response.message || '推送设置失败');
            }
        } catch (error) {
            console.error('推送设置失败:', error);
            this.updateSyncStatus('error', error.message || '同步失败');
            return { success: false, error: error.message };
        }
    }

    /**
     * 从服务器拉取设置
     */
    async pullSettings() {
        if (!window.apiService) {
            console.warn('API服务未初始化，无法拉取设置');
            return { success: false, error: 'API服务未初始化' };
        }

        this.updateSyncStatus('syncing', '正在获取最新设置...');

        try {
            const userId = this._getCurrentUserId();
            if (!userId) {
                throw new Error('用户未登录');
            }

            const response = await window.apiService.pullUserSettings(userId);

            if (response.success) {
                const activeUserId = this._getCurrentUserId();
                if (activeUserId !== userId) {
                    throw new Error('当前登录用户已切换，请重新同步设置');
                }

                const serverSettings = this.extractSettingsData(response.data);
                const localSettings = await this.getLocalSettings();

                if (!serverSettings) {
                    const settingsId = this._getSettingsId();
                    if (!settingsId) {
                        throw new Error('用户设置标识不存在');
                    }

                    const pushResponse = await window.apiService.pushUserSettings({
                        id: settingsId,
                        user_id: userId,
                        settings: localSettings,
                        version: localSettings._version || 1,
                        updated_at: localSettings._updatedAt,
                        device_id: localSettings._deviceId,
                    });

                    if (!pushResponse.success) {
                        throw new Error(pushResponse.message || '初始化云端设置失败');
                    }

                    this.syncStatus.hasChanges = false;
                    this.syncStatus.lastSync = new Date().toISOString();
                    this.updateSyncStatus('success', '云端暂无设置，已初始化同步本地设置');
                    this.saveLastSyncTime();
                    this.notifySyncListeners('settings_initialized', { settings: localSettings });
                    return { success: true, settings: localSettings, initialized: true };
                }

                const serverDeviceId = serverSettings?._deviceId || null;
                if (serverDeviceId && !this._isActiveUser(userId)) {
                    this._clearSyncStateForUserMismatch();
                    throw new Error('检测到旧登录状态残留，请重新登录后再试');
                }

                const conflict = this.detectConflict(localSettings, serverSettings);

                if (conflict.hasConflict) {
                    const resolvedSettings = this.resolveConflict(localSettings, serverSettings, conflict);
                    await this.saveLocalSettings(resolvedSettings);
                    this.notifySyncListeners('conflict_resolved', {
                        local: localSettings,
                        server: serverSettings,
                        resolved: resolvedSettings,
                    });
                } else {
                    await this.saveLocalSettings(serverSettings);
                }

                this.syncStatus.lastSync = new Date().toISOString();
                this.updateSyncStatus('success', '设置已更新');
                this.saveLastSyncTime();

                return { success: true, settings: serverSettings };
            } else {
                throw new Error(response.message || '拉取设置失败');
            }
        } catch (error) {
            console.error('拉取设置失败:', error);
            this.updateSyncStatus('error', error.message || '获取设置失败');
            return { success: false, error: error.message };
        }
    }

    /**
     * 提取设置数据
     */
    extractSettingsData(data) {
        if (!data) {
            return null;
        }

        if (data.settings && typeof data.settings === 'object') {
            return data.settings;
        }

        return typeof data === 'object' ? data : null;
    }

    /**
     * 检测设置冲突
     */
    detectConflict(local, server) {
        const localSettings = local && typeof local === 'object' ? local : {};
        const serverSettings = server && typeof server === 'object' ? server : {};

        const localTime = localSettings._updatedAt || 0;
        const serverTime = serverSettings._updatedAt || 0;

        const hasConflict = localTime > 0 && serverTime > 0 &&
            Math.abs(localTime - serverTime) > 5000 && // 超过5秒视为潜在冲突
            localSettings._deviceId !== serverSettings._deviceId;

        return {
            hasConflict,
            localTime,
            serverTime,
            localDevice: localSettings._deviceId || null,
            serverDevice: serverSettings._deviceId || null,
        };
    }

    /**
     * 解决设置冲突
     */
    resolveConflict(local, server, conflict) {
        switch (this.conflictResolutionStrategy) {
            case 'last_write_wins':
                return conflict.localTime > conflict.serverTime ? local : server;

            case 'server_wins':
                return server;

            case 'manual':
                this.notifySyncListeners('conflict_detected', {
                    local,
                    server,
                    conflict,
                });
                return local; // 默认返回本地，等待用户选择

            default:
                return conflict.localTime > conflict.serverTime ? local : server;
        }
    }

    /**
     * 执行完整同步（先拉取后推送）
     */
    async syncSettings() {
        if (this.syncStatus.status === 'syncing') {
            return { success: false, error: '同步正在进行中' };
        }

        try {
            await this.pullSettings();
            await this.pushSettings();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 更新同步状态
     */
    updateSyncStatus(status, message = '') {
        this.syncStatus.status = status;
        this.syncStatus.message = message;
        this.saveSyncStatus();
        this.notifySyncListeners('status_changed', { status, message });
    }

    /**
     * 保存同步状态
     */
    saveSyncStatus() {
        localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(this.syncStatus));
    }

    /**
     * 加载同步状态
     */
    loadSyncStatus() {
        try {
            const saved = localStorage.getItem(this.SYNC_STATUS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(this.syncStatus, parsed);
            }

            const lastSync = localStorage.getItem(this.LAST_SYNC_KEY);
            if (lastSync) {
                this.syncStatus.lastSync = lastSync;
            }
        } catch (error) {
            console.error('加载同步状态失败:', error);
        }
    }

    /**
     * 保存最后同步时间
     */
    saveLastSyncTime() {
        localStorage.setItem(this.LAST_SYNC_KEY, this.syncStatus.lastSync);
    }

    /**
     * 获取同步状态
     */
    getSyncStatus() {
        return { ...this.syncStatus };
    }

    /**
     * 添加同步监听器
     */
    addSyncListener(callback) {
        this.syncListeners.push(callback);
    }

    /**
     * 移除同步监听器
     */
    removeSyncListener(callback) {
        this.syncListeners = this.syncListeners.filter(listener => listener !== callback);
    }

    /**
     * 通知监听器
     */
    notifySyncListeners(event, data) {
        this.syncListeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('同步监听器执行失败:', error);
            }
        });
    }

    /**
     * 设置自动同步
     */
    setupAutoSync() {
        window.addEventListener('online', () => {
            if (this.syncStatus.hasChanges) {
                this.syncSettings().catch(err => console.error('网络恢复后同步失败:', err));
            }
        });

        setInterval(() => {
            if (navigator.onLine && this.syncStatus.hasChanges) {
                this.syncSettings().catch(err => console.error('定时同步失败:', err));
            }
        }, 2 * 60 * 1000); // 每2分钟检查一次
    }

    /**
     * 手动触发同步
     */
    async triggerManualSync() {
        return await this.syncSettings();
    }

    /**
     * 设置冲突解决策略
     */
    setConflictResolutionStrategy(strategy) {
        if (['last_write_wins', 'manual', 'server_wins'].includes(strategy)) {
            this.conflictResolutionStrategy = strategy;
        }
    }

    /**
     * 重置设置为默认值
     */
    async resetToDefaults() {
        const defaults = this.getDefaultSettings();
        await this.saveLocalSettings(defaults);
        this.notifySyncListeners('settings_reset', defaults);
        return true;
    }
}

window.settingsSyncManager = new SettingsSyncManager();
