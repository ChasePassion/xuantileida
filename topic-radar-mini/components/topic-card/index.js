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
      // 锁定状态由父页面onTopicTap处理
    },

    formatNum(num) {
      return formatNumber(num);
    },
  },
});
