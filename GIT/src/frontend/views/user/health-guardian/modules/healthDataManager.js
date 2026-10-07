import { userAccountManager } from './userAccountManager.js';
import { dataSyncManager } from './dataSyncManager.js';

function getHealthApiService() {
    return window.apiService && !window.apiService.useLocalStorage ? window.apiService : null;
}

export const HEALTH_INDICATORS = {
    HEART_RATE: {
        id: 'heartRate',
        name: '心率',
        unit: 'bpm',
        color: '#FF3B30',
        min: 40,
        max: 200,
        normalMin: 60,
        normalMax: 100,
    },
    BLOOD_PRESSURE_SYSTOLIC: {
        id: 'bloodPressureSystolic',
        name: '收缩压',
        unit: 'mmHg',
        color: '#FF9500',
        min: 70,
        max: 220,
        normalMin: 90,
        normalMax: 140,
    },
    BLOOD_PRESSURE_DIASTOLIC: {
        id: 'bloodPressureDiastolic',
        name: '舒张压',
        unit: 'mmHg',
        color: '#FFB340',
        min: 40,
        max: 140,
        normalMin: 60,
        normalMax: 90,
    },
    SLEEP_HOURS: {
        id: 'sleepHours',
        name: '睡眠时长',
        unit: '小时',
        color: '#5856D6',
        min: 0,
        max: 24,
        normalMin: 7,
        normalMax: 9,
    },
    STEPS: {
        id: 'steps',
        name: '运动时长',
        unit: '分钟',
        color: '#34C759',
        min: 0,
        max: 720,
        normalMin: 60,
        normalMax: 120,
    },
    WEIGHT: {
        id: 'weight',
        name: '体重',
        unit: 'kg',
        color: '#5AC8FA',
        min: 20,
        max: 300,
        normalMin: 45,
        normalMax: 90,
    },
};

export const DATA_SOURCES = {
    MANUAL: 'manual',
    DEVICE: 'device',
    ALL: 'all',
};

export const TIME_RANGES = {
    DAY: { id: 'day', name: '今日', days: 1 },
    WEEK: { id: 'week', name: '近7天', days: 7 },
    MONTH: { id: 'month', name: '近30天', days: 30 },
    QUARTER: { id: 'quarter', name: '近90天', days: 90 },
    YEAR: { id: 'year', name: '近1年', days: 365 },
};

const BASE_STORAGE_KEY = 'healthData';
const LEGACY_STEP_COUNT_THRESHOLD = 720;
const LEGACY_STEPS_MIGRATION_VERSION = 2;

class HealthDataManager {
    constructor() {
        this.data = this.loadData();
        this.listeners = [];
        this.initUserBinding();
    }

    getStorageKey() {
        const userId = userAccountManager.getCurrentUserId();
        return userId ? `${BASE_STORAGE_KEY}_${userId}` : BASE_STORAGE_KEY;
    }

    initUserBinding() {
        userAccountManager.subscribe((user) => {
            if (user) {
                this.loadUserData();
            } else {
                this.data = this.createEmptyData();
                this.notifyListeners();
            }
        });
    }

    createEmptyData() {
        return {
            manual: [],
            device: [],
            chatHistory: [],
            consultationHistory: [],
            viewHistory: [],
            lastModified: Date.now(),
            userId: userAccountManager.getCurrentUserId()
        };
    }

    getLegacyMigrationStorageKey() {
        const userId = userAccountManager.getCurrentUserId();
        return userId ? `${BASE_STORAGE_KEY}_migration_${userId}` : `${BASE_STORAGE_KEY}_migration_guest`;
    }

    markLegacyStepsMigrationDone() {
        localStorage.setItem(this.getLegacyMigrationStorageKey(), String(LEGACY_STEPS_MIGRATION_VERSION));
    }

    hasLegacyStepsMigrationRun() {
        return Number(localStorage.getItem(this.getLegacyMigrationStorageKey()) || 0) >= LEGACY_STEPS_MIGRATION_VERSION;
    }

