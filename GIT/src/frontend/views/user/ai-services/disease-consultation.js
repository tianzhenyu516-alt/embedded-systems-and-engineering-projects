// 病因咨询功能模块
import stateManager from './state.js';

function cleanAIText(text = '') {
    return text
        .replace(/\r/g, '')
        .replace(/\*\*/g, '')
        .replace(/###?/g, '')
        .trim();
}

function extractSection(text, title, nextTitles = []) {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nextPattern = nextTitles.length
        ? nextTitles.map(item => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
        : '$';
    const regex = new RegExp(`${escapedTitle}[：:]?\\s*([\\s\\S]*?)(?=${nextPattern ? `(?:${nextPattern})` : '$'}|$)`);
    const match = cleanAIText(text).match(regex);
    return match?.[1]?.trim() || '';
}

function parseList(sectionText) {
    return cleanAIText(sectionText)
        .split('\n')
        .map(line => line.replace(/^[-•\d.\s]+/, '').trim())
        .filter(Boolean);
}

function getDefaultConsultationResponse(symptoms) {
    const fallbackConfig = window.AI_CONFIG?.FALLBACK?.defaults?.diseaseConsultation || {};
    const normalizedSymptoms = (symptoms || '').trim();

    return {
        analysis:
            fallbackConfig.analysis
            || `根据您描述的症状“${normalizedSymptoms}”，建议先观察症状变化，并结合线下检查进一步判断。`,
        possibleCauses:
            Array.isArray(fallbackConfig.possibleCauses) && fallbackConfig.possibleCauses.length
                ? fallbackConfig.possibleCauses.slice(0, 3)
                : [
                    '常见上呼吸道感染或季节性不适',
                    '疲劳、作息不规律或压力因素影响',
                    '存在其他需要结合检查确认的健康问题',
                ],
        suggestions:
            Array.isArray(fallbackConfig.suggestions) && fallbackConfig.suggestions.length
                ? fallbackConfig.suggestions.slice(0, 3)
                : [
                    '先注意休息、补充水分并清淡饮食',
                    '持续记录症状变化，如发热、疼痛或不适是否加重',
                    '如症状持续不缓解或明显加重，请及时前往正规医院就诊',
                ],
    };
}

// 病因咨询功能
const diseaseConsultation = {
    /**
     * 分析病因
     * @param {string} symptoms - 症状描述
     * @returns {Promise<Object>} 病因分析结果
     */
    analyzeSymptoms: async symptoms => {
        try {
            if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length === 0) {
                throw new Error('症状描述不能为空');
            }

            const normalizedSymptoms = symptoms.trim();
            const cacheKey = stateManager.buildAIResultCacheKey('diseaseConsultation', {
                symptoms: normalizedSymptoms,
            });
            const cachedResponse = stateManager.getCachedAIResult(cacheKey, 10 * 60 * 1000);
            if (cachedResponse) {
                return cachedResponse;
            }

            return await stateManager.withPendingRequest(cacheKey, async () => {
                let response = getDefaultConsultationResponse(normalizedSymptoms);

                if (window.aiService && typeof window.aiService.chat === 'function') {
                    const prompt = `你是医疗健康助手，仅提供参考建议，不能替代医生。请严格按以下格式输出，不要添加额外标题：\n[分析]\n用1段话说明症状判断与严重程度。\n[可能原因]\n- 原因1\n- 原因2\n- 原因3\n[建议]\n- 建议1\n- 建议2\n- 建议3\n\n症状描述：${normalizedSymptoms}`;
                    const analysisText = await window.aiService.chat(prompt);
                    const analysis = extractSection(analysisText, '[分析]', ['[可能原因]', '[建议]'])
                        || cleanAIText(analysisText).split('\n')[0]
                        || response.analysis;
                    const possibleCauses = parseList(
                        extractSection(analysisText, '[可能原因]', ['[建议]']),
                    );
                    const suggestions = parseList(extractSection(analysisText, '[建议]'));

                    response = {
                        analysis,
                        possibleCauses: possibleCauses.length ? possibleCauses.slice(0, 3) : response.possibleCauses,
                        suggestions: suggestions.length ? suggestions.slice(0, 3) : response.suggestions,
                        rawReply: cleanAIText(analysisText),
                    };
                }

                const consultationRecord = {
                    symptoms: normalizedSymptoms,
                    analysis: response.analysis,
                    possibleCauses: response.possibleCauses,
                    suggestions: response.suggestions,
                    rawReply: response.rawReply || '',
                };
                stateManager.addDiseaseConsultation(consultationRecord);

                stateManager.setCachedAIResult(cacheKey, response);
                return response;
            });
        } catch (error) {
            console.error('病因分析失败:', error);
            throw error;
        }
    },

    /**
     * 获取病因咨询历史
     * @returns {Array} 咨询历史记录
     */
    getHistory: () => {
        return stateManager.getDiseaseConsultationHistory();
    },
};

export default diseaseConsultation;
