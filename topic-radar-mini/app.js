const { login } = require('./utils/auth');

App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
  },

  onLaunch() {
    this.autoLogin();
  },

  async autoLogin() {
    try {
      await login();
      this.globalData.isLoggedIn = true;
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.globalData.userInfo = userInfo;
      }
    } catch (err) {
      console.warn('自动登录失败:', err);
    }
  },
});