    convertLegacyStepsValue(value) {
        if (value == null) {
            return value;
        }

        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
            return value;
        }

        if (numericValue <= LEGACY_STEP_COUNT_THRESHOLD) {
            return numericValue;
        }

        return Math.max(1, Math.round(numericValue / 100));
    }

    migrateLegacyStepsInRecord(record) {
        if (!record || !record.indicators || record.indicators.steps == null) {
            return false;
        }

        const originalValue = Number(record.indicators.steps);
        const convertedValue = this.convertLegacyStepsValue(originalValue);
        if (convertedValue === originalValue) {
            return false;
        }

        record.indicators.steps = convertedValue;
        record.metadata = {
            ...(record.metadata || {}),
            legacyStepsMigrated: true,
            legacyStepsOriginalValue: originalValue,
        };
        return true;
    }

    migrateLegacyStepsInDataSet(data) {
        if (!data) {
            return false;
        }

        let changed = false;
        ['manual', 'device'].forEach(sourceKey => {
            const records = Array.isArray(data[sourceKey]) ? data[sourceKey] : [];
            records.forEach(record => {
                if (this.migrateLegacyStepsInRecord(record)) {
                    changed = true;
                }
            });
        });

        return changed;
    }

    migrateLegacyStepsData(data, { persist = true } = {}) {
        if (!data || this.hasLegacyStepsMigrationRun()) {
            return false;
        }

        const changed = this.migrateLegacyStepsInDataSet(data);
        this.markLegacyStepsMigrationDone();

        if (changed && persist) {
            data.lastModified = Date.now();
            const storageKey = this.getStorageKey();
            localStorage.setItem(storageKey, JSON.stringify(data));
        }

        return changed;
    }

    migrateLegacyBackendHealthData(records = []) {
        return records.map(record => {
            if (!record || record.steps == null) {
                return record;
            }

            const convertedSteps = this.convertLegacyStepsValue(record.steps);
            if (convertedSteps === record.steps) {
                return record;
            }

            return {
                ...record,
                steps: convertedSteps,
                metadata: {
                    ...(record.metadata || {}),
                    legacyStepsMigrated: true,
                    legacyStepsOriginalValue: Number(record.steps),
                },
            };
        });
    }

    loadData() {
        try {
            const storageKey = this.getStorageKey();
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                this.migrateLegacyStepsData(data, { persist: true });
                return {
                    manual: data.manual || [],
                    device: data.device || [],
                    chatHistory: data.chatHistory || [],
                    consultationHistory: data.consultationHistory || [],
                    viewHistory: data.viewHistory || [],
                    lastModified: data.lastModified || Date.now(),
                    userId: data.userId || userAccountManager.getCurrentUserId()
                };
            }
        } catch (error) {
            console.error('加载健康数据失败:', error);
        }
        return this.createEmptyData();
    }

    async loadUserData() {
        const userId = userAccountManager.getCurrentUserId();
        if (!userId) {
            this.data = this.createEmptyData();
            this.notifyListeners();
            return;
        }

        const apiService = getHealthApiService();
        if (apiService) {
            try {
                await this.runLegacyStepsMigrationInDatabase();
                const [todayData, historyData] = await Promise.all([
                    apiService.getHealthData(),
                    apiService.getHealthHistory({ days: 30 }),
                ]);

                const historyList = Array.isArray(historyData?.list)
                    ? this.migrateLegacyBackendHealthData(historyData.list)
                    : [];
                const manualRecords = historyList.map(item => this.mapBackendRecordToManagerRecord(item));

                const normalizedTodayData = todayData ? this.migrateLegacyBackendHealthData([todayData])[0] : todayData;
                if (normalizedTodayData && normalizedTodayData.date && !manualRecords.some(record => record.date === normalizedTodayData.date)) {
                    manualRecords.push(this.mapBackendRecordToManagerRecord(normalizedTodayData));
                }

                this.data = {
                    ...this.createEmptyData(),
                    manual: manualRecords.filter(record => Object.keys(record.indicators || {}).length > 0),
                    lastModified: Date.now(),
                    userId,
                };

                this.saveLocalSnapshot();
                this.notifyListeners();
                return;
            } catch (error) {
                console.error('从后端加载健康数据失败，回退到本地缓存:', error);
            }
        }

        const syncResult = await dataSyncManager.syncFromCloud();
        if (syncResult.success && syncResult.data) {
            this.migrateLegacyStepsData(syncResult.data, { persist: false });
            this.data = syncResult.data;
        } else {
            this.data = this.loadData();
        }
        this.notifyListeners();
    }

    saveData() {
        try {
            this.data.lastModified = Date.now();
            this.data.userId = userAccountManager.getCurrentUserId();
            
            this.saveLocalSnapshot();

            if (userAccountManager.isLoggedIn()) {
                dataSyncManager.syncToCloud(this.data);
            }
        } catch (error) {
            console.error('保存健康数据失败:', error);
        }
    }

    saveLocalSnapshot() {
        this.migrateLegacyStepsData(this.data, { persist: false });
        const storageKey = this.getStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(this.data));
    }

    mapBackendRecordToManagerRecord(record) {
        const indicators = {};

        if (record.heartRate != null) indicators.heartRate = Number(record.heartRate);
        if (record.bloodPressureSystolic != null) indicators.bloodPressureSystolic = Number(record.bloodPressureSystolic);
        if (record.bloodPressureDiastolic != null) indicators.bloodPressureDiastolic = Number(record.bloodPressureDiastolic);
        if (record.steps != null) indicators.steps = Number(record.steps);
        if (record.sleepHours != null) indicators.sleepHours = Number(record.sleepHours);
        if (record.weight != null) indicators.weight = Number(record.weight);
        if (record.height != null) indicators.height = Number(record.height);
        if (record.bmi != null) indicators.bmi = Number(record.bmi);
        if (record.caloriesBurned != null) indicators.caloriesBurned = Number(record.caloriesBurned);
        if (record.waterIntake != null) indicators.waterIntake = Number(record.waterIntake);
        if (record.oxygenSaturation != null) indicators.oxygenSaturation = Number(record.oxygenSaturation);
        if (record.temperature != null) indicators.temperature = Number(record.temperature);

        return {
            id: record.id || `${record.date || Date.now()}_${Math.random()}`,
            source: record.source || DATA_SOURCES.MANUAL,
            timestamp: record.updatedAt || record.createdAt || `${record.date || new Date().toISOString().split('T')[0]}T00:00:00.000Z`,
            date: record.date || new Date().toISOString().split('T')[0],
            time: (record.updatedAt || record.createdAt)
                ? new Date(record.updatedAt || record.createdAt).toTimeString().slice(0, 5)
                : '00:00',
            indicators,
            metadata: record.metadata || {},
            deviceInfo: null,
            notes: record.source === 'device' ? '设备同步' : '后端同步',
        };
    }

    async runLegacyStepsMigrationInDatabase() {
        const apiService = getHealthApiService();
        if (!apiService || this.hasLegacyStepsMigrationRun()) {
            return;
        }

        try {
            if (typeof apiService.migrateLegacyHealthData === 'function') {
                await apiService.migrateLegacyHealthData();
            }
        } catch (error) {
            console.error('执行后端运动时长历史数据迁移失败:', error);
        } finally {
            this.markLegacyStepsMigrationDone();
        }
    }

    async persistLatestRecordToBackend(record) {
        const apiService = getHealthApiService();
        if (!apiService) {
            return;
        }

        const indicators = record.indicators || {};
        const payload = {
            date: record.date,
            heartRate: indicators.heartRate,
            bloodPressureSystolic: indicators.bloodPressureSystolic,
            bloodPressureDiastolic: indicators.bloodPressureDiastolic,
            bloodPressure: indicators.bloodPressureSystolic && indicators.bloodPressureDiastolic
                ? `${indicators.bloodPressureSystolic}/${indicators.bloodPressureDiastolic}`
                : undefined,
            sleepHours: indicators.sleepHours,
            steps: indicators.steps,
            weight: indicators.weight,
            height: indicators.height,
            caloriesBurned: indicators.caloriesBurned,
            waterIntake: indicators.waterIntake,
            temperature: indicators.temperature,
            oxygenSaturation: indicators.oxygenSaturation,
            source: record.source || DATA_SOURCES.MANUAL,
        };

        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
        await apiService.saveHealthData(payload);
    }

    addData(record, source = DATA_SOURCES.MANUAL) {
        const standardizedRecord = this.standardizeRecord(record, source);
        if (source === DATA_SOURCES.MANUAL) {
            this.data.manual.push(standardizedRecord);
        } else {
            this.data.device.push(standardizedRecord);
        }
        this.saveData();
        this.notifyListeners();
        this.persistLatestRecordToBackend(standardizedRecord).catch(error => {
            console.error('同步健康数据到后端失败:', error);
        });
        return standardizedRecord;
    }

    standardizeRecord(record, source) {
        const now = new Date();
        return {
            id: record.id || Date.now() + Math.random(),
            source,
            timestamp: record.timestamp || now.toISOString(),
            date: record.date || now.toISOString().split('T')[0],
            time: record.time || now.toTimeString().slice(0, 5),
            indicators: this.standardizeIndicators(record.indicators || record),
            metadata: {
                ...this.standardizeMetadata(record.metadata || {}),
                ...(record.metadata?.legacyStepsMigrated ? {
                    legacyStepsMigrated: true,
                    legacyStepsOriginalValue: record.metadata.legacyStepsOriginalValue,
                } : {}),
            },
            deviceInfo: source === DATA_SOURCES.DEVICE ? record.deviceInfo : null,
            notes: record.notes || '',
        };
    }

    standardizeIndicators(indicators) {
        const result = {};
        Object.keys(indicators).forEach(key => {
            const value = indicators[key];
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && typeof value !== 'boolean') {
                result[key] = numValue;
            }
        });
        return result;
    }

    standardizeMetadata(metadata) {
        const result = {};
        if (metadata.exerciseType) {
            result.exerciseType = String(metadata.exerciseType);
        }
        return result;
    }

    getData(source = DATA_SOURCES.ALL, timeRange = TIME_RANGES.MONTH, indicatorIds = null) {
        let records = [];
        
        if (source === DATA_SOURCES.ALL || source === DATA_SOURCES.MANUAL) {
            records = records.concat(this.data.manual || []);
        }
        if (source === DATA_SOURCES.ALL || source === DATA_SOURCES.DEVICE) {
            records = records.concat(this.data.device || []);
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeRange.days + 1);
        cutoffDate.setHours(0, 0, 0, 0);

        records = records.filter(record => {
            if (!record || !record.timestamp) {return false;}
            const recordDate = new Date(record.timestamp);
            return recordDate >= cutoffDate;
        });

        records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (indicatorIds) {
            records = records.map(record => ({
                ...record,
                indicators: Object.fromEntries(
                    Object.entries(record.indicators).filter(([key]) => indicatorIds.includes(key)),
                ),
            }));
        }

        return records;
    }

    getAggregatedData(source = DATA_SOURCES.ALL, timeRange = TIME_RANGES.MONTH, indicatorIds = null) {
        const records = this.getData(source, timeRange, indicatorIds);
        const aggregated = {};

        records.forEach(record => {
            const dateKey = record.date;
            if (!aggregated[dateKey]) {
                aggregated[dateKey] = {
                    date: dateKey,
                    timestamp: record.timestamp,
                    indicators: {},
                    count: {},
                };
            }

            Object.entries(record.indicators).forEach(([key, value]) => {
                if (!aggregated[dateKey].indicators[key]) {
                    aggregated[dateKey].indicators[key] = 0;
                    aggregated[dateKey].count[key] = 0;
                }
                aggregated[dateKey].indicators[key] += value;
                aggregated[dateKey].count[key]++;
            });
        });

        Object.values(aggregated).forEach(dayData => {
            Object.keys(dayData.indicators).forEach(key => {
                if (dayData.count[key] > 0) {
                    dayData.indicators[key] = Math.round((dayData.indicators[key] / dayData.count[key]) * 100) / 100;
                }
            });
        });

        return Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date));
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners() {
        this.listeners.forEach(listener => listener(this.data));
    }

    generateMockData() {
        for (let i = 60; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const isDeviceData = Math.random() > 0.5;
            const record = {
                timestamp: date.toISOString(),
                date: dateStr,
                time: `${Math.floor(Math.random() * 12) + 7}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
                indicators: {
                    heartRate: Math.floor(Math.random() * 30) + 65,
                    bloodPressureSystolic: Math.floor(Math.random() * 25) + 110,
                    bloodPressureDiastolic: Math.floor(Math.random() * 15) + 70,
                    sleepHours: Math.round((Math.random() * 3 + 6) * 10) / 10,
                    steps: Math.floor(Math.random() * 90) + 30,
                    weight: Math.round((Math.random() * 8 + 60) * 10) / 10,
                },
                notes: isDeviceData ? '设备自动记录' : '手动记录',
            };

            this.addData(record, isDeviceData ? DATA_SOURCES.DEVICE : DATA_SOURCES.MANUAL);
        }
    }

    clearData() {
        this.data = this.createEmptyData();
        this.saveData();
        this.notifyListeners();
    }

    addChatMessage(message) {
        const chatMessage = {
            id: message.id || Date.now() + Math.random(),
            userId: userAccountManager.getCurrentUserId(),
            role: message.role || 'user',
            content: message.content,
            timestamp: message.timestamp || new Date().toISOString(),
            metadata: message.metadata || {}
        };
        this.data.chatHistory.push(chatMessage);
        this.saveData();
        this.notifyListeners();
        return chatMessage;
    }

    getChatHistory(limit = 100) {
        return this.data.chatHistory
            .slice(-limit)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    clearChatHistory() {
        this.data.chatHistory = [];
        this.saveData();
        this.notifyListeners();
    }

    addConsultationRecord(consultation) {
        const record = {
            id: consultation.id || Date.now() + Math.random(),
            userId: userAccountManager.getCurrentUserId(),
            type: consultation.type,
            title: consultation.title,
            content: consultation.content,
            doctorName: consultation.doctorName,
            timestamp: consultation.timestamp || new Date().toISOString(),
            status: consultation.status || 'completed',
            metadata: consultation.metadata || {}
        };
        this.data.consultationHistory.push(record);
        this.saveData();
        this.notifyListeners();
        return record;
    }

    getConsultationHistory(timeRange = TIME_RANGES.MONTH) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeRange.days + 1);
        
        return this.data.consultationHistory
            .filter(record => new Date(record.timestamp) >= cutoffDate)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    addViewRecord(view) {
        const record = {
            id: view.id || Date.now() + Math.random(),
            userId: userAccountManager.getCurrentUserId(),
            contentType: view.contentType,
            contentId: view.contentId,
            title: view.title,
            timestamp: view.timestamp || new Date().toISOString(),
            duration: view.duration || 0,
            metadata: view.metadata || {}
        };
        this.data.viewHistory.push(record);
        this.saveData();
        this.notifyListeners();
        return record;
    }

    getViewHistory(timeRange = TIME_RANGES.MONTH) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeRange.days + 1);
        
        return this.data.viewHistory
            .filter(record => new Date(record.timestamp) >= cutoffDate)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    exportAllUserData() {
        return {
            userId: userAccountManager.getCurrentUserId(),
            exportTime: new Date().toISOString(),
            healthData: {
                manual: this.data.manual,
                device: this.data.device
            },
            chatHistory: this.data.chatHistory,
            consultationHistory: this.data.consultationHistory,
            viewHistory: this.data.viewHistory
        };
    }
}

export const healthDataManager = new HealthDataManager();
