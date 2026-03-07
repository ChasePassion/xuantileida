import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DailyBatch } from './daily-batch.entity';
import { Category } from './category.entity';

@Entity('hot_articles')
export class HotArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id', nullable: true })
  batchId: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ length: 256 })
  title: string;

  @Column({ nullable: true, length: 128 })
  author: string;

  @Column({ name: 'account_name', nullable: true, length: 128 })
  accountName: string;

  @Column({ type: 'text', nullable: true })
  url: string;

  @Column({ name: 'read_count', default: 0 })
  readCount: number;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'heat_score', default: 0 })
  heatScore: number;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => DailyBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: DailyBatch;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
