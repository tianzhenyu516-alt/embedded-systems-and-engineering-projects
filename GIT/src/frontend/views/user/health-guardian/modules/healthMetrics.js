// 健康数据展示模块 - 实时同步版本
import { healthDataManager, HEALTH_INDICATORS, DATA_SOURCES } from './healthDataManager.js';

export function formatBloodPressure(indicators = {}) {
    const systolic = indicators.bloodPressureSystolic;
    const diastolic = indicators.bloodPressureDiastolic;
    return systolic && diastolic ? `${systolic}/${diastolic}` : '--';
}

// 从全局获取 realTimeDataSync，因为它已在 HTML 中预先加载
const realTimeDataSync = window.realTimeDataSync;

// 运动类型数据
const SPORT_TYPES = {
    walking: { name: '步行', icon: '🚶', color: '#4CAF50' },
    running: { name: '跑步', icon: '🏃', color: '#2196F3' },
    cycling: { name: '骑行', icon: '🚴', color: '#FF9800' },
    swimming: { name: '游泳', icon: '🏊', color: '#00BCD4' },
    all: { name: '全部', icon: '📊', color: '#9C27B0' },
};

// 从 healthDataManager 获取运动时长记录数据
function getExerciseRecordsFromManager() {
    const allData = healthDataManager.getData();
    const exerciseRecords = [];
    
    allData.forEach(record => {
        if (record.indicators.steps !== undefined) {
            exerciseRecords.push({
                id: record.id,
                type: record.metadata?.exerciseType || 'walking',
                date: record.date,
                time: record.time,
                duration: Number(record.indicators.steps),
                distance: '--',
                calories: '--',
                steps: Number(record.indicators.steps),
                notes: record.notes || '',
            });
        }
    });
    
    // 按时间倒序排列，最新的在前面
    exerciseRecords.sort((a, b) => {
        if (a.date !== b.date) {
            return new Date(b.date) - new Date(a.date);
        }
        return b.time.localeCompare(a.time);
    });
    
    return exerciseRecords;
}

// 当前选中的运动类型
let currentSportType = 'all';

// 获取最新的健康数据
export function getTodayLatestData() {
    const allData = healthDataManager.getData();
    
    if (allData.length === 0) {
        return null;
    }
    
    // 按时间倒序排列所有数据
    allData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 合并所有指标的最新值
    const latestData = {
        timestamp: allData[0].timestamp,
        date: allData[0].date,
        time: allData[0].time,
        indicators: {}
    };
    
    // 遍历所有数据，收集每个指标的最新值
    Object.values(HEALTH_INDICATORS).forEach(indicator => {
        // 由于数据已经按时间倒序排列，find会返回最新的记录
        const latestRecord = allData.find(record => 
            record.indicators[indicator.id] !== undefined
        );
        if (latestRecord) {
            latestData.indicators[indicator.id] = latestRecord.indicators[indicator.id];
        }
    });
    
    return latestData;
}

// 获取健康状态文本
function getHealthStatus(value, indicator) {
    if (value >= indicator.normalMin && value <= indicator.normalMax) {
        return { status: 'normal', text: '正常' };
    } else if (value < indicator.normalMin) {
        return { status: 'low', text: '偏低' };
    } else {
        return { status: 'high', text: '偏高' };
    }
}

