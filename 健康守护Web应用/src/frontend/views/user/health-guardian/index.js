import { renderWelcomeMessage } from './modules/welcome.js';
import { renderHealthMetrics, subscribeToDataChanges } from './modules/healthMetrics.js';
import { renderHealthTrendChart } from './modules/healthTrendChart.js';
import { initEnhancedAIHealthRecommendations } from './modules/enhancedAIHealthRecommendations.js';
import { userAccountManager } from './modules/userAccountManager.js';
import { dataSyncManager } from './modules/dataSyncManager.js';
import { healthDataManager } from './modules/healthDataManager.js';

export function initHealthGuardian() {
    renderWelcomeMessage();
    renderHealthMetrics();
    renderHealthTrendChart();
    initEnhancedAIHealthRecommendations();
    subscribeToDataChanges();
    initRealTimeSync();

    initUserAndSyncSystem();
}

function initRealTimeSync() {
    setTimeout(() => {
        if (window.realTimeDataSync) {
            console.log('[HealthGuardian] 实时数据同步系统已就绪');
        }
    }, 100);
}

function initUserAndSyncSystem() {
    console.log('[HealthGuardian] 初始化用户账户和云同步系统');

    userAccountManager.subscribe((user) => {
        if (user) {
            console.log('[HealthGuardian] 用户已登录:', user.username);
        } else {
            console.log('[HealthGuardian] 用户已登出');
        }
    });

    dataSyncManager.subscribe((status) => {
        console.log('[HealthGuardian] 同步状态更新:', status);
    });

    if (userAccountManager.isLoggedIn()) {
        console.log('[HealthGuardian] 当前用户:', userAccountManager.getCurrentUser().username);
    }
}

export { userAccountManager, dataSyncManager, healthDataManager };
