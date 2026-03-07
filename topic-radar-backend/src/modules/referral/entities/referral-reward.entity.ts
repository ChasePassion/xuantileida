import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('referral_rewards')
export class ReferralReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @Column({ name: 'referral_id', length: 36 })
  referralId: string;

  @Column({ name: 'reward_type', length: 30 })
  rewardType: string; // 'register_coins' | 'first_recharge_coins' | 'first_vip_coins' | 'first_vip_days' | 'new_user_gift'

  @Column({ type: 'int', default: 0 })
  amount: number;

  @Column({ length: 200, nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
