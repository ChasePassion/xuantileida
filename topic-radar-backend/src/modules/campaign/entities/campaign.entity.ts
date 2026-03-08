import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_name', length: 100 })
  campaignName: string;

  @Column({ name: 'campaign_type', length: 30 })
  campaignType: string;

  @Column({ name: 'target_audience', length: 30, nullable: true })
  targetAudience: string;

  @Column({ name: 'banner_url', type: 'text', nullable: true })
  bannerUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  rules: Record<string, any>;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Column({ name: 'max_participants', type: 'integer', nullable: true })
  maxParticipants: number;

  @Column({ name: 'current_participants', type: 'integer', default: 0 })
  currentParticipants: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
