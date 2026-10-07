// 副管理员后台核心脚本

// 检查当前管理员角色和权限
function getCurrentAdminInfo() {
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');

        // 优先使用登录信息中的用户数据（从数据库返回的数据）
        const userInfo = loginInfo.user || {};
        const username = userInfo.username || loginInfo.username || 'admin';

        // 从localStorage获取账号数据（兼容性，用于权限等额外信息）
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        const adminAccount = accounts.admin?.find(acc => acc.username === username);

        // 优先使用登录信息中的省份和角色，如果没有则使用localStorage中的
        const province = userInfo.province || adminAccount?.province || null;
        const role = userInfo.role || adminAccount?.role || 'sub';
        const permissions = adminAccount?.permissions || [];

        return {
            username,
            role,
            permissions,
            province,
        };
    } catch (error) {
        console.error('获取管理员信息失败:', error);
        return { username: 'admin', role: 'sub', permissions: [], province: null };
    }
}

// 授权码管理
let authCodes = [];
let hospitalListCache = [];

function getLocalAuthCodes() {
    try {
        return JSON.parse(localStorage.getItem('authCodes') || '[]');
    } catch (error) {
        console.warn('读取本地授权码失败:', error);
        return [];
    }
}

function getUnsyncedLocalAuthCodes() {
    const localList = getLocalAuthCodes();
    if (!Array.isArray(localList) || localList.length === 0) {
        return [];
    }
    const remoteSet = new Set((authCodes || []).map(code => code.code));
    return localList.filter(item => item && item.code && !remoteSet.has(item.code) && !item.used);
}

// 初始化授权码
function initAuthCodes() {
    const savedAuthCodes = localStorage.getItem('authCodes');
    if (savedAuthCodes) {
        authCodes = JSON.parse(savedAuthCodes);
        mergeSeedAuthCodes();
        saveAuthCodes();
    } else {
        authCodes = [
            { code: 'HOSPITAL2024-001', used: false, createdAt: new Date().toISOString() },
            { code: 'HOSPITAL2024-002', used: false, createdAt: new Date().toISOString() },
            {
                code: 'HOSPITAL2024-003',
                used: true,
                createdAt: new Date().toISOString(),
                usedBy: '医院A',
                usedTime: new Date().toISOString(),
            },
        ];
        mergeSeedAuthCodes();
        saveAuthCodes();
    }
}

// 合并预置医院授权码
function mergeSeedAuthCodes() {
    const now = new Date().toISOString();
    const seed = [
        { code: 'HOSPITAL2024-XIEHE', used: true, usedBy: '北京协和医院', province: '北京市' },
        { code: 'HOSPITAL2024-RUIJIN', used: true, usedBy: '上海瑞金医院', province: '上海市' },
        { code: 'HOSPITAL2024-HUAXI', used: true, usedBy: '华西医院', province: '四川省' },
        { code: 'HOSPITAL2024-TONGJI', used: true, usedBy: '武汉同济医院', province: '湖北省' },
        { code: 'HOSPITAL2024-XINHUA', used: true, usedBy: '上海新华医院', province: '上海市' },
    ];
    const existingSet = new Set(authCodes.map(c => c.code));
    seed.forEach(s => {
        if (!existingSet.has(s.code)) {
            authCodes.push({
                code: s.code,
                used: true,
                createdAt: now,
                usedBy: s.usedBy,
                usedTime: now,
                province: s.province,
            });
        } else {
            const idx = authCodes.findIndex(c => c.code === s.code);
            if (idx !== -1) {
                authCodes[idx].used = true;
                authCodes[idx].usedBy = s.usedBy;
                authCodes[idx].usedTime = authCodes[idx].usedTime || now;
                if (!authCodes[idx].province && s.province) {
                    authCodes[idx].province = s.province;
                }
            }
        }
    });
}

function saveAuthCodes() {
    localStorage.setItem('authCodes', JSON.stringify(authCodes));
}

function generateAuthCode() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `HOSPITAL-${timestamp}-${random}`;
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('副管理员后台初始化...');
    initAdminAvatarSync();

    // 检查登录状态
    const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
    const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
    const adminAccount = accounts.admin?.find(acc => acc.username === loginInfo.username);

    // 如果不是副管理员，跳转到主管理员界面
    if (adminAccount && adminAccount.role === 'main') {
        const baseConfig = window.BASE_CONFIG || { basePath: '' };
        window.location.href = `${baseConfig.basePath}/admin/admin.html`;
        return;
    }

    // 初始化授权码
    initAuthCodes();

    // 初始化UI
    initializeUI();

    // 设置事件监听器
    setupEventListeners();

    // 获取管理员信息
    const adminInfo = getCurrentAdminInfo();

    // 恢复保存的页面状态
    let savedPage = null;
    try {
        savedPage = sessionStorage.getItem('subAdminCurrentPage');
    } catch (e) {
        console.warn('恢复页面状态失败:', e);
    }

    // 确定应该显示的页面
    const hash = window.location.hash.substring(1);
    const expectedPage = hash || savedPage || 'users';

    // 验证页面是否允许访问
    const allowedPages = ['users', 'auth-codes', 'hospitals', 'account'];
    const targetPage = allowedPages.includes(expectedPage) ? expectedPage : 'users';

    // 检查头部脚本是否已经设置了页面
    const currentActivePage = document.querySelector('.page-content.active');
    const pageRestoredFlag = sessionStorage.getItem('_pageRestoredByHeadScript');
    const actualRestoredPage = sessionStorage.getItem('_pageRestoredByHeadScript_pageId');

    let pageAlreadySet = false;

    if (pageRestoredFlag === 'true' && currentActivePage) {
        if (actualRestoredPage === targetPage) {
            pageAlreadySet = true;
        }
    }

    // 如果页面没有被正确设置，需要切换页面
    if (!pageAlreadySet) {
        switchPage(targetPage);
    } else {
        loadPageContent(targetPage);
        updatePageTitle(targetPage);
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === targetPage) {
                item.classList.add('active');
            }
        });
    }

    // 更新用户信息显示
    updateUserInfo();

    // 延迟清除标志
    setTimeout(() => {
        sessionStorage.removeItem('_pageRestoredByHeadScript');
    }, 100);

    console.log('副管理员后台初始化完成');
});

// 更新用户信息显示
function updateUserInfo() {
    const adminInfo = getCurrentAdminInfo();
    const userInfoEl = document.querySelector('.user-info span');
    if (userInfoEl) {
        const provinceText = adminInfo.province ? ` (${adminInfo.province})` : '';
        userInfoEl.textContent = `${adminInfo.username} - 副管理员${provinceText}`;
    }
}

// 初始化UI
function initializeUI() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    initializeMenu();
}

