import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TopicVideo } from './topic-video.entity';

@Entity('viral_videos')
export class ViralVideo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  title: string;

  @Column({ name: 'cover_url', type: 'text', nullable: true })
  coverUrl: string;

  @Column({ name: 'video_url', type: 'text', nullable: true })
  videoUrl: string;

  @Column({ nullable: true })
  duration: number;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'comment_count', default: 0 })
  commentCount: number;

  @Column({ name: 'share_count', default: 0 })
  shareCount: number;

  @Column({ name: 'collect_count', default: 0 })
  collectCount: number;

  @Column({ name: 'creator_name', nullable: true, length: 128 })
  creatorName: string;

  @Column({ name: 'creator_id', nullable: true, length: 128 })
  creatorId: string;

  @Column({ length: 20, default: 'wechat_video' })
  platform: string;

  @Column({ name: 'dedup_hash', unique: true, length: 64 })
  dedupHash: string;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: any;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ name: 'first_seen_at', type: 'timestamptz', default: () => 'NOW()' })
  firstSeenAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => TopicVideo, (tv) => tv.video)
  topicVideos: TopicVideo[];
}
