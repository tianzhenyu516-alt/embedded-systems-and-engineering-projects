/**
 * 实时数据同步管理器
 * 实现跨页面实时数据同步功能
 * 支持 BroadcastChannel 和 localStorage 双重机制
 */
class RealTimeDataSync {
    constructor() {
        this.channelName = 'health-data-sync';
        this.storageKey = 'health_data_latest';
        this.syncStateKey = 'health_data_sync_state';
        this.channel = null;
        this.listeners = [];
        this.syncState = {
            connected: false,
            lastSync: null,
            error: null,
            retryCount: 0
        };
        this.retryDelay = 1000;
        this.maxRetryDelay = 30000;
        this.init();
    }

    /**
     * 初始化同步管理器
     */
    init() {
        try {
            this.initBroadcastChannel();
            this.initStorageListener();
            this.updateSyncState({ connected: true });
            console.log('RealTimeDataSync 初始化成功');
        } catch (error) {
            console.error('RealTimeDataSync 初始化失败:', error);
            this.updateSyncState({ 
                connected: false, 
                error: error.message 
            });
            this.scheduleRetry();
        }
    }

    /**
     * 初始化 BroadcastChannel
     */
    initBroadcastChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            this.channel = new BroadcastChannel(this.channelName);
            
            this.channel.onmessage = (event) => {
                this.handleSyncMessage(event.data);
            };

            this.channel.onmessageerror = (error) => {
                console.error('BroadcastChannel 消息错误:', error);
                this.updateSyncState({ 
                    error: '消息接收错误' 
                });
            };
        }
    }

    /**
     * 初始化 localStorage 变化监听
     */
    initStorageListener() {
        window.addEventListener('storage', (event) => {
            if (event.key === this.storageKey && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    this.handleSyncMessage(data, false);
                } catch (error) {
                    console.error('解析存储数据失败:', error);
                }
            }
        });
    }

    /**
     * 处理同步消息
     */
    handleSyncMessage(data, fromBroadcast = true) {
        if (!data || !data.type) return;

        this.updateSyncState({ 
            lastSync: Date.now(),
            error: null,
            retryCount: 0
        });

        // 通知所有监听器
        this.notifyListeners(data);

        // 如果是 BroadcastChannel 来的，也更新 localStorage 作为备份
        if (fromBroadcast) {
            this.updateLocalStorage(data);
        }
    }

    /**
     * 发送同步消息
     */
    sendSyncMessage(type, payload) {
        const message = {
            type,
            payload,
            timestamp: Date.now(),
            source: this.getSourceId()
        };

        // 通过 BroadcastChannel 发送
        if (this.channel) {
            try {
                this.channel.postMessage(message);
            } catch (error) {
                console.error('BroadcastChannel 发送失败:', error);
            }
        }

        // 同时更新 localStorage
        this.updateLocalStorage(message);

        // 本地也处理一下（当前页面）
        this.handleSyncMessage(message, false);
    }

    /**
     * 更新 localStorage
     */
    updateLocalStorage(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('更新 localStorage 失败:', error);
        }
    }

    /**
     * 获取源标识
     */
    getSourceId() {
        let sourceId = sessionStorage.getItem('sync_source_id');
        if (!sourceId) {
            sourceId = `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('sync_source_id', sourceId);
        }
        return sourceId;
    }

    /**
     * 更新同步状态
     */
    updateSyncState(updates) {
        this.syncState = { ...this.syncState, ...updates };
        localStorage.setItem(this.syncStateKey, JSON.stringify(this.syncState));
    }

    /**
     * 获取同步状态
     */
    getSyncState() {
        try {
            const saved = localStorage.getItem(this.syncStateKey);
            if (saved) {
                return { ...this.syncState, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('获取同步状态失败:', error);
        }
        return this.syncState;
    }

    /**
     * 订阅数据变化
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * 通知所有监听器
     */
    notifyListeners(data) {
        this.listeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error('监听器执行错误:', error);
            }
        });
    }

    /**
     * 同步健康数据更新
     */
    syncHealthDataUpdate(healthData) {
        this.sendSyncMessage('HEALTH_DATA_UPDATED', healthData);
    }

    /**
     * 同步指标数据更新
     */
    syncMetricUpdate(metricId, value, timestamp) {
        this.sendSyncMessage('METRIC_UPDATED', {
            metricId,
            value,
            timestamp: timestamp || Date.now()
        });
    }

    /**
     * 请求数据同步
     */
    requestDataSync() {
        this.sendSyncMessage('REQUEST_DATA_SYNC', {});
    }

    /**
     * 响应数据同步请求
     */
    respondDataSync(data) {
        this.sendSyncMessage('RESPOND_DATA_SYNC', data);
    }

    /**
     * 计划重试
     */
    scheduleRetry() {
        if (this.syncState.retryCount < 5) {
            const delay = Math.min(
                this.retryDelay * Math.pow(2, this.syncState.retryCount),
                this.maxRetryDelay
            );
            
            setTimeout(() => {
                console.log(`尝试重新初始化同步管理器 (第 ${this.syncState.retryCount + 1} 次)`);
                this.updateSyncState({ retryCount: this.syncState.retryCount + 1 });
                this.init();
            }, delay);
        }
    }

    /**
     * 销毁同步管理器
     */
    destroy() {
        if (this.channel) {
            this.channel.close();
            this.channel = null;
        }
        this.listeners = [];
    }
}

// 创建全局实例
const realTimeDataSync = new RealTimeDataSync();

// 暴露到全局
if (typeof window !== 'undefined') {
    window.realTimeDataSync = realTimeDataSync;
}

// 支持 ES6 模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = realTimeDataSync;
} else if (typeof define === 'function' && define.amd) {
    define([], function() { return realTimeDataSync; });
} else if (typeof window !== 'undefined') {
    window.realTimeDataSync = realTimeDataSync;
}
