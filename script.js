// PWA Service Worker注册
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Global variables
let items = JSON.parse(localStorage.getItem('inventoryItems')) || [];
let currentCategory = 'all-summary';
let editingItemId = null;
let currentSearchQuery = '';
let settings = JSON.parse(localStorage.getItem('appSettings')) || {
    enableNotifications: true
};

// Notification System
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notificationsContainer');
        this.notifications = new Map(); // Track notifications by item ID
        this.maxVisible = 2; // 默认显示2条通知
        this.showingAll = false; // 当前是否显示全部
    }

    show(id, type, title, message, icon = '⚠️') {
        // Remove existing notification for this item if it exists
        if (this.notifications.has(id)) {
            this.hide(id);
        }

        const notification = document.createElement('div');
        notification.className = `notification-item ${type}`;
        notification.dataset.id = id;
        
        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="notificationManager.hide('${id}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.container.appendChild(notification);
        this.notifications.set(id, notification);
    }

    showCombined(id, type, title, details, icon = '⚠️') {
        // Remove existing notification for this item if it exists
        if (this.notifications.has(id)) {
            this.hide(id);
        }

        const notification = document.createElement('div');
        notification.className = `notification-item ${type}`;
        notification.dataset.id = id;
        
        notification.innerHTML = `
            <div class="notification-main">
                <div class="notification-icon">${icon}</div>
                <div class="notification-content">
                    <div class="notification-title">${title}</div>
                </div>
                <button class="notification-close" onclick="notificationManager.hide('${id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-details">${details.replace(/\n/g, '<br>')}</div>
        `;
        
        // 添加点击展开/收起功能
        notification.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-close')) {
                notification.classList.toggle('expanded');
            }
        });

        this.container.appendChild(notification);
        this.notifications.set(id, notification);
    }

    hide(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.style.animation = 'slideOutToTop 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
                // 更新显示状态
                this.updateNotificationDisplay();
            }, 300);
        }
    }

    clear() {
        this.container.innerHTML = '';
        this.notifications.clear();
        this.showingAll = false;
    }

    // 更新通知显示状态
    updateNotificationDisplay() {
        const allNotifications = Array.from(this.container.querySelectorAll('.notification-item:not(.toggle-btn)'));
        const totalCount = allNotifications.length;
        
        // 移除之前的切换按钮
        const existingToggle = this.container.querySelector('.notification-toggle');
        if (existingToggle) {
            existingToggle.remove();
        }
        
        if (totalCount <= this.maxVisible) {
            // 如果通知数量不超过限制，全部显示
            allNotifications.forEach(notification => {
                notification.style.display = 'flex';
            });
            return;
        }
        
        // 显示/隐藏通知
        allNotifications.forEach((notification, index) => {
            if (this.showingAll || index < this.maxVisible) {
                notification.style.display = 'flex';
            } else {
                notification.style.display = 'none';
            }
        });
        
        // 添加展开/收起按钮
        this.addToggleButton(totalCount);
    }

    // 添加展开/收起按钮
    addToggleButton(totalCount) {
        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'notification-toggle';
        
        if (this.showingAll) {
            toggleBtn.innerHTML = `
                <div class="toggle-content">
                    <span>收起通知</span>
                    <i class="fas fa-chevron-up"></i>
                </div>
            `;
        } else {
            const hiddenCount = totalCount - this.maxVisible;
            toggleBtn.innerHTML = `
                <div class="toggle-content">
                    <span>显示更多 (还有${hiddenCount}条)</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
            `;
        }
        
        toggleBtn.addEventListener('click', () => {
            this.showingAll = !this.showingAll;
            this.updateNotificationDisplay();
        });
        
        this.container.appendChild(toggleBtn);
    }

    // Check all items and show relevant notifications
    checkAndShowNotifications() {
        if (!settings.enableNotifications) return;

        // Clear existing notifications first
        this.clear();

        const today = new Date();

        items.forEach(item => {
            let notifications = [];
            
            // 只对有保质期的物品进行过期检查
            if (item.expiry) {
                const expiryDate = new Date(item.expiry);
                const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                const itemWarningDays = item.expiryWarningDays || 7;

                // Check for expired items
                if (expiryDate < today) {
                    notifications.push({
                        type: 'error',
                        title: '已过期',
                        message: `该物品已于 ${formatDate(item.expiry)} 过期，请及时处理`,
                        icon: '🚨'
                    });
                }
                // Check for expiring items
                else if (itemWarningDays === 0 ? daysUntilExpiry === 0 : daysUntilExpiry <= itemWarningDays) {
                    const warningMessage = daysUntilExpiry === 0 ? '今天过期' : `还有 ${daysUntilExpiry} 天过期（${formatDate(item.expiry)}）`;
                    notifications.push({
                        type: 'warning',
                        title: daysUntilExpiry === 0 ? '今天过期' : '即将过期',
                        message: warningMessage,
                        icon: '⏰'
                    });
                }
            }

            // Check for low stock
            // 当阈值为0时，只有库存为0时才提醒；当阈值大于0时，库存小于等于阈值时提醒
            if ((item.threshold === 0 && item.quantity === 0) || (item.threshold > 0 && item.quantity <= item.threshold)) {
                const stockMessage = item.quantity === 0 ? '已用完，请及时补货' : `当前库存：${item.quantity} ${item.unit}，建议补货`;
                notifications.push({
                    type: 'warning',
                    title: item.quantity === 0 ? '库存已用完' : '库存不足',
                    message: stockMessage,
                    icon: '📦'
                });
            }

            // 合并同一物品的通知
            if (notifications.length > 0) {
                const mainNotification = notifications[0];
                const hasMultiple = notifications.length > 1;
                
                let title = `${item.name} ${mainNotification.title}`;
                if (hasMultiple) {
                    title += ` +${notifications.length - 1}`;
                }
                
                let details = notifications.map(n => n.message).join('\n');
                
                this.showCombined(
                    `combined-${item.id}`,
                    mainNotification.type,
                    title,
                    details,
                    mainNotification.icon
                );
            }
        });

        // 更新通知显示状态
        this.updateNotificationDisplay();
    }
}

// Initialize notification manager
const notificationManager = new NotificationManager();

