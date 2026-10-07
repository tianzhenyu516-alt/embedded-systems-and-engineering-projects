// 管理员后台核心脚本

// Toast 通知系统
const TOAST_ICONS = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle',
};

function showToast(message, type = 'info', title = '', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${TOAST_ICONS[type]} toast-icon"></i>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// 便捷方法
function showSuccessToast(message, title = '成功') {
    showToast(message, 'success', title);
}

function showErrorToast(message, title = '错误') {
    showToast(message, 'error', title);
}

function showWarningToast(message, title = '警告') {
    showToast(message, 'warning', title);
}

function showInfoToast(message, title = '提示') {
    showToast(message, 'info', title);
}

/*
旧逻辑已停用：
- createJsonpRequest
- window.fetchWithCORSProxy（旧多代理兜底版本）
这两段原本属于早期独立 API 监控/跨域测试方案。
当前独立 api-monitoring 页面已停用，后台正式流程未再引用此实现。
*/

// 权限定义
const ADMIN_PERMISSIONS = {
    all: '全部权限',
    dashboard: '仪表板查看',
    'smart-devices': '智能设备',
    ai: 'AI设置',
    'location-api': '地理位置API',
    users: '用户管理',
    'sub-admins': '副管理员管理',
    'auth-codes': '授权码管理',
    security: '安全设置',
    account: '账号管理',
};

// 省份列表
const PROVINCES = [
    '北京市',
    '天津市',
    '河北省',
    '山西省',
    '内蒙古自治区',
    '辽宁省',
    '吉林省',
    '黑龙江省',
    '上海市',
    '江苏省',
    '浙江省',
    '安徽省',
    '福建省',
    '江西省',
    '山东省',
    '河南省',
    '湖北省',
    '湖南省',
    '广东省',
    '广西壮族自治区',
    '海南省',
    '重庆市',
    '四川省',
    '贵州省',
    '云南省',
    '西藏自治区',
    '陕西省',
    '甘肃省',
    '青海省',
    '宁夏回族自治区',
    '新疆维吾尔自治区',
    '台湾省',
    '香港特别行政区',
    '澳门特别行政区',
];

// 从地址中提取省份
function extractProvinceFromAddress(address) {
    if (!address) {
        return null;
    }

    // 遍历省份列表，查找地址中是否包含省份名称
    for (const province of PROVINCES) {
        if (address.includes(province)) {
            return province;
        }
    }

    // 如果没找到完整省份名，尝试查找简称
    const provinceShortNames = {
        北京: '北京市',
        天津: '天津市',
        河北: '河北省',
        山西: '山西省',
        内蒙古: '内蒙古自治区',
        辽宁: '辽宁省',
        吉林: '吉林省',
        黑龙江: '黑龙江省',
        上海: '上海市',
        江苏: '江苏省',
        浙江: '浙江省',
        安徽: '安徽省',
        福建: '福建省',
        江西: '江西省',
        山东: '山东省',
        河南: '河南省',
        湖北: '湖北省',
        湖南: '湖南省',
        广东: '广东省',
        广西: '广西壮族自治区',
        海南: '海南省',
        重庆: '重庆市',
        四川: '四川省',
        贵州: '贵州省',
        云南: '云南省',
        西藏: '西藏自治区',
        陕西: '陕西省',
        甘肃: '甘肃省',
        青海: '青海省',
        宁夏: '宁夏回族自治区',
        新疆: '新疆维吾尔自治区',
        台湾: '台湾省',
        香港: '香港特别行政区',
        澳门: '澳门特别行政区',
    };

    for (const [short, full] of Object.entries(provinceShortNames)) {
        if (address.includes(short)) {
            return full;
        }
    }

    return null;
}

// 全局构建信息
const ADMIN_BUILD_VERSION = '2025-11-24-1';

// 全局配置
const ADMIN_CONFIG = {
    // API配置（从主应用加载）
    apiConfig: null,

    // 存储键名
    STORAGE_KEYS: {
        ADMIN_TOKEN: '',
        USER_DATA: 'admin_user_data',
        SETTINGS: 'admin_settings',
    },
};

// 页面访问控制
const UNIVERSAL_ADMIN_PAGES = new Set(['account']);
const PAGE_ACCESS_RULES = {
    admin: new Set(['dashboard', 'smart-devices', 'ai', 'location-api', 'sub-admins', 'account']),
    sub: new Set(['account']),
};
const DEFAULT_PAGE_BY_ROLE = { admin: 'dashboard', sub: 'account' };

function normalizePageId(pageId) {
    if (!pageId && pageId !== 0) {
        return '';
    }
    return String(pageId).replace(/^#/, '').trim();
}

function getDefaultPageByRole(role) {
    return DEFAULT_PAGE_BY_ROLE[role] || 'dashboard';
}

function isPageAllowedForRole(role, pageId) {
    const normalized = normalizePageId(pageId);
    if (!normalized) {
        return false;
    }
    if (UNIVERSAL_ADMIN_PAGES.has(normalized)) {
        return true;
    }
    const allowedSet = PAGE_ACCESS_RULES[role];
    return allowedSet ? allowedSet.has(normalized) : false;
}

// 检查当前管理员角色和权限
function getCurrentAdminInfo() {
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        if (loginInfo && loginInfo.user) {
            const username = loginInfo.user.username || loginInfo.username || 'admin';
            const backendRole = loginInfo.user.role || loginInfo.role || 'admin';
            const role = backendRole === 'sub' ? 'sub' : 'admin';
            const permissions = Array.isArray(loginInfo.user.permissions)
                ? loginInfo.user.permissions
                : role === 'admin'
                    ? ['all']
                    : ['account'];
            return {
                username,
                role,
                permissions: role === 'admin' ? ['all'] : permissions,
                province: loginInfo.user.province || null,
            };
        }

        const username = loginInfo.username || 'admin';
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        const adminAccount = accounts.admin?.find(acc => acc.username === username);
        if (adminAccount) {
            const normalizedRole = adminAccount.role === 'sub' ? 'sub' : 'admin';
            const normalizedPermissions = Array.isArray(adminAccount.permissions)
                ? adminAccount.permissions
                : [];
            return {
                username: adminAccount.username,
                role: normalizedRole,
                permissions: normalizedRole === 'admin' ? ['all'] : normalizedPermissions,
                province: adminAccount.province || null,
            };
        }

        return { username: 'admin', role: 'admin', permissions: ['all'], province: null };
    } catch (error) {
        console.error('获取管理员信息失败:', error);
        return { username: 'admin', role: 'admin', permissions: ['all'], province: null };
    }
}

// 检查权限
function hasPermission(permission) {
    const adminInfo = getCurrentAdminInfo();
    if (adminInfo.role === 'admin') {
        return true; // 主管理员拥有所有权限
    }
    return adminInfo.permissions.includes('all') || adminInfo.permissions.includes(permission);
}

// 检查是否是主管理员
function isMainAdmin() {
    return getCurrentAdminInfo().role === 'admin';
}

// 授权码管理
const authCodesState = {
    list: [],
    pagination: { page: 1, pageSize: 50, total: 0 },
    filters: { status: '', province: '' },
    stats: { total: 0, active: 0, revoked: 0 },
};

async function loadAuthCodesPage({ page, status } = {}) {
    const container = document.getElementById('auth-codes-page');
    if (!container) {
        return;
    }

    const adminInfo = getCurrentAdminInfo();

    if (typeof status !== 'undefined') {
        authCodesState.filters.status = status || '';
    }

    if (typeof page === 'number' && !Number.isNaN(page)) {
        authCodesState.pagination.page = page;
    }

    if (adminInfo.role === 'sub') {
        authCodesState.filters.province = adminInfo.province || '';
    }

    if (!window.apiService || typeof window.apiService.listAuthCodes !== 'function') {
        container.innerHTML = `
            <div class="content-card">
                <div class="card-body">
                    <div style="padding: 40px; text-align: center; color: #e74c3c;">
                        <i class="fas fa-plug" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
                        <p style="margin-bottom: 10px;">后端授权码接口不可用，请检查 APIService 配置</p>
                        <button class="btn btn-secondary" onclick="loadAuthCodesPage()">
                            <i class="fas fa-redo"></i> 重试
                        </button>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="content-card">
            <div class="card-body">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; color: #667eea;"></i>
                    <p style="margin-top: 15px; color: #7f8c8d;">正在加载授权码数据...</p>
                </div>
            </div>
        </div>
    `;

    const query = {
        page: authCodesState.pagination.page,
        pageSize: authCodesState.pagination.pageSize,
    };

    if (authCodesState.filters.status) {
        query.status = authCodesState.filters.status;
    }
    if (authCodesState.filters.province) {
        query.province = authCodesState.filters.province;
    }

    try {
        const promises = [window.apiService.listAuthCodes(query)];
        if (typeof window.apiService.getAuthCodeStats === 'function') {
            promises.push(window.apiService.getAuthCodeStats());
        }

        const [listResponse, statsResponse] = await Promise.all(promises);

        authCodesState.list = Array.isArray(listResponse?.list) ? listResponse.list : [];
        authCodesState.pagination.page = listResponse?.page ?? query.page ?? 1;
        authCodesState.pagination.pageSize
            = listResponse?.pageSize ?? query.pageSize ?? authCodesState.pagination.pageSize;
        authCodesState.pagination.total = listResponse?.total ?? authCodesState.list.length;

        const stats = statsResponse ?? {};
        authCodesState.stats = {
            total: stats.total ?? stats.totalCodes ?? authCodesState.pagination.total,
            active: stats.active ?? stats.activeCount ?? null,
            revoked: stats.revoked ?? stats.revokedCount ?? null,
        };

        renderAuthCodesPage(container, adminInfo);
    } catch (error) {
        console.error('[授权码管理] 加载失败:', error);
        container.innerHTML = `
            <div class="content-card">
                <div class="card-body">
                    <div style="padding: 40px; text-align: center; color: #e74c3c;">
                        <i class="fas fa-exclamation-circle" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
                        <p style="margin-bottom: 15px;">授权码数据加载失败：${error.message || '未知错误'}</p>
                        <button class="btn btn-secondary" onclick="loadAuthCodesPage()">
                            <i class="fas fa-redo"></i> 重试
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderAuthCodesPage(container, adminInfo) {
    const { list, pagination, filters, stats } = authCodesState;

    const statusOptions = [
        { value: '', label: '全部状态' },
        { value: 'active', label: '可用' },
        { value: 'revoked', label: '已作废' },
    ];

    const statusSelect = statusOptions
        .map(
            option => `
        <option value="${option.value}" ${filters.status === option.value ? 'selected' : ''}>${option.label}</option>
    `,
        )
        .join('');

    const provinceControl
        = adminInfo.role === 'admin'
            ? `
            <select id="auth-code-filter-province" class="form-input" onchange="updateAuthCodesProvinceFilter(this.value)">
                <option value="">全部省份</option>
                ${PROVINCES.map(p => `<option value="${p}" ${filters.province === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
        `
            : `
            <input type="text" class="form-input" value="${adminInfo.province || '未设置'}" readonly>
        `;

    const statCards = `
        <div class="auth-code-stats" style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px;">
            ${renderAuthCodeStatCard('总数', stats.total ?? '--')}
            ${renderAuthCodeStatCard('可用', stats.active ?? '--', '#27ae60')}
            ${renderAuthCodeStatCard('已作废', stats.revoked ?? '--', '#e74c3c')}
        </div>
    `;

    const listHtml
        = list.length === 0
            ? `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <i class="fas fa-key" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <p>暂无授权码</p>
                <p style="font-size: 0.9rem;">${adminInfo.role === 'sub' && adminInfo.province ? `当前管理省份：${adminInfo.province}` : '点击右上角按钮生成新的授权码'}</p>
            </div>
        `
            : list.map(renderAuthCodeItem).join('');

    const paginationHtml = renderAuthCodesPagination();

    container.innerHTML = `
        <div class="content-card">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <h3><i class="fas fa-key"></i> 授权码管理${adminInfo.role === 'sub' && adminInfo.province ? ` (${adminInfo.province})` : ''}</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn btn-secondary" onclick="reloadAuthCodes()" style="padding: 10px 20px;">
                        <i class="fas fa-rotate"></i> 刷新
                    </button>
                    <button class="btn btn-primary" onclick="generateNewAuthCode()" style="padding: 10px 20px;">
                        <i class="fas fa-plus"></i> 生成新授权码
                    </button>
                </div>
            </div>
            <div class="card-body">
                ${statCards}
                <div class="auth-code-filters" style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #666;">状态筛选</label>
                        <select id="auth-code-filter-status" class="form-input" onchange="updateAuthCodesStatusFilter(this.value)">
                            ${statusSelect}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #666;">省份筛选</label>
                        ${provinceControl}
                    </div>
                </div>
                <div id="auth-codes-list">
                    ${listHtml}
                </div>
                ${paginationHtml}
            </div>
        </div>
    `;
}

function renderAuthCodeStatCard(title, value, color = '#667eea') {
    return `
        <div style="flex: 1 1 160px; min-width: 160px; background: #f8f9ff; border-radius: 10px; padding: 15px; border-left: 4px solid ${color};">
            <div style="color: #666; font-size: 0.9rem; margin-bottom: 8px;">${title}</div>
            <div style="font-size: 1.8rem; font-weight: 600; color: ${color};">${value}</div>
        </div>
    `;
}

function renderAuthCodeItem(code) {
    // 综合判断授权码状态：优先检查 used 字段，然后是 usageCount，最后是 status
    const isUsed = code.used === true || 
                  (code.usageCount !== undefined && code.usageCount > 0) ||
                  (code.status && code.status.toLowerCase() === 'revoked');
    
    const statusMeta
        = isUsed
            ? {
                label: '已作废',
                color: '#e74c3c',
                background: 'rgba(231,76,60,0.12)',
                revokable: false,
            }
            : {
                label: '可用',
                color: '#27ae60',
                background: 'rgba(39,174,96,0.12)',
                revokable: true,
            };

    const usageLimit = code.usageLimit ?? code.usage_limit ?? null;
    const usageCount = code.usageCount ?? code.usage_count ?? 0;
    const usageText = usageLimit ? `${usageCount}/${usageLimit}` : usageCount;
    const createdAt = formatDateTime(code.createdAt || code.created_at);
    const expiresAt = formatDateTime(code.expiresAt || code.expires_at);

    const rawCode = String(code.code || '');
    const rawId = String(code.id || '');
    const encodedCode = encodeURIComponent(rawCode);
    const encodedId = encodeURIComponent(rawId);

    return `
        <div class="auth-code-item" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; background: #fff; gap: 20px;">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <span style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                        <i class="fas fa-key" style="color: #667eea; margin-right: 8px;"></i>${rawCode}
                    </span>
                    <span style="padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; background: ${statusMeta.background}; color: ${statusMeta.color};">
                        ${statusMeta.label}
                    </span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 20px; color: #666; font-size: 0.9rem;">
                    <span><i class="fas fa-map-marker-alt" style="color: #f57c00; margin-right: 6px;"></i>适用省份：${code.province || '未设置'}</span>
                    <span><i class="fas fa-user-check" style="color: #27ae60; margin-right: 6px;"></i>使用次数：${usageText}</span>
                    <span><i class="fas fa-calendar-plus" style="color: #3498db; margin-right: 6px;"></i>创建时间：${createdAt}</span>
                    <span><i class="fas fa-hourglass-half" style="color: #9b59b6; margin-right: 6px;"></i>到期时间：${expiresAt}</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <button class="btn btn-secondary" data-code="${encodedCode}" onclick="copyAuthCode(this.dataset.code)" style="padding: 8px 16px; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-copy"></i> 复制
                </button>
                ${
    statusMeta.revokable
        ? `
                    <button class="btn btn-danger" data-id="${encodedId}" data-code="${encodedCode}" onclick="revokeAuthCode(this.dataset.id, this.dataset.code)" style="padding: 8px 16px; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-ban"></i> 作废
                    </button>
                `
        : ''
}
            </div>
        </div>
    `;
}

function renderAuthCodesPagination() {
    const { page, pageSize, total } = authCodesState.pagination;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) {
        return '';
    }

    const prevDisabled = page <= 1 ? 'disabled' : '';
    const nextDisabled = page >= totalPages ? 'disabled' : '';

    return `
        <div style="margin-top: 20px; display: flex; justify-content: center; align-items: center; gap: 15px;">
            <button class="btn btn-secondary" style="padding: 8px 16px;" ${prevDisabled} onclick="loadAuthCodesPage({ page: ${page - 1} })">
                <i class="fas fa-angle-left"></i> 上一页
            </button>
            <span style="color: #666;">第 ${page} / ${totalPages} 页，共 ${total} 条</span>
            <button class="btn btn-secondary" style="padding: 8px 16px;" ${nextDisabled} onclick="loadAuthCodesPage({ page: ${page + 1} })">
                下一页 <i class="fas fa-angle-right"></i>
            </button>
        </div>
    `;
}

function updateAuthCodesStatusFilter(value) {
    authCodesState.filters.status = value || '';
    authCodesState.pagination.page = 1;
    loadAuthCodesPage({ page: 1 });
}

function updateAuthCodesProvinceFilter(value) {
    authCodesState.filters.province = value || '';
    authCodesState.pagination.page = 1;
    loadAuthCodesPage({ page: 1 });
}

async function generateNewAuthCode() {
    if (!window.apiService || typeof window.apiService.createAuthCode !== 'function') {
        showNotification('授权码接口不可用，请检查后端部署', 'error');
        return;
    }

    const adminInfo = getCurrentAdminInfo();

    const submitCreate = async ({ province, usageLimit, expiresAt }) => {
        try {
            showNotification('正在生成授权码，请稍候...', 'info');
            const payload = { province: province || null };
            if (usageLimit) {
                payload.usageLimit = usageLimit;
            }
            if (expiresAt) {
                payload.expiresAt = expiresAt;
            }

            const result = await window.apiService.createAuthCode(payload);
            closeModal();
            await loadAuthCodesPage();
            // 安全地获取授权码，处理多种响应格式
            let displayCode = '';
            if (result && typeof result === 'object') {
                if (result.code) {
                    displayCode = result.code;
                } else if (result.authCodes && Array.isArray(result.authCodes) && result.authCodes.length > 0) {
                    displayCode = result.authCodes[0].code || result.authCodes[0];
                }
            }
            showNotification(`授权码生成成功：${displayCode}`, 'success');
        } catch (error) {
            console.error('生成授权码失败:', error);
            showNotification(`生成授权码失败：${error.message || '未知错误'}`, 'error');
        }
    };

    if (adminInfo.role === 'sub') {
        if (!adminInfo.province) {
            showModal('错误', '副管理员未设置管理省份，无法生成授权码');
            return;
        }
        await submitCreate({ province: adminInfo.province });
        return;
    }

    const modalContent = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 20px;">生成授权码</h3>
            <form id="generate-auth-code-form">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>适用省份 <span style="color: red;">*</span></label>
                    <select id="auth-code-province" class="form-input" required>
                        <option value="">请选择省份</option>
                        ${PROVINCES.map(p => `<option value="${p}" ${authCodesState.filters.province === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>使用次数上限</label>
                    <input type="number" id="auth-code-usage-limit" class="form-input" min="1" placeholder="默认为 1 次">
                    <small style="color: #888;">授权码可被使用的最大次数，默认仅限一次</small>
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>到期时间</label>
                    <input type="datetime-local" id="auth-code-expires-at" class="form-input">
                    <small style="color: #888;">可选项，留空则永久有效</small>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                    <button type="submit" class="btn btn-primary">生成</button>
                </div>
            </form>
        </div>
    `;

    showModal('生成授权码', modalContent);

    const form = document.getElementById('generate-auth-code-form');
    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const province = document.getElementById('auth-code-province').value;
            const usageLimitValue = document.getElementById('auth-code-usage-limit').value;
            const expiresAtValue = document.getElementById('auth-code-expires-at').value;

            if (!province) {
                showNotification('请选择适用省份', 'error');
                return;
            }

            const usageLimit = usageLimitValue ? parseInt(usageLimitValue, 10) : null;
            const expiresAt = expiresAtValue ? new Date(expiresAtValue).toISOString() : null;

            if (usageLimit !== null && (Number.isNaN(usageLimit) || usageLimit <= 0)) {
                showNotification('使用次数上限必须为正整数', 'error');
                return;
            }

            await submitCreate({ province, usageLimit, expiresAt });
        });
    }
}

function reloadAuthCodes() {
    loadAuthCodesPage({ page: authCodesState.pagination.page });
}

async function revokeAuthCode(authCodeId, codeValue) {
    let decodedId = authCodeId;
    let decodedCode = codeValue;

    if (typeof decodedId === 'string') {
        try {
            decodedId = decodeURIComponent(decodedId);
        } catch (e) {
            // ignore decode errors
        }
    }

    if (typeof decodedCode === 'string') {
        try {
            decodedCode = decodeURIComponent(decodedCode);
        } catch (e) {
            // ignore decode errors
        }
    }

    if (!decodedId) {
        showNotification('缺少授权码ID，无法作废', 'error');
        return;
    }

    if (!window.apiService || typeof window.apiService.revokeAuthCode !== 'function') {
        showNotification('授权码接口不可用，请检查后端部署', 'error');
        return;
    }

    const confirmMessage = `确定要作废授权码 ${decodedCode || ''} 吗？
作废后将无法再使用。`;
    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        await window.apiService.deleteAuthCode(decodedId);
        showNotification(`授权码已作废${decodedCode ? `：${decodedCode}` : ''}`, 'success');
        loadAuthCodesPage({ page: authCodesState.pagination.page });
    } catch (error) {
        console.error('作废授权码失败:', error);
        showNotification(`作废失败：${error.message || '未知错误'}`, 'error');
    }
}

function copyAuthCode(codeValue) {
    let normalized = codeValue;
    if (typeof normalized === 'string') {
        try {
            normalized = decodeURIComponent(normalized);
        } catch (e) {
            // ignore decode errors
        }
    }

    if (!normalized) {
        normalized = '';
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
            .writeText(normalized)
            .then(() => showNotification(`授权码已复制：${normalized}`, 'success'))
            .catch(err => {
                console.error('复制失败:', err);
                fallbackCopyToClipboard(normalized);
            });
    } else {
        fallbackCopyToClipboard(normalized);
    }
}

function fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showNotification(`授权码已复制：${text}`, 'success');
        } else {
            showNotification(`复制失败，请手动复制：${text}`, 'error');
        }
    } catch (err) {
        console.error('复制失败:', err);
        showNotification(`复制失败，请手动复制：${text}`, 'error');
    } finally {
        document.body.removeChild(textarea);
    }
}