// 设置事件监听器
function setupEventListeners() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.dataset.page;
            switchPage(page);
        });
    });

    // 模态框关闭
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);

    // 点击模态框外部关闭
    document.getElementById('modal')?.addEventListener('click', function (e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

// 切换页面
function switchPage(pageId) {
    console.log('切换到页面:', pageId);

    const allowedPages = ['users', 'auth-codes', 'hospitals', 'account'];
    if (!allowedPages.includes(pageId)) {
        console.warn('无权访问此页面:', pageId);
        pageId = 'users';
    }

    // 保存当前页面状态
    try {
        sessionStorage.setItem('subAdminCurrentPage', pageId);
    } catch (e) {
        console.warn('保存页面状态失败:', e);
    }

    // 更新活动菜单项
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });

    // 隐藏所有页面
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });

    // 显示目标页面
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        loadPageContent(pageId);
    }

    // 更新页面标题
    updatePageTitle(pageId);
}

// 更新页面标题
function updatePageTitle(pageId) {
    const titles = {
        users: { title: '用户管理', desc: '管理系统用户' },
        'auth-codes': { title: '授权码管理', desc: '管理医院注册授权码' },
        hospitals: { title: '医院管理', desc: '查看并管理本省医院' },
        account: { title: '账号管理', desc: '管理管理员账号信息' },
    };

    const pageInfo = titles[pageId] || { title: '副管理员后台', desc: '' };
    const adminInfo = getCurrentAdminInfo();
    if (pageId === 'users' && adminInfo.province) {
        pageInfo.title = `用户管理 (${adminInfo.province})`;
    }
    if (pageId === 'auth-codes' && adminInfo.province) {
        pageInfo.title = `授权码管理 (${adminInfo.province})`;
    }
    if (pageId === 'hospitals' && adminInfo.province) {
        pageInfo.title = `医院管理 (${adminInfo.province})`;
    }

    document.getElementById('page-title').textContent = pageInfo.title;
    document.getElementById('page-description').textContent = pageInfo.desc;
}

// 加载页面内容
function loadPageContent(pageId) {
    const allowedPages = ['users', 'auth-codes', 'hospitals', 'account'];
    if (!allowedPages.includes(pageId)) {
        showModal('权限不足', '您没有访问此页面的权限');
        switchPage('users');
        return;
    }

    switch (pageId) {
        case 'users':
            loadUsersPage().catch(error => console.error('加载用户页面失败:', error));
            break;
        case 'auth-codes':
            loadAuthCodesPage();
            break;
        case 'hospitals':
            loadHospitalsPage();
            break;
        case 'account':
            loadAccountPage();
            break;
    }
}

// 加载用户管理页面
async function loadUsersPage() {
    const adminInfo = getCurrentAdminInfo();
    let users = [];

    if (window.apiService && window.apiService.getUsers) {
        try {
            const result = await window.apiService.getUsers({
                province: adminInfo.province || undefined,
                page: 1,
                pageSize: 200,
            });

            if (result && Array.isArray(result.list)) {
                users = result.list;
            } else if (result && result.data && Array.isArray(result.data.list)) {
                users = result.data.list;
            } else if (Array.isArray(result?.data)) {
                users = result.data;
            } else if (Array.isArray(result)) {
                users = result;
            }
        } catch (error) {
            console.warn('从后端获取用户列表失败，使用本地数据:', error);
        }
    }

    if (!Array.isArray(users) || users.length === 0) {
        users = JSON.parse(localStorage.getItem('users') || '[]');
    }

    let filteredUsers = users;
    if (adminInfo.province) {
        filteredUsers = users.filter(user => {
            const userProvince = user.province || extractProvinceFromAddress(user.address || '');
            return userProvince === adminInfo.province;
        });
    }

    const container = document.getElementById('users-page');
    if (!container) {
        return;
    }

    let usersHTML = '';
    if (filteredUsers.length === 0) {
        usersHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <p>暂无用户数据</p>
                <p style="font-size: 0.9rem;">${adminInfo.province ? `当前管理省份：${adminInfo.province}` : '未设置管理省份'}</p>
            </div>
        `;
    } else {
        usersHTML = `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 1080px;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="width: 140px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">用户名</th>
                            <th style="width: 88px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">性别</th>
                            <th style="width: 88px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">年龄</th>
                            <th style="width: 110px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">身高(cm)</th>
                            <th style="width: 110px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">体重(kg)</th>
                            <th style="width: 280px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">地址</th>
                            <th style="width: 120px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">省份</th>
                            <th style="width: 180px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">注册时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredUsers
        .map(user => {
            const userProvince
                                    = user.province
                                    || extractProvinceFromAddress(user.address || '')
                                    || '未识别';
            return `
                                <tr style="border-bottom: 1px solid #eee; vertical-align: top;">
                                    <td style="padding: 12px; white-space: nowrap; overflow-wrap: anywhere;">${user.username || '-'}</td>
                                    <td style="padding: 12px; white-space: nowrap;">${user.gender || '保密'}</td>
                                    <td style="padding: 12px; white-space: nowrap;">${user.age ?? '-'}</td>
                                    <td style="padding: 12px; white-space: nowrap;">${user.height ?? '-'}</td>
                                    <td style="padding: 12px; white-space: nowrap;">${user.weight ?? '-'}</td>
                                    <td style="padding: 12px; line-height: 1.6; white-space: normal; word-break: break-word; overflow-wrap: anywhere;">${user.address || '-'}</td>
                                    <td style="padding: 12px; white-space: nowrap;">
                                        <span style="display: inline-flex; align-items: center; max-width: 100%; background: #fff3e0; color: #f57c00; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; white-space: nowrap;">${userProvince}</span>
                                    </td>
                                    <td style="padding: 12px; color: #666; font-size: 0.9em; white-space: nowrap;">${user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : '-'}</td>
                                </tr>
                            `;
        })
        .join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="content-card">
            <div class="card-header">
                <h3><i class="fas fa-users"></i> 用户管理${adminInfo.province ? ` (${adminInfo.province})` : ''}</h3>
            </div>
            <div class="card-body">
                <div class="search-bar" style="margin-bottom: 20px;">
                    <input type="text" class="form-input" placeholder="搜索用户..." style="width: 300px;" id="user-search-input" data-enter-action="searchUsers">
                    <button class="btn btn-primary" style="margin-left: 10px;" onclick="searchUsers()">搜索</button>
                </div>
                
                <div id="users-list">
                    ${usersHTML}
                </div>
            </div>
        </div>
    `;
}

// 搜索用户
function searchUsers() {
    const searchTerm = document.getElementById('user-search-input')?.value.toLowerCase() || '';
    const adminInfo = getCurrentAdminInfo();

    // 使用新的数据结构
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    let filteredUsers = users;

    // 先过滤省份（优先用户省份字段，缺失时解析地址）
    if (adminInfo.province) {
        filteredUsers = filteredUsers.filter(user => {
            const userProvince = user.province || extractProvinceFromAddress(user.address || '');
            return userProvince === adminInfo.province;
        });
    }

    // 搜索过滤
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => {
            const provinceText = (
                user.province
                || extractProvinceFromAddress(user.address || '')
                || ''
            ).toLowerCase();
            return (
                (user.username || '').toLowerCase().includes(searchTerm)
                || (user.address || '').toLowerCase().includes(searchTerm)
                || provinceText.includes(searchTerm)
            );
        });
    }

    const usersHTML
        = filteredUsers.length === 0
            ? `
        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
            <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 20px;"></i>
            <p>未找到匹配的用户</p>
        </div>
    `
            : `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 1080px;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="width: 140px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">用户名</th>
                        <th style="width: 88px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">性别</th>
                        <th style="width: 88px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">年龄</th>
                        <th style="width: 110px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">身高(cm)</th>
                        <th style="width: 110px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">体重(kg)</th>
                        <th style="width: 280px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">地址</th>
                        <th style="width: 120px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">省份</th>
                        <th style="width: 180px; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; white-space: nowrap;">注册时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredUsers
        .map(user => {
            const userProvince
                                = user.province
                                || extractProvinceFromAddress(user.address || '')
                                || '未识别';
            return `
                            <tr style="border-bottom: 1px solid #eee; vertical-align: top;">
                                <td style="padding: 12px; white-space: nowrap; overflow-wrap: anywhere;">${user.username || '-'}</td>
                                <td style="padding: 12px; white-space: nowrap;">${user.gender || '保密'}</td>
                                <td style="padding: 12px; white-space: nowrap;">${user.age ?? '-'}</td>
                                <td style="padding: 12px; white-space: nowrap;">${user.height ?? '-'}</td>
                                <td style="padding: 12px; white-space: nowrap;">${user.weight ?? '-'}</td>
                                <td style="padding: 12px; line-height: 1.6; white-space: normal; word-break: break-word; overflow-wrap: anywhere;">${user.address || '-'}</td>
                                <td style="padding: 12px; white-space: nowrap;">
                                    <span style="display: inline-flex; align-items: center; max-width: 100%; background: #fff3e0; color: #f57c00; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; white-space: nowrap;">${userProvince}</span>
                                </td>
                                <td style="padding: 12px; color: #666; font-size: 0.9em; white-space: nowrap;">${user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : '-'}</td>
                            </tr>
                        `;
        })
        .join('')}
                </tbody>
            </table>
        </div>
    `;

    const usersListEl = document.getElementById('users-list');
    if (usersListEl) {
        usersListEl.innerHTML = usersHTML;
    }
}

// 加载医院管理页面
async function loadHospitalsPage() {
    const container = document.getElementById('hospitals-page');
    if (!container) {
        return;
    }

    const adminInfo = getCurrentAdminInfo();
    if (!adminInfo.province) {
        container.innerHTML = `
            <div class="content-card">
                <div class="card-body" style="padding: 40px; text-align: center; color: #7f8c8d;">
                    <i class="fas fa-hospital" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <p>请先联系主管理员为您设置管理省份，才能查看医院信息。</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="content-card">
            <div class="card-body" style="padding: 40px; text-align: center; color: #7f8c8d;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
                <p style="margin-top: 15px;">正在加载 ${adminInfo.province} 的医院数据...</p>
            </div>
        </div>
    `;

    try {
        const hospitals = await fetchHospitalsForProvince(adminInfo.province);
        hospitalListCache = hospitals;

        container.innerHTML = `
            <div class="content-card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <h3><i class="fas fa-hospital"></i> 医院管理 (${adminInfo.province})</h3>
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                        <span style="color: #666;">医院数量：<strong id="hospital-count">${hospitals.length}</strong> 家</span>
                        <button class="btn btn-secondary" onclick="reloadHospitalsList()" style="padding: 8px 16px;">
                            <i class="fas fa-rotate"></i> 刷新
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="search-bar" style="margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 10px;">
                        <input type="text" class="form-input" placeholder="搜索医院名称 / 城市 / 地址 / 联系方式" style="flex: 1; min-width: 240px;" id="hospital-search-input" oninput="searchHospitals()" data-enter-action="searchHospitals">
                    </div>
                    <div id="hospital-list">
                        ${renderHospitalListMarkup(hospitals)}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('加载医院列表失败:', error);
        container.innerHTML = `
            <div class="content-card">
                <div class="card-body" style="padding: 40px; text-align: center; color: #c0392b;">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                    <p>加载医院列表失败：${error.message || '未知错误'}</p>
                    <button class="btn btn-secondary" style="margin-top: 15px;" onclick="loadHospitalsPage()">
                        <i class="fas fa-redo"></i> 重试
                    </button>
                </div>
            </div>
        `;
    }
}