// 渲染健康指标卡片
export function renderHealthMetrics() {
    const homePage = document.getElementById('home-page');
    if (!homePage) {
        console.error('Home page element not found');
        return;
    }

    let metricsContainer = document.getElementById('health-metrics');
    if (!metricsContainer) {
        metricsContainer = document.createElement('div');
        metricsContainer.id = 'health-metrics';
        metricsContainer.className = 'health-metrics-container';
        homePage.appendChild(metricsContainer);
    }

    // 获取当天最新数据
    const todayData = getTodayLatestData();
    
    // 模拟设备连接状态
    const isDeviceConnected = false;

    let metricsContent = '';

    // 同步状态指示器
    metricsContent += `
        <div class="sync-status-bar" id="home-sync-status">
            <span class="sync-dot"></span>
            <span class="sync-text">同步中</span>
            <span class="sync-time" id="sync-time"></span>
        </div>
    `;

    // 设备连接提示
    if (!isDeviceConnected) {
        metricsContent += `
            <div class="device-connection-alert">
                <div class="alert-icon">📱</div>
                <div class="alert-content">
                    <h3>未检测到连接设备</h3>
                    <p>请连接智能设备以自动获取健康数据</p>
                    <button class="connect-device-btn">连接设备</button>
                </div>
            </div>
        `;
    }

    // 添加统一的手动记录按钮
    metricsContent += `
        <div class="record-controls">
            <button id="record-button" class="record-button">
                手动记录
            </button>
        </div>
    `;

    // 健康数据卡片
    metricsContent += '<div class="health-cards-grid">';
    
    // 心率
    const heartRateData = todayData?.indicators.heartRate;
    const heartRateStatus = heartRateData ? 
        getHealthStatus(heartRateData, HEALTH_INDICATORS.HEART_RATE) : 
        { status: 'normal', text: '正常' };
    
    metricsContent += `
        <div class="health-card" data-metric="heartRate">
            <div class="card-header">
                <span class="metric-icon">❤️</span>
                <h3>心率</h3>
            </div>
            <div class="card-body">
                <div class="metric-value">
                    <span class="value" data-old-value="${heartRateData || ''}">${heartRateData || '--'}</span>
                    <span class="unit">bpm</span>
                </div>
                <div class="metric-status" data-status="${heartRateStatus.status}">
                    ${heartRateStatus.text}
                </div>
                <div class="metric-time">
                    记录时间: ${todayData ? todayData.date + ' ' + todayData.time : '暂无记录'}
                </div>
            </div>
        </div>
    `;
    
    // 收缩压
    const systolicData = todayData?.indicators.bloodPressureSystolic;
    const systolicStatus = systolicData ? 
        getHealthStatus(systolicData, HEALTH_INDICATORS.BLOOD_PRESSURE_SYSTOLIC) : 
        { status: 'normal', text: '正常' };
    
    metricsContent += `
        <div class="health-card" data-metric="bloodPressureSystolic">
            <div class="card-header">
                <span class="metric-icon">🩸</span>
                <h3>收缩压</h3>
            </div>
            <div class="card-body">
                <div class="metric-value">
                    <span class="value" data-old-value="${systolicData || ''}">${systolicData || '--'}</span>
                    <span class="unit">mmHg</span>
                </div>
                <div class="metric-status" data-status="${systolicStatus.status}">
                    ${systolicStatus.text}
                </div>
                <div class="metric-time">
                    记录时间: ${todayData ? todayData.date + ' ' + todayData.time : '暂无记录'}
                </div>
            </div>
        </div>
    `;

    // 舒张压
    const diastolicData = todayData?.indicators.bloodPressureDiastolic;
    const diastolicStatus = diastolicData ? 
        getHealthStatus(diastolicData, HEALTH_INDICATORS.BLOOD_PRESSURE_DIASTOLIC) : 
        { status: 'normal', text: '正常' };
    
    metricsContent += `
        <div class="health-card" data-metric="bloodPressureDiastolic">
            <div class="card-header">
                <span class="metric-icon">🩸</span>
                <h3>舒张压</h3>
            </div>
            <div class="card-body">
                <div class="metric-value">
                    <span class="value" data-old-value="${diastolicData || ''}">${diastolicData || '--'}</span>
                    <span class="unit">mmHg</span>
                </div>
                <div class="metric-status" data-status="${diastolicStatus.status}">
                    ${diastolicStatus.text}
                </div>
                <div class="metric-time">
                    记录时间: ${todayData ? todayData.date + ' ' + todayData.time : '暂无记录'}
                </div>
            </div>
        </div>
    `;
    
    // 睡眠时长
    const sleepHoursData = todayData?.indicators.sleepHours;
    const sleepHoursStatus = sleepHoursData ? 
        getHealthStatus(sleepHoursData, HEALTH_INDICATORS.SLEEP_HOURS) : 
        { status: 'normal', text: '正常' };
    
    metricsContent += `
        <div class="health-card" data-metric="sleepHours">
            <div class="card-header">
                <span class="metric-icon">😴</span>
                <h3>睡眠时长</h3>
            </div>
            <div class="card-body">
                <div class="metric-value">
                    <span class="value" data-old-value="${sleepHoursData || ''}">${sleepHoursData || '--'}</span>
                    <span class="unit">小时</span>
                </div>
                <div class="metric-status" data-status="${sleepHoursStatus.status}">
                    ${sleepHoursStatus.text}
                </div>
                <div class="metric-time">
                    记录时间: ${todayData ? todayData.date + ' ' + todayData.time : '暂无记录'}
                </div>
            </div>
        </div>
    `;

    // 运动时长记录
    const stepsData = todayData?.indicators.steps;
    const exerciseMinutesData = stepsData ?? null;
    const stepsStatus = stepsData != null 
        ? getHealthStatus(stepsData, HEALTH_INDICATORS.STEPS) : 
        { status: 'normal', text: '正常' };

    metricsContent += `
        <div class="health-card exercise-card" data-metric="steps">
            <div class="card-header">
                <span class="metric-icon">🏃</span>
                <h3>今日运动时长</h3>
            </div>
            <div class="card-body">
                <div class="metric-value">
                    <span class="value" data-old-value="${stepsData ?? ''}">${exerciseMinutesData ?? '--'}</span>
                    <span class="unit">分钟</span>
                </div>
                <div class="metric-status" data-status="${stepsStatus.status}">
                    ${stepsStatus.text}
                </div>
                <div class="metric-time">
                    记录时间: ${todayData ? todayData.date + ' ' + todayData.time : '暂无记录'}
                </div>
                <div class="exercise-card-content">
                    ${renderSportTypeFilterInline()}
                    ${renderExerciseRecordsInline()}
                </div>
            </div>
        </div>
    `;

    metricsContent += '</div>';

    metricsContainer.innerHTML = metricsContent;

    // 直接在这里添加事件监听器，确保它能够工作
    const recordButton = document.getElementById('record-button');
    if (recordButton) {
        recordButton.addEventListener('click', () => {
            console.log('Record button clicked directly!');
            showUnifiedRecordForm();
        });
        console.log('Record button event listener added directly');
    } else {
        console.error('Record button not found!');
    }

    addMetricsEventListeners();
    addHealthCardAnimations();
    updateHomeSyncStatus();
    console.log('Health metrics rendered successfully');
}

