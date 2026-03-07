const api = require('../../utils/api');
const { formatNumber, platformLabel, platformColor } = require('../../utils/util');
const { ensureLogin } = require('../../utils/auth');

Page({
  data: {
    reports: [],
    loading: true,
    currentPlatform: '',
    page: 1,
    hasMore: true,
  },

  onLoad() {
    this.init();
  },

  async init() {
    await ensureLogin();
    this.loadReports();
  },

  async loadReports(append) {
    if (!append) {
      this.setData({ loading: true, page: 1 });
    }
    try {
      // Use daily topics API to get videos with reports
      const topicsRes = await api.topics.getDaily({ limit: 50 });
      const topics = topicsRes.topics || topicsRes || [];

      // Get videos from first few topics
      const reports = [];
      const topicSlice = topics.slice(0, 10);

      for (const topic of topicSlice) {
        try {
          const videosRes = await api.videos.getByTopic(topic.id, { limit: 10 });
          const videos = videosRes.videos || videosRes || [];
          for (const v of videos) {
            if (v.hasReport) {
              reports.push({
                videoId: v.id,
                title: v.title,
                coverUrl: v.coverUrl,
                platform: v.platform,
                platformName: platformLabel(v.platform),
                platformColor: platformColor(v.platform),
                likes: v.likes || v.likeCount || 0,
                likesText: formatNumber(v.likes || v.likeCount || 0),
                creator: v.creator?.name || v.creatorName || '',
                topicKeyword: topic.keyword,
              });
            }
          }
        } catch (e) {}
      }

      this.setData({
        reports: append ? [...this.data.reports, ...reports] : reports,
        loading: false,
        hasMore: false,
      });
    } catch (e) {
      console.warn('加载广场数据失败:', e);
      this.setData({ loading: false });
    }
  },

  onPlatformChange(e) {
    this.setData({ currentPlatform: e.detail.platform });
  },

  getFilteredReports() {
    const { reports, currentPlatform } = this.data;
    if (!currentPlatform) return reports;
    return reports.filter((r) => r.platform === currentPlatform);
  },

  onReportTap(e) {
    const videoId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/video-detail/index?id=${videoId}`,
    });
  },

  onPullDownRefresh() {
    this.loadReports().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return {
      title: '选题雷达 - 爆款视频拆解广场',
      path: '/pages/square/index',
    };
  },
});
