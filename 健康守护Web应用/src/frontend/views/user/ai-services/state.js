// 状态管理文件，用于维护用户咨询历史和聊天记录

// 初始状态
const initialState = {
    // 病因咨询历史
    diseaseConsultationHistory: [],
    // 心理健康聊天历史
    mentalHealthChatHistory: [],
    // 健康生活推荐历史
    healthRecommendationHistory: [],
    // 用药指导历史
    medicationGuidanceHistory: [],
    // 健康报告历史
    healthReportHistory: [],
    // 用户健康数据
    userHealthData: {},
    // 功能访问状态
    featureAccess: {
        healthConsultation: true,
        medicationGuidance: true,
        healthReport: true,
    },
};

// 状态存储
let state = { ...initialState };
let currentStateStorageKey = null;
const pendingRequests = new Map();
const AI_RESULT_CACHE_KEY = 'aiServiceResultCache';
const AI_SERVICE_STATE_KEY = 'aiServiceState';
const MAX_AI_RESULT_CACHE_SIZE = 30;

const createFreshState = () => ({
    ...initialState,
    featureAccess: { ...initialState.featureAccess },
});

const getCurrentUserIdentifier = () => {
    try {
        const raw = sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo');
        if (!raw) {
            return 'guest';
        }

        const loginInfo = JSON.parse(raw);
        return String(loginInfo?.user?.id || loginInfo?.username || 'guest');
    } catch (error) {
        console.error('获取当前登录用户标识失败:', error);
        return 'guest';
    }
};

const buildUserScopedStorageKey = baseKey => `${baseKey}_${getCurrentUserIdentifier()}`;

// 简单的加密函数（实际项目中应使用更安全的加密方法）
const encryptData = data => {
    try {
        const jsonString = JSON.stringify(data);
        // 使用简单的Base64编码作为示例，实际项目中应使用更安全的加密算法
        return btoa(unescape(encodeURIComponent(jsonString)));
    } catch (error) {
        console.error('加密数据失败:', error);
        return null;
    }
};

// 简单的解密函数（实际项目中应使用更安全的加密方法）
const decryptData = encryptedData => {
    try {
        // 使用简单的Base64解码作为示例，实际项目中应使用更安全的加密算法
        const jsonString = decodeURIComponent(escape(atob(encryptedData)));
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('解密数据失败:', error);
        return null;
    }
};

// 保存状态到本地存储
const saveState = () => {
    try {
        const stateStorageKey = buildUserScopedStorageKey(AI_SERVICE_STATE_KEY);

        // 加密敏感数据
        const sensitiveData = {
            userHealthData: state.userHealthData,
            diseaseConsultationHistory: state.diseaseConsultationHistory,
            mentalHealthChatHistory: state.mentalHealthChatHistory,
            medicationGuidanceHistory: state.medicationGuidanceHistory,
            healthReportHistory: state.healthReportHistory,
        };

        const encryptedSensitiveData = encryptData(sensitiveData);

        // 保存加密后的数据和非敏感数据
        const dataToSave = {
            healthRecommendationHistory: state.healthRecommendationHistory,
            featureAccess: state.featureAccess,
            encryptedData: encryptedSensitiveData,
        };

        localStorage.setItem(stateStorageKey, JSON.stringify(dataToSave));
        currentStateStorageKey = stateStorageKey;
    } catch (error) {
        console.error('保存状态失败:', error);
    }
};

// 从本地存储加载状态
const loadState = () => {
    const stateStorageKey = buildUserScopedStorageKey(AI_SERVICE_STATE_KEY);
    state = createFreshState();

    try {
        const savedState = localStorage.getItem(stateStorageKey);
        if (savedState) {
            const parsedState = JSON.parse(savedState);

            // 加载非敏感数据
            state.healthRecommendationHistory = parsedState.healthRecommendationHistory || [];
            state.featureAccess = parsedState.featureAccess || { ...initialState.featureAccess };

            // 解密并加载敏感数据
            if (parsedState.encryptedData) {
                const decryptedData = decryptData(parsedState.encryptedData);
                if (decryptedData) {
                    state.userHealthData = decryptedData.userHealthData || {};
                    state.diseaseConsultationHistory
                        = decryptedData.diseaseConsultationHistory || [];
                    state.mentalHealthChatHistory = decryptedData.mentalHealthChatHistory || [];
                    state.medicationGuidanceHistory = decryptedData.medicationGuidanceHistory || [];
                    state.healthReportHistory = decryptedData.healthReportHistory || [];
                }
            }
        }
    } catch (error) {
        console.error('加载状态失败:', error);
        state = createFreshState();
    }

    currentStateStorageKey = stateStorageKey;
};

const ensureStateLoaded = () => {
    const nextStorageKey = buildUserScopedStorageKey(AI_SERVICE_STATE_KEY);
    if (currentStateStorageKey !== nextStorageKey) {
        loadState();
    }
};

const loadResultCache = () => {
    try {
        const cacheStorageKey = buildUserScopedStorageKey(AI_RESULT_CACHE_KEY);
        const rawCache = localStorage.getItem(cacheStorageKey);
        if (!rawCache) {
            return {};
        }
        const parsed = JSON.parse(rawCache);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        console.error('加载AI结果缓存失败:', error);
        return {};
    }
};

const saveResultCache = cache => {
    try {
        const cacheStorageKey = buildUserScopedStorageKey(AI_RESULT_CACHE_KEY);
        localStorage.setItem(cacheStorageKey, JSON.stringify(cache));
    } catch (error) {
        console.error('保存AI结果缓存失败:', error);
    }
};

// 初始化状态
loadState();

