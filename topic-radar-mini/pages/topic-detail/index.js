const api = require('../../utils/api');
const { formatNumber } = require('../../utils/util');

Page({
  data: {
    topicId: '',
    topic: null,
    videos: [],
    allVideos: [],
    currentPlatform: '',
    loading: true,
    page: 1,
    total: 0,
  },

  onLoad(options) {
    this.setData({ topicId: options.id });
    this.loadDetail();
    this.loadVideos();
  },

  async loadDetail() {
    try {
      const topic = await api.topics.getDetail(this.data.topicId);
      wx.setNavigationBarTitle({ title: topic.keyword || '选题详情' });
      this.setData({ topic });
    } catch (e) {
      console.warn('加载选题详情失败:', e);
    }
  },

  async loadVideos() {
    this.setData({ loading: true });
    try {
      const res = await api.videos.getByTopic(this.data.topicId, {
        page: this.data.page,
        limit: 50,
      });
      const allVideos = res.videos || res || [];
      this.setData({
        allVideos,
        total: res.total || allVideos.length,
        loading: false,
      });
      this.filterVideos();
    } catch (e) {
      console.warn('加载视频失败:', e);
      this.setData({ loading: false });
    }
  },

  filterVideos() {
    const { allVideos, currentPlatform } = this.data;
    const videos = currentPlatform
      ? allVideos.filter((v) => v.platform === currentPlatform)
      : allVideos;
    this.setData({ videos });
  },

  onPlatformChange(e) {
    this.setData({ currentPlatform: e.detail.platform });
    this.filterVideos();
  },

  onShareAppMessage() {
    const topic = this.data.topic;
    return {
      title: topic ? `选题推荐: ${topic.keyword}` : '选题雷达',
      path: `/pages/topic-detail/index?id=${this.data.topicId}`,
    };
  },
});
