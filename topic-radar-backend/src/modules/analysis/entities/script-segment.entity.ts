import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AnalysisReport } from './analysis-report.entity';

@Entity('script_segments')
export class ScriptSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_id' })
  reportId: string;

  @Column({ name: 'segment_type', length: 20 })
  segmentType: string;

  @Column({ name: 'start_time', nullable: true })
  startTime: number;

  @Column({ name: 'end_time', nullable: true })
  endTime: number;

  @Column({ name: 'original_text', type: 'text', nullable: true })
  originalText: string;

  @Column({ type: 'text', nullable: true })
  technique: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => AnalysisReport, (report) => report.scriptSegments)
  @JoinColumn({ name: 'report_id' })
  report: AnalysisReport;
}
