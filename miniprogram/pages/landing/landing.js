// pages/landing/landing.js
Page({
  data: {
    userInfo: null
  },

  onShow: function() {
    this.checkLoginStatus();
  },

  checkLoginStatus: function() {
    const user = wx.getStorageSync('memo_current_user');
    if (user) {
      this.setData({ userInfo: user });
    }
  },

  enterApp: function() {
    // Navigate to the main app page (which will be a tab bar page ideally, or just index)
    wx.switchTab({
      url: '/pages/index/index'
    }).catch(() => {
        // If not a tab bar page, use navigateTo
        wx.navigateTo({
            url: '/pages/index/index'
        });
    });
  }
})
