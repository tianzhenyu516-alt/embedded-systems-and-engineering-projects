import { healthDataManager, HEALTH_INDICATORS, DATA_SOURCES, TIME_RANGES } from './healthDataManager.js';

const RISK_LEVELS = {
    LOW: { id: 'low', name: '低风险', color: '#34C759', priority: 1 },
    MEDIUM: { id: 'medium', name: '中风险', color: '#FF9500', priority: 2 },
    HIGH: { id: 'high', name: '高风险', color: '#FF3B30', priority: 3 },
};

class HealthReportGenerator {
    constructor() {
        this.cache = null;
        this.cacheTime = null;
        this.cacheDuration = 5 * 60 * 1000;
    }

    async generateReport(timeRange = TIME_RANGES.MONTH, forceRefresh = false) {
        const startTime = Date.now();
        
        if (!forceRefresh && this.cache && this.cacheTime && 
            (Date.now() - this.cacheTime < this.cacheDuration) &&
            this.cache.timeRange.id === timeRange.id) {
            return this.cache.report;
        }

        try {
            const rawData = this.fetchHealthData(timeRange);
            const validatedData = this.validateData(rawData, timeRange);
            const analyzedData = this.analyzeHealthData(validatedData, timeRange);
            const report = this.buildReportStructure(analyzedData, timeRange);
            
            this.cache = { report, timeRange };
            this.cacheTime = Date.now();

            const totalTime = Date.now() - startTime;
            console.log(`健康报告生成耗时: ${totalTime}ms`);
            
            return report;
        } catch (error) {
            console.error('生成健康报告失败:', error);
            throw error;
        }
    }

    fetchHealthData(timeRange) {
        const indicatorIds = Object.values(HEALTH_INDICATORS).map(i => i.id);
        const rawRecords = healthDataManager.getData(DATA_SOURCES.ALL, timeRange, indicatorIds);
        const aggregatedData = healthDataManager.getAggregatedData(DATA_SOURCES.ALL, timeRange, indicatorIds);
        
        return { rawRecords, aggregatedData, indicatorIds };
    }

    validateData(data, timeRange) {
        const { rawRecords, aggregatedData, indicatorIds } = data;
        const validation = {
            isValid: true,
            issues: [],
            completeness: {},
            continuity: {}
        };

        const expectedDays = timeRange.days;
        const actualDays = new Set(aggregatedData.map(d => d.date)).size;
        const completenessRatio = actualDays / expectedDays;

        if (completenessRatio < 0.5) {
            validation.isValid = false;
            validation.issues.push(`数据完整性不足 (${Math.round(completenessRatio * 100)}%)，建议补充更多健康记录`);
        }

        indicatorIds.forEach(indicatorId => {
            const indicator = Object.values(HEALTH_INDICATORS).find(i => i.id === indicatorId);
            const hasData = aggregatedData.some(d => d.indicators[indicatorId] !== undefined);
            validation.completeness[indicatorId] = hasData;
            
            if (!hasData) {
                validation.issues.push(`${indicator.name}数据缺失`);
            }
        });

        for (let i = 1; i < aggregatedData.length; i++) {
            const prevDate = new Date(aggregatedData[i - 1].date);
            const currDate = new Date(aggregatedData[i].date);
            const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
            
            if (dayDiff > 3) {
                validation.continuity[aggregatedData[i].date] = `间隔${dayDiff}天`;
            }
        }

        return { ...data, validation };
    }

    analyzeHealthData(data, timeRange) {
        const { aggregatedData, validation } = data;
        const analysis = {
            trends: {},
            anomalies: [],
            correlations: [],
            overallScore: 0,
            riskFactors: []
        };

        Object.values(HEALTH_INDICATORS).forEach(indicator => {
            const indicatorData = aggregatedData
                .map(d => ({ date: d.date, value: d.indicators[indicator.id] }))
                .filter(d => d.value !== undefined);

            if (indicatorData.length > 0) {
                analysis.trends[indicator.id] = this.analyzeIndicatorTrend(indicatorData, indicator);
                
                const anomalies = this.detectAnomalies(indicatorData, indicator);
                analysis.anomalies.push(...anomalies);
            }
        });

        analysis.correlations = this.analyzeCorrelations(aggregatedData);
        analysis.overallScore = this.calculateOverallScore(analysis.trends);
        analysis.riskFactors = this.identifyRiskFactors(analysis);

        return { ...data, analysis };
    }

