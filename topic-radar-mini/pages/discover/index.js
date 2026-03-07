const api = require('../../utils/api');
const { formatNumber } = require('../../utils/util');
const { ensureLogin, getUserInfo } = require('../../utils/auth');

Page({
  data: {
    stats: { topicCount: 0, viralCount: 0, industryCount: 0, updateTime: '' },
    categories: [],
    currentCategory: '',
    topics: [],
    loading: true,
    refreshing: false,
    isVip: false,
    freeLimit: 3,
  },

  onLoad(options) {
    // 处理推荐码（从分享海报扫码进入）
    if (options.ref) {
      wx.setStorageSync('referrerCode', options.ref);
    }
    this.init();
  },

  onShow() {
    const userInfo = getUserInfo();
    this.setData({ isVip: userInfo.membership === 'premium' });
  },

  async init() {
    await ensureLogin();
    // 绑定推荐关系
    const referrerCode = wx.getStorageSync('referrerCode');
    if (referrerCode) {
      api.referral.bind(referrerCode).catch(() => {});
      wx.removeStorageSync('referrerCode');
    }
    this.loadCategories();
    this.loadStats();
    this.loadTopics();
  },

  async loadCategories() {
    try {
      const res = await api.topics.getCategories();
      const list = res.categories || res || [];
      const totalCount = res.totalCount || 0;
      const categories = [
        { slug: '', name: '全部', topicCount: totalCount },
        ...list,
      ];
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
      this.setData({
        topics,
        loading: false,
        isVip: !!res.isVip,
        freeLimit: res.freeLimit || 3,
      });
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

  onTopicTap(e) {
    const topic = e.currentTarget.dataset.topic;
    if (topic.locked) {
      wx.showModal({
        title: '升级VIP',
        content: '免费版只能查看前3个选题，升级VIP解锁全部30个实时选题',
        confirmText: '去升级',
        success(res) {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/recharge/index?tab=vip' });
          }
        },
      });
      return;
    }
    wx.navigateTo({ url: `/pages/topic-detail/index?id=${topic.id}` });
  },

  goVip() {
    wx.navigateTo({ url: '/pages/recharge/index?tab=vip' });
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    Promise.all([this.loadStats(), this.loadTopics()]).finally(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage() {
    const userInfo = getUserInfo();
    return {
      title: '选题雷达 - 发现今日爆款选题',
      path: `/pages/discover/index?ref=${userInfo.id || ''}`,
    };
  },
});
