const COLORS = {
  hook: '#EF4444',
  pain: '#F59E0B',
  core: '#5B5FE6',
  climax: '#8B5CF6',
  cta: '#10B981',
};

Component({
  properties: {
    segments: {
      type: Array,
      value: [],
    },
  },

  methods: {
    getColor(type) {
      return COLORS[type] || '#5B5FE6';
    },
  },
});
