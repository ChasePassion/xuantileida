import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'achievement_key', length: 50, unique: true })
  achievementKey: string;

  @Column({ length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'icon_url', type: 'text', nullable: true })
  iconUrl: string;

  @Column({ name: 'condition_type', length: 30 })
  conditionType: string;

  @Column({ name: 'condition_value', type: 'integer' })
  conditionValue: number;

  @Column({ name: 'reward_type', length: 20, nullable: true })
  rewardType: string;

  @Column({ name: 'reward_value', type: 'integer', nullable: true })
  rewardValue: number;

  @Column({ name: 'share_bonus_coins', type: 'integer', default: 0 })
  shareBonusCoins: number;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