// 重新加载医院列表
async function reloadHospitalsList() {
    try {
        await loadHospitalsPage();
        showNotification('医院列表已刷新', 'success');
    } catch (error) {
        console.error('刷新医院列表失败:', error);
        showNotification(`刷新医院列表失败：${error.message || '未知错误'}`, 'error');
    }
}

// 搜索医院
function searchHospitals() {
    const searchInput = document.getElementById('hospital-search-input');
    if (!searchInput) {
        return;
    }

    const searchTerm = searchInput.value.trim().toLowerCase();
    const listEl = document.getElementById('hospital-list');
    const countEl = document.getElementById('hospital-count');

    if (!listEl) {
        return;
    }

    const filtered = !searchTerm
        ? hospitalListCache
        : hospitalListCache.filter(hospital => {
            const fields = [
                hospital.name,
                hospital.city,
                hospital.address,
                hospital.phone,
                hospital.email,
                hospital.authCode,
                hospital.username,
            ];
            return fields.some(field => (field || '').toLowerCase().includes(searchTerm));
        });

    listEl.innerHTML = renderHospitalListMarkup(filtered);
    if (countEl) {
        countEl.textContent = searchTerm
            ? `${filtered.length}/${hospitalListCache.length}`
            : `${hospitalListCache.length}`;
    }
}

