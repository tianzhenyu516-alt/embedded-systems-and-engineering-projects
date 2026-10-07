const PROVIDER_DEFAULT_BASE_URLS = {
    openai: 'https://api.openai.com/v1',
    claude: 'https://api.anthropic.com/v1',
    tongyi: 'https://dashscope.aliyuncs.com/api/v1',
    wenxin: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
    deepseek: 'https://api.deepseek.com',
    doubao: 'https://ark.cn-beijing.volces.com/api/v3',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4',
};

const PROVIDER_FALLBACK_MODELS = {
    deepseek: [
        'deepseek-chat', // 主要模型 - 通用对话
        'deepseek-coder', // 备用模型 - 代码专用
        'deepseek-reasoner', // 备用模型 - 复杂推理
    ],
    doubao: [
        'doubao-seed-2-0-pro-260215', // 主要模型 - 通用对话
        'Doubao-1.5-pro-32k', // 备用模型 - 通用对话
        'Doubao-1.5-lite-32k', // 备用模型 - 轻量对话
        'Doubao-Seed-1.6', // 备用模型 - 最新模型
    ],
    zhipu: [
        'glm-4', // 主要模型 - 通用对话
        'glm-3-turbo', // 备用模型 - 轻量对话
    ],
};

const PROVIDER_MODEL_ALIASES = {
    deepseek: {
        // 通用聊天模型
        deepseek: 'deepseek-chat',
        deepseek_chat: 'deepseek-chat',
        'deepseek-chat': 'deepseek-chat',
        'deepseek-chat-v2': 'deepseek-chat',
        'deepseek-v2': 'deepseek-chat',
        'deepseek-v3': 'deepseek-chat',
        'deepseek-mental': 'deepseek-chat',
        'deepseek-general': 'deepseek-chat',
        'deepseek-qna': 'deepseek-chat',

        // 推理模型
        'deepseek-reasoner': 'deepseek-reasoner',
        'deepseek-r1': 'deepseek-reasoner',
        'deepseek-r1-distill': 'deepseek-reasoner',

        // 代码模型 - 单独映射，不要映射到reasoner
        'deepseek-coder': 'deepseek-coder',
        'deepseek-coder-v2': 'deepseek-coder',
    },
    doubao: {
        // 通用聊天模型
        doubao: 'doubao-seed-2-0-pro-260215',
        'doubao-pro': 'doubao-seed-2-0-pro-260215',
        'doubao-pro-4k': 'doubao-seed-2-0-pro-260215',
        'doubao-pro-32k': 'doubao-seed-2-0-pro-260215',
        'doubao-seed-2-0-pro-260215': 'doubao-seed-2-0-pro-260215',
        'Doubao-1.5-pro-32k': 'Doubao-1.5-pro-32k',
        'doubao-lite': 'Doubao-1.5-lite-32k',
        'doubao-lite-32k': 'Doubao-1.5-lite-32k',
        'Doubao-1.5-lite-32k': 'Doubao-1.5-lite-32k',
        'doubao-seed': 'Doubao-Seed-1.6',
        'Doubao-Seed-1.6': 'Doubao-Seed-1.6',
        'doubao-seed-1.6': 'Doubao-Seed-1.6',
    },
    zhipu: {
        // 通用聊天模型
        zhipu: 'glm-4',
        'glm-4': 'glm-4',
        'glm-3-turbo': 'glm-3-turbo',
    },
};

class AIService {
    constructor() {
        this.config = window.AI_CONFIG || AI_CONFIG;
        this.apiKey = null;
        this.provider = this.config.PROVIDER;
        this.chatHistory = [];
        this.recentErrors = new Map();
        this.errorDedupeWindow = 10000;
        this.unavailableModels = {};
        this.activeApiKeyOverride = null;
        this.loadConfig();
    }

    _shouldUseProviderRace(type = 'chat') {
        const performanceConfig = this.config.PERFORMANCE || {};
        if (performanceConfig.enableProviderRace === false) {
            return false;
        }
        const typeKey = (type || 'chat').toLowerCase();
        const raceByType = performanceConfig.providerRaceByType || {};
        if (typeof raceByType[typeKey] === 'boolean') {
            return raceByType[typeKey];
        }
        return typeKey === 'chat' || typeKey === 'analysis';
    }

    _getParallelProviderLimit() {
        const configuredLimit = Number(this.config.PERFORMANCE?.maxParallelProviders);
        if (!Number.isFinite(configuredLimit) || configuredLimit < 1) {
            return 2;
        }
        return Math.max(1, Math.min(3, Math.floor(configuredLimit)));
    }

    async _runProviderRace(providers, executor) {
        const providerList = Array.isArray(providers)
            ? providers.filter(provider => typeof provider === 'string' && provider.trim())
            : [];
        if (!providerList.length) {
            throw new Error('没有可用于并行调度的AI服务');
        }

        let settled = false;
        const errors = [];

        return await new Promise((resolve, reject) => {
            providerList.forEach(provider => {
                this._withProvider(provider, async () => await executor(provider))
                    .then(result => {
                        if (settled) {
                            return;
                        }
                        settled = true;
                        resolve({ provider, result });
                    })
                    .catch(error => {
                        errors.push({ provider, error });
                        const errorKey = this._getErrorKey(error, `provider_race_${provider}`);
                        if (!this._isDuplicateError(errorKey)) {
                            this._recordError(errorKey);
                        }
                        if (window.logger) {
                            window.logger.warn('AI并行候选失败', {
                                provider,
                                message: error.message,
                            });
                        } else {
                            console.warn(`AI并行候选 ${provider} 失败: ${error.message}`);
                        }
                        if (errors.length === providerList.length && !settled) {
                            settled = true;
                            reject(errors[errors.length - 1].error);
                        }
                    });
            });
        });
    }

    async _requestWithProvider(provider, messages, interactionType, config) {
        return await this._withProvider(provider, async () => {
            let model = this.getModel(interactionType);
            model = this._normalizeModelAlias(model, provider);

            if (provider === 'deepseek') {
                if (model !== 'deepseek-chat' && model !== 'deepseek-reasoner') {
                    if (model.includes('reasoner') || model.includes('r1')) {
                        model = 'deepseek-reasoner';
                    } else {
                        model = 'deepseek-chat';
                    }
                }
            }

            const requestData = {
                model,
                messages,
                temperature: config.temperature,
                max_tokens: config.maxTokens,
            };
            if (window.logger) {
                window.logger.debug('发送AI请求:', {
                    model,
                    provider,
                    originalModel: this.getModel(interactionType),
                });
            } else {
                console.log('发送AI请求:', {
                    model,
                    provider,
                    originalModel: this.getModel(interactionType),
                });
            }
            const data = await this._requestWithRetry(requestData, config, {
                provider,
            });
            return this._extractContentFromResponse(data);
        });
    }

    _buildRaceProviders(providerPriority, interactionType, hasDirectApiKey) {
        if (!hasDirectApiKey || !this._shouldUseProviderRace(interactionType)) {
            return [];
        }
        const allowedProviders = Array.isArray(providerPriority)
            ? providerPriority.filter(provider => !!this._getProviderApiKey(provider))
            : [];
        return allowedProviders.slice(0, this._getParallelProviderLimit());
    }

    _pickSequentialProviders(providerPriority, usedProviders = []) {
        const usedSet = new Set(Array.isArray(usedProviders) ? usedProviders : []);
        return Array.isArray(providerPriority)
            ? providerPriority.filter(provider => !usedSet.has(provider))
            : [];
    }

    _shouldUseTaskSplitAnalysis(type = 'chat') {
        const cooperationConfig = this.config.COOPERATION || {};
        if (cooperationConfig.enableTaskSplitAnalysis === false) {
            return false;
        }
        const typeKey = (type || 'chat').toLowerCase();
        const enabledTypes = cooperationConfig.types || {};
        if (typeof enabledTypes[typeKey] === 'boolean') {
            return enabledTypes[typeKey];
        }
        return typeKey === 'analysis';
    }

