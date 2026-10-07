const AuthGuard = {
  REDIRECT_URL_KEY: 'redirectUrl',
  AUTH_EXPIRED_FLAG_KEY: 'authExpiredRedirecting',
  AUTH_EXPIRED_REDIRECT_DELAY: 2000,
  AUTH_CLEANUP_NOTICE_KEY: 'authCleanupNotice',
  SETTINGS_STORAGE_KEYS: [
    'encrypted_user_settings',
    'settings_sync_status',
    'settings_last_sync',
    'settings_data_version',
    'notificationSettings',
    'privacySettings'
  ],

  _safeParseLoginInfo: function(rawLoginInfo) {
    if (!rawLoginInfo) {
      return null;
    }

    try {
      return JSON.parse(rawLoginInfo);
    } catch (error) {
      console.error('解析登录信息失败:', error);
      return null;
    }
  },

  _isValidLoginInfo: function(info) {
    if (!info || typeof info !== 'object') {
      return false;
    }

    const user = info.user;
    const role = user?.role || info.role;
    const username = user?.username || info.username;
    const userId = user?.id || user?.userId || info.userId;
    const token = info.token || info.authToken;

    return Boolean(role && username && userId && token);
  },

  _clearSettingsSyncState: function() {
    this.SETTINGS_STORAGE_KEYS.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  },

  clearAuthState: function(options = {}) {
    const { preserveRedirect = false, preserveCleanupNotice = false } = options;

    sessionStorage.removeItem(this.AUTH_EXPIRED_FLAG_KEY);
    sessionStorage.removeItem('authExpiredMessage');
    sessionStorage.removeItem('authExpiredRedirectDelay');
    if (!preserveCleanupNotice) {
      sessionStorage.removeItem(this.AUTH_CLEANUP_NOTICE_KEY);
    }
    document.cookie = 'healthguard_frontend_auth=; path=/; max-age=0; SameSite=Lax';
    localStorage.removeItem('loginInfo');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('loginInfo');
    sessionStorage.removeItem('authToken');

    if (!preserveRedirect) {
      localStorage.removeItem(this.REDIRECT_URL_KEY);
      sessionStorage.removeItem(this.REDIRECT_URL_KEY);
    }

    this._clearSettingsSyncState();
  },

  sanitizeStoredAuthState: function() {
    const sessionInfo = this._safeParseLoginInfo(sessionStorage.getItem('loginInfo'));
    const localInfo = this._safeParseLoginInfo(localStorage.getItem('loginInfo'));

    const hasSessionRaw = Boolean(sessionStorage.getItem('loginInfo'));
    const hasLocalRaw = Boolean(localStorage.getItem('loginInfo'));
    const hasBrokenSession = hasSessionRaw && !this._isValidLoginInfo(sessionInfo);
    const hasBrokenLocal = hasLocalRaw && !this._isValidLoginInfo(localInfo);

    if (hasBrokenSession || hasBrokenLocal) {
      console.warn('检测到损坏的登录信息，已自动清理本地登录态');
      sessionStorage.setItem(this.AUTH_CLEANUP_NOTICE_KEY, '检测到损坏的登录状态，已自动清理，请重新登录');
      this.clearAuthState({ preserveRedirect: true, preserveCleanupNotice: true });
      return null;
    }

    if (sessionInfo && localInfo) {
      const sessionUserId = sessionInfo.user?.id || sessionInfo.user?.userId || null;
      const localUserId = localInfo.user?.id || localInfo.user?.userId || null;
      const sessionToken = sessionInfo.token || sessionInfo.authToken || null;
      const localToken = localInfo.token || localInfo.authToken || null;

      if ((sessionUserId && localUserId && sessionUserId !== localUserId)
        || (sessionToken && localToken && sessionToken !== localToken)) {
        console.warn('检测到冲突的登录状态，已优先保留当前会话并清理旧缓存');
        sessionStorage.setItem(this.AUTH_CLEANUP_NOTICE_KEY, '检测到旧登录状态冲突，已自动清理旧缓存，请重新确认登录信息');
        localStorage.removeItem('loginInfo');
        localStorage.removeItem('authToken');
        this._clearSettingsSyncState();
        return sessionInfo;
      }
    }

    if (!sessionInfo && !localInfo) {
      this._clearSettingsSyncState();
      return null;
    }

    return sessionInfo || localInfo;
  },

  redirectAfterLogin: function() {
    const loginInfo = sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo');
    
    if (loginInfo) {
      try {
        const info = JSON.parse(loginInfo);
        const currentRole = info?.user?.role || info?.role;
        const redirectUrl = sessionStorage.getItem(this.REDIRECT_URL_KEY) || localStorage.getItem(this.REDIRECT_URL_KEY);
        
        if (redirectUrl && this.isValidRedirectUrl(redirectUrl, currentRole)) {
          sessionStorage.removeItem(this.REDIRECT_URL_KEY);
          localStorage.removeItem(this.REDIRECT_URL_KEY);
          window.location.href = redirectUrl;
          return;
        }
        
        switch (currentRole) {
          case 'user':
            window.location.href = '/views/user/dashboard/index.html';
            break;
          case 'hospital':
            window.location.href = '/views/hospital/hospital.html';
            break;
          case 'admin':
            window.location.href = '/views/admin/admin.html';
            break;
          case 'sub':
            window.location.href = '/views/sub-admin/sub-admin.html';
            break;
          default:
            window.location.href = '/';
        }
      } catch (e) {
        console.error('解析登录信息失败:', e);
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
  },

  isValidRedirectUrl: function(url, role) {
    if (!url) return false;
    
    const allowedRoutes = {
      'user': [
        '/views/user/dashboard/index.html',
        '/views/user/dashboard/settings.html',
        '/views/user/dashboard/device-connection.html',
        '/views/user/dashboard/fitbit-connection.html',
        '/views/user/dashboard/fitbit-callback.html',
        '/views/user/dashboard/tuya-connection.html',
        '/views/user/dashboard/health-trend.html'
        // 旧独立 AI 页面与交互面板页面已停用
      ],
      'hospital': ['/views/hospital/hospital.html'],
      'admin': [
        '/views/admin/admin.html'
        // 旧独立 API 监控页面已停用
      ],
      'sub': ['/views/sub-admin/sub-admin.html']
    };
    
    const routes = allowedRoutes[role] || [];
    
    if (role === 'admin' || role === 'sub') {
      const combinedRoutes = [
        ...(allowedRoutes['admin'] || []),
        ...(allowedRoutes['sub'] || [])
      ];
      return combinedRoutes.some(route => url.startsWith(route));
    }
    
    if (role === 'hospital') {
      const combinedRoutes = [
        ...(allowedRoutes['hospital'] || []),
        ...(allowedRoutes['admin'] || []),
        ...(allowedRoutes['sub'] || [])
      ];
      return combinedRoutes.some(route => url.startsWith(route));
    }
    
    return routes.some(route => url.startsWith(route));
  },

  checkAuth: function() {
    const info = this.sanitizeStoredAuthState();
    if (!info) {
      return false;
    }

    return Boolean(info?.user?.role || info?.role);
  },

  protectPage: function(requiredRole) {
    const info = this.sanitizeStoredAuthState();
    
    if (!info) {
      this.redirectToLogin();
      return false;
    }
    
    try {
      const currentRole = info?.user?.role || info?.role;
      
      if (requiredRole) {
        let hasAccess = false;
        
        if (currentRole === requiredRole) {
          hasAccess = true;
        } else if ((requiredRole === 'admin' || requiredRole === 'sub') && 
                   (currentRole === 'admin' || currentRole === 'sub')) {
          hasAccess = true;
        }
        
        if (!hasAccess) {
          if (this.checkAuth()) {
            this.redirectToHome(currentRole);
          } else {
            this.redirectToLogin();
          }
          return false;
        }
      }
      
      return true;
    } catch (e) {
      console.error('验证登录信息失败:', e);
      this.redirectToLogin();
      return false;
    }
  },

  redirectToLogin: function(reason = '') {
    const currentUrl = window.location.pathname + window.location.search;
    sessionStorage.setItem(this.REDIRECT_URL_KEY, currentUrl);
    localStorage.setItem(this.REDIRECT_URL_KEY, currentUrl);

    const query = new URLSearchParams();
    if (reason) {
      query.set('reason', reason);
    }

    const loginUrl = `/views/auth/login.html${query.toString() ? `?${query.toString()}` : ''}`;
    window.location.href = loginUrl;
  },

  handleSessionExpired: function(message = '登录状态已失效，请重新登录') {
    const redirectingFlag = sessionStorage.getItem(this.AUTH_EXPIRED_FLAG_KEY);
    if (redirectingFlag === 'true') {
      return;
    }

    sessionStorage.setItem(this.AUTH_EXPIRED_FLAG_KEY, 'true');
    sessionStorage.setItem('authExpiredMessage', message);
    sessionStorage.setItem('authExpiredRedirectDelay', String(this.AUTH_EXPIRED_REDIRECT_DELAY));

    this.clearAuthState({ preserveRedirect: true });

    if (typeof document !== 'undefined' && document.body) {
      const existingOverlay = document.getElementById('authExpiredOverlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }

      const overlay = document.createElement('div');
      overlay.id = 'authExpiredOverlay';
      overlay.innerHTML = `
        <div class="auth-expired-overlay-backdrop"></div>
        <div class="auth-expired-overlay-card" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="auth-expired-overlay-icon">!</div>
          <div class="auth-expired-overlay-title">登录已失效</div>
          <div class="auth-expired-overlay-text">2 秒后跳转登录页</div>
        </div>
      `;

      const style = document.createElement('style');
      style.id = 'authExpiredOverlayStyle';
      style.textContent = `
        .auth-expired-overlay-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          z-index: 9998;
        }
        .auth-expired-overlay-card {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: min(360px, calc(100vw - 32px));
          padding: 28px 24px;
          border-radius: 20px;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
          color: #9a3412;
          text-align: center;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
          z-index: 9999;
          animation: authExpiredOverlayPop 0.22s ease-out;
        }
        .auth-expired-overlay-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: #fff;
          font-size: 28px;
          font-weight: 700;
          box-shadow: 0 12px 24px rgba(249, 115, 22, 0.35);
        }
        .auth-expired-overlay-title {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .auth-expired-overlay-text {
          font-size: 15px;
          line-height: 1.6;
          color: #c2410c;
        }
        @keyframes authExpiredOverlayPop {
          from {
            opacity: 0;
            transform: translate(-50%, calc(-50% + 12px)) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `;

      if (!document.getElementById(style.id)) {
        document.head.appendChild(style);
      }
      document.body.appendChild(overlay);
    }

    setTimeout(() => {
      this.redirectToLogin('session-expired');
    }, this.AUTH_EXPIRED_REDIRECT_DELAY);
  },

  redirectToHome: function(role) {
    switch (role) {
      case 'user':
        window.location.href = '/views/user/dashboard/index.html';
        break;
      case 'hospital':
        window.location.href = '/views/hospital/hospital.html';
        break;
      case 'admin':
        window.location.href = '/views/admin/admin.html';
        break;
      case 'sub':
        window.location.href = '/views/sub-admin/sub-admin.html';
        break;
      default:
        window.location.href = '/';
    }
  },

  getLoginInfo: function() {
    const info = this.sanitizeStoredAuthState();
    if (info) {
      if (info && info.user && !info.role && info.user.role) {
        return { ...info, role: info.user.role };
      }
      return info;
    }
    return null;
  },

  logout: function() {
    this.clearAuthState();
    document.cookie = 'healthguard_frontend_auth=; path=/; max-age=0; SameSite=Lax';
    window.location.href = '/views/auth/login.html?logout=true';
  }
};

document.addEventListener('DOMContentLoaded', function() {
  AuthGuard.sanitizeStoredAuthState();
  const noAuthPages = [
    '/views/auth/login.html',
    '/pages/auth/register.html',
    '/pages/auth/forgot-password.html',
    '/pages/auth/privacy-policy.html',
    '/pages/auth/user-agreement.html',
    '/index.html',
    '/'
    // '/preview.html' // 旧预览页路径，已停用
  ];
  
  const currentPath = window.location.pathname;
  if (noAuthPages.some(page => currentPath === page || currentPath.endsWith(page))) {
    return;
  }

  let requiredRole = null;

  if (currentPath.includes('/views/user/')) {
    requiredRole = 'user';
  } else if (currentPath.includes('/views/hospital/')) {
    requiredRole = 'hospital';
  } else if (currentPath.includes('/views/admin/')) {
    requiredRole = 'admin';
  } else if (currentPath.includes('/views/sub-admin/')) {
    requiredRole = 'sub';
  }

  AuthGuard.protectPage(requiredRole);
});

window.AuthGuard = AuthGuard;
