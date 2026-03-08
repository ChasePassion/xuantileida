import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_health_scores')
@Index(['userId', 'calculatedAt'])
export class UserHealthScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ name: 'login_frequency_score', type: 'int', nullable: true })
  loginFrequencyScore: number;

  @Column({ name: 'feature_usage_score', type: 'int', nullable: true })
  featureUsageScore: number;

  @Column({ name: 'unlock_activity_score', type: 'int', nullable: true })
  unlockActivityScore: number;

  @Column({ name: 'engagement_score', type: 'int', nullable: true })
  engagementScore: number;

  @Column({ name: 'billing_health_score', type: 'int', nullable: true })
  billingHealthScore: number;

  @Column({ name: 'risk_level', length: 20, nullable: true })
  riskLevel: string; // 'low', 'medium', 'high'

  @CreateDateColumn({ name: 'calculated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  calculatedAt: Date;
}
