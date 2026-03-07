const api = require('../../utils/api');

Page({
  data: {
    balance: 0,
    packages: [
      { amount: 50, label: '50 雷达币', price: '¥50' },
      { amount: 100, label: '100 雷达币', price: '¥100', tag: '热门' },
      { amount: 200, label: '200 雷达币', price: '¥200' },
      { amount: 500, label: '500 雷达币', price: '¥500', tag: '超值' },
    ],
    selectedAmount: 100,
    loading: false,
  },

  onLoad() {
    this.loadBalance();
  },

  async loadBalance() {
    try {
      const res = await api.users.getBalance();
      this.setData({ balance: res.balance || 0 });
    } catch (e) {}
  },

  onSelectPackage(e) {
    this.setData({ selectedAmount: e.currentTarget.dataset.amount });
  },

  async onRecharge() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await api.billing.recharge({ amount: this.data.selectedAmount });
      if (res.payParams) {
        // 调起微信支付
        wx.requestPayment({
          ...res.payParams,
          success: () => {
            wx.showToast({ title: '充值成功', icon: 'success' });
            this.loadBalance();
          },
          fail: () => {
            wx.showToast({ title: '支付已取消', icon: 'none' });
          },
        });
      } else {
        // 开发环境直接成功
        wx.showToast({ title: '充值成功', icon: 'success' });
        this.loadBalance();
      }
    } catch (e) {
      // error handled by api wrapper
    }
    this.setData({ loading: false });
  },
});
