const api = require('../../utils/api');
const { getUserInfo } = require('../../utils/auth');

Page({
  data: {
    stats: {
      totalReferred: 0,
      validReferred: 0,
      totalCoinsEarned: 0,
      totalVipDaysEarned: 0,
    },
    referrals: [],
    loading: true,
    posterVisible: false,
    posterUrl: '',
    userId: '',
  },

  onLoad() {
    const userInfo = getUserInfo();
    this.setData({ userId: userInfo.id || '' });
    this.loadStats();
    this.loadReferrals();
  },

  async loadStats() {
    try {
      const stats = await api.referral.getStats();
      this.setData({ stats });
    } catch (e) {
      console.warn('加载推荐统计失败:', e);
    }
  },

  async loadReferrals() {
    this.setData({ loading: true });
    try {
      const res = await api.referral.getList({ page: 1, limit: 50 });
      this.setData({
        referrals: res.referrals || res || [],
        loading: false,
      });
    } catch (e) {
      console.warn('加载推荐列表失败:', e);
      this.setData({ loading: false });
    }
  },

  onShareTap() {
    // 分享给好友（通过微信转发）
  },

  async onPosterTap() {
    // 生成海报用于保存到相册
    this.setData({ posterVisible: true });
    this.generatePoster();
  },

  async generatePoster() {
    try {
      const data = await api.referral.getPosterData();
      // 使用Canvas绘制海报
      const ctx = wx.createCanvasContext('posterCanvas', this);
      const w = 540;
      const h = 960;

      // 背景渐变
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#5B5FE6');
      grd.addColorStop(1, '#7C3AED');
      ctx.setFillStyle(grd);
      ctx.fillRect(0, 0, w, h);

      // 标题
      ctx.setFillStyle('#ffffff');
      ctx.setFontSize(36);
      ctx.setTextAlign('center');
      ctx.fillText('选题雷达', w / 2, 120);

      ctx.setFontSize(20);
      ctx.fillText('短视频选题发现工具', w / 2, 160);

      // 邀请文案
      ctx.setFontSize(28);
      ctx.fillText('邀请好友一起发现爆款选题', w / 2, 400);

      ctx.setFontSize(22);
      ctx.fillText('新用户注册即送5雷达币', w / 2, 450);
      ctx.fillText('你也可获得10雷达币奖励', w / 2, 490);

      // 二维码区域（白色背景）
      ctx.setFillStyle('#ffffff');
      ctx.fillRect(w / 2 - 100, 560, 200, 200);

      ctx.setFillStyle('#666666');
      ctx.setFontSize(18);
      ctx.fillText('长按识别小程序码', w / 2, 800);

      // 推荐码
      ctx.setFillStyle('#ffffff');
      ctx.setFontSize(16);
      ctx.fillText('推荐码: ' + (data.referralCode || this.data.userId), w / 2, 840);

      ctx.draw(false, () => {
        // Canvas绘制完成
      });
    } catch (e) {
      console.warn('生成海报失败:', e);
    }
  },

  async onSavePoster() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvasId: 'posterCanvas',
          success: resolve,
          fail: reject,
        }, this);
      });

      await new Promise((resolve, reject) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: resolve,
          fail: reject,
        });
      });

      wx.showToast({ title: '已保存到相册', icon: 'success' });
    } catch (e) {
      if (e.errMsg && e.errMsg.indexOf('auth deny') >= 0) {
        wx.showToast({ title: '请授权相册权限', icon: 'none' });
      }
    }
  },

  onClosePoster() {
    this.setData({ posterVisible: false });
  },

  onShareAppMessage() {
    return {
      title: '我在用选题雷达发现爆款选题，你也来试试！',
      path: `/pages/discover/index?ref=${this.data.userId}`,
    };
  },
});