// 渲染医院列表
function renderHospitalListMarkup(hospitals) {
    if (!hospitals || hospitals.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <i class="fas fa-hospital" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <p>暂无医院数据</p>
                <p style="font-size: 0.9rem;">请与主管理员确认该省份是否已有医院注册</p>
            </div>
        `;
    }

    return `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">医院名称</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">所在地区</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">详细地址</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">联系方式</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">状态</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">授权码</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">创建时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${hospitals
        .map(
            hospital => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 12px;">
                                <div style="font-weight: 600; color: #2c3e50;">${hospital.name || '未命名医院'}</div>
                                <div style="color: #7f8c8d; font-size: 0.85rem; margin-top: 4px;">账号：${hospital.username || '—'}</div>
                            </td>
                            <td style="padding: 12px;">
                                <span style="background: #e3f2fd; color: #1565c0; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; display: inline-block; margin-bottom: 4px;">
                                    ${hospital.province || '未设置'}
                                </span>
                                <div style="color: #7f8c8d; font-size: 0.85rem;">${hospital.city || '城市未知'}</div>
                            </td>
                            <td style="padding: 12px; color: #555;">${hospital.address || '—'}</td>
                            <td style="padding: 12px;">
                                <div>${hospital.phone || '—'}</div>
                                ${hospital.email ? `<div style="color: #7f8c8d; font-size: 0.85rem;">${hospital.email}</div>` : ''}
                            </td>
                            <td style="padding: 12px;">${getHospitalStatusBadge(hospital.status)}</td>
                            <td style="padding: 12px;">${hospital.authCode || '—'}</td>
                            <td style="padding: 12px; color: #666; font-size: 0.9em;">${formatDateTime(hospital.createdAt)}</td>
                        </tr>
                    `,
        )
        .join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 获取医院状态徽章
function getHospitalStatusBadge(status) {
    const normalized = typeof status === 'string' ? status.toLowerCase() : status;
    let label = '未知';
    let background = '#eceff1';
    let color = '#546e7a';

    if (
        normalized === 1
        || normalized === '1'
        || normalized === 'active'
        || normalized === 'enabled'
        || normalized === true
    ) {
        label = '正常';
        background = '#e8f5e9';
        color = '#2e7d32';
    } else if (
        normalized === 0
        || normalized === '0'
        || normalized === 'disabled'
        || normalized === 'inactive'
        || normalized === false
    ) {
        label = '停用';
        background = '#ffebee';
        color = '#c62828';
    } else if (normalized === 'pending' || normalized === 'review') {
        label = '待审核';
        background = '#fff8e1';
        color = '#f57f17';
    }

    return `<span style="background: ${background}; color: ${color}; padding: 4px 12px; border-radius: 999px; font-size: 0.85em;">${label}</span>`;
}

// 获取本地存储中的医院列表
function getLocalHospitalsByProvince(province) {
    let hospitals = [];

    try {
        const storedHospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
        if (Array.isArray(storedHospitals)) {
            hospitals = hospitals.concat(storedHospitals);
        }
    } catch (error) {
        console.warn('读取本地 hospitals 数据失败:', error);
    }

    try {
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        if (accounts && Array.isArray(accounts.hospital)) {
            hospitals = hospitals.concat(accounts.hospital);
        }
    } catch (error) {
        console.warn('读取本地 accounts.hospital 数据失败:', error);
    }

    if (!province) {
        return hospitals;
    }

    return hospitals.filter(hospital => {
        const hospitalProvince
            = hospital.province
            || hospital.provinceName
            || extractProvinceFromAddress(hospital.address || '');
        return hospitalProvince === province;
    });
}

// 归一化医院数据
function normalizeHospitalRecord(record) {
    if (!record || typeof record !== 'object') {
        return null;
    }

    const normalized = {
        id: record.id || record._id || record.hospitalId || record.uuid || record.username || null,
        name:
            record.name
            || record.hospitalName
            || record.fullName
            || record.displayName
            || record.username
            || '未命名医院',
        username: record.username || record.account || record.loginName || '',
        province:
            record.province
            || record.provinceName
            || record.regionProvince
            || extractProvinceFromAddress(record.address || record.fullAddress || ''),
        city: record.city || record.cityName || record.regionCity || '',
        address: record.address || record.fullAddress || record.location || '',
        phone: record.phone || record.contactPhone || record.tel || record.mobile || '',
        email: record.email || record.contactEmail || '',
        status:
            record.status !== undefined
                ? record.status
                : record.enabled !== undefined
                    ? record.enabled
                        ? 1
                        : 0
                    : record.active !== undefined
                        ? record.active
                        : 1,
        createdAt:
            record.createdAt
            || record.created_at
            || record.createdTime
            || record.created
            || record.registeredAt
            || record.joinedAt
            || null,
        // 授权码：优先使用直接返回的授权码，其次兼容医院表中的 auth_code_used / authCodeUsed
        authCode:
            record.authCode
            || record.auth_code
            || record.authCodeUsed
            || record.auth_code_used
            || record.code
            || (record.authCodeId
                ? `ID: ${record.authCodeId}`
                : record.auth_code_id
                    ? `ID: ${record.auth_code_id}`
                    : null)
            || null,
    };

    if (!normalized.id) {
        normalized.id = `${normalized.username || normalized.name}-${normalized.phone || Date.now()}`;
    }

    return normalized;
}

// 提取医院数组
function extractHospitalsArray(source) {
    if (!source) {
        return [];
    }
    if (Array.isArray(source)) {
        return source;
    }
    if (Array.isArray(source.list)) {
        return source.list;
    }
    if (Array.isArray(source.data)) {
        return source.data;
    }
    if (source.data && Array.isArray(source.data.list)) {
        return source.data.list;
    }
    if (Array.isArray(source.items)) {
        return source.items;
    }
    if (Array.isArray(source.records)) {
        return source.records;
    }
    return [];
}

// 根据省份获取医院数据
async function fetchHospitalsForProvince(province) {
    const normalizedHospitals = [];
    const dedupeSet = new Set();

    const pushHospital = record => {
        const hospital = normalizeHospitalRecord(record);
        if (!hospital) {
            return;
        }

        if (province) {
            if (hospital.province && hospital.province !== province) {
                return;
            }
            if (!hospital.province) {
                hospital.province = province;
            }
        }

        const uniqueKey = hospital.id || `${hospital.username}-${hospital.name}-${hospital.phone}`;
        if (dedupeSet.has(uniqueKey)) {
            return;
        }
        dedupeSet.add(uniqueKey);
        normalizedHospitals.push(hospital);
    };

    if (window.apiService && typeof window.apiService.getAdminHospitals === 'function') {
        try {
            const response = await window.apiService.getAdminHospitals({
                province,
                page: 1,
                pageSize: 200,
            });
            const apiHospitals = extractHospitalsArray(response);
            apiHospitals.forEach(pushHospital);
        } catch (error) {
            console.warn('从后端获取医院列表失败，使用本地数据:', error);
        }
    }

    if (normalizedHospitals.length === 0) {
        const localHospitals = getLocalHospitalsByProvince(province);
        localHospitals.forEach(pushHospital);
    }

    return normalizedHospitals;
}

// 格式化日期时间
function formatDateTime(value) {
    if (!value) {
        return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }
    return date.toLocaleString('zh-CN');
}

// 加载授权码管理页面
async function loadAuthCodesPage() {
    try {
        const adminInfo = getCurrentAdminInfo();

        // 优先从API获取授权码列表
        if (window.apiService && window.apiService.getAuthCodes) {
            try {
                const filters = {};
                if (adminInfo.province) {
                    filters.province = adminInfo.province;
                }

                console.log('[授权码管理] 请求参数:', filters);
                const result = await window.apiService.getAuthCodes(filters);
                console.log('[授权码管理] API返回的数据:', result);

                if (result && result.list) {
                    console.log('[授权码管理] 授权码列表数量:', result.list.length);
                    // 转换API返回的数据格式为本地格式
                    // 后端返回格式：{ id, code, province, status, created_by, usage_count, usage_limit, expires_at, created_at }
                    // status: 'active' 表示未使用，'revoked' 表示已撤销，usage_count > 0 表示已使用，或者直接有 used 字段
                    authCodes = result.list.map(code => ({
                        code: code.code,
                        id: code.id,
                        used: code.used !== undefined ? !!code.used : !!(code.status === 'revoked' || (code.usageCount !== undefined && code.usageCount > 0)),
                        province: code.province,
                        createdAt: code.createdAt || code.created_at,
                        usedBy: code.usedBy || code.hospitalName || null,
                        usedTime: code.usedAt || code.used_at || null,
                        createdBy: code.createdBy || code.created_by || null,
                        status: code.status,
                        usageCount: code.usageCount || 0,
                        usageLimit: code.usageLimit || 1,
                    }));

                    console.log('[授权码管理] 转换后的授权码列表:', authCodes);
                    // 同步保存到localStorage（兼容性）
                    saveAuthCodes();
                } else if (result && result.data && result.data.list) {
                    console.log('[授权码管理] 授权码列表数量（data.list 格式）:', result.data.list.length);
                    authCodes = result.data.list.map(code => ({
                        code: code.code,
                        id: code.id,
                        used: code.used !== undefined ? !!code.used : !!(code.status === 'revoked' || (code.usageCount !== undefined && code.usageCount > 0)),
                        province: code.province,
                        createdAt: code.createdAt || code.created_at,
                        usedBy: code.usedBy || code.hospitalName || null,
                        usedTime: code.usedAt || code.used_at || null,
                        createdBy: code.createdBy || code.created_by || null,
                        status: code.status,
                        usageCount: code.usageCount || 0,
                        usageLimit: code.usageLimit || 1,
                    }));
                    saveAuthCodes();
                } else if (Array.isArray(result)) {
                    // 如果返回的是数组（兼容旧格式）
                    console.log('[授权码管理] 授权码列表数量（数组格式）:', result.length);
                    authCodes = result.map(code => ({
                        code: code.code || code,
                        used: code.used === 1 || code.used === true || code.status === 'revoked',
                        province: code.province,
                        createdAt: code.createdAt || code.created_at,
                        usedBy: code.usedBy || code.hospitalName || null,
                        usedTime: code.usedAt || code.used_at || null,
                        createdBy: code.createdBy || code.created_by || null,
                    }));
                    saveAuthCodes();
                } else {
                    console.warn('[授权码管理] API返回的数据格式不正确:', result);
                    authCodes = [];
                }
            } catch (error) {
                console.error('从API获取授权码失败，使用本地存储:', error);
                // API失败时，降级到本地存储
                const latest = localStorage.getItem('authCodes');
                authCodes = latest ? JSON.parse(latest) : [];
                mergeSeedAuthCodes();
                saveAuthCodes();
            }
        } else {
            console.warn('[授权码管理] API服务不可用，使用本地存储');
            // 没有API服务，使用本地存储
            const latest = localStorage.getItem('authCodes');
            authCodes = latest ? JSON.parse(latest) : [];
            mergeSeedAuthCodes();
            saveAuthCodes();
        }
    } catch (e) {
        console.warn('读取授权码失败:', e);
        authCodes = [];
    }

    const adminInfo = getCurrentAdminInfo();

    // 副管理员只显示其管理省份的授权码
    let filteredCodes = authCodes;
    if (adminInfo.province) {
        filteredCodes = authCodes.filter(code => code.province === adminInfo.province);
    }

    const container = document.getElementById('auth-codes-page');
    const unsyncedLocalCodes = getUnsyncedLocalAuthCodes();

    let codesHTML = '';
    if (filteredCodes.length === 0) {
        codesHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <i class="fas fa-key" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <p>暂无授权码</p>
                <p style="font-size: 0.9rem;">${adminInfo.province ? `当前管理省份：${adminInfo.province}` : '请先设置管理省份'}</p>
            </div>
        `;
    } else {
        codesHTML = filteredCodes
            .map(
                (code, index) => `
            <div class="auth-code-item" style="padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: white; transition: all 0.3s;">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #333; margin-bottom: 5px; font-size: 1.1rem;">
                        <i class="fas fa-key" style="color: #667eea; margin-right: 8px;"></i>${code.code}
                    </div>
                    <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                        <i class="fas fa-map-marker-alt" style="color: #f57c00;"></i> 适用省份: ${code.province || '未设置'}
                    </div>
                    <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                        <i class="fas fa-calendar"></i> 创建时间: ${new Date(code.createdAt).toLocaleString('zh-CN')}
                    </div>
                    ${
    code.used
        ? `
                        <div style="font-size: 0.9rem; color: #e74c3c; margin-top: 5px;">
                            <i class="fas fa-check-circle"></i> 已使用 - ${code.usedBy} (${new Date(code.usedTime).toLocaleString('zh-CN')})
                        </div>
                    `
        : `
                        <div style="font-size: 0.9rem; color: #27ae60; margin-top: 5px;">
                            <i class="fas fa-circle"></i> 未使用
                        </div>
                    `
}
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-left: 20px;">
                    ${
    !code.used
        ? `
                        <span style="background: #27ae60; color: white; padding: 8px 15px; border-radius: 20px; font-size: 0.9rem;">
                            可用
                        </span>
                    `
        : `
                        <span style="background: #e74c3c; color: white; padding: 8px 15px; border-radius: 20px; font-size: 0.9rem;">
                            已使用
                        </span>
                    `
}
                    <button class="btn-copy-auth-code" 
                            data-code="${code.code.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" 
                            onclick="copyAuthCode(this.dataset.code)" 
                            title="复制授权码"
                            style="background: #667eea; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 5px; transition: all 0.3s;">
                        <i class="fas fa-copy"></i>
                        <span>复制</span>
                    </button>
                    ${
    !code.used
        ? `
                        <button class="btn-delete-auth-code" 
                                data-code="${code.code.replace(/"/g, '&quot;')}" 
                                onclick="deleteAuthCode(this.dataset.code)" 
                                title="删除授权码">
                            <i class="fas fa-trash-alt"></i>
                            <span>删除</span>
                        </button>
                    `
        : `
                        <button class="btn-delete-auth-code" 
                                disabled
                                title="该授权码已使用，不可删除"
                                style="background: #bdc3c7 !important; cursor: not-allowed !important;">
                            <i class="fas fa-trash-alt"></i>
                            <span>已锁定</span>
                        </button>
                    `
}
                </div>
            </div>
        `,
            )
            .join('');
    }

    container.innerHTML = `
        <div class="content-card">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <h3><i class="fas fa-key"></i> 授权码列表${adminInfo.province ? ` (${adminInfo.province})` : ''}</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${
    unsyncedLocalCodes.length > 0
        ? `
                        <button class="btn btn-secondary" onclick="syncLocalAuthCodesToServer()" style="padding: 10px 20px; margin-top: 10px;">
                            <i class="fas fa-cloud-upload-alt"></i> 同步本地授权码 (${unsyncedLocalCodes.length})
                        </button>
                    `
        : ''
}
                    ${
    filteredCodes.filter(c => c.used).length > 0
        ? `
                        <button class="btn btn-secondary" onclick="deleteUsedAuthCodes()" style="padding: 10px 20px; margin-top: 10px;">
                            <i class="fas fa-trash"></i> 删除已使用
                        </button>
                    `
        : ''
}
                    <button class="btn btn-secondary" onclick="repairUsedAuthCodes()" style="padding: 10px 20px; margin-top: 10px;">
                        <i class="fas fa-wrench"></i> 修复已使用状态
                    </button>
                    <button class="btn btn-secondary" onclick="reloadAuthCodes()" style="padding: 10px 20px; margin-top: 10px;">
                        <i class="fas fa-rotate"></i> 刷新
                    </button>
                    <button class="btn btn-primary" onclick="generateNewAuthCode()" style="padding: 10px 20px; margin-top: 10px;">
                        <i class="fas fa-plus"></i> 生成新授权码
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div style="font-weight: bold; margin-bottom: 10px;"><i class="fas fa-info-circle"></i> 使用说明</div>
                    <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.8;">
                        <li>生成的授权码用于医院注册</li>
                        <li>每个授权码只能使用一次</li>
                        <li>授权码只能用于指定省份的医院注册</li>
                        <li>使用后的授权码将标记为"已使用"</li>
                    </ul>
                </div>
                
                <div id="auth-codes-list">
                    ${codesHTML}
                </div>
            </div>
        </div>
    `;
}

