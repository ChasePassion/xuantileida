-- ============================================
-- 营销增长系统数据库迁移
-- Migration 003: Marketing Growth System
-- Created: 2026-03-08
-- ============================================

-- 1. 推广笔记表
CREATE TABLE IF NOT EXISTS promo_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL,  -- 'xiaohongshu', 'weibo', 'douyin', etc.
    screenshot_url TEXT NOT NULL,
    note_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reject_reason TEXT,
    reward_type VARCHAR(20) NOT NULL,  -- 'coins', 'vip_days'
    reward_value INTEGER NOT NULL,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 推广笔记表索引
CREATE INDEX IF NOT EXISTS idx_promo_notes_user_id ON promo_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_notes_status ON promo_notes(status);

COMMENT ON TABLE promo_notes IS '推广笔记审核表';
COMMENT ON COLUMN promo_notes.platform IS '发布平台';
COMMENT ON COLUMN promo_notes.screenshot_url IS '截图URL';
COMMENT ON COLUMN promo_notes.note_url IS '笔记链接';
COMMENT ON COLUMN promo_notes.status IS '审核状态: pending-待审核, approved-已通过, rejected-已拒绝';
COMMENT ON COLUMN promo_notes.reject_reason IS '拒绝原因';
COMMENT ON COLUMN promo_notes.reward_type IS '奖励类型';
COMMENT ON COLUMN promo_notes.reward_value IS '奖励值';

-- 2. 推广模板表
CREATE TABLE IF NOT EXISTS promo_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type VARCHAR(30) NOT NULL,  -- 'new_user', 'feature', 'value', 'story'
    platform VARCHAR(30) NOT NULL,  -- 'xiaohongshu', 'weibo', 'douyin'
    target_audience VARCHAR(30),  -- 'student', 'writer', 'creator'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',  -- ['user_name', 'feature_name', etc.]
    use_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 推广模板表索引
CREATE INDEX IF NOT EXISTS idx_promo_templates_type ON promo_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_promo_templates_platform ON promo_templates(platform);

COMMENT ON TABLE promo_templates IS '推广文案模板表';
COMMENT ON COLUMN promo_templates.template_type IS '模板类型';
COMMENT ON COLUMN promo_templates.platform IS '目标平台';
COMMENT ON COLUMN promo_templates.target_audience IS '目标受众';
COMMENT ON COLUMN promo_templates.variables IS '变量列表';
COMMENT ON COLUMN promo_templates.use_count IS '使用次数';

-- 3. 用户推广内容表
CREATE TABLE IF NOT EXISTS user_promo_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(30) NOT NULL,  -- 'post', 'comment', 'bio'
    platform VARCHAR(30) NOT NULL,
    generated_text TEXT NOT NULL,
    context_data JSONB,  -- 生成上下文数据
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 用户推广内容表索引
CREATE INDEX IF NOT EXISTS idx_user_promo_contents_user_id ON user_promo_contents(user_id);

COMMENT ON TABLE user_promo_contents IS '用户生成的推广内容表';
COMMENT ON COLUMN user_promo_contents.content_type IS '内容类型';
COMMENT ON COLUMN user_promo_contents.generated_text IS '生成的文案';
COMMENT ON COLUMN user_promo_contents.context_data IS '生成上下文';
COMMENT ON COLUMN user_promo_contents.is_used IS '是否已使用';

-- 4. 留存优惠表
CREATE TABLE IF NOT EXISTS retention_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offer_type VARCHAR(30) NOT NULL,  -- 'vip_discount', 'coin_bonus', 'free_trial'
    offer_value TEXT NOT NULL,
    trigger_reason VARCHAR(50) NOT NULL,  -- 'low_engagement', 'expiring_vip', 'payment_failed'
    original_price DECIMAL(10,2),
    offer_price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'shown', 'accepted', 'expired', 'dismissed')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 留存优惠表索引
CREATE INDEX IF NOT EXISTS idx_retention_offers_user_status ON retention_offers(user_id, status);
CREATE INDEX IF NOT EXISTS idx_retention_offers_expires_at ON retention_offers(expires_at);

