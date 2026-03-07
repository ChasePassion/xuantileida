const api = require('../../utils/api');

Page({
  data: {
    code: '',
    loading: false,
    records: [],
    recordsLoading: true,
  },

  onLoad() {
    this.loadRecords();
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value.toUpperCase() });
  },

  async onRedeem() {
    const code = this.data.code.trim();
    if (!code) {
      wx.showToast({ title: '请输入兑换码', icon: 'none' });
      return;
    }
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await api.redemption.redeem(code);
      wx.showModal({
        title: '兑换成功',
        content: res.message || '兑换码已使用成功',
        showCancel: false,
      });
      this.setData({ code: '', loading: false });
      this.loadRecords();
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  async loadRecords() {
    this.setData({ recordsLoading: true });
    try {
      const res = await api.redemption.getRecords();
      this.setData({
        records: res.records || res || [],
        recordsLoading: false,
      });
    } catch (e) {
      this.setData({ recordsLoading: false });
    }
  },
});
