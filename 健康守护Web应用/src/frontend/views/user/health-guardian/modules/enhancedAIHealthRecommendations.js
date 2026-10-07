// 增强版AI健康建议渲染模块
import { aiHealthRecommendationManager, RECOMMENDATION_UPDATE_EVENT } from './aiHealthRecommendationManager.js';
import { healthDataManager } from './healthDataManager.js';

let isInitialized = false;

// 渲染增强版AI健康建议
export async function renderEnhancedAIHealthRecommendations() {
    const homePage = document.getElementById('home-page');
    if (!homePage) {
        console.error('Home page element not found');
        return;
    }

    // 检查是否已存在AI健康建议模块
    let container = document.getElementById('enhanced-ai-health-recommendations');
    if (!container) {
        container = document.createElement('div');
        container.id = 'enhanced-ai-health-recommendations';
        container.className = 'enhanced-ai-recommendations-container';
        homePage.appendChild(container);
    }

    // 首次初始化时设置事件监听
    if (!isInitialized) {
        setupEventListeners(container);
        isInitialized = true;
    }

    // 显示加载状态
    renderLoadingState(container);

    try {
        // 获取AI健康建议
        const recommendations = await aiHealthRecommendationManager.getRecommendations();
        
        // 渲染建议
        renderRecommendationsContent(container, recommendations);
    } catch (error) {
        console.error('渲染AI健康建议失败:', error);
        renderErrorState(container, error.message);
    }
}

// 设置事件监听
function setupEventListeners(container) {
    // 监听建议更新事件
    window.addEventListener(RECOMMENDATION_UPDATE_EVENT, (event) => {
        console.log('接收到AI建议更新事件');
        const recommendations = event.detail.recommendations;
        if (recommendations) {
            renderRecommendationsContent(container, recommendations);
        }
    });

    // 手动刷新按钮
    container.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="refresh"]')) {
            handleManualRefresh(container);
        }
    });
}

// 处理手动刷新
async function handleManualRefresh(container) {
    const refreshBtn = container.querySelector('[data-action="refresh"]');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<span class="spinner-small"></span> 刷新中...';
    }

    try {
        const recommendations = await aiHealthRecommendationManager.getRecommendations(true);
        renderRecommendationsContent(container, recommendations);
    } catch (error) {
        console.error('刷新AI建议失败:', error);
        renderErrorState(container, error.message);
    }
}

// 渲染加载状态
function renderLoadingState(container) {
    container.innerHTML = `
        <div class="recommendations-header">
            <h2>AI健康建议</h2>
            <p>正在分析您的健康数据...</p>
        </div>
        <div class="loading-container">
            <div class="spinner-large"></div>
            <p class="loading-text">正在生成个性化健康建议</p>
        </div>
    `;
}

// 渲染错误状态
function renderErrorState(container, errorMessage) {
    container.innerHTML = `
        <div class="recommendations-header">
            <h2>AI健康建议</h2>
            <p>生成建议时出错</p>
        </div>
        <div class="error-container">
            <div class="error-icon">⚠️</div>
            <p class="error-message">${errorMessage || '无法生成健康建议，请稍后重试'}</p>
            <button class="feature-button" data-action="refresh">重试</button>
        </div>
    `;
}

