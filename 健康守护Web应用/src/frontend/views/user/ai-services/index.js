// AI服务模块索引文件
import diseaseConsultation from './disease-consultation.js';
import mentalHealthChat from './mental-health-chat.js';
import healthRecommendation from './health-recommendation.js';
import medicationGuidance from './medication-guidance.js';
import healthReport from './health-report.js';
import stateManager from './state.js';

// 导出所有功能模块
const aiServices = {
    diseaseConsultation,
    mentalHealthChat,
    healthRecommendation,
    medicationGuidance,
    healthReport,
    stateManager,
};

export default aiServices;
