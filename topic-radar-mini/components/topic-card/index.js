const { formatNumber } = require('../../utils/util');

Component({
  properties: {
    topic: {
      type: Object,
      value: {},
    },
  },

  methods: {
    onTap() {
      wx.navigateTo({
        url: `/pages/topic-detail/index?id=${this.data.topic.id}`,
      });
    },

    formatNum(num) {
      return formatNumber(num);
    },
  },
});
