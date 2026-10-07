// 基于现有食材的AI食谱推荐功能

async function generateRecipeRecommendationsWithAI(ingredients) {
    if (!window.aiService || typeof window.aiService.chat !== 'function') {
        return null;
    }

    const prompt = `你是家庭健康烹饪助手，请根据现有食材生成 3 个实用食谱。严格按以下格式输出，不要添加额外说明：\n[食谱1]\n名称：一句话\n烹饪时间：数字分钟\n难度：简单/中等/困难\n匹配度：0-100的整数\n食材：用顿号分隔\n步骤：\n1. 第一步\n2. 第二步\n3. 第三步\n营养：热量xxx kcal；蛋白质xxg；碳水xxg；脂肪xxg\n[食谱2]\n...\n[食谱3]\n...\n\n现有食材：${ingredients.join('、')}`;
    const resultText = await window.aiService.chat(prompt);
    return parseAIRecipeRecommendations(resultText, ingredients);
}

function parseAIRecipeRecommendations(text, availableIngredients) {
    const normalizedText = (text || '').replace(/\r/g, '').replace(/\*\*/g, '').trim();
    const sections = normalizedText
        .split(/\[食谱\d+\]/)
        .map(section => section.trim())
        .filter(Boolean);

    return sections.slice(0, 3).map((section, index) => {
        const name = extractField(section, '名称') || `AI食谱 ${index + 1}`;
        const cookingTime = parseInt(extractField(section, '烹饪时间'), 10) || 20;
        const difficulty = extractField(section, '难度') || '中等';
        const matchScoreRaw = parseInt(extractField(section, '匹配度'), 10);
        const ingredientsText = extractField(section, '食材');
        const instructionsText = extractBlock(section, '步骤', ['营养']);
        const nutritionText = extractField(section, '营养');
        const recipeIngredients = ingredientsText
            ? ingredientsText.split(/[、，,]/).map(item => item.trim()).filter(Boolean)
            : [...availableIngredients];
        const instructions = instructionsText
            ? instructionsText.split('\n').map(line => line.replace(/^[-\d.\s]+/, '').trim()).filter(Boolean)
            : ['根据食材清洗处理', '按顺序烹饪至熟', '调味后即可食用'];
        const nutrition = parseNutritionText(nutritionText);

        return {
            id: `ai_recipe_${Date.now()}_${index}`,
            name,
            ingredients: recipeIngredients,
            instructions,
            nutrition,
            cookingTime,
            difficulty,
            matchScore: Number.isFinite(matchScoreRaw) ? Math.max(0, Math.min(100, matchScoreRaw)) / 100 : 0.9,
            missingIngredients: recipeIngredients.filter(item => !availableIngredients.includes(item)),
        };
    });
}

function extractField(section, fieldName) {
    const regex = new RegExp(`${fieldName}[：:]\\s*(.+)`);
    const match = section.match(regex);
    return match?.[1]?.trim() || '';
}

function extractBlock(section, fieldName, nextFields = []) {
    const nextPattern = nextFields.length ? nextFields.join('|') : '$';
    const regex = new RegExp(`${fieldName}[：:]?\\s*([\\s\\S]*?)(?=${nextPattern}|$)`);
    const match = section.match(regex);
    return match?.[1]?.trim() || '';
}

function parseNutritionText(text) {
    const defaultNutrition = { calories: 350, protein: 18, carbs: 35, fat: 12 };
    if (!text) {
        return defaultNutrition;
    }

    const calories = parseInt(text.match(/热量\s*(\d+)/)?.[1], 10);
    const protein = parseFloat(text.match(/蛋白质\s*(\d+(?:\.\d+)?)/)?.[1]);
    const carbs = parseFloat(text.match(/碳水\s*(\d+(?:\.\d+)?)/)?.[1]);
    const fat = parseFloat(text.match(/脂肪\s*(\d+(?:\.\d+)?)/)?.[1]);

    return {
        calories: Number.isFinite(calories) ? calories : defaultNutrition.calories,
        protein: Number.isFinite(protein) ? protein : defaultNutrition.protein,
        carbs: Number.isFinite(carbs) ? carbs : defaultNutrition.carbs,
        fat: Number.isFinite(fat) ? fat : defaultNutrition.fat,
    };
}

/**
 * 食材库 - 包含常见食材及其营养信息
 */