function formatDateTime(value) {
    if (!value) {
        return '-';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return typeof value === 'string' ? value : '-';
    }
    // 统一格式：年月日 + 当日时间 (YYYY-MM-DD HH:mm:ss)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

// 管理员配置数据（模拟数据库）
const adminData = {
    // API配置
    apiSettings: {
        smartDevices: {
            fitbit: {
                clientId: '23TP6R',
                clientSecret: '',
                redirectUri: 'https://www.example.invalid/',
                enabled: true,
                name: 'Fitbit',
            },
            tuya: {
                accessId: 'mkwj97jv7ernfdjxwavq',
                accessSecret: '',
                projectCode: 'p1773737826154h4jpph',
                baseUrl: 'https://openapi.tuyacn.com',
                enabled: true,
                name: '涂鸦智能',
            },
        },
        ai: {
            providers: {
                deepseek: {
                    apiKey: '',
                    baseUrl: 'https://api.deepseek.com/v1',
                    enabled: true,
                    name: 'Deep Seek',
                },
                doubao: {
                    apiKey: '',
                    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
                    enabled: true,
                    name: '豆包',
                },
                zhipu: {
                    apiKey: '',
                    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
                    enabled: true,
                    name: '智谱清言',
                },
            },
            defaultProvider: 'deepseek',
        },
        location: {
            providers: {
                tianditu: {
                    apiKey: '',
                    webKey: '',
                    baseUrl: 'https://api.tianditu.gov.cn',
                    enabled: true,
                    name: '天地图',
                },
                baidu: {
                    apiKey: '',
                    webKey: '',
                    baseUrl: 'https://api.map.baidu.com',
                    enabled: true,
                    name: '百度地图',
                },
                tencent: {
                    apiKey: '',
                    webKey: '',
                    baseUrl: 'https://apis.map.qq.com',
                    enabled: true,
                    name: '腾讯地图',
                },
                amap: {
                    apiKey: '',
                    webKey: '',
                    securityKey: '',
                    baseUrl: 'https://restapi.amap.com/v3',
                    enabled: true,
                    name: '高德地图',
                },
            },
            defaultProvider: 'amap',
        },
    },

    // 系统统计（模拟数据）
    statistics: {
        totalUsers: 1250,
        activeUsers: 342,
        todayRequests: 8521,
        totalData: '2.5 TB',
    },

    // 通知列表（默认通知，实际应从localStorage加载）
    notifications: {
        items: [],
        unreadCount: 0,
    },
    notificationSettings: null,
};

const DEFAULT_NOTIFICATION_SETTINGS = {
    channels: {
        system: true,
        push: true,
        email: false,
        sms: false,
    },
    preferences: {
        playSound: true,
        autoRefresh: true,
        autoMarkRead: false,
        desktopReminder: false,
    },
    digest: {
        dailySummary: false,
        summaryTime: '09:00',
    },
};

// 初始化通知数据（从localStorage加载或使用默认值）
async function initNotifications() {
    // 先从localStorage加载，提供即时显示
    try {
        const savedNotifications = localStorage.getItem('adminNotifications');
        if (savedNotifications) {
            const parsed = JSON.parse(savedNotifications);
            if (Array.isArray(parsed)) {
                adminData.notifications = {
                    items: parsed,
                    unreadCount: parsed.filter(n => !(n.read === true || n.isRead === true)).length,
                };
            } else if (parsed && typeof parsed === 'object') {
                adminData.notifications = parsed;
            }
            // 立即更新徽章
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('从localStorage加载通知失败:', error);
    }

    // 然后从服务器加载最新数据
    await loadNotificationsFromServer();
}

async function loadNotificationsFromServer() {
    if (!window.apiService) {
        console.warn('APIService 未就绪，无法加载通知');
        return;
    }
    try {
        // 确保 adminData.notifications 已正确初始化
        if (
            !adminData.notifications
            || typeof adminData.notifications !== 'object'
            || !Array.isArray(adminData.notifications.items)
        ) {
            adminData.notifications = {
                items: [],
                unreadCount: 0,
            };
        }

        const list = await window.apiService.listAdminNotifications(100);
        if (Array.isArray(list)) {
            adminData.notifications.items = normalizeNotificationList(list);
            adminData.notifications.unreadCount = adminData.notifications.items.filter(
                item => !item.isRead && !item.read,
            ).length;
            // 保存到localStorage
            localStorage.setItem('adminNotifications', JSON.stringify(adminData.notifications));
            renderNotifications();
            updateNotificationBadge(); // 更新通知徽章
        }
    } catch (error) {
        console.error('加载通知失败:', error);
    }
}

function saveNotifications() {
    // 保存到localStorage
    try {
        localStorage.setItem('adminNotifications', JSON.stringify(adminData.notifications));
    } catch (error) {
        console.error('保存通知数据失败:', error);
    }
}

function normalizeNotificationList(list) {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    let enabledTypes = null;
    try {
        const notificationSettings = JSON.parse(
            localStorage.getItem('adminNotificationSettings') || '{}',
        );
        if (notificationSettings && Array.isArray(notificationSettings.enabledTypes)) {
            enabledTypes = notificationSettings.enabledTypes.filter(Boolean);
        }
    } catch (e) {
        console.warn('解析通知设置失败:', e);
    }

    return list
        .map(item => ({
            ...item,
            type: item.type || item.category || 'general',
            createdAt:
                item.createdAt
                || item.created_at
                || item.timestamp
                || item.createdTime
                || item.createTime
                || new Date().toISOString(),
        }))
        .filter(item => {
            const createdTime = new Date(item.createdAt);
            if (isNaN(createdTime.getTime())) {
                return false;
            }

            if (createdTime < threeDaysAgo) {
                return false;
            }

            if (enabledTypes && enabledTypes.length > 0) {
                const type = item.type || 'general';
                if (!enabledTypes.includes(type)) {
                    return false;
                }
            }

            return true;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function addNotification({ title, content, level = 'info', silent = false }) {
    try {
        const payload = { title, content, level };
        await window.apiService.createAdminNotification(payload);
        if (!silent) {
            await loadNotificationsFromServer();
        }
    } catch (error) {
        console.error('创建通知失败:', error);
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        // 先更新本地状态，提供即时反馈
        if (adminData.notifications && adminData.notifications.items) {
            adminData.notifications.items = adminData.notifications.items.map(item => {
                if (
                    item.id == notificationId
                    || item.id === notificationId
                    || String(item.id) === String(notificationId)
                ) {
                    return { ...item, isRead: 1, read: true };
                }
                return item;
            });
            adminData.notifications.unreadCount = adminData.notifications.items.filter(
                item => !item.isRead && !item.read,
            ).length;
            saveNotifications();
            updateNotificationBadge();
            renderNotifications();
        }

        // 然后同步到服务器
        if (window.apiService && notificationId) {
            try {
                await window.apiService.markAdminNotificationRead(notificationId);
            } catch (err) {
                console.warn('同步通知已读状态到服务器失败:', err);
                // 即使服务器同步失败，本地状态已更新，不影响用户体验
            }
        }
    } catch (error) {
        console.error('标记通知失败:', error);
    }
}

async function markAllNotificationsAsRead() {
    try {
        await window.apiService.markAllAdminNotificationsRead();
        adminData.notifications.items = adminData.notifications.items.map(item => ({
            ...item,
            isRead: 1,
        }));
        adminData.notifications.unreadCount = 0;
        renderNotifications();
    } catch (error) {
        console.error('批量标记通知失败:', error);
    }
}

async function deleteNotification(notificationId) {
    try {
        // 先从本地列表中移除，提供即时反馈
        const itemExists = adminData.notifications.items.some(item => item.id == notificationId);
        if (itemExists) {
            adminData.notifications.items = adminData.notifications.items.filter(
                item => item.id != notificationId,
            );
            adminData.notifications.unreadCount = adminData.notifications.items.filter(
                item => !item.isRead,
            ).length;
            renderNotifications();
        }

        // 调用API删除
        const result = await window.apiService.deleteAdminNotification(notificationId);

        // 如果通知已不存在，显示提示信息
        if (result && typeof result === 'object' && result.alreadyDeleted) {
            // 通知已被删除或不存在，列表已更新
            if (!itemExists) {
                // 如果本地也没有，说明已经被删除了，静默处理
                console.log('通知已不存在，无需处理');
            } else {
                showNotification('通知已删除', 'success');
            }
        } else if (result && result.success) {
            // 删除成功
            showNotification('通知已删除', 'success');
        }

        // 重新加载通知列表，确保数据同步
        loadNotificationsFromServer();
    } catch (error) {
        console.error('删除通知失败:', error);
        // 如果错误是404（通知不存在），静默处理
        if (
            error?.status === 404
            || error?.code === 'NOT_FOUND'
            || (typeof error?.message === 'string' && error.message.includes('不存在'))
        ) {
            // 通知已不存在，列表已更新，无需显示错误
            loadNotificationsFromServer(); // 重新加载确保同步
            return;
        }
        // 其他错误才显示
        showNotification(error?.message || '删除通知失败，请稍后重试。', 'error');
    }
}

function renderNotifications() {
    const notificationList = document.getElementById('notificationList');
    const notificationDropdownCount = document.getElementById('notificationDropdownCount');
    if (notificationDropdownCount) {
        notificationDropdownCount.textContent
            = adminData.notifications.unreadCount > 99 ? '99+' : adminData.notifications.unreadCount;
        notificationDropdownCount.style.display
            = adminData.notifications.unreadCount > 0 ? 'inline-flex' : 'none';
    }

    if (!notificationList) {
        return;
    }

    if (!adminData.notifications.items.length) {
        notificationList.innerHTML = '<div class="notification-empty">暂无通知</div>';
        return;
    }

    const grouped = groupNotificationsByType(adminData.notifications.items);

    notificationList.innerHTML = Object.entries(grouped)
        .map(
            ([type, items]) => `
        <div class="notification-group">
            <div class="notification-group-header">
                <div class="notification-group-title">
                    <span class="notification-group-type">${getNotificationTypeLabel(type)}</span>
                    <span class="notification-group-count">${items.length} 条</span>
                </div>
                ${
    items.some(item => !item.isRead && !item.read)
        ? `
                    <button class="btn btn-secondary" onclick="markNotificationTypeRead('${type}')" style="padding: 4px 10px; font-size: 0.85rem;">
                        标记该类别已读
                    </button>
                `
        : ''
}
            </div>
            <div class="notification-group-items">
                ${items
        .slice(0, 5)
        .map(
            item => `
                    <div class="notification-item ${item.isRead || item.read ? 'read' : 'unread'}">
                        <div class="notification-header">
                            <span class="notification-title">${item.title || '系统通知'}</span>
                            <span class="notification-time">${formatDateTime(item.createdAt || item.created_at)}</span>
                        </div>
                        <div class="notification-content">${item.content || ''}</div>
                        <div class="notification-actions">
                            ${!item.isRead && !item.read ? `<button onclick="markNotificationAsRead('${item.id}')">标记已读</button>` : ''}
                            <button onclick="deleteNotification('${item.id}')" class="danger">删除</button>
                        </div>
                    </div>
                `,
        )
        .join('')}
                ${
    items.length > 5
        ? `
                    <div class="notification-group-footer">
                        <span>仅显示最近5条通知，共 ${items.length} 条</span>
                    </div>
                `
        : ''
}
            </div>
        </div>
    `,
        )
        .join('');
}

function groupNotificationsByType(list) {
    return list.reduce((groups, item) => {
        const type = item.type || 'general';
        if (!groups[type]) {
            groups[type] = [];
        }
        groups[type].push(item);
        return groups;
    }, {});
}

function getNotificationTypeLabel(type) {
    const mapping = {
        system: '系统通知',
        security: '安全提醒',
        user: '用户动态',
        hospital: '医院动态',
        'auth-code': '授权码通知',
        data: '数据同步',
        general: '其他通知',
    };
    return mapping[type] || mapping.general;
}

async function markNotificationTypeRead(type) {
    if (!type) {
        return;
    }
    const targetIds = adminData.notifications.items
        .filter(item => (item.type || 'general') === type && !item.isRead && !item.read)
        .map(item => item.id);

    if (!targetIds.length) {
        return;
    }

    for (const id of targetIds) {
        await markNotificationAsRead(id);
    }
}

function showNotification(message, level = 'info') {
    addNotification({
        title: level === 'success' ? '操作成功' : level === 'error' ? '操作失败' : '系统提示',
        content: message,
        level,
        silent: level === 'success',
    });
}

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    console.info('健康守护管理后台构建版本:', ADMIN_BUILD_VERSION);
    console.log('管理员后台初始化...');
    initAdminAvatarSync();
    initAdminAvatarEditor();
    
    // 配置 API 服务使用后端模式
    if (window.apiService) {
        window.apiService.useLocalStorage = false;
        console.log('API服务已配置为使用后端模式');
    }

    // 检查登录状态和角色
    const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');

    // 检查登录状态
    if (!checkAuth()) {
        console.log('未登录，需要认证');
        window.location.href = '/views/auth/login.html?force=true';
        return;
    }

    // 初始化通知数据
    initNotifications();

    // 等待配置加载完成再渲染界面，避免页面初次渲染缺少数据
    await loadSavedSettings();

    // 加载地理位置API配置（如果存在）
    await loadLocationAPIConfig();

    // 初始化UI
    initializeUI();

    // 设置事件监听器
    setupEventListeners();

    // 获取管理员信息
    const adminInfo = getCurrentAdminInfo();

    // 先恢复保存的页面状态（避免闪烁），然后再加载数据
    let savedPage = null;
    try {
        const storageKey = adminInfo.role === 'admin' ? 'adminCurrentPage' : 'subAdminCurrentPage';
        savedPage = sessionStorage.getItem(storageKey);
        // 允许 notification-settings 作为保存的页面（用户主动访问后刷新应该保持）
        if (savedPage) {
            console.log('恢复保存的管理员页面:', savedPage);
        }
    } catch (e) {
        console.warn('恢复管理员页面状态失败:', e);
    }

    // 检查头部脚本是否已经设置了页面
    const currentActivePage = document.querySelector('.page-content.active');
    const pageRestoredFlag = sessionStorage.getItem('_pageRestoredByHeadScript');
    let pageAlreadySet = false;
    let targetPage = null;

    // 确定应该显示的页面
    const hash = window.location.hash.substring(1);
    const normalizedHash = hash;

    // 如果头部脚本已经设置了页面，优先使用头部脚本的设置
    if (currentActivePage && pageRestoredFlag === 'true') {
        const activePageId = currentActivePage.id.replace('-page', '');
        const restoredPageId = sessionStorage.getItem('_pageRestoredByHeadScript_pageId');
        const actualRestoredPage = restoredPageId || activePageId;

        console.log('=== 页面恢复检查 ===');
        console.log('头部脚本设置的页面ID:', activePageId);
        console.log('头部脚本保存的页面ID:', restoredPageId);
        console.log('实际恢复的页面:', actualRestoredPage);
        console.log('Hash:', hash);
        console.log('保存页面:', savedPage);
        console.log('管理员角色:', adminInfo.role);

        // 信任头部脚本的设置
        targetPage = actualRestoredPage;
        pageAlreadySet = true;
        console.log('✓ 使用头部脚本设置的页面:', targetPage);
    } else {
        // 头部脚本未设置页面，计算期望页面
        const expectedPage
            = normalizedHash || savedPage || getDefaultPageByRole(adminInfo.role);

        console.log('=== 页面恢复检查 ===');
        console.log('期望页面:', expectedPage);
        console.log('Hash:', hash);
        console.log('保存页面:', savedPage);
        console.log('当前激活页面:', currentActivePage ? currentActivePage.id : '无');
        console.log('头部脚本标志:', pageRestoredFlag);
        console.log('管理员角色:', adminInfo.role);

        targetPage = expectedPage;
        pageAlreadySet = false;
    }

    // 如果页面没有被正确设置，需要切换页面
    if (!pageAlreadySet) {
        console.log('需要切换页面到:', targetPage);
        switchPage(targetPage);
    } else {
        // 页面已设置，只需要加载数据和更新UI
        console.log('页面已设置，加载内容:', targetPage);
        loadPageContent(targetPage);
        updatePageTitle(targetPage);
        // 确保菜单项也被激活
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === targetPage) {
                item.classList.add('active');
            }
        });
    }

    // 根据角色显示/隐藏菜单项（在页面恢复之后执行）
    // 注意：checkAdminPermissions中已修复，不会强制跳转
    checkAdminPermissions();

    // 延迟清除标志，确保所有检查都完成
    setTimeout(() => {
        sessionStorage.removeItem('_pageRestoredByHeadScript');
    }, 100);

    // 初始化通知徽章（所有管理员）
    updateNotificationBadge();

    // 更新实时信息（仅主管理员）
    if (adminInfo.role === 'admin') {
        setInterval(updateRealtimeInfo, 60000); // 每分钟更新
    }

    console.log('管理员后台初始化完成');
});

// 检查认证状态
function checkAuth() {
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        const role = loginInfo?.user?.role || loginInfo?.role || null;
        return role === 'admin' || role === 'sub';
    } catch (error) {
        console.error('检查管理员登录状态失败:', error);
        return false;
    }
}

// 初始化UI
function initializeUI() {
    // 更新当前时间
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // 初始化侧边栏菜单
    initializeMenu();
}

// 设置事件监听器
function setupEventListeners() {
    // 移动端侧边栏切换
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // 侧边栏菜单点击 - 点击后自动关闭侧边栏（移动端）
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.dataset.page;
            switchPage(page);
            // 移动端点击菜单项后关闭侧边栏
            if (window.innerWidth <= 767) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
        });
    });

    // 通知按钮点击
    const notificationBtn = document.getElementById('btn-notification');
    const notificationDropdown = document.getElementById('notification-dropdown');

    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', e => {
            e.stopPropagation();
            const isVisible
                = notificationDropdown.style.display !== 'none'
                && notificationDropdown.style.display !== '';
            if (isVisible) {
                notificationDropdown.style.display = 'none';
            } else {
                notificationDropdown.style.display = 'block';
                loadNotificationDropdown(); // 异步加载，会显示加载状态
            }
        });
    }

    // 全部已读按钮
    const markAllReadBtn = document.getElementById('btn-mark-all-read');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', e => {
            e.stopPropagation();
            markAllNotificationsAsRead().catch(err => {
                console.error('标记所有通知为已读失败:', err);
            });
        });
    }

    // 点击外部关闭通知面板
    document.addEventListener('click', e => {
        if (notificationDropdown && notificationBtn) {
            if (!notificationDropdown.contains(e.target) && !notificationBtn.contains(e.target)) {
                notificationDropdown.style.display = 'none';
            }
        }
    });

    // 模态框关闭
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);

    const modalOverlay = document.getElementById('modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function (e) {
            if (e.target === this) {
                if (this.dataset.backdropClose === 'true') {
                    closeModal();
                } else {
                    e.stopPropagation();
                    e.preventDefault();
                }
            }
        });
    }

    // 确保模态框内容可点击而不会冒泡
    const modalContent = modalOverlay?.querySelector('.modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', e => {
            e.stopPropagation();
        });
    }
}

// 切换页面
function switchPage(pageId) {
    console.log('切换到页面:', pageId);

    const adminInfo = getCurrentAdminInfo();
    const roleLabel = adminInfo.role === 'admin' ? '主管理员' : '副管理员';
    const normalizedRequest = normalizePageId(pageId);
    let targetPageId = normalizedRequest || getDefaultPageByRole(adminInfo.role);

    const bypassCheck = adminInfo.role === 'admin' || UNIVERSAL_ADMIN_PAGES.has(targetPageId);

    if (!bypassCheck && !isPageAllowedForRole(adminInfo.role, targetPageId)) {
        console.warn(`${roleLabel}无权访问此页面:`, targetPageId);
        targetPageId = getDefaultPageByRole(adminInfo.role);
    }

    // 保存当前页面状态到sessionStorage
    try {
        const storageKey = adminInfo.role === 'admin' ? 'adminCurrentPage' : 'subAdminCurrentPage';
        sessionStorage.setItem(storageKey, targetPageId);
    } catch (e) {
        console.warn('保存管理员页面状态失败:', e);
    }

    // 更新活动菜单项
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === targetPageId) {
            item.classList.add('active');
        }
    });

    // 隐藏所有页面
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });

    // 显示目标页面
    const targetPageEl = document.getElementById(`${targetPageId}-page`);
    if (targetPageEl) {
        targetPageEl.classList.add('active');
        loadPageContent(targetPageId);
    }

    // 更新页面标题
    updatePageTitle(targetPageId);
}

// 更新页面标题
function updatePageTitle(pageId) {
    const titles = {
        dashboard: { title: '仪表板', desc: '欢迎使用健康守护管理后台' },
        'smart-devices': { title: '智能设备', desc: '配置智能设备API' },
        ai: { title: 'AI设置', desc: '配置AI服务' },
        'location-api': { title: '地理位置API', desc: '配置地理位置和地图服务API' },
        'sub-admins': { title: '副管理员管理', desc: '管理副管理员账户和权限' },
        security: { title: '安全设置', desc: '配置系统安全选项' },
        account: { title: '账号管理', desc: '管理管理员账号信息' },
    };

    const pageInfo = titles[pageId] || { title: '管理员后台', desc: '' };
    const pageTitleEl = document.getElementById('page-title');
    const pageDescEl = document.getElementById('page-description');
    if (pageTitleEl) {
        pageTitleEl.textContent = pageInfo.title;
    }
    if (pageDescEl) {
        pageDescEl.textContent = pageInfo.desc;
    }
}

// 加载页面内容
function loadPageContent(pageId) {
    const adminInfo = getCurrentAdminInfo();
    const normalizedPageId = normalizePageId(pageId);
    const bypassPermissionCheck
        = adminInfo.role === 'admin' || UNIVERSAL_ADMIN_PAGES.has(normalizedPageId);

    if (!bypassPermissionCheck && !isPageAllowedForRole(adminInfo.role, normalizedPageId)) {
        showModal('权限不足', '您没有访问此页面的权限');
        switchPage(getDefaultPageByRole(adminInfo.role));
        return;
    }

    if (!normalizedPageId) {
        switchPage(getDefaultPageByRole(adminInfo.role));
        return;
    }

    // 禁止访问安全设置页面
    if (normalizedPageId === 'security') {
        showModal('权限不足', '该功能已被移除');
        switchPage(getDefaultPageByRole(adminInfo.role));
        return;
    }

    switch (normalizedPageId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'smart-devices':
            loadSmartDevicesPage();
            break;
        case 'ai':
            loadAIPage();
            break;
        case 'location-api':
            loadLocationAPIPage();
            break;
        case 'security':
            loadSecurityPage();
            break;
        case 'account':
            loadAccountPage();
            break;
        case 'sub-admins':
            if (!isMainAdmin()) {
                showModal('权限不足', '只有主管理员可以访问副管理员管理功能');
                switchPage('dashboard');
                return;
            }
            loadSubAdminsPage();
            break;
    }
}

// 检查管理员权限并显示/隐藏菜单项
function checkAdminPermissions() {
    const adminInfo = getCurrentAdminInfo();

    // 更新侧边栏显示的角色信息
    const userInfoEl = document.querySelector('.user-info span');
    if (userInfoEl) {
        const roleText = adminInfo.role === 'admin' ? '主管理员' : '副管理员';
        userInfoEl.textContent = `${adminInfo.username} (${roleText})`;
    }

    // 定义菜单项可见性规则
    const menuVisibility = {
        dashboard: adminInfo.role === 'admin',
        'smart-devices': adminInfo.role === 'admin',
        ai: adminInfo.role === 'admin',
        'location-api': adminInfo.role === 'admin',
        'sub-admins': adminInfo.role === 'admin',
        security: false, // 删除安全设置功能
        account: true, // 所有管理员都可以访问
    };

    // 根据角色显示/隐藏菜单项
    Object.keys(menuVisibility).forEach(pageId => {
        const menuEl = document.getElementById(`menu-${pageId}`);
        if (menuEl) {
            if (menuVisibility[pageId]) {
                menuEl.style.display = '';
            } else {
                menuEl.style.display = 'none';
            }
        }
    });

    // 更新账号管理页面显示角色
    const roleEl = document.getElementById('admin-role');
    if (roleEl) {
        roleEl.value = adminInfo.role === 'admin' ? '主管理员' : '副管理员';
    }

    // 如果是副管理员，检查当前页面是否在允许列表中
    // 注意：在页面恢复完成之前不要强制跳转
    if (adminInfo.role === 'sub') {
        const pageRestoredByHeadScript
            = sessionStorage.getItem('_pageRestoredByHeadScript') === 'true';

        // 如果头部脚本已经恢复了页面，不要强制跳转
        if (pageRestoredByHeadScript) {
            console.log('✓ 头部脚本已恢复页面，跳过权限检查');
            return;
        }

        // 只有在头部脚本没有恢复页面的情况下才检查权限
        const currentHash = window.location.hash.substring(1);
        const currentActivePage = document.querySelector('.page-content.active');
        const activePageId = currentActivePage ? currentActivePage.id.replace('-page', '') : null;
        const currentPage = currentHash || activePageId;
        const normalizedCurrentPage = normalizePageId(currentPage);

        // 只在页面不在允许列表中时才跳转
        if (normalizedCurrentPage && !isPageAllowedForRole('sub', normalizedCurrentPage)) {
            console.warn('⚠ 副管理员访问未授权页面，准备跳转:', normalizedCurrentPage);
            // 检查保存的页面是否在允许列表中
            const savedPage = normalizePageId(sessionStorage.getItem('subAdminCurrentPage'));
            if (savedPage && isPageAllowedForRole('sub', savedPage)) {
                // 如果保存的页面在允许列表中，恢复它
                console.log('恢复保存的页面:', savedPage);
                switchPage(savedPage);
            } else {
                // 否则跳转到账号管理页面
                console.log('跳转到默认页面: account');
                window.location.hash = '#account';
                switchPage('account');
            }
        }
    }
}

// 头像同步
let adminAvatarSyncCleanup = null;
let adminAvatarEditor = null;

function getAdminAvatarSyncUsername() {
    const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
    return loginInfo.username || loginInfo.user?.username || 'admin';
}

