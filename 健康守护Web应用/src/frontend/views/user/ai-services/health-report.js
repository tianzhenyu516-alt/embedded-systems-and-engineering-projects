// 健康报告生成功能模块
import stateManager from './state.js';
import { healthDataManager, DATA_SOURCES, TIME_RANGES } from '../health-guardian/modules/healthDataManager.js';
import { healthReportGenerator } from '../health-guardian/modules/healthReportGenerator.js';
import { aiHealthRecommendationManager } from '../health-guardian/modules/aiHealthRecommendationManager.js';

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

function formatTrendDirection(direction) {
    const mapping = {
        rising: '上升',
        falling: '下降',
        stable: '平稳',
    };
    return mapping[direction] || '平稳';
}

function formatMetricValue(value, unit = '') {
    if (value === undefined || value === null || value === '') {
        return '未提供';
    }
    return `${value}${unit}`.trim();
}

function getUserProfile() {
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        const user = loginInfo.user || {};
        return {
            name: user.realName || user.name || user.username || loginInfo.username || '用户',
            age: user.age || '未知',
            gender: user.gender || '未知',
        };
    } catch (error) {
        return {
            name: '用户',
            age: '未知',
            gender: '未知',
        };
    }
}

function getLatestHealthSnapshot() {
    const records = healthDataManager.getData(DATA_SOURCES.ALL, TIME_RANGES.MONTH);
    const latestRecord = records.length ? records[records.length - 1] : null;
    const indicators = latestRecord?.indicators || {};

    return {
        latestRecord,
        healthMetrics: {
            bloodPressure: indicators.bloodPressureSystolic && indicators.bloodPressureDiastolic
                ? `${indicators.bloodPressureSystolic}/${indicators.bloodPressureDiastolic}`
                : '未提供',
            heartRate: formatMetricValue(indicators.heartRate, ' bpm'),
            bloodSugar: formatMetricValue(indicators.bloodGlucose, ' mmol/L'),
            weight: formatMetricValue(indicators.weight, ' kg'),
            height: formatMetricValue(indicators.height, ' cm'),
            sleepHours: formatMetricValue(indicators.sleepHours, ' 小时'),
            steps: indicators.steps != null
                ? `${indicators.steps} 分钟`
                : '未提供',
        },
    };
}

function buildTrendSection(report) {
    const trendLines = Object.values(report.trends || {}).map(trend => {
        const indicatorName = trend.indicator?.name || '指标';
        const latest = trend.latest ?? '--';
        const avg = trend.avg ?? '--';
        const unit = trend.indicator?.unit || '';
        const status = trend.inNormalRange ? '正常' : (trend.status === 'high' ? '偏高' : '偏低');
        return `${indicatorName}：最新值 ${latest}${unit}，近阶段均值 ${avg}${unit}，趋势${formatTrendDirection(trend.trend)}，当前${status}`;
    });

    return trendLines.length
        ? trendLines.join('；')
        : '首页暂无足够的健康趋势数据，建议继续记录心率、血压、睡眠和运动时长。';
}

function buildDetailedRecommendationSection(aiRecommendations = [], reportRecommendations = []) {
    const mergedRecommendations = [];

    aiRecommendations.forEach(item => {
        mergedRecommendations.push({
            title: item.title,
            content: item.content,
            details: item.details || null,
            priorityText: item.priorityText || '',
        });
    });

    reportRecommendations.forEach(item => {
        mergedRecommendations.push({
            title: item.title,
            content: item.content || item.details?.expectedEffect || '',
            details: item.details || null,
            priorityText: item.priority ? `${item.priority}优先` : '',
        });
    });

    return mergedRecommendations.slice(0, 6).map(item => {
        const implementation = item.details?.implementation?.length
            ? `实施方法：${item.details.implementation.join('；')}`
            : '';
        const expectedEffect = item.details?.expectedEffect
            ? `预期效果：${item.details.expectedEffect}`
            : '';
        const precautions = item.details?.precautions?.length
            ? `注意事项：${item.details.precautions.join('；')}`
            : '';
        return [
            `${item.title}${item.priorityText ? `（${item.priorityText}）` : ''}`,
            item.content ? `建议说明：${item.content}` : '',
            implementation,
            expectedEffect,
            precautions,
        ].filter(Boolean).join('\n');
    }).join('\n\n');
}

