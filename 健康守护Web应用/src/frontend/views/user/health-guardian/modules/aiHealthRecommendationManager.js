// AI健康建议管理模块 - 包含数据变更检测、缓存管理和建议生成
import { healthDataManager, DATA_SOURCES, TIME_RANGES } from './healthDataManager.js';

const CACHE_KEY = 'aiHealthRecommendationsCache';
const DATA_HASH_KEY = 'healthDataHash';
const RECOMMENDATION_UPDATE_EVENT = 'aiRecommendationsUpdated';

class AIHealthRecommendationManager {
    constructor() {
        this.cache = this.loadCache();
        this.listeners = [];
        this.isGenerating = false;
        
        // 订阅健康数据变更
        this.setupDataChangeListener();
    }

    // 加载缓存
    loadCache() {
        try {
            const saved = localStorage.getItem(CACHE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('加载AI健康建议缓存失败:', error);
        }
        return {
            recommendations: null,
            generatedAt: null,
            dataHash: null,
        };
    }

    // 保存缓存
    saveCache() {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
        } catch (error) {
            console.error('保存AI健康建议缓存失败:', error);
        }
    }

    // 计算健康数据的哈希值，用于检测数据变更
    computeDataHash() {
        const allData = healthDataManager.getData(DATA_SOURCES.ALL, TIME_RANGES.MONTH);
        
        // 只计算关键数据的哈希，避免过度计算
        const simplifiedData = allData.map(record => ({
            id: record.id,
            timestamp: record.timestamp,
            indicators: record.indicators,
        }));
        
        return this.simpleHash(JSON.stringify(simplifiedData));
    }

    // 简单的字符串哈希算法
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    // 检查健康数据是否有变更
    hasDataChanged() {
        const currentHash = this.computeDataHash();
        const cachedHash = this.cache.dataHash;
        
        console.log('数据哈希检查 - 当前:', currentHash, '缓存:', cachedHash);
        return currentHash !== cachedHash;
    }

    // 设置健康数据变更监听
    setupDataChangeListener() {
        healthDataManager.subscribe(() => {
            console.log('检测到健康数据变更，标记需要重新生成建议');
            this.triggerRecommendationUpdate();
        });
    }

    // 触发建议更新流程
    async triggerRecommendationUpdate() {
        if (this.isGenerating) {
            console.log('AI建议正在生成中，跳过本次触发');
            return;
        }

        const hasChanged = this.hasDataChanged();
        if (!hasChanged && this.cache.recommendations) {
            console.log('健康数据未变更，使用缓存的建议');
            this.notifyListeners();
            return;
        }

        await this.generateRecommendations();
    }

    // 获取AI健康建议
    async getRecommendations(forceRefresh = false) {
        // 检查是否需要重新生成
        if (!forceRefresh && this.cache.recommendations && !this.hasDataChanged()) {
            console.log('返回缓存的AI健康建议');
            return this.cache.recommendations;
        }

        return await this.generateRecommendations();
    }

