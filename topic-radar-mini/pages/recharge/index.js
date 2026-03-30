const api = require('../../utils/api');
const { getUserInfo } = require('../../utils/auth');

Page({
  data: {
    activeTab: 'vip', // 'vip' | 'coins'
    balance: 0,
    isVip: false,
    vipExpiresAt: '',

    // VIP套餐
    vipPlans: [
      {
        plan: 'monthly',
        price: 59.9,
        label: '月卡',
        desc: '30天',
        perDay: '2.0',
        reports: 5,
        features: ['全部30个选题', '实时数据', '5次AI报告/月', '3个行业', '7天历史'],
      },
      {
        plan: 'yearly',
        price: 499,
        label: '年卡',
        desc: '365天',
        perDay: '1.4',
        reports: 15,
        tag: '省30%',
        features: ['全部30个选题', '实时数据', '15次AI报告/月', '全行业', '30天历史'],
      },
    ],
    selectedPlan: 'monthly',

    // 雷达币套餐
    coinPackages: [
      { amount: 9.9, coins: 10, bonus: 0, total: 10, label: '入门', price: '¥9.9' },
      { amount: 29.9, coins: 35, bonus: 5, total: 40, label: '热门', price: '¥29.9', tag: '热门' },
      { amount: 59.9, coins: 80, bonus: 20, total: 100, label: '超值', price: '¥59.9', tag: '送20' },
      { amount: 99.9, coins: 150, bonus: 50, total: 200, label: '豪华', price: '¥99.9', tag: '送50' },
    ],
    selectedCoinAmount: 29.9,

    loading: false,
  },

  onLoad(options) {
    if (options.tab === 'coins' || options.tab === 'vip') {
      this.setData({ activeTab: options.tab });
    }
    this.loadBalance();
    this.loadVipStatus();
  },

  async loadBalance() {
    try {
      const res = await api.users.getBalance();
      this.setData({ balance: res.balance || 0 });
    } catch (e) {}
  },

  loadVipStatus() {
    const userInfo = getUserInfo();
    const isVip = userInfo.membership === 'premium' &&
      new Date(userInfo.membershipExpiresAt) > new Date();
    this.setData({
      isVip,
      vipExpiresAt: userInfo.membershipExpiresAt
        ? new Date(userInfo.membershipExpiresAt).toLocaleDateString('zh-CN')
        : '',
    });
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onSelectPlan(e) {
    this.setData({ selectedPlan: e.currentTarget.dataset.plan });
  },

  onSelectCoinPackage(e) {
    this.setData({ selectedCoinAmount: e.currentTarget.dataset.amount });
  },

  async onSubscribe() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await api.billing.subscribe({ plan: this.data.selectedPlan });
      if (res.payParams) {
        wx.requestPayment({
          ...res.payParams,
          success: () => {
            wx.showToast({ title: '订阅成功', icon: 'success' });
            this.loadVipStatus();
          },
          fail: (err) => {
            if (err.errMsg && err.errMsg.indexOf('cancel') > -1) {
              wx.showToast({ title: '支付已取消', icon: 'none' });
            } else {
              wx.showToast({ title: '支付失败，请重试', icon: 'none' });
            }
          },
        });
      } else {
        wx.showToast({ title: '订阅成功', icon: 'success' });
        this.loadVipStatus();
      }
    } catch (e) {
      wx.showToast({ title: e.message || '操作失败', icon: 'none' });
    }
    this.setData({ loading: false });
  },

  async onRecharge() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await api.billing.recharge({ amount: this.data.selectedCoinAmount });
      if (res.payParams) {
        wx.requestPayment({
          ...res.payParams,
          success: () => {
            wx.showToast({ title: '充值成功', icon: 'success' });
            this.loadBalance();
          },
          fail: (err) => {
            if (err.errMsg && err.errMsg.indexOf('cancel') > -1) {
              wx.showToast({ title: '支付已取消', icon: 'none' });
            } else {
              wx.showToast({ title: '支付失败，请重试', icon: 'none' });
            }
          },
        });
      } else {
        wx.showToast({ title: '充值成功', icon: 'success' });
        this.loadBalance();
      }
    } catch (e) {
      wx.showToast({ title: e.message || '操作失败', icon: 'none' });
    }
    this.setData({ loading: false });
  },
});
