import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('task_logs')
export class TaskLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_name', length: 64 })
  taskName: string;

  @Column({ length: 20, default: 'running' })
  status: string;

  @Column({ name: 'duration_ms', nullable: true })
  durationMs: number;

  @Column({ name: 'api_calls', default: 0 })
  apiCalls: number;

  @Column({ name: 'api_cost', type: 'decimal', precision: 8, scale: 4, default: 0 })
  apiCost: number;

  @Column({ name: 'records_affected', default: 0 })
  recordsAffected: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: any;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'NOW()' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
