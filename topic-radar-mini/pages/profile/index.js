const api = require('../../utils/api');
const { ensureLogin, getUserInfo } = require('../../utils/auth');

Page({
  data: {
    userInfo: null,
    balance: 0,
    stats: { analyses: 0, generations: 0, edits: 0 },
    plan: '免费版',
    isVip: false,
    vipExpiresAt: '',
    menuItems: [
      { key: 'vip', label: 'VIP会员', icon: '&#11088;', url: '/pages/recharge/index?tab=vip' },
      { key: 'unlocks', label: '已解锁报告', icon: '&#128203;', url: '/pages/my-unlocks/index' },
      { key: 'referral', label: '邀请有奖', icon: '&#127873;', url: '/pages/referral/index' },
      { key: 'redemption', label: '兑换码', icon: '&#127903;', url: '/pages/redemption/index' },
      { key: 'recharge', label: '雷达币充值', icon: '&#128176;', url: '/pages/recharge/index?tab=coins' },
      { key: 'settings', label: '偏好设置', icon: '&#9881;', url: '/pages/settings/index' },
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
      const isVip = profile.membership === 'premium' &&
        new Date(profile.membershipExpiresAt) > new Date();
      this.setData({
        userInfo: {
          name: profile.name || '用户',
          avatarUrl: profile.avatarUrl,
        },
        balance: profile.balance || 0,
        stats: profile.stats || { analyses: 0, generations: 0, edits: 0 },
        plan: isVip ? 'VIP会员' : '免费版',
        isVip,
        vipExpiresAt: profile.membershipExpiresAt
          ? new Date(profile.membershipExpiresAt).toLocaleDateString('zh-CN')
          : '',
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
    const userInfo = getUserInfo();
    return {
      title: '选题雷达 - 短视频选题发现工具',
      path: `/pages/discover/index?ref=${userInfo.id || ''}`,
    };
  },
});
