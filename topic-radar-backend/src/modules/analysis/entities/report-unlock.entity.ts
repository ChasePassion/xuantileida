import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AnalysisReport } from './analysis-report.entity';

@Entity('report_unlocks')
@Unique(['userId', 'reportId'])
export class ReportUnlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'report_id' })
  reportId: string;

  @Column({ name: 'consume_id', nullable: true })
  consumeId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => AnalysisReport)
  @JoinColumn({ name: 'report_id' })
  report: AnalysisReport;
}
