import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('promo_notes')
export class PromoNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 50 })
  platform: string;

  @Column({ name: 'screenshot_url', type: 'text' })
  screenshotUrl: string;

  @Column({ name: 'note_url', type: 'text', nullable: true })
  noteUrl: string;

  @Column({ length: 20, default: 'pending' })
  status: string; // 'pending' | 'approved' | 'rejected'

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason: string;

  @Column({ name: 'reward_type', length: 20, nullable: true })
  rewardType: string; // 'vip_days' | 'coins'

  @Column({ name: 'reward_value', type: 'int', nullable: true })
  rewardValue: number;

  @Column({ name: 'reviewer_id', nullable: true })
  reviewerId: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
