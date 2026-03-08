import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('retention_offers')
@Index(['userId', 'status'])
export class RetentionOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @Column({ name: 'offer_type', length: 30 })
  offerType: string; // 'discount', 'extend_trial', 'bonus_coins'

  @Column({ name: 'offer_value', type: 'text' })
  offerValue: string; // JSON string with offer details

  @Column({ name: 'trigger_reason', length: 50 })
  triggerReason: string; // 'expiring_7d', 'expiring_3d', 'expiring_1d', 'expired_1d', 'expired_7d'

  @Column({ name: 'original_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalPrice: number | null;

  @Column({ name: 'offer_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  offerPrice: number | null;

  @Column({ length: 20, default: 'pending' })
  status: string; // 'pending', 'shown', 'accepted', 'dismissed', 'expired'

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