// 渲染内联运动类型筛选器
function renderSportTypeFilterInline() {
    return `
        <div class="sport-type-filter-inline">
            <div class="filter-buttons-inline">
                ${Object.entries(SPORT_TYPES)
        .map(
            ([type, info]) => `
                    <button class="sport-filter-btn-inline ${currentSportType === type ? 'active' : ''}" 
                            data-sport-type="${type}"
                            title="${info.name}">
                        ${info.icon}
                    </button>
                `,
        )
        .join('')}
            </div>
        </div>
    `;
}

// 渲染内联运动记录
function renderExerciseRecordsInline() {
    const exerciseRecords = getExerciseRecordsFromManager();
    let filteredRecords = exerciseRecords;

    if (currentSportType !== 'all') {
        filteredRecords = exerciseRecords.filter(record => record.type === currentSportType);
    }

    if (filteredRecords.length === 0) {
        return `
            <div class="no-records-inline">
                暂无运动记录
            </div>
        `;
    }

    return `
        <div class="exercise-records-inline">
            ${filteredRecords
        .slice(0, 3)
        .map(record => renderExerciseRecordInline(record))
        .join('')}
        </div>
    `;
}

// 渲染单个内联运动记录
function renderExerciseRecordInline(record) {
    const sportInfo = SPORT_TYPES[record.type];
    return `
        <div class="exercise-record-inline">
            <div class="record-type-inline">
                <span class="record-icon-inline">${sportInfo.icon}</span>
                <span class="record-info-inline">
                    <span class="record-date-inline">${record.date} ${record.time}</span>
                    <span class="record-details-inline">${record.duration}分钟</span>
                </span>
            </div>
        </div>
    `;
}

// 更新内联运动记录展示
function updateExerciseRecordsInlineDisplay() {
    const recordsContainer = document.querySelector('.exercise-card-content');
    if (recordsContainer) {
        recordsContainer.innerHTML = renderSportTypeFilterInline() + renderExerciseRecordsInline();
        addInlineSportFilterEventListeners();
    }
}