    _buildTaskSplitMessages(messages, options = {}) {
        if (!Array.isArray(messages) || !messages.length) {
            return null;
        }

        const systemMessage = messages.find(message => message?.role === 'system');
        const userMessages = messages.filter(message => message?.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
        const cooperationConfig = this.config.COOPERATION || {};
        const plannerPrompt = cooperationConfig.plannerPrompt
            || '你是预处理助手，请先提炼信息要点。';

        const plannerMessages = [
            {
                role: 'system',
                content: plannerPrompt,
            },
            {
                role: 'user',
                content: `${systemMessage?.content ? `原始系统要求：\n${systemMessage.content}\n\n` : ''}原始用户输入：\n${lastUserMessage}`,
            },
        ];

        return {
            plannerMessages,
            buildFinalMessages: plannerOutput => [
                {
                    role: 'system',
                    content: systemMessage?.content || '你是一个专业AI助手，请根据提供的信息完成任务。',
                },
                {
                    role: 'user',
                    content: `请基于以下原始输入与预处理要点，输出最终结果。\n\n[原始输入]\n${lastUserMessage}\n\n[预处理要点]\n${plannerOutput}\n\n要求：整合以上信息，直接输出最终答案，不要重复“预处理”过程。${options.finalInstruction ? `\n\n补充要求：${options.finalInstruction}` : ''}`,
                },
            ],
        };
    }

    async _sendCoordinatedMessage(messages, options = {}) {
        const interactionType = options.type || 'chat';
        const taskSplit = this._buildTaskSplitMessages(messages, options);
        if (!taskSplit) {
            return await this.sendMessage(messages, options);
        }

        if (window.logger) {
            window.logger.info('启用AI任务拆分协作', { interactionType });
        } else {
            console.info('启用AI任务拆分协作', { interactionType });
        }

        const plannerOutput = await this.sendMessage(taskSplit.plannerMessages, {
            ...options,
            type: interactionType,
        });

        const finalMessages = taskSplit.buildFinalMessages(plannerOutput);
        return await this.sendMessage(finalMessages, {
            ...options,
            type: interactionType,
        });
    }

    _getProviderApiKey(provider = this.provider) {
        const trimmedProvider = (provider || '').trim();
        if (!trimmedProvider) {
            return (this.apiKey || this.config.API_KEY || '').trim();
        }
        if (trimmedProvider === this.provider && this.apiKey) {
            return this.apiKey.trim();
        }
        const mappedKey = this.config.API_KEYS?.[trimmedProvider];
        if (mappedKey && mappedKey.trim()) {
            return mappedKey.trim();
        }
        if (this.config.API_KEY && this.config.API_KEY.trim()) {
            return this.config.API_KEY.trim();
        }
        return (this.apiKey || '').trim();
    }

    _getProviderPriority(type = 'chat') {
        const fallbackConfig = this.config.FALLBACK || {};
        const enabledProviders = Array.isArray(this.config.ENABLED_PROVIDERS)
            ? this.config.ENABLED_PROVIDERS.filter(provider => typeof provider === 'string' && provider.trim())
            : [];
        const allowedProviders = enabledProviders.length ? enabledProviders : null;
        const priority = [];
        const pushUnique = value => {
            if (!value || typeof value !== 'string') {
                return;
            }
            const normalized = value.trim();
            if (!normalized) {
                return;
            }
            if (allowedProviders && !allowedProviders.includes(normalized)) {
                return;
            }
            if (!priority.includes(normalized)) {
                priority.push(normalized);
            }
        };
        pushUnique(this.provider);
        const typeKey = (type || '').toLowerCase();
        const typedList = fallbackConfig.providerPriorityByType?.[typeKey];
        if (Array.isArray(typedList)) {
            typedList.forEach(pushUnique);
        }
        if (Array.isArray(fallbackConfig.providerPriority)) {
            fallbackConfig.providerPriority.forEach(pushUnique);
        }
        if (priority.length) {
            return priority;
        }
        if (allowedProviders?.length) {
            return [...allowedProviders];
        }
        return [this.provider];
    }

    async _withProvider(provider, executor) {
        const prevProvider = this.provider;
        const prevOverride = this.activeApiKeyOverride;
        const targetProvider = (provider || prevProvider || '').trim() || prevProvider;
        if (window.logger) {
            window.logger.debug('切换AI提供商', { from: prevProvider, to: targetProvider });
        }
        this.provider = targetProvider;
        if (targetProvider !== prevProvider) {
            this.activeApiKeyOverride = this._getProviderApiKey(targetProvider);
        } else {
            this.activeApiKeyOverride = null;
        }
        try {
            return await executor();
        } finally {
            this.provider = prevProvider;
            this.activeApiKeyOverride = prevOverride;
        }
    }

    _getErrorKey(error, context = '') {
        const message = error?.message || String(error) || '未知错误';
        const code = error?.code || '';
        const status = error?.status || '';
        if (
            message.includes('API密钥未配置')
            || message.includes('API密钥无效')
            || code === 'API_KEY_INVALID'
            || status === 400
        ) {
            return `api_key_error:${this.provider}`;
        }
        if (
            message.includes('timeout')
            || message.includes('TIMED_OUT')
            || message.includes('ERR_CONNECTION_TIMED_OUT')
        ) {
            return `network_timeout:${this.provider}`;
        }
        return `${message}:${code}:${status}:${context}`;
    }

    _isDuplicateError(errorKey) {
        const now = Date.now();
        const errorInfo = this.recentErrors.get(errorKey);

        if (!errorInfo) {
            return false;
        }
        if (now - errorInfo.firstTime < this.errorDedupeWindow) {
            errorInfo.count++;
            errorInfo.lastTime = now;
            return true;
        }
        this.recentErrors.delete(errorKey);
        return false;
    }

    _recordError(errorKey) {
        const now = Date.now();
        this.recentErrors.set(errorKey, {
            count: 1,
            firstTime: now,
            lastTime: now,
        });
        const cleanupTime = now - this.errorDedupeWindow * 2;
        for (const [key, info] of this.recentErrors.entries()) {
            if (info.lastTime < cleanupTime) {
                this.recentErrors.delete(key);
            }
        }
    }

    _getAllowedProviders() {
        const enabledProviders = Array.isArray(this.config?.ENABLED_PROVIDERS)
            ? this.config.ENABLED_PROVIDERS.filter(
                provider => typeof provider === 'string' && provider.trim(),
            )
            : [];
        if (enabledProviders.length) {
            return enabledProviders;
        }
        return Object.keys(this.config?.MODELS || {});
    }

    _getDefaultProvider() {
        return this._getAllowedProviders()[0] || 'deepseek';
    }

    _normalizeProvider(provider) {
        if (typeof provider !== 'string') {
            return this._getDefaultProvider();
        }
        const normalized = provider.trim();
        const allowedProviders = this._getAllowedProviders();
        if (!normalized || !allowedProviders.includes(normalized)) {
            return this._getDefaultProvider();
        }
        return normalized;
    }

    loadConfig() {
        try {
            const storedKey = localStorage.getItem(this.config.STORAGE_KEYS.API_KEY);
            const storedProvider = localStorage.getItem(this.config.STORAGE_KEYS.PROVIDER);
            const storedHistory = localStorage.getItem(this.config.STORAGE_KEYS.CHAT_HISTORY);

            if (storedKey) {
                this.apiKey = storedKey;
            }
            if (storedProvider) {
                const normalizedProvider = this._normalizeProvider(storedProvider);
                this.provider = normalizedProvider;
                if (normalizedProvider !== storedProvider) {
                    localStorage.setItem(this.config.STORAGE_KEYS.PROVIDER, normalizedProvider);
                }
            } else {
                this.provider = this._getDefaultProvider();
            }
            if (storedHistory) {
                this.chatHistory = JSON.parse(storedHistory);
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('加载AI配置失败:', error);
            } else {
                console.error('加载AI配置失败:', error);
            }
        }
    }

    saveConfig() {
        try {
            if (this.apiKey) {
                localStorage.setItem(this.config.STORAGE_KEYS.API_KEY, this.apiKey);
            }
            localStorage.setItem(this.config.STORAGE_KEYS.PROVIDER, this.provider);
            localStorage.setItem(
                this.config.STORAGE_KEYS.CHAT_HISTORY,
                JSON.stringify(this.chatHistory),
            );
        } catch (error) {
            if (window.logger) {
                window.logger.error('保存AI配置失败:', error);
            } else {
                console.error('保存AI配置失败:', error);
            }
        }
    }

    setApiKey(key) {
        this.apiKey = key;
        this.saveConfig();
    }

    setProvider(provider) {
        if (provider === null || provider === undefined || provider === '') {
            this.provider = this._getDefaultProvider();
            this.saveConfig();
            return;
        }
        if (typeof provider !== 'string') {
            console.warn('提供商名称类型无效:', typeof provider, provider);
            if (provider && typeof provider.toString === 'function') {
                provider = provider.toString().trim();
            } else {
                this.provider = this._getDefaultProvider();
                this.saveConfig();
                return;
            }
        }
        provider = provider.trim();
        if (!provider || provider === '') {
            this.provider = this._getDefaultProvider();
            this.saveConfig();
            return;
        }
        if (!this.config || !this.config.MODELS) {
            console.error('AI配置未正确初始化');
            throw new Error('AI配置未正确初始化');
        }
        const normalizedProvider = this._normalizeProvider(provider);
        if (!this.config.MODELS[normalizedProvider]) {
            const supportedProviders = this._getAllowedProviders().join(', ');
            console.error('不支持的提供商:', provider);
            console.error('支持的提供商:', supportedProviders);
            throw new Error(`不支持的提供商: ${provider}。支持的提供商: ${supportedProviders}`);
        }
        this.provider = normalizedProvider;
        this.saveConfig();
    }

    getModel(type = 'chat') {
        const normalizedType = (type || 'chat').toLowerCase();
        const candidates = [];
        const providerModels = this.config?.MODELS?.[this.provider] || {};

        // 收集候选模型
        if (providerModels[normalizedType]) {
            candidates.push(providerModels[normalizedType]);
        }
        if (normalizedType === 'mental' && providerModels.chat) {
            candidates.push(providerModels.chat);
        }
        if (providerModels.chat) {
            candidates.push(providerModels.chat);
        }
        if (providerModels.analysis) {
            candidates.push(providerModels.analysis);
        }

        for (const candidate of candidates) {
            let normalized = this._normalizeModelAlias(candidate, this.provider);

            // 简化DeepSeek模型处理逻辑
            if (this.provider === 'deepseek' && normalized) {
                // 只使用DeepSeek官方支持的模型名称
                const supportedModels = ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'];
                if (!supportedModels.includes(normalized)) {
                    // 如果不在支持列表中，默认使用deepseek-chat
                    normalized = 'deepseek-chat';
                }
            }

            if (normalized && !this._isModelUnavailable(this.provider, normalized)) {
                return normalized;
            }
        }

        // 如果所有候选都不可用，返回当前提供商最稳定的默认模型
        if (this.provider === 'deepseek') {
            return 'deepseek-chat';
        }
        if (this.provider === 'doubao') {
            return 'doubao-seed-2-0-pro-260215';
        }
        if (this.provider === 'zhipu') {
            return 'glm-4';
        }
        return this._getSupportedModels(this.provider)[0] || this._getSupportedModels()[0] || '';
    }

    _getSupportedModels(provider = this.provider) {
        const supported = new Set();
        const providerModels = this.config?.MODELS?.[provider];
        if (providerModels && typeof providerModels === 'object') {
            Object.values(providerModels).forEach(model => {
                if (typeof model === 'string' && model.trim()) {
                    supported.add(this._normalizeModelAlias(model, provider));
                }
            });
        }
        (PROVIDER_FALLBACK_MODELS[provider] || []).forEach(model => {
            if (typeof model === 'string' && model.trim()) {
                supported.add(this._normalizeModelAlias(model, provider));
            }
        });
        return this._filterUnavailableModels(Array.from(supported), provider);
    }

    _ensureSupportedModel(model, type = 'chat') {
        const normalized = this._normalizeModelAlias(model, this.provider);
        const supported = this._getSupportedModels();
        if (
            normalized
            && supported.includes(normalized)
            && !this._isModelUnavailable(this.provider, normalized)
        ) {
            return normalized;
        }
        const normalizedType = (type || 'chat').toLowerCase();
        const providerModels = this.config?.MODELS?.[this.provider] || {};
        if (providerModels[normalizedType]) {
            const candidate = this._normalizeModelAlias(
                providerModels[normalizedType],
                this.provider,
            );
            if (candidate && !this._isModelUnavailable(this.provider, candidate)) {
                return candidate;
            }
        }
        if (providerModels.chat) {
            const candidate = this._normalizeModelAlias(providerModels.chat, this.provider);
            if (candidate && !this._isModelUnavailable(this.provider, candidate)) {
                return candidate;
            }
        }
        return (
            supported.find(name => !this._isModelUnavailable(this.provider, name))
            || normalized
            || model
        );
    }

    _getFallbackModel(provider = this.provider, currentModel = null) {
        const supported = this._getSupportedModels(provider);
        if (!supported.length) {
            return currentModel ? this._normalizeModelAlias(currentModel, provider) : null;
        }

        // 如果当前模型存在，先标准化它
        const normalizedCurrent = currentModel
            ? this._normalizeModelAlias(currentModel, provider)
            : null;

        if (!normalizedCurrent) {
            // 如果没有当前模型，返回第一个可用的模型
            return supported.find(name => !this._isModelUnavailable(provider, name)) || null;
        }

        // 查找备用模型（确保返回的模型名称是API支持的）
        for (const candidate of supported) {
            // 确保候选模型也被标准化
            const normalizedCandidate = this._normalizeModelAlias(candidate, provider);
            if (
                normalizedCandidate !== normalizedCurrent
                && !this._isModelUnavailable(provider, normalizedCandidate)
            ) {
                return normalizedCandidate;
            }
        }

        // 如果没有找到备用模型，返回当前模型的标准化版本
        return normalizedCurrent;
    }

    _logModelFallback(fromModel, toModel, reason) {
        const logPayload = {
            provider: this.provider,
            fromModel,
            toModel,
            reason,
        };
        if (window.logger) {
            window.logger.warn('AI模型不可用，已切换候选模型', logPayload);
        } else {
            console.warn('AI模型不可用，已切换候选模型:', logPayload);
        }
    }

    getAvailableModels(provider = this.provider) {
        return this._getSupportedModels(provider);
    }

    isConfigured() {
        // 检查是否有直接配置的API密钥
        const hasDirectApiKey = !!this._getProviderApiKey(this.provider);

        // 如果没有直接API密钥，检查是否可以使用代理服务
        if (!hasDirectApiKey && window.apiProxy) {
            // 代理服务可用，AI功能可以通过代理使用
            return true;
        }

        return hasDirectApiKey;
    }

    async _resolveProxyProviderPriority(providerPriority = []) {
        const normalizedPriority = Array.isArray(providerPriority)
            ? providerPriority.filter(provider => typeof provider === 'string' && provider.trim())
            : [];

        if (!window.apiProxy || typeof window.apiProxy.getAvailableAIProviders !== 'function') {
            return normalizedPriority;
        }

        try {
            const availableProviders = await window.apiProxy.getAvailableAIProviders(normalizedPriority);
            if (Array.isArray(availableProviders) && availableProviders.length) {
                return availableProviders;
            }
        } catch (error) {
            if (window.logger) {
                window.logger.warn('获取可用AI提供商失败，回退本地优先级', {
                    message: error.message,
                });
            } else {
                console.warn('获取可用AI提供商失败，回退本地优先级:', error.message);
            }
        }

        return normalizedPriority;
    }

    async sendMessage(messages, options = {}) {
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error('消息列表不能为空');
        }

        if (options.stream === true) {
            return await this._sendMessageStream(messages, options);
        }

        // 检查配置：如果有直接API密钥或代理服务可用，则继续
        const hasDirectApiKey = !!this._getProviderApiKey(this.provider);
        const hasProxyService = !!window.apiProxy;

        if (!hasDirectApiKey && !hasProxyService) {
            const configError = new Error('未配置AI API密钥且代理服务不可用');
            configError.code = 'NOT_CONFIGURED';
            configError.status = 400;
            throw configError;
        }

        const interactionType = options.type || 'chat';
        const config = {
            ...this.config.REQUEST_CONFIG,
            ...options,
        };
        const providerPriority = this._getProviderPriority(interactionType);
        const proxyProviderPriority = hasProxyService
            ? await this._resolveProxyProviderPriority(providerPriority)
            : providerPriority;
        let lastError = null;

        // 优先使用代理，避免浏览器直连第三方AI服务导致 Failed to fetch / CORS / 网络拦截
        const preferProxy = this.config.USE_PROXY !== false && hasProxyService;

        if (preferProxy) {
            if (window.logger) {
                window.logger.info('AI请求模式: 代理优先', {
                    providers: proxyProviderPriority,
                    proxyBaseURL: window.apiProxy?.baseURL,
                    interactionType,
                });
            } else {
                console.info('AI请求模式: 代理优先', {
                    providers: proxyProviderPriority,
                    proxyBaseURL: window.apiProxy?.baseURL,
                    interactionType,
                });
            }
            try {
                const proxyContent = await this._tryProxyFallback(
                    messages,
                    interactionType,
                    config,
                    proxyProviderPriority,
                );
                if (proxyContent) {
                    this._persistChatHistory(messages, proxyContent);
                    return proxyContent;
                }
            } catch (proxyError) {
                lastError = proxyError;
            }
        }

        // 如果没有直接API密钥，直接使用代理服务
        if (!preferProxy && !hasDirectApiKey && window.apiProxy) {
            if (window.logger) {
                window.logger.info('没有直接API密钥，使用代理服务');
            } else {
                console.log('没有直接API密钥，使用代理服务');
            }

            let proxyContent = null;
            try {
                proxyContent = await this._tryProxyFallback(
                    messages,
                    interactionType,
                    config,
                    proxyProviderPriority,
                );
                if (proxyContent) {
                    this._persistChatHistory(messages, proxyContent);
                    return proxyContent;
                }
            } catch (proxyError) {
                lastError = proxyError;
            }
        } else if (!preferProxy) {
            if (window.logger) {
                window.logger.info('AI请求模式: 直连优先', {
                    providers: providerPriority,
                    interactionType,
                });
            } else {
                console.info('AI请求模式: 直连优先', {
                    providers: providerPriority,
                    interactionType,
                });
            }

            const racedProviders = this._buildRaceProviders(
                providerPriority,
                interactionType,
                hasDirectApiKey,
            );
            if (racedProviders.length > 1) {
                try {
                    const raceResult = await this._runProviderRace(
                        racedProviders,
                        async provider => await this._requestWithProvider(
                            provider,
                            messages,
                            interactionType,
                            config,
                        ),
                    );
                    if (window.logger) {
                        window.logger.info('AI并行调度命中最快服务', {
                            provider: raceResult.provider,
                            racedProviders,
                            interactionType,
                        });
                    } else {
                        console.info('AI并行调度命中最快服务', {
                            provider: raceResult.provider,
                            racedProviders,
                            interactionType,
                        });
                    }
                    this._persistChatHistory(messages, raceResult.result);
                    return raceResult.result;
                } catch (raceError) {
                    lastError = raceError;
                    if (window.logger) {
                        window.logger.warn('AI并行调度全部失败，降级为顺序尝试', {
                            racedProviders,
                            message: raceError.message,
                        });
                    } else {
                        console.warn('AI并行调度全部失败，降级为顺序尝试:', raceError.message);
                    }
                }
            }

            const sequentialProviders = this._pickSequentialProviders(providerPriority, racedProviders);
            for (const provider of sequentialProviders) {
                try {
                    const content = await this._requestWithProvider(
                        provider,
                        messages,
                        interactionType,
                        config,
                    );
                    this._persistChatHistory(messages, content);
                    return content;
                } catch (error) {
                    lastError = error;
                    const errorKey = this._getErrorKey(error, `provider_${provider}`);
                    if (!this._isDuplicateError(errorKey)) {
                        this._recordError(errorKey);
                    }
                    if (window.logger) {
                        window.logger.warn('AI提供商调用失败，尝试下一候选', {
                            provider,
                            message: error.message,
                        });
                    } else {
                        console.warn(`AI提供商 ${provider} 调用失败: ${error.message}`);
                    }
                    continue;
                }
            }

            if (window.logger) {
                window.logger.warn('所有主提供商均失败，尝试代理重试');
            } else {
                console.warn('所有主提供商均失败，尝试代理重试');
            }

            let proxyContent = null;
            try {
                proxyContent = await this._tryProxyFallback(
                    messages,
                    interactionType,
                    config,
                    proxyProviderPriority,
                );
            } catch (proxyError) {
                lastError = proxyError;
            }

            if (proxyContent) {
                if (window.logger) {
                    window.logger.info('代理重试成功');
                } else {
                    console.info('代理重试成功');
                }
                this._persistChatHistory(messages, proxyContent);
                return proxyContent;
            }
        }

        if (this._isAuthError(lastError)) {
            throw lastError;
        }

        if (window.logger) {
            window.logger.warn('代理重试失败，尝试本地降级回复...');
        } else {
            console.warn('代理重试失败，尝试本地降级回复...');
        }
        const localContent = this._generateLocalFallbackResponse(
            interactionType,
            messages,
            lastError,
        );
        if (localContent) {
            this._persistChatHistory(messages, localContent);
            return localContent;
        }
        const fallbackMessage = `AI服务暂时不可用。${lastError?.message || '请稍后再试或联系管理员。'}`;
        if (window.logger) {
            window.logger.error('所有降级方案都失败，抛出错误');
        } else {
            console.error('所有降级方案都失败，抛出错误');
        }
        throw new Error(fallbackMessage);
    }

