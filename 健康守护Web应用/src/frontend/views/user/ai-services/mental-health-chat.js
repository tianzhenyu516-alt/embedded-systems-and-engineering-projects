// 心理健康聊天功能模块
import stateManager from './state.js';

const normalizeChatContent = value => String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const sanitizeReply = value => normalizeChatContent(value)
    .replace(/```[\s\S]*?```/g, block => block.replace(/```/g, '').trim())
    .replace(/\*\*/g, '')
    .replace(/^[\-•]\s*/gm, '• ')
    .trim();

const normalizeMentalChatRecord = chatRecord => ({
    userMessage: normalizeChatContent(chatRecord?.userMessage || chatRecord?.message),
    aiReply: sanitizeReply(
        chatRecord?.aiReply
        || chatRecord?.reply
        || chatRecord?.assistantMessage
        || chatRecord?.response,
    ),
});

const buildMentalChatHistoryPayload = chatRecord => {
    const normalizedRecord = normalizeMentalChatRecord(chatRecord);
    return {
        userMessage: normalizedRecord.userMessage,
        aiReply: normalizedRecord.aiReply,
    };
};

const getCurrentLoginUser = () => {
    try {
        const raw = sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo');
        if (!raw) {
            return null;
        }

        const loginInfo = JSON.parse(raw);
        return loginInfo?.user || null;
    } catch (error) {
        console.error('读取当前登录用户失败:', error);
        return null;
    }
};

const persistChatRecord = async chatRecord => {
    const currentUser = getCurrentLoginUser();
    const token = window.apiService?.getToken?.();
    if (!currentUser?.id || !window.apiService || !token) {
        console.warn('跳过保存心理聊天记录：缺少登录态或 API 服务', {
            hasUserId: Boolean(currentUser?.id),
            hasApiService: Boolean(window.apiService),
            hasToken: Boolean(token),
        });
        return null;
    }

    const payload = buildMentalChatHistoryPayload(chatRecord);

    if (!payload.userMessage || !payload.aiReply) {
        console.warn('聊天记录内容为空，跳过保存:', {
            hasUserMessage: Boolean(payload.userMessage),
            hasAiReply: Boolean(payload.aiReply),
            chatRecord,
        });
        return null;
    }

    console.debug('准备保存心理聊天记录:', {
        userMessageLength: payload.userMessage.length,
        aiReplyLength: payload.aiReply.length,
        userMessagePreview: payload.userMessage.slice(0, 30),
        aiReplyPreview: payload.aiReply.slice(0, 30),
    });

    return await window.apiService._request('/mental-health-chat/history', 'POST', payload);
};

const normalizeHistoryResponse = response => {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.records)) {
        return response.records;
    }

    if (Array.isArray(response?.data?.records)) {
        return response.data.records;
    }

    return [];
};

const normalizeHistoryRecord = record => ({
    ...record,
    id: record?.id || null,
    userMessage: normalizeChatContent(record?.userMessage),
    aiReply: normalizeChatContent(record?.aiReply),
    timestamp: record?.timestamp || null,
});

const parseHistoryTimestamp = timestamp => {
    if (!timestamp) {
        return 0;
    }

    const value = new Date(timestamp).getTime();
    return Number.isNaN(value) ? 0 : value;
};

const isSameHistoryRecord = (left, right) => {
    if (!left || !right) {
        return false;
    }

    if (left.id && right.id && left.id === right.id) {
        return true;
    }

    if (left.userMessage !== right.userMessage || left.aiReply !== right.aiReply) {
        return false;
    }

    const leftTime = parseHistoryTimestamp(left.timestamp);
    const rightTime = parseHistoryTimestamp(right.timestamp);
    if (!leftTime || !rightTime) {
        return true;
    }

    return Math.abs(leftTime - rightTime) <= 2 * 60 * 1000;
};

const mergeHistoryRecords = (localHistory = [], remoteHistory = []) => {
    const merged = [];

    [...remoteHistory, ...localHistory]
        .map(normalizeHistoryRecord)
        .filter(record => record.userMessage || record.aiReply)
        .sort((left, right) => parseHistoryTimestamp(right.timestamp) - parseHistoryTimestamp(left.timestamp))
        .forEach(record => {
            if (!merged.some(existing => isSameHistoryRecord(existing, record))) {
                merged.push(record);
            }
        });

    return merged;
};

// 心理健康聊天功能
const mentalHealthChat = {
    /**
     * 发送心理健康咨询消息
     * @param {string} message - 用户消息
     * @param {Object} options - 流式回调等附加配置
     * @returns {Promise<Object>} AI回复
     */
    sendMessage: async (message, options = {}) => {
        try {
            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                throw new Error('消息内容不能为空');
            }

            const normalizedMessage = normalizeChatContent(message);
            if (!normalizedMessage) {
                throw new Error('消息内容不能为空');
            }
            const shouldStream = options.stream === true;
            const cacheKey = stateManager.buildAIResultCacheKey('mentalHealthChat', {
                message: normalizedMessage,
            });
            const cachedResponse = !shouldStream
                ? stateManager.getCachedAIResult(cacheKey, 5 * 60 * 1000)
                : null;
            if (cachedResponse) {
                return cachedResponse;
            }

            return await stateManager.withPendingRequest(cacheKey, async () => {
                let rawReply = '';

                if (window.aiService && typeof window.aiService.getMentalSupport === 'function') {
                    rawReply = await window.aiService.getMentalSupport(
                        normalizedMessage,
                        'warm',
                        options,
                    );
                } else {
                    rawReply = `我理解您的感受。关于"${normalizedMessage}"，我建议您：\n1. 尝试深呼吸和冥想\n2. 保持规律的作息时间\n3. 与亲友分享您的感受\n4. 如果情绪持续低落，建议寻求专业心理咨询师的帮助`;
                }

                let reply = sanitizeReply(
                    typeof rawReply === 'string'
                        ? rawReply
                        : rawReply?.reply || rawReply?.content || rawReply?.data?.content || '',
                );
                const isEmptyAiReply = !reply;
                if (isEmptyAiReply) {
                    throw new Error('心理 AI 返回了空内容，请稍后重试或联系管理员检查 AI 服务。');
                }

                const response = {
                    reply,
                    cached: false,
                    timestamp: new Date().toISOString(),
                };
                const chatRecord = normalizeMentalChatRecord({
                    userMessage: normalizedMessage,
                    aiReply: reply,
                });
                stateManager.addMentalHealthChat(chatRecord);
                try {
                    await persistChatRecord(chatRecord);
                } catch (persistError) {
                    console.error('保存心理聊天记录到数据库失败:', persistError, chatRecord);
                }
                if (!shouldStream) {
                    stateManager.setCachedAIResult(cacheKey, response);
                }

                return response;
            });
        } catch (error) {
            console.error('心理健康聊天失败:', error);
            throw error;
        }
    },

    /**
     * 获取心理健康聊天历史
     * @returns {Array} 聊天历史记录
     */
    getHistory: async () => {
        const localHistory = stateManager.getMentalHealthChatHistory();
        const currentUser = getCurrentLoginUser();
        const token = window.apiService?.getToken?.();
        if (currentUser?.id && window.apiService && token) {
            try {
                const response = await window.apiService._request('/mental-health-chat/history', 'GET');
                const remoteHistory = normalizeHistoryResponse(response);
                const mergedHistory = mergeHistoryRecords(localHistory, remoteHistory);
                stateManager.setMentalHealthChatHistory(mergedHistory);
                return mergedHistory;
            } catch (error) {
                console.error('从数据库获取心理聊天记录失败:', error);
            }
        }

        return mergeHistoryRecords(localHistory, []);
    },
};

export default mentalHealthChat;