function getAdminAvatarFallback(username = getAdminAvatarSyncUsername()) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=120&background=667eea&color=fff&bold=true`;
}

function setAdminAvatarImage(avatarData, username = getAdminAvatarSyncUsername()) {
    const avatarEl = document.getElementById('admin-avatar');
    if (avatarEl) {
        avatarEl.src = avatarData || getAdminAvatarFallback(username);
    }
}

function broadcastAdminAvatarUpdate(avatarData) {
    const username = getAdminAvatarSyncUsername();
    try {
        localStorage.setItem(`adminConfig_${username}`, JSON.stringify({
            ...JSON.parse(localStorage.getItem(`adminConfig_${username}`) || '{}'),
            avatar: avatarData,
        }));
    } catch (error) {
        console.warn('保存管理员头像缓存失败:', error);
    }

    if (window.AvatarEditor) {
        window.AvatarEditor.broadcast({
            scope: 'admin',
            username,
            avatar: avatarData,
        });
        return;
    }

    const payload = {
        scope: 'admin',
        username,
        avatar: avatarData,
        timestamp: Date.now(),
    };

    try {
        localStorage.setItem('avatar_sync_event', JSON.stringify(payload));
    } catch (error) {
        console.warn('保存头像同步事件失败:', error);
    }
}

function applyAdminAvatarSync(payload) {
    if (!payload || payload.scope !== 'admin') {
        return;
    }

    const currentUsername = getAdminAvatarSyncUsername();
    if (payload.username !== currentUsername) {
        return;
    }

    setAdminAvatarImage(payload.avatar, currentUsername);
}

function initAdminAvatarSync() {
    const currentUsername = getAdminAvatarSyncUsername();
    setAdminAvatarImage(
        JSON.parse(localStorage.getItem(`adminConfig_${currentUsername}`) || '{}').avatar,
        currentUsername,
    );

    if (window.AvatarEditor && !adminAvatarSyncCleanup) {
        adminAvatarSyncCleanup = window.AvatarEditor.listen(payload => {
            applyAdminAvatarSync(payload);
        });
        return;
    }

    if (window.__adminAvatarSyncInitialized) {
        return;
    }
    window.__adminAvatarSyncInitialized = true;

    if (typeof BroadcastChannel !== 'undefined') {
        const adminAvatarSyncChannel = new BroadcastChannel('avatar_sync');
        adminAvatarSyncChannel.addEventListener('message', event => {
            applyAdminAvatarSync(event.data);
        });
    }

    window.addEventListener('storage', event => {
        if (event.key === 'avatar_sync_event' && event.newValue) {
            try {
                applyAdminAvatarSync(JSON.parse(event.newValue));
            } catch (error) {
                console.warn('解析头像同步事件失败:', error);
            }
        }
    });
}

async function saveAdminAvatar(avatarData) {
    const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
    const loginUser = loginInfo.user || {};
    const userId = loginUser.id || loginInfo.userId;
    const username = getAdminAvatarSyncUsername();
    const userRole = loginUser.role || loginInfo.role || 'admin';

    if (!userId) {
        throw new Error('无法获取用户ID，请重新登录');
    }

    if (window.apiService && typeof window.apiService.updateAdmin === 'function') {
        await window.apiService.updateAdmin(userId, {
            avatar: avatarData,
            role: userRole,
            updatedBy: username,
        });
    }

    const avatarEl = document.getElementById('admin-avatar');
    if (avatarEl) {
        avatarEl.src = avatarData;
    }

    const adminConfig = JSON.parse(localStorage.getItem(`adminConfig_${username}`) || '{}');
    adminConfig.avatar = avatarData;
    localStorage.setItem(`adminConfig_${username}`, JSON.stringify(adminConfig));

    try {
        const freshLoginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        if (freshLoginInfo.user) {
            freshLoginInfo.user.avatar = avatarData;
            sessionStorage.setItem('loginInfo', JSON.stringify(freshLoginInfo));
        }
    } catch (error) {
        console.warn('更新管理员登录头像失败:', error);
    }

    broadcastAdminAvatarUpdate(avatarData);
}

function initAdminAvatarEditor() {
    if (!window.AvatarEditor || adminAvatarEditor) {
        return;
    }

    const currentUsername = getAdminAvatarSyncUsername();
    const currentAvatar = JSON.parse(localStorage.getItem(`adminConfig_${currentUsername}`) || '{}').avatar || document.getElementById('admin-avatar')?.src || '';

    adminAvatarEditor = window.AvatarEditor.create({
        title: '头像设置',
        currentAvatar,
        helperText: '支持 JPG、PNG、WEBP，裁剪结果会压缩到 640×640 以内，且不超过 2MB',
        onSave: async avatarData => {
            await saveAdminAvatar(avatarData);
            showNotification('头像更新成功！', 'success');
        },
        onError: error => {
            showModal('错误', error.message || '头像更新失败');
        },
    });
}

function openAdminAvatarEditor() {
    initAdminAvatarEditor();
    if (adminAvatarEditor) {
        adminAvatarEditor.open(document.getElementById('admin-avatar')?.src || '');
        return;
    }
    const input = document.getElementById('admin-avatar-input');
    if (input) {
        input.click();
    }
}

// 加载管理员账号信息
function loadAdminAccountInfo() {
    try {
        // 获取登录信息
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        const username = loginInfo.username || loginInfo.user?.username || 'admin';

        // 优先从登录信息中获取用户信息（从数据库返回的数据）
        const userInfo = loginInfo.user || {};

        // 从localStorage加载账号数据（兼容性）
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        const adminAccount = accounts.admin?.find(acc => acc.username === username);

        // 从localStorage加载管理员配置（用于头像等额外信息）
        const adminConfig = JSON.parse(localStorage.getItem(`adminConfig_${username}`) || '{}');

        // 更新用户名显示
        const usernameEl = document.getElementById('admin-username');
        if (usernameEl) {
            usernameEl.value = username;
        }

        // 更新角色显示（基于登录信息的adminRole）
        const roleEl = document.getElementById('admin-role');
        if (roleEl) {
            const adminRole = userInfo.adminRole === 'sub' ? '副管理员' : '主管理员';
            roleEl.value = adminRole;
        }

        // 更新头像（优先使用本地已保存头像）
        setAdminAvatarImage(adminConfig.avatar, username);
        if (adminAvatarEditor) {
            adminAvatarEditor.refresh(adminConfig.avatar || userInfo.avatar || '');
        }

        // 更新基本信息（仅使用后端返回的登录信息）
        const nicknameEl = document.getElementById('admin-nickname');
        const emailEl = document.getElementById('admin-email');

        if (nicknameEl) {
            nicknameEl.value = userInfo.nickname || '';
        }
        if (emailEl) {
            emailEl.value = userInfo.email || '';
        }

        // 清空密码字段
        const currentPasswordEl = document.getElementById('admin-current-password');
        const newPasswordEl = document.getElementById('admin-new-password');
        const confirmPasswordEl = document.getElementById('admin-confirm-password');

        if (currentPasswordEl) {
            currentPasswordEl.value = '';
        }
        if (newPasswordEl) {
            newPasswordEl.value = '';
        }
        if (confirmPasswordEl) {
            confirmPasswordEl.value = '';
        }
    } catch (error) {
        console.error('加载管理员账号信息失败:', error);
    }
}

// 加载账号管理页面
function loadAccountPage() {
    checkAdminPermissions();
    loadAdminAccountInfo();
}

// 加载副管理员管理页面
const subAdminManagementState = {
    list: [],
    keyword: '',
    selectedUsernames: [],
};

function loadSubAdminsPage() {
    loadSubAdminsList();
}

function getFilteredSubAdmins() {
    const keyword = subAdminManagementState.keyword.trim().toLowerCase();
    if (!keyword) {
        return [...subAdminManagementState.list];
    }

    return subAdminManagementState.list.filter(admin => {
        const searchableValues = [
            admin.username,
            admin.nickname,
            admin.email,
            admin.province,
            Array.isArray(admin.permissions)
                ? admin.permissions.map(permission => ADMIN_PERMISSIONS[permission] || permission).join(' ')
                : '',
        ];

        return searchableValues.some(value => String(value || '').toLowerCase().includes(keyword));
    });
}

function syncSelectedSubAdminsWithList() {
    const validUsernames = new Set(subAdminManagementState.list.map(admin => admin.username));
    subAdminManagementState.selectedUsernames = subAdminManagementState.selectedUsernames.filter(
        username => validUsernames.has(username),
    );
}

function updateSubAdminBatchButtonState(filteredSubAdmins = getFilteredSubAdmins()) {
    const batchButton = document.getElementById('sub-admins-batch-btn');
    const selectAllCheckbox = document.getElementById('sub-admins-select-all');
    const selectedCount = subAdminManagementState.selectedUsernames.length;

    if (batchButton) {
        batchButton.disabled = selectedCount === 0;
        batchButton.innerHTML = `<i class="fas fa-layer-group"></i> 批量管理${selectedCount > 0 ? ` (${selectedCount})` : ''}`;
    }

    if (selectAllCheckbox) {
        const selectableCount = filteredSubAdmins.length;
        const selectedInViewCount = filteredSubAdmins.filter(admin =>
            subAdminManagementState.selectedUsernames.includes(admin.username),
        ).length;

        selectAllCheckbox.checked = selectableCount > 0 && selectedInViewCount === selectableCount;
        selectAllCheckbox.indeterminate = selectedInViewCount > 0 && selectedInViewCount < selectableCount;
    }
}

function renderSubAdminsList(subAdmins = subAdminManagementState.list) {
    const listContainer = document.getElementById('sub-admins-list');
    if (!listContainer) {
        return;
    }

    const filteredSubAdmins = Array.isArray(subAdmins) ? subAdmins : [];
    updateSubAdminBatchButtonState(filteredSubAdmins);

    if (filteredSubAdmins.length === 0) {
        const isSearching = Boolean(subAdminManagementState.keyword.trim());
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <i class="fas ${isSearching ? 'fa-search' : 'fa-user-shield'}" style="font-size: 3em; margin-bottom: 20px; opacity: 0.3;"></i>
                <p>${isSearching ? '未找到匹配的副管理员' : '暂无副管理员'}</p>
                <p style="font-size: 0.9em; margin-top: 10px;">${isSearching ? '请尝试调整搜索关键词后重试' : '点击“创建副管理员”按钮添加新的副管理员'}</p>
            </div>
        `;
        return;
    }

    let html
        = '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f5f5f5;"><th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; width: 56px;"><input type="checkbox" id="sub-admins-select-all" onclick="toggleSelectAllSubAdmins(this.checked)"></th><th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">用户名</th><th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">昵称</th><th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">管理省份</th><th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">权限</th><th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">创建时间</th><th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">操作</th></tr></thead><tbody>';

    filteredSubAdmins.forEach(admin => {
        const adminConfig = JSON.parse(
            localStorage.getItem(`adminConfig_${admin.username}`) || '{}',
        );
        const permissions = Array.isArray(admin.permissions) ? admin.permissions : [];
        const permissionsText = permissions.includes('all')
            ? '全部权限'
            : permissions.map(p => ADMIN_PERMISSIONS[p] || p).join(', ') || '无权限';
        const province = admin.province || '未设置';
        const nickname = admin.nickname || adminConfig.nickname || '-';
        const createdAtText = admin.createdAt ? formatDateTime(admin.createdAt) : '-';
        const isSelected = subAdminManagementState.selectedUsernames.includes(admin.username);

        html += `
            <tr style="border-bottom: 1px solid #eee; ${isSelected ? 'background: #f8fbff;' : ''}">
                <td style="padding: 12px; text-align: center;">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSubAdminSelection('${admin.username}', this.checked)">
                </td>
                <td style="padding: 12px;">${admin.username}</td>
                <td style="padding: 12px;">${nickname}</td>
                <td style="padding: 12px;">
                    <span style="background: #fff3e0; color: #f57c00; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">${province}</span>
                </td>
                <td style="padding: 12px;">
                    <span style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">${permissionsText}</span>
                </td>
                <td style="padding: 12px; color: #666; font-size: 0.9em;">${createdAtText}</td>
                <td style="padding: 12px;">
                    <button class="btn btn-secondary" onclick="editSubAdmin('${admin.username}')" style="padding: 6px 12px; font-size: 0.9em; margin-right: 5px;">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn btn-danger" onclick="deleteSubAdmin('${admin.username}')" style="padding: 6px 12px; font-size: 0.9em;">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    listContainer.innerHTML = html;
    updateSubAdminBatchButtonState(filteredSubAdmins);
}

function handleSubAdminSearch() {
    const searchInput = document.getElementById('sub-admins-search-input');
    subAdminManagementState.keyword = searchInput ? searchInput.value.trim() : '';
    renderSubAdminsList(getFilteredSubAdmins());
}

window.handleSubAdminSearch = handleSubAdminSearch;

function handleSubAdminSearchInput(event) {
    subAdminManagementState.keyword = event?.target?.value?.trim() || '';
    renderSubAdminsList(getFilteredSubAdmins());
}

window.handleSubAdminSearchInput = handleSubAdminSearchInput;

function resetSubAdminSearch() {
    const searchInput = document.getElementById('sub-admins-search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    subAdminManagementState.keyword = '';
    renderSubAdminsList(getFilteredSubAdmins());
}

window.resetSubAdminSearch = resetSubAdminSearch;

function handleSubAdminSearchKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleSubAdminSearch();
    }
}

window.handleSubAdminSearchKeydown = handleSubAdminSearchKeydown;

function toggleSelectAllSubAdmins(checked) {
    const usernamesInView = getFilteredSubAdmins().map(admin => admin.username);
    const selectedSet = new Set(subAdminManagementState.selectedUsernames);

    usernamesInView.forEach(username => {
        if (checked) {
            selectedSet.add(username);
        } else {
            selectedSet.delete(username);
        }
    });

    subAdminManagementState.selectedUsernames = Array.from(selectedSet);
    renderSubAdminsList(getFilteredSubAdmins());
}

window.toggleSelectAllSubAdmins = toggleSelectAllSubAdmins;

function toggleSubAdminSelection(username, checked) {
    const selectedSet = new Set(subAdminManagementState.selectedUsernames);
    if (checked) {
        selectedSet.add(username);
    } else {
        selectedSet.delete(username);
    }
    subAdminManagementState.selectedUsernames = Array.from(selectedSet);
    renderSubAdminsList(getFilteredSubAdmins());
}

window.toggleSubAdminSelection = toggleSubAdminSelection;

function openBatchManageSubAdminsModal() {
    const selectedSubAdmins = subAdminManagementState.list.filter(admin =>
        subAdminManagementState.selectedUsernames.includes(admin.username),
    );

    if (selectedSubAdmins.length === 0) {
        showModal('提示', '请先勾选要批量管理的副管理员');
        return;
    }

    const modalContent = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 16px;">批量管理副管理员</h3>
            <div style="margin-bottom: 16px; padding: 12px 14px; border-radius: 10px; background: #f6f8fc; color: #445; line-height: 1.8;">
                已选择 <strong>${selectedSubAdmins.length}</strong> 个副管理员：${selectedSubAdmins.map(admin => admin.username).join('、')}
            </div>
            <div class="form-group" style="margin-bottom: 18px;">
                <label>批量操作</label>
                <select id="sub-admin-batch-action" class="form-input">
                    <option value="update-province">批量修改管理省份</option>
                    <option value="update-permissions">批量设置权限</option>
                    <option value="delete">批量删除</option>
                </select>
            </div>
            <div class="form-group" id="sub-admin-batch-province-group" style="margin-bottom: 18px;">
                <label>管理省份</label>
                <select id="sub-admin-batch-province" class="form-input">
                    <option value="">请选择省份</option>
                    ${PROVINCES.map(province => `<option value="${province}">${province}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" id="sub-admin-batch-permissions-group" style="display: none; margin-bottom: 18px;">
                <label>权限设置</label>
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; max-height: 260px; overflow-y: auto;">
                    ${Object.keys(ADMIN_PERMISSIONS)
                        .filter(key => key !== 'all' && ['users', 'auth-codes', 'account'].includes(key))
                        .map(
                            key => `
                                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer;">
                                    <input type="checkbox" name="sub-admin-batch-permissions" value="${key}" style="margin-right: 8px;">
                                    <span>${ADMIN_PERMISSIONS[key]}</span>
                                </label>
                            `,
                        )
                        .join('')}
                </div>
            </div>
            <div id="sub-admin-batch-delete-tip" style="display: none; margin-bottom: 18px; padding: 12px 14px; border-radius: 10px; background: #fff5f5; color: #c0392b; line-height: 1.7;">
                批量删除后不可恢复，请确认所选账号无误。
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="button" class="btn btn-primary" onclick="executeBatchManageSubAdmins()">执行操作</button>
            </div>
        </div>
    `;

    showModal('批量管理副管理员', modalContent);

    const actionSelect = document.getElementById('sub-admin-batch-action');
    if (actionSelect) {
        actionSelect.addEventListener('change', toggleBatchManageFields);
        toggleBatchManageFields();
    }
}

window.openBatchManageSubAdminsModal = openBatchManageSubAdminsModal;

function toggleBatchManageFields() {
    const action = document.getElementById('sub-admin-batch-action')?.value;
    const provinceGroup = document.getElementById('sub-admin-batch-province-group');
    const permissionsGroup = document.getElementById('sub-admin-batch-permissions-group');
    const deleteTip = document.getElementById('sub-admin-batch-delete-tip');

    if (provinceGroup) {
        provinceGroup.style.display = action === 'update-province' ? 'block' : 'none';
    }
    if (permissionsGroup) {
        permissionsGroup.style.display = action === 'update-permissions' ? 'block' : 'none';
    }
    if (deleteTip) {
        deleteTip.style.display = action === 'delete' ? 'block' : 'none';
    }
}

window.toggleBatchManageFields = toggleBatchManageFields;

async function executeBatchManageSubAdmins() {
    const selectedUsernames = [...subAdminManagementState.selectedUsernames];
    if (selectedUsernames.length === 0) {
        showModal('提示', '请先选择要批量管理的副管理员');
        return;
    }

    const action = document.getElementById('sub-admin-batch-action')?.value;
    const currentUsername = getCurrentAdminInfo().username;
    if (selectedUsernames.includes(currentUsername) && action === 'delete') {
        showModal('错误', '批量删除中不能包含当前登录账户');
        return;
    }

    const allowedPermissions = ['users', 'auth-codes', 'account'];
    let updatePayload = null;

    if (action === 'update-province') {
        const province = document.getElementById('sub-admin-batch-province')?.value || '';
        if (!province) {
            showModal('输入错误', '请选择要批量设置的管理省份');
            return;
        }
        updatePayload = { province, updatedBy: currentUsername };
    }

    if (action === 'update-permissions') {
        const permissions = Array.from(
            document.querySelectorAll('input[name="sub-admin-batch-permissions"]:checked'),
        )
            .map(item => item.value)
            .filter(permission => allowedPermissions.includes(permission));

        if (permissions.length === 0) {
            showModal('输入错误', '请至少选择一项权限');
            return;
        }
        updatePayload = { permissions, updatedBy: currentUsername };
    }

    if (action === 'delete' && !confirm(`确定要批量删除选中的 ${selectedUsernames.length} 个副管理员吗？此操作不可恢复。`)) {
        return;
    }

    const encounteredErrors = [];

    try {
        if (action === 'delete') {
            for (const username of selectedUsernames) {
                if (window.apiService && typeof window.apiService.deleteAdmin === 'function') {
                    try {
                        await window.apiService.deleteAdmin(username);
                    } catch (error) {
                        console.warn(`删除副管理员 ${username} 失败，继续同步本地缓存:`, error);
                        encounteredErrors.push(username);
                    }
                }
            }
        } else {
            for (const username of selectedUsernames) {
                if (window.apiService && typeof window.apiService.updateAdmin === 'function') {
                    try {
                        await window.apiService.updateAdmin(username, updatePayload);
                    } catch (error) {
                        console.warn(`更新副管理员 ${username} 失败，继续同步本地缓存:`, error);
                        encounteredErrors.push(username);
                    }
                }
            }
        }

        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        accounts.admin = Array.isArray(accounts.admin) ? accounts.admin : [];

        if (action === 'delete') {
            accounts.admin = accounts.admin.filter(
                acc => !selectedUsernames.includes(acc.username) || acc.role !== 'sub',
            );
            selectedUsernames.forEach(username => {
                localStorage.removeItem(`adminConfig_${username}`);
            });
        } else {
            accounts.admin = accounts.admin.map(acc => {
                if (!selectedUsernames.includes(acc.username) || acc.role !== 'sub') {
                    return acc;
                }
                return {
                    ...acc,
                    ...updatePayload,
                    updatedAt: new Date().toISOString(),
                };
            });

            selectedUsernames.forEach(username => {
                const adminConfig = JSON.parse(localStorage.getItem(`adminConfig_${username}`) || '{}');
                if (action === 'update-province') {
                    adminConfig.province = updatePayload.province;
                }
                localStorage.setItem(
                    `adminConfig_${username}`,
                    JSON.stringify({
                        ...adminConfig,
                        updatedAt: new Date().toISOString(),
                    }),
                );
            });
        }

        localStorage.setItem('accounts', JSON.stringify(accounts));

        subAdminManagementState.selectedUsernames = [];
        closeModal();
        showModal(
            encounteredErrors.length > 0 ? '部分完成' : '成功',
            encounteredErrors.length > 0
                ? `批量操作已执行，本地缓存已更新，但以下账号的接口请求失败：${encounteredErrors.join('、')}`
                : action === 'delete'
                    ? '批量删除成功！'
                    : '批量操作已完成！',
        );
        loadSubAdminsList();
    } catch (error) {
        console.error('批量管理副管理员失败:', error);
        showModal('操作失败', `发生错误：${error.message}`);
    }
}

window.executeBatchManageSubAdmins = executeBatchManageSubAdmins;

// 归一化副管理员数据
function parseAdminPermissions(rawPermissions) {
    if (Array.isArray(rawPermissions)) {
        return rawPermissions;
    }
    if (typeof rawPermissions === 'string') {
        const trimmed = rawPermissions.trim();
        if (!trimmed) {
            return [];
        }
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? parsed : [];
            } catch (err) {
                console.warn('解析权限失败:', err);
            }
        }
        return trimmed
            .split(',')
            .map(p => p.replace(/[\[\]"]/g, '').trim())
            .filter(Boolean);
    }
    return [];
}

function normalizeSubAdmin(admin) {
    if (!admin) {
        return null;
    }
    const normalized = {
        id: admin.id || admin._id || admin.uuid || admin.userId || admin.username,
        username: admin.username || admin.account || admin.loginName || '',
        nickname: admin.nickname || admin.displayName || '',
        email: admin.email || admin.contactEmail || '',
        province: admin.province || admin.region || admin.provinceName || '',
        role: admin.role || admin.adminRole || 'sub',
        permissions: parseAdminPermissions(admin.permissions),
        createdAt:
            admin.createdAt || admin.created_at || admin.createdTime || admin.createTime || null,
        status: admin.status !== undefined ? admin.status : 1,
        createdBy: admin.createdBy || admin.created_by || null,
    };
    if (!normalized.username) {
        return null;
    }
    return normalized;
}

// 加载副管理员列表
async function loadSubAdminsList() {
    const listContainer = document.getElementById('sub-admins-list');
    if (!listContainer) {
        return;
    }

    listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2em;"></i>
            <p style="margin-top: 10px;">正在加载副管理员列表...</p>
        </div>
    `;

    let subAdmins = [];
    let usedRemoteData = false;

    const extractDataList = resp => {
        if (!resp) {
            return [];
        }
        if (Array.isArray(resp.list)) {
            return resp.list;
        }
        if (Array.isArray(resp.data?.list)) {
            return resp.data.list;
        }
        if (Array.isArray(resp.data)) {
            return resp.data;
        }
        if (Array.isArray(resp.admins)) {
            return resp.admins;
        }
        if (Array.isArray(resp.subAdmins)) {
            return resp.subAdmins;
        }
        if (Array.isArray(resp)) {
            return resp;
        }
        return [];
    };

    // 优先尝试从后端API获取
    if (window.apiService && typeof window.apiService.getAdminAdmins === 'function') {
        try {
            const response = await window.apiService.getAdminAdmins({ role: 'sub', status: 1 });
            const adminList = extractDataList(response);

            subAdmins = adminList
                .map(normalizeSubAdmin)
                .filter(admin => admin && (admin.role === 'sub' || admin.role === '副管理员'));

            cacheSubAdminsLocally(subAdmins);
            usedRemoteData = true;
        } catch (error) {
            console.warn('从后端获取副管理员列表失败，使用本地数据:', error);
            showNotification('无法加载最新的副管理员列表，已使用本地缓存', 'warning');
        }
    }

    // 后端返回为空或请求失败时，回退到本地存储
    if (!usedRemoteData || subAdmins.length === 0) {
        try {
            const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
            subAdmins = (accounts.admin || [])
                .filter(admin => admin.role === 'sub')
                .map(normalizeSubAdmin)
                .filter(Boolean);
            if (!usedRemoteData && subAdmins.length === 0) {
                console.warn('本地缓存中也没有副管理员数据');
            }
        } catch (error) {
            console.error('读取本地副管理员列表失败:', error);
            subAdmins = [];
            showNotification('无法读取副管理员列表缓存，请重新登录后重试', 'error');
        }
    }

    subAdminManagementState.list = subAdmins;
    syncSelectedSubAdminsWithList();
    renderSubAdminsList(getFilteredSubAdmins());
}

function cacheSubAdminsLocally(subAdmins) {
    try {
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        const existingAdmins = Array.isArray(accounts.admin)
            ? accounts.admin.filter(acc => acc.role !== 'sub')
            : [];
        const cachedSubAdmins = subAdmins.map(admin => ({
            username: admin.username,
            role: 'sub',
            permissions: Array.isArray(admin.permissions) ? admin.permissions : [],
            province: admin.province || null,
            nickname: admin.nickname || '',
            email: admin.email || '',
            createdAt: admin.createdAt || new Date().toISOString(),
            createdBy: admin.createdBy || null,
        }));

        accounts.admin = [...existingAdmins, ...cachedSubAdmins];
        localStorage.setItem('accounts', JSON.stringify(accounts));

        cachedSubAdmins.forEach(admin => {
            const config = {
                nickname: admin.nickname,
                email: admin.email,
                province: admin.province,
                cachedFromServer: true,
                updatedAt: new Date().toISOString(),
            };
            localStorage.setItem(`adminConfig_${admin.username}`, JSON.stringify(config));
        });
    } catch (error) {
        console.warn('缓存副管理员数据失败:', error);
    }
}

// 显示创建副管理员模态框
function showCreateSubAdminModal() {
    const modalContent = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 20px;">创建副管理员</h3>
            <form id="create-sub-admin-form">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>用户名 <span style="color: red;">*</span></label>
                    <input type="text" id="new-sub-admin-username" class="form-input" required placeholder="请输入用户名">
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>密码 <span style="color: red;">*</span></label>
                    <input type="password" id="new-sub-admin-password" class="form-input" required placeholder="请输入密码（至少8位）" minlength="8">
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>昵称</label>
                    <input type="text" id="new-sub-admin-nickname" class="form-input" placeholder="请输入昵称">
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>邮箱</label>
                    <input type="email" id="new-sub-admin-email" class="form-input" placeholder="请输入邮箱">
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>管理省份 <span style="color: red;">*</span></label>
                    <select id="new-sub-admin-province" class="form-input" required>
                        <option value="">请选择省份</option>
                        ${PROVINCES.map(province => `<option value="${province}">${province}</option>`).join('')}
                    </select>
                    <small style="color: #666; display: block; margin-top: 5px;">副管理员只能管理该省份的授权码和用户</small>
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>权限设置 <span style="color: red;">*</span></label>
                    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; max-height: 300px; overflow-y: auto;">
                        <p style="color: #666; font-size: 0.9em; margin-bottom: 10px; padding: 8px; background: #f0f4ff; border-radius: 4px;">
                            <i class="fas fa-info-circle"></i> 副管理员只能拥有以下权限：
                        </p>
                        ${Object.keys(ADMIN_PERMISSIONS)
        .filter(
            p => p !== 'all' && ['users', 'auth-codes', 'account'].includes(p),
        )
        .map(
            key => `
                            <label style="display: flex; align-items: center; padding: 8px; cursor: pointer;">
                                <input type="checkbox" name="sub-admin-permissions" value="${key}" checked style="margin-right: 8px;">
                                <span>${ADMIN_PERMISSIONS[key]}</span>
                            </label>
                        `,
        )
        .join('')}
                    </div>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                    <button type="submit" class="btn btn-primary">创建</button>
                </div>
            </form>
        </div>
    `;

    showModal('创建副管理员', modalContent);

    // 绑定表单提交事件
    const form = document.getElementById('create-sub-admin-form');
    if (form) {
        form.onsubmit = e => {
            e.preventDefault();
            createSubAdmin();
        };
    }
}

window.showCreateSubAdminModal = showCreateSubAdminModal;

// 切换所有权限
function toggleAllPermissions() {
    const selectAll = document.getElementById('select-all-permissions');
    const checkboxes = document.querySelectorAll('input[name="sub-admin-permissions"]');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
}

// 创建副管理员
async function createSubAdmin() {
    try {
        const username = document.getElementById('new-sub-admin-username').value.trim();
        const password = document.getElementById('new-sub-admin-password').value;
        const nickname = document.getElementById('new-sub-admin-nickname').value.trim();
        const email = document.getElementById('new-sub-admin-email').value.trim();
        const province = document.getElementById('new-sub-admin-province').value;

        // 验证输入
        if (!username) {
            showModal('输入错误', '请输入用户名');
            return;
        }

        if (!password || password.length < 8) {
            showModal('输入错误', '密码长度至少为8位');
            return;
        }

        if (!province) {
            showModal('输入错误', '请选择管理省份');
            return;
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showModal('输入错误', '请输入有效的邮箱地址');
            return;
        }

        // 获取选中的权限
        const checkedPermissions = Array.from(
            document.querySelectorAll('input[name="sub-admin-permissions"]:checked'),
        ).map(cb => cb.value);

        // 副管理员默认只能有这三个权限：users, auth-codes, account
        // 即使选择了其他权限，也只保留这三个
        const allowedPermissions = ['users', 'auth-codes', 'account'];
        const finalPermissions = checkedPermissions.filter(p => allowedPermissions.includes(p));

        if (finalPermissions.length === 0) {
            showModal('输入错误', '副管理员必须至少拥有用户管理、授权码管理或账号管理权限');
            return;
        }

        // 使用API服务创建副管理员（统一存储结构）
        if (window.apiService) {
            try {
                const adminData = {
                    username,
                    password,
                    role: 'sub',
                    province,
                    permissions: finalPermissions,
                    nickname: nickname || null,
                    email: email || null,
                    createdBy: getCurrentAdminInfo().username,
                };

                const newAdmin = await window.apiService.createAdmin(adminData);

                // 不再需要单独保存到localStorage，因为数据已经保存在数据库中
                // 但为了兼容性，仍然保存配置信息（用于头像等）
                const adminConfig = {
                    createdAt: new Date().toISOString(),
                };
                localStorage.setItem(`adminConfig_${username}`, JSON.stringify(adminConfig));

                // 迁移旧数据：如果旧数据结构中有这个管理员，也更新它
                try {
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                    if (accounts.admin) {
                        const oldAdminIndex = accounts.admin.findIndex(
                            a => a.username === username,
                        );
                        if (oldAdminIndex !== -1) {
                            accounts.admin[oldAdminIndex] = {
                                ...accounts.admin[oldAdminIndex],
                                ...newAdmin,
                            };
                        } else {
                            accounts.admin.push(newAdmin);
                        }
                        localStorage.setItem('accounts', JSON.stringify(accounts));
                    }
                } catch (e) {
                    console.warn('迁移旧数据失败:', e);
                }

                closeModal();
                showModal(
                    '成功',
                    `副管理员创建成功！<br><br>用户名：${username}<br>管理省份：${province}`,
                );
                loadSubAdminsList();
                return;
            } catch (error) {
                console.error('使用API服务创建失败:', error);

                // 如果是明确的业务错误（如用户名已存在），直接显示错误，不降级
                const errorMessage = error.message || '';
                if (
                    errorMessage.includes('用户名已存在')
                    || errorMessage.includes('已存在')
                    || error.code === 'DUPLICATE_USERNAME'
                    || error.status === 400
                ) {
                    showModal('错误', errorMessage || '创建失败：该用户名已存在，请使用其他用户名');
                    return;
                }

                // 如果是其他明确的业务错误，也直接显示
                if (
                    error.code
                    && ['VALIDATION_ERROR', 'INVALID_INPUT', 'DUPLICATE_ENTRY'].includes(error.code)
                ) {
                    showModal('错误', errorMessage || '创建失败，请检查输入信息');
                    return;
                }

                // 如果是网络错误或服务器错误，降级到旧方法
                if (
                    error.code === 'NETWORK_ERROR'
                    || error.code === 'TIMEOUT'
                    || (error.status && error.status >= 500)
                ) {
                    console.warn('API服务不可用，降级到本地存储方案');
                    // 继续执行降级方案
                } else {
                    // 其他错误也显示给用户
                    showModal('错误', errorMessage || '创建失败，请稍后重试');
                    return;
                }
            }
        }

        // 降级方案：使用旧的数据结构（兼容性）
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        const existingAdmin = accounts.admin?.find(acc => acc.username === username);

        if (existingAdmin) {
            showModal('错误', '该用户名已存在');
            return;
        }

        // 创建副管理员账户
        const newSubAdmin = {
            username,
            password,
            role: 'sub',
            permissions: finalPermissions,
            province,
            createdAt: new Date().toISOString(),
            createdBy: getCurrentAdminInfo().username,
        };

        // 保存到accounts（旧结构）
        if (!accounts.admin) {
            accounts.admin = [];
        }
        accounts.admin.push(newSubAdmin);
        localStorage.setItem('accounts', JSON.stringify(accounts));

        // 同时保存到新结构（统一存储）
        const admins = JSON.parse(localStorage.getItem('admins') || '[]');
        admins.push({
            id: `admin_${Date.now().toString()}`,
            ...newSubAdmin,
        });
        localStorage.setItem('admins', JSON.stringify(admins));

        // 保存副管理员配置
        const adminConfig = {
            nickname,
            email,
            createdAt: new Date().toISOString(),
        };
        localStorage.setItem(`adminConfig_${username}`, JSON.stringify(adminConfig));

        closeModal();
        showModal('成功', `副管理员创建成功！<br><br>用户名：${username}<br>管理省份：${province}`);
        loadSubAdminsList();
    } catch (error) {
        console.error('创建副管理员失败:', error);
        showModal('创建失败', `发生错误：${error.message}`);
    }
}

// 编辑副管理员
function editSubAdmin(username) {
    try {
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        const subAdmin = accounts.admin?.find(
            acc => acc.username === username && acc.role === 'sub',
        );

        if (!subAdmin) {
            showModal('错误', '找不到该副管理员');
            return;
        }

        const adminConfig = JSON.parse(localStorage.getItem(`adminConfig_${username}`) || '{}');

        const modalContent = `
            <div style="padding: 20px;">
                <h3 style="margin-bottom: 20px;">编辑副管理员</h3>
                <form id="edit-sub-admin-form">
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label>用户名</label>
                        <input type="text" value="${subAdmin.username}" readonly class="form-input" style="background: #f5f5f5;">
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label>昵称</label>
                        <input type="text" id="edit-sub-admin-nickname" class="form-input" value="${adminConfig.nickname || ''}" placeholder="请输入昵称">
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label>邮箱</label>
                        <input type="email" id="edit-sub-admin-email" class="form-input" value="${adminConfig.email || ''}" placeholder="请输入邮箱">
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label>管理省份 <span style="color: red;">*</span></label>
                        <select id="edit-sub-admin-province" class="form-input" required>
                            <option value="">请选择省份</option>
                            ${PROVINCES.map(p => `<option value="${p}" ${subAdmin.province === p ? 'selected' : ''}>${p}</option>`).join('')}
                        </select>
                        <small style="color: #666; display: block; margin-top: 5px;">副管理员只能管理该省份的授权码和用户</small>
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label>权限设置 <span style="color: red;">*</span></label>
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; max-height: 300px; overflow-y: auto;">
                            <p style="color: #666; font-size: 0.9em; margin-bottom: 10px; padding: 8px; background: #f0f4ff; border-radius: 4px;">
                                <i class="fas fa-info-circle"></i> 副管理员只能拥有以下权限：
                            </p>
                            ${Object.keys(ADMIN_PERMISSIONS)
        .filter(
            p =>
                p !== 'all'
                                        && ['users', 'auth-codes', 'account'].includes(p),
        )
        .map(
            key => `
                                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer;">
                                    <input type="checkbox" name="edit-sub-admin-permissions" value="${key}" ${subAdmin.permissions.includes(key) ? 'checked' : ''} style="margin-right: 8px;">
                                    <span>${ADMIN_PERMISSIONS[key]}</span>
                                </label>
                            `,
        )
        .join('')}
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                        <button type="submit" class="btn btn-primary">保存</button>
                    </div>
                </form>
            </div>
        `;

        showModal('编辑副管理员', modalContent);

        // 绑定表单提交事件
        const form = document.getElementById('edit-sub-admin-form');
        if (form) {
            form.onsubmit = e => {
                e.preventDefault();
                saveSubAdmin(username);
            };
        }
    } catch (error) {
        console.error('编辑副管理员失败:', error);
        showModal('错误', `发生错误：${error.message}`);
    }
}

window.editSubAdmin = editSubAdmin;

// 保存副管理员修改
async function saveSubAdmin(username) {
    try {
        const nickname = document.getElementById('edit-sub-admin-nickname').value.trim();
        const email = document.getElementById('edit-sub-admin-email').value.trim();
        const province = document.getElementById('edit-sub-admin-province').value;

        // 验证邮箱格式
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showModal('输入错误', '请输入有效的邮箱地址');
            return;
        }

        if (!province) {
            showModal('输入错误', '请选择管理省份');
            return;
        }

        // 获取选中的权限
        const checkedPermissions = Array.from(
            document.querySelectorAll('input[name="edit-sub-admin-permissions"]:checked'),
        ).map(cb => cb.value);

        // 副管理员只能有这三个权限：users, auth-codes, account
        const allowedPermissions = ['users', 'auth-codes', 'account'];
        const finalPermissions = checkedPermissions.filter(p => allowedPermissions.includes(p));

        if (finalPermissions.length === 0) {
            showModal('输入错误', '副管理员必须至少拥有用户管理、授权码管理或账号管理权限');
            return;
        }

        // 优先尝试使用后端 API 更新
        if (window.apiService) {
            try {
                const adminData = {
                    nickname,
                    email,
                    province,
                    permissions: finalPermissions,
                    updatedBy: getCurrentAdminInfo().username,
                };

                // 尝试调用后端 API
                if (typeof window.apiService.updateAdmin === 'function') {
                    await window.apiService.updateAdmin(username, adminData);
                } else {
                    // 如果 apiService 没有 updateAdmin 方法，直接调用 fetch
                    const token = sessionStorage.getItem('admin_token');
                    const response = await fetch(`/api/admin/sub-admins/${encodeURIComponent(username)}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify(adminData),
                    });

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.message || '更新失败');
                    }
                }

                // 更新本地配置（用于头像等）
                const adminConfig = JSON.parse(localStorage.getItem(`adminConfig_${username}`) || '{}');
                adminConfig.nickname = nickname;
                adminConfig.email = email;
                adminConfig.updatedAt = new Date().toISOString();
                localStorage.setItem(`adminConfig_${username}`, JSON.stringify(adminConfig));

                // 同时更新本地 accounts 以保持兼容性
                const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                const adminIndex = accounts.admin?.findIndex(acc => acc.username === username);
                if (adminIndex !== -1 && accounts.admin[adminIndex].role === 'sub') {
                    accounts.admin[adminIndex].permissions = finalPermissions;
                    accounts.admin[adminIndex].province = province;
                    accounts.admin[adminIndex].nickname = nickname;
                    accounts.admin[adminIndex].email = email;
                    accounts.admin[adminIndex].updatedAt = new Date().toISOString();
                    accounts.admin[adminIndex].updatedBy = getCurrentAdminInfo().username;
                    localStorage.setItem('accounts', JSON.stringify(accounts));
                }

                closeModal();
                showModal('成功', '副管理员信息已更新！');
                loadSubAdminsList();
                return;
            } catch (error) {
                console.error('使用API服务更新失败:', error);
                // 如果是网络错误或服务器错误，降级到本地存储方案
                if (
                    error.code === 'NETWORK_ERROR'
                    || error.code === 'TIMEOUT'
                    || (error.status && error.status >= 500)
                ) {
                    console.warn('API服务不可用，降级到本地存储方案');
                    // 继续执行降级方案
                } else {
                    // 其他错误显示给用户
                    showModal('错误', error.message || '更新失败，请稍后重试');
                    return;
                }
            }
        }

        // 降级方案：仅更新本地存储
        // 更新accounts中的权限和省份
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        const adminIndex = accounts.admin?.findIndex(acc => acc.username === username);

        if (adminIndex !== -1 && accounts.admin[adminIndex].role === 'sub') {
            accounts.admin[adminIndex].permissions = finalPermissions;
            accounts.admin[adminIndex].province = province;
            accounts.admin[adminIndex].nickname = nickname;
            accounts.admin[adminIndex].email = email;
            accounts.admin[adminIndex].updatedAt = new Date().toISOString();
            accounts.admin[adminIndex].updatedBy = getCurrentAdminInfo().username;
            localStorage.setItem('accounts', JSON.stringify(accounts));
        }

        // 更新配置
        const adminConfig = JSON.parse(localStorage.getItem(`adminConfig_${username}`) || '{}');
        adminConfig.nickname = nickname;
        adminConfig.email = email;
        adminConfig.updatedAt = new Date().toISOString();
        localStorage.setItem(`adminConfig_${username}`, JSON.stringify(adminConfig));

        closeModal();
        showModal('成功', '副管理员信息已更新！');
        loadSubAdminsList();
    } catch (error) {
        console.error('保存副管理员失败:', error);
        showModal('保存失败', `发生错误：${error.message}`);
    }
}

