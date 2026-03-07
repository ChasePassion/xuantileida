import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { UserConfig } from './user-config.entity';
import { UserBalance } from './user-balance.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 64 })
  openid: string;

  @Column({ name: 'union_id', nullable: true, length: 64 })
  unionId: string;

  @Column({ nullable: true, length: 64 })
  nickname: string;

  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl: string;

  @Column({ nullable: true, length: 20 })
  phone: string;

  @Column({ length: 20, default: 'free' })
  membership: string;

  @Column({ name: 'membership_expires_at', type: 'timestamptz', nullable: true })
  membershipExpiresAt: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => UserConfig, (config) => config.user)
  config: UserConfig;

  @OneToOne(() => UserBalance, (balance) => balance.user)
  balance: UserBalance;
}
