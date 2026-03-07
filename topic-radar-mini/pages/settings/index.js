const api = require('../../utils/api');

Page({
  data: {
    categories: [],
    selectedCategories: [],
    likeThreshold: 100000,
    timeRangeDays: 7,
    pushEnabled: false,
    loading: true,
    saving: false,
    thresholdOptions: [
      { value: 10000, label: '1万+' },
      { value: 50000, label: '5万+' },
      { value: 100000, label: '10万+' },
      { value: 500000, label: '50万+' },
    ],
    timeOptions: [
      { value: 3, label: '3天' },
      { value: 7, label: '7天' },
      { value: 14, label: '14天' },
      { value: 30, label: '30天' },
    ],
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    try {
      const [categories, config] = await Promise.all([
        api.topics.getCategories(),
        api.users.getConfig(),
      ]);
      this.setData({
        categories: categories.categories || categories || [],
        selectedCategories: config.industries || [],
        likeThreshold: config.likeThreshold || 100000,
        timeRangeDays: config.timeRangeDays || 7,
        pushEnabled: config.pushEnabled || false,
        loading: false,
      });
    } catch (e) {
      console.warn('加载配置失败:', e);
      this.setData({ loading: false });
    }
  },

  onCategoryToggle(e) {
    const slug = e.currentTarget.dataset.slug;
    let selected = [...this.data.selectedCategories];
    const idx = selected.indexOf(slug);
    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      selected.push(slug);
    }
    this.setData({ selectedCategories: selected });
  },

  onThresholdChange(e) {
    this.setData({ likeThreshold: Number(e.currentTarget.dataset.value) });
  },

  onTimeChange(e) {
    this.setData({ timeRangeDays: Number(e.currentTarget.dataset.value) });
  },

  onPushChange(e) {
    this.setData({ pushEnabled: e.detail.value });
  },

  async onSave() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      await api.users.updateConfig({
        industries: this.data.selectedCategories,
        likeThreshold: this.data.likeThreshold,
        timeRangeDays: this.data.timeRangeDays,
        pushEnabled: this.data.pushEnabled,
      });
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (e) {
      // error handled by api wrapper
    }
    this.setData({ saving: false });
  },
});
