import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Topic } from '../../topics/entities/topic.entity';
import { ViralVideo } from './viral-video.entity';

@Entity('topic_videos')
@Unique(['topicId', 'videoId'])
export class TopicVideo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'topic_id' })
  topicId: string;

  @Column({ name: 'video_id' })
  videoId: string;

  @Column({ name: 'relevance_score', type: 'decimal', precision: 3, scale: 2, default: 0 })
  relevanceScore: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Topic, (topic) => topic.topicVideos)
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;

  @ManyToOne(() => ViralVideo, (video) => video.topicVideos)
  @JoinColumn({ name: 'video_id' })
  video: ViralVideo;
}
