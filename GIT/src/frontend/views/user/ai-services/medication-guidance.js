// 用药指导功能模块
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

function parseMedicationRecommendations(sectionText) {
    return cleanAIText(sectionText)
        .split('\n')
        .map(line => line.replace(/^[-•\d.\s]+/, '').trim())
        .filter(Boolean)
        .slice(0, 3)
        .map(item => {
            const parts = item.split(/\s*[：:]-\s*|\s+-\s+/);
            const name = parts[0]?.trim() || item;
            const description = parts.slice(1).join(' - ').trim() || '适用于当前症状，请按说明书或药师建议使用';
            return { name, description };
        });
}

function getDefaultMedicationGuidance(medication, condition) {
    const fallbackConfig = window.AI_CONFIG?.FALLBACK?.defaults?.medicationGuidance || {};
    const normalizedMedication = (medication || '非处方药建议').trim();
    const normalizedCondition = (condition || '').trim();
    const dosagePrefix = fallbackConfig.dosagePrefix || '请严格按照药品说明书或医生建议使用';

    return {
        medication: normalizedMedication,
        medications: [
            {
                name: normalizedMedication,
                description: normalizedCondition || '适用于常见轻症不适，请按说明书或药师建议使用',
            },
        ],
        condition: normalizedCondition,
        dosage: `${dosagePrefix}${normalizedMedication}`,
        instructions:
            Array.isArray(fallbackConfig.instructions) && fallbackConfig.instructions.length
                ? fallbackConfig.instructions.slice(0, 4)
                : [
                    '服药前请仔细阅读药品说明书并核对适应症',
                    '请按推荐时间和剂量服用，不要自行增减药量',
                    '如同时使用其他药物，请先咨询医生或药师',
                    '服药期间若症状无改善，请及时复诊',
                ],
        precautions:
            Array.isArray(fallbackConfig.precautions) && fallbackConfig.precautions.length
                ? fallbackConfig.precautions.slice(0, 4)
                : [
                    '如有过敏史、孕期、哺乳期或慢性病史，请先咨询医生',
                    '出现皮疹、呼吸不适等异常反应时应立即停药并就医',
                    '避免与酒精或可能相互作用的药物同时使用',
                    '请将药品放在儿童接触不到的地方',
                ],
        storage:
            fallbackConfig.storage
            || '请将药物存放于阴凉、干燥、避光处，并按说明书要求保存。',
    };
}

// 用药指导功能
const medicationGuidance = {
    /**
     * 获取用药指导
     * @param {string} medication - 药物名称，可为空
     * @param {string} condition - 病情描述
     * @returns {Promise<Object>} 用药指导结果
     */
    getGuidance: async (medication, condition) => {
        try {
            const hasConsultation = stateManager.checkAccess('healthConsultation');
            if (!hasConsultation) {
                throw new Error('请先完成健康咨询，然后再获取用药指导');
            }

            const normalizedMedication = (medication || '').trim();
            const normalizedCondition = (condition || '').trim();
            const cacheKey = stateManager.buildAIResultCacheKey('medicationGuidance', {
                medication: normalizedMedication,
                condition: normalizedCondition,
            });
            const cachedResponse = stateManager.getCachedAIResult(cacheKey, 15 * 60 * 1000);
            if (cachedResponse) {
                return cachedResponse;
            }

            return await stateManager.withPendingRequest(cacheKey, async () => {
                let response = getDefaultMedicationGuidance(
                    normalizedMedication,
                    normalizedCondition,
                );

                if (window.aiService && typeof window.aiService.chat === 'function') {
                    const prompt = normalizedMedication
                        ? `你是用药指导助手，仅提供参考建议，不能替代医生和药师。请根据给定药物和病情，输出结构化用药指导。严格按以下格式输出，不要添加额外标题：\n[推荐药品]\n一句话说明当前药品是否适合该症状。\n[建议剂量]\n一句话说明。\n[用药说明]\n- 说明1\n- 说明2\n- 说明3\n[注意事项]\n- 注意1\n- 注意2\n- 注意3\n[储存方式]\n一句话说明。\n\n药物名称：${normalizedMedication}\n病情描述：${normalizedCondition}`
                        : `你是用药指导助手，仅提供参考建议，不能替代医生和药师。请根据用户症状推荐合适的常见非处方药（OTC），并输出结构化结果。严格按以下格式输出，不要添加额外标题：\n[推荐药品]\n请列出1到3种常见非处方药，每行一个，格式：药品名称 - 适用症状说明。\n[建议剂量]\n一句话说明。\n[用药说明]\n- 说明1\n- 说明2\n- 说明3\n[注意事项]\n- 注意1\n- 注意2\n- 注意3\n[储存方式]\n一句话说明。\n\n病情描述：${normalizedCondition}\n要求：只推荐常见非处方药，不要推荐处方药。`;
                    const resultText = await window.aiService.chat(prompt);
                    const recommendationSection = extractSection(resultText, '[推荐药品]', ['[建议剂量]', '[用药说明]', '[注意事项]', '[储存方式]']);
                    const medications = parseMedicationRecommendations(recommendationSection);
                    const recommendedMedication = medications[0]?.name
                        || normalizedMedication
                        || response.medication;
                    const dosage = extractSection(resultText, '[建议剂量]', ['[用药说明]', '[注意事项]', '[储存方式]'])
                        || response.dosage;
                    const instructions = parseList(
                        extractSection(resultText, '[用药说明]', ['[注意事项]', '[储存方式]']),
                    );
                    const precautions = parseList(
                        extractSection(resultText, '[注意事项]', ['[储存方式]']),
                    );
                    const storage = extractSection(resultText, '[储存方式]') || response.storage;

                    response = {
                        medication: recommendedMedication,
                        medications: medications.length ? medications : response.medications,
                        condition: normalizedCondition,
                        dosage,
                        instructions: instructions.length ? instructions.slice(0, 4) : response.instructions,
                        precautions: precautions.length ? precautions.slice(0, 4) : response.precautions,
                        storage,
                        rawReply: cleanAIText(resultText),
                    };
                }

                const guidanceRecord = {
                    medication: normalizedMedication,
                    condition: normalizedCondition,
                    guidance: response,
                    rawReply: response.rawReply || '',
                };
                stateManager.addMedicationGuidance(guidanceRecord);
                stateManager.setCachedAIResult(cacheKey, response);

                return response;
            });
        } catch (error) {
            console.error('获取用药指导失败:', error);
            throw error;
        }
    },

    /**
     * 获取用药指导历史
     * @returns {Array} 用药指导历史记录
     */
    getHistory: () => {
        return stateManager.getMedicationGuidanceHistory();
    },

    /**
     * 检查是否可以访问用药指导
     * @returns {boolean} 是否可以访问
     */
    canAccess: () => {
        return stateManager.checkAccess('healthConsultation');
    },
};

export default medicationGuidance;
