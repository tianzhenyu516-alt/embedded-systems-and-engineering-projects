// 健康饮食指导功能

/**
 * 获取科学的饮食原则
 * @returns {object} 饮食原则
 */
function getDietaryPrinciples() {
    return {
        principles: [
            {
                title: '均衡饮食',
                description:
                    '摄入各种营养素，包括蛋白质、碳水化合物、脂肪、维生素和矿物质，以满足身体的各种需求。',
                tips: [
                    '每天摄入多种食物，包括谷物、蔬菜、水果、蛋白质食物和奶制品',
                    '控制总热量摄入，保持能量平衡',
                    '选择多样化的食物，以确保获得全面的营养',
                ],
            },
            {
                title: '适量摄入',
                description: '控制食物的摄入量，避免过度进食或饥饿。',
                tips: [
                    '使用较小的餐具，控制食物分量',
                    '细嚼慢咽，感受饱腹感',
                    '避免边吃边看电视或使用电子设备',
                ],
            },
            {
                title: '选择健康食物',
                description: '优先选择营养密度高、加工少的食物。',
                tips: [
                    '选择全谷物而非精制谷物',
                    '选择瘦肉、鱼类和植物蛋白',
                    '选择健康脂肪，如橄榄油、坚果和牛油果',
                    '多吃新鲜水果和蔬菜',
                ],
            },
            {
                title: '控制盐和糖的摄入',
                description: '减少盐和糖的摄入量，降低慢性疾病的风险。',
                tips: [
                    '烹饪时减少盐的使用，使用香料和 herbs 增加风味',
                    '避免高糖饮料和加工食品',
                    '阅读食品标签，了解盐和糖的含量',
                ],
            },
            {
                title: '保持水分',
                description: '充足的水分摄入对健康至关重要。',
                tips: ['每天至少喝8杯水', '避免过多饮用含糖饮料', '在运动前后适当补充水分'],
            },
        ],
    };
}

/**
 * 获取不同饮食模式的介绍
 * @returns {object} 饮食模式介绍
 */
function getDietaryPatterns() {
    return {
        patterns: [
            {
                name: '地中海饮食',
                description:
                    '以地中海地区传统饮食为基础，强调橄榄油、坚果、水果、蔬菜、全谷物和鱼类的摄入。',
                benefits: ['降低心血管疾病风险', '改善认知功能', '减少炎症', '有助于维持健康体重'],
                keyComponents: [
                    '大量的蔬菜和水果',
                    '全谷物',
                    '健康脂肪（橄榄油、坚果）',
                    '适量的鱼类和家禽',
                    '少量的红肉',
                    '适量的乳制品',
                ],
            },
            {
                name: '均衡饮食',
                description: '按照中国居民膳食指南推荐的饮食模式，均衡摄入各类营养素。',
                benefits: ['提供全面的营养', '维持健康体重', '增强免疫力', '降低慢性疾病风险'],
                keyComponents: [
                    '谷物为主，粗细搭配',
                    '多吃蔬菜水果',
                    '适量摄入鱼、禽、蛋、瘦肉',
                    '每天喝牛奶或酸奶',
                    '减少油、盐、糖的摄入',
                ],
            },
            {
                name: 'DASH饮食',
                description: '旨在降低血压的饮食模式，强调富含钾、钙、镁的食物。',
                benefits: ['降低血压', '改善心脏健康', '减少中风风险', '有助于控制体重'],
                keyComponents: [
                    '大量的蔬菜水果',
                    '全谷物',
                    '低脂乳制品',
                    '瘦肉、鱼类和家禽',
                    '限制钠的摄入',
                ],
            },
            {
                name: '弹性素食',
                description: '以植物性食物为主，偶尔摄入少量动物性食物。',
                benefits: [
                    '降低心血管疾病风险',
                    '减少环境影响',
                    '有助于维持健康体重',
                    '增加膳食纤维摄入',
                ],
                keyComponents: [
                    '大量的蔬菜水果',
                    '全谷物',
                    '豆类和豆制品',
                    '坚果和种子',
                    '偶尔摄入鱼类、家禽或蛋类',
                ],
            },
        ],
    };
}

