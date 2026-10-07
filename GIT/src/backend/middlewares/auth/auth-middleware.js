// 身份验证守卫模块
const AuthGuard = {
    // 检查用户是否已登录
    checkLogin() {
        // 从sessionStorage或localStorage中获取登录信息
        const loginInfo = sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo');
        return !!loginInfo;
    },

    // 获取登录用户信息
    getLoginInfo() {
        const loginInfo = sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo');
        if (loginInfo) {
            try {
                return JSON.parse(loginInfo);
            } catch (e) {
                console.error('解析登录信息失败:', e);
                return null;
            }
        }
        return null;
    },

    // 验证用户权限
    checkPermission(requiredRole = null) {
        const loginInfo = this.getLoginInfo();
        if (!loginInfo) {
            return false;
        }

        // 如果没有指定角色，则只需要登录即可
        if (!requiredRole) {
            return true;
        }

        // 检查用户角色是否匹配
        return loginInfo.role === requiredRole;
    },

    // 保护页面访问
    protectPage(requiredRole = null) {
        // 检查是否已登录
        if (!this.checkLogin()) {
            // 保存当前页面的URL，以便登录后重定向回来
            const currentUrl = window.location.pathname;
            sessionStorage.setItem('redirectUrl', currentUrl);

            // 重定向到登录页面
            window.location.href = '/auth/login.html';
            return false;
        }

        // 检查权限
        if (requiredRole && !this.checkPermission(requiredRole)) {
            // 权限不足，重定向到首页或错误页面
            showNotification('权限不足，无法访问该页面', 'error');
            window.location.href = '/user/index.html';
            return false;
        }

        return true;
    },

    // 登出
    logout() {
        // 清除登录信息
        sessionStorage.removeItem('loginInfo');
        localStorage.removeItem('loginInfo');

        // 重定向到登录页面
        window.location.href = '/auth/login.html';
    },

    // 登录成功后重定向
    redirectAfterLogin() {
        // 获取保存的重定向URL
        const redirectUrl = sessionStorage.getItem('redirectUrl');
        if (redirectUrl) {
            sessionStorage.removeItem('redirectUrl');
            window.location.href = redirectUrl;
        } else {
            // 默认重定向到用户首页
            const loginInfo = this.getLoginInfo();
            if (loginInfo) {
                switch (loginInfo.role) {
                    case 'user':
                        window.location.href = '/user/index.html';
                        break;
                    case 'hospital':
                        window.location.href = '/hospital/hospital.html';
                        break;
                    case 'admin':
                        window.location.href = '/admin/admin.html';
                        break;
                    case 'sub':
                        window.location.href = '/sub-admin/sub-admin.html';
                        break;
                    default:
                        window.location.href = '/user/index.html';
                }
            } else {
                window.location.href = '/user/index.html';
            }
        }
    },
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthGuard;
} else if (typeof window !== 'undefined') {
    window.AuthGuard = AuthGuard;
}