function buildFallbackResponse(profile, snapshot, report, aiRecommendations) {
    const riskFactors = (report.riskFactors || []).map(item => item.description).slice(0, 5);
    const topRecommendations = aiRecommendations.length
        ? aiRecommendations.map(item => item.title).slice(0, 5)
        : (report.recommendations || []).map(item => item.title).slice(0, 5);
    const nextSteps = (report.recommendations || [])
        .flatMap(item => item.details?.implementation || [])
        .slice(0, 5);

    return {
        personalInfo: profile,
        healthMetrics: snapshot.healthMetrics,
        analysis: {
            overallHealth: `${report.overview.healthStatus.text}（${report.overview.overallScore}分）-${report.overview.summary}`,
            riskFactors: riskFactors.length ? riskFactors : ['当前未发现明显高风险指标，请保持持续监测'],
            recommendations: topRecommendations.length ? topRecommendations : ['保持规律作息、均衡饮食并持续记录健康数据'],
        },
        detailedSections: [
            {
                title: '首页健康数据同步摘要',
                content: report.overview.summary,
            },
            {
                title: '首页健康趋势同步分析',
                content: buildTrendSection(report),
            },
            {
                title: 'AI建议详情',
                content: buildDetailedRecommendationSection(aiRecommendations, report.recommendations),
            },
        ],
        nextSteps: nextSteps.length ? nextSteps : ['继续记录近30天健康数据并定期查看首页趋势变化'],
        sourceReport: report,
        aiRecommendations,
    };
}