// 删除副管理员
async function deleteSubAdmin(username) {
    if (username === getCurrentAdminInfo().username) {
        showModal('错误', '不能删除自己的账户');
        return;
    }

    if (!confirm(`确定要删除副管理员 "${username}" 吗？此操作不可恢复。`)) {
        return;
    }

    try {
        // 优先尝试使用后端 API
        if (window.apiService) {
            try {
                await window.apiService.deleteAdmin(username);
                
                // 更新本地 accounts 以保持兼容性
                const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
                accounts.admin = accounts.admin.filter(
                    acc => acc.username !== username || acc.role !== 'sub',
                );
                localStorage.setItem('accounts', JSON.stringify(accounts));

                subAdminManagementState.selectedUsernames = subAdminManagementState.selectedUsernames.filter(
                    item => item !== username,
                );
                showModal('成功', '副管理员已删除');
                loadSubAdminsList();
                return;
            } catch (error) {
                console.error('使用API服务删除失败:', error);
                // 降级到本地存储方案
            }
        }

        // 降级方案：仅更新本地存储
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        accounts.admin = accounts.admin.filter(
            acc => acc.username !== username || acc.role !== 'sub',
        );
        localStorage.setItem('accounts', JSON.stringify(accounts));

        subAdminManagementState.selectedUsernames = subAdminManagementState.selectedUsernames.filter(
            item => item !== username,
        );
        showModal('成功', '副管理员已删除');
        loadSubAdminsList();
    } catch (error) {
        console.error('删除副管理员失败:', error);
        showModal('删除失败', `发生错误：${error.message}`);
    }
}

window.deleteSubAdmin = deleteSubAdmin;

// 头像裁剪编辑器
const adminAvatarCropState = {
    imageData: '',
    sourceImage: null,
    scale: 1,
    minScale: 1,
    maxScale: 4,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastPointerId: null,
    pinchDistance: 0,
    pinchStartScale: 1,
};

function getAdminAvatarCropSize() {
    return window.innerWidth <= 640 ? 232 : 280;
}

function calculateAdminAvatarMinScale(image) {
    const cropSize = getAdminAvatarCropSize();
    return Math.max(cropSize / image.naturalWidth, cropSize / image.naturalHeight, 0.4);
}

function syncAdminAvatarZoomSlider() {
    const slider = document.getElementById('admin-avatar-crop-zoom');
    if (slider) {
        slider.value = String(adminAvatarCropState.scale);
    }
}

function clampAdminAvatarOffsets() {
    const image = adminAvatarCropState.sourceImage;
    if (!image) {
        return;
    }

    const cropSize = getAdminAvatarCropSize();
    const scaledWidth = image.naturalWidth * adminAvatarCropState.scale;
    const scaledHeight = image.naturalHeight * adminAvatarCropState.scale;
    const maxOffsetX = Math.max(0, (scaledWidth - cropSize) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - cropSize) / 2);

    adminAvatarCropState.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, adminAvatarCropState.offsetX));
    adminAvatarCropState.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, adminAvatarCropState.offsetY));
}

function renderAdminAvatarCropImage() {
    const cropImage = document.getElementById('admin-avatar-crop-image');
    if (!cropImage || !adminAvatarCropState.sourceImage) {
        return;
    }

    cropImage.style.width = `${adminAvatarCropState.sourceImage.naturalWidth}px`;
    cropImage.style.height = `${adminAvatarCropState.sourceImage.naturalHeight}px`;
    cropImage.style.transform = `translate(calc(-50% + ${adminAvatarCropState.offsetX}px), calc(-50% + ${adminAvatarCropState.offsetY}px)) scale(${adminAvatarCropState.scale})`;
}

function updateAdminAvatarCropPreview() {
    const canvas = document.getElementById('admin-avatar-crop-preview');
    const image = adminAvatarCropState.sourceImage;
    if (!canvas || !image) {
        return;
    }

    const cropSize = getAdminAvatarCropSize();
    const previewSize = 220;
    const ctx = canvas.getContext('2d');
    canvas.width = previewSize;
    canvas.height = previewSize;

    ctx.clearRect(0, 0, previewSize, previewSize);
    ctx.save();
    ctx.beginPath();
    ctx.arc(previewSize / 2, previewSize / 2, previewSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const scaleRatio = previewSize / cropSize;
    const drawWidth = image.naturalWidth * adminAvatarCropState.scale * scaleRatio;
    const drawHeight = image.naturalHeight * adminAvatarCropState.scale * scaleRatio;
    const drawX = previewSize / 2 - drawWidth / 2 + adminAvatarCropState.offsetX * scaleRatio;
    const drawY = previewSize / 2 - drawHeight / 2 + adminAvatarCropState.offsetY * scaleRatio;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
}

function updateAdminAvatarCropScale(nextScale) {
    if (!Number.isFinite(nextScale)) {
        return;
    }

    adminAvatarCropState.scale = Math.min(
        adminAvatarCropState.maxScale,
        Math.max(adminAvatarCropState.minScale, nextScale),
    );
    syncAdminAvatarZoomSlider();
    clampAdminAvatarOffsets();
    renderAdminAvatarCropImage();
    updateAdminAvatarCropPreview();
}

function openAdminAvatarCropModal(imageData) {
    const modal = document.getElementById('admin-avatar-crop-modal');
    const cropImage = document.getElementById('admin-avatar-crop-image');
    const slider = document.getElementById('admin-avatar-crop-zoom');
    if (!modal || !cropImage || !slider) {
        return;
    }

    const image = new Image();
    image.onload = () => {
        const minScale = calculateAdminAvatarMinScale(image);
        adminAvatarCropState.imageData = imageData;
        adminAvatarCropState.sourceImage = image;
        adminAvatarCropState.scale = minScale;
        adminAvatarCropState.minScale = minScale;
        adminAvatarCropState.maxScale = Math.max(minScale + 2.5, minScale * 3);
        adminAvatarCropState.offsetX = 0;
        adminAvatarCropState.offsetY = 0;
        adminAvatarCropState.isDragging = false;
        adminAvatarCropState.lastPointerId = null;
        adminAvatarCropState.pinchDistance = 0;
        adminAvatarCropState.pinchStartScale = minScale;

        slider.min = String(minScale);
        slider.max = String(adminAvatarCropState.maxScale);
        slider.step = '0.01';
        slider.value = String(minScale);

        cropImage.src = imageData;
        modal.style.display = 'flex';
        renderAdminAvatarCropImage();
        updateAdminAvatarCropPreview();
    };
    image.src = imageData;
}

function closeAdminAvatarCropModal() {
    const modal = document.getElementById('admin-avatar-crop-modal');
    const input = document.getElementById('admin-avatar-input');
    if (modal) {
        modal.style.display = 'none';
    }
    if (input) {
        input.value = '';
    }

    adminAvatarCropState.imageData = '';
    adminAvatarCropState.sourceImage = null;
    adminAvatarCropState.offsetX = 0;
    adminAvatarCropState.offsetY = 0;
    adminAvatarCropState.isDragging = false;
    adminAvatarCropState.lastPointerId = null;
    adminAvatarCropState.pinchDistance = 0;
}

function applyAdminAvatarCrop() {
    const image = adminAvatarCropState.sourceImage;
    if (!image) {
        return;
    }

    const cropSize = getAdminAvatarCropSize();
    const outputSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const ratio = outputSize / cropSize;
    const drawWidth = image.naturalWidth * adminAvatarCropState.scale * ratio;
    const drawHeight = image.naturalHeight * adminAvatarCropState.scale * ratio;
    const drawX = outputSize / 2 - drawWidth / 2 + adminAvatarCropState.offsetX * ratio;
    const drawY = outputSize / 2 - drawHeight / 2 + adminAvatarCropState.offsetY * ratio;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();

    const avatarData = canvas.toDataURL('image/png');
    const avatarEl = document.getElementById('admin-avatar');
    if (avatarEl) {
        avatarEl.src = avatarData;
    }

    const username = getAdminAvatarSyncUsername();
    const adminConfig = JSON.parse(localStorage.getItem(`adminConfig_${username}`) || '{}');
    adminConfig.avatar = avatarData;
    localStorage.setItem(`adminConfig_${username}`, JSON.stringify(adminConfig));

    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        if (loginInfo.user) {
            loginInfo.user.avatar = avatarData;
            sessionStorage.setItem('loginInfo', JSON.stringify(loginInfo));
        }
    } catch (error) {
        console.warn('更新管理员登录头像失败:', error);
    }

    broadcastAdminAvatarUpdate(avatarData);

    closeAdminAvatarCropModal();
    showModal('成功', '头像上传成功！');
}

function setupAdminAvatarCropper() {
    const cropArea = document.getElementById('admin-avatar-crop-area');
    const slider = document.getElementById('admin-avatar-crop-zoom');
    const modal = document.getElementById('admin-avatar-crop-modal');
    if (!cropArea || !slider || cropArea.dataset.bound === 'true') {
        return;
    }

    cropArea.dataset.bound = 'true';
    slider.addEventListener('input', event => {
        updateAdminAvatarCropScale(parseFloat(event.target.value));
    });

    cropArea.addEventListener('wheel', event => {
        if (!adminAvatarCropState.sourceImage) {
            return;
        }
        event.preventDefault();
        updateAdminAvatarCropScale(adminAvatarCropState.scale + (event.deltaY < 0 ? 0.08 : -0.08));
    }, { passive: false });

    cropArea.addEventListener('pointerdown', event => {
        if (!adminAvatarCropState.sourceImage) {
            return;
        }
        adminAvatarCropState.isDragging = true;
        adminAvatarCropState.lastPointerId = event.pointerId;
        adminAvatarCropState.dragStartX = event.clientX - adminAvatarCropState.offsetX;
        adminAvatarCropState.dragStartY = event.clientY - adminAvatarCropState.offsetY;
        cropArea.classList.add('is-dragging');
        if (cropArea.setPointerCapture) {
            cropArea.setPointerCapture(event.pointerId);
        }
    });

    cropArea.addEventListener('pointermove', event => {
        if (!adminAvatarCropState.isDragging || event.pointerId !== adminAvatarCropState.lastPointerId) {
            return;
        }
        adminAvatarCropState.offsetX = event.clientX - adminAvatarCropState.dragStartX;
        adminAvatarCropState.offsetY = event.clientY - adminAvatarCropState.dragStartY;
        clampAdminAvatarOffsets();
        renderAdminAvatarCropImage();
        updateAdminAvatarCropPreview();
    });

    const endDrag = event => {
        if (event && adminAvatarCropState.lastPointerId !== null && event.pointerId !== adminAvatarCropState.lastPointerId) {
            return;
        }
        adminAvatarCropState.isDragging = false;
        adminAvatarCropState.lastPointerId = null;
        cropArea.classList.remove('is-dragging');
        if (event && cropArea.releasePointerCapture) {
            try {
                cropArea.releasePointerCapture(event.pointerId);
            } catch (_error) {
                // ignore
            }
        }
    };

    cropArea.addEventListener('pointerup', endDrag);
    cropArea.addEventListener('pointerleave', endDrag);
    cropArea.addEventListener('pointercancel', endDrag);

    cropArea.addEventListener('touchstart', event => {
        if (event.touches.length < 2) {
            return;
        }
        event.preventDefault();
        adminAvatarCropState.isDragging = false;
        adminAvatarCropState.pinchDistance = Math.hypot(
            event.touches[1].clientX - event.touches[0].clientX,
            event.touches[1].clientY - event.touches[0].clientY,
        );
        adminAvatarCropState.pinchStartScale = adminAvatarCropState.scale;
        cropArea.classList.remove('is-dragging');
    }, { passive: false });

    cropArea.addEventListener('touchmove', event => {
        if (event.touches.length < 2) {
            return;
        }
        event.preventDefault();
        const distance = Math.hypot(
            event.touches[1].clientX - event.touches[0].clientX,
            event.touches[1].clientY - event.touches[0].clientY,
        );
        if (!adminAvatarCropState.pinchDistance || !distance) {
            adminAvatarCropState.pinchDistance = distance;
            adminAvatarCropState.pinchStartScale = adminAvatarCropState.scale;
            return;
        }
        updateAdminAvatarCropScale(adminAvatarCropState.pinchStartScale * (distance / adminAvatarCropState.pinchDistance));
    }, { passive: false });

    cropArea.addEventListener('touchend', () => {
        adminAvatarCropState.pinchDistance = 0;
        adminAvatarCropState.pinchStartScale = adminAvatarCropState.scale;
    });
    cropArea.addEventListener('touchcancel', () => {
        adminAvatarCropState.pinchDistance = 0;
        adminAvatarCropState.pinchStartScale = adminAvatarCropState.scale;
    });

    if (modal) {
        modal.addEventListener('click', event => {
            if (event.target === modal) {
                closeAdminAvatarCropModal();
            }
        });
    }

    window.addEventListener('resize', () => {
        if (adminAvatarCropState.sourceImage) {
            clampAdminAvatarOffsets();
            renderAdminAvatarCropImage();
            updateAdminAvatarCropPreview();
        }
    });
}

// 处理管理员头像上传
function handleAdminAvatarUpload(event) {
    if (adminAvatarEditor) {
        openAdminAvatarEditor();
        if (event?.target) {
            event.target.value = '';
        }
        return;
    }

    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const maxFileSize = 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
        showModal('错误', '头像大小不能超过 5MB');
        event.target.value = '';
        return;
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        showModal('错误', '请选择图片文件（JPG、PNG、WEBP）');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        setupAdminAvatarCropper();
        openAdminAvatarCropModal(e.target.result);
    };

    reader.onerror = function () {
        showModal('错误', '读取图片文件失败，请重试');
    };

    reader.readAsDataURL(file);
}

// 保存管理员账号信息
async function saveAdminAccountInfo() {
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        const loginUser = loginInfo.user || {};
        const userId = loginUser.id || loginInfo.userId;
        const username = loginInfo.username || loginUser.username || 'admin';
        const userRole = loginUser.role || loginInfo.role || null;

        if (!userId) {
            showModal('错误', '无法获取用户ID，请重新登录');
            return;
        }

        const nicknameEl = document.getElementById('admin-nickname');
        const emailEl = document.getElementById('admin-email');

        if (!nicknameEl || !emailEl) {
            showModal('错误', '无法找到输入元素，请刷新页面重试');
            return;
        }

        const nickname = nicknameEl.value.trim();
        const email = emailEl.value.trim();

        // 验证邮箱格式
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showModal('输入错误', '请输入有效的邮箱地址');
            return;
        }

        // 如果有API服务，调用API更新数据库
        if (window.apiService && userId) {
            try {
                const updatedAdmin = await window.apiService.updateAdmin(userId, {
                    nickname: nickname || null,
                    email: email || null,
                    role: userRole,
                });

                // 更新登录信息中的用户数据
                const updatedLoginInfo = {
                    ...loginInfo,
                    user: {
                        ...loginInfo.user,
                        nickname: updatedAdmin.nickname,
                        email: updatedAdmin.email,
                    },
                };
                sessionStorage.setItem('loginInfo', JSON.stringify(updatedLoginInfo));

                showModal('保存成功', '账号信息已更新！');
                return;
            } catch (error) {
                console.error('更新管理员信息失败:', error);
                showModal('保存失败', `更新数据库失败：${error.message || '未知错误'}`);
                return;
            }
        }

        // 降级方案：保存到localStorage（兼容旧版本）
        const adminConfig = JSON.parse(localStorage.getItem(`adminConfig_${username}`) || '{}');
        adminConfig.nickname = nickname;
        adminConfig.email = email;
        adminConfig.updatedAt = new Date().toISOString();

        // 保存头像（如果已上传）
        const avatarEl = document.getElementById('admin-avatar');
        if (avatarEl && avatarEl.src && !avatarEl.src.startsWith('https://ui-avatars.com')) {
            adminConfig.avatar = avatarEl.src;
        }

        localStorage.setItem(`adminConfig_${username}`, JSON.stringify(adminConfig));

        showModal('保存成功', '账号信息已更新！');
    } catch (error) {
        console.error('保存管理员账号信息失败:', error);
        showModal('保存失败', `发生错误：${error.message}`);
    }
}

// 修改管理员密码
function changeAdminPassword() {
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        const username = loginInfo.username || 'admin';

        const currentPasswordEl = document.getElementById('admin-current-password');
        const newPasswordEl = document.getElementById('admin-new-password');
        const confirmPasswordEl = document.getElementById('admin-confirm-password');

        if (!currentPasswordEl || !newPasswordEl || !confirmPasswordEl) {
            showModal('错误', '无法找到输入元素，请刷新页面重试');
            return;
        }

        const currentPassword = currentPasswordEl.value;
        const newPassword = newPasswordEl.value;
        const confirmPassword = confirmPasswordEl.value;

        // 验证输入
        if (!currentPassword) {
            showModal('输入错误', '请输入当前密码');
            return;
        }

        if (!newPassword) {
            showModal('输入错误', '请输入新密码');
            return;
        }

        if (newPassword.length < 8) {
            showModal('输入错误', '新密码长度至少为8位');
            return;
        }

        if (newPassword !== confirmPassword) {
            showModal('输入错误', '两次输入的新密码不一致');
            return;
        }

        // 验证当前密码
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        const adminAccount = accounts.admin?.find(acc => acc.username === username);

        if (!adminAccount || adminAccount.password !== currentPassword) {
            showModal('密码错误', '当前密码不正确');
            return;
        }

        // 更新密码
        adminAccount.password = newPassword;
        accounts.admin = accounts.admin || [];
        const adminIndex = accounts.admin.findIndex(acc => acc.username === username);
        if (adminIndex !== -1) {
            accounts.admin[adminIndex] = adminAccount;
        } else {
            accounts.admin.push(adminAccount);
        }

        localStorage.setItem('accounts', JSON.stringify(accounts));

        // 清空密码字段
        currentPasswordEl.value = '';
        newPasswordEl.value = '';
        confirmPasswordEl.value = '';

        showModal('成功', '密码修改成功！请使用新密码登录');
    } catch (error) {
        console.error('修改管理员密码失败:', error);
        showModal('修改失败', `发生错误：${error.message}`);
    }
}

// 重置管理员账号表单
// 管理员注销账号
async function deactivateAdminAccount() {
    try {
        // 检查API服务是否可用
        if (!window.apiService) {
            showModal('错误', 'API服务未初始化，请刷新页面重试');
            return;
        }

        // 确认对话框
        const confirmed = confirm(
            '⚠️ 警告：注销账号操作不可恢复！\n\n'
                + '注销后，您的管理员账号将被停用，所有数据将被保留但无法访问。\n\n'
                + '确定要注销账号吗？',
        );

        if (!confirmed) {
            return;
        }

        // 再次确认
        const confirmedAgain = confirm('请再次确认：您真的要注销账号吗？此操作不可恢复！');
        if (!confirmedAgain) {
            return;
        }

        // 调用API注销账号
        await window.apiService.deactivateAdminAccount();

        // 立即清除登录信息
        sessionStorage.removeItem('loginInfo');
        localStorage.removeItem('loginInfo');

        // 立即跳转到登录页面
        window.location.href = 'login.html';
    } catch (error) {
        console.error('注销账号失败:', error);
        const errorMessage = error?.message || error?.toString() || '注销账号失败，请稍后重试';
        showModal('注销失败', errorMessage);
    }
}

function resetAdminAccountForm() {
    loadAdminAccountInfo();
    showModal('提示', '表单已重置');
}

// 更新当前时间
function updateCurrentTime() {
    const now = new Date();
    // 使用统一的时间格式：年月日 + 当日时间
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const timeString = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

    // 保留旧代码注释，以防需要
    /*
    const timeString = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    */
    document.getElementById('current-time').textContent = timeString;
}

// 加载仪表板数据
async function loadDashboardData() {
    const totalUsersEl = document.getElementById('total-users');
    const totalHospitalsEl = document.getElementById('total-hospitals');
    const subAdminsCountEl = document.getElementById('sub-admins-count');
    const totalDataEl = document.getElementById('total-data');

    if (!totalUsersEl || !totalHospitalsEl || !subAdminsCountEl || !totalDataEl) {
        return;
    }

    const setValues = ({
        totalUsers = 0,
        totalHospitals = 0,
        subAdminsCount = 0,
        totalData = '0 MB',
    } = {}) => {
        totalUsersEl.textContent = totalUsers;
        totalHospitalsEl.textContent = totalHospitals;
        subAdminsCountEl.textContent = subAdminsCount;
        totalDataEl.textContent = totalData;
    };

    setValues({
        totalUsers: '--',
        totalHospitals: '--',
        subAdminsCount: '--',
        totalData: '加载中',
    });

    try {
        let stats = {};
        let subAdminsCount = 0;

        if (window.apiService && typeof window.apiService.getAdminDashboardStats === 'function') {
            stats = (await window.apiService.getAdminDashboardStats()) || {};
        }

        if (window.apiService && typeof window.apiService.getAdminAdmins === 'function') {
            try {
                const adminListResponse = await window.apiService.getAdminAdmins({ role: 'sub' });
                const extractDataList = resp => {
                    if (!resp) return [];
                    if (Array.isArray(resp.list)) return resp.list;
                    if (Array.isArray(resp.data?.list)) return resp.data.list;
                    if (Array.isArray(resp.data)) return resp.data;
                    if (Array.isArray(resp)) return resp;
                    return [];
                };
                subAdminsCount = extractDataList(adminListResponse)
                    .filter(admin => (admin?.role || '') === 'sub')
                    .length;
            } catch (error) {
                console.warn('获取副管理员数量失败，尝试使用仪表板接口返回值:', error);
            }
        }

        const toNumber = (value, fallback = 0) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : fallback;
        };

        const totalUsers = toNumber(stats.totalUsers ?? stats.total_users);
        const totalHospitals = toNumber(stats.totalHospitals ?? stats.total_hospitals);
        const fallbackSubAdminsCount = toNumber(stats.subAdminsCount ?? stats.sub_admins_count, 0);

        let totalDataText = stats.totalData ?? stats.total_data ?? null;
        if (!totalDataText || typeof totalDataText !== 'string') {
            const totalDataCount = stats.totalDataCount ?? stats.total_data_count ?? null;
            if (totalDataCount !== null && totalDataCount !== undefined) {
                totalDataText = `${toNumber(totalDataCount, 0)} 条`;
            } else {
                const totalDataMb = stats.totalDataMB ?? stats.totalDataMb ?? stats.total_data_mb ?? 0;
                const dataNumber = toNumber(totalDataMb, 0);
                totalDataText = `${dataNumber.toFixed(1)} MB`;
            }
        }

        setValues({
            totalUsers,
            totalHospitals,
            subAdminsCount: subAdminsCount || fallbackSubAdminsCount,
            totalData: totalDataText,
        });
    } catch (error) {
        console.error('[仪表板] 加载数据失败:', error);
        showNotification(`仪表板数据加载失败：${error.message || '未知错误'}`, 'warning');
        setValues();
    }

    loadNotifications();
    loadApiStatus();
    loadSystemStatus();
    if (!window.__adminDashboardSystemStatusTimer) {
        window.__adminDashboardSystemStatusTimer = setInterval(loadSystemStatus, 5000);
    }
}

// 加载通知
function loadNotifications() {
    const container = document.getElementById('notification-list');
    if (!container) {
        // 通知列表容器不存在（可能已被删除），直接返回
        return;
    }
    container.innerHTML = adminData.notifications.items
        .map(
            item => `
        <div class="notification-item ${item.isRead ? 'read' : 'unread'}">
            <div class="notification-header">
                <span class="notification-title">${item.title || '系统通知'}</span>
                <span class="notification-time">${formatDateTime(item.createdAt || item.created_at)}</span>
            </div>
            <div class="notification-content">${item.content || ''}</div>
            <div class="notification-actions">
                ${!item.isRead ? `<button onclick="markNotificationAsRead('${item.id}')">标记已读</button>` : ''}
                <button onclick="deleteNotification('${item.id}')" class="danger">删除</button>
            </div>
        </div>
    `,
        )
        .join('');
}

