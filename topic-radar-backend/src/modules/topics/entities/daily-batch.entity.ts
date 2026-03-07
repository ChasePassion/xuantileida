import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Topic } from './topic.entity';

@Entity('daily_batches')
export class DailyBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_date', type: 'date', unique: true })
  batchDate: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'keyword_count', default: 0 })
  keywordCount: number;

  @Column({ name: 'video_count', default: 0 })
  videoCount: number;

  @Column({ name: 'article_count', default: 0 })
  articleCount: number;

  @Column({ name: 'api_cost', type: 'decimal', precision: 8, scale: 4, default: 0 })
  apiCost: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Topic, (topic) => topic.batch)
  topics: Topic[];
}