const ingredientDatabase = {
    // 蔬菜类
    西红柿: {
        category: 'vegetable',
        nutrients: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
    },
    黄瓜: {
        category: 'vegetable',
        nutrients: { calories: 15, protein: 0.6, carbs: 3.6, fat: 0.1 },
    },
    西兰花: {
        category: 'vegetable',
        nutrients: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    },
    菠菜: {
        category: 'vegetable',
        nutrients: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
    },
    胡萝卜: {
        category: 'vegetable',
        nutrients: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
    },
    土豆: { category: 'vegetable', nutrients: { calories: 77, protein: 2, carbs: 17, fat: 0.1 } },

    // 蛋白质类
    鸡胸肉: { category: 'protein', nutrients: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
    鸡蛋: { category: 'protein', nutrients: { calories: 155, protein: 13, carbs: 1.1, fat: 11 } },
    豆腐: { category: 'protein', nutrients: { calories: 76, protein: 8, carbs: 1.9, fat: 4.8 } },
    牛肉: { category: 'protein', nutrients: { calories: 250, protein: 26, carbs: 0, fat: 17 } },
    三文鱼: { category: 'protein', nutrients: { calories: 208, protein: 20, carbs: 0, fat: 13 } },

    // 谷物类
    米饭: { category: 'grain', nutrients: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
    面条: { category: 'grain', nutrients: { calories: 138, protein: 5.5, carbs: 25, fat: 1.3 } },
    燕麦: { category: 'grain', nutrients: { calories: 389, protein: 17, carbs: 66, fat: 6.9 } },
    全麦面包: { category: 'grain', nutrients: { calories: 247, protein: 10, carbs: 42, fat: 3.2 } },

    // 水果类
    苹果: { category: 'fruit', nutrients: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
    香蕉: { category: 'fruit', nutrients: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
    橙子: { category: 'fruit', nutrients: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 } },
    草莓: { category: 'fruit', nutrients: { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 } },

    // 调料类
    盐: { category: 'seasoning', nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
    胡椒: { category: 'seasoning', nutrients: { calories: 255, protein: 10, carbs: 64, fat: 3.8 } },
    橄榄油: { category: 'seasoning', nutrients: { calories: 884, protein: 0, carbs: 0, fat: 100 } },
    酱油: { category: 'seasoning', nutrients: { calories: 60, protein: 8, carbs: 5, fat: 0.1 } },
};

/**
 * 食谱库 - 包含常见食谱及其所需食材
 */
const recipeDatabase = [
    {
        id: 1,
        name: '番茄鸡蛋面',
        ingredients: ['西红柿', '鸡蛋', '面条', '盐', '橄榄油'],
        instructions: [
            '将西红柿切块，鸡蛋打散备用',
            '热锅倒入橄榄油，倒入蛋液炒熟盛出',
            '锅中再倒入少许橄榄油，放入西红柿块炒软',
            '加入适量水，煮至西红柿出汁',
            '放入面条煮熟',
            '加入炒好的鸡蛋，加盐调味即可',
        ],
        nutrition: { calories: 350, protein: 15, carbs: 50, fat: 12 },
        cookingTime: 15, // 分钟
        difficulty: '简单', // 简单、中等、困难
    },
    {
        id: 2,
        name: '清炒西兰花',
        ingredients: ['西兰花', '胡萝卜', '盐', '橄榄油'],
        instructions: [
            '西兰花切小朵，胡萝卜切片',
            '锅中烧开水，放入西兰花焯水1分钟捞出',
            '热锅倒入橄榄油，放入胡萝卜片炒至变软',
            '加入西兰花翻炒',
            '加盐调味即可',
        ],
        nutrition: { calories: 120, protein: 5, carbs: 15, fat: 6 },
        cookingTime: 10,
        difficulty: '简单',
    },
    {
        id: 3,
        name: '鸡胸肉沙拉',
        ingredients: ['鸡胸肉', '菠菜', '西红柿', '黄瓜', '橄榄油', '盐', '胡椒'],
        instructions: [
            '鸡胸肉用盐和胡椒腌制15分钟',
            '平底锅加热，放入鸡胸肉煎至熟透',
            '将鸡胸肉切片',
            '菠菜洗净切段，西红柿和黄瓜切块',
            '将所有食材放入碗中，淋上橄榄油，加盐和胡椒调味',
        ],
        nutrition: { calories: 300, protein: 35, carbs: 10, fat: 15 },
        cookingTime: 20,
        difficulty: '中等',
    },
    {
        id: 4,
        name: '豆腐炒蔬菜',
        ingredients: ['豆腐', '西兰花', '胡萝卜', '盐', '橄榄油', '酱油'],
        instructions: [
            '豆腐切块，西兰花切小朵，胡萝卜切片',
            '热锅倒入橄榄油，放入豆腐块煎至两面金黄',
            '加入胡萝卜片炒至变软',
            '加入西兰花翻炒',
            '加入酱油和盐调味即可',
        ],
        nutrition: { calories: 200, protein: 15, carbs: 10, fat: 12 },
        cookingTime: 15,
        difficulty: '简单',
    },
    {
        id: 5,
        name: '燕麦水果碗',
        ingredients: ['燕麦', '香蕉', '草莓', '牛奶'],
        instructions: [
            '将燕麦放入碗中',
            '加入牛奶，浸泡5分钟',
            '香蕉切片，草莓切块',
            '将水果放在燕麦上即可',
        ],
        nutrition: { calories: 250, protein: 8, carbs: 45, fat: 5 },
        cookingTime: 5,
        difficulty: '简单',
    },
];

/**
 * 管理用户食材列表
 */
class IngredientManager {
    constructor() {
        this.ingredients = [];
    }

    /**
     * 添加食材
     * @param {string} ingredientName - 食材名称
     * @returns {object} 操作结果
     */
    addIngredient(ingredientName) {
        if (!ingredientName || ingredientName.trim() === '') {
            return {
                success: false,
                error: '请输入有效的食材名称',
            };
        }

        const trimmedName = ingredientName.trim();

        if (this.ingredients.includes(trimmedName)) {
            return {
                success: false,
                error: '食材已经在列表中',
            };
        }

        this.ingredients.push(trimmedName);
        return {
            success: true,
            data: this.ingredients,
        };
    }

    /**
     * 删除食材
     * @param {string} ingredientName - 食材名称
     * @returns {object} 操作结果
     */
    removeIngredient(ingredientName) {
        const index = this.ingredients.indexOf(ingredientName);
        if (index === -1) {
            return {
                success: false,
                error: '食材不在列表中',
            };
        }

        this.ingredients.splice(index, 1);
        return {
            success: true,
            data: this.ingredients,
        };
    }

    /**
     * 获取食材列表
     * @returns {array} 食材列表
     */
    getIngredients() {
        return this.ingredients;
    }

    /**
     * 清空食材列表
     * @returns {object} 操作结果
     */
    clearIngredients() {
        this.ingredients = [];
        return {
            success: true,
            data: this.ingredients,
        };
    }
}

/**
 * 基于食材生成食谱推荐
 * @param {array} ingredients - 用户提供的食材列表
 * @returns {object} 食谱推荐结果
 */
async function generateRecipeRecommendations(ingredients) {
    try {
        if (!Array.isArray(ingredients) || ingredients.length === 0) {
            return {
                success: false,
                error: '请提供至少一种食材',
            };
        }

        const aiRecipes = await generateRecipeRecommendationsWithAI(ingredients);
        if (aiRecipes && aiRecipes.length > 0) {
            return {
                success: true,
                data: aiRecipes,
            };
        }

        // 计算每个食谱的匹配度
        const matchedRecipes = recipeDatabase.map(recipe => {
            const commonIngredients = recipe.ingredients.filter(ing => ingredients.includes(ing));
            const matchScore = commonIngredients.length / recipe.ingredients.length;

            return {
                ...recipe,
                matchScore,
                missingIngredients: recipe.ingredients.filter(ing => !ingredients.includes(ing)),
            };
        });

        // 按匹配度排序，只返回匹配度大于0的食谱
        const sortedRecipes = matchedRecipes
            .filter(recipe => recipe.matchScore > 0)
            .sort((a, b) => b.matchScore - a.matchScore);

        if (sortedRecipes.length === 0) {
            return {
                success: false,
                error: '没有找到匹配的食谱',
            };
        }

        return {
            success: true,
            data: sortedRecipes,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * 分析食谱的营养成分
 * @param {object} recipe - 食谱对象
 * @returns {object} 营养成分分析
 */
function analyzeRecipeNutrition(recipe) {
    try {
        const { nutrition } = recipe;

        // 计算各营养素的百分比（基于2000卡路里的参考摄入量）
        const proteinPercentage = ((nutrition.protein * 4) / 2000) * 100;
        const carbsPercentage = ((nutrition.carbs * 4) / 2000) * 100;
        const fatPercentage = ((nutrition.fat * 9) / 2000) * 100;

        return {
            success: true,
            data: {
                ...nutrition,
                percentages: {
                    protein: Math.round(proteinPercentage),
                    carbs: Math.round(carbsPercentage),
                    fat: Math.round(fatPercentage),
                },
                rating: getNutritionRating(nutrition),
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * 获取营养评级
 * @param {object} nutrition - 营养成分
 * @returns {string} 营养评级
 */
function getNutritionRating(nutrition) {
    const { calories, protein, carbs, fat } = nutrition;

    // 简单的营养评级逻辑
    if (calories < 300 && protein > 15 && fat < 15) {
        return '优秀';
    } else if (calories < 400 && protein > 10) {
        return '良好';
    } else {
        return '一般';
    }
}

/**
 * 获取食材库中的所有食材
 * @returns {object} 食材库
 */
function getIngredientDatabase() {
    return {
        success: true,
        data: ingredientDatabase,
    };
}

export {
    IngredientManager,
    generateRecipeRecommendations,
    analyzeRecipeNutrition,
    getIngredientDatabase,
};