// 健康报告生成功能
const healthReport = {
    /**
     * 生成健康报告
     * @param {Object} healthData - 用户健康数据
     * @returns {Promise<Object>} 健康报告结果
     */
    generateReport: async (healthData = {}) => {
        try {
            const hasConsultation = stateManager.checkAccess('healthConsultation');
            if (!hasConsultation) {
                throw new Error('请先完成健康咨询，然后再生成健康报告');
            }

            const profile = getUserProfile();
            const snapshot = getLatestHealthSnapshot();
            const mergedHealthData = {
                ...profile,
                ...snapshot.healthMetrics,
                ...healthData,
            };
            const cacheKey = stateManager.buildAIResultCacheKey('healthReport', mergedHealthData);
            const cachedResponse = stateManager.getCachedAIResult(cacheKey, 15 * 60 * 1000);
            if (cachedResponse) {
                return cachedResponse;
            }

            return await stateManager.withPendingRequest(cacheKey, async () => {
                stateManager.updateUserHealthData(mergedHealthData);

                healthReportGenerator.clearCache();
                const homepageReport = await healthReportGenerator.generateReport(TIME_RANGES.MONTH, true);
                const aiRecommendations = await aiHealthRecommendationManager.getRecommendations(true);

                let response = null;

                if (window.aiService && typeof window.aiService.chat === 'function') {
                    const prompt = `你是健康分析助手，请基于“首页健康数据概览、首页趋势分析、首页AI建议”生成详细健康报告。严格按以下格式输出，不要添加额外标题：\n[总体情况]\n一句到两句话总结，并明确引用整体评分、健康状态、首页关键趋势。\n[风险因素]\n- 风险1\n- 风险2\n- 风险3\n[建议]\n- 建议1\n- 建议2\n- 建议3\n[详细分析]\n请详细说明首页最新健康数据、趋势变化、异常风险、AI建议实施方法、预期效果和注意事项。\n[后续步骤]\n- 步骤1\n- 步骤2\n- 步骤3\n\n首页健康概览：${JSON.stringify(homepageReport.overview, null, 2)}\n首页趋势分析：${JSON.stringify(homepageReport.trends, null, 2)}\n首页风险提示：${JSON.stringify(homepageReport.riskFactors, null, 2)}\n首页AI建议：${JSON.stringify(aiRecommendations.length ? aiRecommendations : homepageReport.recommendations, null, 2)}\n最新健康指标：${JSON.stringify(snapshot.healthMetrics, null, 2)}`;
                    const analysisText = await window.aiService.chat(prompt);
                    const overallHealth = extractSection(analysisText, '[总体情况]', ['[风险因素]', '[建议]', '[详细分析]', '[后续步骤]'])
                        || `${homepageReport.overview.healthStatus.text}（${homepageReport.overview.overallScore}分）`;
                    const riskFactors = parseList(
                        extractSection(analysisText, '[风险因素]', ['[建议]', '[详细分析]', '[后续步骤]']),
                    );
                    const recommendations = parseList(
                        extractSection(analysisText, '[建议]', ['[详细分析]', '[后续步骤]']),
                    );
                    const detailContent = extractSection(
                        analysisText,
                        '[详细分析]',
                        ['[后续步骤]'],
                    ) || buildDetailedRecommendationSection(aiRecommendations, homepageReport.recommendations);
                    const nextSteps = parseList(extractSection(analysisText, '[后续步骤]'));

                    response = {
                        personalInfo: profile,
                        healthMetrics: snapshot.healthMetrics,
                        analysis: {
                            overallHealth,
                            riskFactors: riskFactors.length
                                ? riskFactors.slice(0, 5)
                                : (homepageReport.riskFactors || []).map(item => item.description).slice(0, 5),
                            recommendations: recommendations.length
                                ? recommendations.slice(0, 6)
                                : (aiRecommendations.length
                                    ? aiRecommendations.map(item => item.title).slice(0, 6)
                                    : (homepageReport.recommendations || []).map(item => item.title).slice(0, 6)),
                        },
                        detailedSections: [
                            {
                                title: '首页健康数据同步摘要',
                                content: homepageReport.overview.summary,
                            },
                            {
                                title: '首页健康趋势同步分析',
                                content: buildTrendSection(homepageReport),
                            },
                            {
                                title: 'AI综合分析与建议详情',
                                content: detailContent,
                            },
                        ],
                        nextSteps: nextSteps.length
                            ? nextSteps.slice(0, 5)
                            : (homepageReport.recommendations || []).flatMap(item => item.details?.implementation || []).slice(0, 5),
                        sourceReport: homepageReport,
                        aiRecommendations,
                    };
                } else {
                    response = buildFallbackResponse(profile, snapshot, homepageReport, aiRecommendations);
                }

                const reportRecord = {
                    healthData: mergedHealthData,
                    report: response,
                };
                stateManager.addHealthReport(reportRecord);
                stateManager.setCachedAIResult(cacheKey, response);

                return response;
            });
        } catch (error) {
            console.error('生成健康报告失败:', error);
            throw error;
        }
    },

    /**
     * 获取健康报告历史
     * @returns {Array} 健康报告历史记录
     */
    getHistory: () => {
        return stateManager.getHealthReportHistory();
    },

    /**
     * 检查是否可以访问健康报告
     * @returns {boolean} 是否可以访问
     */
    canAccess: () => {
        return stateManager.checkAccess('healthConsultation');
    },

    /**
     * 获取健康数据采集模板
     * @returns {Object} 健康数据采集模板
     */
    getHealthDataTemplate: () => {
        return {
            name: '姓名',
            age: '年龄',
            gender: '性别',
            bloodPressure: '血压 (如: 120/80)',
            heartRate: '心率 (如: 75 bpm)',
            bloodSugar: '血糖 (如: 5.6 mmol/L)',
            weight: '体重 (如: 65 kg)',
            height: '身高 (如: 170 cm)',
            medicalHistory: '病史',
            medications: '正在服用的药物',
        };
    },
};

export default healthReport;
