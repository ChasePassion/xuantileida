import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('referral_tiers')
export class ReferralTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tier_name', length: 50 })
  tierName: string;

  @Column({ name: 'min_referrals', type: 'integer' })
  minReferrals: number;

  @Column({ name: 'register_reward', type: 'integer' })
  registerReward: number;

  @Column({ name: 'recharge_reward', type: 'integer' })
  rechargeReward: number;

  @Column({ name: 'vip_reward_coins', type: 'integer' })
  vipRewardCoins: number;

  @Column({ name: 'vip_reward_days', type: 'integer' })
  vipRewardDays: number;

  @Column({ name: 'badge_icon', type: 'text', nullable: true })
  badgeIcon: string | null;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
