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

  /** 钩子深度分析 (文案钩子类型/视觉钩子/强度评分/逐帧拆解) */
  @Column({ name: 'hook_analysis', type: 'jsonb', nullable: true })
  hookAnalysis: any;

  /** 留存机制分析 (开放回路/模式打断/悬念缺口/情绪节奏) */
  @Column({ name: 'retention_analysis', type: 'jsonb', nullable: true })
  retentionAnalysis: any;

  /** 病毒系数 (传播力/评论诱饵/分享触发/收藏触发) */
  @Column({ name: 'viral_score', type: 'jsonb', nullable: true })
  viralScore: any;

  /** 情感弧线 (弧线类型/触发词/身份认同钩子) */
  @Column({ name: 'emotional_arc', type: 'jsonb', nullable: true })
  emotionalArc: any;

  /** 可复制要素 (可直接复用/需要调整/不可复制) */
  @Column({ name: 'replicable_elements', type: 'jsonb', nullable: true })
  replicableElements: any;

  /** 创作建议 (标题模板/开头模板/CTA模板/A/B测试建议) */
  @Column({ name: 'creator_tips', type: 'jsonb', nullable: true })
  creatorTips: any;

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
