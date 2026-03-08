import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_promo_contents')
export class UserPromoContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @Column({ name: 'content_type', length: 50 })
  contentType: string;

  @Column({ length: 50 })
  platform: string;

  @Column({ name: 'generated_text', type: 'text' })
  generatedText: string;

  @Column({ name: 'context_data', type: 'jsonb', nullable: true })
  contextData: any;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