    async _sendMessageStream(messages, options = {}) {
        const hasProxyService = !!window.apiProxy;
        if (!hasProxyService) {
            throw new Error('流式输出仅支持通过代理服务调用');
        }

        const interactionType = options.type || 'chat';
        const config = {
            ...this.config.REQUEST_CONFIG,
            ...options,
            stream: true,
        };
        const providerPriority = this._getProviderPriority(interactionType);
        const resolvedProviderPriority = await this._resolveProxyProviderPriority(providerPriority);
        let lastError = null;

        for (const provider of resolvedProviderPriority) {
            try {
                const model = this._normalizeModelAlias(this.getModel(interactionType), provider);
                const response = await window.apiProxy.callAI(messages, provider, {
                    temperature: config.temperature,
                    maxTokens: config.maxTokens,
                    model,
                    type: interactionType,
                    timeout: config.timeout || 60000,
                    stream: true,
                });
                return await this._consumeProxyStream(response, messages, options);
            } catch (error) {
                lastError = error;
                if (window.logger) {
                    window.logger.warn('AI流式调用失败，尝试下一候选提供商', {
                        provider,
                        message: error.message,
                    });
                } else {
                    console.warn(`AI流式调用失败(${provider}): ${error.message}`);
                }
            }
        }

        const localContent = this._generateLocalFallbackResponse(
            interactionType,
            messages,
            lastError,
        );
        if (typeof options.onChunk === 'function' && localContent) {
            options.onChunk(localContent, localContent);
        }
        if (localContent) {
            this._persistChatHistory(messages, localContent);
            return localContent;
        }
        throw new Error(`AI服务暂时不可用。${lastError?.message || '请稍后再试或联系管理员。'}`);
    }

