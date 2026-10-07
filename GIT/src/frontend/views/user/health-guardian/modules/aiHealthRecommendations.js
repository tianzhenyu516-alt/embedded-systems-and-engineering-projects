// AI健康建议模块

// 渲染AI健康建议卡片
export function renderAIHealthRecommendations() {
    const homePage = document.getElementById('home-page');
    if (!homePage) {
        console.error('Home page element not found');
        return;
    }

    // 检查是否已存在AI健康建议模块
    let recommendationsContainer = document.getElementById('ai-health-recommendations');
    if (!recommendationsContainer) {
        recommendationsContainer = document.createElement('div');
        recommendationsContainer.id = 'ai-health-recommendations';
        recommendationsContainer.className = 'ai-recommendations-container';
        // 添加到首页内容中
        homePage.appendChild(recommendationsContainer);
    }

    // 模拟AI健康建议数据
    const recommendations = [
        {
            id: 1,
            title: '保持规律作息',
            content: '建议每天保持7-8小时的睡眠时间，晚上11点前入睡，有助于维持健康的生物钟。',
            priority: 'high',
            priorityText: '高',
            category: '生活方式',
            icon: '😴',
        },
        {
            id: 2,
            title: '增加有氧运动',
            content:
                '每周至少进行150分钟的中等强度有氧运动，如快走、游泳或骑自行车，有助于改善心血管健康。',
            priority: 'medium',
            priorityText: '中',
            category: '运动',
            icon: '🏃',
        },
        {
            id: 3,
            title: '控制盐分摄入',
            content: '建议每天盐分摄入量不超过5克，减少加工食品和外卖的摄入，有助于控制血压。',
            priority: 'medium',
            priorityText: '中',
            category: '饮食',
            icon: '🍎',
        },
        {
            id: 4,
            title: '定期监测血压',
            content: '建议每天固定时间监测血压，了解血压变化趋势，如有异常及时就医。',
            priority: 'high',
            priorityText: '高',
            category: '监测',
            icon: '🩸',
        },
    ];

    // 按优先级排序
    const sortedRecommendations = [...recommendations].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // 生成AI健康建议内容
    let recommendationsContent = `
        <div class="recommendations-header">
            <h2>AI健康建议</h2>
            <p>基于您的健康数据生成的个性化建议</p>
        </div>
        <div class="recommendations-grid">
    `;

    sortedRecommendations.forEach(rec => {
        recommendationsContent += `
            <div class="recommendation-card" data-priority="${rec.priority}">
                <div class="card-header">
                    <span class="recommendation-icon">${rec.icon}</span>
                    <div class="header-info">
                        <h3>${rec.title}</h3>
                        <div class="recommendation-meta">
                            <span class="priority-badge" data-priority="${rec.priority}">${rec.priorityText}优先级</span>
                            <span class="category-tag">${rec.category}</span>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <p>${rec.content}</p>
                </div>
            </div>
        `;
    });

    recommendationsContent += '</div>';

    recommendationsContainer.innerHTML = recommendationsContent;
    console.log('AI health recommendations rendered successfully');
}
