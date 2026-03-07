const { PLATFORMS } = require('../../utils/config');

Component({
  properties: {
    current: {
      type: String,
      value: '',
    },
    platforms: {
      type: Array,
      value: PLATFORMS,
    },
  },

  methods: {
    onTap(e) {
      const key = e.currentTarget.dataset.key;
      if (key !== this.data.current) {
        this.triggerEvent('change', { platform: key });
      }
    },
  },
});
