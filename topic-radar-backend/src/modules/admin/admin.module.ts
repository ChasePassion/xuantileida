import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { RechargeOrder } from '../billing/entities/recharge-order.entity';
import { RedemptionCode } from '../redemption/entities/redemption-code.entity';
import { RedemptionRecord } from '../redemption/entities/redemption-record.entity';
import { Referral } from '../referral/entities/referral.entity';
import { ReferralReward } from '../referral/entities/referral-reward.entity';
import { DailyBatch } from '../topics/entities/daily-batch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserBalance,
      RechargeOrder,
      RedemptionCode,
      RedemptionRecord,
      Referral,
      ReferralReward,
      DailyBatch,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