// 加载通知下拉面板
async function loadNotificationDropdown() {
    const container = document.getElementById('notification-dropdown-body');
    const badge = document.getElementById('notification-badge');

    if (!container) {
        return;
    }

    // 显示加载状态
    container.innerHTML = `
        <div class="notification-empty">
            <i class="fas fa-spinner fa-spin"></i>
            <p>加载中...</p>
        </div>
    `;

    // 尝试从服务器加载最新通知
    try {
        if (window.apiService) {
            await loadNotificationsFromServer();
        }
    } catch (error) {
        console.warn('从服务器加载通知失败，使用本地缓存:', error);
    }

    // 确保从localStorage加载最新通知数据
    try {
        const savedNotifications = localStorage.getItem('adminNotifications');
        if (savedNotifications) {
            const parsed = JSON.parse(savedNotifications);
            // 如果解析出来的是数组，转换为对象格式
            if (Array.isArray(parsed)) {
                adminData.notifications = {
                    items: parsed,
                    unreadCount: parsed.filter(n => !(n.read === true || n.isRead === true)).length,
                };
            } else if (parsed && typeof parsed === 'object') {
                // 确保有 items 数组
                if (!parsed.items) {
                    parsed.items = Array.isArray(parsed) ? parsed : [];
                }
                adminData.notifications = parsed;
            }
        }
    } catch (error) {
        console.error('加载通知数据失败:', error);
    }

    // 确保 adminData.notifications 是对象格式
    if (
        !adminData.notifications
        || typeof adminData.notifications !== 'object'
        || !Array.isArray(adminData.notifications.items)
    ) {
        adminData.notifications = {
            items: [],
            unreadCount: 0,
        };
    }

    // 获取通知列表
    const notifications = adminData.notifications.items || [];

    // 统计未读通知数量（使用严格比较，确保read属性为true才视为已读）
    const unreadCount = notifications.filter(n => !(n.read === true || n.isRead === true)).length;

    // 更新徽章
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    // 如果通知列表为空
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>暂无通知</p>
            </div>
        `;
        return;
    }

    // 生成通知项
    container.innerHTML = notifications
        .map(notif => {
            const iconClass
                = notif.type === 'success'
                    ? 'fa-check-circle'
                    : notif.type === 'warning'
                        ? 'fa-exclamation-triangle'
                        : notif.type === 'error'
                            ? 'fa-times-circle'
                            : 'fa-info-circle';

            const isRead = notif.read === true || notif.isRead === true;
            const notificationTime = notif.time || notif.createdAt || notif.created_at || '';
            const formattedTime = notificationTime ? formatDateTime(notificationTime) : '';

            return `
            <div class="notification-dropdown-item ${isRead ? '' : 'unread'}" data-id="${notif.id || ''}">
                <div class="notification-item-icon ${notif.type || 'info'}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="notification-item-content">
                    <div class="notification-item-title">${notif.title || '系统通知'}</div>
                    <div class="notification-item-time">${formattedTime}</div>
                </div>
            </div>
        `;
        })
        .join('');

    // 为每个通知项添加点击事件
    container.querySelectorAll('.notification-dropdown-item').forEach(item => {
        item.addEventListener('click', function () {
            const notificationId = this.dataset.id;
            if (notificationId) {
                // 立即更新UI，提供即时反馈
                this.classList.remove('unread');
                // 调用异步函数标记为已读
                markNotificationAsRead(notificationId)
                    .then(() => {
                        // 重新加载下拉面板以反映最新状态
                        loadNotificationDropdown();
                    })
                    .catch(err => {
                        console.error('标记通知为已读失败:', err);
                    });
            }
        });
    });

    // 确保徽章已更新
    updateNotificationBadge();
}

// 注意：markNotificationAsRead 函数已在上面定义（异步版本）
// 这个函数用于下拉面板，直接调用上面的异步版本
// 为了保持兼容性，保留这个函数作为同步包装器
function markNotificationAsReadSync(id) {
    // 直接调用异步版本
    markNotificationAsRead(id).catch(err => {
        console.error('标记通知为已读失败:', err);
    });
}

// 标记所有通知为已读
async function markAllNotificationsRead() {
    // 确保从localStorage加载最新数据，避免覆盖其他地方的更改
    try {
        const savedNotifications = localStorage.getItem('adminNotifications');
        if (savedNotifications) {
            const parsed = JSON.parse(savedNotifications);
            // 如果解析出来的是数组，转换为对象格式
            if (Array.isArray(parsed)) {
                adminData.notifications = {
                    items: parsed,
                    unreadCount: parsed.filter(n => !(n.read === true || n.isRead === true)).length,
                };
            } else if (parsed && typeof parsed === 'object') {
                // 确保有 items 数组
                if (!parsed.items) {
                    parsed.items = Array.isArray(parsed) ? parsed : [];
                }
                adminData.notifications = parsed;
            }
        }
    } catch (error) {
        console.error('加载通知数据失败:', error);
    }

    // 确保 adminData.notifications 是对象格式
    if (
        !adminData.notifications
        || typeof adminData.notifications !== 'object'
        || !Array.isArray(adminData.notifications.items)
    ) {
        adminData.notifications = {
            items: [],
            unreadCount: 0,
        };
    }

    const notifications = adminData.notifications.items || [];

    // 标记所有通知为已读
    let updated = false;
    notifications.forEach(notif => {
        if (!(notif.read === true || notif.isRead === true)) {
            notif.read = true;
            notif.isRead = true;
            updated = true;
        }
    });

    if (updated) {
        // 更新未读计数
        adminData.notifications.unreadCount = 0;
        // 保存到localStorage
        localStorage.setItem('adminNotifications', JSON.stringify(adminData.notifications));
        updateNotificationBadge();
        loadNotificationDropdown(); // 刷新下拉面板

        // 如果后端API可用，尝试同步到服务器
        if (window.apiService) {
            try {
                await window.apiService.markAllAdminNotificationsRead().catch(err => {
                    console.warn('同步所有通知已读状态到服务器失败:', err);
                });
            } catch (error) {
                console.warn('同步所有通知已读状态失败:', error);
            }
        }

        showNotification('所有通知已标记为已读', 'success');
    } else {
        showNotification('没有未读通知', 'info');
    }
}

// 更新通知徽章
function updateNotificationBadge() {
    // 首先确保 adminData 和 adminData.notifications 存在
    if (!adminData) {
        console.error('adminData 未定义');
        return;
    }

    // 首先确保 adminData.notifications 存在且是对象格式
    // 如果不存在或者是数组，先转换为对象格式
    if (!adminData.notifications) {
        adminData.notifications = {
            items: [],
            unreadCount: 0,
        };
    } else if (Array.isArray(adminData.notifications)) {
        // 如果是数组，先保存数组引用，然后转换为对象格式
        const notificationsArray = adminData.notifications;
        adminData.notifications = {
            items: Array.isArray(notificationsArray) ? notificationsArray : [],
            unreadCount: Array.isArray(notificationsArray)
                ? notificationsArray.filter(n => !(n.read === true || n.isRead === true)).length
                : 0,
        };
    } else if (typeof adminData.notifications !== 'object' || adminData.notifications === null) {
        // 如果不是对象也不是数组，重置为默认值
        adminData.notifications = {
            items: [],
            unreadCount: 0,
        };
    }

    // 确保 items 是数组
    if (!Array.isArray(adminData.notifications.items)) {
        adminData.notifications.items = [];
    }

    // 确保从localStorage加载最新通知数据
    try {
        const savedNotifications = localStorage.getItem('adminNotifications');
        if (savedNotifications) {
            const parsed = JSON.parse(savedNotifications);
            // 如果解析出来的是数组，转换为对象格式
            if (Array.isArray(parsed)) {
                adminData.notifications = {
                    items: parsed,
                    unreadCount: parsed.filter(n => !(n.read === true || n.isRead === true)).length,
                };
            } else if (parsed && typeof parsed === 'object') {
                // 确保有 items 数组
                if (!parsed.items || !Array.isArray(parsed.items)) {
                    parsed.items = [];
                }
                adminData.notifications = parsed;
            }
        }
    } catch (error) {
        console.error('加载通知数据失败:', error);
    }

    // 最后再次确保 adminData.notifications 是对象格式且有 items 数组
    if (
        !adminData.notifications
        || typeof adminData.notifications !== 'object'
        || !Array.isArray(adminData.notifications.items)
    ) {
        adminData.notifications = {
            items: [],
            unreadCount: 0,
        };
    }

    // 确保 DOM 元素已加载
    const badge = document.getElementById('notification-badge');
    if (!badge) {
        // 如果元素还未加载，延迟重试
        setTimeout(updateNotificationBadge, 100);
        return;
    }

    // 统计未读通知数量（使用严格比较）
    const notifications = adminData.notifications.items || [];
    const unreadCount = notifications.filter(n => !(n.read === true || n.isRead === true)).length;

    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'block';
    } else {
        badge.textContent = '0';
        badge.style.display = 'none';
    }

    console.log('通知徽章已更新，未读数量:', unreadCount);
}

// 加载API状态（同时加载AI、地理位置和智能设备API状态）
function loadApiStatus() {
    loadAIAPIStatus();
    loadLocationAPIStatus();
    loadSmartDeviceAPIStatus();
}

// 加载系统状态
async function loadSystemStatus() {
    if (!window.apiService) {
        console.warn('API服务未就绪，无法加载系统状态');
        return;
    }

    try {
        const status = await window.apiService.getSystemStatus();

        // 更新CPU使用率
        const cpuProgress = document.getElementById('cpu-progress');
        const cpuValue = document.getElementById('cpu-value');
        if (cpuProgress && cpuValue) {
            const cpu = Math.min(100, Math.max(0, status.cpu || 0));
            cpuProgress.style.width = `${cpu}%`;
            cpuValue.textContent = `${cpu}%`;
            // 根据使用率设置颜色
            cpuProgress.style.background = cpu > 80 ? '#e74c3c' : cpu > 60 ? '#f39c12' : '#27ae60';
        }

        // 更新内存使用
        const memoryProgress = document.getElementById('memory-progress');
        const memoryValue = document.getElementById('memory-value');
        if (memoryProgress && memoryValue) {
            const memory = Math.min(100, Math.max(0, status.memory || 0));
            memoryProgress.style.width = `${memory}%`;
            memoryValue.textContent = `${memory}%`;
            // 根据使用率设置颜色
            memoryProgress.style.background
                = memory > 80 ? '#e74c3c' : memory > 60 ? '#f39c12' : '#27ae60';
        }

        // 更新磁盘空间
        const diskProgress = document.getElementById('disk-progress');
        const diskValue = document.getElementById('disk-value');
        if (diskProgress && diskValue) {
            const disk = Math.min(100, Math.max(0, status.disk || 0));
            diskProgress.style.width = `${disk}%`;
            diskValue.textContent = `${disk}%`;
            // 根据使用率设置颜色
            diskProgress.style.background
                = disk > 80 ? '#e74c3c' : disk > 60 ? '#f39c12' : '#27ae60';
        }

        // 更新网络流量
        const networkProgress = document.getElementById('network-progress');
        const networkValue = document.getElementById('network-value');
        if (networkProgress && networkValue) {
            const network = Math.min(100, Math.max(0, status.network || 0));
            networkProgress.style.width = `${network}%`;
            networkValue.textContent = `${network}%`;
            // 根据使用率设置颜色
            networkProgress.style.background
                = network > 80 ? '#e74c3c' : network > 60 ? '#f39c12' : '#27ae60';
        }
    } catch (error) {
        console.error('加载系统状态失败:', error);
        // 如果加载失败，显示默认值
        ['cpu', 'memory', 'disk', 'network'].forEach(key => {
            const progress = document.getElementById(`${key}-progress`);
            const value = document.getElementById(`${key}-value`);
            if (progress && value) {
                progress.style.width = '0%';
                value.textContent = '--';
            }
        });
    }
}

// 加载 AI API 状态
let aiProviderHealthDetails = {};

async function fetchAdminAIProxy(endpoint, options = {}) {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const candidates = [`/api${normalizedEndpoint}`, normalizedEndpoint];
    let lastResponse = null;

    for (const url of candidates) {
        const response = await fetch(url, options);
        if (response.status !== 404) {
            return response;
        }
        lastResponse = response;
    }

    return lastResponse;
}

async function loadAIAPIStatus() {
    const savedSettings = JSON.parse(localStorage.getItem('admin_settings') || '{}');
    const providers = savedSettings.ai?.providers || adminData.apiSettings.ai.providers || {};

    const apiStatuses = [
        {
            id: 'deepseek',
            name: 'Deep Seek',
            icon: 'fa-robot',
            status: providers.deepseek?.enabled ? 'normal' : 'offline',
        },
        {
            id: 'doubao',
            name: '豆包',
            icon: 'fa-comments',
            status: providers.doubao?.enabled ? 'normal' : 'offline',
        },
        {
            id: 'zhipu',
            name: '智谱清言',
            icon: 'fa-brain',
            status: providers.zhipu?.enabled ? 'normal' : 'offline',
        },
    ];

    aiProviderHealthDetails = apiStatuses.reduce((acc, item) => {
        acc[item.id] = {
            provider: item.id,
            configured: item.status === 'normal',
            status: item.status === 'normal' ? 'online' : 'offline',
            checkedAt: new Date().toISOString(),
        };
        return acc;
    }, {});

    const container = document.getElementById('ai-api-status-container');
    if (container) {
        container.innerHTML = apiStatuses
            .map(
                api => `
            <div class="smart-device-api-card" onclick="showAIAPIAPIDetail('${api.id}')">
                <div class="smart-device-status-indicator">
                    <div style="display: flex; align-items: center;">
                        <span class="smart-device-status-dot ${api.status}"></span>
                        <span class="smart-device-status-badge ${api.status}">
                            ${getOnlineStatusText(api.status)}
                        </span>
                    </div>
                </div>

                <div class="smart-device-name">
                    <i class="fas ${api.icon}"></i>
                    ${api.name}
                </div>
            </div>
        `,
            )
            .join('');
    }
}

// 刷新 AI API 状态
async function refreshAIAPIStatus() {
    const btn = event?.target?.closest('button');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.add('fa-spin');
        }
    }

    try {
        await loadAIAPIStatus();
        showSuccessToast('AI 服务状态已刷新');
    } finally {
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-spin');
            }
        }
    }
}

// 测试 AI API 连接
async function testAIAPIConnection(apiId) {
    const providerConfig = adminData.apiSettings.ai.providers?.[apiId];
    const apiNames = {
        deepseek: 'Deep Seek',
        doubao: '豆包',
        zhipu: '智谱清言',
    };

    if (!providerConfig) {
        showErrorToast('未找到对应的 AI 提供商配置');
        return;
    }

    const apiKey = (providerConfig.apiKey || '').trim();
    const baseUrl = (providerConfig.baseUrl || '').trim();

    if (!apiKey) {
        showErrorToast(`${apiNames[apiId] || 'AI'} 未配置 API Key`);
        return;
    }

    if (!baseUrl) {
        showErrorToast(`${apiNames[apiId] || 'AI'} 未配置 Base URL`);
        return;
    }

    try {
        showInfoToast(`正在测试 ${apiNames[apiId] || 'AI'} 连接...`, '测试中');

        const response = await fetchAdminAIProxy('/proxy/ai/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                provider: apiId,
                apiKey,
                baseUrl,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data?.success) {
            const errorMsg = data?.error?.message || data?.message || `HTTP ${response.status}`;
            throw new Error(errorMsg);
        }

        const latency = data?.data?.latency;
        await loadAIAPIStatus();
        showSuccessToast(`${apiNames[apiId] || 'AI'} API 连接测试成功${latency ? `（${latency}ms）` : ''}`);
    } catch (error) {
        console.error('测试连接失败:', error);
        await loadAIAPIStatus();
        showErrorToast(error.message || '测试连接失败，请检查网络或 API 配置');
    }
}

// 显示 AI API 详情
function showAIAPIAPIDetail(apiId) {
    const apiNames = {
        deepseek: 'Deep Seek',
        doubao: '豆包',
        zhipu: '智谱清言',
    };
    const detail = aiProviderHealthDetails[apiId];

    if (!detail) {
        showInfoToast(`查看 ${apiNames[apiId] || 'AI'} API 详细信息`);
        return;
    }

    const statusMap = {
        online: '在线',
        offline: '离线',
        healthy: '在线',
        missing_key: '离线',
        unavailable: '离线',
        unknown: '离线',
    };

    const detailHtml = [
        `提供商：${apiNames[apiId] || detail.provider || 'AI'}`,
        `状态：${statusMap[detail.status] || detail.status || '未知'}`,
        `是否已配置：${detail.configured ? '是' : '否'}`,
        `Base URL：${detail.baseUrl || '未配置'}`,
        `默认模型：${detail.defaultModel || '未配置'}`,
        `最近检查：${detail.checkedAt ? new Date(detail.checkedAt).toLocaleString('zh-CN') : '未知'}`,
    ].join('<br>');

    showInfoToast(detailHtml, 'AI 详情');
}

// 加载地理位置 API 状态
function loadLocationAPIStatus() {
    const settings = JSON.parse(localStorage.getItem('admin_settings') || '{}');
    const locationProviders = settings.location?.providers || adminData.apiSettings.location.providers || {};

    const apiStatuses = [
        {
            id: 'tianditu',
            name: '天地图',
            icon: 'fa-map-marked-alt',
            status: locationProviders.tianditu?.enabled ? 'normal' : 'offline',
        },
        {
            id: 'amap',
            name: '高德地图',
            icon: 'fa-map-marker-alt',
            status: locationProviders.amap?.enabled ? 'normal' : 'offline',
        },
        {
            id: 'baidu',
            name: '百度地图',
            icon: 'fa-map-pin',
            status: locationProviders.baidu?.enabled ? 'normal' : 'offline',
        },
        {
            id: 'tencent',
            name: '腾讯地图',
            icon: 'fa-compass',
            status: locationProviders.tencent?.enabled ? 'normal' : 'offline',
        },
    ];

    const container = document.getElementById('location-api-status-container');
    if (container) {
        container.innerHTML = apiStatuses
            .map(
                api => `
            <div class="smart-device-api-card" onclick="showLocationAPIAPIDetail('${api.id}')">
                <div class="smart-device-status-indicator">
                    <div style="display: flex; align-items: center;">
                        <span class="smart-device-status-dot ${api.status}"></span>
                        <span class="smart-device-status-badge ${api.status}">
                            ${getOnlineStatusText(api.status)}
                        </span>
                    </div>
                </div>

                <div class="smart-device-name">
                    <i class="fas ${api.icon}"></i>
                    ${api.name}
                </div>
            </div>
        `,
            )
            .join('');
    }
}

// 刷新地理位置 API 状态
function refreshLocationAPIStatus() {
    const btn = event?.target?.closest('button');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.add('fa-spin');
        }
    }

    setTimeout(() => {
        loadLocationAPIStatus();
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-spin');
            }
        }
        showSuccessToast('地理位置 API 状态已刷新');
    }, 500);
}

// 测试地理位置 API 连接
async function testLocationAPIConnection(apiId) {
    try {
        showInfoToast('正在测试连接...', '测试中');
        await new Promise(resolve => setTimeout(resolve, 1500));

        const apiNames = {
            tianditu: '天地图',
            amap: '高德地图',
            baidu: '百度地图',
            tencent: '腾讯地图',
        };

        showSuccessToast(`${apiNames[apiId] || '地理位置'} API 连接测试完成`);
    } catch (error) {
        console.error('测试连接失败:', error);
        showErrorToast('测试连接失败，请检查网络或 API 配置');
    }
}

// 显示地理位置 API 详情
function showLocationAPIAPIDetail(apiId) {
    const apiNames = {
            tianditu: '天地图',
            amap: '高德地图',
            baidu: '百度地图',
            tencent: '腾讯地图',
        };
    showInfoToast(`查看 ${apiNames[apiId] || '地理位置'} API 详细信息`);
}

// 加载智能设备 API 状态
function loadSmartDeviceAPIStatus() {
    const settings = JSON.parse(localStorage.getItem('admin_settings') || '{}');
    const smartDevices = settings.smartDevices || adminData.apiSettings.smartDevices || {};

    const fitbit = smartDevices.fitbit || {};
    const tuya = smartDevices.tuya || {};

    const apiStatuses = [
        {
            id: 'fitbit',
            name: 'Fitbit API',
            icon: 'fa-heartbeat',
            status: fitbit.enabled ? 'normal' : 'offline',
        },
        {
            id: 'tuya',
            name: '涂鸦智能 API',
            icon: 'fa-lightbulb',
            status: tuya.enabled ? 'normal' : 'offline',
        },
    ];

    const container = document.getElementById('smart-device-api-status-container');
    if (container) {
        container.innerHTML = apiStatuses
            .map(
                api => `
            <div class="smart-device-api-card" onclick="showSmartDeviceAPIDetail('${api.id}')">
                <div class="smart-device-status-indicator">
                    <div style="display: flex; align-items: center;">
                        <span class="smart-device-status-dot ${api.status}"></span>
                        <span class="smart-device-status-badge ${api.status}">
                            ${getOnlineStatusText(api.status)}
                        </span>
                    </div>
                </div>

                <div class="smart-device-name">
                    <i class="fas ${api.icon}"></i>
                    ${api.name}
                </div>
            </div>
        `,
            )
            .join('');
    }
}

function getOnlineStatusText(status) {
    return status === 'normal' ? '在线' : '离线';
}

// 获取状态文本
function getStatusText(status) {
    const map = {
        normal: '正常',
        warning: '警告',
        error: '异常',
        offline: '离线',
    };
    return map[status] || '未知';
}

// 获取指标样式类
function getMetricClass(value, type) {
    if (value === null || value === undefined) {
        return '';
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
        return '';
    }

    if (type === 'response') {
        if (numValue < 300) {
            return 'good';
        }
        if (numValue < 500) {
            return 'warning';
        }
        return 'error';
    } else if (type === 'error') {
        if (numValue < 2) {
            return 'good';
        }
        if (numValue < 5) {
            return 'warning';
        }
        return 'error';
    }
    return '';
}

// 刷新智能设备 API 状态
function refreshSmartDeviceAPIStatus() {
    const btn = event?.target?.closest('button');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.add('fa-spin');
        }
    }

    // 模拟刷新延迟
    setTimeout(() => {
        loadSmartDeviceAPIStatus();

        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-spin');
            }
        }

        showSuccessToast('智能设备 API 状态已刷新');
    }, 500);
}

// 测试智能设备 API 连接
async function testSmartDeviceAPI(deviceId) {
    const statusEl = document.getElementById(`${deviceId}-test-status`);

    try {
        showToast('正在测试连接...', 'info', '测试中');

        // 模拟测试连接（实际项目中应该调用真实的 API）
        await new Promise(resolve => setTimeout(resolve, 1500));

        showSuccessToast(`${deviceId === 'fitbit' ? 'Fitbit' : '涂鸦智能'} API 连接测试完成`);
    } catch (error) {
        console.error('测试连接失败:', error);
        showErrorToast('测试连接失败，请检查网络或 API 配置');
    }
}

// 显示智能设备 API 详情
function showSmartDeviceAPIDetail(deviceId) {
    // 这里可以打开一个详情模态框，显示更详细的 API 信息
    // 目前先显示一个简单的提示
    showInfoToast(`查看 ${deviceId === 'fitbit' ? 'Fitbit' : '涂鸦智能'} API 详细信息`);
    // TODO: 实现详情模态框
}

// 更新实时信息
async function updateRealtimeInfo() {
    console.log('更新实时信息...');
    await loadDashboardData();
}

// 模态框相关
function showModal(title, body, onConfirm, options) {
    if (typeof onConfirm === 'object' && onConfirm !== null && options === undefined) {
        options = onConfirm;
        onConfirm = undefined;
    }

    const modalOptions = options || {};
    const allowBackdropClose = modalOptions.allowBackdropClose === true;

    const modal = document.getElementById('modal');

    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    modal.style.display = 'flex';
    modal.dataset.backdropClose = allowBackdropClose ? 'true' : 'false';

    // 如果提供了onConfirm回调，在模态框内容中处理
    // 注意：模态框底部的确认按钮已删除，确认操作应在模态框内容内的按钮处理
    if (onConfirm) {
        // 可以通过在body内容中添加确认按钮来处理
        console.log('showModal with onConfirm callback');
    }
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// 登出
function logout() {
    if (confirm('确定要退出登录吗？')) {
        if (window.AuthGuard) {
            AuthGuard.logout();
        }
    }
}

// 初始化菜单
function initializeMenu() {
    // 菜单已通过HTML初始化
    console.log('菜单初始化完成');
}

// ==================== 页面内容加载函数 ====================

// HTML转义函数
function escapeHtml(text) {
    if (!text) {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 创建带眼睛图标的密码输入框
function createPasswordInputWithToggle(inputId, value, placeholder, isPassword = true) {
    const inputType = isPassword ? 'password' : 'text';
    const eyeIcon = isPassword ? 'fa-eye' : 'fa-eye-slash';
    return `
        <div class="password-input-wrapper" style="position: relative;">
            <input type="${inputType}" class="form-input password-input" id="${inputId}" 
                   value="${value || ''}" placeholder="${placeholder || ''}">
            <button type="button" class="password-toggle-btn" 
                    onclick="togglePasswordVisibility('${inputId}')" 
                    style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); 
                           background: none; border: none; cursor: pointer; color: #666; 
                           font-size: 1.1rem; padding: 5px; transition: color 0.2s;">
                <i class="fas ${eyeIcon}"></i>
            </button>
        </div>
    `;
}

// 切换密码可见性
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const btn = input.parentElement.querySelector('.password-toggle-btn i');
    if (!btn) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        btn.className = 'fas fa-eye';
    }
}

// 加载智能设备设置页面
function loadSmartDevicesPage() {
    const devices = adminData.apiSettings.smartDevices || {};
    const container = document.getElementById('smart-devices-page');

    let html = `
        <div class="content-card">
            <div class="card-header">
                <h3><i class="fas fa-mobile-alt"></i> 智能设备配置</h3>
            </div>
            <div class="card-body">
                <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div style="font-weight: bold; margin-bottom: 10px;"><i class="fas fa-info-circle"></i> 使用说明</div>
                    <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.8;">
                        <li>智能设备API用于连接和获取健康设备数据</li>
                        <li>支持 Fitbit 健康设备和涂鸦智能设备</li>
                        <li>配置后用户可以连接设备并同步数据</li>
                        <li>多个设备提供商可以同时启用</li>
                    </ul>
                </div>
                
                <div class="api-providers-list" style="margin-top: 30px;">
                    <h4 style="margin-bottom: 20px;">智能设备提供商配置</h4>
    `;

    // Fitbit配置 - 添加安全检查
    const fitbit = devices.fitbit || { clientId: '', clientSecret: '', redirectUri: '', enabled: false, name: 'Fitbit' };
    const fitbitBtnClass = fitbit.enabled ? 'btn btn-success' : 'btn btn-secondary';
    const fitbitBtnText = fitbit.enabled ? '已启用' : '已禁用';
    const fitbitBtnIcon = fitbit.enabled ? 'fa-check-circle' : 'fa-times-circle';
    html += `
        <div class="provider-card" style="margin-bottom: 20px;">
            <div class="provider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0;">
                    <i class="fas fa-heartbeat" style="color: #00a762; margin-right: 8px;"></i>${fitbit.name || 'Fitbit'}
                </h4>
                <button type="button" class="${fitbitBtnClass}" id="fitbit-enabled-btn" data-provider="fitbit" data-enabled="${fitbit.enabled}" onclick="toggleSmartDeviceEnabled('fitbit')">
                    <i class="fas ${fitbitBtnIcon}"></i> ${fitbitBtnText}
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">Client ID</label>
                <input type="text" class="form-input" id="fitbit-client-id" 
                value="${fitbit.clientId || ''}" placeholder="输入Fitbit Client ID">
            </div>
            <div class="form-group">
                <label class="form-label">Client Secret</label>
                ${createPasswordInputWithToggle('fitbit-client-secret', fitbit.clientSecret, '输入Fitbit Client Secret')}
            </div>
            <div class="form-group">
                <label class="form-label">Redirect URI</label>
                <input type="text" class="form-input" id="fitbit-redirect-uri" 
                value="${fitbit.redirectUri || ''}" placeholder="回调URL">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-secondary" onclick="testSmartDeviceConnection('fitbit')" style="margin-right: 10px;">
                    <i class="fas fa-vial"></i> 测试连接
                </button>
                <span id="fitbit-test-status" style="color: #999; font-size: 0.9rem;"></span>
            </div>
        </div>
    `;

    // 涂鸦智能配置 - 添加安全检查
    const tuya = devices.tuya || { accessId: '', accessSecret: '', projectCode: '', baseUrl: '', enabled: false, name: '涂鸦智能' };
    const tuyaBtnClass = tuya.enabled ? 'btn btn-success' : 'btn btn-secondary';
    const tuyaBtnText = tuya.enabled ? '已启用' : '已禁用';
    const tuyaBtnIcon = tuya.enabled ? 'fa-check-circle' : 'fa-times-circle';
    html += `
        <div class="provider-card" style="margin-bottom: 20px;">
            <div class="provider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0;">
                    <i class="fas fa-lightbulb" style="color: #3385ff; margin-right: 8px;"></i>${tuya.name || '涂鸦智能'}
                </h4>
                <button type="button" class="${tuyaBtnClass}" id="tuya-enabled-btn" data-provider="tuya" data-enabled="${tuya.enabled}" onclick="toggleSmartDeviceEnabled('tuya')">
                    <i class="fas ${tuyaBtnIcon}"></i> ${tuyaBtnText}
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">Access ID/Client ID</label>
                <input type="text" class="form-input" id="tuya-access-id" 
                value="${tuya.accessId || ''}" placeholder="输入Access ID">
            </div>
            <div class="form-group">
                <label class="form-label">Access Secret/Client Secret</label>
                ${createPasswordInputWithToggle('tuya-access-secret', tuya.accessSecret, '输入Access Secret')}
            </div>
            <div class="form-group">
                <label class="form-label">项目Code</label>
                <input type="text" class="form-input" id="tuya-project-code" 
                value="${tuya.projectCode || ''}" placeholder="输入项目Code">
            </div>
            <div class="form-group">
                <label class="form-label">Base URL</label>
                <input type="text" class="form-input" id="tuya-base-url" 
                value="${tuya.baseUrl || ''}" placeholder="输入Base URL">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-secondary" onclick="testSmartDeviceConnection('tuya')" style="margin-right: 10px;">
                    <i class="fas fa-vial"></i> 测试连接
                </button>
                <span id="tuya-test-status" style="color: #999; font-size: 0.9rem;"></span>
            </div>
        </div>
    `;

    html += `
                </div>
                
                <div class="form-group" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                    <button type="button" class="btn btn-primary" onclick="saveSmartDevicesSettings()" style="padding: 12px 30px; font-size: 1rem;">
                        <i class="fas fa-save"></i> 保存配置
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="resetSmartDevicesSettings()" style="padding: 12px 30px; font-size: 1rem; margin-left: 10px;">
                        <i class="fas fa-undo"></i> 重置
                    </button>
                </div>
            </div>
        </div>
        
        <!-- 智能设备使用说明 -->
        <div class="content-card" style="margin-top: 20px;">
            <div class="card-header">
                <h3><i class="fas fa-book"></i> 智能设备使用说明</h3>
            </div>
            <div class="card-body">
                <div style="line-height: 1.8; color: #666;">
                    <h4 style="color: #333; margin-bottom: 10px;">Fitbit 健康设备</h4>
                    <p>Fitbit 提供专业的健康追踪设备，包括运动手环、智能手表等。</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li><strong>步数统计</strong>：记录每日步数和活动量</li>
                        <li><strong>心率监测</strong>：实时监测心率变化</li>
                        <li><strong>睡眠追踪</strong>：分析睡眠质量和周期</li>
                    </ul>
                    
                    <h4 style="color: #333; margin-top: 20px; margin-bottom: 10px;">涂鸦智能设备</h4>
                    <p>涂鸦智能提供智能家居设备接入服务，支持多种智能设备。</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>智能体重秤：监测体重、体脂等数据</li>
                        <li>智能血压计：记录血压变化</li>
                        <li>其他智能健康设备接入</li>
                    </ul>
                    
                    <h4 style="color: #333; margin-top: 20px; margin-bottom: 10px;">注意事项</h4>
                    <ul style="margin: 10px 0; padding-left: 20px; color: #e74c3c;">
                        <li>请确保设备API密钥有足够的权限和配额</li>
                        <li>注意API调用频率限制</li>
                        <li>系统支持Fitbit和涂鸦智能两种智能设备服务</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// 重置智能设备配置
function resetSmartDevicesSettings() {
    loadSmartDevicesPage();
    showSuccessToast('已重置为当前配置！');
}

