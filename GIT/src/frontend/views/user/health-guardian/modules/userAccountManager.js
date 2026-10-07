const USER_STORAGE_KEY = 'healthGuardianUsers';
const CURRENT_USER_KEY = 'healthGuardianCurrentUser';

function getSiteLoginInfo() {
    try {
        const raw = sessionStorage.getItem('loginInfo') || localStorage.getItem('loginInfo');
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error('读取站点登录信息失败:', error);
        return null;
    }
}

class UserAccountManager {
    constructor() {
        this.currentUser = null;
        this.listeners = [];
        this.loadCurrentUser();
    }

    loadUsers() {
        try {
            const saved = localStorage.getItem(USER_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('加载用户数据失败:', error);
            return {};
        }
    }

    saveUsers(users) {
        try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
        } catch (error) {
            console.error('保存用户数据失败:', error);
        }
    }

    loadCurrentUser() {
        try {
            const siteLoginInfo = getSiteLoginInfo();
            if (siteLoginInfo?.role === 'user' && siteLoginInfo.user) {
                this.currentUser = {
                    id: siteLoginInfo.user.id || siteLoginInfo.user.userId || siteLoginInfo.username,
                    username: siteLoginInfo.user.nickname || siteLoginInfo.user.username || siteLoginInfo.username,
                    email: siteLoginInfo.user.email || '',
                    phone: siteLoginInfo.user.phone || '',
                    profile: {
                        avatar: siteLoginInfo.user.avatar || null,
                        bio: '',
                        birthday: siteLoginInfo.user.birthDate || null,
                        gender: siteLoginInfo.user.gender || null,
                        height: siteLoginInfo.user.height || null,
                        weight: siteLoginInfo.user.weight || null,
                    },
                    source: 'site-session',
                };
                this.saveCurrentUser();
                return;
            }

            const saved = localStorage.getItem(CURRENT_USER_KEY);
            if (saved) {
                this.currentUser = JSON.parse(saved);
            }
        } catch (error) {
            console.error('加载当前用户失败:', error);
        }
    }

    saveCurrentUser() {
        try {
            if (this.currentUser) {
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.currentUser));
            } else {
                localStorage.removeItem(CURRENT_USER_KEY);
            }
        } catch (error) {
            console.error('保存当前用户失败:', error);
        }
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    register(username, email, password) {
        if (!username || !email || !password) {
            return { success: false, error: '所有字段均为必填项' };
        }

        const users = this.loadUsers();
        
        if (users[email]) {
            return { success: false, error: '该邮箱已被注册' };
        }

        const userId = this.generateUserId();
        const user = {
            id: userId,
            username,
            email,
            passwordHash: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            lastLoginAt: null,
            profile: {
                avatar: null,
                bio: '',
                birthday: null,
                gender: null,
                height: null,
                weight: null,
            }
        };

        users[email] = user;
        this.saveUsers(users);

        return { success: true, user: { ...user, passwordHash: undefined } };
    }

    login(email, password) {
        const users = this.loadUsers();
        const user = users[email];

        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        if (user.passwordHash !== this.hashPassword(password)) {
            return { success: false, error: '密码错误' };
        }

        user.lastLoginAt = new Date().toISOString();
        users[email] = user;
        this.saveUsers(users);

        this.currentUser = { ...user, passwordHash: undefined };
        this.saveCurrentUser();
        this.notifyListeners();

        return { success: true, user: this.currentUser };
    }

    logout() {
        this.currentUser = null;
        this.saveCurrentUser();
        this.notifyListeners();
        return { success: true };
    }

    isLoggedIn() {
        const siteLoginInfo = getSiteLoginInfo();
        if (siteLoginInfo?.role === 'user') {
            if (!this.currentUser || this.currentUser.source !== 'site-session') {
                this.loadCurrentUser();
            }
            return true;
        }
        return this.currentUser !== null;
    }

    getCurrentUser() {
        if (!this.currentUser) {
            this.loadCurrentUser();
        }
        return this.currentUser;
    }

    getCurrentUserId() {
        return this.currentUser ? this.currentUser.id : null;
    }

    updateProfile(profileData) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const users = this.loadUsers();
        const user = users[this.currentUser.email];

        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        user.profile = { ...user.profile, ...profileData };
        users[this.currentUser.email] = user;
        this.saveUsers(users);

        this.currentUser = { ...user, passwordHash: undefined };
        this.saveCurrentUser();
        this.notifyListeners();

        return { success: true, user: this.currentUser };
    }

    changePassword(oldPassword, newPassword) {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const users = this.loadUsers();
        const user = users[this.currentUser.email];

        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        if (user.passwordHash !== this.hashPassword(oldPassword)) {
            return { success: false, error: '原密码错误' };
        }

        user.passwordHash = this.hashPassword(newPassword);
        users[this.currentUser.email] = user;
        this.saveUsers(users);

        return { success: true };
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners() {
        this.listeners.forEach(listener => listener(this.currentUser));
    }

    deleteAccount() {
        if (!this.currentUser) {
            return { success: false, error: '未登录' };
        }

        const users = this.loadUsers();
        delete users[this.currentUser.email];
        this.saveUsers(users);

        this.logout();
        return { success: true };
    }
}

export const userAccountManager = new UserAccountManager();
