import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'referrer_id', length: 36 })
  referrerId: string;

  @Index()
  @Column({ name: 'referred_id', length: 36, unique: true })
  referredId: string;

  @Column({ name: 'is_valid', default: false })
  isValid: boolean;

  @Column({ name: 'first_recharge', default: false })
  firstRecharge: boolean;

  @Column({ name: 'first_vip', default: false })
  firstVip: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
