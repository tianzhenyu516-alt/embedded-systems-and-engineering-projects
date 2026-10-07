// 健康生活推荐功能模块
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

// 健康生活推荐功能
const healthRecommendation = {
    /**
     * 获取健康生活推荐
     * @param {Object} userInfo - 用户信息
     * @returns {Promise<Object>} 健康生活建议
     */
    getRecommendations: async (userInfo = {}) => {
        try {
            const cacheKey = stateManager.buildAIResultCacheKey('healthRecommendation', userInfo || {});
            const cachedResponse = stateManager.getCachedAIResult(cacheKey, 15 * 60 * 1000);
            if (cachedResponse) {
                return cachedResponse;
            }

            return await stateManager.withPendingRequest(cacheKey, async () => {
                let response = null;

                if (window.aiService && typeof window.aiService.chat === 'function') {
                    const prompt = `你是健康管理助手，请根据用户信息输出结构化健康生活建议。严格按以下格式输出，不要添加额外标题：\n[生活方式建议]\n- 建议1\n- 建议2\n- 建议3\n[疾病预防建议]\n- 建议1\n- 建议2\n- 建议3\n[个性化建议]\n- 建议1\n- 建议2\n\n用户信息：${JSON.stringify(userInfo, null, 2)}`;
                    const resultText = await window.aiService.chat(prompt);
                    const lifestyleTips = parseList(
                        extractSection(resultText, '[生活方式建议]', ['[疾病预防建议]', '[个性化建议]']),
                    );
                    const diseasePrevention = parseList(
                        extractSection(resultText, '[疾病预防建议]', ['[个性化建议]']),
                    );
                    const personalizedTips = parseList(extractSection(resultText, '[个性化建议]'));

                    response = {
                        lifestyleTips: lifestyleTips.length ? lifestyleTips.slice(0, 4) : ['保持规律作息，避免熬夜', '每周坚持适度运动'],
                        diseasePrevention: diseasePrevention.length ? diseasePrevention.slice(0, 4) : ['定期体检，关注基础指标', '如有异常尽早就医'],
                        personalizedTips: personalizedTips.length ? personalizedTips.slice(0, 3) : ['结合个人情况持续调整作息和饮食'],
                    };
                } else {
                    response = {
                        lifestyleTips: [
                            '保持每天至少30分钟的中等强度运动',
                            '每天饮用足够的水，建议8杯水',
                            '保持规律的作息时间，确保充足的睡眠',
                            '均衡饮食，多摄入蔬菜水果',
                        ],
                        diseasePrevention: [
                            '定期进行健康体检',
                            '保持良好的个人卫生习惯',
                            '避免过度劳累和压力',
                            '接种必要的疫苗',
                        ],
                        personalizedTips: userInfo.age
                            ? [
                                `根据您的年龄(${userInfo.age})，建议定期进行相关健康检查`,
                                '注意保持适当的体重和身体活动',
                            ]
                            : ['建议根据个人情况制定适合的健康计划'],
                    };
                }

                const recommendationRecord = {
                    userInfo,
                    recommendations: response,
                };
                stateManager.addHealthRecommendation(recommendationRecord);
                stateManager.setCachedAIResult(cacheKey, response);

                return response;
            });
        } catch (error) {
            console.error('获取健康生活推荐失败:', error);
            throw error;
        }
    },

    /**
     * 获取健康生活推荐历史
     * @returns {Array} 推荐历史记录
     */
    getHistory: () => {
        return stateManager.getHealthRecommendationHistory();
    },
};

export default healthRecommendation;
