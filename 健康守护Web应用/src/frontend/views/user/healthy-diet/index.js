// 健康饮食功能模块的主入口

import * as dietRecommendation from './diet-recommendation.js';
import * as dietGuidance from './diet-guidance.js';
import * as aiRecipeRecommendation from './ai-recipe-recommendation.js';

export {
    // 基于健康数据与用户目标的饮食推荐功能
    dietRecommendation,

    // 健康饮食指导功能
    dietGuidance,

    // 基于现有食材的AI食谱推荐功能
    aiRecipeRecommendation,
};

// 同时重新导出 aiRecipeRecommendation 的所有内容
export const IngredientManager = aiRecipeRecommendation.IngredientManager;
export const generateRecipeRecommendations = aiRecipeRecommendation.generateRecipeRecommendations;
export const analyzeRecipeNutrition = aiRecipeRecommendation.analyzeRecipeNutrition;
export const getIngredientDatabase = aiRecipeRecommendation.getIngredientDatabase;
