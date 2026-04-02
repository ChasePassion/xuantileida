// API 配置 - 自动切换环境
const ENV = __wxConfig.envVersion; // 'develop' | 'trial' | 'release'

const ENV_CONFIG = {
  develop: 'http://localhost:3000/api',           // 开发版（本地）
  trial: 'https://xuantileida.jutongbao.online/api',    // 体验版（线上）
  release: 'https://xuantileida.jutongbao.online/api',  // 正式版（线上）
};

const BASE_URL = ENV_CONFIG[ENV] || ENV_CONFIG.release;

module.exports = {
  BASE_URL,
  REST_URL: ENV === 'develop'
    ? 'http://localhost:3000'
    : 'https://xuantileida.jutongbao.online',
  // 平台映射
  PLATFORMS: [
    { key: '', label: '全部' },
    { key: 'douyin', label: '抖音' },
    { key: 'kuaishou', label: '快手' },
    { key: 'wechat_video', label: '视频号' },
  ],
  // 平台标签颜色
  PLATFORM_COLORS: {
    douyin: '#FE2C55',
    kuaishou: '#FF6600',
    wechat_video: '#07C160',
  },
  // 维度标签
  DIMENSION_LABELS: {
    topic_angle: { label: '选题角度', color: '#8B5CF6' },
    opening_hook: { label: '开头吸引力', color: '#3B82F6' },
    info_density: { label: '信息密度', color: '#10B981' },
    emotional_resonance: { label: '情感共鸣', color: '#F59E0B' },
    cta_effectiveness: { label: 'CTA效果', color: '#EF4444' },
  },
};
