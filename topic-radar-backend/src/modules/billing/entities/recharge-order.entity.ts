import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('recharge_orders')
export class RechargeOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'order_type', length: 20, default: 'recharge' })
  orderType: string;

  @Column({ name: 'product_code', length: 32 })
  productCode: string;

  @Column({ nullable: true })
  coins: number;

  @Column({ name: 'vip_days', nullable: true })
  vipDays: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 10, scale: 2 })
  paidAmount: number;

  @Column({ name: 'payment_no', nullable: true, unique: true, length: 64 })
  paymentNo: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
