/**
 * 格式化数字（万/亿）
 */
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return String(num);
}

/**
 * 格式化时长 (秒 -> mm:ss)
 */
function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${m}/${day} ${h}:${min}`;
}

/**
 * 平台 key -> 中文名
 */
function platformLabel(platform) {
  const map = {
    douyin: '抖音',
    kuaishou: '快手',
    wechat_video: '视频号',
  };
  return map[platform] || platform;
}

/**
 * 平台 key -> 颜色
 */
function platformColor(platform) {
  const map = {
    douyin: '#FE2C55',
    kuaishou: '#FF6600',
    wechat_video: '#07C160',
  };
  return map[platform] || '#999';
}

/**
 * 节流
 */
function throttle(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) return;
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

module.exports = {
  formatNumber,
  formatDuration,
  formatDate,
  platformLabel,
  platformColor,
  throttle,
};
