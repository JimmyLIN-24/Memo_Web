// pages/add/add.js
Page({
  data: {
    isEdit: false,
    item: {
      id: '',
      name: '',
      quantity: 1,
      unit: '',
      category: 'others',
      expiry: '',
      threshold: 0,
      expiryWarningDays: 0,
      location: ''
    },
    categories: [
      {id: 'food-fresh', name: '食品 - 新鲜食品'},
      {id: 'food-packaged', name: '食品 - 包装食品'},
      {id: 'food-frozen', name: '食品 - 冷冻食品'},
      {id: 'food-drinks', name: '食品 - 饮品'},
      {id: 'skincare', name: '护理 - 护肤品'},
      {id: 'cosmetics', name: '护理 - 化妆品'},
      {id: 'hygiene', name: '护理 - 清洁用品'},
      {id: 'daily-necessities', name: '生活 - 日常必需'},
      {id: 'cleaning', name: '生活 - 清洁用品'},
      {id: 'paper-products', name: '生活 - 纸制品'},
      {id: 'medicine', name: '生活 - 药品保健'},
      {id: 'electronics', name: '其他 - 电子用品'},
      {id: 'stationery', name: '其他 - 文具用品'},
      {id: 'others', name: '其他 - 其他物品'}
    ],
    categoryIndex: 13, // Default to others
    quickItems: ['牛奶', '鸡蛋', '面包', '苹果', '洗发水', '牙膏', '纸巾', '洗衣液']
  },

  onLoad(options) {
    if (options.id) {
      this.loadItem(options.id);
    } else {
        // Set default category index
        this.setData({
            'item.id': Date.now().toString()
        });
    }
  },

  loadItem(id) {
    const items = wx.getStorageSync('items') || [];
    const item = items.find(i => i.id === id);
    if (item) {
      const catIndex = this.data.categories.findIndex(c => c.id === item.category);
      this.setData({
        item: { ...item },
        isEdit: true,
        categoryIndex: catIndex > -1 ? catIndex : 13
      });
    }
  },

  onNameInput(e) { this.setData({ 'item.name': e.detail.value }); },
  onQuantityInput(e) { this.setData({ 'item.quantity': e.detail.value }); },
  onUnitInput(e) { this.setData({ 'item.unit': e.detail.value }); },
  onLocationInput(e) { this.setData({ 'item.location': e.detail.value }); },
  onThresholdInput(e) { this.setData({ 'item.threshold': e.detail.value }); },
  onWarningDaysInput(e) { this.setData({ 'item.expiryWarningDays': e.detail.value }); },
  
  bindCategoryChange(e) {
    const index = e.detail.value;
    this.setData({
      categoryIndex: index,
      'item.category': this.data.categories[index].id
    });
  },

  bindDateChange(e) {
    this.setData({ 'item.expiry': e.detail.value });
  },

  selectQuickItem(e) {
      this.setData({ 'item.name': e.currentTarget.dataset.name });
  },

  saveItem() {
    const { item } = this.data;
    if (!item.name) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' });
      return;
    }

    let items = wx.getStorageSync('items') || [];
    
    if (this.data.isEdit) {
      const index = items.findIndex(i => i.id === item.id);
      if (index > -1) items[index] = item;
    } else {
      item.createdAt = new Date().toISOString();
      items.push(item);
    }

    wx.setStorageSync('items', items);
    wx.navigateBack();
  },

  deleteItem() {
      const { item } = this.data;
      wx.showModal({
          title: '确认删除',
          content: '确定要删除这个物品吗？',
          success: (res) => {
              if (res.confirm) {
                  let items = wx.getStorageSync('items') || [];
                  items = items.filter(i => i.id !== item.id);
                  wx.setStorageSync('items', items);
                  wx.navigateBack();
              }
          }
      })
  }
});

