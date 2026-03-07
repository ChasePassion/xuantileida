import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserConfig } from './entities/user-config.entity';
import { UserBalance } from './entities/user-balance.entity';
import { ConsumeRecord } from '../billing/entities/consume-record.entity';
import { ReportUnlock } from '../analysis/entities/report-unlock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserConfig,
      UserBalance,
      ConsumeRecord,
      ReportUnlock,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
