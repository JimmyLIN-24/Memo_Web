// pages/home/home.js
const app = getApp();

Page({
  data: {
    // UI State
    headerHidden: false,
    headerTopHidden: false,
    headerMiddleHidden: false,
    showItemModal: false,
    showSettingsModal: false,
    editingItemId: null,

    // Data State
    items: [],
    categories: [
        {
            title: '食品类',
            id: 'food',
            subcategories: [
                { id: 'food-fresh', name: '新鲜食品', icon: '🥬' },
                { id: 'food-packaged', name: '包装食品', icon: '📦' },
                { id: 'food-frozen', name: '冷冻食品', icon: '🧊' },
                { id: 'food-drinks', name: '饮品', icon: '☕' }
            ]
        },
        {
            title: '个人护理',
            id: 'care',
            subcategories: [
                { id: 'skincare', name: '护肤品', icon: '🧴' },
                { id: 'cosmetics', name: '化妆品', icon: '🎨' },
                { id: 'hygiene', name: '清洁用品', icon: '🧼' }
            ]
        },
        {
            title: '生活用品',
            id: 'living',
            subcategories: [
                { id: 'daily-necessities', name: '日常必需', icon: '🏠' },
                { id: 'cleaning', name: '清洁用品', icon: '🧹' },
                { id: 'paper-products', name: '纸制品', icon: '🧻' },
                { id: 'medicine', name: '药品保健', icon: '💊' }
            ]
        },
        {
            title: '其他',
            id: 'others-group',
            subcategories: [
                { id: 'electronics', name: '电子用品', icon: '🔌' },
                { id: 'stationery', name: '文具用品', icon: '🖊️' },
                { id: 'others', name: '其他物品', icon: '❓' }
            ]
        },
    ],
    
    // Flattened categories for picker
    categoryRange: [
        [
            { name: '食品类', id: 'food' },
            { name: '个人护理', id: 'care' },
            { name: '生活用品', id: 'living' },
            { name: '其他', id: 'others-group' }
        ],
        [
            // Default first column
            { name: '新鲜食品', id: 'food-fresh' },
            { name: '包装食品', id: 'food-packaged' },
            { name: '冷冻食品', id: 'food-frozen' },
            { name: '饮品', id: 'food-drinks' }
        ]
    ],
    categoryIndex: [0, 0], // Index for picker
    categoryDisplay: '',

    currentCategory: 'all-summary',
    categoryTitle: '全部物品汇总',
    searchQuery: '',
    
    // Computed Data
    filteredItems: [],
    notifications: [],
    
    // Form Data
    formData: {
        name: '',
        quantity: '',
        unit: '',
        expiryDate: '',
        threshold: '',
        warningDays: '',
        location: '',
        category: ''
    },
    
    // Quick Select
    quickSelectItems: [
        { name: '牛奶', category: 'food-drinks', unit: '盒', expiry: 7 },
        { name: '鸡蛋', category: 'food-fresh', unit: '个', expiry: 15 },
        { name: '面包', category: 'food-fresh', unit: '包', expiry: 3 },
        { name: '大米', category: 'food-packaged', unit: '袋', expiry: 180 },
        { name: '洗衣液', category: 'cleaning', unit: '瓶' },
        { name: '抽纸', category: 'paper-products', unit: '包' }
    ],
    selectedQuickItem: null,
    
    settings: {
        enableNotifications: true
    },
    
    // Stats
    totalItems: 0,
    alertItems: 0,
    currentCategoryTotal: 0,
    currentCategoryAlert: 0,

    // User Context
    storageKey: 'inventoryItems', // Default key
    currentUser: null
  },

  onLoad: function() {
    this.checkUser();
    this.loadSettings();
    this.loadItems();
    this.updateStats();
  },

  onShow: function() {
      // Re-check notifications or other dynamic data
      this.checkUser(); // Check in case user changed
      this.updateStats();
      this.refreshItems();
  },

  // --- User & Storage Logic ---
  checkUser: function() {
      const user = wx.getStorageSync('memo_current_user');
      const key = user === 'Grace1013' ? 'inventoryItems_Grace1013' : 'inventoryItems';
      
      // If user changed or first load
      if (this.data.storageKey !== key) {
          this.setData({ 
              storageKey: key, 
              currentUser: user 
          });
          this.loadItems(); // Reload with new key
      }
  },

  refreshItems: function() {
      // Just re-filter if needed, or reload from storage if parallel updates possible (not likely in MP single instance)
      // But good to have
      this.filterItems();
  },

  // --- Logic Loading & Saving ---
  
  loadSettings: function() {
      const settings = wx.getStorageSync('appSettings');
      if (settings) {
          this.setData({ settings });
      }
  },
  
  saveSettings: function() {
      wx.setStorageSync('appSettings', this.data.settings);
      this.setData({ showSettingsModal: false });
      wx.showToast({ title: '设置已保存', icon: 'success' });
  },

  loadItems: function() {
      const items = wx.getStorageSync(this.data.storageKey) || [];
      // Process items (check expiry, etc)
      const processedItems = items.map(this.processItem);
      this.setData({ items: processedItems });
      this.filterItems();
  },
  
  processItem: function(item) {
      // Logic to calculate status (expired, low stock)
      let isExpired = false;
      let isExpiring = false;
      let isLowStock = false;
      let statusBadge = '';
      let statusBadgeClass = '';
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      if (item.expiryDate) {
          const expiry = new Date(item.expiryDate);
          const diffTime = expiry - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          item.expiryDateDisplay = item.expiryDate; // Simple date string
          
          if (diffDays < 0) {
              isExpired = true;
              statusBadge = '已过期';
              statusBadgeClass = 'expired';
          } else if (diffDays <= (item.expiryWarningDays || 30)) { // Default 30 or item specific
              isExpiring = true;
              statusBadge = `剩${diffDays}天`;
              statusBadgeClass = 'expiring';
          }
      }
      
      if (item.quantity <= (item.threshold || 0)) { // Default 0 or item specific
          isLowStock = true;
          if (!statusBadge) { // Expiry takes precedence
              statusBadge = '库存不足';
              statusBadgeClass = 'low-stock';
          }
      }
      
      return {
          ...item,
          isExpired,
          isExpiring,
          isLowStock,
          statusBadge,
          statusBadgeClass
      };
  },
  
  saveItems: function() {
      wx.setStorageSync(this.data.storageKey, this.data.items);
      this.updateStats();
      this.filterItems();
  },
  
  updateStats: function() {
      const items = this.data.items;
      const total = items.length;
      const alert = items.filter(i => i.isExpired || i.isExpiring || i.isLowStock).length;
      
      this.setData({
          totalItems: total,
          alertItems: alert
      });
  },
  
  // --- Navigation ---
  
  changeCategory: function(e) {
      const category = e.currentTarget.dataset.category;
      let title = '全部物品汇总';
      
      if (category !== 'all-summary') {
          // Find category name
          for(let group of this.data.categories) {
              const found = group.subcategories.find(sub => sub.id === category);
              if (found) {
                  title = found.name;
                  break;
              }
          }
      }
      
      this.setData({
          currentCategory: category,
          categoryTitle: title
      });
      this.filterItems();
  },
  
  filterItems: function() {
      let filtered = this.data.items;
      const cat = this.data.currentCategory;
      const query = this.data.searchQuery.toLowerCase();
      
      // Category Filter
      if (cat !== 'all-summary') {
          filtered = filtered.filter(i => i.category === cat);
      }
      
      // Search Filter
      if (query) {
          filtered = filtered.filter(i => 
              (i.name && i.name.toLowerCase().includes(query)) ||
              (i.location && i.location.toLowerCase().includes(query))
          );
      }
      
      // Sort: Alerts first
      filtered.sort((a, b) => {
          const aScore = (a.isExpired ? 3 : 0) + (a.isLowStock ? 2 : 0) + (a.isExpiring ? 1 : 0);
          const bScore = (b.isExpired ? 3 : 0) + (b.isLowStock ? 2 : 0) + (b.isExpiring ? 1 : 0);
          return bScore - aScore;
      });

      this.setData({
          filteredItems: filtered,
          currentCategoryTotal: filtered.length,
          currentCategoryAlert: filtered.filter(i => i.isExpired || i.isExpiring || i.isLowStock).length
      });
  },
  
  goHome: function() {
      wx.navigateBack();
  },

  // --- Search ---
  onSearchInput: function(e) {
      this.setData({ searchQuery: e.detail.value });
      this.filterItems();
  },
  
  clearSearch: function() {
      this.setData({ searchQuery: '' });
      this.filterItems();
  },
  
  // --- Modal Logic ---
  
  showAddItemModal: function() {
      this.setData({
          showItemModal: true,
          editingItemId: null,
          formData: {
              name: '', quantity: '', unit: '', expiryDate: '', threshold: '', warningDays: '', location: '', category: ''
          },
          selectedQuickItem: null,
          categoryDisplay: ''
      });
  },
  
  editItem: function(e) {
      const id = e.currentTarget.dataset.id;
      const item = this.data.items.find(i => i.id === id);
      if (!item) return;
      
      // Find category display
      let catDisplay = '';
      for(let group of this.data.categories) {
          const found = group.subcategories.find(sub => sub.id === item.category);
          if (found) {
              catDisplay = `${group.title} - ${found.name}`;
              break;
          }
      }

      this.setData({
          showItemModal: true,
          editingItemId: id,
          formData: { ...item },
          categoryDisplay: catDisplay
      });
  },
  
  closeItemModal: function() {
      this.setData({ showItemModal: false });
  },
  
  onInputChange: function(e) {
      const field = e.currentTarget.dataset.field;
      const value = e.detail.value;
      this.setData({
          [`formData.${field}`]: value
      });
  },
  
  onDateChange: function(e) {
      this.setData({
          'formData.expiryDate': e.detail.value
      });
  },
  
  onCategoryChange: function(e) {
      // e.detail.value is array of indices [col1, col2]
      const indices = e.detail.value;
      const mainCat = this.data.categoryRange[0][indices[0]];
      const subCat = this.data.categoryRange[1][indices[1]];
      
      this.setData({
          'formData.category': subCat.id,
          categoryDisplay: `${mainCat.name} - ${subCat.name}`,
          categoryIndex: indices
      });
  },
  
  onCategoryColumnChange: function(e) {
      // Update second column based on first column selection
      if (e.detail.column === 0) {
          const mainCatId = this.data.categoryRange[0][e.detail.value].id;
          // Find subcategories for this group
          const group = this.data.categories.find(c => c.id === mainCatId);
          if (group) {
              const subcats = group.subcategories.map(s => ({ name: s.name, id: s.id }));
              const newRange = this.data.categoryRange;
              newRange[1] = subcats;
              this.setData({
                  categoryRange: newRange,
                  // Reset second column index logic if needed, but standard picker handles it well usually
              });
          }
      }
  },
  
  selectQuickItem: function(e) {
      const item = e.currentTarget.dataset.item;
      // Pre-fill form
      const today = new Date();
      let expiryDate = '';
      if (item.expiry) {
          today.setDate(today.getDate() + item.expiry);
          expiryDate = today.toISOString().split('T')[0];
      }
      
      this.setData({
          selectedQuickItem: item.name,
          'formData.name': item.name,
          'formData.category': item.category,
          'formData.unit': item.unit,
          'formData.expiryDate': expiryDate,
          // Update category display... a bit complex to reverse lookup quickly, skipped for now or simple mapping
      });
      // Trigger simple category display update if possible
      // ...
  },

  saveItem: function() {
      const { name, quantity, category } = this.data.formData;
      if (!name || !quantity || !category) {
          wx.showToast({ title: '请补全必填信息', icon: 'none' });
          return;
      }
      
      const newItem = {
          ...this.data.formData,
          id: this.data.editingItemId || Date.now().toString(),
          updatedAt: new Date().toISOString()
      };
      
      let newItems = [...this.data.items];
      if (this.data.editingItemId) {
          const idx = newItems.findIndex(i => i.id === newItem.id);
          if (idx > -1) newItems[idx] = newItem;
      } else {
          newItems.unshift(newItem);
      }
      
      this.setData({ items: newItems.map(this.processItem) });
      this.saveItems();
      this.closeItemModal();
      wx.showToast({ title: '保存成功', icon: 'success' });
  },
  
  deleteItem: function(e) {
      const id = e.currentTarget.dataset.id;
      const that = this;
      wx.showModal({
          title: '确认删除',
          content: '确定要删除这个物品吗？',
          success(res) {
              if (res.confirm) {
                  const newItems = that.data.items.filter(i => i.id !== id);
                  that.setData({ items: newItems });
                  that.saveItems();
                  wx.showToast({ title: '已删除', icon: 'success' });
              }
          }
      });
  },
  
  updateQuantity: function(e) {
      const { id, action } = e.currentTarget.dataset;
      const items = [...this.data.items];
      const item = items.find(i => i.id === id);
      
      if (item) {
          let q = parseInt(item.quantity) || 0;
          if (action === 'increase') q++;
          else if (action === 'decrease' && q > 0) q--;
          
          item.quantity = q;
          this.setData({ items: items.map(this.processItem) });
          this.saveItems(); // Logic to save to storage
      }
  },
  
  // --- Item Card Interaction ---
  onItemClick: function(e) {
      const id = e.currentTarget.dataset.id;
      // Toggle actions visibility for this item in list
      const items = this.data.filteredItems.map(i => {
          if (i.id === id) {
              return { ...i, showActions: !i.showActions };
          }
          return { ...i, showActions: false }; // Close others
      });
      this.setData({ filteredItems: items });
  },

  // --- Other Modals ---
  showSettingsModal: function() {
      this.setData({ showSettingsModal: true });
  },
  
  closeSettingsModal: function() {
      this.setData({ showSettingsModal: false });
  },

  showCoffeeHub: function() {
      wx.navigateTo({
        url: '/pages/coffee/coffee',
      });
  },

  showGameOverlay: function() {
      wx.showToast({ title: '游戏功能开发中...', icon: 'none' });
  }

});
