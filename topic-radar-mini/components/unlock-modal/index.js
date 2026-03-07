Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    price: {
      type: Number,
      value: 8,
    },
    balance: {
      type: Number,
      value: 0,
    },
    loading: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    insufficient: false,
  },

  observers: {
    'price, balance': function(price, balance) {
      this.setData({ insufficient: balance < price });
    },
  },

  methods: {
    onConfirm() {
      if (this.data.insufficient) {
        wx.navigateTo({ url: '/pages/recharge/index' });
        this.onClose();
        return;
      }
      this.triggerEvent('confirm');
    },

    onClose() {
      this.triggerEvent('close');
    },

    preventBubble() {},
  },
});