    async _consumeProxyStream(response, messages, options = {}) {
        const reader = response.body?.getReader?.();
        if (!reader) {
            throw new Error('流式响应不可用');
        }

        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const eventBlock of events) {
                const dataLine = eventBlock
                    .split('\n')
                    .map(line => line.trim())
                    .find(line => line.startsWith('data:'));
                if (!dataLine) {
                    continue;
                }
                const payloadText = dataLine.slice(5).trim();
                if (!payloadText) {
                    continue;
                }

                let payload;
                try {
                    payload = JSON.parse(payloadText);
                } catch (error) {
                    continue;
                }

                if (payload.type === 'delta' && typeof payload.content === 'string') {
                    fullContent += payload.content;
                    if (typeof options.onChunk === 'function') {
                        options.onChunk(payload.content, fullContent);
                    }
                    continue;
                }

                if (payload.type === 'error') {
                    throw new Error(payload.message || '流式响应中断');
                }

                if (payload.type === 'done') {
                    const finalContent = payload.data?.content || fullContent;
                    this._persistChatHistory(messages, finalContent);
                    if (typeof options.onComplete === 'function') {
                        options.onComplete(finalContent, payload.data || null);
                    }
                    return finalContent;
                }
            }
        }

        this._persistChatHistory(messages, fullContent);
        if (typeof options.onComplete === 'function') {
            options.onComplete(fullContent, null);
        }
        return fullContent;
    }

    async analyzeHealth(healthData) {
        if (!healthData || typeof healthData !== 'object') {
            throw new Error('健康数据无效');
        }

        const prompt = this.config.PROMPTS.healthAnalysis.replace(
            '{healthData}',
            JSON.stringify(healthData, null, 2),
        );

        const messages = [
            { role: 'system', content: '你是一个专业的健康管理AI助手' },
            { role: 'user', content: prompt },
        ];

        if (this._shouldUseTaskSplitAnalysis('analysis')) {
            return await this._sendCoordinatedMessage(messages, {
                type: 'analysis',
                finalInstruction: '请输出结构清晰、结论明确、建议可执行的健康分析。',
            });
        }

        return await this.sendMessage(messages, { type: 'analysis' });
    }

    async getDietAdvice(userProfile, nutritionData) {
        if (!userProfile || typeof userProfile !== 'object') {
            throw new Error('用户信息无效');
        }

        if (!nutritionData || typeof nutritionData !== 'object') {
            throw new Error('营养数据无效');
        }

        const prompt = this.config.PROMPTS.dietAdvice
            .replace('{userProfile}', JSON.stringify(userProfile, null, 2))
            .replace('{nutritionData}', JSON.stringify(nutritionData, null, 2));

        const messages = [
            { role: 'system', content: '你是一个专业的营养专家' },
            { role: 'user', content: prompt },
        ];

        if (this._shouldUseTaskSplitAnalysis('analysis')) {
            return await this._sendCoordinatedMessage(messages, {
                type: 'analysis',
                finalInstruction: '请给出简洁明确的饮食建议，并标出最值得优先执行的部分。',
            });
        }

        return await this.sendMessage(messages, { type: 'analysis' });
    }

    async getExercisePlan(userProfile, exerciseData) {
        if (!userProfile || typeof userProfile !== 'object') {
            throw new Error('用户信息无效');
        }

        if (!exerciseData || typeof exerciseData !== 'object') {
            throw new Error('运动数据无效');
        }

        const prompt = this.config.PROMPTS.exercisePlan
            .replace('{userProfile}', JSON.stringify(userProfile, null, 2))
            .replace('{exerciseData}', JSON.stringify(exerciseData, null, 2));

        const messages = [
            { role: 'system', content: '你是一个专业的运动教练' },
            { role: 'user', content: prompt },
        ];

        if (this._shouldUseTaskSplitAnalysis('analysis')) {
            return await this._sendCoordinatedMessage(messages, {
                type: 'analysis',
                finalInstruction: '请给出分步骤、易执行的运动计划，并优先考虑安全性与可持续性。',
            });
        }

        return await this.sendMessage(messages, { type: 'analysis' });
    }

    async getMentalSupport(userMessage, personality = 'warm', options = {}) {
        if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
            throw new Error('用户消息不能为空');
        }
        const styles = {
            warm: '语气温暖柔和，像可信赖的朋友，核心是陪伴与安抚',
            witty: '幽默俏皮，轻松活泼，可点缀表情符号逗笑',
            energetic: '积极打气，充满希望和动力，强调行动勇气',
            gentle: '治愈轻柔，慢慢说话，给予安全感与接纳',
            coach: '理性建议型，简短可执行的步骤，同时保持关怀',
        };
        const personaStyle = styles[personality] || styles.warm;
        const systemPrompt = `你是“心屿”，一位安全、共情、有支持性的心理陪伴AI。核心定位：
- 基于心理学知识（CBT、正念、人本主义等）的智能支持伙伴
- 不是治疗师，不能提供医疗诊断或治疗；角色是倾听者、情绪容器、认知协作者、资源激活者
- 始终保持谦逊透明，永远不替代真实人际支持或专业治疗

安全红线：
1) 出现自伤/自杀/伤害他人/严重精神症状：必须提醒“我只是AI，无法提供专业诊疗，建议尽快联系专业医生或心理咨询师”
2) 不替代线下支持与专业治疗
3) 对自身能力保持谦逊与透明

决策与模式切换（从高到低优先级）：
优先级1 安全第一：
- 一旦出现“想死/自杀/不想活了/伤害别人/报复/听到声音/看到不存在的东西”，立即触发安全协议：
  回复必须包含“我听到你正经历非常痛苦…请立即联系[危机热线]。我会陪伴你直到获得专业帮助。”并提醒“我只是AI，无法提供专业诊疗，建议尽快联系专业医生或心理咨询师”

优先级2 情绪强度主导：
- 强烈情绪/哭泣描述 → 深度共情模式，直到情绪缓解
- 明显生理焦虑（心慌/发抖/喘不过气） → 正念锚定模式，直到呼吸平稳

优先级3 认知状态主导：
- 绝对化认知（“我总是/我永远/所有人都…”） → 认知探索模式
- 无助/无力（“我不行/我没用/看不到希望”） → 力量激活模式

优先级4 需求明确时：
- 直接请求建议（“我该怎么办/有什么方法”） → 策略协同模式
- 无明显特征或混合 → 默认深度共情，提问澄清需求

支持模式（自然切换，不明示名称）：
1) 深度共情模式：情绪确认与接纳（强烈情绪时），用情感反映/无条件积极关注，典型句式如“听起来这真的让你很痛苦”“我在这里陪着你感受这份悲伤”“不需要急着好起来，此刻的愤怒是被允许的”。
2) 认知探索模式：审视想法（负面思维循环时），用苏格拉底式提问/认知重构，句式如“我们看看‘我一无是处’这个想法有多少是事实？”“有没有被忽略的反例？”“这个想法对你的帮助和阻碍分别是什么？”
3) 力量激活模式：唤醒资源（无助/无价值时），优势聚焦/例外寻找，句式如“我注意到你有一种…的韧性”“上次类似困难时是什么帮助了你？”“0-10 现在无力感几分？有过更低分却走出来的时刻吗？”
4) 正念锚定模式：回到当下（焦虑加剧/思维混乱时），接地练习/呼吸引导，句式如“先做个简单安顿”“感受双脚踩在地面的感觉…”“现在周围能看到哪三种颜色？”
5) 策略协同模式：共拟步骤（需要具体建议时），SMART/行为实验，句式如“设计一个小实验”“接下来三天每天做一件小事滋养自己会是什么？”“这里有三个工具，哪个最适合现在？”

切换原则：情绪强度优先；从情感到认知，再到行动；焦虑先正念中断；尊重用户偏好（如要求建议则切到行动）。

自然过渡话术（视情使用，避免机械套用）：
- 共情→认知： “谢谢你分享这些感受。在刚才的描述里，我注意到一个反复出现的想法是‘…’。我们可不可以一起，像整理毛线团一样，轻轻理一理这个想法？”
- 认知→力量： “你能看到这个想法可能不那么准确，这本身就是很大的觉察力。带着这份觉察，你内在的哪个部分其实一直在默默支撑着你？”
- 力量→策略： “这个发现很有力量。如果我们把这个内在资源比作一把钥匙，我们可以用它开启怎样的一小步行动？”
- 策略→共情： “这个计划听起来很有意义。在尝试的过程中，也请记得对自己保持温柔，就像你此刻对待自己的感受一样。”
- 卡住时： “我感受到你正在探索一个复杂的地带。如果我们换一种方式来接近它，比如…（提议另一种模式的角度）会不会有所帮助？”

长对话记忆锚点（适时引用，保持自然）：
- 优势： “就像你刚才提到的那种坚持/韧性…”
- 有效方法： “你之前试过的…方法似乎有帮助”
- 价值观： “这对你来说很重要，因为…”

节奏感知与调整：
- 连续简短回应 → 先加共情，慢下来：“有些感受需要时间沉淀，我在这里，不着急。”
- 长篇叙述 → 可转认知探索：“你描述得很清晰，我们可以一起看看其中的一些想法。”
- 沉默或“...” → 接纳陪伴：“沉默也是对话的一部分，我在这里陪伴着。”

安全与边界：如出现自伤/伤人/严重精神症状，需提醒“我只是AI，无法提供专业诊疗，建议尽快联系专业医生或心理咨询师”。

语气：${personaStyle}；中文回复，句子简短、自然流畅；鼓励与接纳优先，避免生硬罗列模式；适度表情即可。

开场倾向：可主动关心状态与来意，体现陪伴意愿。`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ];

        return await this.sendMessage(messages, { type: 'chat', personality, ...options });
    }

    async analyzeSymptom(symptoms) {
        if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length === 0) {
            throw new Error('症状描述不能为空');
        }

        const prompt = this.config.PROMPTS.symptomAnalysis.replace('{symptoms}', symptoms);

        const messages = [
            { role: 'system', content: '你是一个医疗AI助手，只能提供参考建议，不能替代专业医生' },
            { role: 'user', content: prompt },
        ];

        if (this._shouldUseTaskSplitAnalysis('analysis')) {
            return await this._sendCoordinatedMessage(messages, {
                type: 'analysis',
                finalInstruction: '请确保输出简短、清晰，并突出风险判断与非处方建议边界。',
            });
        }

        return await this.sendMessage(messages, { type: 'analysis' });
    }

    async chat(message, options = {}) {
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            throw new Error('消息内容不能为空');
        }

        const messages = [
            { role: 'system', content: '你是一个友好的AI健康助手' },
            ...this.chatHistory.slice(-10), // 最近10轮对话
            { role: 'user', content: message },
        ];

        return await this.sendMessage(messages, { type: 'chat', ...options });
    }

    getApiUrl() {
        if (this.config.USE_PROXY) {
            return this.config.PROXY_URL;
        }

        const customBaseUrl = (this.config.API_BASE_URL || '').trim();
        const providerBaseUrl
            = PROVIDER_DEFAULT_BASE_URLS[this.provider] || PROVIDER_DEFAULT_BASE_URLS.openai;
        const openaiBase = PROVIDER_DEFAULT_BASE_URLS.openai;
        const shouldUseCustomBaseUrl
            = !!customBaseUrl
            && (this.provider === 'openai'
                || (customBaseUrl !== openaiBase && customBaseUrl !== providerBaseUrl));

        const baseUrl = shouldUseCustomBaseUrl ? customBaseUrl : providerBaseUrl;
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        return `${cleanBaseUrl}/chat/completions`;
    }

    getHeaders() {
        const provider = this.provider;
        const headers = {
            'Content-Type': 'application/json',
        };
        const apiKey = (
            this.activeApiKeyOverride
            || this._getProviderApiKey(provider)
            || ''
        ).trim();
        if (!apiKey) {
            throw new Error(`AI提供商${provider}未配置API密钥`);
        }
        if (provider === 'openai') {
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (provider === 'claude') {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
        } else if (provider === 'tongyi') {
            headers['Authorization'] = `Bearer ${apiKey}`;
            headers['X-DashScope-SSE'] = 'disable';
        } else if (provider === 'wenxin') {
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (provider === 'deepseek' || provider === 'doubao' || provider === 'zhipu') {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        return headers;
    }

    async _requestDirect(requestData, config, meta = {}) {
        const url = this.getApiUrl();
        const headers = this.getHeaders();
        const controller = new AbortController();
        const timeout = config.timeout || this.config.REQUEST_CONFIG?.timeout || 60000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // 确保模型名称被正确映射到API支持的模型名称
        let normalizedModel = requestData.model;
        if (this.provider === 'deepseek' && normalizedModel) {
            normalizedModel = this._normalizeModelAlias(normalizedModel, this.provider);
            // 如果映射后仍然是无效的模型名称，强制使用默认模型
            if (normalizedModel !== 'deepseek-chat' && normalizedModel !== 'deepseek-reasoner') {
                // 根据模型名称特征选择默认模型
                if (normalizedModel.includes('reasoner') || normalizedModel.includes('r1')) {
                    normalizedModel = 'deepseek-reasoner';
                } else {
                    normalizedModel = 'deepseek-chat';
                }
            }
        } else if (this.provider === 'doubao' && normalizedModel) {
            normalizedModel = this._normalizeModelAlias(normalizedModel, this.provider);
            // 确保豆包模型是有效的
            const validDoubaoModels = ['doubao-seed-2-0-pro-260215', 'Doubao-1.5-pro-32k', 'Doubao-1.5-lite-32k', 'Doubao-Seed-1.6'];
            if (!validDoubaoModels.includes(normalizedModel)) {
                normalizedModel = 'doubao-seed-2-0-pro-260215';
            }
        } else {
            normalizedModel = this._normalizeModelAlias(normalizedModel, this.provider);
        }

        const payload = { ...requestData, model: normalizedModel };
        if (window.logger) {
            window.logger.debug('AI直接请求:', {
                url,
                timeout,
                provider: this.provider,
                originalModel: requestData.model,
                normalizedModel: payload.model,
            });
        } else {
            console.debug('AI直接请求:', {
                url,
                timeout,
                provider: this.provider,
                originalModel: requestData.model,
                normalizedModel: payload.model,
            });
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal,
                keepalive: true,
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const error = await response.json();
                    if (error.error && typeof error.error === 'object') {
                        errorMessage
                            = error.error.message || error.error.code || `HTTP ${response.status}`;
                    } else if (error.error && typeof error.error === 'string') {
                        errorMessage = error.error;
                    } else if (error.message && typeof error.message === 'string') {
                        errorMessage = error.message;
                    } else if (error.message && typeof error.message === 'object') {
                        errorMessage = error.message.message || JSON.stringify(error.message);
                    } else {
                        errorMessage = `HTTP ${response.status}`;
                    }
                } catch (e) {
                    errorMessage = `HTTP ${response.status}`;
                }
                if (typeof errorMessage !== 'string') {
                    errorMessage = String(errorMessage);
                }
                const normalizedMessage = (errorMessage || '').toLowerCase();
                if (response.status === 401 || response.status === 403) {
                    throw new Error('API密钥无效，请检查管理员后台的AI配置');
                } else if (response.status === 402) {
                    throw new Error('API余额不足，请充值或切换API服务商');
                } else if (response.status === 429) {
                    throw new Error('API请求频率过高，请稍后再试');
                } else if (
                    (this.provider === 'deepseek' || this.provider === 'doubao' || this.provider === 'zhipu')
                    && normalizedMessage.includes('model')
                    && normalizedMessage.includes('exist')
                ) {
                    // 标记当前模型不可用（使用payload.model，它应该是已经映射后的）
                    const failedModel = payload.model;
                    this._markModelUnavailable(this.provider, failedModel);

                    // 获取备用模型（确保返回的模型名称是API支持的）
                    const fallbackModel = !meta.modelFallbackTried
                        ? this._getFallbackModel(this.provider, failedModel)
                        : null;

                    if (fallbackModel && fallbackModel !== failedModel) {
                        // 确保备用模型是API支持的模型名称
                        let normalizedFallback = this._normalizeModelAlias(
                            fallbackModel,
                            this.provider,
                        );

                        // 对于DeepSeek，强制使用支持的模型名称
                        if (this.provider === 'deepseek') {
                            if (
                                normalizedFallback !== 'deepseek-chat'
                                && normalizedFallback !== 'deepseek-reasoner'
                            ) {
                                // 如果备用模型仍然不是支持的名称，根据特征选择
                                if (
                                    normalizedFallback.includes('reasoner')
                                    || normalizedFallback.includes('r1')
                                    || fallbackModel.includes('reasoner')
                                    || fallbackModel.includes('r1')
                                ) {
                                    normalizedFallback = 'deepseek-reasoner';
                                } else {
                                    normalizedFallback = 'deepseek-chat';
                                }
                            }
                        }

                        // 对于豆包，确保使用有效的模型
                        if (this.provider === 'doubao') {
                            const validDoubaoModels = ['doubao-seed-2-0-pro-260215', 'Doubao-1.5-pro-32k', 'Doubao-1.5-lite-32k', 'Doubao-Seed-1.6'];
                            if (!validDoubaoModels.includes(normalizedFallback)) {
                                normalizedFallback = 'doubao-seed-2-0-pro-260215';
                            }
                        }

                        // 记录日志时，显示原始请求的模型名称（如果有的话）
                        const originalRequestModel = requestData.model || failedModel;
                        this._logModelFallback(
                            originalRequestModel,
                            normalizedFallback,
                            errorMessage,
                        );
                        return await this._requestDirect(
                            { ...payload, model: normalizedFallback },
                            config,
                            { ...meta, modelFallbackTried: true },
                        );
                    }
                    const providerName = {
                        deepseek: 'DeepSeek',
                        doubao: '豆包',
                        zhipu: '智谱清言',
                    }[this.provider] || this.provider;
                    throw new Error(`${providerName}模型不可用：${errorMessage}`);
                } else {
                    throw new Error(errorMessage);
                }
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (window.DEBUG_MODE || window.logger?.level === 'debug') {
                const errorDetails = {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    url,
                    provider: this.provider,
                };

                if (window.logger) {
                    window.logger.error('AI直接请求失败:', errorDetails);
                } else {
                    console.error('AI直接请求失败:', errorDetails);
                }
            } else {
                const errorKey = this._getErrorKey(error, 'direct_request');
                if (!this._isDuplicateError(errorKey)) {
                    this._recordError(errorKey);

                    const briefError = {
                        message: error.message || '网络请求失败',
                        provider: this.provider,
                    };

                    if (window.logger) {
                        window.logger.warn('AI直接请求失败，将尝试代理重试:', briefError);
                    } else {
                        console.warn('AI直接请求失败，将尝试代理重试:', briefError.message);
                    }
                }
            }
            const isTimeoutError
                = error.name === 'AbortError'
                || (error.message
                    && (error.message.includes('timeout')
                        || error.message.includes('TIMED_OUT')
                        || error.message.includes('aborted')
                        || error.message.includes('timed out')));

            if (isTimeoutError) {
                const timeoutError = new Error(
                    'AI服务连接超时，可能是网络问题或服务暂时不可用。系统将尝试通过代理重试。',
                );
                timeoutError.code = 'TIMEOUT';
                timeoutError.status = 408;
                timeoutError.originalError = error;
                timeoutError.url = url;
                throw timeoutError;
            }
            const errorMsg = (error.message || '').toLowerCase();
            const errorStack = (error.stack || '').toLowerCase();
            const isNetworkError
                = errorMsg.includes('failed to fetch')
                || errorMsg.includes('err_connection_timed_out')
                || errorMsg.includes('err_connection_refused')
                || errorMsg.includes('err_network')
                || errorMsg.includes('networkerror')
                || errorMsg.includes('network request failed')
                || errorMsg.includes('load failed')
                || errorMsg.includes('connection')
                || errorStack.includes('err_connection_timed_out')
                || errorStack.includes('err_connection_refused')
                || errorStack.includes('err_network')
                || (error.name === 'TypeError'
                    && (errorMsg.includes('fetch')
                        || errorMsg.includes('network')
                        || errorMsg.length === 0
                        || errorMsg === 'failed to fetch'))
                || error.name === 'NetworkError'
                || (error.name === 'TypeError' && !errorMsg);

            if (isNetworkError) {
                const networkError = new Error(
                    '无法连接到AI服务，可能是网络问题或服务暂时不可用。系统将尝试通过代理重试。',
                );
                networkError.code = 'NETWORK_ERROR';
                networkError.status = 0; // 网络错误通常没有HTTP状态码
                networkError.originalError = error;
                networkError.url = url;
                throw networkError;
            }
            if (error && error.message && typeof error.message !== 'string') {
                error.message = String(error.message);
            }
            if (error && typeof error === 'object') {
                error.url = url;
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async _requestWithRetry(requestData, config, meta = {}) {
        const maxRetries
            = typeof config.maxRetries === 'number'
                ? config.maxRetries
                : (this.config.REQUEST_CONFIG?.maxRetries ?? 0);
        let attempt = 0;
        let lastError = null;
        while (attempt <= maxRetries) {
            try {
                if (attempt > 0) {
                    if (window.logger) {
                        window.logger.warn('AI请求重试', {
                            provider: this.provider,
                            attempt,
                            maxRetries,
                            model: requestData.model,
                        });
                    } else {
                        console.warn(`AI请求第${attempt}次重试 (${this.provider})`);
                    }
                }
                return await this._requestDirect(requestData, config, { ...meta, attempt });
            } catch (error) {
                lastError = error;
                const shouldRetry = attempt < maxRetries && this._isRetryableError(error);
                if (!shouldRetry) {
                    throw error;
                }
                const delay = this._computeBackoffDelay(attempt + 1);
                await this._delay(delay);
                attempt += 1;
            }
        }
        throw lastError;
    }

    _computeBackoffDelay(attempt) {
        const base = this.config.REQUEST_CONFIG?.backoffBase || 500;
        const jitter = Math.random() * 200;
        return base * 2 ** Math.max(0, attempt - 1) + jitter;
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _isRetryableError(error) {
        if (!error) {
            return false;
        }
        const status = error.status;
        if (status >= 500 || status === 408 || status === 429) {
            return true;
        }
        const code = error.code;
        if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') {
            return true;
        }
        const message = (error.message || '').toLowerCase();
        if (message.includes('timeout') || message.includes('timed out')) {
            return true;
        }
        if (
            message.includes('网络')
            || message.includes('failed to fetch')
            || message.includes('connection')
        ) {
            return true;
        }
        return false;
    }

    _extractContentFromResponse(data) {
        if (!data) {
            return '';
        }
        if (typeof data === 'string') {
            return data;
        }
        if (Array.isArray(data)) {
            return data.join('\n');
        }

        const collectText = value => {
            if (typeof value === 'string') {
                return value;
            }
            if (Array.isArray(value)) {
                return value
                    .map(item => {
                        if (typeof item === 'string') {
                            return item;
                        }
                        if (typeof item?.text === 'string') {
                            return item.text;
                        }
                        if (typeof item?.content === 'string') {
                            return item.content;
                        }
                        return '';
                    })
                    .join('');
            }
            return '';
        };

        if (typeof data === 'object') {
            // 处理后端代理返回的格式: {success: true, data: {content: ...}}
            if (data.success && data.data) {
                const responseData = data.data;
                if (typeof responseData.content === 'string') {
                    return responseData.content;
                }
                if (typeof responseData.response === 'string') {
                    return responseData.response;
                }
                if (typeof responseData.result === 'string') {
                    return responseData.result;
                }
                if (Array.isArray(responseData.choices) && responseData.choices.length > 0) {
                    return (
                        collectText(responseData.choices[0]?.message?.content)
                        || collectText(responseData.choices[0]?.delta?.content)
                        || collectText(responseData.choices[0]?.message?.reasoning_content)
                        || collectText(responseData.choices[0]?.reasoning_content)
                        || responseData.choices[0]?.text
                        || responseData.output_text
                        || ''
                    );
                }
            }
            // 处理直接从后端代理返回的格式: {content: ...}
            if (typeof data.content === 'string') {
                return data.content;
            }
            if (typeof data.response === 'string') {
                return data.response;
            }
            if (typeof data.result === 'string') {
                return data.result;
            }
            if (data.message && typeof data.message === 'string' && !data.error) {
                return data.message;
            }
            if (Array.isArray(data.choices) && data.choices.length > 0) {
                return (
                    collectText(data.choices[0]?.message?.content)
                    || collectText(data.choices[0]?.delta?.content)
                    || collectText(data.choices[0]?.message?.reasoning_content)
                    || collectText(data.choices[0]?.reasoning_content)
                    || data.choices[0]?.text
                    || data.output_text
                    || ''
                );
            }
            if (typeof data.output_text === 'string') {
                return data.output_text;
            }
            const reasoningText = collectText(data.reasoning_content) || collectText(data.reasoning);
            if (reasoningText) {
                return reasoningText;
            }
        }

        return '';
    }

    _persistChatHistory(messages, assistantContent) {
        if (typeof assistantContent !== 'string') {
            assistantContent = assistantContent ? String(assistantContent) : '';
        }

        const lastUserMessage = this._getLastUserMessage(messages);
        if (lastUserMessage) {
            this.chatHistory.push({
                role: 'user',
                content: lastUserMessage,
            });
        }
        this.chatHistory.push({
            role: 'assistant',
            content: assistantContent,
        });
        if (this.chatHistory.length > 20) {
            this.chatHistory = this.chatHistory.slice(-20);
        }
        this.saveConfig();
    }

    _getLastUserMessage(messages) {
        if (!Array.isArray(messages)) {
            return '';
        }
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i]?.role === 'user') {
                return messages[i].content;
            }
        }
        return '';
    }

    async _tryProxyFallback(messages, interactionType, config, providers = [this.provider]) {
        const fallbackConfig = this.config.FALLBACK || {};
        if (!window.apiProxy || fallbackConfig.enableProxyRetry === false) {
            if (window.logger) {
                window.logger.warn('代理重试已禁用或apiProxy不可用', {
                    apiProxyAvailable: !!window.apiProxy,
                    enableProxyRetry: fallbackConfig.enableProxyRetry,
                });
            } else {
                console.warn('代理重试已禁用或apiProxy不可用', {
                    apiProxyAvailable: !!window.apiProxy,
                    enableProxyRetry: fallbackConfig.enableProxyRetry,
                });
            }
            return null;
        }
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            if (window.logger) {
                window.logger.error('AI代理请求失败: messages参数无效');
            } else {
                console.error('AI代理请求失败: messages参数无效');
            }
            return null;
        }

        const providerList
            = Array.isArray(providers) && providers.length ? providers : [this.provider];
        let lastError = null;
        for (const provider of providerList) {
            if (!provider) {
                continue;
            }
            try {
                if (window.logger) {
                    window.logger.warn('尝试通过代理重试AI请求...', {
                        provider,
                        messageCount: messages.length,
                        proxyBaseURL: window.apiProxy?.baseURL,
                    });
                } else {
                    console.warn('尝试通过代理重试AI请求...', {
                        provider,
                        messageCount: messages.length,
                        proxyBaseURL: window.apiProxy?.baseURL,
                    });
                }
                const proxyTimeout = 90000;
                const previousProvider = this.provider;
                const targetProvider = this._normalizeProvider(provider);
                let model;
                try {
                    this.provider = targetProvider;
                    model = this.getModel(interactionType);
                } finally {
                    this.provider = previousProvider;
                }
                const proxyResponse = await window.apiProxy.callAI(messages, provider, {
                    temperature: config.temperature,
                    maxTokens: config.maxTokens,
                    model,
                    type: interactionType,
                    timeout: proxyTimeout,
                });
                return this._extractContentFromResponse(proxyResponse);
            } catch (error) {
                lastError = error;
                const errorMessage = error.message || String(error);
                const errorCode = error.code || error.status;
                let friendlyMessage = '代理服务暂时不可用';
                if (this._isAuthError(error)) {
                    friendlyMessage = '登录状态已失效，请重新登录';
                } else if (
                    errorCode === 'AI_NOT_CONFIGURED'
                    || errorCode === 'API_KEY_INVALID'
                    || errorMessage.includes('API密钥未配置')
                    || errorMessage.includes('API密钥无效')
                ) {
                    friendlyMessage = 'AI服务配置未完成';
                } else if (errorCode === 'AI_CIRCUIT_OPEN') {
                    friendlyMessage = 'AI服务暂时熔断，请稍后再试';
                } else if (
                    errorMessage.includes('模型不存在')
                    || errorMessage.toLowerCase().includes('model')
                ) {
                    friendlyMessage = 'AI模型配置错误';
                } else if (
                    errorMessage.includes('网络')
                    || errorMessage.includes('timeout')
                    || errorMessage.includes('TIMED_OUT')
                    || errorCode === 524
                ) {
                    friendlyMessage = '网络连接超时';
                } else if (errorCode === 400 || errorCode === 404) {
                    friendlyMessage = 'AI服务配置错误';
                } else if (errorCode === 429) {
                    friendlyMessage = '请求频率过高';
                }
                const errorKey = this._getErrorKey(error, `proxy_fallback_${provider}`);
                if (!this._isDuplicateError(errorKey)) {
                    this._recordError(errorKey);

                    if (window.logger) {
                        window.logger.warn('代理重试失败', {
                            message: friendlyMessage,
                            code: errorCode,
                            provider,
                        });
                    } else {
                        console.warn('代理重试失败:', friendlyMessage);
                    }
                }

                if (this._isAuthError(error)) {
                    throw error;
                }
            }
        }
        if (window.DEBUG_MODE) {
            if (!window.apiProxy) {
                console.warn('⚠️ window.apiProxy 未初始化，无法使用代理重试');
            } else if (!window.apiProxy.baseURL) {
                console.warn('⚠️ window.apiProxy.baseURL 未设置，代理可能无法正常工作');
            }
        }
        if (lastError) {
            throw lastError;
        }
        return null;
    }

    _generateLocalFallbackResponse(type, messages, error = null) {
        const fallbackConfig = this.config.FALLBACK || {};
        if (fallbackConfig.enableLocalResponse === false) {
            return 'AI服务暂时不可用，请稍后再试。';
        }
        const lastUserMessage = (this._getLastUserMessage(messages) || '').trim();
        const templates = fallbackConfig.localTemplates || {};

        const defaults = {
            chat: '当前AI服务暂时不可用，请保持健康的生活方式，如需紧急帮助请联系专业医生或客服人员。',
            analysis:
                '网络波动导致AI分析暂时不可用。请继续记录步数、睡眠和血压，保持适度运动、清淡饮食，并定期复查身体指标。',
            mental: 'AI心理助手暂时离线，请先做深呼吸，记录让您紧张的事情，并与信任的人交流。如情绪持续低落，请寻求专业人士帮助。',
        };

        let template = templates[type] || defaults[type];
        if (!template) {
            template = defaults.chat || defaults.analysis || 'AI服务暂时不可用，请稍后再试。';
        }
        if (typeof template !== 'string') {
            if (typeof template === 'function') {
                try {
                    template = template(lastUserMessage);
                } catch (e) {
                    template = defaults[type] || defaults.chat || 'AI服务暂时不可用，请稍后再试。';
                }
            } else {
                template = defaults[type] || defaults.chat || 'AI服务暂时不可用，请稍后再试。';
            }
        }
        if (!template || typeof template !== 'string') {
            template = defaults[type] || defaults.chat || 'AI服务暂时不可用，请稍后再试。';
        }

        if (template.includes('{userMessage}')) {
            template = template.replace('{userMessage}', lastUserMessage || '您的需求');
        }
        const knowledgeBase = fallbackConfig.localKnowledgeBase || {};
        const extraTips = [];
        if (type === 'mental' && Array.isArray(knowledgeBase.mentalSupportLines)) {
            extraTips.push(...knowledgeBase.mentalSupportLines);
        }
        if (Array.isArray(knowledgeBase.defaultSuggestions)) {
            extraTips.push(...knowledgeBase.defaultSuggestions);
        }
        if (extraTips.length) {
            template += `\n\n📘 小贴士：${extraTips.slice(0, 3).join('；')}`;
        }
        if (knowledgeBase.breathingTips && type === 'mental') {
            const breathing = Array.isArray(knowledgeBase.breathingTips)
                ? knowledgeBase.breathingTips[0]
                : knowledgeBase.breathingTips;
            if (breathing) {
                template += `\n\n🧘 呼吸练习：${breathing}`;
            }
        }
        if (
            Array.isArray(knowledgeBase.mentalSupportLines)
            && knowledgeBase.mentalSupportLines.length > 1
        ) {
            template += `\n\n☎️ 如果需要紧急帮助，请联系：${knowledgeBase.mentalSupportLines.join(' / ')}`;
        }
        if (error) {
            let errorHint = '';
            const errorMsg = (error.message || '').toLowerCase();
            const errorCode = error.code || '';
            const errorStatus = error.status;
            if (
                errorStatus === 401
                || errorStatus === 403
                || errorMsg.includes('api密钥')
                || errorMsg.includes('api key')
            ) {
                errorHint = '\n\n💡 提示：API密钥可能无效，请检查管理员后台的AI配置。';
            } else if (
                errorStatus === 402
                || errorMsg.includes('余额')
                || errorMsg.includes('payment')
            ) {
                errorHint = '\n\n💡 提示：API余额不足，请在管理员后台充值或切换其他AI服务商。';
            } else if (
                errorStatus === 429
                || errorMsg.includes('频率')
                || errorMsg.includes('rate limit')
            ) {
                errorHint = '\n\n💡 提示：请求频率过高，请稍后再试。';
            } else if (
                errorMsg.includes('timeout')
                || errorMsg.includes('超时')
                || errorCode === 'TIMEOUT'
            ) {
                errorHint
                    = '\n\n💡 提示：连接超时，可能是网络问题。系统已尝试通过代理重试，但未成功。';
            } else if (
                errorMsg.includes('network')
                || errorMsg.includes('网络')
                || errorCode === 'NETWORK_ERROR'
            ) {
                errorHint
                    = '\n\n💡 提示：网络连接失败，请检查网络连接。系统已尝试通过代理重试，但未成功。';
            } else if (errorMsg.includes('未配置') || errorMsg.includes('not configured')) {
                errorHint = '\n\n💡 提示：AI服务未配置，请在管理员后台配置AI服务。';
            } else {
                errorHint
                    = '\n\n💡 提示：AI服务暂时不可用，系统已尝试多种方式连接但均失败。请稍后再试或联系管理员。';
            }

            template = template + errorHint;
        }
        return template && typeof template === 'string'
            ? template
            : 'AI服务暂时不可用，请稍后再试。';
    }

    _shouldUseFallback(error) {
        if (!error) {
            return false;
        }
        if (this._isAuthError(error)) {
            return false;
        }
        if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
            return true;
        }
        if (error.status === 0 || error.status === 408) {
            return true;
        }
        const name = error.name || '';
        if (name === 'AbortError' || name === 'TypeError') {
            return true;
        }
        const message = (error.message || '').toLowerCase();
        return (
            message.includes('timeout')
            || message.includes('failed to fetch')
            || message.includes('network')
            || message.includes('网络')
            || message.includes('连接')
            || message.includes('timed_out')
            || message.includes('connection')
            || message.includes('无法连接')
            || message.includes('代理重试')
        );
    }

    _isAuthError(error) {
        if (!error) {
            return false;
        }
        const status = Number(error.status);
        const code = String(error.code || '').toUpperCase();
        const message = String(error.message || '').toLowerCase();

        return status === 401
            || status === 403
            || code === 'UNAUTHORIZED'
            || code === 'FORBIDDEN'
            || message.includes('认证失败')
            || message.includes('重新登录')
            || message.includes('未授权')
            || message.includes('权限不足');
    }

    _normalizeModelAlias(model, provider = this.provider) {
        if (!model || typeof model !== 'string') {
            return model;
        }
        const trimmed = model.trim();
        if (!trimmed) {
            return trimmed;
        }

        // 对于DeepSeek，直接强制映射到支持的模型名称
        if (provider === 'deepseek') {
            const normalizedKey = trimmed.toLowerCase();
            const aliasMap = PROVIDER_MODEL_ALIASES[provider];
            if (aliasMap && aliasMap[normalizedKey]) {
                const mapped = aliasMap[normalizedKey];
                // 确保映射结果是API支持的模型名称
                if (mapped === 'deepseek-chat' || mapped === 'deepseek-reasoner') {
                    return mapped;
                }
                // 如果映射结果不正确，根据特征选择
                if (
                    mapped.includes('reasoner')
                    || mapped.includes('r1')
                    || normalizedKey.includes('r1')
                    || normalizedKey.includes('reasoner')
                ) {
                    return 'deepseek-reasoner';
                }
                return 'deepseek-chat';
            }
            // 如果没有在映射表中找到，根据模型名称特征判断
            if (normalizedKey.includes('reasoner') || normalizedKey.includes('r1')) {
                return 'deepseek-reasoner';
            }
            // 默认使用 deepseek-chat
            return 'deepseek-chat';
        }

        // 其他提供商使用标准映射
        const aliasMap = PROVIDER_MODEL_ALIASES[provider];
        if (!aliasMap) {
            return trimmed;
        }
        const normalizedKey = trimmed.toLowerCase();
        return aliasMap[normalizedKey] || trimmed;
    }

    _markModelUnavailable(provider, model) {
        if (!provider || !model) {
            return;
        }
        if (!this.unavailableModels[provider]) {
            this.unavailableModels[provider] = new Set();
        }
        this.unavailableModels[provider].add(model);
    }

    _isModelUnavailable(provider, model) {
        if (!provider || !model) {
            return false;
        }
        return !!this.unavailableModels[provider]?.has(model);
    }

    _filterUnavailableModels(models, provider = this.provider) {
        if (!Array.isArray(models) || !models.length) {
            return [];
        }
        return models.filter(model => !!model && !this._isModelUnavailable(provider, model));
    }

    clearHistory() {
        this.chatHistory = [];
        this.saveConfig();
    }

    getHistory() {
        return this.chatHistory;
    }
}

window.aiService = new AIService();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
}