// Add CSS for slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutToTop {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(-20px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Predefined items for quick selection
const presetItems = {
    'food-fresh': [
        { name: '牛奶', unit: '盒', threshold: 2, defaultExpiry: 7, quantity: 1, expiryWarningDays: 2 },
        { name: '鸡蛋', unit: '打', threshold: 1, defaultExpiry: 14, quantity: 1, expiryWarningDays: 3 },
        { name: '面包', unit: '袋', threshold: 1, defaultExpiry: 3, quantity: 1, expiryWarningDays: 1 },
        { name: '蔬菜沙拉', unit: '盒', threshold: 1, defaultExpiry: 2, quantity: 1 },
        { name: '酸奶', unit: '杯', threshold: 3, defaultExpiry: 10, quantity: 4 },
        { name: '水果', unit: '斤', threshold: 1, defaultExpiry: 5, quantity: 2 },
        { name: '豆腐', unit: '盒', threshold: 1, defaultExpiry: 3, quantity: 1 },
        { name: '肉类', unit: '斤', threshold: 1, defaultExpiry: 2, quantity: 1 },
        { name: '鱼类', unit: '条', threshold: 1, defaultExpiry: 1, quantity: 1 },
        { name: '蔬菜', unit: '斤', threshold: 2, defaultExpiry: 3, quantity: 2 },
        { name: '葱姜蒜', unit: '份', threshold: 1, defaultExpiry: 7, quantity: 1 },
        { name: '香菇', unit: '斤', threshold: 1, defaultExpiry: 5, quantity: 1 }
    ],
    'food-packaged': [
        { name: '方便面', unit: '包', threshold: 5, defaultExpiry: 180, quantity: 10 },
        { name: '饼干', unit: '盒', threshold: 2, defaultExpiry: 90, quantity: 3 },
        { name: '罐头', unit: '罐', threshold: 3, defaultExpiry: 365, quantity: 5 },
        { name: '咖啡', unit: '包', threshold: 1, defaultExpiry: 180, quantity: 2 },
        { name: '茶叶', unit: '盒', threshold: 1, defaultExpiry: 365, quantity: 1 },
        { name: '坚果', unit: '袋', threshold: 2, defaultExpiry: 120, quantity: 3 },
        { name: '薯片', unit: '袋', threshold: 3, defaultExpiry: 60, quantity: 5 },
        { name: '巧克力', unit: '块', threshold: 2, defaultExpiry: 180, quantity: 3 },
        { name: '糖果', unit: '袋', threshold: 2, defaultExpiry: 365, quantity: 2 },
        { name: '蜂蜜', unit: '瓶', threshold: 1, defaultExpiry: 730, quantity: 1 },
        { name: '调料包', unit: '包', threshold: 5, defaultExpiry: 365, quantity: 10 }
    ],
    'food-frozen': [
        { name: '冷冻饺子', unit: '袋', threshold: 2, defaultExpiry: 90, quantity: 3 },
        { name: '冷冻蔬菜', unit: '袋', threshold: 3, defaultExpiry: 180, quantity: 5 },
        { name: '冰淇淋', unit: '盒', threshold: 2, defaultExpiry: 365, quantity: 3 },
        { name: '冷冻肉类', unit: '袋', threshold: 2, defaultExpiry: 90, quantity: 2 },
        { name: '冷冻海鲜', unit: '袋', threshold: 1, defaultExpiry: 180, quantity: 2 },
        { name: '冷冻面食', unit: '袋', threshold: 2, defaultExpiry: 90, quantity: 3 }
    ],
    'food-drinks': [
        { name: '矿泉水', unit: '瓶', threshold: 10, defaultExpiry: 365, quantity: 24 },
        { name: '果汁', unit: '瓶', threshold: 3, defaultExpiry: 30, quantity: 6 },
        { name: '碳酸饮料', unit: '瓶', threshold: 5, defaultExpiry: 180, quantity: 8 },
        { name: '茶饮料', unit: '瓶', threshold: 3, defaultExpiry: 90, quantity: 6 },
        { name: '能量饮料', unit: '罐', threshold: 2, defaultExpiry: 365, quantity: 4 },
        { name: '牛奶饮品', unit: '盒', threshold: 5, defaultExpiry: 14, quantity: 8 }
    ],
    'skincare': [
        { name: '洁面乳', unit: '支', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '爽肤水', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '乳液', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '面霜', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '眼霜', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '防晒霜', unit: '支', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '面膜', unit: '片', threshold: 5, defaultExpiry: 1095, quantity: 10 },
        { name: '精华液', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '卸妆油', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 }
    ],
    'cosmetics': [
        { name: '口红', unit: '支', threshold: 2, defaultExpiry: 1095, quantity: 3 },
        { name: '粉底液', unit: '瓶', threshold: 1, defaultExpiry: 730, quantity: 1 },
        { name: '眼影盘', unit: '盒', threshold: 1, defaultExpiry: 1095, quantity: 2 },
        { name: '睫毛膏', unit: '支', threshold: 1, defaultExpiry: 365, quantity: 1 },
        { name: '眉笔', unit: '支', threshold: 1, defaultExpiry: 730, quantity: 2 },
        { name: '腮红', unit: '盒', threshold: 1, defaultExpiry: 1095, quantity: 1 }
    ],
    'hygiene': [
        { name: '牙刷', unit: '支', threshold: 2, defaultExpiry: 1095, quantity: 4 },
        { name: '牙膏', unit: '支', threshold: 1, defaultExpiry: 1095, quantity: 2 },
        { name: '洗发水', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '沐浴露', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '漱口水', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 }
    ],
    'daily-necessities': [
        { name: '安睡裤', unit: '包', threshold: 2, defaultExpiry: 1095, quantity: 3 },
        { name: '洗衣液', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 2 },
        { name: '洗洁精', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '垃圾袋', unit: '卷', threshold: 2, defaultExpiry: 1095, quantity: 3 },
        { name: '保鲜膜', unit: '卷', threshold: 1, defaultExpiry: 1095, quantity: 2 },
        { name: '铝箔纸', unit: '卷', threshold: 1, defaultExpiry: 1095, quantity: 1 }
    ],
    'cleaning': [
        { name: '地板清洁剂', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '玻璃清洁剂', unit: '瓶', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '消毒液', unit: '瓶', threshold: 1, defaultExpiry: 730, quantity: 2 },
        { name: '漂白剂', unit: '瓶', threshold: 1, defaultExpiry: 730, quantity: 1 }
    ],
    'paper-products': [
        { name: '卫生纸', unit: '提', threshold: 2, defaultExpiry: 1095, quantity: 3 },
        { name: '抽纸', unit: '盒', threshold: 5, defaultExpiry: 1095, quantity: 8 },
        { name: '湿巾', unit: '包', threshold: 3, defaultExpiry: 730, quantity: 5 },
        { name: '厨房纸', unit: '卷', threshold: 3, defaultExpiry: 1095, quantity: 6 }
    ],
    'medicine': [
        { name: '维生素', unit: '瓶', threshold: 1, defaultExpiry: 730, quantity: 1 },
        { name: '感冒药', unit: '盒', threshold: 1, defaultExpiry: 1095, quantity: 2 },
        { name: '止痛药', unit: '盒', threshold: 1, defaultExpiry: 1095, quantity: 1 },
        { name: '创可贴', unit: '盒', threshold: 1, defaultExpiry: 1095, quantity: 2 }
    ],
    'electronics': [
        { name: '电池', unit: '节', threshold: 4, defaultExpiry: 1095, quantity: 8 },
        { name: '充电器', unit: '个', threshold: 1, defaultExpiry: 1095, quantity: 2 },
        { name: '数据线', unit: '根', threshold: 2, defaultExpiry: 1095, quantity: 3 }
    ],
    'stationery': [
        { name: '笔记本', unit: '本', threshold: 2, defaultExpiry: 1095, quantity: 5 },
        { name: '笔', unit: '支', threshold: 5, defaultExpiry: 1095, quantity: 10 },
        { name: '橡皮', unit: '块', threshold: 2, defaultExpiry: 1095, quantity: 3 }
    ],
    'others': [
        { name: '其他物品', unit: '个', threshold: 1, defaultExpiry: 365, quantity: 1 }
    ]
};

