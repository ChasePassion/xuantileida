const api = require('../../utils/api');
const { formatNumber, formatDuration, platformLabel } = require('../../utils/util');

Page({
  data: {
    videoId: '',
    video: null,
    report: null,
    hasReport: false,
    showUnlockModal: false,
    unlockLoading: false,
    balance: 0,
  },

  onLoad(options) {
    this.setData({ videoId: options.id });
    this.loadVideo();
    this.loadReport();
    this.loadBalance();
  },

  async loadVideo() {
    try {
      const video = await api.videos.getDetail(this.data.videoId);
      const masked = video.dataMasked;
      this.setData({
        video: {
          ...video,
          likesText: masked ? '***' : formatNumber(video.likeCount || video.likes || 0),
          commentsText: masked ? '***' : formatNumber(video.commentCount || video.comments || 0),
          sharesText: masked ? '***' : formatNumber(video.shareCount || video.shares || 0),
          durationText: formatDuration(video.duration),
          platformName: platformLabel(video.platform),
          dataMasked: masked,
        },
      });
    } catch (e) {
      console.warn('加载视频失败:', e);
    }
  },

  async loadReport() {
    try {
      const report = await api.analysis.getReport(this.data.videoId);
      this.setData({
        report,
        hasReport: true,
      });
    } catch (e) {
      this.setData({ hasReport: false });
    }
  },

  async loadBalance() {
    try {
      const res = await api.users.getBalance();
      this.setData({ balance: res.balance || 0 });
    } catch (e) {}
  },

  onUnlockTap() {
    this.setData({ showUnlockModal: true });
  },

  onModalClose() {
    this.setData({ showUnlockModal: false });
  },

  async onUnlockConfirm() {
    if (this.data.unlockLoading) return;
    this.setData({ unlockLoading: true });
    try {
      const res = await api.analysis.unlock(this.data.report.reportId);
      wx.showToast({ title: '解锁成功', icon: 'success' });
      this.setData({
        report: res.report,
        balance: res.remainingBalance,
        showUnlockModal: false,
        unlockLoading: false,
      });
    } catch (e) {
      this.setData({ unlockLoading: false, showUnlockModal: false });
      const msg = e.message || '';
      if (msg.includes('余额不足') || msg.includes('雷达币不足') || msg.includes('insufficient')) {
        wx.showModal({
          title: '余额不足',
          content: '您的雷达币不足，是否前往充值？',
          confirmText: '去充值',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/recharge/index?tab=coins' });
            }
          },
        });
      } else {
        wx.showToast({ title: msg || '解锁失败', icon: 'none' });
      }
    }
  },

  onShareAppMessage() {
    const v = this.data.video;
    return {
      title: v ? `拆解分析: ${v.title}` : '选题雷达',
      path: `/pages/video-detail/index?id=${this.data.videoId}`,
    };
  },
});
