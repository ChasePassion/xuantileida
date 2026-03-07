import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { DailyBatch } from './daily-batch.entity';
import { Category } from './category.entity';
import { TopicVideo } from '../../videos/entities/topic-video.entity';

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id' })
  batchId: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ length: 128 })
  keyword: string;

  @Column({ name: 'heat_score', default: 0 })
  heatScore: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'jsonb', default: '[]' })
  angles: string[];

  @Column({ name: 'video_count', default: 0 })
  videoCount: number;

  @Column({ name: 'rank_in_batch', default: 0 })
  rankInBatch: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => DailyBatch, (batch) => batch.topics)
  @JoinColumn({ name: 'batch_id' })
  batch: DailyBatch;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => TopicVideo, (tv) => tv.topic)
  topicVideos: TopicVideo[];
}
