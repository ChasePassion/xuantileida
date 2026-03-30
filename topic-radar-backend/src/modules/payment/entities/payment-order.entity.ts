import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RedemptionCode } from '../../redemption/entities/redemption-code.entity';

@Entity('payment_orders')
export class PaymentOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'order_code', length: 32 })
  orderCode: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'order_type', length: 20 })
  orderType: string;

  @Column({ name: 'product_code', length: 32 })
  productCode: string;

  @Column({ name: 'product_name', length: 100 })
  productName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'int', nullable: true })
  coins: number;

  @Column({ name: 'vip_days', type: 'int', nullable: true })
  vipDays: number;

  @Column({ type: 'int', default: 10 })
  status: number;

  @Column({ name: 'pay_trade_no', length: 64, nullable: true })
  payTradeNo: string;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date;

  @Column({ name: 'refund_trade_no', length: 64, nullable: true })
  refundTradeNo: string;

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'coupon_code_id', nullable: true })
  couponCodeId: string;

  @Column({ name: 'payment_channel', length: 32, default: 'jutongbao' })
  paymentChannel: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => RedemptionCode, { nullable: true })
  @JoinColumn({ name: 'coupon_code_id' })
  couponCode: RedemptionCode;
}
