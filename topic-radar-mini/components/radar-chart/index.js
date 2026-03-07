Component({
  properties: {
    dimensions: {
      type: Array,
      value: [],
    },
    size: {
      type: Number,
      value: 300,
    },
  },

  data: {
    canvasId: 'radarCanvas',
  },

  lifetimes: {
    ready() {
      this.drawRadar();
    },
  },

  observers: {
    'dimensions': function() {
      this.drawRadar();
    },
  },

  methods: {
    drawRadar() {
      const dims = this.data.dimensions;
      if (!dims || dims.length === 0) return;

      const query = this.createSelectorQuery();
      query.select('#radarCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) return;
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getWindowInfo().pixelRatio;
          const width = res[0].width;
          const height = res[0].height;

          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);

          this.draw(ctx, width, height, dims);
        });
    },

    draw(ctx, w, h, dims) {
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(cx, cy) - 30;
      const count = dims.length;
      const angleStep = (Math.PI * 2) / count;
      const startAngle = -Math.PI / 2;
      const levels = 5;

      ctx.clearRect(0, 0, w, h);

      // Draw grid
      for (let level = 1; level <= levels; level++) {
        const r = (maxR * level) / levels;
        ctx.beginPath();
        for (let i = 0; i <= count; i++) {
          const angle = startAngle + i * angleStep;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = level === levels ? '#E5E7EB' : '#F3F4F6';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw axes
      for (let i = 0; i < count; i++) {
        const angle = startAngle + i * angleStep;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw data area
      ctx.beginPath();
      for (let i = 0; i <= count; i++) {
        const idx = i % count;
        const score = dims[idx].score || 0;
        const r = (maxR * score) / 10;
        const angle = startAngle + idx * angleStep;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(91, 95, 230, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#5B5FE6';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw data points
      for (let i = 0; i < count; i++) {
        const score = dims[i].score || 0;
        const r = (maxR * score) / 10;
        const angle = startAngle + i * angleStep;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#5B5FE6';
        ctx.fill();
      }

      // Draw labels
      ctx.fillStyle = '#374151';
      ctx.font = '11px PingFang SC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < count; i++) {
        const angle = startAngle + i * angleStep;
        const labelR = maxR + 20;
        let x = cx + labelR * Math.cos(angle);
        let y = cy + labelR * Math.sin(angle);

        const label = dims[i].label || dims[i].dimension;
        const scoreText = dims[i].score ? dims[i].score.toFixed(1) : '';

        ctx.fillStyle = '#374151';
        ctx.fillText(label, x, y - 7);
        if (scoreText) {
          ctx.fillStyle = '#5B5FE6';
          ctx.font = 'bold 11px PingFang SC';
          ctx.fillText(scoreText, x, y + 8);
          ctx.font = '11px PingFang SC';
        }
      }
    },
  },
});
