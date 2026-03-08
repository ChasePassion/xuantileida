const api = require('../../utils/api');

Page({
  data: {
    basicAchievements: [],
    advancedAchievements: [],
    rareAchievements: [],
    unlockedCount: 0,
    totalCount: 0,
    basicUnlockedCount: 0,
    advancedUnlockedCount: 0,
    rareUnlockedCount: 0,
    progressPercent: 0,
    loading: true,
  },

  onLoad() {
    this.loadAchievements();
  },

  onShow() {
    // 每次显示时检查成就
    this.checkAchievements();
  },

  async loadAchievements() {
    this.setData({ loading: true });
    try {
      const achievements = await api.campaign.getAchievements();

      // 分类成就
      const basic = [];
      const advanced = [];
      const rare = [];

      achievements.forEach(item => {
        // 计算进度
        const current = item.current || 0;
        const target = item.target || 1;
        const progressPercent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

        // 格式化数据
        const formatted = {
          ...item,
          current,
          target,
          progressPercent,
          icon: this.getAchievementIcon(item.type),
          rewardText: this.formatReward(item.reward),
        };

        // 按稀有度分类
        if (item.rarity === 'basic') {
          basic.push(formatted);
        } else if (item.rarity === 'advanced') {
          advanced.push(formatted);
        } else if (item.rarity === 'rare') {
          rare.push(formatted);
        }
      });

      // 统计解锁数量
      const basicUnlocked = basic.filter(a => a.isUnlocked).length;
      const advancedUnlocked = advanced.filter(a => a.isUnlocked).length;
      const rareUnlocked = rare.filter(a => a.isUnlocked).length;
      const totalUnlocked = basicUnlocked + advancedUnlocked + rareUnlocked;
      const total = achievements.length;

      this.setData({
        basicAchievements: basic,
        advancedAchievements: advanced,
        rareAchievements: rare,
        basicUnlockedCount: basicUnlocked,
        advancedUnlockedCount: advancedUnlocked,
        rareUnlockedCount: rareUnlocked,
        unlockedCount: totalUnlocked,
        totalCount: total,
        progressPercent: total > 0 ? (totalUnlocked / total) * 100 : 0,
        loading: false,
      });
    } catch (e) {
      console.warn('加载成就失败:', e);
      this.setData({ loading: false });
    }
  },

  async checkAchievements() {
    try {
      await api.campaign.checkAchievements();
      // 检查后重新加载成就列表
      this.loadAchievements();
    } catch (e) {
      console.warn('检查成就失败:', e);
    }
  },

  async shareAchievement(e) {
    const { id } = e.currentTarget.dataset;
    try {
      const result = await api.campaign.shareAchievement(id);

      if (result.bonusCoins) {
        wx.showToast({
          title: `分享成功，获得 ${result.bonusCoins} 雷达币`,
          icon: 'success',
        });
      } else {
        wx.showToast({ title: '分享成功', icon: 'success' });
      }
    } catch (e) {
      wx.showToast({ title: e.message || '分享失败', icon: 'none' });
    }
  },

  getAchievementIcon(type) {
    const iconMap = {
      unlock_count: '📖',
      login_days: '📅',
      referral_count: '👥',
      topic_views: '🔍',
      share_count: '📢',
      vip_days: '👑',
      coins_earned: '💰',
      first_unlock: '🎯',
      continuous_login: '🔥',
      master: '🏆',
    };
    return iconMap[type] || '⭐';
  },

  formatReward(reward) {
    if (!reward) return '';

    const parts = [];
    if (reward.coins) parts.push(`${reward.coins} 雷达币`);
    if (reward.vipDays) parts.push(`${reward.vipDays} 天VIP`);
    if (reward.unlocks) parts.push(`${reward.unlocks} 次解锁`);

    return parts.join(' + ') || '荣誉勋章';
  },

  onShareAppMessage() {
    return {
      title: '我在选题雷达获得了新成就，快来看看！',
      path: '/pages/discover/index',
    };
  },
});