async function syncLocalAuthCodesToServer() {
    const unsynced = getUnsyncedLocalAuthCodes();
    if (!unsynced.length) {
        showNotification('没有需要同步的本地授权码', 'info');
        return;
    }

    if (!window.apiService || !window.apiService.syncAuthCodes) {
        showModal(
            '错误',
            'API服务不可用，无法同步到后端\n\n请确保后端已加载并登录有效的管理员账号。',
        );
        return;
    }

    const adminInfo = getCurrentAdminInfo();
    if (!adminInfo.province) {
        showModal('错误', '请先在管理员资料中设置负责的省份，再同步授权码。');
        return;
    }

    try {
        showNotification(`正在同步 ${unsynced.length} 个授权码...`, 'info');
        const result = await window.apiService.syncAuthCodes({
            province: adminInfo.province,
            codes: unsynced.map(item => item.code),
        });

        const successCount = result?.created?.length || 0;
        const failedCount = result?.failed?.length || 0;
        const message = `同步完成：成功 ${successCount} 个${failedCount ? `，失败 ${failedCount} 个` : ''}`;

        if (failedCount && Array.isArray(result.failed)) {
            console.warn('[授权码同步] 失败明细:', result.failed);
        }

        showNotification(message, successCount ? 'success' : 'warning');
        await reloadAuthCodes();
    } catch (error) {
        console.error('同步授权码失败:', error);
        showModal('错误', `同步授权码失败：${error.message || '未知错误'}`);
    }
}

