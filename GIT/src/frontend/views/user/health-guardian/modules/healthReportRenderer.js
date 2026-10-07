import { healthReportGenerator } from './healthReportGenerator.js';
import { TIME_RANGES, HEALTH_INDICATORS } from './healthDataManager.js';

function formatIndicatorDisplay(indicator, value) {
    return value ?? '--';
}

function formatIndicatorRange(indicator, value) {
    return value;
}

export async function renderHealthReport() {
    const homePage = document.getElementById('home-page');
    if (!homePage) {
        console.error('Home page element not found');
        return;
    }

    let container = document.getElementById('health-report-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'health-report-container';
        container.className = 'health-report-wrapper';
        homePage.appendChild(container);
    }

    if (!isInitialized) {
        setupEventListeners(container);
        isInitialized = true;
    }

    renderLoadingState(container);

    try {
        const report = await healthReportGenerator.generateReport(TIME_RANGES.MONTH);
        currentReport = report;
        renderReportContent(container, report);
    } catch (error) {
        console.error('渲染健康报告失败:', error);
        renderErrorState(container, error.message);
    }
}

function setupEventListeners(container) {
    container.addEventListener('click', async (e) => {
        if (e.target.closest('[data-action="refresh-report"]')) {
            await handleRefreshReport(container);
        } else if (e.target.closest('[data-action="export-pdf"]')) {
            handleExportPDF(container);
        } else if (e.target.closest('[data-time-range]')) {
            await handleTimeRangeChange(container, e.target.closest('[data-time-range]'));
        }
    });
}

async function handleRefreshReport(container) {
    const refreshBtn = container.querySelector('[data-action="refresh-report"]');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<span class="spinner-small"></span> 刷新中...';
    }

    try {
        healthReportGenerator.clearCache();
        const report = await healthReportGenerator.generateReport(TIME_RANGES.MONTH, true);
        currentReport = report;
        renderReportContent(container, report);
    } catch (error) {
        console.error('刷新健康报告失败:', error);
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '🔄 刷新报告';
        }
    }
}

async function handleTimeRangeChange(container, btn) {
    const rangeId = btn.dataset.timeRange;
    const timeRange = TIME_RANGES[rangeId.toUpperCase()];
    
    if (!timeRange) return;

    container.querySelectorAll('[data-time-range]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    renderLoadingState(container);

    try {
        const report = await healthReportGenerator.generateReport(timeRange, true);
        currentReport = report;
        renderReportContent(container, report);
    } catch (error) {
        console.error('切换时间范围失败:', error);
        renderErrorState(container, error.message);
    }
}

function handleExportPDF(container) {
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert('PDF导出功能需要加载额外的库文件');
        return;
    }

    const reportSection = container.querySelector('.health-report-section');
    if (!reportSection) return;

    const exportBtn = container.querySelector('[data-action="export-pdf"]');
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '📄 生成中...';
    }

    const originalOverflow = reportSection.style.overflow;
    const originalMaxHeight = reportSection.style.maxHeight;
    reportSection.style.overflow = 'visible';
    reportSection.style.maxHeight = 'none';

    setTimeout(() => {
        html2canvas(reportSection, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            allowTaint: true,
            imageTimeout: 0,
            onclone: function(clonedDoc) {
                const clonedSection = clonedDoc.querySelector('.health-report-section');
                if (clonedSection) {
                    clonedSection.style.overflow = 'visible';
                    clonedSection.style.maxHeight = 'none';
                }
            }
        }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`健康报告_${new Date().toISOString().split('T')[0]}.pdf`);
            
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '📄 导出PDF';
            }
            
            reportSection.style.overflow = originalOverflow;
            reportSection.style.maxHeight = originalMaxHeight;
        }).catch(error => {
            console.error('导出PDF失败:', error);
            alert('导出PDF失败，请稍后重试');
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '📄 导出PDF';
            }
            reportSection.style.overflow = originalOverflow;
            reportSection.style.maxHeight = originalMaxHeight;
        });
    }, 300);
}

function renderLoadingState(container) {
    container.innerHTML = `
        <div class="health-report-section">
            <div class="report-header">
                <h2>📊 健康报告</h2>
                <div class="report-actions">
                    <button class="report-action-btn" disabled>
                        <span class="spinner-small"></span> 加载中...
                    </button>
                </div>
            </div>
            <div class="report-loading">
                <div class="spinner-large"></div>
                <p>正在分析健康数据，生成个性化报告...</p>
            </div>
        </div>
    `;
}

