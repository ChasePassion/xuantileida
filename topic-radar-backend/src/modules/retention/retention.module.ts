import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RetentionController } from './retention.controller';
import { RetentionService } from './retention.service';
import { RetentionOffer } from './entities/retention-offer.entity';
import { UserHealthScore } from './entities/user-health-score.entity';
import { User } from '../users/entities/user.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { ReportUnlock } from '../analysis/entities/report-unlock.entity';
import { DailyViewLog } from '../referral/entities/daily-view-log.entity';
import { RechargeOrder } from '../billing/entities/recharge-order.entity';
import { Referral } from '../referral/entities/referral.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RetentionOffer,
      UserHealthScore,
      User,
      UserBalance,
      ReportUnlock,
      DailyViewLog,
      RechargeOrder,
      Referral,
    ]),
  ],
  controllers: [RetentionController],
  providers: [RetentionService],
  exports: [RetentionService],
})
export class RetentionModule {}