// 生成新的授权码
async function generateNewAuthCode() {
    const adminInfo = getCurrentAdminInfo();

    const province = adminInfo.province;
    if (!province) {
        showModal('错误', '副管理员未设置管理省份，无法生成授权码');
        return;
    }

    try {
        // 优先使用后端API生成授权码
        if (window.apiService && window.apiService.generateAuthCode) {
            showNotification('正在生成授权码...', 'info');

            try {
                const result = await window.apiService.generateAuthCode(province, 1);

                // API返回的格式：{ codes: ['AUTH123'], count: 1 } 或 { code: 'AUTH123' } 或 { authCodes: [{ code: 'AUTH123' }] }
                let newCode = '';
                if (result && typeof result === 'object') {
                    if (result.code) {
                        newCode = result.code;
                    } else if (result.codes && Array.isArray(result.codes) && result.codes.length > 0) {
                        newCode = result.codes[0];
                    } else if (result.authCodes && Array.isArray(result.authCodes) && result.authCodes.length > 0) {
                        newCode = result.authCodes[0].code || result.authCodes[0];
                    } else if (Array.isArray(result) && result.length > 0) {
                        newCode = result[0];
                    }
                }

                if (!newCode) {
                    throw new Error('API返回的授权码格式不正确');
                }

                showNotification(`授权码生成成功：${newCode}`, 'success');

                // 重新加载授权码页面（会自动从后端API获取最新列表）
                await loadAuthCodesPage();
                return;
            } catch (error) {
                console.error('使用API生成授权码失败:', error);

                const errorMessage = error?.message || '未知错误';
                let detailMessage = `生成授权码失败：${errorMessage}`;

                if (errorMessage.includes('登录已过期')) {
                    detailMessage += '\n\n请重新登录后再试。';
                } else if (errorMessage.includes('未设置管理省份')) {
                    detailMessage += '\n\n请先让主管理员为当前副管理员配置管理省份，然后重新登录。';
                } else if (errorMessage.includes('只能为当前管理省份生成授权码')) {
                    detailMessage += '\n\n当前账号只能生成本省的授权码，请检查账号省份配置。';
                } else if (errorMessage.includes('权限不足')) {
                    detailMessage += '\n\n请确认：\n1. 当前登录账号是副管理员或主管理员\n2. 已退出后重新登录\n3. 后端服务已重启到最新代码';
                }

                showModal('错误', detailMessage);
                return;
            }
        } else {
            // API服务不可用
            showModal(
                '错误',
                'API服务不可用，无法生成授权码\n\n请确保：\n1. 后端服务正在运行\n2. API服务已正确加载',
            );
            return;
        }
    } catch (error) {
        console.error('生成授权码失败:', error);
        showModal('错误', `生成授权码失败：${error.message || '未知错误'}`);
    }
}

// 刷新授权码（从后端API刷新）
async function reloadAuthCodes() {
    try {
        // 优先从后端API刷新
        if (window.apiService && window.apiService.getAuthCodes) {
            const adminInfo = getCurrentAdminInfo();
            const filters = {};
            if (adminInfo.province) {
                filters.province = adminInfo.province;
            }

            try {
                showNotification('正在从后端刷新授权码列表...', 'info');
                const result = await window.apiService.getAuthCodes(filters);

                if (result && result.list) {
                    // 转换API返回的数据格式为本地格式
                    authCodes = result.list.map(code => ({
                        code: code.code,
                        id: code.id,
                        used: code.used !== undefined ? !!code.used : !!(code.status === 'revoked' || (code.usageCount !== undefined && code.usageCount > 0)),
                        province: code.province,
                        createdAt: code.createdAt || code.created_at,
                        usedBy: code.usedBy || code.hospitalName || null,
                        usedTime: code.usedAt || code.used_at || null,
                        createdBy: code.createdBy || code.created_by || null,
                        status: code.status,
                        usageCount: code.usageCount || 0,
                        usageLimit: code.usageLimit || 1,
                    }));

                    // 同步保存到localStorage（兼容性）
                    saveAuthCodes();

                    // 重新加载页面
                    await loadAuthCodesPage();
                    showNotification('已从后端刷新授权码列表', 'success');
                    return;
                } else if (Array.isArray(result)) {
                    // 如果返回的是数组（兼容旧格式）
                    authCodes = result.map(code => ({
                        code: code.code || code,
                        used: code.used === 1 || code.used === true || code.status === 'revoked',
                        province: code.province,
                        createdAt: code.createdAt || code.created_at,
                        usedBy: code.usedBy || code.hospitalName || null,
                        usedTime: code.usedAt || code.used_at || null,
                        createdBy: code.createdBy || code.created_by || null,
                    }));
                    saveAuthCodes();
                    await loadAuthCodesPage();
                    showNotification('已从后端刷新授权码列表', 'success');
                    return;
                } else {
                    console.warn('[刷新授权码] API返回的数据格式不正确:', result);
                    showNotification('API返回数据格式不正确', 'warning');
                }
            } catch (error) {
                console.error('从后端刷新授权码失败:', error);
                showNotification(
                    `从后端刷新失败，使用本地存储: ${error.message || '未知错误'}`,
                    'warning',
                );
            }
        }

        // 后备方案：从localStorage读取
        const latest = localStorage.getItem('authCodes');
        authCodes = latest ? JSON.parse(latest) : [];
        mergeSeedAuthCodes();
        saveAuthCodes();
        loadAuthCodesPage();
        showNotification('已从本地存储刷新授权码列表', 'info');
    } catch (e) {
        console.error('刷新授权码失败:', e);
        showNotification(`刷新失败：${e.message || '未知错误'}`, 'error');
    }
}

