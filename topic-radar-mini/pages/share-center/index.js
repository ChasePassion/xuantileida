const api = require('../../utils/api');

Page({
  data: {
    selectedPlatform: 'xiaohongshu',
    generatedContents: [],
    templates: [],
    generating: false,
    loading: false,
  },

  onLoad() {
    this.loadTemplates();
  },

  onPlatformChange(e) {
    const { platform } = e.currentTarget.dataset;
    this.setData({
      selectedPlatform: platform,
      generatedContents: [],
    });
    this.loadTemplates();
  },

  async loadTemplates() {
    this.setData({ loading: true });
    try {
      const templates = await api.promoContent.getTemplates({
        platform: this.data.selectedPlatform,
      });
      this.setData({ templates, loading: false });
    } catch (e) {
      console.warn('加载模板失败:', e);
      this.setData({ loading: false });
    }
  },

  async generateContent() {
    this.setData({ generating: true });
    try {
      const contents = await api.promoContent.generate({
        platform: this.data.selectedPlatform,
      });

      // 格式化内容
      const formattedContents = contents.map(item => ({
        ...item,
        styleName: this.getStyleName(item.style),
      }));

      this.setData({
        generatedContents: formattedContents,
        generating: false,
      });

      wx.showToast({ title: '生成成功', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: e.message || '生成失败', icon: 'none' });
      this.setData({ generating: false });
    }
  },

  async onCopy(e) {
    const { content, id } = e.currentTarget.dataset;

    try {
      await new Promise((resolve, reject) => {
        wx.setClipboardData({
          data: content,
          success: resolve,
          fail: reject,
        });
      });

      wx.showToast({ title: '已复制到剪贴板', icon: 'success' });

      // 标记为已使用
      if (id) {
        this.markUsed(id);
      }
    } catch (e) {
      wx.showToast({ title: '复制失败', icon: 'none' });
    }
  },

  async markUsed(contentId) {
    try {
      await api.promoContent.markUsed({ contentId });
    } catch (e) {
      console.warn('标记使用失败:', e);
    }
  },

  getStyleName(style) {
    const map = {
      authentic: '真诚体验型',
      data: '数据展示型',
      empathy: '痛点共鸣型',
      story: '故事叙述型',
      question: '提问引导型',
    };
    return map[style] || style;
  },

  getPlatformName(platform) {
    const map = {
      xiaohongshu: '小红书',
      douyin: '抖音',
      moments: '朋友圈',
    };
    return map[platform] || platform;
  },
});
