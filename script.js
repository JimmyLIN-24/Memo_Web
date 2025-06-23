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
let currentCategory = 'food-fresh';
let editingItemId = null;
let settings = JSON.parse(localStorage.getItem('appSettings')) || {
    defaultThreshold: 5,
    expiryWarningDays: 7,
    enableNotifications: true
};

// Notification System
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notificationsContainer');
        this.notifications = new Map(); // Track notifications by item ID
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

    hide(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.style.animation = 'slideOutToTop 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    clear() {
        this.container.innerHTML = '';
        this.notifications.clear();
    }

    // Check all items and show relevant notifications
    checkAndShowNotifications() {
        if (!settings.enableNotifications) return;

        // Clear existing notifications first
        this.clear();

        const today = new Date();
        const warningDate = new Date();
        warningDate.setDate(today.getDate() + settings.expiryWarningDays);

        items.forEach(item => {
            const expiryDate = new Date(item.expiry);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

            // Check for expired items
            if (expiryDate < today) {
                this.show(
                    `expired-${item.id}`,
                    'error',
                    `${item.name} 已过期`,
                    `该物品已于 ${formatDate(item.expiry)} 过期，请及时处理`,
                    '🚨'
                );
            }
            // Check for expiring items
            else if (expiryDate <= warningDate) {
                this.show(
                    `expiring-${item.id}`,
                    'warning',
                    `${item.name} 即将过期`,
                    `还有 ${daysUntilExpiry} 天过期（${formatDate(item.expiry)}）`,
                    '⏰'
                );
            }

            // Check for low stock
            if (item.quantity <= item.threshold) {
                this.show(
                    `lowstock-${item.id}`,
                    'warning',
                    `${item.name} 库存不足`,
                    `当前库存：${item.quantity} ${item.unit}，建议补货`,
                    '📦'
                );
            }
        });
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
        { name: '牛奶', unit: '盒', threshold: 2, defaultExpiry: 7, quantity: 1 },
        { name: '鸡蛋', unit: '打', threshold: 1, defaultExpiry: 14, quantity: 1 },
        { name: '面包', unit: '袋', threshold: 1, defaultExpiry: 3, quantity: 1 },
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

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadCurrentCategory();
    updateStats();
    setupEventListeners();
    loadSettings();
    
    // Check notifications after a short delay to ensure DOM is ready
    setTimeout(() => {
        notificationManager.checkAndShowNotifications();
    }, 500);
});

function setupEventListeners() {
    // Navigation
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            loadCurrentCategory();
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
}

function loadCurrentCategory() {
    const categoryItems = items.filter(item => item.category === currentCategory);
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
    const expiryDate = new Date(item.expiry);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    let statusClass = '';
    let statusBadge = '';
    let expiryClass = '';
    
    if (expiryDate < today) {
        statusClass = 'alert';
        statusBadge = '<div class="status-badge expired">已过期</div>';
        expiryClass = 'expired';
    } else if (daysUntilExpiry <= settings.expiryWarningDays) {
        statusClass = 'warning';
        statusBadge = '<div class="status-badge expiring">即将过期</div>';
        expiryClass = 'warning';
    } else if (item.quantity <= item.threshold) {
        statusClass = 'warning';
        statusBadge = '<div class="status-badge low-stock">库存不足</div>';
    }
    
    const card = document.createElement('div');
    card.className = `item-card ${statusClass}`;
    card.innerHTML = `
        ${statusBadge}
        <div class="item-header">
            <h3 class="item-name">${item.name}</h3>
            <div class="item-actions">
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
            </div>
            <div class="item-detail">
                <i class="fas fa-calendar-alt"></i>
                <span class="item-expiry ${expiryClass}">
                    保质期：${formatDate(item.expiry)}
                    ${daysUntilExpiry > 0 ? `(${daysUntilExpiry}天)` : ''}
                </span>
            </div>
            <div class="item-detail">
                <i class="fas fa-exclamation-triangle"></i>
                <span>库存阈值：${item.threshold} ${item.unit}</span>
            </div>
        </div>
    `;
    
    return card;
}

function updateStats() {
    const categoryItems = items.filter(item => item.category === currentCategory);
    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + settings.expiryWarningDays);
    
    const alertCount = categoryItems.filter(item => {
        const expiryDate = new Date(item.expiry);
        return item.quantity <= item.threshold || expiryDate <= warningDate;
    }).length;
    
    totalItems.textContent = categoryItems.length;
    alertItems.textContent = alertCount;
}

function openAddModal() {
    editingItemId = null;
    document.getElementById('modalTitle').textContent = '添加物品';
    document.getElementById('saveBtn').textContent = '保存';
    itemForm.reset();
    document.getElementById('itemCategory').value = currentCategory;
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
    document.getElementById('itemExpiry').value = item.expiry;
    document.getElementById('itemThreshold').value = item.threshold;
    document.getElementById('itemCategory').value = item.category;
    
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
    document.getElementById('itemExpiry').value = formatDateForInput(expiryDate);
    document.getElementById('itemQuantity').value = presetItem.quantity;
}

function saveItem(e) {
    e.preventDefault();
    
    const itemData = {
        name: document.getElementById('itemName').value,
        quantity: parseInt(document.getElementById('itemQuantity').value),
        unit: document.getElementById('itemUnit').value,
        expiry: document.getElementById('itemExpiry').value,
        threshold: parseInt(document.getElementById('itemThreshold').value) || settings.defaultThreshold,
        category: document.getElementById('itemCategory').value
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
    loadCurrentCategory();
    closeItemModal();
    
    // Update notifications
    setTimeout(() => {
        notificationManager.checkAndShowNotifications();
    }, 100);
}

function deleteItem(itemId) {
    if (confirm('确定要删除这个物品吗？')) {
        items = items.filter(item => item.id !== itemId);
        saveToStorage();
        loadCurrentCategory();
        
        // Update notifications
        setTimeout(() => {
            notificationManager.checkAndShowNotifications();
        }, 100);
    }
}

function openSettingsModal() {
    document.getElementById('defaultThreshold').value = settings.defaultThreshold;
    document.getElementById('expiryWarningDays').value = settings.expiryWarningDays;
    document.getElementById('enableNotifications').checked = settings.enableNotifications;
    settingsModal.classList.add('active');
}

function closeSettingsModal() {
    settingsModal.classList.remove('active');
}

function saveSettings() {
    settings = {
        defaultThreshold: parseInt(document.getElementById('defaultThreshold').value),
        expiryWarningDays: parseInt(document.getElementById('expiryWarningDays').value),
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
            defaultThreshold: 5,
            expiryWarningDays: 7,
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
    document.getElementById('defaultThreshold').value = settings.defaultThreshold;
    document.getElementById('expiryWarningDays').value = settings.expiryWarningDays;
    document.getElementById('enableNotifications').checked = settings.enableNotifications;
}

function saveToStorage() {
    localStorage.setItem('inventoryItems', JSON.stringify(items));
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

// Auto-refresh notifications periodically
setInterval(() => {
    if (settings.enableNotifications) {
        notificationManager.checkAndShowNotifications();
    }
}, 60000); // Check every minute 