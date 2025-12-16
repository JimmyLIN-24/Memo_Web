// pages/index/index.js
Page({
  data: {
    isLoggedIn: false,
    inputUsername: '',
    currentUser: null
  },

  onShow: function () {
    this.checkLoginStatus();
  },

  onInputChange: function(e) {
      this.setData({ inputUsername: e.detail.value });
  },

  checkLoginStatus: function () {
    const currentUser = wx.getStorageSync('memo_current_user');
    if (currentUser) {
      this.setData({ isLoggedIn: true, currentUser: currentUser });
    } else {
      this.setData({ isLoggedIn: false, currentUser: null });
    }
  },

  enterApp: function () {
    // Check specific username
    if (this.data.inputUsername === 'Grace1013') {
        wx.setStorageSync('memo_current_user', 'Grace1013');
        wx.showToast({ title: '欢迎回到专属仓库！', icon: 'success' });
        setTimeout(() => {
            wx.navigateTo({ url: '/pages/home/home' });
        }, 1000);
    } else if (this.data.isLoggedIn) {
        // Already logged in
        wx.navigateTo({ url: '/pages/home/home' });
    } else {
        // Normal entry without login (Guest or default)
        // If user input something else but not the secret code, just clear it or treat as guest?
        // Let's treat empty or wrong code as Guest if they click main button
        // But maybe give feedback if they typed something wrong?
        if (this.data.inputUsername) {
             wx.showToast({ title: '暗号错误，进入普通模式', icon: 'none' });
        }
        wx.navigateTo({ url: '/pages/home/home' });
    }
  },

  enterAppAsGuest: function() {
      wx.navigateTo({ url: '/pages/home/home' });
  },
  
  logout: function () {
    const that = this;
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success (res) {
        if (res.confirm) {
          wx.removeStorageSync('memo_current_user');
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
          that.setData({ isLoggedIn: false, currentUser: null, inputUsername: '' });
        }
      }
});
  }
});
