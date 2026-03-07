import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { AnalysisReport } from './analysis-report.entity';

@Entity('dimension_scores')
@Unique(['reportId', 'dimension'])
export class DimensionScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_id' })
  reportId: string;

  @Column({ length: 32 })
  dimension: string;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  score: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => AnalysisReport, (report) => report.dimensions)
  @JoinColumn({ name: 'report_id' })
  report: AnalysisReport;
}
