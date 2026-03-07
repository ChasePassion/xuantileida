const api = require('../../utils/api');
const { ensureLogin } = require('../../utils/auth');

Page({
  data: {
    userInfo: null,
    balance: 0,
    stats: { analyses: 0, generations: 0, edits: 0 },
    plan: '基础版',
    menuItems: [
      { key: 'unlocks', label: '已解锁报告', icon: '📋', url: '/pages/my-unlocks/index' },
      { key: 'recharge', label: '充值中心', icon: '💰', url: '/pages/recharge/index' },
      { key: 'settings', label: '偏好设置', icon: '⚙', url: '/pages/settings/index' },
    ],
  },

  onLoad() {},

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    await ensureLogin();
    try {
      const profile = await api.users.getProfile();
      this.setData({
        userInfo: {
          name: profile.name || '用户',
          avatarUrl: profile.avatarUrl,
        },
        balance: profile.balance || 0,
        stats: profile.stats || { analyses: 0, generations: 0, edits: 0 },
        plan: profile.plan || '基础版',
      });
    } catch (e) {
      console.warn('加载个人信息失败:', e);
    }
  },

  onMenuTap(e) {
    const url = e.currentTarget.dataset.url;
    wx.navigateTo({ url });
  },

  onShareAppMessage() {
    return {
      title: '选题雷达 - 短视频选题发现工具',
      path: '/pages/discover/index',
    };
  },
});
