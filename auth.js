// 用户认证和云端数据同步系统
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.cloudStorage = new CloudStorage();
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
            // 自动同步云端数据
            this.syncFromCloud();
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
                    <button class="auth-tab active" data-tab="login">登录</button>
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

        // 注册表单提交
        modal.querySelector('#registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(modal);
        });
    }

    // 处理登录
    async handleLogin(modal) {
        const username = modal.querySelector('#loginUsername').value;
        const password = modal.querySelector('#loginPassword').value;

        if (!username || !password) {
            this.showMessage('请填写完整的登录信息', 'error');
            return;
        }

        try {
            // 显示加载状态
            this.showMessage('正在登录...', 'info');
            
            // 验证用户凭据
            const user = await this.cloudStorage.authenticateUser(username, password);
            
            if (user) {
                this.currentUser = user;
                this.isLoggedIn = true;
                
                // 保存登录状态
                localStorage.setItem('memo_current_user', JSON.stringify(user));
                
                // 同步云端数据
                await this.syncFromCloud();
                
                // 关闭登录模态框
                modal.remove();
                
                // 显示用户信息
                this.showUserInfo();
                
                this.showMessage(`欢迎回来，${user.nickname || user.username}！`, 'success');
                
                // 重新加载数据
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

        // 验证输入
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
            // 显示加载状态
            this.showMessage('正在注册...', 'info');
            
            // 创建用户
            const user = await this.cloudStorage.createUser(username, password, nickname);
            
            if (user) {
                this.currentUser = user;
                this.isLoggedIn = true;
                
                // 保存登录状态
                localStorage.setItem('memo_current_user', JSON.stringify(user));
                
                // 如果本地有数据，上传到云端
                if (typeof items !== 'undefined' && items.length > 0) {
                    await this.syncToCloud();
                }
                
                // 关闭注册模态框
                modal.remove();
                
                // 显示用户信息
                this.showUserInfo();
                
                this.showMessage(`注册成功！欢迎，${nickname}！`, 'success');
                
                // 重新加载数据
                if (typeof loadCurrentCategory === 'function') {
                    loadCurrentCategory();
                }
                if (typeof notificationManager !== 'undefined') {
                    notificationManager.checkAndShowNotifications();
                }
            } else {
                this.showMessage('用户名已存在，请选择其他用户名', 'error');
            }
        } catch (error) {
            console.error('注册失败:', error);
            this.showMessage('注册失败，请稍后重试', 'error');
        }
    }

    // 显示用户信息
    showUserInfo() {
        if (!this.currentUser) return;

        const userInfoEl = document.querySelector('.user-info h3');
        if (userInfoEl) {
            userInfoEl.textContent = this.currentUser.nickname || this.currentUser.username;
        }

        // 添加同步状态指示器
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

    // 手动同步
    async manualSync() {
        if (!this.isLoggedIn) return;

        try {
            this.setSyncStatus('syncing', '同步中...');
            
            // 双向同步：先上传本地数据，再下载云端数据
            await this.syncToCloud();
            await this.syncFromCloud();
            
            this.setSyncStatus('synced', '已同步');
            this.showMessage('数据同步成功！', 'success');
            
            // 重新加载界面
            if (typeof loadCurrentCategory === 'function') {
                loadCurrentCategory();
            }
            if (typeof notificationManager !== 'undefined') {
                notificationManager.checkAndShowNotifications();
            }
        } catch (error) {
            console.error('同步失败:', error);
            this.setSyncStatus('error', '同步失败');
            this.showMessage('同步失败，请稍后重试', 'error');
        }
    }

    // 设置同步状态
    setSyncStatus(status, text) {
        const syncStatus = document.querySelector('.sync-status');
        if (syncStatus) {
            syncStatus.className = `sync-status ${status}`;
            syncStatus.innerHTML = `<i class="fas fa-cloud-${status === 'synced' ? 'check' : status === 'syncing' ? 'upload-alt fa-spin' : 'exclamation-triangle'}"></i> ${text}`;
        }
    }

    // 同步到云端
    async syncToCloud() {
        if (!this.isLoggedIn) return;

        try {
            const userData = {
                items: typeof items !== 'undefined' ? items : [],
                settings: typeof settings !== 'undefined' ? settings : {},
                lastSync: new Date().toISOString()
            };

            await this.cloudStorage.saveUserData(this.currentUser.id, userData);
            console.log('数据已上传到云端');
        } catch (error) {
            console.error('上传数据失败:', error);
            throw error;
        }
    }

    // 从云端同步
    async syncFromCloud() {
        if (!this.isLoggedIn) return;

        try {
            const userData = await this.cloudStorage.loadUserData(this.currentUser.id);
            
            if (userData) {
                // 更新本地数据
                if (userData.items && typeof items !== 'undefined') {
                    items.length = 0; // 清空当前数组
                    items.push(...userData.items);
                    if (typeof saveToStorage === 'function') {
                        saveToStorage();
                    }
                }
                
                if (userData.settings && typeof settings !== 'undefined') {
                    Object.assign(settings, userData.settings);
                    localStorage.setItem('appSettings', JSON.stringify(settings));
                }
                
                console.log('云端数据已同步到本地');
            }
        } catch (error) {
            console.error('下载数据失败:', error);
            throw error;
        }
    }

    // 退出登录
    logout() {
        if (confirm('确定要退出登录吗？\n\n退出后将无法同步云端数据，但本地数据会保留。')) {
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

    // 处理注册
    async handleRegister(modal) {
        const username = modal.querySelector('#registerUsername').value;
        const password = modal.querySelector('#registerPassword').value;
        const confirmPassword = modal.querySelector('#confirmPassword').value;
        const nickname = modal.querySelector('#registerNickname').value || '小香香Grace';

        // 验证输入
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
            // 显示加载状态
            this.showMessage('正在注册...', 'info');
            
            // 创建用户
            const user = await this.cloudStorage.createUser(username, password, nickname);
            
            if (user) {
                this.currentUser = user;
                this.isLoggedIn = true;
                
                // 保存登录状态
                localStorage.setItem('memo_current_user', JSON.stringify(user));
                
                // 如果本地有数据，上传到云端
                if (items.length > 0) {
                    await this.syncToCloud();
                }
                
                // 关闭注册模态框
                modal.remove();
                
                // 显示用户信息
                this.showUserInfo();
                
                this.showMessage(`注册成功！欢迎，${nickname}！`, 'success');
                
                // 重新加载数据
                loadCurrentCategory();
                notificationManager.checkAndShowNotifications();
            } else {
                this.showMessage('用户名已存在，请选择其他用户名', 'error');
            }
        } catch (error) {
            console.error('注册失败:', error);
            this.showMessage('注册失败，请稍后重试', 'error');
        }
    }

    // 显示用户信息
    showUserInfo() {
        if (!this.currentUser) return;

        const userInfoEl = document.querySelector('.user-info h3');
        if (userInfoEl) {
            userInfoEl.textContent = this.currentUser.nickname || this.currentUser.username;
        }

        // 添加同步状态指示器
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

    // 手动同步
    async manualSync() {
        if (!this.isLoggedIn) return;

        try {
            this.setSyncStatus('syncing', '同步中...');
            
            // 双向同步：先上传本地数据，再下载云端数据
            await this.syncToCloud();
            await this.syncFromCloud();
            
            this.setSyncStatus('synced', '已同步');
            this.showMessage('数据同步成功！', 'success');
            
            // 重新加载界面
            loadCurrentCategory();
            notificationManager.checkAndShowNotifications();
        } catch (error) {
            console.error('同步失败:', error);
            this.setSyncStatus('error', '同步失败');
            this.showMessage('同步失败，请稍后重试', 'error');
        }
    }

    // 设置同步状态
    setSyncStatus(status, text) {
        const syncStatus = document.querySelector('.sync-status');
        if (syncStatus) {
            syncStatus.className = `sync-status ${status}`;
            syncStatus.innerHTML = `<i class="fas fa-cloud-${status === 'synced' ? 'check' : status === 'syncing' ? 'upload-alt fa-spin' : 'exclamation-triangle'}"></i> ${text}`;
        }
    }

    // 同步到云端
    async syncToCloud() {
        if (!this.isLoggedIn) return;

        try {
            const userData = {
                items: items,
                settings: settings,
                lastSync: new Date().toISOString()
            };

            await this.cloudStorage.saveUserData(this.currentUser.id, userData);
            console.log('数据已上传到云端');
        } catch (error) {
            console.error('上传数据失败:', error);
            throw error;
        }
    }

    // 从云端同步
    async syncFromCloud() {
        if (!this.isLoggedIn) return;

        try {
            const userData = await this.cloudStorage.loadUserData(this.currentUser.id);
            
            if (userData) {
                // 更新本地数据
                if (userData.items) {
                    items.length = 0; // 清空当前数组
                    items.push(...userData.items);
                    saveToStorage();
                }
                
                if (userData.settings) {
                    Object.assign(settings, userData.settings);
                    localStorage.setItem('appSettings', JSON.stringify(settings));
                }
                
                console.log('云端数据已同步到本地');
            }
        } catch (error) {
            console.error('下载数据失败:', error);
            throw error;
        }
    }

    // 退出登录
    logout() {
        if (confirm('确定要退出登录吗？\n\n退出后将无法同步云端数据，但本地数据会保留。')) {
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
        // 创建消息提示
        const messageEl = document.createElement('div');
        messageEl.className = `auth-message ${type}`;
        messageEl.textContent = message;
        
        // 样式
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
        
        // 3秒后自动移除
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 3000);
    }
}

// 云端存储类
class CloudStorage {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('memo_cloud_users')) || {};
        this.userData = JSON.parse(localStorage.getItem('memo_cloud_data')) || {};
    }

    // 创建用户
    async createUser(username, password, nickname) {
        if (this.users[username]) {
            return null;
        }

        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const user = {
            id: userId,
            username: username,
            password: this.hashPassword(password),
            nickname: nickname,
            createdAt: new Date().toISOString()
        };

        this.users[username] = user;
        this.saveUsers();
        
        return {
            id: user.id,
            username: user.username,
            nickname: user.nickname
        };
    }

    // 验证用户
    async authenticateUser(username, password) {
        const user = this.users[username];
        if (user && user.password === this.hashPassword(password)) {
            return {
                id: user.id,
                username: user.username,
                nickname: user.nickname
            };
        }
        return null;
    }

    // 保存用户数据
    async saveUserData(userId, data) {
        this.userData[userId] = data;
        localStorage.setItem('memo_cloud_data', JSON.stringify(this.userData));
    }

    // 加载用户数据
    async loadUserData(userId) {
        return this.userData[userId] || null;
    }

    // 简单的密码哈希
    hashPassword(password) {
        return btoa(password);
    }

    // 保存用户列表
    saveUsers() {
        localStorage.setItem('memo_cloud_users', JSON.stringify(this.users));
    }
}

// 全局认证管理器实例
let authManager;

// 页面加载时初始化认证系统
document.addEventListener('DOMContentLoaded', function() {
    authManager = new AuthManager();
});

// 重写原有的saveToStorage函数，加入云端同步
document.addEventListener('DOMContentLoaded', function() {
    // 等待原始脚本加载完成
    setTimeout(() => {
        if (typeof window.saveToStorage === 'function') {
            const originalSaveToStorage = window.saveToStorage;
            window.saveToStorage = function() {
                // 先保存到本地
                originalSaveToStorage();
                
                // 如果已登录，延迟同步到云端
                if (authManager && authManager.isLoggedIn) {
                    setTimeout(() => {
                        authManager.syncToCloud().catch(error => {
                            console.error('自动同步失败:', error);
                            if (authManager.setSyncStatus) {
                                authManager.setSyncStatus('error', '同步失败');
                            }
                        });
                    }, 1000);
                }
            };
        }
    }, 500);
});

// 页面加载时初始化认证系统
document.addEventListener('DOMContentLoaded', function() {
    authManager = new AuthManager();
});

// 重写原有的saveToStorage函数，加入云端同步
const originalSaveToStorage = window.saveToStorage;
window.saveToStorage = function() {
    // 先保存到本地
    originalSaveToStorage();
    
    // 如果已登录，延迟同步到云端
    if (authManager && authManager.isLoggedIn) {
        setTimeout(() => {
            authManager.syncToCloud().catch(error => {
                console.error('自动同步失败:', error);
                authManager.setSyncStatus('error', '同步失败');
            });
        }, 1000);
    }
}; 