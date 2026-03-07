const api = require('../../utils/api');
const { formatDate } = require('../../utils/util');

Page({
  data: {
    unlocks: [],
    loading: true,
    page: 1,
    total: 0,
    hasMore: true,
  },

  onLoad() {
    this.loadUnlocks();
  },

  async loadUnlocks(append) {
    if (!append) this.setData({ loading: true });
    try {
      const res = await api.analysis.getMyUnlocks({
        page: this.data.page,
        limit: 20,
      });
      const items = (res.items || []).map((item) => ({
        ...item,
        unlockedAtText: formatDate(item.unlockedAt),
      }));
      this.setData({
        unlocks: append ? [...this.data.unlocks, ...items] : items,
        total: res.total || 0,
        hasMore: (res.page || 1) * (res.limit || 20) < (res.total || 0),
        loading: false,
      });
    } catch (e) {
      console.warn('加载已解锁列表失败:', e);
      this.setData({ loading: false });
    }
  },

  onReportTap(e) {
    const reportId = e.currentTarget.dataset.reportId;
    const videoId = e.currentTarget.dataset.videoId;
    if (videoId) {
      wx.navigateTo({
        url: `/pages/video-detail/index?id=${videoId}`,
      });
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadUnlocks(true);
    }
  },
});