// Category names mapping
const categoryNames = {
    'food-fresh': '新鲜食品',
    'food-packaged': '包装食品',
    'food-frozen': '冷冻食品',
    'food-drinks': '饮品',
    'skincare': '护肤品',
    'cosmetics': '化妆品',
    'hygiene': '清洁用品',
    'daily-necessities': '日常必需',
    'cleaning': '清洁用品',
    'paper-products': '纸制品',
    'medicine': '药品保健',
    'electronics': '电子用品',
    'stationery': '文具用品',
    'others': '其他物品'
};

// DOM elements
const categoryTitle = document.getElementById('categoryTitle');
const totalItems = document.getElementById('totalItems');
const alertItems = document.getElementById('alertItems');
const itemsGrid = document.getElementById('itemsGrid');
const emptyState = document.getElementById('emptyState');
const itemModal = document.getElementById('itemModal');
const settingsModal = document.getElementById('settingsModal');
const itemForm = document.getElementById('itemForm');
const quickSelectGrid = document.getElementById('quickSelectGrid');
const navButtons = document.querySelectorAll('.nav-btn');

// PWA版本管理
const APP_VERSION = '1.2.0';
const CACHE_BUST_PARAM = `?v=${APP_VERSION}&t=${Date.now()}`;

// 检查并显示版本信息
function initVersionInfo() {
    // 在页面底部显示版本信息
    const versionDiv = document.createElement('div');
    versionDiv.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: rgba(0,0,0,0.1);
        color: #666;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        z-index: 1000;
        cursor: pointer;
    `;
    versionDiv.textContent = `v${APP_VERSION}`;
    versionDiv.title = '点击检查更新';
    versionDiv.onclick = checkForUpdates;
    document.body.appendChild(versionDiv);
}

// 检查更新功能
function checkForUpdates() {
    if (confirm('检查应用更新？\n\n这将重新加载应用并获取最新内容。')) {
        // 添加缓存破坏参数强制重新加载
        window.location.href = window.location.href.split('?')[0] + CACHE_BUST_PARAM;
    }
}

// iOS PWA检测
function isIOSPWA() {
    return window.navigator.standalone === true;
}

// iOS Safari添加到主屏幕提示
function showIOSInstallPrompt() {
    // 检查是否为iOS设备且不是PWA模式
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isNotPWA = window.navigator.standalone !== true;
    
    if (isIOS && isNotPWA && !localStorage.getItem('ios-install-prompted')) {
        setTimeout(() => {
            const shouldPrompt = confirm(
                '📱 添加到主屏幕\n\n' +
                '为了获得最佳体验，建议将此应用添加到主屏幕！\n\n' +
                '操作步骤：\n' +
                '1. 点击底部分享按钮 📤\n' +
                '2. 选择"添加到主屏幕" ➕\n' +
                '3. 点击"添加"完成安装\n\n' +
                '是否查看详细安装指南？'
            );
            
            if (shouldPrompt) {
                // 可以跳转到安装指南页面
                alert('请按照以下步骤操作：\n\n1. 点击Safari底部的分享按钮\n2. 向下滚动找到"添加到主屏幕"\n3. 点击添加完成安装');
            }
            
            localStorage.setItem('ios-install-prompted', 'true');
        }, 3000); // 3秒后显示提示
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // 确保默认选择汇总视图
    currentCategory = 'all-summary';
    loadSummaryView();
    updateStats();
    setupEventListeners();
    loadSettings();
    
    // 确保汇总按钮是激活状态
    navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === 'all-summary') {
            btn.classList.add('active');
        }
    });
    
    // Check notifications after a short delay to ensure DOM is ready
    setTimeout(() => {
        notificationManager.checkAndShowNotifications();
    }, 500);

    initVersionInfo();
    
    // 如果是iOS设备，显示安装提示
    showIOSInstallPrompt();
    
    // 如果是PWA模式，显示欢迎信息
    if (isIOSPWA()) {
        console.log('🎉 PWA模式运行中');
    }
});

function setupEventListeners() {
    // Navigation
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            
                if (currentCategory === 'all-summary') {
        loadSummaryView();
    } else {
        loadCurrentCategory();
    }
    
    // 总是更新汇总统计
    updateSummaryStats();
        });
    });

    // Modal controls
    document.getElementById('addItemBtn').addEventListener('click', openAddModal);
    document.getElementById('closeModal').addEventListener('click', closeItemModal);
    document.getElementById('cancelBtn').addEventListener('click', closeItemModal);
    document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
    document.getElementById('closeSettingsModal').addEventListener('click', closeSettingsModal);

    // Form submission
    itemForm.addEventListener('submit', saveItem);
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('resetSettings').addEventListener('click', resetSettings);

    // Close modals when clicking outside
    [itemModal, settingsModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (modal === itemModal) closeItemModal();
                if (modal === settingsModal) closeSettingsModal();
            }
        });
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearSearch();
            }
        });
    }
    
    if (searchClear) {
        searchClear.addEventListener('click', clearSearch);
    }
}

function loadCurrentCategory() {
    let categoryItems = items.filter(item => item.category === currentCategory);
    
    // Apply search filter if there's a search query
    if (currentSearchQuery) {
        categoryItems = filterItems(categoryItems, currentSearchQuery);
    }
    
    categoryTitle.textContent = categoryNames[currentCategory];
    
    if (categoryItems.length === 0) {
        itemsGrid.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        itemsGrid.style.display = 'grid';
        emptyState.style.display = 'none';
        renderItems(categoryItems);
    }
    
    updateStats();
}

function renderItems(itemsToRender) {
    itemsGrid.innerHTML = '';
    
    itemsToRender.forEach(item => {
        const itemCard = createItemCard(item);
        itemsGrid.appendChild(itemCard);
    });
}

function createItemCard(item) {
    const today = new Date();
    let statusClass = '';
    let statusBadge = '';
    let expiryClass = '';
    let expiryText = '';
    let daysUntilExpiry = 0;
    
    // 处理保质期逻辑
    if (item.expiry) {
        const expiryDate = new Date(item.expiry);
        daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        const itemExpiryWarningDays = item.expiryWarningDays || 7;
        
        if (expiryDate < today) {
            statusClass = 'alert';
            statusBadge = '<div class="status-badge expired">已过期</div>';
            expiryClass = 'expired';
        } else if (daysUntilExpiry <= itemExpiryWarningDays) {
            statusClass = 'warning';
            statusBadge = '<div class="status-badge expiring">即将过期</div>';
            expiryClass = 'warning';
        }
        
        expiryText = `保质期：${formatDate(item.expiry)} ${daysUntilExpiry > 0 ? `(${daysUntilExpiry}天)` : ''}`;
    } else {
        expiryText = '无保质期限制';
    }
    
    // 检查库存不足
    if ((item.threshold === 0 && item.quantity === 0) || (item.threshold > 0 && item.quantity <= item.threshold)) {
        const stockLabel = item.quantity === 0 ? '库存已用完' : '库存不足';
        if (!statusClass) {
            statusClass = 'warning';
            statusBadge = `<div class="status-badge low-stock">${stockLabel}</div>`;
        } else {
            statusBadge += `<div class="status-badge low-stock">${stockLabel}</div>`;
        }
    }
    
    const card = document.createElement('div');
    card.className = `item-card ${statusClass}`;
    card.innerHTML = `
        ${statusBadge}
        <div class="item-header">
            <h3 class="item-name">${item.name}</h3>
            <div class="item-actions" id="actions-${item.id}">
                <button class="action-btn edit" onclick="openEditModal('${item.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteItem('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="item-details">
            <div class="item-detail">
                <i class="fas fa-boxes"></i>
                <span>数量：<span class="item-quantity">${item.quantity} ${item.unit}</span></span>
                <div class="quantity-controls">
                    <button class="quantity-btn decrease" onclick="adjustQuantity('${item.id}', -1)" title="减少库存">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="quantity-btn increase" onclick="adjustQuantity('${item.id}', 1)" title="增加库存">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div class="item-detail">
                <i class="fas fa-calendar-alt"></i>
                <span class="item-expiry ${expiryClass}">
                    ${expiryText}
                </span>
            </div>
            <div class="item-detail">
                <i class="fas fa-exclamation-triangle"></i>
                <span>库存阈值：${item.threshold === 0 ? '用完时提醒' : `${item.threshold} ${item.unit}`}</span>
            </div>
            ${item.location ? `<div class="item-detail">
                <i class="fas fa-map-marker-alt"></i>
                <span>存放地点：${item.location}</span>
            </div>` : ''}
        </div>
    `;
    
    // 添加移动端点击事件
    card.addEventListener('click', function(e) {
        // 如果点击的是按钮，不触发卡片点击事件
        if (e.target.closest('.action-btn') || e.target.closest('.quantity-btn')) {
            return;
        }
        
        // 在移动设备上切换操作按钮的显示状态
        if (window.innerWidth <= 768) {
            toggleMobileActions(item.id);
        }
    });
    
    return card;
}

function updateStats() {
    if (currentCategory === 'all-summary') {
        updateSummaryStats();
        return;
    }
    
    const categoryItems = items.filter(item => item.category === currentCategory);
    const today = new Date();
    
    const alertCount = categoryItems.filter(item => {
        // 库存不足检查
        if ((item.threshold === 0 && item.quantity === 0) || (item.threshold > 0 && item.quantity <= item.threshold)) {
            return true;
        }
        
        // 只对有保质期的物品进行过期检查
        if (item.expiry) {
            const expiryDate = new Date(item.expiry);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            const itemWarningDays = item.expiryWarningDays || 7;
            
            // 已过期或即将过期
            if (expiryDate < today || (itemWarningDays === 0 ? daysUntilExpiry === 0 : daysUntilExpiry <= itemWarningDays)) {
                return true;
            }
        }
        
        return false;
    }).length;
    
    totalItems.textContent = categoryItems.length;
    alertItems.textContent = alertCount;
    
    // 同时更新汇总统计
    updateSummaryStats();
}

function loadSummaryView() {
    let itemsToShow = items;
    
    // Apply search filter if there's a search query
    if (currentSearchQuery) {
        itemsToShow = filterItems(items, currentSearchQuery);
    }
    
    categoryTitle.textContent = '全部物品汇总';
    
    if (itemsToShow.length === 0) {
        itemsGrid.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        itemsGrid.style.display = 'grid';
        emptyState.style.display = 'none';
        renderItems(itemsToShow);
    }
    
    updateSummaryStats();
}

function updateSummaryStats() {
    const today = new Date();
    
    const totalCount = items.length;
    const alertCount = items.filter(item => {
        // 库存不足检查
        if ((item.threshold === 0 && item.quantity === 0) || (item.threshold > 0 && item.quantity <= item.threshold)) {
            return true;
        }
        
        // 只对有保质期的物品进行过期检查
        if (item.expiry) {
            const expiryDate = new Date(item.expiry);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            const itemWarningDays = item.expiryWarningDays || 7;
            
            // 已过期或即将过期
            if (expiryDate < today || (itemWarningDays === 0 ? daysUntilExpiry === 0 : daysUntilExpiry <= itemWarningDays)) {
                return true;
            }
        }
        
        return false;
    }).length;
    
    // 更新汇总标签的统计
    const summaryTotal = document.getElementById('summaryTotal');
    const summaryAlert = document.getElementById('summaryAlert');
    
    if (summaryTotal) summaryTotal.textContent = totalCount;
    if (summaryAlert) summaryAlert.textContent = alertCount;
    
    // 如果当前在汇总视图，也更新主要统计
    if (currentCategory === 'all-summary') {
        totalItems.textContent = totalCount;
        alertItems.textContent = alertCount;
    }
}

function openAddModal() {
    editingItemId = null;
    document.getElementById('modalTitle').textContent = '添加物品';
    document.getElementById('saveBtn').textContent = '保存';
    itemForm.reset();
    
    // 如果当前是汇总视图，默认选择第一个分类
    const defaultCategory = currentCategory === 'all-summary' ? 'food-fresh' : currentCategory;
    document.getElementById('itemCategory').value = defaultCategory;
    
    loadQuickSelectItems();
    itemModal.classList.add('active');
}

function openEditModal(itemId) {
    editingItemId = itemId;
    const item = items.find(i => i.id === itemId);
    
    document.getElementById('modalTitle').textContent = '编辑物品';
    document.getElementById('saveBtn').textContent = '更新';
    
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemQuantity').value = item.quantity;
    document.getElementById('itemUnit').value = item.unit;
    document.getElementById('itemExpiry').value = item.expiry || '';
    document.getElementById('itemThreshold').value = item.threshold;
    document.getElementById('itemExpiryWarningDays').value = item.expiryWarningDays !== null ? item.expiryWarningDays : '';
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemLocation').value = item.location || '';
    
    loadQuickSelectItems();
    itemModal.classList.add('active');
}

function closeItemModal() {
    itemModal.classList.remove('active');
    editingItemId = null;
}

function loadQuickSelectItems() {
    const category = document.getElementById('itemCategory').value;
    const preset = presetItems[category] || [];
    
    quickSelectGrid.innerHTML = '';
    
    preset.forEach(item => {
        const quickItem = document.createElement('div');
        quickItem.className = 'quick-select-item';
        quickItem.textContent = item.name;
        quickItem.addEventListener('click', () => {
            selectQuickItem(item);
            quickSelectGrid.querySelectorAll('.quick-select-item').forEach(q => q.classList.remove('selected'));
            quickItem.classList.add('selected');
        });
        quickSelectGrid.appendChild(quickItem);
    });
}

function selectQuickItem(presetItem) {
    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(today.getDate() + presetItem.defaultExpiry);
    
    document.getElementById('itemName').value = presetItem.name;
    document.getElementById('itemUnit').value = presetItem.unit;
    document.getElementById('itemThreshold').value = presetItem.threshold;
    document.getElementById('itemExpiryWarningDays').value = presetItem.expiryWarningDays || 7;
    document.getElementById('itemExpiry').value = formatDateForInput(expiryDate);
    document.getElementById('itemQuantity').value = presetItem.quantity;
}

function saveItem(e) {
    e.preventDefault();
    
    const name = document.getElementById('itemName').value.trim();
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const unit = document.getElementById('itemUnit').value.trim();
    const expiry = document.getElementById('itemExpiry').value;
    const thresholdInput = document.getElementById('itemThreshold').value;
    const warningDaysInput = document.getElementById('itemExpiryWarningDays').value;
    const category = document.getElementById('itemCategory').value;
    const location = document.getElementById('itemLocation').value.trim();
    
    // 验证必填字段
    if (!name || isNaN(quantity) || !unit || !category) {
        alert('请填写所有必填字段（物品名称、数量、单位、分类）');
        return;
    }
    
    // 处理库存阈值：如果不填则默认为0
    const threshold = thresholdInput === '' ? 0 : parseInt(thresholdInput);
    
    // 处理提醒天数：如果有保质期且不填提醒天数，则默认为7天；如果无保质期则为null
    let expiryWarningDays = null;
    if (expiry) {
        expiryWarningDays = warningDaysInput === '' ? 7 : parseInt(warningDaysInput);
    }
    
    const itemData = {
        name: name,
        quantity: quantity,
        unit: unit,
        expiry: expiry || null, // 保质期为空时设为null
        threshold: threshold,
        expiryWarningDays: expiryWarningDays,
        category: category,
        location: location || null // 存放地点为空时设为null
    };
    
    if (editingItemId) {
        // Update existing item
        const itemIndex = items.findIndex(i => i.id === editingItemId);
        items[itemIndex] = { ...items[itemIndex], ...itemData };
    } else {
        // Add new item
        itemData.id = Date.now().toString();
        itemData.createdAt = new Date().toISOString();
        items.push(itemData);
    }
    
    saveToStorage();
    
    // 重新加载当前分类或汇总视图
    if (currentCategory === 'all-summary') {
        loadSummaryView();
    } else {
        loadCurrentCategory();
    }
    
    closeItemModal();
    
    // Update notifications
    setTimeout(() => {
        notificationManager.checkAndShowNotifications();
    }, 100);
}

function adjustQuantity(itemId, change) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    if (newQuantity < 0) {
        alert('库存不能小于0');
        return;
    }
    
    const action = change > 0 ? '增加' : '减少';
    const confirmMessage = `确定要${action}《${item.name}》的库存吗？\n\n当前库存：${item.quantity} ${item.unit}\n${action}后：${newQuantity} ${item.unit}`;
    
    if (confirm(confirmMessage)) {
        item.quantity = newQuantity;
        saveToStorage();
        
        // 重新加载当前分类或汇总视图
        if (currentCategory === 'all-summary') {
            loadSummaryView();
        } else {
            loadCurrentCategory();
        }
        
        // Update notifications
        setTimeout(() => {
            notificationManager.checkAndShowNotifications();
        }, 100);
        
        // 显示成功消息
        showQuantityAdjustMessage(item.name, action, newQuantity, item.unit);
    }
}

function showQuantityAdjustMessage(itemName, action, newQuantity, unit) {
    const messageEl = document.createElement('div');
    messageEl.className = 'quantity-adjust-message';
    messageEl.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>《${itemName}》库存已${action}至 ${newQuantity} ${unit}</span>
    `;
    
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideInFromTop 0.3s ease;
    `;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.style.animation = 'slideOutToTop 0.3s ease';
            setTimeout(() => messageEl.remove(), 300);
        }
    }, 2000);
}

function deleteItem(itemId) {
    if (confirm('确定要删除这个物品吗？')) {
        items = items.filter(item => item.id !== itemId);
        saveToStorage();
        
        // 重新加载当前分类或汇总视图
        if (currentCategory === 'all-summary') {
            loadSummaryView();
        } else {
            loadCurrentCategory();
        }
        
        // Update notifications
        setTimeout(() => {
            notificationManager.checkAndShowNotifications();
        }, 100);
    }
}

function openSettingsModal() {
    document.getElementById('enableNotifications').checked = settings.enableNotifications;
    settingsModal.classList.add('active');
}

function closeSettingsModal() {
    settingsModal.classList.remove('active');
}

function saveSettings() {
    settings = {
        enableNotifications: document.getElementById('enableNotifications').checked
    };
    
    localStorage.setItem('appSettings', JSON.stringify(settings));
    closeSettingsModal();
    
    // Update notifications with new settings
    setTimeout(() => {
        notificationManager.checkAndShowNotifications();
    }, 100);
}

function resetSettings() {
    if (confirm('确定要重置所有设置为默认值吗？')) {
        settings = {
            enableNotifications: true
        };
        
        localStorage.setItem('appSettings', JSON.stringify(settings));
        loadSettings();
        closeSettingsModal();
        
        // Update notifications
        setTimeout(() => {
            notificationManager.checkAndShowNotifications();
        }, 100);
    }
}

function loadSettings() {
    document.getElementById('enableNotifications').checked = settings.enableNotifications;
}

function saveToStorage() {
    // 如果是Grace快捷用户，优先保存到专用存储
    if (typeof authManager !== 'undefined' && authManager.currentUser && authManager.currentUser.isQuickUser) {
        authManager.saveGraceUserData();
    } else {
        // 普通用户或未登录用户保存到默认位置
        localStorage.setItem('inventoryItems', JSON.stringify(items));
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 手机端操作按钮切换显示函数
function toggleMobileActions(itemId) {
    // 先隐藏所有其他已显示的操作按钮
    document.querySelectorAll('.item-actions.mobile-visible').forEach(actions => {
        if (actions.id !== `actions-${itemId}`) {
            actions.classList.remove('mobile-visible');
        }
    });
    
    // 切换当前点击的物品的操作按钮
    const actions = document.getElementById(`actions-${itemId}`);
    if (actions) {
        actions.classList.toggle('mobile-visible');
    }
}

// 渐进式头部隐藏功能
function initScrollHeader() {
    let lastScrollY = 0;
    let scrollTimeout = null;
    let isScrolling = false;
    let scrollDirectionCount = 0;
    let lastScrollDirection = null;
    
    const headerTop = document.getElementById('headerTop');
    const headerMiddle = document.getElementById('headerMiddle');
    const headerBottom = document.getElementById('headerBottom');
    const appHeader = document.querySelector('.app-header');
    const notificationsContainer = document.getElementById('notificationsContainer');
    const mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');
    
    function handleScroll() {
        const currentScrollY = this.scrollTop || window.scrollY;
        const scrollDelta = Math.abs(currentScrollY - lastScrollY);
        
        // 防抖处理：只有滚动距离超过阈值才触发
        if (scrollDelta < 12) {
            return;
        }
        
        const scrollingDown = currentScrollY > lastScrollY;
        
        // 检查滚动方向稳定性
        if (lastScrollDirection === null || lastScrollDirection === scrollingDown) {
            scrollDirectionCount++;
        } else {
            scrollDirectionCount = 1;
        }
        lastScrollDirection = scrollingDown;
        
        // 只有滚动方向稳定时才触发变化（至少连续2次同方向）
        if (scrollDirectionCount < 2) {
            lastScrollY = currentScrollY;
            return;
        }
        
        // 清除之前的超时
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        // 设置滚动状态
        if (!isScrolling) {
            isScrolling = true;
            document.body.classList.add('is-scrolling');
        }
        
        // 渐进式隐藏逻辑 - 增加迟滞区间防止反复横跳
        requestAnimationFrame(() => {
            const topHidden = headerTop.classList.contains('hidden');
            const middleHidden = headerMiddle.classList.contains('hidden');
            
            if (scrollingDown) {
                // 向下滚动：逐步隐藏头部内容
                if (currentScrollY > 100 && !topHidden) {
                    headerTop.classList.add('hidden');
                }
                if (currentScrollY > 180 && !middleHidden) {
                    headerMiddle.classList.add('hidden');
                }
            } else {
                // 向上滚动：逐步显示头部内容（增大迟滞区间）
                if (currentScrollY <= 140 && middleHidden) {
                    headerMiddle.classList.remove('hidden');
                }
                if (currentScrollY <= 60 && topHidden) {
                    headerTop.classList.remove('hidden');
                }
            }
            
            // 动态更新提醒框位置
            updateNotificationsPosition();
        });
        
        // 设置延迟重置滚动状态
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            scrollDirectionCount = 0;
            lastScrollDirection = null;
            document.body.classList.remove('is-scrolling');
        }, 200);
        
        lastScrollY = currentScrollY;
    }
    
    // 更新提醒框位置
    function updateNotificationsPosition() {
        if (appHeader && notificationsContainer) {
            const headerRect = appHeader.getBoundingClientRect();
            const headerHeight = headerRect.height;
            document.documentElement.style.setProperty('--header-bottom-height', `${headerHeight}px`);
        }
    }
    
    // 初始化提醒框位置
    updateNotificationsPosition();
    
    // 节流处理的滚动监听
    function throttledHandleScroll() {
        if (!isScrolling) {
            requestAnimationFrame(handleScroll.bind(this));
        }
    }
    
    // 监听主内容区域的滚动
    if (mainContent) {
        mainContent.addEventListener('scroll', throttledHandleScroll);
    }
    
    // 监听侧边栏的滚动
    if (sidebar) {
        sidebar.addEventListener('scroll', throttledHandleScroll);
    }
    
    // 也监听窗口滚动作为备用
    window.addEventListener('scroll', throttledHandleScroll);
    
    // 监听窗口大小变化，更新提醒框位置
    window.addEventListener('resize', () => {
        setTimeout(updateNotificationsPosition, 100);
    });
}

// Auto-refresh notifications periodically
setInterval(() => {
    if (settings.enableNotifications) {
        notificationManager.checkAndShowNotifications();
    }
}, 60000); // Check every minute

// Memory Card Game
class MemoryCardGame {
    constructor() {
        this.currentLevel = 1;
        this.maxLevel = 4;
        this.unlockedLevels = JSON.parse(localStorage.getItem('gameUnlockedLevels')) || [1];
        this.gameData = {
            1: { size: 3, pairs: 4 },
            2: { size: 4, pairs: 8 },
            3: { size: 5, pairs: 12 },
            4: { size: 6, pairs: 18 }
        };
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.isGameActive = false;
        this.gameProgress = this.loadGameProgress();
        
        // 游戏图案库 - 水果、食物、动物、植物等
        this.patterns = [
            '🍎', '🍌', '🍇', '🍓', '🍑', '🍊', '🥝', '🍍', '🥭', '🍉',
            '🍞', '🥐', '🥖', '🧀', '🥚', '🥓', '🥨', '🍔', '🍕', '🌭',
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐸', '🐵',
            '🌺', '🌻', '🌷', '🌹', '🌸', '🌼', '🌿', '🍀', '🌱', '🌳',
            '🦋', '🐝', '🐞', '🦜', '🐠', '🐡', '🐬', '🦀', '🦞', '🐙'
        ];
        
        this.initGame();
    }

    initGame() {
        // 绑定事件监听器
        document.getElementById('gameBtn').addEventListener('click', () => this.showGame());
        document.getElementById('backToAppBtn').addEventListener('click', () => this.hideGame());
        document.getElementById('backToLevelsFromGameBtn').addEventListener('click', () => this.backToLevels());
        
        // 关卡选择事件
        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = parseInt(e.currentTarget.dataset.level);
                if (this.unlockedLevels.includes(level)) {
                    this.startLevel(level);
                }
            });
        });
        
        // 胜利界面事件
        document.getElementById('nextLevelBtn').addEventListener('click', () => this.nextLevel());
        document.getElementById('backToLevelsBtn').addEventListener('click', () => this.showLevelSelection());
        
        this.updateLevelButtons();
    }

    showGame() {
        document.getElementById('gameOverlay').style.display = 'flex';
        this.showLevelSelection();
    }

    hideGame() {
        // 如果正在游戏中，保存进度
        if (this.isGameActive && this.cards.length > 0) {
            this.saveGameProgress();
        }
        
        document.getElementById('gameOverlay').style.display = 'none';
    }

    backToLevels() {
        // 如果正在游戏中，保存进度
        if (this.isGameActive && this.cards.length > 0) {
            this.saveGameProgress();
        }
        
        // 返回关卡选择界面
        this.showLevelSelection();
    }

    showLevelSelection() {
        document.getElementById('levelSelection').style.display = 'block';
        document.getElementById('gameBoard').style.display = 'none';
        document.getElementById('winScreen').style.display = 'none';
        this.updateLevelButtons();
        
        // 检查是否有保存的游戏进度
        if (this.gameProgress) {
            this.showProgressDialog();
        }
    }

    showProgressDialog() {
        const levelNames = { 1: '第1关 (3×3)', 2: '第2关 (4×4)', 3: '第3关 (5×5)', 4: '第4关 (6×6)' };
        const levelName = levelNames[this.gameProgress.currentLevel];
        
        if (confirm(`检测到您有未完成的游戏：${levelName}\n已匹配：${this.gameProgress.matchedPairs}对\n是否继续之前的游戏？`)) {
            this.continueGame();
        } else {
            this.clearGameProgress();
        }
    }

    continueGame() {
        // 显示游戏界面
        document.getElementById('levelSelection').style.display = 'none';
        document.getElementById('gameBoard').style.display = 'flex';
        document.getElementById('winScreen').style.display = 'none';
        
        // 恢复游戏进度
        if (this.restoreGameProgress()) {
            const levelNames = { 1: '第1关 (3×3)', 2: '第2关 (4×4)', 3: '第3关 (5×5)', 4: '第4关 (6×6)' };
            document.getElementById('gameLevel').textContent = levelNames[this.currentLevel];
        }
    }

    updateLevelButtons() {
        document.querySelectorAll('.level-btn').forEach(btn => {
            const level = parseInt(btn.dataset.level);
            const isUnlocked = this.unlockedLevels.includes(level);
            
            btn.disabled = !isUnlocked;
            const statusElement = btn.querySelector('.level-status');
            if (isUnlocked) {
                statusElement.textContent = '🔓';
                statusElement.className = 'level-status unlocked';
            } else {
                statusElement.textContent = '🔒';
                statusElement.className = 'level-status locked';
            }
        });
    }

    startLevel(level) {
        this.currentLevel = level;
        this.resetGame();
        this.generateCards();
        this.renderGame();
        
        // 更新UI
        document.getElementById('levelSelection').style.display = 'none';
        document.getElementById('gameBoard').style.display = 'flex';
        document.getElementById('winScreen').style.display = 'none';
        
        const levelNames = { 1: '第1关 (3×3)', 2: '第2关 (4×4)', 3: '第3关 (5×5)', 4: '第4关 (6×6)' };
        document.getElementById('gameLevel').textContent = levelNames[level];
        
        this.updateScore();
        this.isGameActive = true;
    }

    generateCards() {
        const { size, pairs } = this.gameData[this.currentLevel];
        const totalCards = size * size;
        
        // 每次都随机选择不同的图案
        const shuffledPatterns = this.shuffleArray([...this.patterns]);
        const selectedPatterns = shuffledPatterns.slice(0, pairs);
        
        // 创建成对的卡牌
        const cardPatterns = [...selectedPatterns, ...selectedPatterns];
        
        // 如果卡牌总数为奇数，添加一张特殊卡牌
        if (totalCards % 2 === 1) {
            cardPatterns.push('⭐');
        }
        
        // 随机打乱卡牌位置
        this.cards = this.shuffleArray(cardPatterns).slice(0, totalCards);
        this.matchedPairs = 0;
        this.flippedCards = [];
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    renderGame() {
        const { size } = this.gameData[this.currentLevel];
        const cardsGrid = document.getElementById('cardsGrid');
        
        // 设置网格类名
        cardsGrid.className = `cards-grid grid-${size}x${size}`;
        cardsGrid.innerHTML = '';
        
        this.cards.forEach((pattern, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'memory-card';
            cardElement.dataset.index = index;
            cardElement.dataset.pattern = pattern;
            
            cardElement.innerHTML = `
                <div class="card-face card-back">
                    <i class="fas fa-question"></i>
                </div>
                <div class="card-face card-front">
                    ${pattern}
                </div>
            `;
            
            cardElement.addEventListener('click', () => this.flipCard(index));
            cardsGrid.appendChild(cardElement);
        });
    }

    flipCard(index) {
        if (!this.isGameActive) return;
        
        const cardElement = document.querySelector(`[data-index="${index}"]`);
        const pattern = cardElement.dataset.pattern;
        
        // 强制检查：如果已经匹配成功，绝不允许再次翻转
        if (cardElement.classList.contains('matched') || 
            cardElement.classList.contains('matched-final') ||
            cardElement.dataset.matched === 'true' || 
            cardElement.dataset.matched === 'final' ||
            cardElement._isMatched === true) {
            console.log('卡牌已匹配，无法翻转 - 最终匹配状态');
            return;
        }
        
        // 检查卡牌是否已经翻开
        if (cardElement.classList.contains('flipped')) {
            return;
        }
        
        // 检查是否已经有两张卡牌翻开
        if (this.flippedCards.length >= 2) {
            return;
        }
        
        // 翻开卡牌
        cardElement.classList.add('flipped');
        this.flippedCards.push({ index, pattern, element: cardElement });
        
        // 检查匹配
        if (this.flippedCards.length === 2) {
            this.checkMatch();
        }
    }

    lockCardAsMatched(cardElement, pattern) {
        // 完全重写卡牌HTML，只显示正面，移除所有翻转逻辑
        cardElement.innerHTML = `
            <div class="card-face card-front card-matched">
                ${pattern}
            </div>
        `;
        
        // 移除所有可能影响的类
        cardElement.className = 'memory-card matched-final';
        
        // 设置样式确保显示正常
        cardElement.style.transform = 'none';
        cardElement.style.pointerEvents = 'none';
        cardElement.style.opacity = '0.9';
        
        // 标记为最终匹配状态
        cardElement.dataset.matched = 'final';
        cardElement._isMatched = true;
        
        console.log('卡牌已锁定为匹配状态:', pattern);
    }

    checkMatch() {
        const [card1, card2] = this.flippedCards;
        
        setTimeout(() => {
            if (card1.pattern === card2.pattern) {
                // 匹配成功 - 直接重写HTML结构，强制显示正面
                this.lockCardAsMatched(card1.element, card1.pattern);
                this.lockCardAsMatched(card2.element, card2.pattern);
                
                this.matchedPairs++;
                this.updateScore();
                
                // 自动保存进度
                this.saveGameProgress();
                
                console.log(`匹配成功！图案: ${card1.pattern}, 已匹配对数: ${this.matchedPairs}`);
                
                // 检查游戏是否完成
                this.checkGameComplete();
            } else {
                // 匹配失败，翻回背面
                card1.element.classList.remove('flipped');
                card2.element.classList.remove('flipped');
            }
            
            this.flippedCards = [];
        }, 1000);
    }

    checkGameComplete() {
        const { pairs } = this.gameData[this.currentLevel];
        const totalCards = this.cards.length;
        const expectedMatches = totalCards % 2 === 0 ? pairs : pairs; // 处理奇数卡牌情况
        
        if (this.matchedPairs >= expectedMatches) {
            this.isGameActive = false;
            // 关卡完成，清除当前关卡进度
            this.clearGameProgress();
            setTimeout(() => {
                this.showWinScreen();
            }, 500);
        }
    }

    showWinScreen() {
        const isLastLevel = this.currentLevel === this.maxLevel;
        const nextLevel = this.currentLevel + 1;
        
        // 解锁下一关
        if (!isLastLevel && !this.unlockedLevels.includes(nextLevel)) {
            this.unlockedLevels.push(nextLevel);
            localStorage.setItem('gameUnlockedLevels', JSON.stringify(this.unlockedLevels));
        }
        
        // 更新胜利界面
        if (isLastLevel) {
            document.getElementById('winTitle').textContent = '恭喜小香香通关！';
            document.getElementById('winMessage').textContent = '太棒了！您已经完成了所有关卡！';
            document.getElementById('nextLevelBtn').style.display = 'none';
        } else {
            document.getElementById('winTitle').textContent = '恭喜通关！';
            document.getElementById('winMessage').textContent = '太棒了！继续挑战下一关吧！';
            document.getElementById('nextLevelBtn').style.display = 'inline-block';
        }
        
        document.getElementById('winScreen').style.display = 'flex';
        
        // 播放烟花效果
        if (isLastLevel) {
            this.playFireworks();
        }
    }

    playFireworks() {
        const container = document.getElementById('fireworksContainer');
        container.innerHTML = '';
        
        // 创建多个烟花
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                this.createFirework(container);
            }, i * 200);
        }
    }

    createFirework(container) {
        const colors = ['#ff6b9d', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = Math.random() * 100 + '%';
        firework.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        container.appendChild(firework);
        
        // 爆炸效果
        setTimeout(() => {
            this.createFireworkParticles(container, firework.offsetLeft, 100);
            firework.remove();
        }, 300);
    }

    createFireworkParticles(container, x, y) {
        const colors = ['#ff6b9d', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework-particle';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            const angle = (i * 30) * Math.PI / 180;
            const distance = 50 + Math.random() * 100;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            
            particle.style.setProperty('--dx', dx + 'px');
            particle.style.setProperty('--dy', dy + 'px');
            
            container.appendChild(particle);
            
            setTimeout(() => {
                particle.remove();
            }, 3000);
        }
    }

    nextLevel() {
        if (this.currentLevel < this.maxLevel) {
            this.startLevel(this.currentLevel + 1);
        }
    }

    updateScore() {
        const { pairs } = this.gameData[this.currentLevel];
        document.getElementById('gameScore').textContent = `匹配: ${this.matchedPairs}/${pairs}`;
    }

    resetGame() {
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.isGameActive = false;
        
        const cardsGrid = document.getElementById('cardsGrid');
        if (cardsGrid) {
            // 清除所有卡牌和内联样式
            const cards = cardsGrid.querySelectorAll('.memory-card');
            cards.forEach(card => {
                card.style.transform = '';
                card.style.pointerEvents = '';
                card.classList.remove('flipped', 'matched', 'permanently-flipped');
                card.removeAttribute('data-matched');
            });
            cardsGrid.innerHTML = '';
        }
        
        const fireworksContainer = document.getElementById('fireworksContainer');
        if (fireworksContainer) {
            fireworksContainer.innerHTML = '';
        }
        
        console.log('游戏重置完成');
    }

    // 游戏进度保存和加载功能
    saveGameProgress() {
        const progress = {
            currentLevel: this.currentLevel,
            cards: this.cards,
            matchedPairs: this.matchedPairs,
            matchedCards: [],
            timestamp: Date.now()
        };
        
        // 保存已匹配的卡牌信息
        const cardsGrid = document.getElementById('cardsGrid');
        if (cardsGrid) {
            const matchedCards = cardsGrid.querySelectorAll('.matched-final');
            matchedCards.forEach((card, index) => {
                progress.matchedCards.push({
                    index: card.dataset.index,
                    pattern: card.dataset.pattern
                });
            });
        }
        
        localStorage.setItem('memoryGameProgress', JSON.stringify(progress));
        console.log('游戏进度已保存');
    }

    loadGameProgress() {
        const saved = localStorage.getItem('memoryGameProgress');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.log('加载游戏进度失败:', e);
            }
        }
        return null;
    }

    restoreGameProgress() {
        if (!this.gameProgress) return false;
        
        // 检查进度是否太旧（超过24小时）
        const timeLimit = 24 * 60 * 60 * 1000; // 24小时
        if (Date.now() - this.gameProgress.timestamp > timeLimit) {
            localStorage.removeItem('memoryGameProgress');
            this.gameProgress = null;
            return false;
        }
        
        // 恢复游戏状态
        this.currentLevel = this.gameProgress.currentLevel;
        this.cards = this.gameProgress.cards;
        this.matchedPairs = this.gameProgress.matchedPairs;
        
        // 重新渲染游戏
        this.renderGame();
        
        // 恢复已匹配的卡牌状态
        setTimeout(() => {
            this.gameProgress.matchedCards.forEach(cardInfo => {
                const cardElement = document.querySelector(`[data-index="${cardInfo.index}"]`);
                if (cardElement) {
                    this.lockCardAsMatched(cardElement, cardInfo.pattern);
                }
            });
        }, 100);
        
        this.updateScore();
        this.isGameActive = true;
        
        console.log('游戏进度已恢复');
        return true;
    }

    clearGameProgress() {
        localStorage.removeItem('memoryGameProgress');
        this.gameProgress = null;
        console.log('游戏进度已清除');
    }
}

// 初始化游戏
let memoryGame;

// 在页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', function() {
    // 等待其他初始化完成后再初始化游戏
    setTimeout(() => {
        memoryGame = new MemoryCardGame();
    }, 100);
    
    // 初始化滚动头部隐藏功能
    initScrollHeader();
});

// Search functionality
function handleSearch(e) {
    const query = e.target.value.trim();
    currentSearchQuery = query;
    
    // Show/hide clear button
    const searchClear = document.getElementById('searchClear');
    if (searchClear) {
        searchClear.style.display = query ? 'block' : 'none';
    }
    
    // Update the view
    if (currentCategory === 'all-summary') {
        loadSummaryView();
    } else {
        loadCurrentCategory();
    }
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    if (searchInput) {
        searchInput.value = '';
    }
    
    if (searchClear) {
        searchClear.style.display = 'none';
    }
    
    currentSearchQuery = '';
    
    // Update the view
    if (currentCategory === 'all-summary') {
        loadSummaryView();
    } else {
        loadCurrentCategory();
    }
}

function filterItems(items, query) {
    if (!query) return items;
    
    const lowerQuery = query.toLowerCase();
    
    return items.filter(item => {
        // 搜索物品名称
        if (item.name.toLowerCase().includes(lowerQuery)) {
            return true;
        }
        
        // 搜索存放地点
        if (item.location && item.location.toLowerCase().includes(lowerQuery)) {
            return true;
        }
        
        // 搜索单位
        if (item.unit && item.unit.toLowerCase().includes(lowerQuery)) {
            return true;
        }
        
        // 搜索分类名称
        const categoryName = categoryNames[item.category];
        if (categoryName && categoryName.toLowerCase().includes(lowerQuery)) {
            return true;
        }
        
        return false;
    });
} 