    // 生成AI健康建议
    async generateRecommendations() {
        if (this.isGenerating) {
            console.log('AI建议正在生成中，等待完成...');
            return this.cache.recommendations;
        }

        this.isGenerating = true;
        console.log('开始生成AI健康建议...');

        try {
            const healthData = healthDataManager.getData(DATA_SOURCES.ALL, TIME_RANGES.MONTH);
            const aggregatedData = healthDataManager.getAggregatedData(DATA_SOURCES.ALL, TIME_RANGES.MONTH);
            const recommendations = await this.generatePersonalizedRecommendations(healthData, aggregatedData);

            this.cache = {
                recommendations,
                generatedAt: new Date().toISOString(),
                dataHash: this.computeDataHash(),
            };
            this.saveCache();

            console.log('AI健康建议生成完成');
            this.notifyListeners();
            return recommendations;
        } catch (error) {
            console.error('生成AI健康建议失败:', error);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    // 生成个性化健康建议
    async generatePersonalizedRecommendations(healthData, aggregatedData) {
        const latestData = this.getLatestData(healthData);
        const averages = this.calculateAverages(aggregatedData);

        if (window.aiService && typeof window.aiService.chat === 'function') {
            const aiRecommendations = await this.generateRecommendationsWithAI(healthData, latestData, averages);
            if (aiRecommendations.length) {
                return aiRecommendations;
            }
        }

        return this.generateLocalRecommendations(latestData, averages).sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    async generateRecommendationsWithAI(healthData, latestData, averages) {
        const prompt = `你是专业健康管理助手，请基于用户近30天健康数据生成个性化建议。请严格按以下格式输出，不要添加额外说明：\n[建议1]\n标题：一句话\n优先级：高/中/低\n分类：例如心脏健康/睡眠管理/运动健身/饮食健康/生活方式/血压管理/血糖管理\n图标：使用1个emoji\n内容：2-3句具体建议\n[建议2]\n标题：一句话\n优先级：高/中/低\n分类：...\n图标：...\n内容：...\n[建议3]\n标题：一句话\n优先级：高/中/低\n分类：...\n图标：...\n内容：...\n[建议4]\n标题：一句话\n优先级：高/中/低\n分类：...\n图标：...\n内容：...\n\n用户最新指标：${JSON.stringify(latestData || {}, null, 2)}\n用户平均指标：${JSON.stringify(averages || {}, null, 2)}\n近30天记录数：${healthData.length}`;

        const resultText = await window.aiService.chat(prompt);
        return this.parseAIRecommendations(resultText);
    }

    parseAIRecommendations(text) {
        const normalizedText = (text || '').replace(/\r/g, '').replace(/\*\*/g, '').trim();
        const sections = normalizedText
            .split(/\[建议\d+\]/)
            .map(section => section.trim())
            .filter(Boolean);

        return sections.slice(0, 6).map((section, index) => {
            const title = this.extractField(section, '标题') || `健康建议 ${index + 1}`;
            const priorityLabel = this.extractField(section, '优先级') || '中';
            const category = this.extractField(section, '分类') || '健康管理';
            const icon = this.extractField(section, '图标') || '💡';
            const content = this.extractField(section, '内容') || section;
            const priorityMap = {
                高: { value: 'high', text: '高' },
                中: { value: 'medium', text: '中' },
                低: { value: 'low', text: '低' },
            };
            const priority = priorityMap[priorityLabel] || priorityMap.中;

            return {
                id: `ai_${Date.now()}_${index}`,
                title,
                content,
                priority: priority.value,
                priorityText: priority.text,
                category,
                icon,
            };
        });
    }

    extractField(section, fieldName) {
        const regex = new RegExp(`${fieldName}[：:]\\s*(.+)`);
        const match = section.match(regex);
        return match?.[1]?.trim() || '';
    }

    generateLocalRecommendations(latestData, averages) {
        const recommendations = [];

        if (averages.heartRate) {
            recommendations.push(...this.generateHeartRateRecommendation(averages.heartRate, latestData?.heartRate));
        }

        if (averages.bloodPressureSystolic && averages.bloodPressureDiastolic) {
            recommendations.push(...this.generateBloodPressureRecommendation(
                averages.bloodPressureSystolic,
                averages.bloodPressureDiastolic,
                latestData?.bloodPressureSystolic,
                latestData?.bloodPressureDiastolic,
            ));
        }

        if (averages.sleepHours) {
            recommendations.push(...this.generateSleepRecommendation(averages.sleepHours, latestData?.sleepHours));
        }

        if (averages.steps) {
            recommendations.push(...this.generateStepsRecommendation(averages.steps, latestData?.steps));
        }

        if (averages.weight) {
            recommendations.push(...this.generateWeightRecommendation(averages.weight, latestData?.weight));
        }

        if (averages.bloodGlucose) {
            recommendations.push(...this.generateBloodGlucoseRecommendation(averages.bloodGlucose, latestData?.bloodGlucose));
        }

        recommendations.push(...this.generateGeneralRecommendations());
        return recommendations;
    }

    // 获取最新健康数据
    getLatestData(healthData) {
        if (healthData.length === 0) {return null;}
        const latest = healthData[healthData.length - 1];
        return latest.indicators;
    }

    // 计算平均值
    calculateAverages(aggregatedData) {
        if (aggregatedData.length === 0) {return {};}
        
        const sums = {};
        const counts = {};

        aggregatedData.forEach(dayData => {
            Object.entries(dayData.indicators).forEach(([key, value]) => {
                if (!sums[key]) {
                    sums[key] = 0;
                    counts[key] = 0;
                }
                sums[key] += value;
                counts[key]++;
            });
        });

        const averages = {};
        Object.keys(sums).forEach(key => {
            averages[key] = Math.round((sums[key] / counts[key]) * 100) / 100;
        });

        return averages;
    }

    // 心率建议
    generateHeartRateRecommendation(avgHeartRate, latestHeartRate) {
        const recommendations = [];
        
        if (avgHeartRate > 100) {
            recommendations.push({
                id: 'hr_high',
                title: '关注心率偏高',
                content: `您的平均心率为 ${avgHeartRate} bpm，略高于正常范围。建议保持充足休息，避免过度劳累和情绪激动。`,
                priority: 'high',
                priorityText: '高',
                category: '心脏健康',
                icon: '❤️',
            });
        } else if (avgHeartRate < 60) {
            recommendations.push({
                id: 'hr_low',
                title: '心率略低',
                content: `您的平均心率为 ${avgHeartRate} bpm。如果您是运动员，这是正常的。如有不适，请咨询医生。`,
                priority: 'medium',
                priorityText: '中',
                category: '心脏健康',
                icon: '❤️',
            });
        } else {
            recommendations.push({
                id: 'hr_good',
                title: '心率状态良好',
                content: `您的平均心率为 ${avgHeartRate} bpm，处于正常范围内。继续保持规律的运动和良好的作息习惯。`,
                priority: 'low',
                priorityText: '低',
                category: '心脏健康',
                icon: '❤️',
            });
        }

        return recommendations;
    }

    // 血压建议
    generateBloodPressureRecommendation(avgSystolic, avgDiastolic, latestSystolic, latestDiastolic) {
        const recommendations = [];
        
        if (avgSystolic >= 140 || avgDiastolic >= 90) {
            recommendations.push({
                id: 'bp_high',
                title: '血压偏高，需关注',
                content: `您的平均血压为 ${avgSystolic}/${avgDiastolic} mmHg，高于正常范围。建议减少盐分摄入，保持规律运动，并定期监测血压。`,
                priority: 'high',
                priorityText: '高',
                category: '血压管理',
                icon: '🩸',
            });
        } else if (avgSystolic < 90 || avgDiastolic < 60) {
            recommendations.push({
                id: 'bp_low',
                title: '血压偏低',
                content: `您的平均血压为 ${avgSystolic}/${avgDiastolic} mmHg，略低于正常范围。建议适当增加盐分摄入，避免快速站立。`,
                priority: 'medium',
                priorityText: '中',
                category: '血压管理',
                icon: '🩸',
            });
        } else {
            recommendations.push({
                id: 'bp_good',
                title: '血压状态良好',
                content: `您的平均血压为 ${avgSystolic}/${avgDiastolic} mmHg，处于正常范围内。继续保持健康的生活方式。`,
                priority: 'low',
                priorityText: '低',
                category: '血压管理',
                icon: '🩸',
            });
        }

        return recommendations;
    }

    // 睡眠建议
    generateSleepRecommendation(avgSleepHours, latestSleepHours) {
        const recommendations = [];
        
        if (avgSleepHours < 7) {
            recommendations.push({
                id: 'sleep_poor',
                title: '睡眠时长不足',
                content: `您的平均睡眠时长为 ${avgSleepHours} 小时。建议建立规律作息，尽量保证每晚7-9小时睡眠。`,
                priority: 'high',
                priorityText: '高',
                category: '睡眠管理',
                icon: '😴',
            });
        } else if (avgSleepHours > 9) {
            recommendations.push({
                id: 'sleep_high',
                title: '睡眠时长偏长',
                content: `您的平均睡眠时长为 ${avgSleepHours} 小时。若长期嗜睡或乏力，建议结合生活习惯进一步观察。`,
                priority: 'medium',
                priorityText: '中',
                category: '睡眠管理',
                icon: '😴',
            });
        } else {
            recommendations.push({
                id: 'sleep_good',
                title: '睡眠时长良好',
                content: `您的平均睡眠时长为 ${avgSleepHours} 小时，处于推荐范围内，请继续保持。`,
                priority: 'low',
                priorityText: '低',
                category: '睡眠管理',
                icon: '😴',
            });
        }

        return recommendations;
    }

    // 运动时长建议
    generateStepsRecommendation(avgSteps, latestSteps) {
        const recommendations = [];
        const avgMinutes = Math.round(avgSteps);
        
        if (avgSteps < 45) {
            recommendations.push({
                id: 'steps_low',
                title: '增加日常活动时长',
                content: `您的平均每日运动时长约为 ${avgMinutes} 分钟，建议逐渐增加到每天60分钟以上。可以选择步行、快走或骑行等轻中强度活动。`,
                priority: 'high',
                priorityText: '高',
                category: '运动健身',
                icon: '🏃',
            });
        } else if (avgSteps < 90) {
            recommendations.push({
                id: 'steps_fair',
                title: '运动时长达标，可继续提升',
                content: `您的平均每日运动时长约为 ${avgMinutes} 分钟，继续保持并尝试逐步提升到每天90分钟左右，有助于增强体能和改善代谢状态。`,
                priority: 'medium',
                priorityText: '中',
                category: '运动健身',
                icon: '🏃',
            });
        } else {
            recommendations.push({
                id: 'steps_good',
                title: '运动时长充足',
                content: `您的平均每日运动时长约为 ${avgMinutes} 分钟，非常棒！保持这样的活动习惯对心血管健康和体能维持都很有帮助。`,
                priority: 'low',
                priorityText: '低',
                category: '运动健身',
                icon: '🏃',
            });
        }

        return recommendations;
    }

    // 体重建议
    generateWeightRecommendation(avgWeight, latestWeight) {
        const recommendations = [];
        
        // 这里简化处理，实际应该结合身高计算BMI
        if (avgWeight > 80) {
            recommendations.push({
                id: 'weight_high',
                title: '关注体重管理',
                content: `您的平均体重为 ${avgWeight} kg。建议结合身高计算BMI，保持均衡饮食，增加有氧运动。`,
                priority: 'medium',
                priorityText: '中',
                category: '体重管理',
                icon: '⚖️',
            });
        } else if (avgWeight < 50) {
            recommendations.push({
                id: 'weight_low',
                title: '适当增加营养摄入',
                content: `您的平均体重为 ${avgWeight} kg。建议适当增加营养摄入，保持规律饮食，必要时咨询营养师。`,
                priority: 'medium',
                priorityText: '中',
                category: '体重管理',
                icon: '⚖️',
            });
        } else {
            recommendations.push({
                id: 'weight_good',
                title: '体重状态良好',
                content: `您的平均体重为 ${avgWeight} kg，继续保持健康的饮食和运动习惯。`,
                priority: 'low',
                priorityText: '低',
                category: '体重管理',
                icon: '⚖️',
            });
        }

        return recommendations;
    }

    // 血糖建议
    generateBloodGlucoseRecommendation(avgBloodGlucose, latestBloodGlucose) {
        const recommendations = [];
        
        if (avgBloodGlucose > 7.8) {
            recommendations.push({
                id: 'bg_high',
                title: '血糖偏高，需注意饮食',
                content: `您的平均血糖为 ${avgBloodGlucose} mmol/L，略高于正常范围。建议控制碳水化合物摄入，增加膳食纤维，定期监测血糖。`,
                priority: 'high',
                priorityText: '高',
                category: '血糖管理',
                icon: '🍬',
            });
        } else if (avgBloodGlucose < 3.9) {
            recommendations.push({
                id: 'bg_low',
                title: '血糖偏低',
                content: `您的平均血糖为 ${avgBloodGlucose} mmol/L，略低于正常范围。建议规律进食，随身携带糖果以备不时之需。`,
                priority: 'medium',
                priorityText: '中',
                category: '血糖管理',
                icon: '🍬',
            });
        } else {
            recommendations.push({
                id: 'bg_good',
                title: '血糖状态良好',
                content: `您的平均血糖为 ${avgBloodGlucose} mmol/L，处于正常范围内。继续保持健康的饮食习惯。`,
                priority: 'low',
                priorityText: '低',
                category: '血糖管理',
                icon: '🍬',
            });
        }

        return recommendations;
    }

    // 通用健康建议
    generateGeneralRecommendations() {
        return [
            {
                id: 'water_intake',
                title: '保持充足饮水',
                content: '建议每天饮用1500-2000ml水，保持身体水分平衡，促进新陈代谢。',
                priority: 'low',
                priorityText: '低',
                category: '生活方式',
                icon: '💧',
            },
            {
                id: 'diet_balance',
                title: '保持饮食均衡',
                content: '建议每餐搭配蔬菜、蛋白质和碳水化合物，多吃水果，减少加工食品摄入。',
                priority: 'low',
                priorityText: '低',
                category: '饮食健康',
                icon: '🥗',
            },
        ];
    }

    // 订阅建议更新
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // 通知监听器
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.cache.recommendations));
        
        // 触发自定义事件
        const event = new CustomEvent(RECOMMENDATION_UPDATE_EVENT, {
            detail: { recommendations: this.cache.recommendations },
        });
        window.dispatchEvent(event);
    }

    // 清除缓存
    clearCache() {
        this.cache = {
            recommendations: null,
            generatedAt: null,
            dataHash: null,
        };
        localStorage.removeItem(CACHE_KEY);
        console.log('AI健康建议缓存已清除');
    }

    // 获取缓存信息
    getCacheInfo() {
        return {
            hasCache: !!this.cache.recommendations,
            generatedAt: this.cache.generatedAt,
            dataHash: this.cache.dataHash,
        };
    }
}

export const aiHealthRecommendationManager = new AIHealthRecommendationManager();
export { RECOMMENDATION_UPDATE_EVENT };
