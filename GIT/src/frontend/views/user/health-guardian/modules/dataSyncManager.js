import { userAccountManager } from './userAccountManager.js';

const SYNC_STATUS = {
    IDLE: 'idle',
    SYNCING: 'syncing',
    SUCCESS: 'success',
    ERROR: 'error'
};

class DataSyncManager {
    constructor() {
        this.status = SYNC_STATUS.IDLE;
        this.lastSyncTime = null;
        this.syncInterval = null;
        this.listeners = [];
        this.pendingChanges = [];
        this.autoSyncEnabled = true;
        this.autoSyncInterval = 30000;

        this.init();
    }

    init() {
        userAccountManager.subscribe((user) => {
            if (user) {
                this.startAutoSync();
                this.syncFromCloud();
            } else {
                this.stopAutoSync();
            }
        });

        if (userAccountManager.isLoggedIn()) {
            this.startAutoSync();
        }
    }

    getStorageKey(userId) {
        return `healthGuardian_data_${userId}`;
    }

    getSyncMetadataKey(userId) {
        return `healthGuardian_sync_${userId}`;
    }

    generateDataId() {
        return 'data_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async syncToCloud(data) {
        const userId = userAccountManager.getCurrentUserId();
        if (!userId) {
            return { success: false, error: '未登录' };
        }

        this.setStatus(SYNC_STATUS.SYNCING);

        try {
            const storageKey = this.getStorageKey(userId);
            const metadataKey = this.getSyncMetadataKey(userId);

            const syncMetadata = {
                syncId: this.generateDataId(),
                userId,
                syncTime: new Date().toISOString(),
                dataVersion: Date.now(),
                dataHash: this.generateDataHash(data),
                checksum: this.generateChecksum(data)
            };

            localStorage.setItem(storageKey, JSON.stringify(data));
            localStorage.setItem(metadataKey, JSON.stringify(syncMetadata));

            this.lastSyncTime = new Date().toISOString();
            this.setStatus(SYNC_STATUS.SUCCESS);
            this.notifyListeners();

            console.log('[DataSyncManager] 数据同步到云端成功', syncMetadata);
            return { success: true, metadata: syncMetadata };
        } catch (error) {
            console.error('[DataSyncManager] 同步到云端失败:', error);
            this.setStatus(SYNC_STATUS.ERROR);
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    async syncFromCloud() {
        const userId = userAccountManager.getCurrentUserId();
        if (!userId) {
            return { success: false, error: '未登录' };
        }

        this.setStatus(SYNC_STATUS.SYNCING);

        try {
            const storageKey = this.getStorageKey(userId);
            const metadataKey = this.getSyncMetadataKey(userId);

            const savedData = localStorage.getItem(storageKey);
            const savedMetadata = localStorage.getItem(metadataKey);

            if (!savedData) {
                this.setStatus(SYNC_STATUS.IDLE);
                return { success: true, data: null, isNew: true };
            }

            const data = JSON.parse(savedData);
            const metadata = savedMetadata ? JSON.parse(savedMetadata) : null;

            if (metadata && !this.verifyDataIntegrity(data, metadata)) {
                console.warn('[DataSyncManager] 数据完整性校验失败');
            }

            this.lastSyncTime = new Date().toISOString();
            this.setStatus(SYNC_STATUS.SUCCESS);
            this.notifyListeners();

            console.log('[DataSyncManager] 从云端同步数据成功', metadata);
            return { success: true, data, metadata };
        } catch (error) {
            console.error('[DataSyncManager] 从云端同步失败:', error);
            this.setStatus(SYNC_STATUS.ERROR);
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    async syncData(localData) {
        const userId = userAccountManager.getCurrentUserId();
        if (!userId) {
            return { success: false, error: '未登录' };
        }

        try {
            const cloudResult = await this.syncFromCloud();

            if (cloudResult.success && cloudResult.data) {
                const mergedData = this.mergeData(cloudResult.data, localData);
                await this.syncToCloud(mergedData);
                return { success: true, data: mergedData };
            } else {
                await this.syncToCloud(localData);
                return { success: true, data: localData };
            }
        } catch (error) {
            console.error('[DataSyncManager] 数据同步失败:', error);
            return { success: false, error: error.message };
        }
    }

    mergeData(cloudData, localData) {
        if (!cloudData) return localData;
        if (!localData) return cloudData;

        const cloudTimestamp = cloudData.lastModified || 0;
        const localTimestamp = localData.lastModified || 0;

        if (cloudTimestamp > localTimestamp) {
            return {
                ...cloudData,
                ...localData,
                lastModified: Math.max(cloudTimestamp, localTimestamp)
            };
        }

        return {
            ...localData,
            ...cloudData,
            lastModified: Math.max(cloudTimestamp, localTimestamp)
        };
    }

    generateDataHash(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    generateChecksum(data) {
        const str = JSON.stringify(data);
        let checksum = 0;
        for (let i = 0; i < str.length; i++) {
            checksum = (checksum + str.charCodeAt(i)) % 256;
        }
        return checksum;
    }

    verifyDataIntegrity(data, metadata) {
        if (!metadata) return true;

        const dataHash = this.generateDataHash(data);
        const checksum = this.generateChecksum(data);

        return dataHash === metadata.dataHash && checksum === metadata.checksum;
    }

    startAutoSync() {
        if (!this.autoSyncEnabled) return;
        
        this.stopAutoSync();
        this.syncInterval = setInterval(() => {
            this.autoSync();
        }, this.autoSyncInterval);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async autoSync() {
        if (this.status === SYNC_STATUS.SYNCING) return;
        if (!userAccountManager.isLoggedIn()) return;

        console.log('[DataSyncManager] 执行自动同步...');
    }

    setAutoSyncEnabled(enabled) {
        this.autoSyncEnabled = enabled;
        if (enabled) {
            this.startAutoSync();
        } else {
            this.stopAutoSync();
        }
    }

    setAutoSyncInterval(intervalMs) {
        this.autoSyncInterval = intervalMs;
        if (this.autoSyncEnabled && userAccountManager.isLoggedIn()) {
            this.startAutoSync();
        }
    }

    recordChange(changeType, dataType, data) {
        const change = {
            id: this.generateDataId(),
            type: changeType,
            dataType,
            data,
            timestamp: new Date().toISOString(),
            userId: userAccountManager.getCurrentUserId()
        };
        this.pendingChanges.push(change);
        return change;
    }

    setStatus(status) {
        this.status = status;
    }

    getStatus() {
        return this.status;
    }

    getLastSyncTime() {
        return this.lastSyncTime;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners() {
        const statusInfo = {
            status: this.status,
            lastSyncTime: this.lastSyncTime
        };
        this.listeners.forEach(listener => listener(statusInfo));
    }

    async forceSync(localData) {
        return await this.syncData(localData);
    }

    clearUserData(userId) {
        const storageKey = this.getStorageKey(userId);
        const metadataKey = this.getSyncMetadataKey(userId);
        localStorage.removeItem(storageKey);
        localStorage.removeItem(metadataKey);
    }
}

export const dataSyncManager = new DataSyncManager();
export { SYNC_STATUS };