// 渲染建议内容
function renderRecommendationsContent(container, recommendations) {
    const cacheInfo = aiHealthRecommendationManager.getCacheInfo();
    
    // 如果没有建议或没有健康数据，显示默认状态
    if (!recommendations || recommendations.length === 0) {
        renderEmptyState(container);
        return;
    }

    // 生成内容
    let content = `
        <div class="recommendations-header">
            <div class="header-left">
                <h2>AI健康建议</h2>
                <p>基于您的健康数据生成的个性化建议</p>
                ${cacheInfo.generatedAt ? `
                    <span class="generated-time">
                        上次更新: ${formatDateTime(cacheInfo.generatedAt)}
                        <span class="cache-indicator" title="使用缓存数据">📦</span>
                    </span>
                ` : ''}
            </div>
            <div class="header-actions">
                <button class="refresh-button" data-action="refresh" title="刷新建议">
                    🔄 刷新
                </button>
            </div>
        </div>
        
        <div class="recommendations-stats">
            <div class="stat-item">
                <span class="stat-icon">📋</span>
                <span class="stat-value">${recommendations.length}</span>
                <span class="stat-label">条建议</span>
            </div>
            <div class="stat-item">
                <span class="stat-icon">🔴</span>
                <span class="stat-value">${recommendations.filter(r => r.priority === 'high').length}</span>
                <span class="stat-label">高优先级</span>
            </div>
            <div class="stat-item">
                <span class="stat-icon">🟡</span>
                <span class="stat-value">${recommendations.filter(r => r.priority === 'medium').length}</span>
                <span class="stat-label">中优先级</span>
            </div>
            <div class="stat-item">
                <span class="stat-icon">🟢</span>
                <span class="stat-value">${recommendations.filter(r => r.priority === 'low').length}</span>
                <span class="stat-label">低优先级</span>
            </div>
        </div>
        
        <div class="recommendations-grid">
    `;

    // 渲染每个建议卡片
    recommendations.forEach((rec, index) => {
        content += renderRecommendationCard(rec, index);
    });

    content += '</div>';

    container.innerHTML = content;
}

// 渲染单个建议卡片
function renderRecommendationCard(recommendation, index) {
    return `
        <div class="recommendation-card" data-priority="${recommendation.priority}" style="animation-delay: ${index * 0.1}s">
            <div class="card-header">
                <span class="recommendation-icon">${recommendation.icon}</span>
                <div class="header-info">
                    <h3>${recommendation.title}</h3>
                    <div class="recommendation-meta">
                        <span class="priority-badge" data-priority="${recommendation.priority}">
                            ${recommendation.priorityText}优先级
                        </span>
                        <span class="category-tag">${recommendation.category}</span>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <p>${recommendation.content}</p>
            </div>
        </div>
    `;
}

// 渲染空状态
function renderEmptyState(container) {
    const hasHealthData = healthDataManager.getData().length > 0;
    
    container.innerHTML = `
        <div class="recommendations-header">
            <h2>AI健康建议</h2>
            <p>个性化健康建议</p>
        </div>
        <div class="empty-state-container">
            <div class="empty-icon">${hasHealthData ? '🤔' : '📊'}</div>
            <h3>${hasHealthData ? '暂无健康建议' : '需要健康数据'}</h3>
            <p>
                ${hasHealthData 
        ? '当前健康数据不足以生成建议，请添加更多健康记录' 
        : '请先添加健康数据，AI将为您生成个性化的健康建议'}
            </p>
            <div class="empty-actions">
                ${!hasHealthData ? `
                    <button class="feature-button" id="generate-mock-data">
                        🎯 生成示例数据
                    </button>
                ` : ''}
                <button class="feature-button secondary" data-action="refresh">
                    🔄 刷新
                </button>
            </div>
        </div>
    `;

    // 绑定生成示例数据按钮
    const mockDataBtn = container.querySelector('#generate-mock-data');
    if (mockDataBtn) {
        mockDataBtn.addEventListener('click', async () => {
            mockDataBtn.disabled = true;
            mockDataBtn.textContent = '生成中...';
            healthDataManager.generateMockData();
            // 等待一小会儿让数据保存
            setTimeout(async () => {
                const recommendations = await aiHealthRecommendationManager.getRecommendations(true);
                renderRecommendationsContent(container, recommendations);
            }, 500);
        });
    }
}

// 格式化日期时间
function formatDateTime(dateStr) {
    if (!dateStr) {return '';}
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    // 如果是今天
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return `今天 ${  date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // 如果是昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate() 
        && date.getMonth() === yesterday.getMonth() 
        && date.getFullYear() === yesterday.getFullYear()) {
        return `昨天 ${  date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// 初始化增强版AI健康建议模块
export function initEnhancedAIHealthRecommendations() {
    renderEnhancedAIHealthRecommendations();
}
