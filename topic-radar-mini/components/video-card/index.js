const { formatNumber, formatDuration, platformLabel, platformColor } = require('../../utils/util');

Component({
  properties: {
    video: {
      type: Object,
      value: {},
    },
  },

  data: {
    platformName: '',
    platformColorVal: '',
    likesText: '',
    commentsText: '',
    durationText: '',
  },

  observers: {
    'video': function(v) {
      if (!v || !v.id) return;
      const masked = v.dataMasked;
      this.setData({
        platformName: platformLabel(v.platform),
        platformColorVal: platformColor(v.platform),
        likesText: masked ? '***' : formatNumber(v.likes || v.likeCount || 0),
        commentsText: masked ? '***' : formatNumber(v.comments || v.commentCount || 0),
        durationText: formatDuration(v.duration),
        dataMasked: !!masked,
      });
    },
  },

  methods: {
    onTap() {
      wx.navigateTo({
        url: `/pages/video-detail/index?id=${this.data.video.id}`,
      });
    },
  },
});