// 复制授权码
function copyAuthCode(codeValue) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
            .writeText(codeValue)
            .then(() => {
                showNotification(`授权码已复制到剪贴板：${codeValue}`, 'success');
            })
            .catch(err => {
                console.error('复制失败:', err);
                fallbackCopyToClipboard(codeValue);
            });
    } else {
        fallbackCopyToClipboard(codeValue);
    }
}

// 降级复制方案
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showNotification(`授权码已复制到剪贴板：${text}`, 'success');
        } else {
            showNotification(`复制失败，请手动复制：${text}`, 'error');
        }
    } catch (err) {
        console.error('复制失败:', err);
        showNotification(`复制失败，请手动复制：${text}`, 'error');
    } finally {
        document.body.removeChild(textArea);
    }
}

// 删除授权码
function deleteAuthCode(codeValue) {
    const codeIndex = authCodes.findIndex(c => c.code === codeValue);

    if (codeIndex === -1) {
        showNotification('授权码不存在', 'error');
        return;
    }

    const code = authCodes[codeIndex];
    
    // 前端保护：已使用的授权码不可删除
    if (code.used) {
        showNotification('该授权码已被使用，不可删除。如需删除，请联系主管理员。', 'error');
        return;
    }
    
    const codeStatus = code.used ? '（已使用）' : '（未使用）';

    let hospitalToDelete = null;
    if (code.used) {
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        hospitalToDelete = accounts.hospital?.find(h => h.authCodeUsed === codeValue);
    }

    let confirmMessage = `确定要删除授权码 ${codeValue} ${codeStatus} 吗？\n\n`;
    if (hospitalToDelete) {
        confirmMessage += `⚠️ 警告：使用该授权码的医院"${hospitalToDelete.hospitalName}"也将被同时注销删除！\n\n`;
    }
    confirmMessage += '此操作不可恢复。';

    if (!confirm(confirmMessage)) {
        return;
    }

    const performLocalRemoval = () => {
        if (hospitalToDelete) {
            const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
            if (accounts.hospital) {
                accounts.hospital = accounts.hospital.filter(h => h.authCodeUsed !== codeValue);
                localStorage.setItem('accounts', JSON.stringify(accounts));
            }
        }

        authCodes.splice(codeIndex, 1);
        saveAuthCodes();
        loadAuthCodesPage();

        let successMessage = `授权码已删除：${codeValue}`;
        if (hospitalToDelete) {
            successMessage += `\n医院"${hospitalToDelete.hospitalName}"已同时注销删除`;
        }
        showNotification(successMessage, 'success');
    };

    if (code.id && window.apiService && window.apiService.deleteAuthCode) {
        window.apiService
            .deleteAuthCode(code.id)
            .then(() => {
                performLocalRemoval();
                reloadAuthCodes();
            })
            .catch(error => {
                console.error('删除授权码失败:', error);
                showModal('错误', `删除授权码失败：${error.message || '未知错误'}`);
            });
    } else {
        performLocalRemoval();
    }
}

// 批量删除已使用的授权码
function deleteUsedAuthCodes() {
    const adminInfo = getCurrentAdminInfo();

    let codesToDelete = authCodes.filter(c => c.used);

    if (adminInfo.province) {
        codesToDelete = codesToDelete.filter(c => c.province === adminInfo.province);
    }

    if (codesToDelete.length === 0) {
        showNotification('没有已使用的授权码', 'info');
        return;
    }

    const count = codesToDelete.length;

    const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
    const hospitalsToDelete = [];
    codesToDelete.forEach(code => {
        const hospital = accounts.hospital?.find(h => h.authCodeUsed === code.code);
        if (hospital) {
            hospitalsToDelete.push(hospital);
        }
    });

    let confirmMessage = `确定要删除所有已使用的授权码吗？\n\n将删除 ${count} 个已使用的授权码`;
    if (hospitalsToDelete.length > 0) {
        confirmMessage += `，同时将注销删除 ${hospitalsToDelete.length} 个使用这些授权码的医院账号：\n\n`;
        hospitalsToDelete.forEach((h, index) => {
            confirmMessage += `${index + 1}. ${h.hospitalName}\n`;
        });
        confirmMessage += '\n';
    }
    confirmMessage += '\n⚠️ 警告：此操作不可恢复！';

    if (!confirm(confirmMessage)) {
        return;
    }

    const codesToDeleteSet = new Set(codesToDelete.map(c => c.code));

    const deletePromises = [];
    if (window.apiService && window.apiService.deleteAuthCode) {
        codesToDelete.forEach(code => {
            if (code.id) {
                deletePromises.push(
                    window.apiService.deleteAuthCode(code.id).catch(error => {
                        console.warn('删除授权码失败（已忽略）:', code.code, error);
                    }),
                );
            }
        });
    }

    Promise.all(deletePromises).finally(() => {
        if (hospitalsToDelete.length > 0 && accounts.hospital) {
            accounts.hospital = accounts.hospital.filter(
                h => !codesToDeleteSet.has(h.authCodeUsed),
            );
            localStorage.setItem('accounts', JSON.stringify(accounts));
        }

        authCodes = authCodes.filter(c => !codesToDeleteSet.has(c.code));
        saveAuthCodes();
        loadAuthCodesPage();
        reloadAuthCodes();

        let successMessage = `已成功删除 ${count} 个已使用的授权码`;
        if (hospitalsToDelete.length > 0) {
            successMessage += `，并注销删除了 ${hospitalsToDelete.length} 个医院账号`;
        }
        showNotification(successMessage, 'success');
    });
}

async function repairUsedAuthCodes() {
    const adminInfo = getCurrentAdminInfo();
    const provinceText = adminInfo.province || '当前可见范围';

    if (!confirm(`确定要修复 ${provinceText} 内已被医院使用但状态异常的授权码吗？`)) {
        return;
    }

    if (!window.apiService || !window.apiService.repairUsedAuthCodes) {
        showModal('错误', 'API服务不可用，无法修复授权码状态');
        return;
    }

    try {
        showNotification('正在修复授权码状态...', 'info');
        const result = await window.apiService.repairUsedAuthCodes(adminInfo.province || null);
        const payload = result?.data || result || {};
        const repairedCount = payload.repairedCount || 0;

        if (repairedCount > 0) {
            showNotification(`修复完成：已修复 ${repairedCount} 个授权码状态`, 'success');
        } else {
            showNotification('没有发现需要修复的授权码状态', 'info');
        }

        await reloadAuthCodes();
    } catch (error) {
        console.error('修复授权码状态失败:', error);
        showModal('错误', `修复授权码状态失败：${error.message || '未知错误'}`);
    }
}

