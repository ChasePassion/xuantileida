import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ViralVideo } from '../../videos/entities/viral-video.entity';
import { DimensionScore } from './dimension-score.entity';
import { ScriptSegment } from './script-segment.entity';

@Entity('analysis_reports')
export class AnalysisReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'video_id' })
  videoId: string;

  @Column({ name: 'overall_score', type: 'decimal', precision: 3, scale: 1 })
  overallScore: number;

  @Column({ name: 'asr_text', type: 'text', nullable: true })
  asrText: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'unlock_count', default: 0 })
  unlockCount: number;

  @Column({ name: 'api_cost', type: 'decimal', precision: 8, scale: 4, default: 0 })
  apiCost: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => ViralVideo)
  @JoinColumn({ name: 'video_id' })
  video: ViralVideo;

  @OneToMany(() => DimensionScore, (ds) => ds.report)
  dimensions: DimensionScore[];

  @OneToMany(() => ScriptSegment, (ss) => ss.report)
  scriptSegments: ScriptSegment[];
}