    analyzeIndicatorTrend(data, indicator) {
        const values = data.map(d => d.value);
        const latest = values[values.length - 1];
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        let trend = 'stable';
        if (values.length >= 7) {
            const firstHalf = values.slice(0, Math.floor(values.length / 2));
            const secondHalf = values.slice(Math.floor(values.length / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

            if (changePercent > 10) trend = 'rising';
            else if (changePercent < -10) trend = 'falling';
        }

        const inNormalRange = latest >= indicator.normalMin && latest <= indicator.normalMax;

        return {
            indicator,
            data,
            latest,
            avg: Math.round(avg * 100) / 100,
            min,
            max,
            trend,
            inNormalRange,
            status: inNormalRange ? 'normal' : (latest < indicator.normalMin ? 'low' : 'high')
        };
    }

    detectAnomalies(data, indicator) {
        const anomalies = [];
        const values = data.map(d => d.value);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length);

        data.forEach((point, index) => {
            const zScore = Math.abs((point.value - avg) / stdDev);
            if (zScore > 2 && stdDev > 0) {
                anomalies.push({
                    indicator,
                    date: point.date,
                    value: point.value,
                    expected: Math.round(avg),
                    severity: zScore > 3 ? 'high' : 'medium'
                });
            }
        });

        return anomalies;
    }

    analyzeCorrelations(aggregatedData) {
        const correlations = [];
        const indicators = Object.values(HEALTH_INDICATORS);

        for (let i = 0; i < indicators.length; i++) {
            for (let j = i + 1; j < indicators.length; j++) {
                const ind1 = indicators[i];
                const ind2 = indicators[j];
                
                const values1 = [];
                const values2 = [];

                aggregatedData.forEach(d => {
                    if (d.indicators[ind1.id] !== undefined && d.indicators[ind2.id] !== undefined) {
                        values1.push(d.indicators[ind1.id]);
                        values2.push(d.indicators[ind2.id]);
                    }
                });

                if (values1.length >= 10) {
                    const correlation = this.calculatePearsonCorrelation(values1, values2);
                    if (Math.abs(correlation) > 0.5) {
                        correlations.push({
                            indicator1: ind1,
                            indicator2: ind2,
                            correlation: Math.round(correlation * 100) / 100,
                            type: correlation > 0 ? 'positive' : 'negative'
                        });
                    }
                }
            }
        }

        return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    }

    calculatePearsonCorrelation(x, y) {
        const n = x.length;
        const meanX = x.reduce((a, b) => a + b, 0) / n;
        const meanY = y.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let denomX = 0;
        let denomY = 0;

        for (let i = 0; i < n; i++) {
            const dx = x[i] - meanX;
            const dy = y[i] - meanY;
            numerator += dx * dy;
            denomX += dx * dx;
            denomY += dy * dy;
        }

        const denominator = Math.sqrt(denomX * denomY);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    calculateOverallScore(trends) {
        let score = 0;
        let count = 0;

        Object.values(trends).forEach(trend => {
            count++;
            const indicator = trend.indicator;
            const value = trend.latest;
            
            let indicatorScore = 0;
            if (value >= indicator.normalMin && value <= indicator.normalMax) {
                indicatorScore = 100;
            } else {
                const range = indicator.normalMax - indicator.normalMin;
                const midPoint = (indicator.normalMin + indicator.normalMax) / 2;
                const distance = Math.abs(value - midPoint);
                indicatorScore = Math.max(0, 100 - (distance / range) * 50);
            }
            
            score += indicatorScore;
        });

        return count > 0 ? Math.round(score / count) : 0;
    }

    identifyRiskFactors(analysis) {
        const riskFactors = [];

        Object.values(analysis.trends).forEach(trend => {
            if (!trend.inNormalRange) {
                const riskLevel = this.determineRiskLevel(trend);
                riskFactors.push({
                    type: 'indicator',
                    indicator: trend.indicator,
                    status: trend.status,
                    value: trend.latest,
                    riskLevel,
                    description: this.getRiskDescription(trend)
                });
            }
        });

        analysis.anomalies.forEach(anomaly => {
            riskFactors.push({
                type: 'anomaly',
                indicator: anomaly.indicator,
                date: anomaly.date,
                value: anomaly.value,
                expected: anomaly.expected,
                severity: anomaly.severity,
                riskLevel: anomaly.severity === 'high' ? RISK_LEVELS.HIGH : RISK_LEVELS.MEDIUM,
                description: `${anomaly.indicator.name}在${anomaly.date}出现异常值${anomaly.value}，预期约${anomaly.expected}`
            });
        });

        return riskFactors.sort((a, b) => b.riskLevel.priority - a.riskLevel.priority);
    }

    determineRiskLevel(trend) {
        const indicator = trend.indicator;
        const value = trend.latest;
        const range = indicator.normalMax - indicator.normalMin;
        
        if (trend.status === 'high') {
            const excess = (value - indicator.normalMax) / range;
            if (excess > 0.5) return RISK_LEVELS.HIGH;
            if (excess > 0.2) return RISK_LEVELS.MEDIUM;
        } else if (trend.status === 'low') {
            const deficit = (indicator.normalMin - value) / range;
            if (deficit > 0.5) return RISK_LEVELS.HIGH;
            if (deficit > 0.2) return RISK_LEVELS.MEDIUM;
        }
        
        return RISK_LEVELS.LOW;
    }

    getRiskDescription(trend) {
        const indicator = trend.indicator;
        if (trend.status === 'high') {
            return `${indicator.name}偏高 (${trend.latest}${indicator.unit})，正常范围为${indicator.normalMin}-${indicator.normalMax}${indicator.unit}`;
        } else {
            return `${indicator.name}偏低 (${trend.latest}${indicator.unit})，正常范围为${indicator.normalMin}-${indicator.normalMax}${indicator.unit}`;
        }
    }

    buildReportStructure(analyzedData, timeRange) {
        const { analysis, validation, aggregatedData } = analyzedData;
        
        return {
            metadata: {
                generatedAt: new Date().toISOString(),
                timeRange,
                dataPoints: aggregatedData.length,
                validation: {
                    isValid: validation.isValid,
                    issues: validation.issues
                }
            },
            overview: {
                overallScore: analysis.overallScore,
                healthStatus: this.getHealthStatus(analysis.overallScore),
                summary: this.generateHealthSummary(analysis)
            },
            trends: analysis.trends,
            riskFactors: analysis.riskFactors,
            correlations: analysis.correlations,
            recommendations: this.generateRecommendations(analysis),
            visualData: this.prepareVisualData(analyzedData)
        };
    }

    getHealthStatus(score) {
        if (score >= 85) return { text: '优秀', color: '#34C759' };
        if (score >= 70) return { text: '良好', color: '#5AC8FA' };
        if (score >= 50) return { text: '一般', color: '#FF9500' };
        return { text: '需关注', color: '#FF3B30' };
    }

    generateHealthSummary(analysis) {
        const normalCount = Object.values(analysis.trends).filter(t => t.inNormalRange).length;
        const totalCount = Object.keys(analysis.trends).length;
        const riskCount = analysis.riskFactors.length;

        let summary = '';
        if (analysis.overallScore >= 70) {
            summary = `您的整体健康状况良好，${normalCount}/${totalCount}项指标在正常范围内。`;
        } else {
            summary = `您的健康状况需要关注，仅有${normalCount}/${totalCount}项指标在正常范围内。`;
        }

        if (riskCount > 0) {
            summary += ` 发现${riskCount}个需要关注的健康风险因素。`;
        }

        return summary;
    }

    generateRecommendations(analysis) {
        const recommendations = [];

        analysis.riskFactors.forEach(risk => {
            if (risk.type === 'indicator') {
                recommendations.push(this.generateDetailedIndicatorRecommendation(risk));
            }
        });

        const generalRecs = this.generateDetailedGeneralRecommendations(analysis);
        recommendations.push(...generalRecs);

        return recommendations.slice(0, 6);
    }

    generateDetailedIndicatorRecommendation(risk) {
        const indicator = risk.indicator;
        let details = null;
        let priority = risk.riskLevel.id;

        switch (indicator.id) {
            case 'heartRate':
                details = risk.status === 'high' 
                    ? {
                        implementation: [
                            '保持心态平和，避免过度紧张和焦虑',
                            '避免剧烈运动，可选择散步、瑜伽等轻度活动',
                            '每天定时监测心率2-3次并记录',
                            '保证充足休息，避免熬夜'
                        ],
                        expectedEffect: '2-4周内心率可逐渐平稳，不适感减轻',
                        precautions: [
                            '如心率持续超过100bpm并伴有不适，请立即就医',
                            '避免饮用浓茶、咖啡等刺激性饮品',
                            '不要自行服用调整心率的药物'
                        ]
                    }
                    : {
                        implementation: [
                            '每周进行3-4次有氧运动，每次30分钟',
                            '可选择快走、慢跑、游泳、骑车等运动',
                            '运动时注意监测心率，保持在目标心率范围内',
                            '循序渐进增加运动量'
                        ],
                        expectedEffect: '4-6周后心肺功能明显提升，心率更稳定',
                        precautions: [
                            '运动前做好热身，运动后做好拉伸',
                            '如运动中感到不适，立即停止并休息',
                            '有心脏病史者请在医生指导下运动'
                        ]
                    };
                break;
            case 'bloodPressureSystolic':
                details = risk.status === 'high'
                    ? {
                        implementation: [
                            '每日食盐摄入量控制在5克以内',
                            '多吃新鲜蔬菜和水果，增加钾的摄入',
                            '控制体重，保持BMI在18.5-23.9之间',
                            '避免情绪激动，保持心态平稳',
                            '每周至少监测血压3次'
                        ],
                        expectedEffect: '4-8周内血压可有所下降，头晕等症状减轻',
                        precautions: [
                            '如血压持续超过140/90mmHg，请及时就医',
                            '遵医嘱服用降压药物，不要擅自停药',
                            '避免突然变换体位，防止体位性低血压'
                        ]
                    }
                    : {
                        implementation: [
                            '适当增加盐分摄入，但不要过量',
                            '保证充足的饮水量，每天1500-2000ml',
                            '避免长时间站立，变换体位时动作要慢',
                            '穿弹力袜可帮助改善血液循环'
                        ],
                        expectedEffect: '2-3周内血压可逐步回升，头晕症状减轻',
                        precautions: [
                            '如出现严重头晕、黑矇，请立即就医',
                            '避免在高温环境下久留',
                            '不要憋尿，避免膀胱过度充盈'
                        ]
                    };
                break;
            case 'bloodPressureDiastolic':
                details = risk.status === 'high'
                    ? {
                        implementation: [
                            '每日食盐摄入量控制在5克以内',
                            '多吃新鲜蔬菜和水果，增加钾的摄入',
                            '保持规律作息，避免熬夜',
                            '避免情绪激动，保持心态平稳',
                            '每周至少监测血压3次'
                        ],
                        expectedEffect: '4-8周内舒张压有望逐步回落并更加平稳',
                        precautions: [
                            '如血压持续超过140/90mmHg，请及时就医',
                            '遵医嘱服用降压药物，不要擅自停药',
                            '避免突然变换体位，防止不适'
                        ]
                    }
                    : {
                        implementation: [
                            '保证充足饮水和规律进食',
                            '避免长时间站立，变换体位时动作要慢',
                            '适当进行轻中强度活动，促进血液循环',
                            '保证休息，避免过度疲劳'
                        ],
                        expectedEffect: '2-3周内舒张压可逐步恢复到更稳定水平',
                        precautions: [
                            '如出现明显头晕、黑矇，请立即就医',
                            '避免在高温环境下久留',
                            '不要过度节食或脱水'
                        ]
                    };
                break;
            case 'sleepHours':
                details = {
                    implementation: [
                        '建立规律作息，每天固定时间上床和起床',
                        '睡前1小时避免使用手机、电脑等电子设备',
                        '保持卧室黑暗、安静、温度适宜（20-22℃）',
                        '睡前可进行放松活动，如阅读、听轻音乐',
                        '避免午后饮用咖啡、茶等兴奋性饮品'
                    ],
                    expectedEffect: '2-4周内睡眠节律更稳定，白天精神状态更好',
                    precautions: [
                        '如长期失眠，请咨询医生，不要自行服用安眠药',
                        '睡前不要吃得过饱或过于饥饿',
                        '避免睡前剧烈运动'
                    ]
                };
                priority = 'medium';
                break;
            case 'steps':
                details = {
                    implementation: [
                        '每周至少进行150分钟中等强度有氧运动',
                        '优先把日常运动时长提升到60分钟以上，再逐步稳定在80-100分钟',
                        '每次运动30-60分钟，每周3-5次',
                        '可选择快走、慢跑、游泳、骑车、广场舞等',
                        '运动时注意补充水分'
                    ],
                    expectedEffect: '4-6周后体能明显提升，精神状态更好',
                    precautions: [
                        '运动前做好5-10分钟热身运动',
                        '运动中如有不适，立即停止并休息',
                        '有慢性疾病者请在医生指导下运动',
                        '避免在极端天气下户外运动'
                    ]
                };
                priority = 'low';
                break;
        }

        return {
            id: `rec-${indicator.id}`,
            title: `${indicator.name}改善建议`,
            details,
            priority,
            category: indicator.id,
            icon: this.getRecommendationIcon(indicator.id)
        };
    }

    generateDetailedGeneralRecommendations(analysis) {
        const recs = [];
        const trends = Object.values(analysis.trends);

        const hasSleepIssue = trends.some(t => t.indicator.id === 'sleepHours' && !t.inNormalRange);
        const hasExerciseIssue = trends.some(t => t.indicator.id === 'steps' && !t.inNormalRange);

        recs.push({
            id: 'rec-balanced-diet',
            title: '均衡营养饮食',
            details: {
                implementation: [
                    '每天摄入蔬菜300-500克，水果200-350克',
                    '主食粗细搭配，全谷物占1/3以上',
                    '适量摄入优质蛋白质，如鱼、禽、蛋、奶、豆制品',
                    '控制油盐糖摄入，油25-30克/天，盐<5克/天',
                    '饮食规律，定时定量，避免暴饮暴食'
                ],
                expectedEffect: '长期坚持可维持健康体重，营养状况良好',
                precautions: [
                    '避免过度节食或暴饮暴食',
                    '食物过敏者注意规避过敏原',
                    '特殊疾病患者请遵循医生或营养师建议'
                ]
            },
            priority: 'low',
            category: 'nutrition',
            icon: '🥗'
        });

        recs.push({
            id: 'rec-stress-management',
            title: '压力管理与心理健康',
            details: {
                implementation: [
                    '每天安排10-15分钟放松时间',
                    '可尝试深呼吸、冥想、正念等放松技巧',
                    '培养兴趣爱好，丰富业余生活',
                    '保持社交活动，与家人朋友多交流',
                    '学会合理安排工作和休息时间'
                ],
                expectedEffect: '2-4周后压力感减轻，心态更积极',
                precautions: [
                    '如长期情绪低落或焦虑，请及时寻求专业帮助',
                    '不要过度压抑情绪，学会合理宣泄',
                    '保证充足睡眠是心理健康的基础'
                ]
            },
            priority: 'medium',
            category: 'mental',
            icon: '🧘'
        });

        recs.push({
            id: 'rec-hydration',
            title: '充足饮水',
            details: {
                implementation: [
                    '每天饮水量1500-2000毫升（约7-8杯）',
                    '少量多次饮水，不要等到口渴才喝',
                    '首选白开水，也可选择淡茶水',
                    '晨起空腹喝一杯温水',
                    '运动前后注意补充水分'
                ],
                expectedEffect: '皮肤更水润，新陈代谢更顺畅',
                precautions: [
                    '心肾功能不全者请遵医嘱控制饮水量',
                    '避免用饮料代替白开水',
                    '睡前1小时减少饮水，避免夜尿影响睡眠'
                ]
            },
            priority: 'low',
            category: 'lifestyle',
            icon: '💧'
        });

        return recs;
    }

    getRecommendationIcon(category) {
        const icons = {
            heartRate: '❤️',
            bloodPressureSystolic: '🩸',
            bloodPressureDiastolic: '🩸',
            sleepHours: '😴',
            steps: '🏃',
            lifestyle: '✨',
            prevention: '🛡️',
            nutrition: '🥗'
        };
        return icons[category] || '💡';
    }

    prepareVisualData(analyzedData) {
        const { aggregatedData } = analyzedData;
        
        return {
            chartData: Object.values(HEALTH_INDICATORS)
                .filter(indicator => ['heartRate', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'sleepHours', 'steps', 'weight'].includes(indicator.id))
                .map(indicator => ({
                    id: indicator.id,
                    name: indicator.name,
                    color: indicator.color,
                    unit: indicator.unit,
                    data: aggregatedData.map(d => ({
                        date: d.date,
                        value: d.indicators[indicator.id]
                    })).filter(d => d.value !== undefined)
                })),
            labels: aggregatedData.map(d => {
                const date = new Date(d.date);
                return `${date.getMonth() + 1}/${date.getDate()}`;
            })
        };
    }

    clearCache() {
        this.cache = null;
        this.cacheTime = null;
    }

    getCacheInfo() {
        return {
            hasCache: this.cache !== null,
            cachedAt: this.cacheTime,
            timeRange: this.cache?.timeRange
        };
    }
}

export const healthReportGenerator = new HealthReportGenerator();