/**
 * 获取饮食时间安排建议
 * @returns {object} 饮食时间安排
 */
function getMealTimingAdvice() {
    return {
        timing: [
            {
                meal: '早餐',
                time: '7:00-9:00',
                importance: '早餐是一天中最重要的一餐，提供上午所需的能量和营养。',
                recommendations: [
                    '包含蛋白质（如鸡蛋、牛奶、豆腐）',
                    '包含复合碳水化合物（如燕麦、全麦面包）',
                    '适量的水果或蔬菜',
                    '避免高糖、高脂肪的食物',
                ],
            },
            {
                meal: '午餐',
                time: '11:30-13:30',
                importance: '午餐应提供一天中30-40%的热量，为下午的活动提供能量。',
                recommendations: [
                    '均衡的营养搭配',
                    '适量的主食（如米饭、面条）',
                    '充足的蛋白质（如肉类、鱼类、豆类）',
                    '大量的蔬菜',
                ],
            },
            {
                meal: '晚餐',
                time: '17:30-19:30',
                importance: '晚餐应适量，避免过饱，以免影响睡眠。',
                recommendations: [
                    '清淡易消化',
                    '减少主食量',
                    '增加蔬菜比例',
                    '避免油腻和刺激性食物',
                ],
            },
            {
                meal: '加餐',
                time: '上午10:00左右，下午15:00左右',
                importance: '适当的加餐可以维持血糖稳定，避免过度饥饿。',
                recommendations: [
                    '选择健康的零食（如水果、坚果、酸奶）',
                    '控制分量，避免过度进食',
                    '避免高糖、高脂肪的零食',
                ],
            },
        ],
    };
}

/**
 * 获取食物搭配建议
 * @returns {object} 食物搭配建议
 */
function getFoodCombinationAdvice() {
    return {
        combinations: [
            {
                type: '蛋白质与碳水化合物搭配',
                description: '这种搭配可以提供持久的能量，减少血糖波动。',
                examples: ['鸡胸肉配糙米', '豆腐配全麦面包', '鸡蛋配燕麦'],
            },
            {
                type: '维生素C与铁搭配',
                description: '维生素C可以促进铁的吸收，提高铁的利用率。',
                examples: ['菠菜配橙子', '瘦肉配彩椒', '豆类配番茄'],
            },
            {
                type: '钙与维生素D搭配',
                description: '维生素D可以促进钙的吸收，有助于骨骼健康。',
                examples: ['牛奶配阳光照射（身体合成维生素D）', '酸奶配三文鱼', '奶酪配鸡蛋'],
            },
            {
                type: '膳食纤维与水分搭配',
                description: '膳食纤维需要充足的水分才能发挥作用，促进肠道健康。',
                examples: ['水果配水', '蔬菜配汤', '全谷物配水'],
            },
        ],
        avoidCombinations: [
            '过多的高蛋白食物同时摄入',
            '高脂肪与高糖食物同时摄入',
            '大量的精制碳水化合物单独摄入',
        ],
    };
}

/**
 * 获取健康饮食指导的完整信息
 * @returns {object} 健康饮食指导信息
 */
function getDietaryGuidance() {
    try {
        const principles = getDietaryPrinciples();
        const patterns = getDietaryPatterns();
        const timing = getMealTimingAdvice();
        const combinations = getFoodCombinationAdvice();

        return {
            success: true,
            data: {
                principles: principles.principles,
                patterns: patterns.patterns,
                mealTiming: timing.timing,
                foodCombinations: combinations,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

export {
    getDietaryPrinciples,
    getDietaryPatterns,
    getMealTimingAdvice,
    getFoodCombinationAdvice,
    getDietaryGuidance,
};