COMMENT ON TABLE retention_offers IS '用户留存优惠表';
COMMENT ON COLUMN retention_offers.offer_type IS '优惠类型';
COMMENT ON COLUMN retention_offers.offer_value IS '优惠内容';
COMMENT ON COLUMN retention_offers.trigger_reason IS '触发原因';
COMMENT ON COLUMN retention_offers.status IS '状态: pending-待发送, shown-已展示, accepted-已接受, expired-已过期, dismissed-已忽略';

-- 5. 用户健康分数表
CREATE TABLE IF NOT EXISTS user_health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    login_frequency_score INTEGER,
    feature_usage_score INTEGER,
    unlock_activity_score INTEGER,
    engagement_score INTEGER,
    billing_health_score INTEGER,
    risk_level VARCHAR(20),  -- 'healthy', 'at_risk', 'critical'
    calculated_at TIMESTAMPTZ DEFAULT now()
);

-- 用户健康分数表索引
CREATE INDEX IF NOT EXISTS idx_user_health_scores_user_calc ON user_health_scores(user_id, calculated_at DESC);

COMMENT ON TABLE user_health_scores IS '用户健康分数表';
COMMENT ON COLUMN user_health_scores.score IS '总体健康分数 0-100';
COMMENT ON COLUMN user_health_scores.login_frequency_score IS '登录频率分数';
COMMENT ON COLUMN user_health_scores.feature_usage_score IS '功能使用分数';
COMMENT ON COLUMN user_health_scores.unlock_activity_score IS '解锁活跃度分数';
COMMENT ON COLUMN user_health_scores.engagement_score IS '参与度分数';
COMMENT ON COLUMN user_health_scores.billing_health_score IS '付费健康分数';
COMMENT ON COLUMN user_health_scores.risk_level IS '流失风险等级';

-- 6. 营销活动表
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name VARCHAR(100) NOT NULL,
    campaign_type VARCHAR(30) CHECK (campaign_type IN ('first_recharge', 'holiday', 'recall', 'flash_sale')),
    target_audience VARCHAR(30),  -- 'new_users', 'vip_users', 'inactive_users'
    banner_url TEXT,
    description TEXT,
    rules JSONB NOT NULL,  -- 活动规则配置
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 营销活动表索引
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_active_time ON campaigns(is_active, start_at, end_at);

COMMENT ON TABLE campaigns IS '营销活动表';
COMMENT ON COLUMN campaigns.campaign_type IS '活动类型: first_recharge-首充, holiday-节日, recall-召回, flash_sale-限时';
COMMENT ON COLUMN campaigns.target_audience IS '目标受众';
COMMENT ON COLUMN campaigns.rules IS '活动规则JSON';
COMMENT ON COLUMN campaigns.max_participants IS '最大参与人数';
COMMENT ON COLUMN campaigns.current_participants IS '当前参与人数';

-- 7. 活动参与记录表
CREATE TABLE IF NOT EXISTS campaign_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(30) NOT NULL,  -- 'register', 'recharge', 'share'
    order_id UUID,  -- 关联订单ID（如果适用）
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(campaign_id, user_id, action_type)
);

-- 活动参与记录表索引
CREATE INDEX IF NOT EXISTS idx_campaign_participations_user_id ON campaign_participations(user_id);

COMMENT ON TABLE campaign_participations IS '活动参与记录表';
COMMENT ON COLUMN campaign_participations.action_type IS '参与动作类型';
COMMENT ON COLUMN campaign_participations.order_id IS '关联订单ID';

-- 8. 推荐等级表
CREATE TABLE IF NOT EXISTS referral_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name VARCHAR(50) NOT NULL,
    min_referrals INTEGER NOT NULL,  -- 最小推荐人数
    register_reward INTEGER NOT NULL,  -- 注册奖励金币
    recharge_reward INTEGER NOT NULL,  -- 充值奖励金币
    vip_reward_coins INTEGER NOT NULL,  -- VIP奖励金币
    vip_reward_days INTEGER NOT NULL,  -- VIP奖励天数
    badge_icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 推荐等级表索引
CREATE INDEX IF NOT EXISTS idx_referral_tiers_sort ON referral_tiers(sort_order);