// 切换运动类型筛选
function toggleSportTypeFilter(sportType) {
    currentSportType = sportType;

    document.querySelectorAll('.sport-filter-btn, .sport-filter-btn-inline').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sportType === sportType);
    });

    updateExerciseRecordsInlineDisplay();
}

// 添加内联运动筛选按钮事件监听器
function addInlineSportFilterEventListeners() {
    const inlineSportFilterButtons = document.querySelectorAll('.sport-filter-btn-inline');
    inlineSportFilterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const sportType = btn.dataset.sportType;
            toggleSportTypeFilter(sportType);
        });
    });
}

// 添加健康数据模块的事件监听
function addMetricsEventListeners() {
    const connectDeviceBtn = document.querySelector('.connect-device-btn');
    if (connectDeviceBtn) {
        connectDeviceBtn.addEventListener('click', () => {
            window.location.href = 'device-connection.html';
        });
    }

    // 使用事件委托来确保手动记录按钮的点击事件能够被捕获
    document.addEventListener('click', (e) => {
        if (e.target.id === 'record-button' || e.target.closest('#record-button')) {
            showUnifiedRecordForm();
        }
    });

    addInlineSportFilterEventListeners();
}

// 显示统一记录模态框
export function showUnifiedRecordForm() {
    console.log('showUnifiedRecordForm called!');
    
    // 先移除已存在的模态框
    let existingModal = document.getElementById('unified-record-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = createUnifiedRecordModal();
    console.log('Modal created:', modal);
    
    // 设置ID
    modal.id = 'unified-record-modal';
    
    // 添加 show 类
    modal.classList.add('show');
    
    // 确保模态框可见的内联样式，覆盖所有可能的隐藏样式
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '999999';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.backgroundColor = '#ffffff';
        modalContent.style.borderRadius = '12px';
        modalContent.style.width = '90%';
        modalContent.style.maxWidth = '400px';
        modalContent.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)';
        modalContent.style.padding = '24px';
        modalContent.style.transform = 'scale(1) translateY(0)';
        modalContent.style.opacity = '1';
    }
    
    document.body.appendChild(modal);
    console.log('Modal appended to body');
    console.log('Modal classes:', modal.className);
    console.log('Modal display:', modal.style.display);
    console.log('Modal opacity:', modal.style.opacity);
    console.log('Modal visibility:', modal.style.visibility);

    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const saveBtn = modal.querySelector('.save-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (validateUnifiedForm(modal)) {
                saveUnifiedRecord(modal);
                modal.remove();
            }
        });
    }

    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}



