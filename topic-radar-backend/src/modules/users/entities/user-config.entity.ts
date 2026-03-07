import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_configs')
export class UserConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'jsonb', default: '[]' })
  industries: string[];

  @Column({ name: 'like_threshold', default: 100000 })
  likeThreshold: number;

  @Column({ name: 'time_range_days', default: 7 })
  timeRangeDays: number;

  @Column({ name: 'recommend_count', default: 30 })
  recommendCount: number;

  @Column({ name: 'push_time', type: 'time', default: '08:00:00' })
  pushTime: string;

  @Column({ name: 'push_enabled', default: true })
  pushEnabled: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.config)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
