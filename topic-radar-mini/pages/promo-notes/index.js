const api = require('../../utils/api');

Page({
  data: {
    selectedPlatform: 'xiaohongshu',
    screenshot: '',
    noteUrl: '',
    records: [],
    loading: false,
    submitting: false,
    rules: {},
  },

  onLoad() {
    this.loadRules();
    this.loadMyRecords();
  },

  async loadRules() {
    try {
      const rules = await api.promo.getRules();
      this.setData({ rules });
    } catch (e) {
      console.warn('加载规则失败:', e);
    }
  },

  async loadMyRecords() {
    this.setData({ loading: true });
    try {
      const records = await api.promo.getRecords({});
      // 格式化记录数据
      const formattedRecords = records.map(record => ({
        ...record,
        platformName: this.getPlatformName(record.platform),
        statusText: this.getStatusText(record.status),
        createdAt: this.formatTime(record.createdAt),
      }));
      this.setData({ records: formattedRecords, loading: false });
    } catch (e) {
      console.warn('加载记录失败:', e);
      this.setData({ loading: false });
    }
  },

  onPlatformChange(e) {
    const { platform } = e.currentTarget.dataset;
    this.setData({ selectedPlatform: platform });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadImage(tempFilePath);
      },
    });
  },

  async uploadImage(filePath) {
    wx.showLoading({ title: '上传中...' });
    try {
      // 这里需要先上传图片到服务器获取URL
      // 简化处理，实际需要调用文件上传接口
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: require('../../utils/config').BASE_URL + '/upload/image',
          filePath: filePath,
          name: 'file',
          header: {
            Authorization: `Bearer ${wx.getStorageSync('token')}`,
          },
          success: (res) => {
            const data = JSON.parse(res.data);
            if (data.url) {
              resolve(data.url);
            } else {
              reject(new Error('上传失败'));
            }
          },
          fail: reject,
        });
      });

      this.setData({ screenshot: uploadRes });
      wx.hideLoading();
      wx.showToast({ title: '上传成功', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  onUrlInput(e) {
    this.setData({ noteUrl: e.detail.value });
  },

  async submitNote() {
    if (!this.data.screenshot) {
      wx.showToast({ title: '请先上传截图', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      await api.promo.submit({
        platform: this.data.selectedPlatform,
        screenshotUrl: this.data.screenshot,
        noteUrl: this.data.noteUrl,
      });

      wx.showToast({ title: '提交成功，等待审核', icon: 'success' });

      // 重置表单
      this.setData({
        screenshot: '',
        noteUrl: '',
        submitting: false,
      });

      // 重新加载记录
      this.loadMyRecords();
    } catch (e) {
      wx.showToast({ title: e.message || '提交失败', icon: 'none' });
      this.setData({ submitting: false });
    }
  },

  getPlatformName(platform) {
    const map = {
      xiaohongshu: '小红书',
      douyin: '抖音',
      moments: '朋友圈',
    };
    return map[platform] || platform;
  },

  getStatusText(status) {
    const map = {
      pending: '审核中',
      approved: '已通过',
      rejected: '已拒绝',
    };
    return map[status] || status;
  },

  formatTime(timeStr) {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now - date;
    const day = 24 * 60 * 60 * 1000;

    if (diff < day) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      if (hours === 0) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes}分钟前`;
      }
      return `${hours}小时前`;
    } else if (diff < 2 * day) {
      return '昨天';
    } else {
      return `${date.getMonth() + 1}-${date.getDate()}`;
    }
  },
});
