import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_balances')
export class UserBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ name: 'total_recharged', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRecharged: number;

  @Column({ name: 'total_consumed', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalConsumed: number;

  @Column({ name: 'frozen_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  frozenAmount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.balance)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