function renderErrorState(container, errorMessage) {
    container.innerHTML = `
        <div class="health-report-section">
            <div class="report-header">
                <h2>📊 健康报告</h2>
            </div>
            <div class="report-error">
                <div class="error-icon">⚠️</div>
                <h3>生成报告失败</h3>
                <p>${errorMessage || '请确保有足够的健康数据后重试'}</p>
                <button class="feature-button" data-action="refresh-report">
                    🔄 重试
                </button>
            </div>
        </div>
    `;
}

function renderReportContent(container, report) {
    const { metadata, overview, trends, riskFactors, recommendations, visualData } = report;
    const generatedDate = new Date(metadata.generatedAt);

    container.innerHTML = `
        <div class="health-report-section">
            <div class="report-header">
                <div class="header-left">
                    <h2>📊 健康报告</h2>
                    <p class="report-subtitle">
                        基于${metadata.timeRange.name}的健康数据分析生成
                        <span class="generated-time">
                            ${formatDateTime(generatedDate)}
                        </span>
                    </p>
                </div>
                <div class="header-right">
                    <div class="time-range-selector">
                        ${Object.values(TIME_RANGES).map(range => `
                            <button class="time-range-btn ${metadata.timeRange.id === range.id ? 'active' : ''}" 
                                    data-time-range="${range.id}">
                                ${range.name}
                            </button>
                        `).join('')}
                    </div>
                    <div class="report-actions">
                        <button class="report-action-btn" data-action="refresh-report">
                            🔄 刷新报告
                        </button>
                        <button class="report-action-btn primary" data-action="export-pdf">
                            📄 导出PDF
                        </button>
                    </div>
                </div>
            </div>

            <div class="health-report-content" id="health-report-content">
                ${renderOverviewSection(overview, metadata)}
                ${renderTrendsSection(trends, visualData)}
                ${renderRiskFactorsSection(riskFactors)}
                ${renderRecommendationsSection(recommendations)}
            </div>
        </div>
    `;

    setTimeout(() => {
        renderReportChart(visualData);
    }, 100);

    addStyles();
}

