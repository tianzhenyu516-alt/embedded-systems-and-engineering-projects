/**
 * 数据同步管理器
 * 使用IndexedDB存储本地数据副本和变更日志
 * 实现多设备数据同步功能
 */
class SyncManager {
    constructor() {
        this.dbName = 'HealthGuardianSync';
        this.dbVersion = 1;
        this.db = null;
        this.deviceId = this.getOrCreateDeviceId();
        this.syncInProgress = false;
        this.pendingChanges = [];

        // 需要同步的表配置
        this.syncTables = {
            health_data: {
                storeName: 'healthData',
                idField: 'id',
                userField: 'user_id',
            },
            exercise_plans: {
                storeName: 'exercisePlans',
                idField: 'id',
                userField: 'user_id',
            },
            chat_messages: {
                storeName: 'chatMessages',
                idField: 'id',
                userField: 'user_id',
            },
            user_settings: {
                storeName: 'userSettings',
                idField: 'id',
                userField: 'user_id',
            },
        };
    }

    /**
     * 获取或创建设备ID
     */
    getOrCreateDeviceId() {
        let deviceId = localStorage.getItem('sync_device_id');
        if (!deviceId) {
            // 生成唯一设备ID
            deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('sync_device_id', deviceId);
        }
        return deviceId;
    }

