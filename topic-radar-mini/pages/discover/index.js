const api = require('../../utils/api');
const { formatNumber } = require('../../utils/util');
const { ensureLogin } = require('../../utils/auth');

Page({
  data: {
    stats: { topicCount: 0, viralCount: 0, industryCount: 0, updateTime: '' },
    categories: [],
    currentCategory: '',
    topics: [],
    loading: true,
    refreshing: false,
  },

  onLoad() {
    this.init();
  },

  onShow() {},

  async init() {
    await ensureLogin();
    this.loadCategories();
    this.loadStats();
    this.loadTopics();
  },

  async loadCategories() {
    try {
      const res = await api.topics.getCategories();
      const list = res.categories || res || [];
      const categories = [{ slug: '', name: '全部' }, ...list];
      this.setData({ categories });
    } catch (e) {
      console.warn('加载分类失败:', e);
    }
  },

  async loadStats() {
    try {
      const stats = await api.topics.getStats();
      this.setData({ stats });
    } catch (e) {
      console.warn('加载统计失败:', e);
    }
  },

  async loadTopics() {
    this.setData({ loading: true });
    try {
      const params = {};
      if (this.data.currentCategory) {
        params.category = this.data.currentCategory;
      }
      const res = await api.topics.getDaily(params);
      const topics = (res.topics || res || []).map((t) => ({
        ...t,
        maxLikesFormatted: formatNumber(t.maxLikes),
      }));
      this.setData({ topics, loading: false });
    } catch (e) {
      console.warn('加载选题失败:', e);
      this.setData({ loading: false });
    }
  },

  onCategoryTap(e) {
    const slug = e.currentTarget.dataset.slug;
    if (slug !== this.data.currentCategory) {
      this.setData({ currentCategory: slug });
      this.loadTopics();
    }
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    Promise.all([this.loadStats(), this.loadTopics()]).finally(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage() {
    return {
      title: '选题雷达 - 发现今日爆款选题',
      path: '/pages/discover/index',
    };
  },
});
