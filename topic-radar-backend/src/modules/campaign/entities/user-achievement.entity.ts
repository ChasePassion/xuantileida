import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Achievement } from './achievement.entity';

@Entity('user_achievements')
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'achievement_id' })
  achievementId: string;

  @Column({ name: 'unlocked_at', type: 'timestamptz', default: () => 'NOW()' })
  unlockedAt: Date;

  @Column({ default: false })
  shared: boolean;

  @Column({ name: 'shared_at', type: 'timestamptz', nullable: true })
  sharedAt: Date;

  @ManyToOne(() => Achievement)
  @JoinColumn({ name: 'achievement_id' })
  achievement: Achievement;
}
