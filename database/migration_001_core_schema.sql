-- ============================================
-- 核心业务基线表
-- Migration 001: Core Schema
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    openid VARCHAR(64) NOT NULL UNIQUE,
    union_id VARCHAR(64),
    nickname VARCHAR(64),
    avatar_url TEXT,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    membership VARCHAR(20) NOT NULL DEFAULT 'free',
    membership_expires_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    industries JSONB NOT NULL DEFAULT '[]',
    like_threshold INTEGER NOT NULL DEFAULT 100000,
    time_range_days INTEGER NOT NULL DEFAULT 7,
    recommend_count INTEGER NOT NULL DEFAULT 30,
    push_time TIME NOT NULL DEFAULT '08:00:00',
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_recharged DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_consumed DECIMAL(10, 2) NOT NULL DEFAULT 0,
    frozen_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(32) NOT NULL UNIQUE,
    slug VARCHAR(32) NOT NULL UNIQUE,
    icon VARCHAR(16),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_date DATE NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    keyword_count INTEGER NOT NULL DEFAULT 0,
    video_count INTEGER NOT NULL DEFAULT 0,
    article_count INTEGER NOT NULL DEFAULT 0,
    api_cost DECIMAL(8, 4) NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hot_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES daily_batches(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(256) NOT NULL,
    author VARCHAR(128),
    account_name VARCHAR(128),
    url TEXT,
    read_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    heat_score INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES daily_batches(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    keyword VARCHAR(128) NOT NULL,
    heat_score INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    angles JSONB NOT NULL DEFAULT '[]',
    video_count INTEGER NOT NULL DEFAULT 0,
    rank_in_batch INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topics_batch_rank ON topics(batch_id, rank_in_batch);

CREATE TABLE IF NOT EXISTS viral_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(256) NOT NULL,
    cover_url TEXT,
    video_url TEXT,
    duration INTEGER,
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    share_count INTEGER NOT NULL DEFAULT 0,
    collect_count INTEGER NOT NULL DEFAULT 0,
    creator_name VARCHAR(128),
    creator_id VARCHAR(128),
    platform VARCHAR(20) NOT NULL DEFAULT 'wechat_video',
    dedup_hash VARCHAR(64) NOT NULL UNIQUE,
    raw_data JSONB,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS topic_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES viral_videos(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3, 2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(topic_id, video_id)
);

CREATE TABLE IF NOT EXISTS analysis_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES viral_videos(id) ON DELETE CASCADE,
    overall_score DECIMAL(3, 1) NOT NULL,
    asr_text TEXT,
    summary TEXT,
    hook_analysis JSONB,
    retention_analysis JSONB,
    viral_score JSONB,
    emotional_arc JSONB,
    replicable_elements JSONB,
    creator_tips JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    unlock_count INTEGER NOT NULL DEFAULT 0,
    api_cost DECIMAL(8, 4) NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dimension_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES analysis_reports(id) ON DELETE CASCADE,
    dimension VARCHAR(32) NOT NULL,
    score DECIMAL(3, 1) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(report_id, dimension)
);

CREATE TABLE IF NOT EXISTS script_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES analysis_reports(id) ON DELETE CASCADE,
    segment_type VARCHAR(20) NOT NULL,
    start_time INTEGER,
    end_time INTEGER,
    original_text TEXT,
    technique TEXT,
    technique_detail TEXT,
    psychology_principle TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_type VARCHAR(32) NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    description VARCHAR(256),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO pricing_rules (feature_type, price, description, is_active)
VALUES ('analysis_unlock', 8, '单条拆解报告解锁价格', true)
ON CONFLICT (feature_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS recharge_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_type VARCHAR(20) NOT NULL DEFAULT 'recharge',
    product_code VARCHAR(32) NOT NULL,
    coins INTEGER,
    vip_days INTEGER,
    amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) NOT NULL,
    payment_no VARCHAR(64) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recharge_orders_user_status ON recharge_orders(user_id, status);

CREATE TABLE IF NOT EXISTS consume_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_type VARCHAR(32) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    ref_id UUID,
    ref_type VARCHAR(32),
    note VARCHAR(256),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consume_records_user_created_at ON consume_records(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS report_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES analysis_reports(id) ON DELETE CASCADE,
    consume_id UUID REFERENCES consume_records(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, report_id)
);

CREATE TABLE IF NOT EXISTS daily_view_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,
    view_date VARCHAR(10) NOT NULL,
    view_type VARCHAR(20) NOT NULL,
    ref_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_view_logs_user_date_type
    ON daily_view_logs(user_id, view_date, view_type);

CREATE TABLE IF NOT EXISTS task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_name VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    duration_ms INTEGER,
    api_calls INTEGER NOT NULL DEFAULT 0,
    api_cost DECIMAL(8, 4) NOT NULL DEFAULT 0,
    records_affected INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