// 加载账号管理页面
function loadAccountPage() {
    loadAdminAccountInfo();
}

// 头像同步
let adminAvatarSyncChannel = null;

function getAdminAvatarSyncUsername() {
    const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
    return loginInfo.username || loginInfo.user?.username || 'admin';
}

function setAdminAvatarImage(avatarData, username = getAdminAvatarSyncUsername()) {
    const avatarEl = document.getElementById('admin-avatar');
    if (avatarEl) {
        avatarEl.src = avatarData || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=120&background=667eea&color=fff&bold=true`;
    }
}

function broadcastAdminAvatarUpdate(avatarData) {
    const username = getAdminAvatarSyncUsername();
    const payload = {
        scope: 'admin',
        username,
        avatar: avatarData,
        timestamp: Date.now(),
    };

    try {
        localStorage.setItem(`adminConfig_${username}`, JSON.stringify({
            ...JSON.parse(localStorage.getItem(`adminConfig_${username}`) || '{}'),
            avatar: avatarData,
        }));
        localStorage.setItem('avatar_sync_event', JSON.stringify(payload));
    } catch (error) {
        console.warn('保存头像同步事件失败:', error);
    }

    if (adminAvatarSyncChannel) {
        adminAvatarSyncChannel.postMessage(payload);
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
    if (window.__adminAvatarSyncInitialized) {
        return;
    }
    window.__adminAvatarSyncInitialized = true;

    if (typeof BroadcastChannel !== 'undefined') {
        adminAvatarSyncChannel = new BroadcastChannel('avatar_sync');
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

// 加载管理员账号信息
function loadAdminAccountInfo() {
    try {
        const loginInfo = JSON.parse(sessionStorage.getItem('loginInfo') || '{}');
        const username = loginInfo.username || loginInfo.user?.username || 'admin';

        // 优先从登录信息中获取用户信息（从数据库返回的数据）
        const userInfo = loginInfo.user || {};

        // 兼容性：如果登录信息中没有，尝试从localStorage获取
        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        const adminAccount = accounts.admin?.find(acc => acc.username === username);
        const adminConfig = JSON.parse(localStorage.getItem(`adminConfig_${username}`) || '{}');

        const usernameEl = document.getElementById('admin-username');
        if (usernameEl) {
            usernameEl.value = username;
        }

        const roleEl = document.getElementById('admin-role');
        if (roleEl) {
            roleEl.value = '副管理员';
        }

        const provinceEl = document.getElementById('admin-province');
        if (provinceEl) {
            // 优先使用登录信息中的province，否则使用localStorage中的
            provinceEl.value = userInfo.province || adminAccount?.province || '未设置';
        }

        const avatarEl = document.getElementById('admin-avatar');
        if (avatarEl) {
            setAdminAvatarImage(adminConfig.avatar, username);
        }

        const nicknameEl = document.getElementById('admin-nickname');
        const emailEl = document.getElementById('admin-email');

        // 优先使用登录信息中的nickname和email（从数据库返回）
        // 如果没有，再使用localStorage中的（兼容旧数据）
        if (nicknameEl) {
            nicknameEl.value = userInfo.nickname || adminConfig.nickname || '';
        }
        if (emailEl) {
            emailEl.value = userInfo.email || adminConfig.email || '';
        }

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
        console.warn('更新副管理员登录头像失败:', error);
    }

    broadcastAdminAvatarUpdate(avatarData);

    closeAdminAvatarCropModal();
    showNotification('头像上传成功！', 'success');
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
        const userId = loginInfo.user?.id || loginInfo.userId;
        const username = loginInfo.username || loginInfo.user?.username || 'admin';

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

                showNotification('账号信息已更新！', 'success');
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

        const avatarEl = document.getElementById('admin-avatar');
        if (avatarEl && avatarEl.src && !avatarEl.src.startsWith('https://ui-avatars.com')) {
            adminConfig.avatar = avatarEl.src;
        }

        localStorage.setItem(`adminConfig_${username}`, JSON.stringify(adminConfig));

        showNotification('账号信息已更新！', 'success');
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

        if (!currentPassword) {
            showModal('输入错误', '请输入当前密码');
            return;
        }

        if (!newPassword) {
            showModal('输入错误', '请输入新密码');
            return;
        }

        if (newPassword.length < 6) {
            showModal('输入错误', '新密码长度至少为6位');
            return;
        }

        if (newPassword !== confirmPassword) {
            showModal('输入错误', '两次输入的新密码不一致');
            return;
        }

        const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        const adminAccount = accounts.admin?.find(acc => acc.username === username);

        if (!adminAccount || adminAccount.password !== currentPassword) {
            showModal('密码错误', '当前密码不正确');
            return;
        }

        adminAccount.password = newPassword;
        accounts.admin = accounts.admin || [];
        const adminIndex = accounts.admin.findIndex(acc => acc.username === username);
        if (adminIndex !== -1) {
            accounts.admin[adminIndex] = adminAccount;
        } else {
            accounts.admin.push(adminAccount);
        }

        localStorage.setItem('accounts', JSON.stringify(accounts));

        currentPasswordEl.value = '';
        newPasswordEl.value = '';
        confirmPasswordEl.value = '';

        showNotification('密码修改成功！请使用新密码登录', 'success');
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
    showNotification('表单已重置', 'info');
}

// 更新当前时间
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
        timeEl.textContent = timeString;
    }
}

// 初始化菜单
function initializeMenu() {
    // 菜单项已在HTML中定义，这里可以添加额外的初始化逻辑
}

// 显示模态框
function showModal(title, body, onConfirm) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal').style.display = 'flex';

    if (onConfirm) {
        console.log('showModal with onConfirm callback');
    }
}

// 关闭模态框
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

// 显示通知
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    if (!document.getElementById('notification-style')) {
        const style = document.createElement('style');
        style.id = 'notification-style';
        style.textContent = `
            .notification-toast {
                position: fixed;
                top: 80px;
                right: 30px;
                background: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 3000;
                animation: slideIn 0.3s ease-out;
                min-width: 300px;
                border-left: 4px solid;
            }
            
            .notification-toast.success {
                border-left-color: #27ae60;
            }
            
            .notification-toast.error {
                border-left-color: #e74c3c;
            }
            
            .notification-toast.info {
                border-left-color: #3498db;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .notification-content i {
                font-size: 1.3rem;
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

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);

    if (!document.getElementById('notification-slideout-style')) {
        const slideOutStyle = document.createElement('style');
        slideOutStyle.id = 'notification-slideout-style';
        slideOutStyle.textContent = `
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(slideOutStyle);
    }
}