function renderOverviewSection(overview, metadata) {
    const { overallScore, healthStatus, summary } = overview;
    
    return `
        <div class="report-section overview-section">
            <div class="section-header">
                <h3>📈 健康概览</h3>
            </div>
            <div class="overview-content">
                <div class="score-card">
                    <div class="score-circle" style="border-color: ${healthStatus.color}">
                        <span class="score-value">${overallScore}</span>
                        <span class="score-label">分</span>
                    </div>
                    <div class="score-status" style="color: ${healthStatus.color}">
                        ${healthStatus.text}
                    </div>
                </div>
                <div class="summary-card">
                    <h4>健康总结</h4>
                    <p>${summary}</p>
                    <div class="metadata-info">
                        <span class="metadata-item">
                            <span class="metadata-icon">📊</span>
                            ${metadata.dataPoints}个数据点
                        </span>
                        ${!metadata.validation.isValid ? `
                            <span class="metadata-item warning">
                                <span class="metadata-icon">⚠️</span>
                                数据完整性需提升
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderTrendsSection(trends, visualData) {
    const trendCards = Object.values(trends).map(trend => {
        const { indicator, latest, avg, min, max, trend: trendDirection, inNormalRange, status } = trend;
        const trendIcon = trendDirection === 'rising' ? '📈' : trendDirection === 'falling' ? '📉' : '➡️';
        const statusText = inNormalRange ? '正常' : (status === 'high' ? '偏高' : '偏低');
        const statusColor = inNormalRange ? '#34C759' : '#FF3B30';

        return `
            <div class="trend-card">
                <div class="trend-card-header">
                    <div class="trend-indicator-info">
                        <span class="indicator-color-dot" style="background-color: ${indicator.color}"></span>
                        <span class="trend-indicator-name">${indicator.name}</span>
                    </div>
                    <span class="trend-direction">${trendIcon}</span>
                </div>
                <div class="trend-card-body">
                    <div class="trend-value-main">
                        <span class="value">${formatIndicatorDisplay(indicator, latest)}</span>
                        <span class="unit">${indicator.unit}</span>
                        <span class="trend-status" style="color: ${statusColor}">${statusText}</span>
                    </div>
                    <div class="trend-stats">
                        <span>平均: ${formatIndicatorDisplay(indicator, avg)}${indicator.unit}</span>
                        <span>最低: ${formatIndicatorDisplay(indicator, min)}${indicator.unit}</span>
                        <span>最高: ${formatIndicatorDisplay(indicator, max)}${indicator.unit}</span>
                    </div>
                    <div class="normal-range">
                        正常范围: ${formatIndicatorRange(indicator, indicator.normalMin)} - ${formatIndicatorRange(indicator, indicator.normalMax)} ${indicator.unit}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="report-section trends-section">
            <div class="section-header">
                <h3>📊 数据趋势分析</h3>
            </div>
            <div class="trends-chart-container">
                <canvas id="report-trend-chart"></canvas>
            </div>
            <div class="trends-cards-grid">
                ${trendCards}
            </div>
        </div>
    `;
}

function renderRiskFactorsSection(riskFactors) {
    if (riskFactors.length === 0) {
        return `
            <div class="report-section risks-section">
                <div class="section-header">
                    <h3>⚠️ 健康风险提示</h3>
                </div>
                <div class="no-risks">
                    <div class="success-icon">✅</div>
                    <p>暂无发现健康风险因素，继续保持良好的生活习惯！</p>
                </div>
            </div>
        `;
    }

    const riskCards = riskFactors.map((risk, index) => `
        <div class="risk-card" style="animation-delay: ${index * 0.1}s">
            <div class="risk-level-badge" style="background-color: ${risk.riskLevel.color}20; color: ${risk.riskLevel.color}">
                ${risk.riskLevel.name}
            </div>
            <div class="risk-content">
                <h4>${risk.indicator?.name || '健康风险'}</h4>
                <p>${risk.description}</p>
            </div>
        </div>
    `).join('');

    return `
        <div class="report-section risks-section">
            <div class="section-header">
                <h3>⚠️ 健康风险提示</h3>
                <span class="risk-count">${riskFactors.length}个风险因素</span>
            </div>
            <div class="risks-list">
                ${riskCards}
            </div>
        </div>
    `;
}

function renderRecommendationsSection(recommendations) {
    const priorityColors = {
        high: '#FF3B30',
        medium: '#FF9500',
        low: '#34C759'
    };

    const priorityTexts = {
        high: '高优先级',
        medium: '中优先级',
        low: '低优先级'
    };

    const recCards = recommendations.map((rec, index) => {
        const details = rec.details || { implementation: [], expectedEffect: '', precautions: [] };
        
        return `
            <div class="recommendation-card" style="animation-delay: ${index * 0.1}s">
                <div class="rec-icon">${rec.icon}</div>
                <div class="rec-content">
                    <div class="rec-header">
                        <h4>${rec.title}</h4>
                        <span class="rec-priority" style="background-color: ${priorityColors[rec.priority]}20; color: ${priorityColors[rec.priority]}">
                            ${priorityTexts[rec.priority]}
                        </span>
                    </div>
                    
                    <div class="rec-details">
                        <div class="rec-detail-section">
                            <h5 class="rec-detail-title">📝 具体实施方法</h5>
                            <ul class="rec-detail-list">
                                ${details.implementation.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="rec-detail-section">
                            <h5 class="rec-detail-title">🎯 预期效果</h5>
                            <p class="rec-expected-effect">${details.expectedEffect || rec.content || '坚持实施后会有明显改善'}</p>
                        </div>
                        
                        <div class="rec-detail-section">
                            <h5 class="rec-detail-title">⚠️ 注意事项</h5>
                            <ul class="rec-detail-list precautions">
                                ${details.precautions.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="report-section recommendations-section">
            <div class="section-header">
                <h3>💡 个性化健康建议</h3>
            </div>
            <div class="recommendations-list">
                ${recCards}
            </div>
            
            <div class="medical-disclaimer">
                <div class="disclaimer-icon">⚕️</div>
                <div class="disclaimer-content">
                    <h4>专业医疗提示</h4>
                    <p>如需获取更全面、专业的健康分析及定制化干预方案，建议咨询专业医疗机构获取详细健康报告。本应用提供的健康建议仅供参考，不能替代专业医疗诊断和治疗。</p>
                </div>
            </div>
        </div>
    `;
}

function renderReportChart(visualData) {
    const canvas = document.getElementById('report-trend-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    
    if (currentChart) {
        currentChart.destroy();
    }

    const datasets = visualData.chartData
        .filter(chart => chart.data.length > 0)
        .map(chart => ({
            label: chart.name,
            data: chart.data.map(d => d.value),
            borderColor: chart.color,
            backgroundColor: `${chart.color}20`,
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
            yAxisID: `y-${chart.id}`
        }));

    const yAxisConfig = {};
    visualData.chartData
        .filter(chart => chart.data.length > 0)
        .forEach(chart => {
            yAxisConfig[`y-${chart.id}`] = {
                type: 'linear',
                display: true,
                position: datasets.length > 1 ? (Object.keys(yAxisConfig).length % 2 === 0 ? 'left' : 'right') : 'left',
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                    drawOnChartArea: Object.keys(yAxisConfig).length === 0
                },
                ticks: {
                    color: chart.color
                },
                title: {
                    display: datasets.length > 1,
                    text: chart.unit,
                    color: chart.color
                }
            };
        });

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: visualData.labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                ...yAxisConfig
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function formatDateTime(date) {
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function addStyles() {
    if (document.getElementById('health-report-styles')) return;

    const style = document.createElement('style');
    style.id = 'health-report-styles';
    style.textContent = `
        .health-report-wrapper {
            width: 100%;
            margin-top: 24px;
        }

        .health-report-section {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }

        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #f0f0f0;
        }

        .header-left h2 {
            margin: 0 0 8px 0;
            font-size: 24px;
            color: #1a1a1a;
        }

        .report-subtitle {
            margin: 0;
            font-size: 14px;
            color: #666;
        }

        .generated-time {
            margin-left: 12px;
            color: #888;
            font-size: 13px;
        }

        .header-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 12px;
        }

        .time-range-selector {
            display: flex;
            gap: 4px;
        }

        .time-range-btn {
            padding: 6px 12px;
            border: 1px solid #e0e0e0;
            background: white;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            color: #333;
        }

        .time-range-btn:hover {
            background: #f5f5f5;
        }

        .time-range-btn.active {
            background: #007AFF;
            color: white;
            border-color: #007AFF;
        }

        .report-actions {
            display: flex;
            gap: 8px;
        }

        .report-action-btn {
            padding: 8px 16px;
            border: 1px solid #e0e0e0;
            background: white;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            color: #333;
        }

        .report-action-btn:hover:not(:disabled) {
            background: #f5f5f5;
            transform: translateY(-1px);
        }

        .report-action-btn.primary {
            background: #007AFF;
            color: white;
            border-color: #007AFF;
        }

        .report-action-btn.primary:hover:not(:disabled) {
            background: #0056CC;
        }

        .report-action-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .report-loading,
        .report-error {
            text-align: center;
            padding: 60px 20px;
        }

        .report-loading p,
        .report-error p {
            color: #666;
            margin-top: 16px;
        }

        .report-error h3 {
            margin: 16px 0 8px 0;
            color: #1a1a1a;
        }

        .error-icon {
            font-size: 48px;
        }

        .spinner-small {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-top-color: currentColor;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        .spinner-large {
            width: 48px;
            height: 48px;
            border: 3px solid #f0f0f0;
            border-top-color: #007AFF;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .report-section {
            margin-bottom: 24px;
        }

        .report-section:last-child {
            margin-bottom: 0;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .section-header h3 {
            margin: 0;
            font-size: 18px;
            color: #1a1a1a;
        }

        .risk-count {
            font-size: 14px;
            color: #666;
        }

        .overview-content {
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: 24px;
        }

        .score-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border-radius: 12px;
        }

        .score-circle {
            width: 140px;
            height: 140px;
            border: 6px solid;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
        }

        .score-value {
            font-size: 42px;
            font-weight: 700;
            color: #1a1a1a;
            line-height: 1;
        }

        .score-label {
            font-size: 14px;
            color: #666;
            margin-top: 4px;
        }

        .score-status {
            font-size: 18px;
            font-weight: 600;
        }

        .summary-card {
            padding: 24px;
            background: #f8f9fa;
            border-radius: 12px;
        }

        .summary-card h4 {
            margin: 0 0 12px 0;
            font-size: 16px;
            color: #1a1a1a;
        }

        .summary-card p {
            margin: 0 0 16px 0;
            font-size: 15px;
            line-height: 1.6;
            color: #333;
        }

        .metadata-info {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
        }

        .metadata-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #666;
        }

        .metadata-item.warning {
            color: #FF9500;
        }

        .trends-chart-container {
            background: #fafafa;
            border-radius: 12px;
            padding: 20px;
            height: 320px;
            margin-bottom: 20px;
        }

        .trends-cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 16px;
        }

        .trend-card {
            background: white;
            border: 1px solid #f0f0f0;
            border-radius: 12px;
            padding: 16px;
            transition: all 0.2s;
        }

        .trend-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            transform: translateY(-2px);
        }

        .trend-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .trend-indicator-info {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .indicator-color-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        .trend-indicator-name {
            font-weight: 600;
            color: #1a1a1a;
        }

        .trend-direction {
            font-size: 20px;
        }

        .trend-value-main {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 12px;
        }

        .trend-value-main .value {
            font-size: 28px;
            font-weight: 700;
            color: #1a1a1a;
        }

        .trend-value-main .unit {
            font-size: 14px;
            color: #666;
        }

        .trend-status {
            font-size: 14px;
            font-weight: 500;
            margin-left: auto;
        }

        .trend-stats {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
        }

        .normal-range {
            font-size: 12px;
            color: #888;
            padding-top: 8px;
            border-top: 1px solid #f0f0f0;
        }

        .risks-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .risk-card {
            display: flex;
            gap: 16px;
            padding: 16px;
            background: #fff;
            border: 1px solid #f0f0f0;
            border-radius: 12px;
            animation: fadeInUp 0.4s ease-out both;
        }

        .risk-level-badge {
            flex-shrink: 0;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            height: fit-content;
        }

        .risk-content h4 {
            margin: 0 0 6px 0;
            font-size: 15px;
            color: #1a1a1a;
        }

        .risk-content p {
            margin: 0;
            font-size: 14px;
            color: #555;
            line-height: 1.5;
        }

        .no-risks {
            text-align: center;
            padding: 40px 20px;
        }

        .success-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }

        .no-risks p {
            margin: 0;
            color: #34C759;
            font-size: 15px;
        }

        .recommendations-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .recommendation-card {
            display: flex;
            gap: 16px;
            padding: 20px;
            background: white;
            border: 1px solid #f0f0f0;
            border-radius: 12px;
            animation: fadeInUp 0.4s ease-out both;
        }

        .rec-icon {
            flex-shrink: 0;
            font-size: 36px;
        }

        .rec-content {
            flex: 1;
        }

        .rec-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            gap: 12px;
        }

        .rec-header h4 {
            margin: 0;
            font-size: 16px;
            color: #1a1a1a;
            font-weight: 600;
        }

        .rec-priority {
            flex-shrink: 0;
            padding: 5px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
        }

        .rec-details {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .rec-detail-section {
            background: #f8f9fa;
            padding: 14px 16px;
            border-radius: 10px;
        }

        .rec-detail-title {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #1a1a1a;
            font-weight: 600;
        }

        .rec-detail-list {
            margin: 0;
            padding-left: 20px;
            list-style-type: disc;
        }

        .rec-detail-list li {
            margin-bottom: 6px;
            font-size: 13px;
            color: #555;
            line-height: 1.5;
        }

        .rec-detail-list li:last-child {
            margin-bottom: 0;
        }

        .rec-detail-list.precautions li {
            color: #FF9500;
        }

        .rec-expected-effect {
            margin: 0;
            font-size: 14px;
            color: #34C759;
            line-height: 1.5;
            font-weight: 500;
        }

        .medical-disclaimer {
            margin-top: 24px;
            padding: 20px;
            background: linear-gradient(135deg, #FFF8E7 0%, #FFFDF9 100%);
            border: 1px solid #FFE0B2;
            border-radius: 12px;
            display: flex;
            gap: 16px;
            align-items: flex-start;
        }

        .disclaimer-icon {
            flex-shrink: 0;
            font-size: 40px;
        }

        .disclaimer-content h4 {
            margin: 0 0 8px 0;
            font-size: 16px;
            color: #E65100;
            font-weight: 600;
        }

        .disclaimer-content p {
            margin: 0;
            font-size: 14px;
            color: #5D4037;
            line-height: 1.6;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (max-width: 768px) {
            .report-header {
                flex-direction: column;
            }

            .header-right {
                align-items: flex-start;
                width: 100%;
            }

            .time-range-selector,
            .report-actions {
                width: 100%;
                flex-wrap: wrap;
            }

            .overview-content {
                grid-template-columns: 1fr;
            }

            .trends-cards-grid {
                grid-template-columns: 1fr;
            }

            .trends-chart-container {
                height: 280px;
            }
        }
    `;
    document.head.appendChild(style);
}

export function initHealthReport() {
    renderHealthReport();
}