// 保存智能设备配置
function saveSmartDevicesSettings() {
    // 确保 smartDevices 存在
    if (!adminData.apiSettings.smartDevices) {
        adminData.apiSettings.smartDevices = {};
    }
    if (!adminData.apiSettings.smartDevices.fitbit) {
        adminData.apiSettings.smartDevices.fitbit = { clientId: '', clientSecret: '', redirectUri: '', enabled: false, name: 'Fitbit' };
    }
    if (!adminData.apiSettings.smartDevices.tuya) {
        adminData.apiSettings.smartDevices.tuya = { accessId: '', accessSecret: '', projectCode: '', baseUrl: '', enabled: false, name: '涂鸦智能' };
    }

    // 保存Fitbit配置
    adminData.apiSettings.smartDevices.fitbit.clientId
        = document.getElementById('fitbit-client-id')?.value || '';
    adminData.apiSettings.smartDevices.fitbit.clientSecret
        = document.getElementById('fitbit-client-secret')?.value || '';
    adminData.apiSettings.smartDevices.fitbit.redirectUri
        = document.getElementById('fitbit-redirect-uri')?.value || '';
    const fitbitBtn = document.getElementById('fitbit-enabled-btn');
    adminData.apiSettings.smartDevices.fitbit.enabled
        = fitbitBtn ? fitbitBtn.getAttribute('data-enabled') === 'true' : false;

    // 保存涂鸦智能配置
    adminData.apiSettings.smartDevices.tuya.accessId
        = document.getElementById('tuya-access-id')?.value || '';
    adminData.apiSettings.smartDevices.tuya.accessSecret
        = document.getElementById('tuya-access-secret')?.value || '';
    adminData.apiSettings.smartDevices.tuya.projectCode
        = document.getElementById('tuya-project-code')?.value || '';
    adminData.apiSettings.smartDevices.tuya.baseUrl
        = document.getElementById('tuya-base-url')?.value || '';
    const tuyaBtn = document.getElementById('tuya-enabled-btn');
    adminData.apiSettings.smartDevices.tuya.enabled
        = tuyaBtn ? tuyaBtn.getAttribute('data-enabled') === 'true' : false;

    // 保存到localStorage
    const settingsJson = JSON.stringify(adminData.apiSettings);
    localStorage.setItem('adminSettings', settingsJson);
    localStorage.setItem('admin_settings', settingsJson);

    loadSmartDeviceAPIStatus();
    showSuccessToast('智能设备配置保存成功！');
}

// 切换智能设备启用状态
function toggleSmartDeviceEnabled(provider) {
    const btn = document.getElementById(`${provider}-enabled-btn`);
    if (!btn) return;

    // 确保 provider 配置存在
    if (!adminData.apiSettings.smartDevices) {
        adminData.apiSettings.smartDevices = {};
    }
    if (!adminData.apiSettings.smartDevices[provider]) {
        adminData.apiSettings.smartDevices[provider] = { enabled: false, name: provider };
    }

    const currentEnabled = btn.getAttribute('data-enabled') === 'true';
    const newEnabled = !currentEnabled;
    
    // 更新按钮状态
    btn.setAttribute('data-enabled', newEnabled);
    btn.className = newEnabled ? 'btn btn-success' : 'btn btn-secondary';
    btn.innerHTML = newEnabled 
        ? '<i class="fas fa-check-circle"></i> 已启用' 
        : '<i class="fas fa-times-circle"></i> 已禁用';
    
    // 立即更新数据
    adminData.apiSettings.smartDevices[provider].enabled = newEnabled;
    
    // 显示提示
    const providerName = adminData.apiSettings.smartDevices[provider].name || provider;
    showSuccessToast(`${providerName}已${newEnabled ? '启用' : '禁用'}！`);
}

// 测试智能设备连接
async function testSmartDeviceConnection(deviceType) {
    const statusEl = document.getElementById(`${deviceType}-test-status`);
    if (!statusEl) return;
    
    statusEl.textContent = '正在测试连接...';
    statusEl.style.color = '#3498db';

    try {
        // 确保设备配置存在
        if (!adminData.apiSettings.smartDevices) {
            adminData.apiSettings.smartDevices = {};
        }
        if (!adminData.apiSettings.smartDevices[deviceType]) {
            adminData.apiSettings.smartDevices[deviceType] = {};
        }

        // 模拟测试连接（实际项目中应该调用真实的API）
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 简单验证是否有配置
        const device = adminData.apiSettings.smartDevices[deviceType];
        let hasRequiredConfig = false;

        if (deviceType === 'fitbit') {
            hasRequiredConfig
                = device.clientId
                && device.clientId !== 'YOUR_CLIENT_ID'
                && device.clientSecret
                && device.clientSecret !== 'YOUR_CLIENT_SECRET';
        } else if (deviceType === 'tuya') {
            hasRequiredConfig = device.accessId && device.accessSecret && device.projectCode;
        }

        const deviceName = device.name || deviceType;

        if (hasRequiredConfig) {
            statusEl.textContent = '✓ 连接成功';
            statusEl.style.color = '#27ae60';
            showSuccessToast(`${deviceName}连接测试成功！`);
        } else {
            statusEl.textContent = '✗ 配置不完整';
            statusEl.style.color = '#e74c3c';
            showErrorToast(`${deviceName}配置不完整，请检查配置！`);
        }
    } catch (error) {
        console.error('连接测试失败:', error);
        statusEl.textContent = '✗ 连接失败';
        statusEl.style.color = '#e74c3c';
        showErrorToast(`${adminData.apiSettings.smartDevices[deviceType].name}连接测试失败！`);
    }
}

// 加载AI设置页面
function loadAIPage() {
    try {
        const providers = adminData.apiSettings.ai.providers;
        const defaultProvider = adminData.apiSettings.ai.defaultProvider;
        const container = document.getElementById('ai-page');

        if (!container) {
            console.error('找不到 ai-page 容器元素');
            return;
        }

        let html = `
        <div class="content-card">
            <div class="card-header">
                <h3><i class="fas fa-robot"></i> AI服务配置</h3>
            </div>
            <div class="card-body">
                <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div style="font-weight: bold; margin-bottom: 10px;"><i class="fas fa-info-circle"></i> 使用说明</div>
                    <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.8;">
                        <li>AI服务用于健康咨询、智能推荐等功能</li>
                        <li>支持 DeepSeek、豆包、智谱清言 3 个AI提供商</li>
                        <li>配置后可以为用户提供更智能的健康建议</li>
                        <li>多个AI提供商可以同时启用，系统会按优先级使用</li>
                    </ul>
                </div>
                
                <div class="form-group">
                    <label class="form-label">默认AI服务提供商</label>
                    <select class="form-input" id="ai-default-provider">
                        <option value="deepseek" ${defaultProvider === 'deepseek' ? 'selected' : ''}>Deep Seek</option>
                        <option value="doubao" ${defaultProvider === 'doubao' ? 'selected' : ''}>豆包</option>
                        <option value="zhipu" ${defaultProvider === 'zhipu' ? 'selected' : ''}>智谱清言</option>
                    </select>
                </div>
                
                <div class="api-providers-list" style="margin-top: 30px;">
                    <h4 style="margin-bottom: 20px;">AI服务提供商配置</h4>
    `;

        // Deep Seek配置
        const deepseekEnabled = providers.deepseek?.enabled;
        const deepseekBtnClass = deepseekEnabled ? 'btn btn-success' : 'btn btn-secondary';
        const deepseekBtnText = deepseekEnabled ? '已启用' : '已禁用';
        const deepseekBtnIcon = deepseekEnabled ? 'fa-check-circle' : 'fa-times-circle';
        html += `
        <div class="provider-card" style="margin-bottom: 20px;">
            <div class="provider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0;">
                    <i class="fas fa-brain" style="color: #00a762; margin-right: 8px;"></i>Deep Seek
                </h4>
                <button type="button" class="${deepseekBtnClass}" id="deepseek-enabled-btn" data-provider="deepseek" data-enabled="${deepseekEnabled}" onclick="toggleAIEnabled('deepseek')">
                    <i class="fas ${deepseekBtnIcon}"></i> ${deepseekBtnText}
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">API Key</label>
                ${createPasswordInputWithToggle('deepseek-key', providers.deepseek?.apiKey, 'sk-...')}
            </div>
            <div class="form-group">
                <label class="form-label">Base URL</label>
                <input type="text" class="form-input" id="deepseek-url" 
                value="${providers.deepseek?.baseUrl || ''}">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-secondary" onclick="testAIAPI('deepseek')" style="margin-right: 10px;">
                    <i class="fas fa-vial"></i> 测试连接
                </button>
                <span id="deepseek-test-status" style="color: #999; font-size: 0.9rem;"></span>
            </div>
        </div>
    `;

        // 豆包配置
        const doubaoEnabled = providers.doubao?.enabled;
        const doubaoBtnClass = doubaoEnabled ? 'btn btn-success' : 'btn btn-secondary';
        const doubaoBtnText = doubaoEnabled ? '已启用' : '已禁用';
        const doubaoBtnIcon = doubaoEnabled ? 'fa-check-circle' : 'fa-times-circle';
        html += `
        <div class="provider-card" style="margin-bottom: 20px;">
            <div class="provider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0;">
                    <i class="fas fa-brain" style="color: #3385ff; margin-right: 8px;"></i>豆包
                </h4>
                <button type="button" class="${doubaoBtnClass}" id="doubao-enabled-btn" data-provider="doubao" data-enabled="${doubaoEnabled}" onclick="toggleAIEnabled('doubao')">
                    <i class="fas ${doubaoBtnIcon}"></i> ${doubaoBtnText}
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">API Key</label>
                ${createPasswordInputWithToggle('doubao-key', providers.doubao?.apiKey, 'API密钥')}
            </div>
            <div class="form-group">
                <label class="form-label">Base URL</label>
                <input type="text" class="form-input" id="doubao-url" 
                value="${providers.doubao?.baseUrl || ''}">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-secondary" onclick="testAIAPI('doubao')" style="margin-right: 10px;">
                    <i class="fas fa-vial"></i> 测试连接
                </button>
                <span id="doubao-test-status" style="color: #999; font-size: 0.9rem;"></span>
            </div>
        </div>
    `;

        // 智谱清言配置
        const zhipuEnabled = providers.zhipu?.enabled;
        const zhipuBtnClass = zhipuEnabled ? 'btn btn-success' : 'btn btn-secondary';
        const zhipuBtnText = zhipuEnabled ? '已启用' : '已禁用';
        const zhipuBtnIcon = zhipuEnabled ? 'fa-check-circle' : 'fa-times-circle';
        html += `
        <div class="provider-card" style="margin-bottom: 20px;">
            <div class="provider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0;">
                    <i class="fas fa-brain" style="color: #0099ff; margin-right: 8px;"></i>智谱清言
                </h4>
                <button type="button" class="${zhipuBtnClass}" id="zhipu-enabled-btn" data-provider="zhipu" data-enabled="${zhipuEnabled}" onclick="toggleAIEnabled('zhipu')">
                    <i class="fas ${zhipuBtnIcon}"></i> ${zhipuBtnText}
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">API Key</label>
                ${createPasswordInputWithToggle('zhipu-key', providers.zhipu?.apiKey, 'API密钥')}
            </div>
            <div class="form-group">
                <label class="form-label">Base URL</label>
                <input type="text" class="form-input" id="zhipu-url" 
                value="${providers.zhipu?.baseUrl || ''}">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-secondary" onclick="testAIAPI('zhipu')" style="margin-right: 10px;">
                    <i class="fas fa-vial"></i> 测试连接
                </button>
                <span id="zhipu-test-status" style="color: #999; font-size: 0.9rem;"></span>
            </div>
        </div>
    `;

        html += `
                </div>
                
                <div class="form-group" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                    <button type="button" class="btn btn-primary" onclick="saveAISettings()" style="padding: 12px 30px; font-size: 1rem;">
                        <i class="fas fa-save"></i> 保存配置
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="resetAISettings()" style="padding: 12px 30px; font-size: 1rem; margin-left: 10px;">
                        <i class="fas fa-undo"></i> 重置
                    </button>
                </div>
            </div>
        </div>
        
        <!-- AI服务使用说明 -->
        <div class="content-card" style="margin-top: 20px;">
            <div class="card-header">
                <h3><i class="fas fa-book"></i> AI服务使用说明</h3>
            </div>
            <div class="card-body">
                <div style="line-height: 1.8; color: #666;">
                    <h4 style="color: #333; margin-bottom: 10px;">Deep Seek</h4>
                    <p>DeepSeek 提供强大的通用AI大模型服务，适合各类健康咨询场景。</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li><strong>健康咨询</strong>：回答用户的健康相关问题</li>
                        <li><strong>智能推荐</strong>：根据用户健康数据提供个性化建议</li>
                        <li><strong>报告解读</strong>：帮助用户理解健康检查报告</li>
                    </ul>
                    
                    <h4 style="color: #333; margin-top: 20px; margin-bottom: 10px;">豆包</h4>
                    <p>豆包是字节跳动推出的AI大模型，提供丰富的中文理解能力。</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>健康咨询服务</li>
                        <li>健康报告解读</li>
                        <li>个性化健康建议</li>
                    </ul>
                    
                    <h4 style="color: #333; margin-top: 20px; margin-bottom: 10px;">智谱清言</h4>
                    <p>智谱清言是智谱AI推出的大语言模型，提供稳定可靠的AI服务。</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>健康咨询服务</li>
                        <li>健康数据分析</li>
                        <li>智能健康提醒</li>
                    </ul>
                    
                    <h4 style="color: #333; margin-top: 20px; margin-bottom: 10px;">注意事项</h4>
                    <ul style="margin: 10px 0; padding-left: 20px; color: #e74c3c;">
                        <li>请确保AI API密钥有足够的配额和权限</li>
                        <li>注意API调用频率限制</li>
                        <li>系统支持DeepSeek、豆包、智谱清言等AI服务</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

        container.innerHTML = html;
    } catch (error) {
        console.error('加载AI设置页面失败:', error);
        const container = document.getElementById('ai-page');
        if (container) {
            container.innerHTML = `
                <div class="content-card">
                    <div class="card-header">
                        <h3><i class="fas fa-robot"></i> AI服务配置</h3>
                    </div>
                    <div class="card-body">
                        <div style="padding: 40px; text-align: center; color: #e74c3c;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                            <p style="margin-bottom: 10px;">加载AI设置页面时出错</p>
                            <p style="color: #666; font-size: 0.9rem;">错误信息: ${error.message}</p>
                            <button class="btn btn-secondary" onclick="loadAIPage()" style="margin-top: 20px;">
                                <i class="fas fa-redo"></i> 重试
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// 重置AI设置
function resetAISettings() {
    loadAIPage();
    showSuccessToast('已重置为当前配置！');
}

// 保存AI设置（立即暴露到全局作用域）
async function saveAISettings() {
    try {
        const defaultProvider = document.getElementById('ai-default-provider');
        if (defaultProvider) {
            adminData.apiSettings.ai.defaultProvider = defaultProvider.value;
        }

        // Deep Seek配置
        const deepseekBtn = document.getElementById('deepseek-enabled-btn');
        if (deepseekBtn) {
            adminData.apiSettings.ai.providers.deepseek.apiKey = (
                document.getElementById('deepseek-key')?.value || ''
            ).trim();
            adminData.apiSettings.ai.providers.deepseek.baseUrl = (
                document.getElementById('deepseek-url')?.value
                || adminData.apiSettings.ai.providers.deepseek.baseUrl
                || ''
            ).trim();
            adminData.apiSettings.ai.providers.deepseek.enabled = deepseekBtn.getAttribute('data-enabled') === 'true';
        }

        // 豆包配置
        const doubaoBtn = document.getElementById('doubao-enabled-btn');
        if (doubaoBtn) {
            adminData.apiSettings.ai.providers.doubao.apiKey = (
                document.getElementById('doubao-key')?.value || ''
            ).trim();
            adminData.apiSettings.ai.providers.doubao.baseUrl = (
                document.getElementById('doubao-url')?.value
                || adminData.apiSettings.ai.providers.doubao.baseUrl
                || ''
            ).trim();
            adminData.apiSettings.ai.providers.doubao.enabled = doubaoBtn.getAttribute('data-enabled') === 'true';
        }

        // 智谱清言配置
        const zhipuBtn = document.getElementById('zhipu-enabled-btn');
        if (zhipuBtn) {
            adminData.apiSettings.ai.providers.zhipu.apiKey = (
                document.getElementById('zhipu-key')?.value || ''
            ).trim();
            adminData.apiSettings.ai.providers.zhipu.baseUrl = (
                document.getElementById('zhipu-url')?.value
                || adminData.apiSettings.ai.providers.zhipu.baseUrl
                || ''
            ).trim();
            adminData.apiSettings.ai.providers.zhipu.enabled = zhipuBtn.getAttribute('data-enabled') === 'true';
        }
        await syncSettingsToServer(adminData.apiSettings);
        localStorage.setItem('admin_settings', JSON.stringify(adminData.apiSettings));

        // 刷新AI API状态显示
        if (typeof loadAIAPIStatus === 'function') {
            loadAIAPIStatus();
        }

        // 显示成功消息
        if (typeof showNotification === 'function') {
            showNotification('AI配置已成功保存！', 'success');
        } else {
            alert('AI配置已成功保存！');
        }
    } catch (error) {
        console.error('保存AI设置失败:', error);
        if (typeof showNotification === 'function') {
            showNotification(`保存AI设置失败: ${error.message}`, 'error');
        } else {
            alert(`保存AI设置失败: ${error.message}`);
        }
    }
}

// 切换AI服务启用状态
function toggleAIEnabled(provider) {
    const btn = document.getElementById(`${provider}-enabled-btn`);
    if (!btn) return;

    const currentEnabled = btn.getAttribute('data-enabled') === 'true';
    const newEnabled = !currentEnabled;
    
    // 更新按钮状态
    btn.setAttribute('data-enabled', newEnabled);
    btn.className = newEnabled ? 'btn btn-success' : 'btn btn-secondary';
    btn.innerHTML = newEnabled 
        ? '<i class="fas fa-check-circle"></i> 已启用' 
        : '<i class="fas fa-times-circle"></i> 已禁用';
    
    // 立即更新数据
    adminData.apiSettings.ai.providers[provider].enabled = newEnabled;
    
    // 显示提示
    const providerName = adminData.apiSettings.ai.providers[provider].name;
    showSuccessToast(`${providerName}已${newEnabled ? '启用' : '禁用'}！`);
}

// 测试AI API连接（立即暴露到全局作用域）
async function testAIAPI(provider) {
    const statusEl = document.getElementById(`${provider}-test-status`);
    if (!statusEl) {
        return;
    }

    const providerConfig = adminData.apiSettings.ai.providers[provider];
    if (!providerConfig) {
        statusEl.textContent = '⚠ 未知的AI提供商';
        statusEl.style.color = '#e74c3c';
        return;
    }

    const apiKey = (
        document.getElementById(`${provider}-key`)?.value
        || providerConfig.apiKey
        || ''
    ).trim();
    const baseUrl = (
        document.getElementById(`${provider}-url`)?.value
        || providerConfig.baseUrl
        || ''
    ).trim();

    if (!apiKey) {
        statusEl.textContent = '⚠ 请先输入API Key';
        statusEl.style.color = '#e74c3c';
        return;
    }

    if (!baseUrl) {
        statusEl.textContent = '⚠ 请先输入Base URL';
        statusEl.style.color = '#e74c3c';
        return;
    }

    statusEl.textContent = '⏳ 正在测试API连接...';
    statusEl.style.color = '#f39c12';

    try {
        const response = await fetchAdminAIProxy('/proxy/ai/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                provider,
                apiKey,
                baseUrl,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data?.success) {
            const errorMsg = data?.error?.message || data?.message || `HTTP ${response.status}`;
            throw new Error(errorMsg);
        }

        const latency = data?.data?.latency;
        statusEl.innerHTML = `✓ API连接成功<br><small style="color: #666;">延迟 ${latency || '-'}ms</small>`;
        statusEl.style.color = '#27ae60';
        showNotification(`${providerConfig.name || provider} API测试成功`, 'success');
    } catch (error) {
        console.error('AI API测试错误:', error);
        const errorMsg = error.message || '未知错误';
        statusEl.innerHTML = `✗ 测试失败<br><small style="color: #e74c3c;">${errorMsg}</small>`;
        statusEl.style.color = '#e74c3c';
        showNotification(`${providerConfig.name || provider} API测试失败: ${errorMsg}`, 'error');
    }
}

// 立即暴露函数到全局作用域（在函数定义后立即执行）
if (typeof window !== 'undefined') {
    window.saveAISettings = saveAISettings;
    window.testAIAPI = testAIAPI;
    window.toggleSmartDeviceEnabled = toggleSmartDeviceEnabled;
    window.toggleAIEnabled = toggleAIEnabled;
    window.togglePasswordVisibility = togglePasswordVisibility;
    window.createPasswordInputWithToggle = createPasswordInputWithToggle;
}

// 加载地理位置API设置页面
function loadLocationAPIPage() {
    const providers = adminData.apiSettings.location.providers;
    const defaultProvider = adminData.apiSettings.location.defaultProvider;
    const container = document.getElementById('location-api-page');

    let html = `
        <div class="content-card">
            <div class="card-header">
                <h3><i class="fas fa-map-marked-alt"></i> 地理位置API配置</h3>
            </div>
            <div class="card-body">
                <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div style="font-weight: bold; margin-bottom: 10px;"><i class="fas fa-info-circle"></i> 使用说明</div>
                    <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.8;">
                        <li>地理位置API用于地址解析、距离计算等功能</li>
                        <li>建议使用高德地图API（国内）或百度地图API</li>
                        <li>配置后可以更准确地解析用户输入的地址</li>
                        <li>多个提供商可以同时启用，系统会按优先级使用</li>
                    </ul>
                </div>
                
                <div class="form-group">
                    <label class="form-label">默认地理位置服务提供商</label>
                    <select class="form-input" id="location-default-provider">
                        <option value="amap" ${defaultProvider === 'amap' ? 'selected' : ''}>高德地图（推荐）</option>
                        <option value="baidu" ${defaultProvider === 'baidu' ? 'selected' : ''}>百度地图</option>
                        <option value="tencent" ${defaultProvider === 'tencent' ? 'selected' : ''}>腾讯地图</option>
                        <option value="tianditu" ${defaultProvider === 'tianditu' ? 'selected' : ''}>天地图</option>
                    </select>
                </div>
                
                <div class="api-providers-list" style="margin-top: 30px;">
                    <h4 style="margin-bottom: 20px;">地理位置服务提供商配置</h4>
    `;

    // 为了兼容旧数据，确保provider对象存在
    const cloneProviders = JSON.parse(JSON.stringify(providers || {}));
    cloneProviders.tianditu = cloneProviders.tianditu || { name: '天地图', enabled: false };
    cloneProviders.tianditu.webKey
        = cloneProviders.tianditu.webKey || cloneProviders.tianditu.apiKey || '';
    cloneProviders.baidu = cloneProviders.baidu || { name: '百度地图', enabled: false };
    cloneProviders.baidu.webKey = cloneProviders.baidu.webKey || cloneProviders.baidu.apiKey || '';
    cloneProviders.tencent = cloneProviders.tencent || { name: '腾讯地图', enabled: false };
    cloneProviders.tencent.webKey
        = cloneProviders.tencent.webKey || cloneProviders.tencent.apiKey || '';
    cloneProviders.amap = cloneProviders.amap || { name: '高德地图', enabled: false };
    cloneProviders.amap.webKey = cloneProviders.amap.webKey || cloneProviders.amap.apiKey || '';

    // 高德地图配置
    const amapEnabled = cloneProviders.amap.enabled;
    const amapBtnClass = amapEnabled ? 'btn btn-success' : 'btn btn-secondary';
    const amapBtnText = amapEnabled ? '已启用' : '已禁用';
    const amapBtnIcon = amapEnabled ? 'fa-check-circle' : 'fa-times-circle';
    html += `
        <div class="provider-card" style="margin-bottom: 20px;">
            <div class="provider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0;">
                    <i class="fas fa-map" style="color: #00a762; margin-right: 8px;"></i>${providers.amap.name}
                </h4>
                <button type="button" class="${amapBtnClass}" id="amap-enabled-btn" data-provider="amap" data-enabled="${amapEnabled}" onclick="toggleLocationEnabled('amap')">
                    <i class="fas ${amapBtnIcon}"></i> ${amapBtnText}
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">Web端 API Key（JS SDK）</label>
                ${createPasswordInputWithToggle('amap-web-key', providers.amap.webKey || providers.amap.apiKey || '', '用于前端JS地图展示的key')}
                <small style="color: #999; display: block; margin-top: 5px;">
                    需在高德控制台创建“Web端(JS API)”应用，配置域名白名单
                </small>
            </div>
            <div class="form-group">
                <label class="form-label">Base URL</label>
                <input type="text" class="form-input" id="amap-url" 
                value="${providers.amap.baseUrl}" placeholder="API基础地址">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-secondary" onclick="testLocationAPI('amap')" style="margin-right: 10px;">
                    <i class="fas fa-vial"></i> 测试连接
                </button>
                <span id="amap-test-status" style="color: #999; font-size: 0.9rem;"></span>
            </div>
        </div>
    `;

    // 百度地图配置
    const baiduEnabled = providers.baidu.enabled;
    const baiduBtnClass = baiduEnabled ? 'btn btn-success' : 'btn btn-secondary';
    const baiduBtnText = baiduEnabled ? '已启用' : '已禁用';
    const baiduBtnIcon = baiduEnabled ? 'fa-check-circle' : 'fa-times-circle';
    html += `
        <div class="provider-card" style="margin-bottom: 20px;">
            <div class="provider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0;">
                    <i class="fas fa-map" style="color: #3385ff; margin-right: 8px;"></i>${providers.baidu.name}
                </h4>
                <button type="button" class="${baiduBtnClass}" id="baidu-enabled-btn" data-provider="baidu" data-enabled="${baiduEnabled}" onclick="toggleLocationEnabled('baidu')">
                    <i class="fas ${baiduBtnIcon}"></i> ${baiduBtnText}
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">API Key (AK)</label>
                ${createPasswordInputWithToggle('baidu-key', providers.baidu.apiKey, '输入百度地图API Key')}
                <small style="color: #999; display: block; margin-top: 5px;">
                    <a href="https://lbsyun.baidu.com/" target="_blank" style="color: #667eea;">获取百度地图API Key</a>
                </small>
            </div>
            <div class="form-group">
                <label class="form-label">Base URL</label>
                <input type="text" class="form-input" id="baidu-url" 
                value="${providers.baidu.baseUrl}" placeholder="API基础地址">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-secondary" onclick="testLocationAPI('baidu')" style="margin-right: 10px;">
                    <i class="fas fa-vial"></i> 测试连接
                </button>
                <span id="baidu-test-status" style="color: #999; font-size: 0.9rem;"></span>
            </div>
        </div>
    `;

    // 腾讯地图配置
    const tencentEnabled = providers.tencent.enabled;
    const tencentBtnClass = tencentEnabled ? 'btn btn-success' : 'btn btn-secondary';
    const tencentBtnText = tencentEnabled ? '已启用' : '已禁用';
    const tencentBtnIcon = tencentEnabled ? 'fa-check-circle' : 'fa-times-circle';
    html += `
        <div class="provider-card" style="margin-bottom: 20px;">
            <div class="provider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0;">
                    <i class="fas fa-map" style="color: #0099ff; margin-right: 8px;"></i>${providers.tencent.name}
                </h4>
                <button type="button" class="${tencentBtnClass}" id="tencent-enabled-btn" data-provider="tencent" data-enabled="${tencentEnabled}" onclick="toggleLocationEnabled('tencent')">
                    <i class="fas ${tencentBtnIcon}"></i> ${tencentBtnText}
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">API Key</label>
                ${createPasswordInputWithToggle('tencent-key', providers.tencent.apiKey, '输入腾讯地图API Key')}
                <small style="color: #999; display: block; margin-top: 5px;">
                    <a href="https://lbs.qq.com/" target="_blank" style="color: #667eea;">获取腾讯地图API Key</a>
                </small>
            </div>
            <div class="form-group">
                <label class="form-label">Base URL</label>
                <input type="text" class="form-input" id="tencent-url" 
                value="${providers.tencent.baseUrl}" placeholder="API基础地址">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-secondary" onclick="testLocationAPI('tencent')" style="margin-right: 10px;">
                    <i class="fas fa-vial"></i> 测试连接
                </button>
                <span id="tencent-test-status" style="color: #999; font-size: 0.9rem;"></span>
            </div>
        </div>
    `;

    // 天地图配置
    const tiandituEnabled = cloneProviders.tianditu.enabled;
    const tiandituBtnClass = tiandituEnabled ? 'btn btn-success' : 'btn btn-secondary';
    const tiandituBtnText = tiandituEnabled ? '已启用' : '已禁用';
    const tiandituBtnIcon = tiandituEnabled ? 'fa-check-circle' : 'fa-times-circle';
    html += `
        <div class="provider-card" style="margin-bottom: 20px;">
            <div class="provider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0;">
                    <i class="fas fa-map" style="color: #d32f2f; margin-right: 8px;"></i>${providers.tianditu?.name || '天地图'}
                </h4>
                <button type="button" class="${tiandituBtnClass}" id="tianditu-enabled-btn" data-provider="tianditu" data-enabled="${tiandituEnabled}" onclick="toggleLocationEnabled('tianditu')">
                    <i class="fas ${tiandituBtnIcon}"></i> ${tiandituBtnText}
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">API Key (密钥)</label>
                ${createPasswordInputWithToggle('tianditu-key', cloneProviders.tianditu.webKey || cloneProviders.tianditu.apiKey || '', '输入天地图API Key')}
                <small style="color: #999; display: block; margin-top: 5px;">
                    <a href="https://console.tianditu.gov.cn/" target="_blank" style="color: #667eea;">获取天地图API Key</a>
                </small>
            </div>
            <div class="form-group">
                <label class="form-label">Base URL</label>
                <input type="text" class="form-input" id="tianditu-url" 
                value="${providers.tianditu?.baseUrl || 'https://api.tianditu.gov.cn'}" placeholder="API基础地址">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-secondary" onclick="testLocationAPI('tianditu')" style="margin-right: 10px;">
                    <i class="fas fa-vial"></i> 测试连接
                </button>
                <span id="tianditu-test-status" style="color: #999; font-size: 0.9rem;"></span>
            </div>
        </div>
    `;

    html += `
                </div>
                
                <div class="form-group" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
                    <button type="button" class="btn btn-primary" onclick="saveLocationAPISettings()" style="padding: 12px 30px; font-size: 1rem;">
                        <i class="fas fa-save"></i> 保存配置
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="resetLocationAPISettings()" style="padding: 12px 30px; font-size: 1rem; margin-left: 10px;">
                        <i class="fas fa-undo"></i> 重置
                    </button>
                </div>
            </div>
        </div>
        
        <!-- API使用说明 -->
        <div class="content-card" style="margin-top: 20px;">
            <div class="card-header">
                <h3><i class="fas fa-book"></i> API使用说明</h3>
            </div>
            <div class="card-body">
                <div style="line-height: 1.8; color: #666;">
                    <h4 style="color: #333; margin-bottom: 10px;">高德地图API</h4>
                    <p>高德地图当前采用前端直连方式测试地理编码，适合国内地址解析场景。</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li><strong>推荐 Key 类型</strong>：Web端(JS API) Key</li>
                        <li><strong>调用方式</strong>：前端 JSONP 直连，不再依赖后端代理或第三方 CORS 代理</li>
                        <li><strong>注意</strong>：需在控制台配置当前站点域名白名单</li>
                    </ul>
                    
                    <h4 style="color: #333; margin-top: 20px; margin-bottom: 10px;">百度地图API</h4>
                    <p>百度地图地理编码测试已改为前端直连模式。</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Geocoding API：地址转坐标</li>
                        <li>使用 AK 进行前端直连测试</li>
                        <li>如失败，请检查白名单、配额与安全配置</li>
                    </ul>
                    
                    <h4 style="color: #333; margin-top: 20px; margin-bottom: 10px;">腾讯地图API</h4>
                    <p>腾讯地图支持前端直连地理编码测试。</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Geocoder API：地理编码服务</li>
                        <li>测试时直接从浏览器发起请求</li>
                        <li>请确认 Key 已启用对应 Web 能力</li>
                    </ul>
                    
                    <h4 style="color: #333; margin-top: 20px; margin-bottom: 10px;">天地图API</h4>
                    <p>天地图使用前端直连方式测试地址解析能力。</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>地理编码服务：地址与坐标互转</li>
                        <li>使用密钥直接在前端调用</li>
                        <li>如请求失败，请优先检查密钥状态与访问限制</li>
                    </ul>
                    
                    <h4 style="color: #333; margin-top: 20px; margin-bottom: 10px;">注意事项</h4>
                    <ul style="margin: 10px 0; padding-left: 20px; color: #e74c3c;">
                        <li>当前“测试连接”全部为前端直连模式，不依赖后端代理</li>
                        <li>请确保 API Key 有足够配额，并已配置域名白名单或安全策略</li>
                        <li>如果测试失败，优先检查 Key 类型、白名单、配额和第三方平台控制台状态</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// 保存地理位置API设置
async function saveLocationAPISettings() {
    try {
        const defaultProvider = document.getElementById('location-default-provider')?.value;
        if (defaultProvider) {
            adminData.apiSettings.location.defaultProvider = defaultProvider;
        }

        // 高德地图配置
        const amapBtn = document.getElementById('amap-enabled-btn');
        if (amapBtn) {
            const amapWebKey = document.getElementById('amap-web-key')?.value || '';
            adminData.apiSettings.location.providers.amap.webKey = amapWebKey;
            adminData.apiSettings.location.providers.amap.apiKey = amapWebKey;
            adminData.apiSettings.location.providers.amap.baseUrl
                = document.getElementById('amap-url').value;
            adminData.apiSettings.location.providers.amap.enabled
                = amapBtn.getAttribute('data-enabled') === 'true';
        }

        // 百度地图配置
        const baiduBtn = document.getElementById('baidu-enabled-btn');
        if (baiduBtn) {
            const baiduKey = document.getElementById('baidu-key').value;
            adminData.apiSettings.location.providers.baidu.webKey = baiduKey;
            adminData.apiSettings.location.providers.baidu.apiKey = baiduKey;
            adminData.apiSettings.location.providers.baidu.baseUrl
                = document.getElementById('baidu-url').value;
            adminData.apiSettings.location.providers.baidu.enabled
                = baiduBtn.getAttribute('data-enabled') === 'true';
        }

        // 腾讯地图配置
        const tencentBtn = document.getElementById('tencent-enabled-btn');
        if (tencentBtn) {
            const tencentKey = document.getElementById('tencent-key').value;
            adminData.apiSettings.location.providers.tencent.webKey = tencentKey;
            adminData.apiSettings.location.providers.tencent.apiKey = tencentKey;
            adminData.apiSettings.location.providers.tencent.baseUrl
                = document.getElementById('tencent-url').value;
            adminData.apiSettings.location.providers.tencent.enabled
                = tencentBtn.getAttribute('data-enabled') === 'true';
        }

        // 天地图配置
        const tiandituBtn = document.getElementById('tianditu-enabled-btn');
        if (tiandituBtn) {
            adminData.apiSettings.location.providers.tianditu
                = adminData.apiSettings.location.providers.tianditu || {};
            const tiandituKey = document.getElementById('tianditu-key').value;
            adminData.apiSettings.location.providers.tianditu.webKey = tiandituKey;
            adminData.apiSettings.location.providers.tianditu.apiKey = tiandituKey;
            adminData.apiSettings.location.providers.tianditu.baseUrl
                = document.getElementById('tianditu-url').value;
            adminData.apiSettings.location.providers.tianditu.enabled
                = tiandituBtn.getAttribute('data-enabled') === 'true';
            adminData.apiSettings.location.providers.tianditu.name = '天地图';
        }

        await syncSettingsToServer(adminData.apiSettings);
        localStorage.setItem('admin_settings', JSON.stringify(adminData.apiSettings));

        loadLocationAPIStatus();
        showNotification('地理位置API配置已成功保存！', 'success');
    } catch (error) {
        console.error('保存地理位置API配置失败:', error);
        showNotification(`保存地理位置API配置失败: ${error.message || '未知错误'}`, 'error');
    }
}

// 切换地理位置服务启用状态
function toggleLocationEnabled(provider) {
    const btn = document.getElementById(`${provider}-enabled-btn`);
    if (!btn) return;

    const currentEnabled = btn.getAttribute('data-enabled') === 'true';
    const newEnabled = !currentEnabled;
    
    // 更新按钮状态
    btn.setAttribute('data-enabled', newEnabled);
    btn.className = newEnabled ? 'btn btn-success' : 'btn btn-secondary';
    btn.innerHTML = newEnabled 
        ? '<i class="fas fa-check-circle"></i> 已启用' 
        : '<i class="fas fa-times-circle"></i> 已禁用';
    
    // 立即更新数据
    adminData.apiSettings.location.providers[provider].enabled = newEnabled;
    
    // 显示提示
    const providerName = adminData.apiSettings.location.providers[provider].name;
    showSuccessToast(`${providerName}已${newEnabled ? '启用' : '禁用'}！`);
}

// 测试地理位置API连接（前端直连真实API测试）
async function testLocationAPI(provider) {
    const statusEl = document.getElementById(`${provider}-test-status`);
    if (!statusEl) {
        return;
    }

    const providerConfig = adminData.apiSettings.location.providers[provider];
    const keyInputId = provider === 'amap' ? 'amap-web-key' : `${provider}-key`;
    const providerKey = providerConfig.webKey || providerConfig.apiKey;
    const apiKey = document.getElementById(keyInputId)?.value || providerKey;
    const baseUrl = document.getElementById(`${provider}-url`)?.value || providerConfig.baseUrl;

    if (!apiKey) {
        statusEl.textContent = '⚠ 请先输入API Key';
        statusEl.style.color = '#e74c3c';
        return;
    }

    if (!baseUrl) {
        statusEl.textContent = '⚠ 请先输入Base URL';
        statusEl.style.color = '#e74c3c';
        return;
    }

    statusEl.textContent = '⏳ 正在测试API连接...';
    statusEl.style.color = '#f39c12';

    try {
        let testResult;
        const testAddress = '北京市天安门'; // 测试地址

        // 根据不同的提供商调用相应的API
        switch (provider) {
            case 'amap':
                testResult = await testAmapAPI(apiKey, baseUrl, testAddress);
                break;
            case 'baidu':
                testResult = await testBaiduAPI(apiKey, baseUrl, testAddress);
                break;
            case 'tencent':
                testResult = await testTencentAPI(apiKey, baseUrl, testAddress);
                break;
            case 'tianditu':
                testResult = await testTiandituAPI(apiKey, baseUrl, testAddress);
                break;
            default:
                throw new Error('未知的地图服务提供商');
        }

        if (testResult.success) {
            statusEl.innerHTML = `✓ API连接成功<br><small style="color: #666;">${testResult.message}</small>`;
            statusEl.style.color = '#27ae60';
            showNotification(`${providerConfig.name} API测试成功`, 'success');
        } else if (testResult.unsupported) {
            statusEl.innerHTML = `ℹ 暂不支持<br><small style="color: #666;">${testResult.message}</small>`;
            statusEl.style.color = '#3498db';
            showNotification(`${providerConfig.name}: ${testResult.message}`, 'info');
        } else {
            statusEl.innerHTML = `✗ API测试失败<br><small style="color: #e74c3c;">${testResult.message}</small>`;
            statusEl.style.color = '#e74c3c';
            showNotification(`${providerConfig.name} API测试失败: ${testResult.message}`, 'error');
        }
    } catch (error) {
        console.error('API测试错误:', error);
        statusEl.innerHTML = `✗ 测试失败<br><small style="color: #e74c3c;">${error.message}</small>`;
        statusEl.style.color = '#e74c3c';
        showNotification(`API测试失败: ${error.message}`, 'error');
    }
}

// 动态加载高德地理编码 SDK
async function loadAmapGeocoderSdk(apiKey, securityKey = '') {
    if (!apiKey) {
        throw new Error('请先配置高德地图 Web 端 API Key');
    }

    if (window.AMap?.Geocoder) {
        return window.AMap;
    }

    if (window.__amapGeocoderSdkPromise) {
        return window.__amapGeocoderSdkPromise;
    }

    window.__amapGeocoderSdkPromise = new Promise((resolve, reject) => {
        const cleanup = () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };

        const script = document.createElement('script');
        const callbackName = `__amapSdkReady_${Date.now()}`;
        const query = new URLSearchParams({
            v: '2.0',
            key: apiKey,
            plugin: 'AMap.Geocoder',
            callback: callbackName,
        });

        if (securityKey) {
            window._AMapSecurityConfig = {
                ...(window._AMapSecurityConfig || {}),
                securityJsCode: securityKey,
            };
        }

        window[callbackName] = () => {
            delete window[callbackName];
            resolve(window.AMap);
        };

        script.src = `https://webapi.amap.com/maps?${query.toString()}`;
        script.async = true;
        script.onerror = () => {
            delete window[callbackName];
            cleanup();
            window.__amapGeocoderSdkPromise = null;
            reject(new Error('高德地图 SDK 加载失败，请检查网络、Key 和域名白名单配置'));
        };

        document.head.appendChild(script);
    });

    try {
        return await window.__amapGeocoderSdkPromise;
    } catch (error) {
        window.__amapGeocoderSdkPromise = null;
        throw error;
    }
}

