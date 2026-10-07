// 欢迎语模块
import { userAccountManager } from './userAccountManager.js';

function createQuickActionsMarkup() {
    const actions = [
        {
            label: '查看健康趋势',
            hint: '快速了解本周身体变化',
            icon: '📈',
            type: 'tab',
            tab: 'home',
        },
        {
            label: '连接智能设备',
            hint: '同步手环与健康监测数据',
            icon: '⌚',
            type: 'link',
            href: '/views/user/dashboard/device-connection.html',
        },
        {
            label: '在线问诊',
            hint: '预约医院与发起在线咨询',
            icon: '🏥',
            type: 'tab',
            tab: 'hospital',
        },
        {
            label: 'AI 健康服务',
            hint: '获取分析、报告与建议',
            icon: '🧠',
            type: 'tab',
            tab: 'ai',
        },
    ];

    return actions
        .map(action => {
            const attrs = action.type === 'link'
                ? `data-action-type="link" data-href="${action.href}"`
                : `data-action-type="tab" data-tab="${action.tab}"`;

            return `
                <button class="welcome-action-card" type="button" ${attrs}>
                    <span class="welcome-action-card__icon" aria-hidden="true">${action.icon}</span>
                    <span class="welcome-action-card__body">
                        <strong>${action.label}</strong>
                        <span>${action.hint}</span>
                    </span>
                    <span class="welcome-action-card__arrow" aria-hidden="true">→</span>
                </button>
            `;
        })
        .join('');
}

function bindWelcomeActions(container) {
    if (!container || container.dataset.actionsBound === 'true') {
        return;
    }

    container.addEventListener('click', event => {
        const actionCard = event.target.closest('.welcome-action-card');
        if (!actionCard) {
            return;
        }

        const actionType = actionCard.dataset.actionType;
        if (actionType === 'link' && actionCard.dataset.href) {
            window.location.href = actionCard.dataset.href;
            return;
        }

        if (actionType === 'tab' && actionCard.dataset.tab) {
            const tabButton = document.querySelector(`.nav-button[data-page="${actionCard.dataset.tab}"]`);
            tabButton?.click();
        }
    });

    container.dataset.actionsBound = 'true';
}

// 渲染欢迎语组件
export function renderWelcomeMessage() {
    const homePage = document.getElementById('home-page');
    if (!homePage) {
        console.error('Home page element not found');
        return;
    }

    // 检查是否已存在欢迎语模块
    let welcomeContainer = document.getElementById('welcome-message');
    if (!welcomeContainer) {
        welcomeContainer = document.createElement('section');
        welcomeContainer.id = 'welcome-message';
        welcomeContainer.className = 'welcome-container';
        // 添加欢迎语模块到首页
        homePage.appendChild(welcomeContainer);
    }

    // 获取当前时间
    const now = new Date();
    const hour = now.getHours();

    // 根据时间段生成问候语
    let greeting = '';
    let scheduleLabel = '';
    if (hour < 6) {
        greeting = '夜深了，注意休息';
        scheduleLabel = '建议尽快结束屏幕使用，保持安静入睡环境';
    } else if (hour < 12) {
        greeting = '早上好';
        scheduleLabel = '适合查看昨夜睡眠、开启今日饮食与运动计划';
    } else if (hour < 18) {
        greeting = '下午好';
        scheduleLabel = '适合复盘步数、补水与血压心率状态';
    } else {
        greeting = '晚上好';
        scheduleLabel = '适合整理今日健康记录并获取晚间建议';
    }

    const currentUser = userAccountManager.getCurrentUser();
    const isLoggedIn = !!currentUser;
    const userName = currentUser?.username || '用户';
    const todayLabel = now.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
    });

    // 生成欢迎语内容
    const welcomeContent = `
        <div class="welcome-shell">
            <div class="welcome-hero-card">
                <div class="welcome-hero-card__badge">${todayLabel}</div>
                <div class="welcome-header">
                    <p class="welcome-eyebrow">Health Guardian · 用户中心</p>
                    <h1>${greeting}，${isLoggedIn ? userName : '访客'}</h1>
                    <p class="welcome-subtitle">把健康数据、饮食建议、在线问诊与 AI 服务集中在一个界面里，今天也能更从容地照顾自己。</p>
                </div>
                <div class="welcome-highlight-strip">
                    <div class="welcome-highlight-item">
                        <span class="welcome-highlight-item__label">今日提示</span>
                        <strong>${scheduleLabel}</strong>
                    </div>
                    <div class="welcome-highlight-item">
                        <span class="welcome-highlight-item__label">首页能力</span>
                        <strong>监测 · 咨询 · 报告 · 设备同步</strong>
                    </div>
                </div>
            </div>

            <aside class="welcome-side-panel">
                <div class="welcome-side-panel__section">
                    <span class="welcome-side-panel__tag">快速概览</span>
                    <div class="welcome-kpi-list">
                        <div class="welcome-kpi-item">
                            <strong>4</strong>
                            <span>核心健康模块</span>
                        </div>
                        <div class="welcome-kpi-item">
                            <strong>24h</strong>
                            <span>持续记录节奏</span>
                        </div>
                        <div class="welcome-kpi-item">
                            <strong>AI</strong>
                            <span>个性化建议支持</span>
                        </div>
                    </div>
                </div>
                <div class="welcome-side-panel__section welcome-side-panel__section--soft">
                    <span class="welcome-side-panel__tag">建议操作</span>
                    <p>优先连接设备并补充健康记录，系统会生成更准确的趋势分析和建议。</p>
                </div>
            </aside>
        </div>

        <div class="welcome-actions-panel">
            <div class="welcome-actions-panel__header">
                <h2>今天想先做什么？</h2>
                <p>从这里直接进入最常用的用户能力，无需反复切换页面。</p>
            </div>
            <div class="welcome-actions-grid">
                ${createQuickActionsMarkup()}
            </div>
        </div>


    `;

    welcomeContainer.innerHTML = welcomeContent;
    bindWelcomeActions(welcomeContainer);
    console.log('Welcome message rendered successfully');
}