COMMENT ON TABLE referral_tiers IS '推荐等级表';
COMMENT ON COLUMN referral_tiers.min_referrals IS '最小推荐人数';
COMMENT ON COLUMN referral_tiers.register_reward IS '注册奖励金币数';
COMMENT ON COLUMN referral_tiers.recharge_reward IS '充值奖励金币数';
COMMENT ON COLUMN referral_tiers.vip_reward_coins IS 'VIP奖励金币数';
COMMENT ON COLUMN referral_tiers.vip_reward_days IS 'VIP奖励天数';

-- 推荐等级种子数据
INSERT INTO referral_tiers (tier_name, min_referrals, register_reward, recharge_reward, vip_reward_coins, vip_reward_days, badge_icon, sort_order)
VALUES
    ('青铜推荐官', 0, 10, 20, 50, 7, 'bronze_badge.png', 1),
    ('白银推荐官', 10, 15, 30, 80, 10, 'silver_badge.png', 2),
    ('黄金推荐官', 30, 20, 50, 120, 15, 'gold_badge.png', 3),
    ('钻石推荐官', 100, 30, 80, 200, 30, 'diamond_badge.png', 4)
ON CONFLICT DO NOTHING;

-- 9. 成就表
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_key VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    condition_type VARCHAR(30) NOT NULL,  -- 'unlock_count', 'login_days', 'share_count', 'referral_count'
    condition_value INTEGER NOT NULL,
    reward_type VARCHAR(20) NOT NULL,  -- 'coins', 'vip_days'
    reward_value INTEGER NOT NULL,
    share_bonus_coins INTEGER DEFAULT 0,  -- 分享成就额外奖励
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE achievements IS '成就系统表';
COMMENT ON COLUMN achievements.achievement_key IS '成就唯一标识';
COMMENT ON COLUMN achievements.condition_type IS '达成条件类型';
COMMENT ON COLUMN achievements.condition_value IS '达成条件值';
COMMENT ON COLUMN achievements.reward_type IS '奖励类型';
COMMENT ON COLUMN achievements.reward_value IS '奖励值';
COMMENT ON COLUMN achievements.share_bonus_coins IS '分享成就的额外金币奖励';

-- 成就种子数据
INSERT INTO achievements (achievement_key, title, description, icon_url, condition_type, condition_value, reward_type, reward_value, share_bonus_coins, sort_order)
VALUES
    ('first_unlock', '初试锋芒', '解锁第1个选题', 'achievement_first.png', 'unlock_count', 1, 'coins', 10, 5, 1),
    ('unlock_10', '崭露头角', '累计解锁10个选题', 'achievement_10.png', 'unlock_count', 10, 'coins', 50, 10, 2),
    ('unlock_50', '创作能手', '累计解锁50个选题', 'achievement_50.png', 'unlock_count', 50, 'coins', 200, 20, 3),
    ('unlock_100', '选题大师', '累计解锁100个选题', 'achievement_100.png', 'unlock_count', 100, 'vip_days', 7, 30, 4),
    ('login_7', '坚持不懈', '连续登录7天', 'achievement_login7.png', 'login_days', 7, 'coins', 30, 10, 5),
    ('login_30', '忠实用户', '连续登录30天', 'achievement_login30.png', 'login_days', 30, 'vip_days', 3, 20, 6),
    ('referral_5', '人气推荐', '成功推荐5位好友', 'achievement_referral5.png', 'referral_count', 5, 'coins', 100, 15, 7),
    ('referral_20', '超级推手', '成功推荐20位好友', 'achievement_referral20.png', 'referral_count', 20, 'vip_days', 15, 30, 8)
ON CONFLICT (achievement_key) DO NOTHING;

-- 10. 用户成就表
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    shared BOOLEAN DEFAULT false,
    shared_at TIMESTAMPTZ,
    UNIQUE(user_id, achievement_id)
);

-- 用户成就表索引
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

COMMENT ON TABLE user_achievements IS '用户成就记录表';
COMMENT ON COLUMN user_achievements.unlocked_at IS '解锁时间';
COMMENT ON COLUMN user_achievements.shared IS '是否已分享';
COMMENT ON COLUMN user_achievements.shared_at IS '分享时间';

-- ============================================
-- 迁移完成
-- ============================================
