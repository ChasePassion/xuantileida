import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedemptionController } from './redemption.controller';
import { RedemptionService } from './redemption.service';
import { RedemptionCode } from './entities/redemption-code.entity';
import { RedemptionRecord } from './entities/redemption-record.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RedemptionCode, RedemptionRecord, User]),
  ],
  controllers: [RedemptionController],
  providers: [RedemptionService],
  exports: [RedemptionService],
})
export class RedemptionModule {}
