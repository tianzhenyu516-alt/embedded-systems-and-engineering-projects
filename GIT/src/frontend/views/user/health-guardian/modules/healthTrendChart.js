// 健康趋势图表模块 - 增强版
import { healthDataManager, HEALTH_INDICATORS, DATA_SOURCES, TIME_RANGES } from './healthDataManager.js';
import { userAccountManager } from './userAccountManager.js';

function formatIndicatorStat(indicator, value) {
    return value ?? '--';
}

let trendChartInstance = null;
let currentIndicators = ['heartRate', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'steps'];
let currentDataSource = DATA_SOURCES.ALL;
let currentTimeRange = TIME_RANGES.MONTH;
let currentChartType = 'line';
let chartJsLoaderPromise = null;

// 渲染健康趋势图表
export function renderHealthTrendChart() {
    const homePage = document.getElementById('home-page');
    if (!homePage) {
        console.error('Home page element not found');
        return;
    }

    // 检查是否已存在健康趋势图表模块
    let chartContainer = document.getElementById('health-trend-chart');
    if (!chartContainer) {
        chartContainer = document.createElement('div');
        chartContainer.id = 'health-trend-chart';
        chartContainer.className = 'health-trend-container';
        homePage.appendChild(chartContainer);
    }

    // 生成健康趋势图表内容
    const chartContent = `
        <div class="health-trend-enhanced">
            <div class="trend-header">
                <h2>健康数据趋势</h2>
                <div class="trend-controls">
                    <div class="control-group">
                        <label>健康指标:</label>
                        <div class="indicator-selector" id="trend-indicator-selector"></div>
                    </div>
                    
                    <div class="control-group">
                        <label>数据来源:</label>
                        <div class="source-selector">
                            <button class="source-btn active" data-source="${DATA_SOURCES.ALL}">全部</button>
                            <button class="source-btn" data-source="${DATA_SOURCES.MANUAL}">手动</button>
                            <button class="source-btn" data-source="${DATA_SOURCES.DEVICE}">设备</button>
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <label>时间范围:</label>
                        <div class="time-range-selector">
                            ${Object.values(TIME_RANGES).map(range => `
                                <button class="time-btn ${range.id === currentTimeRange.id ? 'active' : ''}" 
                                        data-range="${range.id}">${range.name}</button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <label>图表类型:</label>
                        <div class="chart-type-selector">
                            <button class="chart-type-btn active" data-type="line">折线</button>
                            <button class="chart-type-btn" data-type="bar">柱状</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="chart-container-wrapper">
                <canvas id="trend-chart-canvas"></canvas>
            </div>
            
            <div class="trend-actions">
                <button class="action-btn" id="trend-refresh-btn">🔄 刷新</button>
                <button class="action-btn" id="trend-export-btn">📊 导出</button>
                <button class="action-btn" id="trend-mock-btn" style="display: none;">🎯 生成数据</button>
            </div>
        </div>
    `;

    chartContainer.innerHTML = chartContent;

    renderIndicatorSelector();
    addStyles();
    setupEventListeners();
    
    // 只有在没有数据时才生成模拟数据
    if (healthDataManager.getData().length === 0 && !userAccountManager.isLoggedIn()) {
        healthDataManager.generateMockData();
    }
    
    loadChartJS().then(() => {
        updateChart();
    }).catch(error => {
        console.error('Chart.js 加载失败:', error);
    });

    console.log('Enhanced health trend chart rendered successfully');
}

function loadChartJS() {
    if (typeof Chart !== 'undefined') {
        return Promise.resolve(Chart);
    }

    if (!chartJsLoaderPromise) {
        chartJsLoaderPromise = new Promise((resolve, reject) => {
            const existingScript = document.querySelector('script[src="/assets/vendor/chart.umd.min.js"]');
            if (existingScript) {
                existingScript.addEventListener('load', () => resolve(window.Chart), { once: true });
                existingScript.addEventListener('error', () => reject(new Error('Chart.js 加载失败')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = '/assets/vendor/chart.umd.min.js';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve(window.Chart);
            script.onerror = () => reject(new Error('Chart.js 加载失败'));
            document.head.appendChild(script);
        }).catch(error => {
            chartJsLoaderPromise = null;
            throw error;
        });
    }

    return chartJsLoaderPromise;
}

function renderIndicatorSelector() {
    const selector = document.getElementById('trend-indicator-selector');
    if (!selector) {return;}

    selector.innerHTML = Object.values(HEALTH_INDICATORS)
        .filter(indicator => indicator.id !== 'weight')
        .map(indicator => `
        <label class="indicator-checkbox">
            <input type="checkbox" 
                   value="${indicator.id}" 
                   ${currentIndicators.includes(indicator.id) ? 'checked' : ''}>
            <span class="indicator-color" style="background-color: ${indicator.color}"></span>
            <span class="indicator-name">${indicator.name}</span>
        </label>
    `).join('');
}

function setupEventListeners() {
    const container = document.getElementById('health-trend-chart');
    if (!container) {return;}

    container.querySelectorAll('.source-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDataSource = btn.dataset.source;
            updateChart();
        });
    });

    container.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimeRange = TIME_RANGES[btn.dataset.range.toUpperCase()];
            updateChart();
        });
    });

    container.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartType = btn.dataset.type;
            updateChart();
        });
    });

    const indicatorSelector = document.getElementById('trend-indicator-selector');
    if (indicatorSelector) {
        indicatorSelector.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const indicatorId = e.target.value;
                if (e.target.checked) {
                    if (!currentIndicators.includes(indicatorId)) {
                        currentIndicators.push(indicatorId);
                    }
                } else {
                    currentIndicators = currentIndicators.filter(id => id !== indicatorId);
                }
                updateChart();
            }
        });
    }

    const refreshBtn = document.getElementById('trend-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            updateChart();
            showNotification('数据已刷新', 'success');
        });
    }

    const exportBtn = document.getElementById('trend-export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    const mockBtn = document.getElementById('trend-mock-btn');
    if (mockBtn) {
        mockBtn.addEventListener('click', () => {
            healthDataManager.generateMockData();
            showNotification('模拟数据已生成', 'success');
        });
        mockBtn.style.display = 'block';
    }

    healthDataManager.subscribe(() => {
        updateChart();
    });
}

function updateChart() {
    if (typeof Chart === 'undefined') {
        return;
    }
    renderChartCanvas();
}

function renderStats() {
    const statsContainer = document.getElementById('trend-stats');
    if (!statsContainer) {return;}

    const aggregatedData = healthDataManager.getAggregatedData(
        currentDataSource,
        currentTimeRange,
        currentIndicators,
    );

    if (aggregatedData.length === 0) {
        statsContainer.innerHTML = `
            <div class="no-data-state">
                <div class="no-data-icon">📊</div>
                <p>暂无数据，请先记录健康数据或生成模拟数据</p>
            </div>
        `;
        return;
    }

    const stats = currentIndicators.map(indicatorId => {
        const indicator = Object.values(HEALTH_INDICATORS).find(i => i.id === indicatorId);
        if (!indicator) {return null;}

        const values = aggregatedData
            .map(d => d.indicators[indicatorId])
            .filter(v => v !== undefined);

        if (values.length === 0) {return null;}

        const latest = values[values.length - 1];
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return { indicator, latest, avg, min, max };
    }).filter(s => s !== null);

    statsContainer.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <div class="stat-header" style="border-left-color: ${stat.indicator.color}">
                <span class="stat-name">${stat.indicator.name}</span>
                <span class="stat-unit">${stat.indicator.unit}</span>
            </div>
            <div class="stat-body">
                <div class="stat-value">${formatIndicatorStat(stat.indicator, stat.latest)}</div>
                <div class="stat-details">
                    <span>平均: ${formatIndicatorStat(stat.indicator, stat.avg)}</span>
                    <span>最低: ${formatIndicatorStat(stat.indicator, stat.min)}</span>
                    <span>最高: ${formatIndicatorStat(stat.indicator, stat.max)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderChartCanvas() {
    const canvas = document.getElementById('trend-chart-canvas');
    if (!canvas || typeof Chart === 'undefined') {return;}

    const ctx = canvas.getContext('2d');
    const aggregatedData = healthDataManager.getAggregatedData(
        currentDataSource,
        currentTimeRange,
        currentIndicators,
    );

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    if (aggregatedData.length === 0) {
        return;
    }

    const labels = aggregatedData.map(d => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const datasets = currentIndicators.map(indicatorId => {
        const indicator = Object.values(HEALTH_INDICATORS).find(i => i.id === indicatorId);
        if (!indicator) {return null;}

        const data = aggregatedData.map(d => d.indicators[indicatorId] !== undefined ? d.indicators[indicatorId] : null);

        return {
            label: indicator.name,
            data,
            borderColor: indicator.color,
            backgroundColor: currentChartType === 'bar' ? `${indicator.color  }80` : `${indicator.color  }20`,
            borderWidth: 2,
            tension: 0.4,
            fill: currentChartType === 'line',
            pointRadius: 4,
            pointHoverRadius: 6,
            spanGaps: true,
        };
    }).filter(d => d !== null);

    trendChartInstance = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels,
            datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                    },
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 8,
                },
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                    },
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                    },
                },
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart',
            },
        },
    });
}

function exportData() {
    const data = healthDataManager.getData(
        currentDataSource,
        currentTimeRange,
        currentIndicators,
    );

    const csvContent = [
        ['日期', '时间', '数据来源', ...currentIndicators.map(id => {
            const indicator = Object.values(HEALTH_INDICATORS).find(i => i.id === id);
            return indicator ? `${indicator.name}(${indicator.unit})` : id;
        })].join(','),
        ...data.map(record => [
            record.date,
            record.time,
            record.source === DATA_SOURCES.MANUAL ? '手动' : '设备',
            ...currentIndicators.map(id => record.indicators[id] || ''),
        ].join(',')),
    ].join('\n');

    const blob = new Blob([`\ufeff${  csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `健康数据_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showNotification('数据导出成功', 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `trend-notification trend-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        background-color: ${type === 'success' ? '#34C759' : type === 'error' ? '#FF3B30' : '#007AFF'};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function addStyles() {
    const existingStyle = document.getElementById('trend-chart-styles');
    if (existingStyle) {return;}

    const style = document.createElement('style');
    style.id = 'trend-chart-styles';
    style.textContent = `
        .health-trend-enhanced {
            width: 100%;
            padding: 20px;
        }
        
        .trend-header {
            margin-bottom: 24px;
        }
        
        .trend-header h2 {
            margin: 0 0 16px 0;
            color: #1a1a1a;
            font-size: 24px;
        }
        
        .trend-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 12px;
        }
        
        .control-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .control-group label {
            font-size: 12px;
            color: #666;
            font-weight: 500;
        }
        
        .indicator-selector {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .indicator-checkbox {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .indicator-checkbox:hover {
            background: #f0f0f0;
        }
        
        .indicator-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        
        .indicator-name {
            font-size: 13px;
            color: #333;
        }
        
        .source-selector,
        .time-range-selector,
        .chart-type-selector {
            display: flex;
            gap: 4px;
        }
        
        .source-btn,
        .time-btn,
        .chart-type-btn {
            padding: 8px 16px;
            border: none;
            background: white;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            color: #333;
        }
        
        .source-btn:hover,
        .time-btn:hover,
        .chart-type-btn:hover {
            background: #e8e8e8;
        }
        
        .source-btn.active,
        .time-btn.active,
        .chart-type-btn.active {
            background: #007AFF;
            color: white;
        }
        
        .trend-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        
        .stat-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            overflow: hidden;
        }
        
        .stat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #f8f9fa;
            border-left: 4px solid;
        }
        
        .stat-name {
            font-weight: 600;
            color: #333;
        }
        
        .stat-unit {
            font-size: 12px;
            color: #666;
        }
        
        .stat-body {
            padding: 16px;
        }
        
        .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 8px;
        }
        
        .stat-details {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 12px;
            color: #666;
        }
        
        .chart-container-wrapper {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            margin-bottom: 20px;
            height: 400px;
        }
        
        .trend-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }
        
        .action-btn {
            padding: 10px 20px;
            border: none;
            background: #007AFF;
            color: white;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .action-btn:hover {
            background: #0056CC;
            transform: translateY(-1px);
        }
        
        .no-data-state {
            text-align: center;
            padding: 40px;
            color: #888;
        }
        
        .no-data-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}
