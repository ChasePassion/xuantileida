import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('redemption_records')
export class RedemptionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @Column({ name: 'code_id', length: 36 })
  codeId: string;

  @Column({ length: 20 })
  code: string;

  @Column({ name: 'code_type', length: 20 })
  codeType: string;

  @Column({ type: 'int' })
  value: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
