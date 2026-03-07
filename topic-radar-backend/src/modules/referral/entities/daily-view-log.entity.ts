import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('daily_view_logs')
@Index(['userId', 'viewDate', 'viewType'])
export class DailyViewLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @Column({ name: 'view_date', length: 10 })
  viewDate: string; // '2026-03-07'

  @Column({ name: 'view_type', length: 20 })
  viewType: string; // 'topic_detail'

  @Column({ name: 'ref_id', length: 36 })
  refId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
