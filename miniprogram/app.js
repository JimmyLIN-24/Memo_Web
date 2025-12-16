App({
  onLaunch: function () {
    // Check local storage for user info
    const userInfo = wx.getStorageSync('memo_current_user');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
    
    // Initialize items if empty
    const items = wx.getStorageSync('items');
    if (!items) {
      wx.setStorageSync('items', []);
    }
  },
  globalData: {
    userInfo: null
  }
})
