import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { Referral } from './entities/referral.entity';
import { ReferralReward } from './entities/referral-reward.entity';
import { ReferralTier } from './entities/referral-tier.entity';
import { DailyViewLog } from './entities/daily-view-log.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Referral,
      ReferralReward,
      ReferralTier,
      DailyViewLog,
      UserBalance,
      User,
    ]),
  ],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
