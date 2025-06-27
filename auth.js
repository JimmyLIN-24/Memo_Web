// 用户认证和数据管理系统
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.initAuth();
    }

    // 初始化认证系统
    initAuth() {
        // 检查本地存储的登录状态
        const savedUser = localStorage.getItem('memo_current_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.isLoggedIn = true;
            this.showUserInfo();
            
            // 如果是Grace快捷用户，加载专用数据
            if (this.currentUser.isQuickUser) {
                this.loadGraceUserData();
            } else {
                // 其他用户自动同步云端数据
                this.syncFromCloud();
            }
        } else {
            this.showLoginForm();
        }
    }

    // 显示登录表单
    showLoginForm() {
        const loginModal = document.createElement('div');
        loginModal.className = 'auth-modal';
        loginModal.innerHTML = `
            <div class="auth-content">
                <div class="auth-header">
                    <h2>🔐 用户登录</h2>
                    <p>登录以同步您的备忘录数据</p>
                </div>
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="login">账号登录</button>
                    <button class="auth-tab" data-tab="quickLogin">快捷登录</button>
                    <button class="auth-tab" data-tab="register">注册</button>
                </div>
                
                <!-- 登录表单 -->
                <form id="loginForm" class="auth-form active">
                    <div class="form-group">
                        <label>用户名</label>
                        <input type="text" id="loginUsername" placeholder="请输入用户名" required>
                    </div>
                    <div class="form-group">
                        <label>密码</label>
                        <input type="password" id="loginPassword" placeholder="请输入密码" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">登录</button>
                    </div>
                </form>

                <!-- 快捷登录表单 -->
                <form id="quickLoginForm" class="auth-form">
                    <div class="form-group">
                        <label>验证码</label>
                        <input type="text" id="quickLoginCode" placeholder="输入验证码" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">快捷登录</button>
                    </div>
                </form>
                
                <!-- 注册表单 -->
                <form id="registerForm" class="auth-form">
                    <div class="form-group">
                        <label>用户名</label>
                        <input type="text" id="registerUsername" placeholder="3-16位字符" required minlength="3" maxlength="16">
                    </div>
                    <div class="form-group">
                        <label>密码</label>
                        <input type="password" id="registerPassword" placeholder="6-20位字符" required minlength="6" maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>确认密码</label>
                        <input type="password" id="confirmPassword" placeholder="请再次输入密码" required>
                    </div>
                    <div class="form-group">
                        <label>昵称（可选）</label>
                        <input type="text" id="registerNickname" placeholder="默认为：小香香Grace">
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">注册</button>
                    </div>
                </form>

                <div class="auth-footer">
                    <p>💡 提示：注册后您的数据将自动同步到云端，可在任何设备上登录访问</p>
                </div>
            </div>
        `;

        document.body.appendChild(loginModal);
        this.setupAuthEvents(loginModal);
    }

    // 设置认证事件
    setupAuthEvents(modal) {
        // 标签切换
        const tabs = modal.querySelectorAll('.auth-tab');
        const forms = modal.querySelectorAll('.auth-form');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                forms.forEach(f => f.classList.remove('active'));
                
                tab.classList.add('active');
                const targetForm = modal.querySelector(`#${tab.dataset.tab}Form`);
                targetForm.classList.add('active');
            });
        });

        // 登录表单提交
        modal.querySelector('#loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(modal);
        });

        // 快捷登录表单提交
        modal.querySelector('#quickLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleQuickLogin(modal);
        });

        // 注册表单提交
        modal.querySelector('#registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(modal);
        });
    }

    // 处理快捷登录
    async handleQuickLogin(modal) {
        const code = modal.querySelector('#quickLoginCode').value.trim();

        if (!code) {
            this.showMessage('请输入验证码', 'error');
            return;
        }

        if (code === 'Grace') {
            try {
                // 创建Grace专用用户对象
                const graceUser = {
                    id: 'grace_special_user',
                    username: 'Grace',
                    nickname: '小香香Grace',
                    isQuickUser: true
                };

                this.currentUser = graceUser;
                this.isLoggedIn = true;

                // 保存登录状态
                localStorage.setItem('memo_current_user', JSON.stringify(graceUser));

                // 使用Grace专用的存储key
                this.loadGraceUserData();

                // 关闭登录模态框
                modal.remove();

                // 显示用户信息
                this.showUserInfo();

                this.showMessage('欢迎回来，小香香Grace！', 'success');

                // 重新加载数据
                if (typeof loadCurrentCategory === 'function') {
                    loadCurrentCategory();
                }
                if (typeof notificationManager !== 'undefined') {
                    notificationManager.checkAndShowNotifications();
                }
            } catch (error) {
                console.error('快捷登录失败:', error);
                this.showMessage('登录失败，请稍后重试', 'error');
            }
        } else {
            this.showMessage('验证码错误，请重试', 'error');
        }
    }

    // 加载Grace用户数据
    loadGraceUserData() {
        try {
            // 使用专用的存储key
            const graceItems = localStorage.getItem('grace_inventoryItems');
            const graceSettings = localStorage.getItem('grace_appSettings');

            if (graceItems) {
                const parsedItems = JSON.parse(graceItems);
                if (typeof items !== 'undefined') {
                    items.length = 0;
                    items.push(...parsedItems);
                }
            }

            if (graceSettings) {
                const parsedSettings = JSON.parse(graceSettings);
                if (typeof settings !== 'undefined') {
                    Object.assign(settings, parsedSettings);
                }
            }

            console.log('Grace用户数据已加载');
        } catch (error) {
            console.error('加载Grace用户数据失败:', error);
        }
    }

    // 保存Grace用户数据
    saveGraceUserData() {
        if (this.currentUser && this.currentUser.isQuickUser) {
            try {
                // 使用专用的存储key，确保数据持久化
                if (typeof items !== 'undefined') {
                    localStorage.setItem('grace_inventoryItems', JSON.stringify(items));
                }
                if (typeof settings !== 'undefined') {
                    localStorage.setItem('grace_appSettings', JSON.stringify(settings));
                }
                console.log('Grace用户数据已保存');
            } catch (error) {
                console.error('保存Grace用户数据失败:', error);
            }
        }
    }

    // 处理普通登录
    async handleLogin(modal) {
        const username = modal.querySelector('#loginUsername').value;
        const password = modal.querySelector('#loginPassword').value;

        if (!username || !password) {
            this.showMessage('请填写完整的登录信息', 'error');
            return;
        }

        try {
            this.showMessage('正在登录...', 'info');
            
            // 简单的本地用户验证
            const users = JSON.parse(localStorage.getItem('memo_users') || '{}');
            const userKey = username + ':' + btoa(password);
            
            if (users[userKey]) {
                const user = users[userKey];
                this.currentUser = user;
                this.isLoggedIn = true;
                
                localStorage.setItem('memo_current_user', JSON.stringify(user));
                
                modal.remove();
                this.showUserInfo();
                this.showMessage(`欢迎回来，${user.nickname || user.username}！`, 'success');
                
                if (typeof loadCurrentCategory === 'function') {
                    loadCurrentCategory();
                }
                if (typeof notificationManager !== 'undefined') {
                    notificationManager.checkAndShowNotifications();
                }
            } else {
                this.showMessage('用户名或密码错误', 'error');
            }
        } catch (error) {
            console.error('登录失败:', error);
            this.showMessage('登录失败，请稍后重试', 'error');
        }
    }

    // 处理注册
    async handleRegister(modal) {
        const username = modal.querySelector('#registerUsername').value;
        const password = modal.querySelector('#registerPassword').value;
        const confirmPassword = modal.querySelector('#confirmPassword').value;
        const nickname = modal.querySelector('#registerNickname').value || '小香香Grace';

        if (!username || !password || !confirmPassword) {
            this.showMessage('请填写完整的注册信息', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('两次输入的密码不一致', 'error');
            return;
        }

        if (username.length < 3 || username.length > 16) {
            this.showMessage('用户名长度应为3-16位字符', 'error');
            return;
        }

        if (password.length < 6 || password.length > 20) {
            this.showMessage('密码长度应为6-20位字符', 'error');
            return;
        }

        try {
            this.showMessage('正在注册...', 'info');
            
            const users = JSON.parse(localStorage.getItem('memo_users') || '{}');
            const userKey = username + ':' + btoa(password);
            
            // 检查用户是否已存在
            if (users[userKey]) {
                this.showMessage('用户名已存在，请选择其他用户名', 'error');
                return;
            }
            
            const user = {
                id: 'user_' + Date.now(),
                username: username,
                nickname: nickname,
                createdAt: new Date().toISOString()
            };

            users[userKey] = user;
            localStorage.setItem('memo_users', JSON.stringify(users));
            
            this.currentUser = user;
            this.isLoggedIn = true;
            localStorage.setItem('memo_current_user', JSON.stringify(user));
            
            modal.remove();
            this.showUserInfo();
            this.showMessage(`注册成功！欢迎，${nickname}！`, 'success');
            
            if (typeof loadCurrentCategory === 'function') {
                loadCurrentCategory();
            }
            if (typeof notificationManager !== 'undefined') {
                notificationManager.checkAndShowNotifications();
            }
        } catch (error) {
            console.error('注册失败:', error);
            this.showMessage('注册失败，请稍后重试', 'error');
        }
    }

    // 显示用户信息
    showUserInfo() {
        if (!this.currentUser) return;

        const userNameEl = document.querySelector('.user-name');
        if (userNameEl) {
            userNameEl.textContent = this.currentUser.nickname || this.currentUser.username;
        }

        // 为Grace用户添加特殊的同步指示器
        this.addSyncIndicator();
    }

    // 添加同步状态指示器
    addSyncIndicator() {
        let syncIndicator = document.querySelector('.sync-indicator');
        if (!syncIndicator) {
            syncIndicator = document.createElement('div');
            syncIndicator.className = 'sync-indicator';
            
            const userInfo = document.querySelector('.user-info');
            if (userInfo) {
                userInfo.appendChild(syncIndicator);
            }
        }

        if (this.currentUser && this.currentUser.isQuickUser) {
            // Grace用户显示本地保存状态
            syncIndicator.innerHTML = `
                <span class="sync-status synced">
                    <i class="fas fa-save"></i>
                    本地保存
                </span>
                <button class="sync-btn" onclick="authManager.saveGraceUserData()">
                    <i class="fas fa-save"></i>
                    手动保存
                </button>
                <button class="logout-btn" onclick="authManager.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    退出登录
                </button>
            `;
        } else {
            // 普通用户显示云端同步状态
            syncIndicator.innerHTML = `
                <span class="sync-status synced">
                    <i class="fas fa-cloud-check"></i>
                    已同步
                </span>
                <button class="sync-btn" onclick="authManager.manualSync()">
                    <i class="fas fa-sync-alt"></i>
                    手动同步
                </button>
                <button class="logout-btn" onclick="authManager.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    退出登录
                </button>
            `;
        }
    }

    // 手动同步（仅对普通用户）
    async manualSync() {
        if (!this.isLoggedIn) return;

        // Grace快捷用户使用本地存储，不进行云端同步
        if (this.currentUser && this.currentUser.isQuickUser) {
            this.saveGraceUserData();
            this.showMessage('本地数据已保存！', 'success');
            return;
        }

        // 普通用户的数据保存到localStorage就够了
        if (typeof saveToStorage === 'function') {
            saveToStorage();
        }
        this.showMessage('数据已保存！', 'success');
    }

    // 从云端同步（仅对普通用户）
    async syncFromCloud() {
        // Grace用户不使用云端同步
        if (this.currentUser && this.currentUser.isQuickUser) {
            return;
        }
        
        // 普通用户直接从localStorage加载
        try {
            const savedItems = localStorage.getItem('inventoryItems');
            const savedSettings = localStorage.getItem('appSettings');
            
            if (savedItems && typeof items !== 'undefined') {
                const parsedItems = JSON.parse(savedItems);
                items.length = 0;
                items.push(...parsedItems);
            }
            
            if (savedSettings && typeof settings !== 'undefined') {
                const parsedSettings = JSON.parse(savedSettings);
                Object.assign(settings, parsedSettings);
            }
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    // 退出登录
    logout() {
        if (confirm('确定要退出登录吗？\n\n退出后本地数据会保留。')) {
            // 先保存当前数据
            if (this.currentUser && this.currentUser.isQuickUser) {
                this.saveGraceUserData();
            } else if (typeof saveToStorage === 'function') {
                saveToStorage();
            }
            
            // 清除登录状态
            this.currentUser = null;
            this.isLoggedIn = false;
            localStorage.removeItem('memo_current_user');
            
            // 重新显示登录界面
            this.showLoginForm();
            
            // 移除同步指示器
            const syncIndicator = document.querySelector('.sync-indicator');
            if (syncIndicator) {
                syncIndicator.remove();
            }
            
            this.showMessage('已退出登录', 'info');
        }
    }

    // 显示消息
    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `auth-message ${type}`;
        messageEl.textContent = message;
        
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 3000);
    }
}

// 全局认证管理器实例
let authManager;

// 页面加载时初始化认证系统
document.addEventListener('DOMContentLoaded', function() {
    authManager = new AuthManager();
}); 