// 创建统一记录模态对话框
function createUnifiedRecordModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>统一记录健康数据</h3>
                <button class="modal-close">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="unified-heart-rate">心率 (bpm)</label>
                    <input type="number" id="unified-heart-rate" min="40" max="200" placeholder="75">
                    <span class="error-message" id="unified-heart-rate-error"></span>
                </div>
                <div class="form-group">
                    <label for="unified-blood-pressure-systolic">收缩压 (mmHg)</label>
                    <input type="number" id="unified-blood-pressure-systolic" min="70" max="220" placeholder="120">
                    <span class="error-message" id="unified-blood-pressure-systolic-error"></span>
                </div>
                <div class="form-group">
                    <label for="unified-blood-pressure-diastolic">舒张压 (mmHg)</label>
                    <input type="number" id="unified-blood-pressure-diastolic" min="40" max="140" placeholder="80">
                    <span class="error-message" id="unified-blood-pressure-diastolic-error"></span>
                </div>
                <div class="form-group">
                    <label for="unified-sleep-hours">睡眠时长 (小时)</label>
                    <input type="number" id="unified-sleep-hours" min="0" max="24" step="0.1" placeholder="7.5">
                    <span class="error-message" id="unified-sleep-hours-error"></span>
                </div>
                <div class="form-group">
                    <label for="unified-exercise-type">运动类型</label>
                    <select id="unified-exercise-type">
                        <option value="">请选择运动类型</option>
                        ${Object.entries(SPORT_TYPES)
                            .filter(([type]) => type !== 'all')
                            .map(([type, info]) => `<option value="${type}">${info.icon} ${info.name}</option>`)
                            .join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="unified-exercise-minutes">运动时长 (分钟)</label>
                    <input type="number" id="unified-exercise-minutes" min="0" max="720" placeholder="86">
                    <span class="error-message" id="unified-exercise-minutes-error"></span>
                </div>
            </div>
            <div class="modal-footer">
                <button class="cancel-btn">取消</button>
                <button class="save-btn">保存</button>
            </div>
        </div>
    `;
    return modal;
}

// 验证统一表单输入
function validateUnifiedForm(modal) {
    let isValid = true;
    const errorMessages = modal.querySelectorAll('.error-message');
    errorMessages.forEach(msg => (msg.textContent = ''));

    const heartRateValue = modal.querySelector('#unified-heart-rate').value;
    if (heartRateValue && (heartRateValue < 40 || heartRateValue > 200)) {
        modal.querySelector('#unified-heart-rate-error').textContent = '请输入有效的心率值 (40-200 bpm)';
        isValid = false;
    }

    const systolicValue = modal.querySelector('#unified-blood-pressure-systolic').value;
    if (systolicValue && (systolicValue < 70 || systolicValue > 220)) {
        modal.querySelector('#unified-blood-pressure-systolic-error').textContent = '请输入有效的收缩压值 (70-220 mmHg)';
        isValid = false;
    }

    const diastolicValue = modal.querySelector('#unified-blood-pressure-diastolic').value;
    if (diastolicValue && (diastolicValue < 40 || diastolicValue > 140)) {
        modal.querySelector('#unified-blood-pressure-diastolic-error').textContent = '请输入有效的舒张压值 (40-140 mmHg)';
        isValid = false;
    }

    if (systolicValue && diastolicValue && Number(systolicValue) <= Number(diastolicValue)) {
        modal.querySelector('#unified-blood-pressure-diastolic-error').textContent = '收缩压应大于舒张压';
        isValid = false;
    }

    const sleepHoursValue = modal.querySelector('#unified-sleep-hours').value;
    if (sleepHoursValue && (sleepHoursValue < 0 || sleepHoursValue > 24)) {
        modal.querySelector('#unified-sleep-hours-error').textContent = '请输入有效的睡眠时长 (0-24 小时)';
        isValid = false;
    }

    const exerciseMinutesValue = modal.querySelector('#unified-exercise-minutes').value;
    if (exerciseMinutesValue && (exerciseMinutesValue < 0 || exerciseMinutesValue > 720)) {
        modal.querySelector('#unified-exercise-minutes-error').textContent = '请输入有效的运动时长 (0-720 分钟)';
        isValid = false;
    }

    return isValid;
}

// 保存统一记录
function saveUnifiedRecord(modal) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const record = {
        timestamp: now.toISOString(),
        date: dateStr,
        time: timeStr,
        indicators: {},
        notes: '手动记录'
    };

    const heartRateValue = modal.querySelector('#unified-heart-rate').value;
    if (heartRateValue) {
        record.indicators.heartRate = parseInt(heartRateValue);
    }

    const systolicValue = modal.querySelector('#unified-blood-pressure-systolic').value;
    if (systolicValue) {
        record.indicators.bloodPressureSystolic = parseInt(systolicValue);
    }

    const diastolicValue = modal.querySelector('#unified-blood-pressure-diastolic').value;
    if (diastolicValue) {
        record.indicators.bloodPressureDiastolic = parseInt(diastolicValue);
    }

    const sleepHoursValue = modal.querySelector('#unified-sleep-hours').value;
    if (sleepHoursValue) {
        record.indicators.sleepHours = parseFloat(sleepHoursValue);
    }

    const exerciseType = modal.querySelector('#unified-exercise-type').value;
    const exerciseMinutesValue = modal.querySelector('#unified-exercise-minutes').value;
    if (exerciseType) {
        record.metadata = {
            ...(record.metadata || {}),
            exerciseType,
        };
    }
    if (exerciseMinutesValue) {
        record.indicators.steps = parseFloat(exerciseMinutesValue);
    }

    if (Object.keys(record.indicators).length > 0) {
        healthDataManager.addData(record, DATA_SOURCES.MANUAL);
        console.log('保存健康记录:', record);
        
        Object.entries(record.indicators).forEach(([metricId, value]) => {
            realTimeDataSync.syncMetricUpdate(metricId, value, Date.now());
        });
        realTimeDataSync.syncHealthDataUpdate(getTodayLatestData());
        renderHealthMetrics();
    }
}

// 更新首页同步状态指示器
function updateHomeSyncStatus() {
    const indicator = document.getElementById('home-sync-status');
    if (!indicator) return;

    const syncState = realTimeDataSync.getSyncState();
    
    indicator.classList.remove('syncing', 'synced', 'error');
    
    if (syncState.error) {
        indicator.classList.add('error');
        indicator.querySelector('.sync-text').textContent = '同步失败';
    } else if (syncState.lastSync && Date.now() - syncState.lastSync < 5000) {
        indicator.classList.add('synced');
        indicator.querySelector('.sync-text').textContent = '已同步';
    } else {
        indicator.classList.add('syncing');
        indicator.querySelector('.sync-text').textContent = '同步中';
    }

    const syncTimeEl = document.getElementById('sync-time');
    if (syncTimeEl && syncState.lastSync) {
        const date = new Date(syncState.lastSync);
        syncTimeEl.textContent = date.toLocaleTimeString('zh-CN');
    }
}

// 为健康卡片添加动画更新功能
function updateHealthCardMetric(metricId, newValue) {
    const healthCard = document.querySelector(`.health-card[data-metric="${metricId}"]`);
    if (!healthCard) return;

    const valueElement = healthCard.querySelector('.value');
    const oldValue = valueElement.dataset.oldValue;

    if (oldValue === String(newValue)) return;

    valueElement.classList.add('updating');
    valueElement.dataset.oldValue = newValue;

    setTimeout(() => {
        const displayValue = metricId === 'steps' && newValue != null
            ? newValue
            : (newValue || '--');

        valueElement.textContent = displayValue;
        valueElement.classList.remove('updating');
        valueElement.classList.add('updated');
        
        setTimeout(() => {
            valueElement.classList.remove('updated');
        }, 300);
    }, 150);
}

// 添加健康卡片动画样式
function addHealthCardAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        .sync-status-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            padding: 8px 16px;
            border-radius: 8px;
            background: #f5f5f5;
            margin-bottom: 16px;
        }
        
        .sync-status-bar.syncing {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .sync-status-bar.synced {
            background: #e8f5e9;
            color: #388e3c;
        }
        
        .sync-status-bar.error {
            background: #ffebee;
            color: #d32f2f;
        }
        
        .sync-status-bar .sync-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #9e9e9e;
        }
        
        .sync-status-bar.syncing .sync-dot {
            animation: blink 1s infinite;
            background: #1976d2;
        }
        
        .sync-status-bar.synced .sync-dot {
            background: #388e3c;
        }
        
        .sync-status-bar.error .sync-dot {
            background: #d32f2f;
        }
        
        .sync-status-bar .sync-time {
            margin-left: auto;
            opacity: 0.7;
        }
        
        .health-card .value.updating {
            opacity: 0.5;
            transform: scale(0.95);
            transition: all 0.3s ease;
        }
        
        .health-card .value.updated {
            animation: pulse 0.3s ease;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    
    if (!document.getElementById('health-card-animations')) {
        style.id = 'health-card-animations';
        document.head.appendChild(style);
    }
}

// 订阅实时同步消息
function subscribeToRealTimeSync() {
    realTimeDataSync.subscribe((data) => {
        updateHomeSyncStatus();
        
        if (data.type === 'METRIC_UPDATED') {
            const { metricId, value } = data.payload;
            updateHealthCardMetric(metricId, value);
        } else if (data.type === 'HEALTH_DATA_UPDATED') {
            renderHealthMetrics();
        }
    });
}

// 订阅数据变更，实时更新健康卡片
export function subscribeToDataChanges() {
    healthDataManager.subscribe(() => {
        renderHealthMetrics();
    });
}

// 将 showUnifiedRecordForm 函数暴露到全局作用域，以便内联 onclick 事件可以调用
if (typeof window !== 'undefined') {
    window.showUnifiedRecordForm = showUnifiedRecordForm;
}