const getCachedAIResult = (cacheKey, ttl = 5 * 60 * 1000) => {
    if (!cacheKey) {
        return null;
    }
    const cache = loadResultCache();
    const entry = cache[cacheKey];
    if (!entry) {
        return null;
    }
    if (Date.now() - entry.timestamp > ttl) {
        delete cache[cacheKey];
        saveResultCache(cache);
        return null;
    }
    return entry.data;
};

const setCachedAIResult = (cacheKey, data) => {
    if (!cacheKey) {
        return data;
    }
    const cache = loadResultCache();
    cache[cacheKey] = {
        timestamp: Date.now(),
        data,
    };

    const entries = Object.entries(cache).sort((a, b) => b[1].timestamp - a[1].timestamp);
    const trimmed = Object.fromEntries(entries.slice(0, MAX_AI_RESULT_CACHE_SIZE));
    saveResultCache(trimmed);
    return data;
};

const withPendingRequest = async (cacheKey, executor) => {
    if (!cacheKey) {
        return executor();
    }
    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey);
    }
    const task = Promise.resolve()
        .then(executor)
        .finally(() => pendingRequests.delete(cacheKey));
    pendingRequests.set(cacheKey, task);
    return task;
};

const buildAIResultCacheKey = (namespace, payload) => {
    try {
        return `${namespace}:${JSON.stringify(payload)}`;
    } catch (error) {
        return `${namespace}:${Date.now()}`;
    }
};

// 状态管理方法
const stateManager = {
    // 获取病因咨询历史
    getDiseaseConsultationHistory: () => {
        ensureStateLoaded();
        return state.diseaseConsultationHistory;
    },

    // 添加病因咨询记录
    addDiseaseConsultation: consultation => {
        ensureStateLoaded();
        const newConsultation = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...consultation,
        };
        state.diseaseConsultationHistory.unshift(newConsultation);
        // 标记健康咨询功能已完成
        state.featureAccess.healthConsultation = true;
        saveState();
        return newConsultation;
    },

    // 获取心理健康聊天历史
    getMentalHealthChatHistory: () => {
        ensureStateLoaded();
        return state.mentalHealthChatHistory;
    },

    // 添加心理健康聊天记录
    addMentalHealthChat: chat => {
        ensureStateLoaded();
        const newChat = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...chat,
        };
        state.mentalHealthChatHistory.unshift(newChat);
        // 标记健康咨询功能已完成
        state.featureAccess.healthConsultation = true;
        saveState();
        return newChat;
    },

    // 使用远端历史回写本地心理健康聊天记录
    setMentalHealthChatHistory: history => {
        ensureStateLoaded();
        state.mentalHealthChatHistory = Array.isArray(history)
            ? history.map(record => ({
                ...record,
                id: record?.id || Date.now().toString(),
                timestamp: record?.timestamp || new Date().toISOString(),
                userMessage: String(record?.userMessage || '')
                    .replace(/[\u200B-\u200D\uFEFF]/g, '')
                    .trim(),
                aiReply: String(record?.aiReply || '')
                    .replace(/[\u200B-\u200D\uFEFF]/g, '')
                    .trim(),
            }))
            : [];
        state.featureAccess.healthConsultation = true;
        saveState();
        return state.mentalHealthChatHistory;
    },

    // 获取健康生活推荐历史
    getHealthRecommendationHistory: () => {
        ensureStateLoaded();
        return state.healthRecommendationHistory;
    },

    // 添加健康生活推荐记录
    addHealthRecommendation: recommendation => {
        ensureStateLoaded();
        const newRecommendation = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...recommendation,
        };
        state.healthRecommendationHistory.unshift(newRecommendation);
        saveState();
        return newRecommendation;
    },

    // 获取用药指导历史
    getMedicationGuidanceHistory: () => {
        ensureStateLoaded();
        return state.medicationGuidanceHistory;
    },

    // 添加用药指导记录
    addMedicationGuidance: guidance => {
        ensureStateLoaded();
        const newGuidance = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...guidance,
        };
        state.medicationGuidanceHistory.unshift(newGuidance);
        // 标记用药指导功能已完成
        state.featureAccess.medicationGuidance = true;
        saveState();
        return newGuidance;
    },

    // 获取健康报告历史
    getHealthReportHistory: () => {
        ensureStateLoaded();
        return state.healthReportHistory;
    },

    // 添加健康报告记录
    addHealthReport: report => {
        ensureStateLoaded();
        const newReport = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...report,
        };
        state.healthReportHistory.unshift(newReport);
        // 标记健康报告功能已完成
        state.featureAccess.healthReport = true;
        saveState();
        return newReport;
    },

    // 获取用户健康数据
    getUserHealthData: () => {
        ensureStateLoaded();
        return state.userHealthData;
    },

    // 更新用户健康数据
    updateUserHealthData: healthData => {
        ensureStateLoaded();
        state.userHealthData = {
            ...state.userHealthData,
            ...healthData,
        };
        saveState();
        return state.userHealthData;
    },

    // 获取功能访问状态
    getFeatureAccess: () => {
        ensureStateLoaded();
        return state.featureAccess;
    },

    // 检查功能访问权限
    checkAccess: feature => {
        ensureStateLoaded();
        return state.featureAccess[feature] || false;
    },

    // AI结果缓存
    getCachedAIResult,
    setCachedAIResult,
    withPendingRequest,
    buildAIResultCacheKey,

    // 清空当前用户历史记录
    clearAllHistory: () => {
        ensureStateLoaded();
        state = createFreshState();
        localStorage.removeItem(buildUserScopedStorageKey(AI_RESULT_CACHE_KEY));
        pendingRequests.clear();
        saveState();
    },
};

export default stateManager;
