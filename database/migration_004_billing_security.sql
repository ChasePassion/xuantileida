-- ============================================
-- 计费安全加固
-- Migration 004: Billing Hardening
-- ============================================

ALTER TABLE recharge_orders
    ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) NOT NULL DEFAULT 'recharge',
    ADD COLUMN IF NOT EXISTS product_code VARCHAR(32),
    ADD COLUMN IF NOT EXISTS coins INTEGER,
    ADD COLUMN IF NOT EXISTS vip_days INTEGER,
    ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2);

UPDATE recharge_orders
SET product_code = COALESCE(product_code, 'legacy_recharge'),
    paid_amount = COALESCE(paid_amount, amount)
WHERE product_code IS NULL
   OR paid_amount IS NULL;

ALTER TABLE recharge_orders
    ALTER COLUMN product_code SET NOT NULL,
    ALTER COLUMN paid_amount SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recharge_orders_user_status
    ON recharge_orders(user_id, status);
