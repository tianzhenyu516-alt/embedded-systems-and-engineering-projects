// 基于健康数据与用户目标的饮食推荐功能

function cleanAIText(text = '') {
    return String(text).replace(/\r/g, '').replace(/\*\*/g, '').trim();
}

function extractAISection(text, title, nextTitles = []) {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nextPattern = nextTitles.length
        ? nextTitles.map(item => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
        : '$';
    const regex = new RegExp(`${escapedTitle}[：:]?\\s*([\\s\\S]*?)(?=${nextPattern ? `(?:${nextPattern})` : '$'}|$)`);
    return cleanAIText(text).match(regex)?.[1]?.trim() || '';
}

function parseAIList(sectionText) {
    return cleanAIText(sectionText)
        .split('\n')
        .map(line => line.replace(/^[-•\d.\s]+/, '').trim())
        .filter(Boolean);
}

function safeNumber(value, fallback = null) {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    if (normalizedValue === '') {
        return fallback;
    }

    const parsed = Number(normalizedValue);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveDietGoal(userData = {}) {
    const bmi = safeNumber(userData.bmi);
    if (bmi !== null) {
        if (bmi >= 24) {
            return 'lose';
        }
        if (bmi < 18.5) {
            return 'gain';
        }
    }
    return 'maintain';
}

function buildDietUserProfile(healthData = {}) {
    const genderMap = { 男: 1, male: 1, 1: 1, 女: 0, female: 0, 0: 0 };

    return {
        age: safeNumber(healthData.age, 30),
        gender: genderMap[healthData.gender] ?? 1,
        weight: safeNumber(healthData.weight, 65),
        height: safeNumber(healthData.height, 170),
        activityLevel: safeNumber(healthData.activityLevel, 2),
        bmi: safeNumber(healthData.bmi),
        heartRate: safeNumber(healthData.heartRate),
        sleepHours: safeNumber(healthData.sleepHours),
        bloodPressure: healthData.bloodPressure || '--',
        steps: safeNumber(healthData.steps ?? healthData.exerciseMinutes),
    };
}

function calculateBMR(age, gender, weight, height) {
    if (age <= 0 || weight <= 0 || height <= 0) {
        throw new Error('年龄、体重和身高必须大于0');
    }

    if (gender === 1) {
        return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
    }
    return 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
}

function calculateTDEE(bmr, activityLevel) {
    const activityFactors = {
        1: 1.2,
        2: 1.375,
        3: 1.55,
        4: 1.725,
        5: 1.9,
    };

    if (!activityFactors[activityLevel]) {
        throw new Error('活动水平必须在1-5之间');
    }

    return bmr * activityFactors[activityLevel];
}

function adjustCaloriesForGoal(tdee, goal) {
    switch (goal) {
        case 'lose':
            return tdee - 500;
        case 'gain':
            return tdee + 500;
        case 'maintain':
            return tdee;
        default:
            throw new Error('健康目标必须是 lose、gain 或 maintain');
    }
}

function calculateNutrientRatio(calories, goal) {
    const PROTEIN_CALORIE_PER_GRAM = 4;
    const CARBS_CALORIE_PER_GRAM = 4;
    const FAT_CALORIE_PER_GRAM = 9;

    let proteinRatio;
    let carbsRatio;
    let fatRatio;

    switch (goal) {
        case 'lose':
            proteinRatio = 0.35;
            carbsRatio = 0.4;
            fatRatio = 0.25;
            break;
        case 'gain':
            proteinRatio = 0.3;
            carbsRatio = 0.5;
            fatRatio = 0.2;
            break;
        case 'maintain':
            proteinRatio = 0.25;
            carbsRatio = 0.5;
            fatRatio = 0.25;
            break;
        default:
            throw new Error('健康目标必须是 lose、gain 或 maintain');
    }

    return {
        protein: {
            percentage: proteinRatio * 100,
            grams: Math.round((calories * proteinRatio) / PROTEIN_CALORIE_PER_GRAM),
            calories: Math.round(calories * proteinRatio),
        },
        carbs: {
            percentage: carbsRatio * 100,
            grams: Math.round((calories * carbsRatio) / CARBS_CALORIE_PER_GRAM),
            calories: Math.round(calories * carbsRatio),
        },
        fat: {
            percentage: fatRatio * 100,
            grams: Math.round((calories * fatRatio) / FAT_CALORIE_PER_GRAM),
            calories: Math.round(calories * fatRatio),
        },
    };
}

function generateFoodRecommendations(goal) {
    const baseRecommendations = {
        proteins: ['鸡胸肉', '鱼肉', '鸡蛋', '豆腐', '豆类', '希腊酸奶', '瘦牛肉'],
        carbs: ['燕麦', '糙米', '红薯', '全麦面包', '藜麦', '水果'],
        fats: ['橄榄油', '坚果', '牛油果', '亚麻籽', '鱼油'],
        vegetables: ['菠菜', '西兰花', '胡萝卜', '黄瓜', '西红柿', '甜椒'],
    };

    if (goal === 'lose') {
        return {
            ...baseRecommendations,
            additionalTips: ['选择低热量、高纤维的食物', '增加蔬菜的摄入量', '控制精制碳水的摄入量', '选择健康蛋白质来源'],
        };
    }

    if (goal === 'gain') {
        return {
            ...baseRecommendations,
            additionalTips: ['增加优质蛋白质摄入', '搭配高质量碳水', '适当增加健康脂肪', '可采用少量多餐'],
        };
    }

    return {
        ...baseRecommendations,
        additionalTips: ['保持均衡饮食结构', '多样化食物种类', '控制单餐分量', '保持适量运动'],
    };
}

function buildSpecialDietPlan(profile = {}, goal = 'maintain') {
    const recommendations = [];
    const alerts = [];
    const avoidFoods = [];
    const bmi = safeNumber(profile.bmi);
    const sleepHours = safeNumber(profile.sleepHours);
    const heartRate = safeNumber(profile.heartRate);
    const bloodPressure = String(profile.bloodPressure || '').trim();

    if (goal === 'lose') {
        alerts.push({ title: '控能减脂' });
        recommendations.push('优先采用蒸煮炖等低油烹饪方式，避免夜宵和高糖饮料');
        avoidFoods.push('含糖饮料', '油炸食品');
    } else if (goal === 'gain') {
        alerts.push({ title: '增肌增重' });
        recommendations.push('在三餐基础上可增加加餐，优先补充优质蛋白和复合碳水');
    } else {
        alerts.push({ title: '均衡维持' });
        recommendations.push('三餐规律，主食、蛋白质、蔬菜尽量均衡搭配');
    }

    if (bmi !== null) {
        if (bmi >= 24) {
            alerts.push({ title: '体重偏高' });
            recommendations.push('当前体重偏高，建议控制总热量并减少油炸、高糖食物');
            avoidFoods.push('甜点', '高油零食');
        } else if (bmi < 18.5) {
            alerts.push({ title: '体重偏低' });
            recommendations.push('当前体重偏低，建议适度提高能量摄入并保证蛋白质充足');
        }
    }

    if (sleepHours !== null && sleepHours < 7) {
        alerts.push({ title: '睡眠不足' });
        recommendations.push('睡眠时间偏少，晚餐宜清淡，避免浓茶、咖啡和高糖宵夜');
        avoidFoods.push('浓茶', '咖啡', '高糖宵夜');
    }

    if (heartRate !== null && heartRate > 100) {
        alerts.push({ title: '心率偏快' });
        recommendations.push('心率偏快时应减少浓咖啡、酒精及高刺激性食物摄入');
        avoidFoods.push('酒精', '刺激性食物');
    }

    if (/高|1[4-9]\d\/|\d{3}\//.test(bloodPressure)) {
        alerts.push({ title: '血压偏高' });
        recommendations.push('如血压偏高，建议减少盐分、腌制食品和高钠加工食品');
        avoidFoods.push('腌制食品', '高钠加工食品');
    }

    return {
        title: '专项饮食建议',
        alerts,
        recommendations: recommendations.slice(0, 4),
        avoidFoods: [...new Set(avoidFoods)].slice(0, 6),
    };
}

function buildMealPlanFromFallback(fallbackData = {}) {
    const foods = fallbackData.foodRecommendations || {};
    const proteins = foods.proteins || ['鸡蛋', '鸡胸肉'];
    const carbs = foods.carbs || ['燕麦', '糙米'];
    const fats = foods.fats || ['坚果'];
    const vegetables = foods.vegetables || ['西兰花', '菠菜'];

    return {
        breakfast: {
            name: '高蛋白活力早餐',
            items: [carbs[0], proteins[0], vegetables[0]].filter(Boolean),
            description: '早餐注重优质碳水与蛋白质搭配，帮助稳定上午精力。',
        },
        lunch: {
            name: '均衡营养午餐',
            items: [carbs[1] || carbs[0], proteins[1] || proteins[0], vegetables[1] || vegetables[0]].filter(Boolean),
            description: '午餐兼顾主食、蛋白质与蔬菜，保证全天核心能量供给。',
        },
        dinner: {
            name: '清爽轻负担晚餐',
            items: [proteins[0], vegetables[0], fats[0]].filter(Boolean),
            description: '晚餐适当控制分量，减少油腻摄入，提升夜间恢复质量。',
        },
    };
}

function parseMealBlock(sectionText, mealTitle, fallbackMeal = {}) {
    const escapedMealTitle = mealTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escapedMealTitle}[：:]?\\s*([\\s\\S]*?)(?=早餐|午餐|晚餐|$)`);
    const mealText = sectionText.match(regex)?.[1]?.trim() || '';

    if (!mealText) {
        return fallbackMeal;
    }

    const name = mealText.match(/名称[：:]?\s*(.+)/)?.[1]?.trim() || fallbackMeal.name || '';
    const description = mealText.match(/说明[：:]?\s*(.+)/)?.[1]?.trim() || fallbackMeal.description || '';
    const foodsSection = extractAISection(mealText, '食物', ['说明']);
    const items = parseAIList(foodsSection);

    return {
        name,
        items: items.length ? items : (fallbackMeal.items || []),
        description,
    };
}

function parseMealPlanSection(sectionText, fallbackMealPlan = {}) {
    return {
        breakfast: parseMealBlock(sectionText, '早餐', fallbackMealPlan.breakfast || {}),
        lunch: parseMealBlock(sectionText, '午餐', fallbackMealPlan.lunch || {}),
        dinner: parseMealBlock(sectionText, '晚餐', fallbackMealPlan.dinner || {}),
    };
}

function generateDietRecommendation(userData, goal) {
    try {
        const { age, gender, weight, height, activityLevel } = userData;
        const bmr = calculateBMR(age, gender, weight, height);
        const tdee = calculateTDEE(bmr, activityLevel);
        const recommendedCalories = adjustCaloriesForGoal(tdee, goal);
        const nutrientRatio = calculateNutrientRatio(recommendedCalories, goal);
        const foodRecommendations = generateFoodRecommendations(goal);

        return {
            success: true,
            data: {
                bmr: Math.round(bmr),
                tdee: Math.round(tdee),
                recommendedCalories: Math.round(recommendedCalories),
                nutrientRatio,
                foodRecommendations,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

function parseAIPersonalizedDiet(text, fallbackData, goal, profile = {}) {
    const cleanText = cleanAIText(text);
    const nutritionSection = extractAISection(cleanText, '[营养概览]', ['[推荐食物]', '[饮食建议]', '[专项建议]', '[一日三餐]', '[个性化说明]']);
    const foodsSection = extractAISection(cleanText, '[推荐食物]', ['[饮食建议]', '[专项建议]', '[一日三餐]', '[个性化说明]']);
    const tipsSection = extractAISection(cleanText, '[饮食建议]', ['[专项建议]', '[一日三餐]', '[个性化说明]']);
    const specialSection = extractAISection(cleanText, '[专项建议]', ['[一日三餐]', '[个性化说明]']);
    const mealPlanSection = extractAISection(cleanText, '[一日三餐]', ['[个性化说明]']);
    const summarySection = extractAISection(cleanText, '[个性化说明]');

    const calories = parseInt(nutritionSection.match(/热量[：:]?\s*(\d+)/)?.[1], 10) || fallbackData.recommendedCalories;
    const protein = parseInt(nutritionSection.match(/蛋白质[：:]?\s*(\d+)/)?.[1], 10) || fallbackData.nutrientRatio.protein.grams;
    const carbs = parseInt(nutritionSection.match(/碳水(?:化合物)?[：:]?\s*(\d+)/)?.[1], 10) || fallbackData.nutrientRatio.carbs.grams;
    const fat = parseInt(nutritionSection.match(/脂肪[：:]?\s*(\d+)/)?.[1], 10) || fallbackData.nutrientRatio.fat.grams;

    const proteins = parseAIList(extractAISection(foodsSection, '蛋白质', ['碳水化合物', '脂肪', '蔬菜']));
    const carbsList = parseAIList(extractAISection(foodsSection, '碳水化合物', ['脂肪', '蔬菜']));
    const fats = parseAIList(extractAISection(foodsSection, '脂肪', ['蔬菜']));
    const vegetables = parseAIList(extractAISection(foodsSection, '蔬菜'));
    const additionalTips = parseAIList(tipsSection).slice(0, 4);
    const fallbackSpecialPlan = buildSpecialDietPlan(profile, goal);
    const fallbackMealPlan = buildMealPlanFromFallback(fallbackData);

    return {
        success: true,
        data: {
            goal,
            bmr: fallbackData.bmr,
            tdee: fallbackData.tdee,
            recommendedCalories: calories,
            nutrientRatio: {
                protein: {
                    ...fallbackData.nutrientRatio.protein,
                    grams: protein,
                    calories: protein * 4,
                    percentage: Math.round((protein * 4 / calories) * 100),
                },
                carbs: {
                    ...fallbackData.nutrientRatio.carbs,
                    grams: carbs,
                    calories: carbs * 4,
                    percentage: Math.round((carbs * 4 / calories) * 100),
                },
                fat: {
                    ...fallbackData.nutrientRatio.fat,
                    grams: fat,
                    calories: fat * 9,
                    percentage: Math.round((fat * 9 / calories) * 100),
                },
            },
            foodRecommendations: {
                proteins: proteins.length ? proteins : fallbackData.foodRecommendations.proteins,
                carbs: carbsList.length ? carbsList : fallbackData.foodRecommendations.carbs,
                fats: fats.length ? fats : fallbackData.foodRecommendations.fats,
                vegetables: vegetables.length ? vegetables : fallbackData.foodRecommendations.vegetables,
                additionalTips: additionalTips.length ? additionalTips : fallbackData.foodRecommendations.additionalTips,
            },
            specialPlan: {
                ...fallbackSpecialPlan,
                recommendations: parseAIList(specialSection).length ? parseAIList(specialSection) : fallbackSpecialPlan.recommendations,
            },
            mealPlan: mealPlanSection ? parseMealPlanSection(mealPlanSection, fallbackMealPlan) : fallbackMealPlan,
            summary: summarySection || '已结合您当前健康数据生成个性化饮食建议。',
            source: 'ai',
            rawReply: cleanText,
        },
    };
}

async function generatePersonalizedDietRecommendation(healthData = {}, goal = null) {
    const profile = buildDietUserProfile(healthData);
    const resolvedGoal = goal || resolveDietGoal(healthData);
    const fallbackResult = generateDietRecommendation(profile, resolvedGoal);
    const fallbackSpecialPlan = buildSpecialDietPlan(profile, resolvedGoal);
    const fallbackMealPlan = buildMealPlanFromFallback(fallbackResult.success ? fallbackResult.data : { foodRecommendations: generateFoodRecommendations(resolvedGoal) });

    if (!fallbackResult.success) {
        return fallbackResult;
    }

    if (!window.aiService || typeof window.aiService.chat !== 'function') {
        return {
            success: true,
            data: {
                ...fallbackResult.data,
                goal: resolvedGoal,
                specialPlan: fallbackSpecialPlan,
                mealPlan: fallbackMealPlan,
                summary: '当前未连接AI服务，已根据健康数据为您生成基础饮食推荐。',
                source: 'rule',
            },
        };
    }

    try {
        const prompt = `你是临床营养师，请根据用户当前健康数据生成个性化饮食推荐。严格按以下格式输出，不要添加额外说明：\n[营养概览]\n热量：数字kcal\n蛋白质：数字g\n碳水化合物：数字g\n脂肪：数字g\n[推荐食物]\n蛋白质：\n- 食物1\n- 食物2\n- 食物3\n碳水化合物：\n- 食物1\n- 食物2\n- 食物3\n脂肪：\n- 食物1\n- 食物2\n蔬菜：\n- 食物1\n- 食物2\n- 食物3\n[饮食建议]\n- 建议1\n- 建议2\n- 建议3\n- 建议4\n[专项建议]\n- 结合血压/睡眠/体重状态给出禁忌和重点\n- 若无明显异常则输出均衡饮食提醒\n[一日三餐]\n早餐：\n名称：一句话\n食物：\n- 食物1\n- 食物2\n说明：一句话\n午餐：\n名称：一句话\n食物：\n- 食物1\n- 食物2\n说明：一句话\n晚餐：\n名称：一句话\n食物：\n- 食物1\n- 食物2\n说明：一句话\n[个性化说明]\n一句话说明推荐依据\n\n健康目标：${resolvedGoal}\n用户健康数据：${JSON.stringify(healthData, null, 2)}\n专项提醒参考：${JSON.stringify(fallbackSpecialPlan, null, 2)}\n基础计算结果：${JSON.stringify(fallbackResult.data, null, 2)}`;
        const resultText = await window.aiService.chat(prompt);
        return parseAIPersonalizedDiet(resultText, fallbackResult.data, resolvedGoal, profile);
    } catch (_error) {
        return {
            success: true,
            data: {
                ...fallbackResult.data,
                goal: resolvedGoal,
                specialPlan: fallbackSpecialPlan,
                mealPlan: fallbackMealPlan,
                summary: 'AI暂时不可用，已根据您当前健康数据提供基础饮食建议。',
                source: 'rule',
            },
        };
    }
}

export {
    calculateBMR,
    calculateTDEE,
    adjustCaloriesForGoal,
    calculateNutrientRatio,
    generateFoodRecommendations,
    generateDietRecommendation,
    generatePersonalizedDietRecommendation,
    resolveDietGoal,
    buildDietUserProfile,
    buildSpecialDietPlan,
    buildMealPlanFromFallback,
};