// 测试高德地图API
async function testAmapAPI(apiKey, baseUrl, address) {
    try {
        const locationConfig = adminData?.apiSettings?.location?.providers?.amap || {};
        const securityKey = locationConfig.securityKey || '';
        const AMapSdk = await loadAmapGeocoderSdk(apiKey, securityKey);
        const geocoder = new AMapSdk.Geocoder();

        const geocodeResult = await new Promise((resolve, reject) => {
            geocoder.getLocation(address, (status, result) => {
                if (status === 'complete' && result?.geocodes?.length > 0) {
                    resolve(result);
                    return;
                }

                const errorInfo = result?.info || result?.infocode || status || '地理编码失败';
                reject(new Error(errorInfo));
            });
        });

        const geocode = geocodeResult.geocodes[0];
        const location = geocode.location;
        const lng = location?.lng ?? location?.getLng?.();
        const lat = location?.lat ?? location?.getLat?.();

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return {
                success: true,
                message: `成功解析地址，坐标: ${lat}, ${lng}`,
            };
        }

        return {
            success: false,
            message: '高德地图返回结果中未包含有效坐标',
        };
    } catch (error) {
        console.error('测试高德地图API失败:', error);

        const rawMessage = error.message || '高德地图请求失败';
        let errorMessage = rawMessage;
        if (rawMessage.includes('USERKEY_PLAT_NOMATCH')) {
            errorMessage = '当前 Key 与前端调用场景不匹配，请在高德控制台检查域名白名单和 Web 端(JS API)权限';
        } else if (rawMessage.includes('INVALID_USER_KEY')) {
            errorMessage = '高德 API Key 无效，请检查后重试';
        } else if (rawMessage.includes('INVALID_USER_SIGNATURE')) {
            errorMessage = '高德 API Key 签名校验失败，请检查 Key 类型与安全设置';
        } else if (rawMessage.includes('DAILY_QUERY_OVER_LIMIT')) {
            errorMessage = '高德 API 调用次数已超限，请检查配额';
        }

        return {
            success: false,
            message: errorMessage,
        };
    }
}

// 通过前端服务器代理测试地图服务，避免浏览器跨域限制
async function testLocationProviderViaProxy(provider, apiKey, baseUrl, address) {
    const response = await fetch('/proxy/location/test', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            provider,
            apiKey,
            baseUrl,
            address,
        }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || `HTTP ${response.status}`);
    }

    return {
        success: true,
        message: data?.message || '测试成功',
        data: data?.data || null,
    };
}

// 测试百度地图API
async function testBaiduAPI(apiKey, baseUrl, address) {
    if (!apiKey) {
        return {
            success: false,
            message: '请先配置百度地图 API Key',
        };
    }

    return testLocationProviderViaProxy('baidu', apiKey, baseUrl, address);
}

// 测试腾讯地图API
async function testTencentAPI(apiKey, baseUrl, address) {
    if (!apiKey) {
        return {
            success: false,
            message: '请先配置腾讯地图 Key',
        };
    }

    return testLocationProviderViaProxy('tencent', apiKey, baseUrl, address);
}



// 测试天地图API
async function testTiandituAPI(apiKey, baseUrl, address) {
    if (!apiKey) {
        return {
            success: false,
            message: '请先配置天地图 API Key',
        };
    }

    return testLocationProviderViaProxy('tianditu', apiKey, baseUrl, address);
}

// 重置地理位置API设置
async function resetLocationAPISettings() {
    if (!confirm('确定要重置所有地理位置API配置吗？')) {
        return;
    }

    adminData.apiSettings.location = {
        providers: {
            amap: {
                apiKey: '',
                baseUrl: 'https://restapi.amap.com/v3',
                enabled: false,
                name: '高德地图',
            },
            baidu: {
                apiKey: '',
                baseUrl: 'https://api.map.baidu.com',
                enabled: false,
                name: '百度地图',
            },
            tencent: {
                apiKey: '',
                baseUrl: 'https://apis.map.qq.com',
                enabled: false,
                name: '腾讯地图',
            },
            tianditu: {
                apiKey: '',
                baseUrl: 'https://api.tianditu.gov.cn',
                enabled: true,
                name: '天地图',
            },
        },
        defaultProvider: 'tianditu',
    };

    try {
        await syncSettingsToServer(adminData.apiSettings);
        localStorage.setItem('admin_settings', JSON.stringify(adminData.apiSettings));
        showNotification('配置已重置并同步到服务器', 'success');
        loadLocationAPIPage();
    } catch (error) {
        console.error('重置地理位置API配置失败:', error);
        showNotification(`重置地理位置API配置失败: ${error.message || '未知错误'}`, 'error');
    }
}

// 加载保存的配置
// 加载地理位置API配置
async function loadLocationAPIConfig() {
    try {
        // 优先从服务器加载设置
        let settings = await loadSettingsFromServer();

        // 如果服务器没有设置，从localStorage加载
        if (!settings) {
            const saved = localStorage.getItem('admin_settings');
            if (saved) {
                settings = JSON.parse(saved);
            }
        }

        if (settings) {
            if (settings.location) {
                adminData.apiSettings.location = {
                    ...adminData.apiSettings.location,
                    ...settings.location,
                };
            }
            // 如果从服务器加载成功，也更新localStorage作为备份
            if (settings !== JSON.parse(localStorage.getItem('admin_settings') || '{}')) {
                localStorage.setItem('admin_settings', JSON.stringify(settings));
            }
        }
    } catch (error) {
        console.error('加载地理位置API配置失败:', error);
        // 降级到localStorage
        try {
            const saved = localStorage.getItem('admin_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.location) {
                    adminData.apiSettings.location = {
                        ...adminData.apiSettings.location,
                        ...settings.location,
                    };
                }
            }
        } catch (e) {
            console.error('从localStorage加载也失败:', e);
        }
    }
}

async function loadSavedSettings() {
    try {
        // 优先从服务器加载设置
        let settings = await loadSettingsFromServer();

        // 如果服务器没有设置，从localStorage加载（兼容两个键名）
        if (!settings) {
            let saved = localStorage.getItem('adminSettings');
            if (!saved) {
                saved = localStorage.getItem('admin_settings');
            }
            if (saved) {
                settings = JSON.parse(saved);
            }
        }

        if (settings) {
            // 迁移旧的 fitbit 配置到新的 smartDevices 结构
            if (settings.fitbit && !settings.smartDevices) {
                settings.smartDevices = {
                    fitbit: {
                        ...settings.fitbit,
                        name: 'Fitbit',
                    },
                    tuya: {
                        accessId: 'mkwj97jv7ernfdjxwavq',
                        accessSecret: '',
                        projectCode: 'p1773737826154h4jpph',
                        baseUrl: 'https://openapi.tuyacn.com',
                        enabled: true,
                        name: '涂鸦智能',
                    },
                };
            }

            // AI 配置迁移和合并逻辑
            if (settings.ai) {
                const newAIConfig = adminData.apiSettings.ai;
                const oldAIConfig = settings.ai;

                // 为每个新的 AI 提供商合并旧配置（如果存在）
                Object.keys(newAIConfig.providers).forEach(provider => {
                    if (oldAIConfig.providers && oldAIConfig.providers[provider]) {
                        // 如果旧配置中有这个提供商，保留其 enabled 状态
                        newAIConfig.providers[provider].enabled
                            = oldAIConfig.providers[provider].enabled !== false;
                    }
                });

                // 确保使用新的默认配置
                adminData.apiSettings.ai = newAIConfig;

                // 同时更新 settings 中的 ai 配置
                settings.ai = newAIConfig;
            }

            // Smart Devices 配置迁移和合并逻辑
            if (settings.smartDevices) {
                const newSmartDevicesConfig = adminData.apiSettings.smartDevices;
                const oldSmartDevicesConfig = settings.smartDevices;

                // 为每个智能设备提供商合并旧配置
                Object.keys(newSmartDevicesConfig).forEach(provider => {
                    if (oldSmartDevicesConfig[provider]) {
                        // 如果旧配置中有这个提供商，检查是否需要保留旧值
                        // 如果旧配置是空的，使用新的默认值
                        const oldProvider = oldSmartDevicesConfig[provider];
                        const newProvider = newSmartDevicesConfig[provider];
                        
                        // 对于 Fitbit，如果旧配置是空的，使用新的默认值
                        if (provider === 'fitbit') {
                            if (!oldProvider.clientId || !oldProvider.clientSecret || !oldProvider.redirectUri) {
                                // 旧配置不完整，使用新的默认值
                                console.log('Fitbit 配置不完整，使用新的默认值');
                            } else {
                                // 旧配置完整，保留旧值但更新 enabled 状态
                                newProvider.clientId = oldProvider.clientId;
                                newProvider.clientSecret = oldProvider.clientSecret;
                                newProvider.redirectUri = oldProvider.redirectUri;
                                newProvider.enabled = oldProvider.enabled !== false;
                            }
                        } else {
                            // 对于其他提供商，保留旧配置
                            Object.assign(newProvider, oldProvider);
                        }
                    }
                });

                // 确保使用新的默认配置
                adminData.apiSettings.smartDevices = newSmartDevicesConfig;

                // 同时更新 settings 中的 smartDevices 配置
                settings.smartDevices = newSmartDevicesConfig;
            }

            // 合并保存的配置到adminData
            Object.keys(settings).forEach(key => {
                if (key !== 'ai' && key !== 'smartDevices' && adminData.apiSettings[key]) {
                    Object.assign(adminData.apiSettings[key], settings[key]);
                }
            });
            console.log('已加载保存的配置', adminData.apiSettings);

            // 更新localStorage作为备份（保存到两个键名以兼容旧代码）
            const settingsJson = JSON.stringify(settings);
            localStorage.setItem('adminSettings', settingsJson);
            localStorage.setItem('admin_settings', settingsJson);
        } else {
            // 如果没有找到任何保存的配置，使用默认配置并保存到 localStorage
            console.log('未找到保存的配置，使用默认配置');
            const defaultSettings = adminData.apiSettings;
            const settingsJson = JSON.stringify(defaultSettings);
            localStorage.setItem('adminSettings', settingsJson);
            localStorage.setItem('admin_settings', settingsJson);
            console.log('已保存默认配置到 localStorage', defaultSettings);
        }
    } catch (error) {
        console.error('加载配置失败:', error);
        // 降级到localStorage
        try {
            let saved = localStorage.getItem('adminSettings');
            if (!saved) {
                saved = localStorage.getItem('admin_settings');
            }
            if (saved) {
                const parsed = JSON.parse(saved);

                // 迁移旧的 fitbit 配置
                if (parsed.fitbit && !parsed.smartDevices) {
                    parsed.smartDevices = {
                        fitbit: {
                            ...parsed.fitbit,
                            name: 'Fitbit',
                        },
                        tuya: {
                            accessId: 'mkwj97jv7ernfdjxwavq',
                            accessSecret: '',
                            projectCode: 'p1773737826154h4jpph',
                            baseUrl: 'https://openapi.tuyacn.com',
                            enabled: true,
                            name: '涂鸦智能',
                        },
                    };
                }

                // AI 配置迁移和合并逻辑（降级方案）
                if (parsed.ai) {
                    const newAIConfig = adminData.apiSettings.ai;
                    const oldAIConfig = parsed.ai;

                    // 为每个新的 AI 提供商合并旧配置（如果存在）
                    Object.keys(newAIConfig.providers).forEach(provider => {
                        if (oldAIConfig.providers && oldAIConfig.providers[provider]) {
                            // 如果旧配置中有这个提供商，保留其 enabled 状态
                            newAIConfig.providers[provider].enabled
                                = oldAIConfig.providers[provider].enabled !== false;
                        }
                    });

                    // 确保使用新的默认配置
                    adminData.apiSettings.ai = newAIConfig;

                    // 同时更新 parsed 中的 ai 配置
                    parsed.ai = newAIConfig;
                }

                // Smart Devices 配置迁移和合并逻辑（降级方案）
                if (parsed.smartDevices) {
                    const newSmartDevicesConfig = adminData.apiSettings.smartDevices;
                    const oldSmartDevicesConfig = parsed.smartDevices;

                    // 为每个智能设备提供商合并旧配置
                    Object.keys(newSmartDevicesConfig).forEach(provider => {
                        if (oldSmartDevicesConfig[provider]) {
                            const oldProvider = oldSmartDevicesConfig[provider];
                            const newProvider = newSmartDevicesConfig[provider];
                            
                            // 对于 Fitbit，如果旧配置是空的，使用新的默认值
                            if (provider === 'fitbit') {
                                if (!oldProvider.clientId || !oldProvider.clientSecret || !oldProvider.redirectUri) {
                                    console.log('Fitbit 配置不完整，使用新的默认值');
                                } else {
                                    newProvider.clientId = oldProvider.clientId;
                                    newProvider.clientSecret = oldProvider.clientSecret;
                                    newProvider.redirectUri = oldProvider.redirectUri;
                                    newProvider.enabled = oldProvider.enabled !== false;
                                }
                            } else {
                                Object.assign(newProvider, oldProvider);
                            }
                        }
                    });

                    // 确保使用新的默认配置
                    adminData.apiSettings.smartDevices = newSmartDevicesConfig;

                    // 同时更新 parsed 中的 smartDevices 配置
                    parsed.smartDevices = newSmartDevicesConfig;
                }

                Object.keys(parsed).forEach(key => {
                    if (key !== 'ai' && key !== 'smartDevices' && adminData.apiSettings[key]) {
                        Object.assign(adminData.apiSettings[key], parsed[key]);
                    }
                });
                console.log('已从localStorage加载配置', adminData.apiSettings);

                // 保存迁移后的配置
                const settingsJson = JSON.stringify(parsed);
                localStorage.setItem('adminSettings', settingsJson);
                localStorage.setItem('admin_settings', settingsJson);
            } else {
                // 如果从localStorage也没有加载到配置，使用默认配置
                console.log('未找到 localStorage 配置，使用默认配置');
                const defaultSettings = adminData.apiSettings;
                const settingsJson = JSON.stringify(defaultSettings);
                localStorage.setItem('adminSettings', settingsJson);
                localStorage.setItem('admin_settings', settingsJson);
                console.log('已保存默认配置到 localStorage', defaultSettings);
            }
        } catch (e) {
            console.error('从localStorage加载也失败:', e);
            // 最后的降级方案：使用默认配置
            console.log('使用最后的降级方案：默认配置');
            const defaultSettings = adminData.apiSettings;
            const settingsJson = JSON.stringify(defaultSettings);
            localStorage.setItem('adminSettings', settingsJson);
            localStorage.setItem('admin_settings', settingsJson);
        }
    }
}

function normalizeAdminList(adminsResponse) {
    const visited = new WeakSet();
    const knownKeys = ['list', 'data', 'admins', 'items', 'rows', 'records'];

    function extract(value, depth = 0) {
        if (!value || depth > 5) {
            return null;
        }

        if (Array.isArray(value)) {
            return value;
        }

        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return extract(parsed, depth + 1);
            } catch (err) {
                console.warn('解析管理员响应字符串失败:', err);
                return null;
            }
        }

        if (typeof value !== 'object') {
            return null;
        }

        if (visited.has(value)) {
            return null;
        }
        visited.add(value);

        for (const key of knownKeys) {
            if (key in value) {
                const extracted = extract(value[key], depth + 1);
                if (Array.isArray(extracted) && extracted.length) {
                    return extracted;
                }
            }
        }

        for (const nested of Object.values(value)) {
            const extracted = extract(nested, depth + 1);
            if (Array.isArray(extracted) && extracted.length) {
                return extracted;
            }
        }

        // 兼容以对象形式存储的管理员映射 {id: admin}
        const objectValues = Object.values(value).filter(item => item && typeof item === 'object');
        const looksLikeAdminList
            = objectValues.length
            && objectValues.every(item => {
                if (Array.isArray(item)) {
                    return false;
                }
                const keys = Object.keys(item);
                return keys.includes('id') || keys.includes('username');
            });
        if (looksLikeAdminList) {
            return objectValues;
        }

        return null;
    }

    return extract(adminsResponse) || [];
}

function findPrimaryAdmin(adminList) {
    if (!Array.isArray(adminList)) {
        return null;
    }

    const preferredRoles = ['admin', 'main', 'super_admin', 'super', 'root'];

    for (const role of preferredRoles) {
        const candidate = adminList.find(admin => {
            if (!admin) {
                return false;
            }
            const adminRole = (admin.role || '').toString().toLowerCase();
            return adminRole === role;
        });
        if (candidate) {
            return candidate;
        }
    }

    const allPermissionAdmin = adminList.find(
        admin => Array.isArray(admin?.permissions) && admin.permissions.includes('all'),
    );
    if (allPermissionAdmin) {
        return allPermissionAdmin;
    }

    return adminList[0] || null;
}

// 同步设置到服务器
async function syncSettingsToServer(settings) {
    if (!window.apiService) {
        throw new Error('API服务不可用');
    }

    try {
        // 获取管理员列表，找到主管理员（role='admin'）
        const adminsResponse = await window.apiService.getAdminAdmins();
        const adminList = normalizeAdminList(adminsResponse);

        if (adminList.length === 0) {
            throw new Error('未能获取管理员列表，无法保存设置');
        }

        const mainAdmin = findPrimaryAdmin(adminList);

        if (!mainAdmin) {
            throw new Error('未找到主管理员账号，无法保存设置');
        }

        // 总是保存到主管理员账号，确保用户端和医院端可以获取到
        const updatedAdmin = await window.apiService.updateAdmin(mainAdmin.id, {
            settings,
        });

        // 更新登录信息中的settings（如果当前登录的是主管理员）
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        if (loginInfo.user?.id === mainAdmin.id && updatedAdmin && updatedAdmin.settings) {
            loginInfo.user = loginInfo.user || {};
            loginInfo.user.settings = updatedAdmin.settings;
            sessionStorage.setItem('loginInfo', JSON.stringify(loginInfo));
        }

        console.log('设置已同步到服务器（保存到主管理员账号）');
    } catch (error) {
        // 如果后端不支持settings字段，尝试使用sessionStorage作为临时方案
        // 这样至少在同一会话的不同标签页之间可以共享
        try {
            sessionStorage.setItem('admin_settings_sync', JSON.stringify(settings));
            console.log('设置已保存到sessionStorage（临时方案）');
        } catch (e) {
            console.error('保存到sessionStorage也失败:', e);
        }
        throw error;
    }
}

