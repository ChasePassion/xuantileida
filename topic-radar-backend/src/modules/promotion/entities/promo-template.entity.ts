import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('promo_templates')
export class PromoTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_type', length: 50 })
  templateType: string;

  @Column({ length: 50 })
  platform: string;

  @Column({ name: 'target_audience', length: 100 })
  targetAudience: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  variables: any;

  @Column({ name: 'use_count', type: 'int', default: 0 })
  useCount: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