    /**
     * 初始化IndexedDB数据库
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB打开失败:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB初始化成功');
                resolve(this.db);
            };

            request.onupgradeneeded = event => {
                const db = event.target.result;

                // 为每个同步表创建对象存储
                Object.values(this.syncTables).forEach(tableConfig => {
                    if (!db.objectStoreNames.contains(tableConfig.storeName)) {
                        const store = db.createObjectStore(tableConfig.storeName, {
                            keyPath: tableConfig.idField,
                        });
                        store.createIndex('user_id', 'user_id', { unique: false });
                        store.createIndex('version', 'version', { unique: false });
                        store.createIndex('is_deleted', 'is_deleted', { unique: false });
                    }
                });

                // 创建变更日志存储
                if (!db.objectStoreNames.contains('pendingChanges')) {
                    const changeStore = db.createObjectStore('pendingChanges', {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    changeStore.createIndex('table', 'table', { unique: false });
                    changeStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // 创建同步状态存储
                if (!db.objectStoreNames.contains('syncStatus')) {
                    db.createObjectStore('syncStatus', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * 保存数据到本地IndexedDB
     */
    async saveLocalData(tableName, data) {
        if (!this.db) {
            await this.init();
        }

        const tableConfig = this.syncTables[tableName];
        if (!tableConfig) {
            throw new Error(`不支持的表: ${tableName}`);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([tableConfig.storeName], 'readwrite');
            const store = transaction.objectStore(tableConfig.storeName);

            // 确保数据包含必要的同步字段
            const dataToSave = {
                ...data,
                version: data.version || 1,
                is_deleted: data.is_deleted || 0,
                last_modified_by_device: this.deviceId,
                _local_updated: Date.now(),
            };

            const request = store.put(dataToSave);

            request.onsuccess = () => {
                resolve(dataToSave);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 从本地IndexedDB获取数据
     */
    async getLocalData(tableName, userId) {
        if (!this.db) {
            await this.init();
        }

        const tableConfig = this.syncTables[tableName];
        if (!tableConfig) {
            throw new Error(`不支持的表: ${tableName}`);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([tableConfig.storeName], 'readonly');
            const store = transaction.objectStore(tableConfig.storeName);
            const index = store.index('user_id');

            const request = index.getAll(userId);
            request.onsuccess = () => {
                // 过滤掉已删除的记录
                const data = request.result.filter(item => !item.is_deleted);
                resolve(data);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 记录本地变更到待同步队列
     */
    async recordChange(tableName, action, data, recordId) {
        if (!this.db) {
            await this.init();
        }

        const change = {
            table: tableName,
            action, // 'create', 'update', 'delete'
            data,
            record_id: recordId,
            timestamp: Date.now(),
            synced: false,
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pendingChanges'], 'readwrite');
            const store = transaction.objectStore('pendingChanges');

            const request = store.add(change);
            request.onsuccess = () => {
                resolve(change);
            };
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 获取所有待同步的变更
     */
    async getPendingChanges() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pendingChanges'], 'readonly');
            const store = transaction.objectStore('pendingChanges');
            const index = store.index('timestamp');

            const request = index.getAll();
            request.onsuccess = () => {
                const changes = request.result.filter(change => !change.synced);
                resolve(changes);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 标记变更已同步
     */
    async markChangeSynced(changeId) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pendingChanges'], 'readwrite');
            const store = transaction.objectStore('pendingChanges');

            const request = store.get(changeId);
            request.onsuccess = () => {
                const change = request.result;
                if (change) {
                    change.synced = true;
                    const updateRequest = store.put(change);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    resolve();
                }
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 保存同步状态
     */
    async saveSyncStatus(lastSyncedVersion) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncStatus'], 'readwrite');
            const store = transaction.objectStore('syncStatus');

            const status = {
                key: 'last_synced_version',
                value: lastSyncedVersion,
                timestamp: Date.now(),
            };

            const request = store.put(status);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取同步状态
     */
    async getSyncStatus() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncStatus'], 'readonly');
            const store = transaction.objectStore('syncStatus');

            const request = store.get('last_synced_version');
            request.onsuccess = () => {
                const status = request.result;
                resolve(status ? status.value : 0);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 推送本地变更到服务器
     */
    async pushChanges() {
        if (!window.apiService) {
            throw new Error('API服务未初始化');
        }

        if (this.syncInProgress) {
            console.log('同步正在进行中，跳过本次请求');
            return;
        }

        this.syncInProgress = true;

        try {
            // 获取待同步的变更
            const pendingChanges = await this.getPendingChanges();

            if (pendingChanges.length === 0) {
                console.log('没有待同步的变更');
                return { updated: [], conflicts: [], errors: [] };
            }

            // 组织数据：分离更新和删除
            const updates = [];
            const deletions = [];

            for (const change of pendingChanges) {
                const tableConfig = this.syncTables[change.table];
                if (!tableConfig) {
                    continue;
                }

                if (change.action === 'delete') {
                    deletions.push({
                        table: change.table,
                        id: change.record_id,
                    });
                } else {
                    // 获取完整数据
                    const localData = await this.getLocalData(
                        change.table,
                        change.data[tableConfig.userField],
                    );
                    const record = localData.find(
                        item => item[tableConfig.idField] === change.record_id,
                    );

                    if (record) {
                        updates.push({
                            table: change.table,
                            id: change.record_id,
                            data: record,
                        });
                    }
                }
            }

            // 调用后端API
            const response = await window.apiService.request('/sync/push', {
                method: 'POST',
                body: {
                    device_id: this.deviceId,
                    updates,
                    deletions,
                },
            });

            if (response.success) {
                // 标记变更已同步
                for (const change of pendingChanges) {
                    await this.markChangeSynced(change.id);
                }

                console.log('推送同步完成:', response.data);
                return response.data;
            } else {
                throw new Error(response.message || '推送同步失败');
            }
        } catch (error) {
            console.error('推送同步失败:', error);
            throw error;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * 从服务器拉取变更
     */
    async pullChanges() {
        if (!window.apiService) {
            throw new Error('API服务未初始化');
        }

        try {
            const lastSyncedVersion = await this.getSyncStatus();

            // 调用后端API
            const response = await window.apiService.request('/sync/pull', {
                method: 'POST',
                body: {
                    device_id: this.deviceId,
                    last_synced_version: lastSyncedVersion,
                },
            });

            if (response.success) {
                const { changes, latest_version } = response.data;

                // 将服务器变更应用到本地
                for (const change of changes) {
                    const tableConfig = this.syncTables[change.table];
                    if (!tableConfig) {
                        continue;
                    }

                    if (change.data.is_deleted) {
                        // 删除本地记录
                        await this.deleteLocalData(change.table, change.id);
                    } else {
                        // 更新或创建本地记录
                        await this.saveLocalData(change.table, change.data);
                    }
                }

                // 更新同步状态
                await this.saveSyncStatus(latest_version);

                console.log('拉取同步完成，收到', changes.length, '条变更');
                return { changes, latestVersion: latest_version };
            } else {
                throw new Error(response.message || '拉取同步失败');
            }
        } catch (error) {
            console.error('拉取同步失败:', error);
            throw error;
        }
    }

    /**
     * 删除本地数据
     */
    async deleteLocalData(tableName, recordId) {
        if (!this.db) {
            await this.init();
        }

        const tableConfig = this.syncTables[tableName];
        if (!tableConfig) {
            throw new Error(`不支持的表: ${tableName}`);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([tableConfig.storeName], 'readwrite');
            const store = transaction.objectStore(tableConfig.storeName);

            const request = store.delete(recordId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 执行完整同步（先拉取，后推送）
     */
    async sync() {
        try {
            console.log('开始完整同步...');

            // 1. 先拉取服务器变更
            await this.pullChanges();

            // 2. 再推送本地变更
            await this.pushChanges();

            console.log('完整同步完成');
            return { success: true };
        } catch (error) {
            console.error('同步失败:', error);
            throw error;
        }
    }

    /**
     * 监听网络状态，自动同步
     */
    setupAutoSync() {
        // 监听网络恢复事件
        window.addEventListener('online', () => {
            console.log('网络已恢复，自动触发同步');
            this.sync().catch(err => {
                console.error('自动同步失败:', err);
            });
        });

        // 定期同步（每5分钟）
        setInterval(
            () => {
                if (navigator.onLine) {
                    this.sync().catch(err => {
                        console.error('定期同步失败:', err);
                    });
                }
            },
            5 * 60 * 1000,
        );
    }
}

// 创建全局实例
window.syncManager = new SyncManager();

// 自动初始化
if (typeof window !== 'undefined') {
    window.syncManager
        .init()
        .then(() => {
            console.log('SyncManager初始化完成');
            // 设置自动同步
            window.syncManager.setupAutoSync();
        })
        .catch(err => {
            console.error('SyncManager初始化失败:', err);
        });
}