// 从服务器加载设置
async function loadSettingsFromServer() {
    if (!window.apiService) {
        return null;
    }

    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        const userId = loginInfo.user?.id || loginInfo.userId;

        if (!userId) {
            return null;
        }

        // 优先从登录信息中获取settings（如果登录时已返回）
        if (loginInfo.user?.settings) {
            try {
                const settings
                    = typeof loginInfo.user.settings === 'string'
                        ? JSON.parse(loginInfo.user.settings)
                        : loginInfo.user.settings;
                if (settings) {
                    console.log('从登录信息中加载设置');
                    return settings;
                }
            } catch (e) {
                console.warn('解析登录信息中的settings失败:', e);
            }
        }

        // 尝试从sessionStorage加载（临时方案）
        const sessionSettings = sessionStorage.getItem('admin_settings_sync');
        if (sessionSettings) {
            try {
                return JSON.parse(sessionSettings);
            } catch (e) {
                console.warn('解析sessionStorage设置失败:', e);
            }
        }

        // 优先使用新的接口拉取当前管理员的设置
        try {
            const mySettings = await window.apiService.getMyAdminSettings();
            if (mySettings) {
                console.log('通过 /me/settings 接口获取设置成功');
                loginInfo.user = loginInfo.user || {};
                loginInfo.user.settings = mySettings;
                sessionStorage.setItem('loginInfo', JSON.stringify(loginInfo));
                return mySettings;
            }
        } catch (myError) {
            console.warn('通过 /me/settings 接口获取设置失败:', myError);
        }

        // 尝试通过API获取当前管理员信息（包含settings）
        try {
            const adminInfo = await window.apiService.getAdmin(userId);
            if (adminInfo && adminInfo.settings) {
                const settings
                    = typeof adminInfo.settings === 'string'
                        ? JSON.parse(adminInfo.settings)
                        : adminInfo.settings;
                if (settings) {
                    console.log('从API获取设置成功');
                    // 更新登录信息中的settings
                    loginInfo.user = loginInfo.user || {};
                    loginInfo.user.settings = settings;
                    sessionStorage.setItem('loginInfo', JSON.stringify(loginInfo));
                    return settings;
                }
            }
        } catch (apiError) {
            console.warn('通过API获取设置失败:', apiError);
        }

        return null;
    } catch (error) {
        console.warn('从服务器加载设置失败:', error);
        return null;
    }
}

console.log('管理员后台脚本已加载');

// 授权码API适配（兼容旧代码调用）
(function attachAuthCodeApiAdapters() {
    if (!window.apiService) {
        return;
    }
    // 旧: getAuthCodes(filters) -> 新: listAuthCodes
    if (
        typeof window.apiService.getAuthCodes !== 'function'
        && typeof window.apiService.listAuthCodes === 'function'
    ) {
        window.apiService.getAuthCodes = function (filters = {}) {
            return window.apiService.listAuthCodes(filters);
        };
    }
    // 旧: generateAuthCode(province) -> 新: createAuthCode({ province }) 返回 {id, code}
    if (
        typeof window.apiService.generateAuthCode !== 'function'
        && typeof window.apiService.createAuthCode === 'function'
    ) {
        window.apiService.generateAuthCode = async function (province) {
            const data = await window.apiService.createAuthCode({ province });
            return data?.code;
        };
    }
    // 旧: createAuthCode(code, province) -> 统一走后端创建，不再传入code
    if (typeof window.apiService.createAuthCode === 'function') {
        // 保持新实现，不覆盖
    }
})();

// ==================== 功能配置管理 ====================

let currentFeatures = {};

// 加载功能配置
async function loadFeatures() {
    try {
        const response = await fetch('/api/features');
        const result = await response.json();

        if (result.success) {
            currentFeatures = result.features;
            renderFeaturesList();
        } else {
            showErrorToast(result.message || '加载功能配置失败');
        }
    } catch (error) {
        console.error('加载功能配置错误:', error);
        showErrorToast('加载功能配置失败，请稍后重试');
    }
}

// 渲染功能列表
function renderFeaturesList() {
    const container = document.getElementById('features-list');
    if (!container) {
        return;
    }

    const loginInfo = getCurrentAdminInfo();
    const isMainAdmin = loginInfo?.role === 'admin';

    let html = '';

    Object.entries(currentFeatures).forEach(([featureId, feature]) => {
        const isEnabled = feature.enabled;
        html += `
            <div class="feature-item">
                <div class="feature-info">
                    <div class="feature-name">${feature.name}</div>
                    <div class="feature-description">${feature.description}</div>
                </div>
                <div class="feature-status">
                    <span class="status-badge ${isEnabled ? 'enabled' : 'disabled'}">
                        ${isEnabled ? '已启用' : '已禁用'}
                    </span>
                    <div class="feature-toggle">
                        <label class="toggle-switch">
                            <input 
                                type="checkbox" 
                                ${isEnabled ? 'checked' : ''} 
                                ${!isMainAdmin ? 'disabled' : ''}
                                onchange="toggleFeature('${featureId}', this.checked)"
                            />
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// 切换功能状态
async function toggleFeature(featureId, enabled) {
    try {
        const loginInfo = getCurrentAdminInfo();
        const token = loginInfo?.token;

        const response = await fetch(`/api/features/${featureId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ enabled }),
        });

        const result = await response.json();

        if (result.success) {
            currentFeatures = result.features;
            renderFeaturesList();
            showSuccessToast(`${currentFeatures[featureId].name}已${enabled ? '启用' : '禁用'}`);
        } else {
            showErrorToast(result.message || '操作失败');
            renderFeaturesList();
        }
    } catch (error) {
        console.error('切换功能状态错误:', error);
        showErrorToast('操作失败，请稍后重试');
        renderFeaturesList();
    }
}

// 更新权限定义
ADMIN_PERMISSIONS.features = '功能配置';
ADMIN_PERMISSIONS.users = '用户管理';

// ============================================
// 用户管理模块
// ============================================

// 用户管理状态
const usersState = {
    users: [],
    filteredUsers: [],
    currentPage: 1,
    pageSize: 10,
    searchKeyword: '',
    statusFilter: 'all',
    genderFilter: 'all',
    editingUserId: null,
};

// 初始化Mock用户数据
function initMockUsers() {
    const mockUsers = [
        {
            id: 'user_001',
            username: 'zhangsan',
            nickname: '张三',
            gender: '男',
            phone: '00000000000',
            email: 'contact@example.invalid',
            province: '北京市',
            city: '北京市',
            address: '朝阳区建国路88号',
            birthDate: '1990-01-15',
            status: 'active',
            avatar: '',
            createdAt: '2024-01-15T10:30:00.000Z',
            lastLoginAt: '2024-03-30T08:15:00.000Z',
        },
        {
            id: 'user_002',
            username: 'lisi',
            nickname: '李四',
            gender: '女',
            phone: '00000000000',
            email: 'contact@example.invalid',
            province: '上海市',
            city: '上海市',
            address: '浦东新区陆家嘴环路1000号',
            birthDate: '1992-05-20',
            status: 'active',
            avatar: '',
            createdAt: '2024-02-10T14:20:00.000Z',
            lastLoginAt: '2024-03-29T16:45:00.000Z',
        },
        {
            id: 'user_003',
            username: 'wangwu',
            nickname: '王五',
            gender: '男',
            phone: '00000000000',
            email: 'contact@example.invalid',
            province: '广东省',
            city: '深圳市',
            address: '南山区科技园南区',
            birthDate: '1988-08-08',
            status: 'disabled',
            avatar: '',
            createdAt: '2024-01-25T09:10:00.000Z',
            lastLoginAt: '2024-02-15T11:30:00.000Z',
        },
        {
            id: 'user_004',
            username: 'zhaoliu',
            nickname: '赵六',
            gender: '女',
            phone: '00000000000',
            email: 'contact@example.invalid',
            province: '浙江省',
            city: '杭州市',
            address: '西湖区文三路90号',
            birthDate: '1995-12-03',
            status: 'active',
            avatar: '',
            createdAt: '2024-03-05T16:40:00.000Z',
            lastLoginAt: '2024-03-31T07:20:00.000Z',
        },
        {
            id: 'user_005',
            username: 'sunqi',
            nickname: '孙七',
            gender: '男',
            phone: '00000000000',
            email: 'contact@example.invalid',
            province: '江苏省',
            city: '南京市',
            address: '鼓楼区中山路1号',
            birthDate: '1991-03-25',
            status: 'active',
            avatar: '',
            createdAt: '2024-03-10T11:55:00.000Z',
            lastLoginAt: '2024-03-30T14:10:00.000Z',
        },
    ];

    if (!localStorage.getItem('adminUsers')) {
        localStorage.setItem('adminUsers', JSON.stringify(mockUsers));
    }
}

// 加载用户数据
function loadUsers() {
    initMockUsers();

    const storedUsers = localStorage.getItem('adminUsers');
    usersState.users = storedUsers ? JSON.parse(storedUsers) : [];

    filterUsers();
    updateUsersStats();
    renderUsersTable();
    renderPagination();
}

// 筛选用户
function filterUsers() {
    let filtered = [...usersState.users];

    // 搜索筛选
    if (usersState.searchKeyword) {
        const keyword = usersState.searchKeyword.toLowerCase();
        filtered = filtered.filter(
            user =>
                user.username.toLowerCase().includes(keyword)
                || user.nickname.toLowerCase().includes(keyword)
                || user.email.toLowerCase().includes(keyword)
                || user.phone.includes(keyword),
        );
    }

    // 状态筛选
    if (usersState.statusFilter !== 'all') {
        filtered = filtered.filter(user => user.status === usersState.statusFilter);
    }

    // 性别筛选
    if (usersState.genderFilter !== 'all') {
        filtered = filtered.filter(user => user.gender === usersState.genderFilter);
    }

    usersState.filteredUsers = filtered;
    usersState.currentPage = 1;
}

// 更新统计数据
function updateUsersStats() {
    const total = usersState.users.length;
    const active = usersState.users.filter(u => u.status === 'active').length;
    const disabled = usersState.users.filter(u => u.status === 'disabled').length;

    // 计算本周新增
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsers = usersState.users.filter(u => new Date(u.createdAt) >= oneWeekAgo).length;

    const totalCountEl = document.getElementById('total-users-count');
    const activeCountEl = document.getElementById('active-users-count');
    const newCountEl = document.getElementById('new-users-count');
    const disabledCountEl = document.getElementById('disabled-users-count');

    if (totalCountEl) {
        totalCountEl.textContent = total;
    }
    if (activeCountEl) {
        activeCountEl.textContent = active;
    }
    if (newCountEl) {
        newCountEl.textContent = newUsers;
    }
    if (disabledCountEl) {
        disabledCountEl.textContent = disabled;
    }
}

// 渲染用户表格
function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) {
        return;
    }

    const start = (usersState.currentPage - 1) * usersState.pageSize;
    const end = start + usersState.pageSize;
    const pageUsers = usersState.filteredUsers.slice(start, end);

    if (pageUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 60px 20px; color: var(--text-tertiary);">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                    暂无用户数据
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = pageUsers
        .map(
            user => `
        <tr>
            <td>${user.id}</td>
            <td>
                <div class="user-avatar">
                    ${
    user.avatar
        ? `<img src="${user.avatar}" alt="${user.nickname}" />`
        : user.nickname.charAt(0).toUpperCase()
}
                </div>
            </td>
            <td>${user.username}</td>
            <td>${user.nickname}</td>
            <td>${user.gender}</td>
            <td>${user.phone}</td>
            <td>${user.email}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <span class="status-badge ${user.status}">
                    ${user.status === 'active' ? '正常' : '已禁用'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action view" onclick="viewUser('${user.id}')" title="查看详情">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action edit" onclick="editUser('${user.id}')" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action toggle" onclick="toggleUserStatus('${user.id}')" title="${user.status === 'active' ? '禁用' : '启用'}">
                        <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                    </button>
                    <button class="btn-action delete" onclick="deleteUser('${user.id}')" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `,
        )
        .join('');
}

// 渲染分页
function renderPagination() {
    const container = document.getElementById('users-pagination');
    if (!container) {
        return;
    }

    const totalPages = Math.ceil(usersState.filteredUsers.length / usersState.pageSize);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // 上一页
    paginationHTML += `
        <button class="pagination-btn" ${usersState.currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${usersState.currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // 页码
    const maxVisiblePages = 5;
    let startPage = Math.max(1, usersState.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        paginationHTML += '<button class="pagination-btn" onclick="goToPage(1)">1</button>';
        if (startPage > 2) {
            paginationHTML += '<span style="padding: 0 8px;">...</span>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === usersState.currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<span style="padding: 0 8px;">...</span>';
        }
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    // 下一页
    paginationHTML += `
        <button class="pagination-btn" ${usersState.currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${usersState.currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    container.innerHTML = paginationHTML;
}

// 跳转到指定页
function goToPage(page) {
    const totalPages = Math.ceil(usersState.filteredUsers.length / usersState.pageSize);
    if (page < 1 || page > totalPages) {
        return;
    }

    usersState.currentPage = page;
    renderUsersTable();
    renderPagination();
}

// 防抖搜索
let searchDebounceTimer = null;
function debounceSearchUsers() {
    const input = document.getElementById('user-search-input');
    if (!input) {
        return;
    }

    usersState.searchKeyword = input.value;

    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }

    searchDebounceTimer = setTimeout(() => {
        filterUsers();
        renderUsersTable();
        renderPagination();
    }, 300);
}

// 打开新增用户模态框
function openAddUserModal() {
    usersState.editingUserId = null;

    const modalContent = `
        <form id="user-form" onsubmit="saveUser(event)">
            <div class="user-form-grid">
                <div class="user-form-field">
                    <label class="user-form-label">用户名 <span style="color: var(--danger-color);">*</span></label>
                    <input type="text" id="form-username" class="user-form-input" placeholder="请输入用户名" required />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">昵称 <span style="color: var(--danger-color);">*</span></label>
                    <input type="text" id="form-nickname" class="user-form-input" placeholder="请输入昵称" required />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">密码 <span style="color: var(--danger-color);">*</span></label>
                    <input type="password" id="form-password" class="user-form-input" placeholder="请输入密码" required />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">确认密码 <span style="color: var(--danger-color);">*</span></label>
                    <input type="password" id="form-confirm-password" class="user-form-input" placeholder="请再次输入密码" required />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">性别</label>
                    <select id="form-gender" class="user-form-input">
                        <option value="男">男</option>
                        <option value="女">女</option>
                    </select>
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">手机号</label>
                    <input type="tel" id="form-phone" class="user-form-input" placeholder="请输入手机号" />
                </div>
                <div class="user-form-field full-width">
                    <label class="user-form-label">邮箱</label>
                    <input type="email" id="form-email" class="user-form-input" placeholder="请输入邮箱" />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">省份</label>
                    <input type="text" id="form-province" class="user-form-input" placeholder="请输入省份" />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">城市</label>
                    <input type="text" id="form-city" class="user-form-input" placeholder="请输入城市" />
                </div>
                <div class="user-form-field full-width">
                    <label class="user-form-label">详细地址</label>
                    <input type="text" id="form-address" class="user-form-input" placeholder="请输入详细地址" />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">出生日期</label>
                    <input type="date" id="form-birthdate" class="user-form-input" />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">状态</label>
                    <select id="form-status" class="user-form-input">
                        <option value="active">正常</option>
                        <option value="disabled">已禁用</option>
                    </select>
                </div>
            </div>
            <div class="user-form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `;

    showModal('新增用户', modalContent);
}

// 编辑用户
function editUser(userId) {
    const user = usersState.users.find(u => u.id === userId);
    if (!user) {
        showErrorToast('用户不存在');
        return;
    }

    usersState.editingUserId = userId;

    const modalContent = `
        <form id="user-form" onsubmit="saveUser(event)">
            <div class="user-form-grid">
                <div class="user-form-field">
                    <label class="user-form-label">用户名 <span style="color: var(--danger-color);">*</span></label>
                    <input type="text" id="form-username" class="user-form-input" placeholder="请输入用户名" value="${user.username}" required />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">昵称 <span style="color: var(--danger-color);">*</span></label>
                    <input type="text" id="form-nickname" class="user-form-input" placeholder="请输入昵称" value="${user.nickname}" required />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">新密码（留空则不修改）</label>
                    <input type="password" id="form-password" class="user-form-input" placeholder="请输入新密码" />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">确认新密码</label>
                    <input type="password" id="form-confirm-password" class="user-form-input" placeholder="请再次输入新密码" />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">性别</label>
                    <select id="form-gender" class="user-form-input">
                        <option value="男" ${user.gender === '男' ? 'selected' : ''}>男</option>
                        <option value="女" ${user.gender === '女' ? 'selected' : ''}>女</option>
                    </select>
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">手机号</label>
                    <input type="tel" id="form-phone" class="user-form-input" placeholder="请输入手机号" value="${user.phone || ''}" />
                </div>
                <div class="user-form-field full-width">
                    <label class="user-form-label">邮箱</label>
                    <input type="email" id="form-email" class="user-form-input" placeholder="请输入邮箱" value="${user.email || ''}" />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">省份</label>
                    <input type="text" id="form-province" class="user-form-input" placeholder="请输入省份" value="${user.province || ''}" />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">城市</label>
                    <input type="text" id="form-city" class="user-form-input" placeholder="请输入城市" value="${user.city || ''}" />
                </div>
                <div class="user-form-field full-width">
                    <label class="user-form-label">详细地址</label>
                    <input type="text" id="form-address" class="user-form-input" placeholder="请输入详细地址" value="${user.address || ''}" />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">出生日期</label>
                    <input type="date" id="form-birthdate" class="user-form-input" value="${user.birthDate || ''}" />
                </div>
                <div class="user-form-field">
                    <label class="user-form-label">状态</label>
                    <select id="form-status" class="user-form-input">
                        <option value="active" ${user.status === 'active' ? 'selected' : ''}>正常</option>
                        <option value="disabled" ${user.status === 'disabled' ? 'selected' : ''}>已禁用</option>
                    </select>
                </div>
            </div>
            <div class="user-form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `;

    showModal('编辑用户', modalContent);
}

// 保存用户
function saveUser(event) {
    event.preventDefault();

    const username = document.getElementById('form-username').value.trim();
    const nickname = document.getElementById('form-nickname').value.trim();
    const password = document.getElementById('form-password').value;
    const confirmPassword = document.getElementById('form-confirm-password').value;
    const gender = document.getElementById('form-gender').value;
    const phone = document.getElementById('form-phone').value.trim();
    const email = document.getElementById('form-email').value.trim();
    const province = document.getElementById('form-province').value.trim();
    const city = document.getElementById('form-city').value.trim();
    const address = document.getElementById('form-address').value.trim();
    const birthDate = document.getElementById('form-birthdate').value;
    const status = document.getElementById('form-status').value;

    // 表单验证
    if (!username || !nickname) {
        showErrorToast('用户名和昵称不能为空');
        return;
    }

    // 密码验证（仅新增时或修改密码时）
    if (!usersState.editingUserId || password) {
        if (!password) {
            showErrorToast('密码不能为空');
            return;
        }
        if (password !== confirmPassword) {
            showErrorToast('两次输入的密码不一致');
            return;
        }
        if (password.length < 6) {
            showErrorToast('密码长度不能少于6位');
            return;
        }
    }

    // 检查用户名是否重复
    const existingUser = usersState.users.find(
        u => u.username === username && u.id !== usersState.editingUserId,
    );
    if (existingUser) {
        showErrorToast('用户名已存在');
        return;
    }

    if (usersState.editingUserId) {
        // 编辑用户
        const userIndex = usersState.users.findIndex(u => u.id === usersState.editingUserId);
        if (userIndex !== -1) {
            usersState.users[userIndex] = {
                ...usersState.users[userIndex],
                username,
                nickname,
                gender,
                phone,
                email,
                province,
                city,
                address,
                birthDate,
                status,
                updatedAt: new Date().toISOString(),
            };
            if (password) {
                usersState.users[userIndex].password = password;
            }
        }
        showSuccessToast('用户更新成功');
    } else {
        // 新增用户
        const newUser = {
            id: `user_${Date.now()}`,
            username,
            nickname,
            password,
            gender,
            phone,
            email,
            province,
            city,
            address,
            birthDate,
            status,
            avatar: '',
            createdAt: new Date().toISOString(),
            lastLoginAt: null,
        };
        usersState.users.unshift(newUser);
        showSuccessToast('用户创建成功');
    }

    // 保存到localStorage
    localStorage.setItem('adminUsers', JSON.stringify(usersState.users));

    closeModal();
    filterUsers();
    updateUsersStats();
    renderUsersTable();
    renderPagination();
}

// 查看用户详情
function viewUser(userId) {
    const user = usersState.users.find(u => u.id === userId);
    if (!user) {
        showErrorToast('用户不存在');
        return;
    }

    const modalContent = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
            <div>
                <p><strong>用户ID:</strong> ${user.id}</p>
                <p><strong>用户名:</strong> ${user.username}</p>
                <p><strong>昵称:</strong> ${user.nickname}</p>
                <p><strong>性别:</strong> ${user.gender}</p>
                <p><strong>手机号:</strong> ${user.phone || '-'}</p>
            </div>
            <div>
                <p><strong>邮箱:</strong> ${user.email || '-'}</p>
                <p><strong>省份:</strong> ${user.province || '-'}</p>
                <p><strong>城市:</strong> ${user.city || '-'}</p>
                <p><strong>地址:</strong> ${user.address || '-'}</p>
                <p><strong>出生日期:</strong> ${user.birthDate || '-'}</p>
            </div>
            <div style="grid-column: 1 / -1;">
                <p><strong>状态:</strong> <span class="status-badge ${user.status}">${user.status === 'active' ? '正常' : '已禁用'}</span></p>
                <p><strong>注册时间:</strong> ${formatDate(user.createdAt)}</p>
                <p><strong>最后登录:</strong> ${user.lastLoginAt ? formatDate(user.lastLoginAt) : '-'}</p>
            </div>
        </div>
        <div style="margin-top: 20px; text-align: right;">
            <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
            <button class="btn btn-primary" onclick="editUser('${user.id}')">编辑</button>
        </div>
    `;

    showModal('用户详情', modalContent);
}

// 切换用户状态
function toggleUserStatus(userId) {
    const user = usersState.users.find(u => u.id === userId);
    if (!user) {
        showErrorToast('用户不存在');
        return;
    }

    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    const confirmMsg = newStatus === 'active' ? '确定要启用该用户吗？' : '确定要禁用该用户吗？';

    if (!confirm(confirmMsg)) {
        return;
    }

    user.status = newStatus;
    localStorage.setItem('adminUsers', JSON.stringify(usersState.users));

    filterUsers();
    updateUsersStats();
    renderUsersTable();

    showSuccessToast(`用户已${newStatus === 'active' ? '启用' : '禁用'}`);
}

// 删除用户
function deleteUser(userId) {
    const userIndex = usersState.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        showErrorToast('用户不存在');
        return;
    }

    if (!confirm('确定要删除该用户吗？此操作不可恢复！')) {
        return;
    }

    usersState.users.splice(userIndex, 1);
    localStorage.setItem('adminUsers', JSON.stringify(usersState.users));

    filterUsers();
    updateUsersStats();
    renderUsersTable();
    renderPagination();

    showSuccessToast('用户已删除');
}

// 导出用户数据
function exportUsers() {
    const data = usersState.users.map(user => ({
        用户ID: user.id,
        用户名: user.username,
        昵称: user.nickname,
        性别: user.gender,
        手机号: user.phone || '',
        邮箱: user.email || '',
        省份: user.province || '',
        城市: user.city || '',
        地址: user.address || '',
        出生日期: user.birthDate || '',
        状态: user.status === 'active' ? '正常' : '已禁用',
        注册时间: formatDate(user.createdAt),
        最后登录: user.lastLoginAt ? formatDate(user.lastLoginAt) : '',
    }));

    // 转换为CSV
    const headers = Object.keys(data[0] || {});
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(',')),
    ].join('\n');

    // 下载
    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `用户数据_${formatDateForFileName(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccessToast('用户数据导出成功');
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) {
        return '-';
    }
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// 格式化文件名日期
function formatDateForFileName(date) {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
}

// 加载用户管理页面
function loadUsersPage() {
    // 更新页面标题
    const pageTitle = document.getElementById('page-title');
    const pageDesc = document.getElementById('page-description');
    if (pageTitle) {
        pageTitle.textContent = '用户管理';
    }
    if (pageDesc) {
        pageDesc.textContent = '管理系统注册用户，查看用户信息和健康数据';
    }

    // 加载用户数据
    loadUsers();

    // 绑定筛选事件
    const statusFilter = document.getElementById('user-status-filter');
    const genderFilter = document.getElementById('user-gender-filter');

    if (statusFilter) {
        statusFilter.addEventListener('change', function () {
            usersState.statusFilter = this.value;
            filterUsers();
            renderUsersTable();
            renderPagination();
        });
    }

    if (genderFilter) {
        genderFilter.addEventListener('change', function () {
            usersState.genderFilter = this.value;
            filterUsers();
            renderUsersTable();
            renderPagination();
        });
    }
}

// 更新菜单权限设置 - 让主管理员和副管理员都能访问用户管理
function updateUsersMenuVisibility() {
    const adminInfo = getCurrentAdminInfo();
    const usersMenu = document.getElementById('menu-users');

    if (usersMenu) {
        // 所有管理员都可以访问用户管理
        usersMenu.style.display = '';
    }
}

// 确保关键函数在全局作用域可用（页面加载时立即执行）
(function () {
    'use strict';
    // 确保 saveAISettings 在全局作用域
    if (typeof saveAISettings === 'function' && typeof window !== 'undefined') {
        window.saveAISettings = saveAISettings;
    }
    // 确保 testAIAPI 在全局作用域
    if (typeof testAIAPI === 'function' && typeof window !== 'undefined') {
        window.testAIAPI = testAIAPI;
    }
    // 确保功能配置相关函数在全局作用域
    window.loadFeatures = loadFeatures;
    window.toggleFeature = toggleFeature;

    // 用户管理相关函数
    window.loadUsersPage = loadUsersPage;
    window.openAddUserModal = openAddUserModal;
    window.editUser = editUser;
    window.saveUser = saveUser;
    window.viewUser = viewUser;
    window.toggleUserStatus = toggleUserStatus;
    window.deleteUser = deleteUser;
    window.exportUsers = exportUsers;
    window.goToPage = goToPage;
    window.debounceSearchUsers = debounceSearchUsers;

    // 智能设备相关函数
    window.loadSmartDevicesPage = loadSmartDevicesPage;
    window.saveSmartDevicesSettings = saveSmartDevicesSettings;
    window.testSmartDeviceAPI = testSmartDeviceAPI;
    window.toggleSmartDeviceEnabled = toggleSmartDeviceEnabled;

    // 地理位置API相关函数
    window.loadLocationAPIPage = loadLocationAPIPage;
    window.saveLocationAPISettings = saveLocationAPISettings;
    window.testLocationAPI = testLocationAPI;
    window.testLocationAPIConnection = testLocationAPIConnection;
    window.toggleLocationEnabled = toggleLocationEnabled;

    // AI相关函数
    window.toggleAIEnabled = toggleAIEnabled;

    // 账号管理相关函数
    window.loadAccountPage = loadAccountPage;
    window.saveAdminAccountInfo = saveAdminAccountInfo;
    window.changeAdminPassword = changeAdminPassword;
    window.resetAdminAccountForm = resetAdminAccountForm;
    window.deactivateAdminAccount = deactivateAdminAccount;
    window.handleAdminAvatarUpload = handleAdminAvatarUpload;

    // 副管理员管理相关函数
    window.loadSubAdminsPage = loadSubAdminsPage;
    window.showCreateSubAdminModal = showCreateSubAdminModal;
    window.createSubAdmin = createSubAdmin;
    window.editSubAdmin = editSubAdmin;
    window.saveSubAdmin = saveSubAdmin;
    window.deleteSubAdmin = deleteSubAdmin;

    // 刷新API状态相关函数
    window.refreshAIAPIStatus = refreshAIAPIStatus;
    window.refreshSmartDeviceAPIStatus = refreshSmartDeviceAPIStatus;
    window.refreshLocationAPIStatus = refreshLocationAPIStatus;

    // 其他通用函数
    window.logout = logout;
    window.closeModal = closeModal;

    // 调试信息
    console.log('函数暴露检查:', {
        saveAISettings: typeof window.saveAISettings,
        testAIAPI: typeof window.testAIAPI,
        loadFeatures: typeof window.loadFeatures,
        toggleFeature: typeof window.toggleFeature,
        loadUsersPage: typeof window.loadUsersPage,
        loadSmartDevicesPage: typeof window.loadSmartDevicesPage,
        saveSmartDevicesSettings: typeof window.saveSmartDevicesSettings,
        testSmartDeviceAPI: typeof window.testSmartDeviceAPI,
        loadLocationAPIPage: typeof window.loadLocationAPIPage,
        saveLocationAPISettings: typeof window.saveLocationAPISettings,
        testLocationAPI: typeof window.testLocationAPI,
        testLocationAPIConnection: typeof window.testLocationAPIConnection,
        loadAccountPage: typeof window.loadAccountPage,
        saveAdminAccountInfo: typeof window.saveAdminAccountInfo,
        changeAdminPassword: typeof window.changeAdminPassword,
        resetAdminAccountForm: typeof window.resetAdminAccountForm,
        deactivateAdminAccount: typeof window.deactivateAdminAccount,
        handleAdminAvatarUpload: typeof window.handleAdminAvatarUpload,
        loadSubAdminsPage: typeof window.loadSubAdminsPage,
        showCreateSubAdminModal: typeof window.showCreateSubAdminModal,
        createSubAdmin: typeof window.createSubAdmin,
        editSubAdmin: typeof window.editSubAdmin,
        saveSubAdmin: typeof window.saveSubAdmin,
        deleteSubAdmin: typeof window.deleteSubAdmin,
        refreshAIAPIStatus: typeof window.refreshAIAPIStatus,
        refreshSmartDeviceAPIStatus: typeof window.refreshSmartDeviceAPIStatus,
        refreshLocationAPIStatus: typeof window.refreshLocationAPIStatus,
        logout: typeof window.logout,
        closeModal: typeof window.closeModal,
    });
})();
