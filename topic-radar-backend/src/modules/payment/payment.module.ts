import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentOrder } from './entities/payment-order.entity';
import { User } from '../users/entities/user.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { RedemptionCode } from '../redemption/entities/redemption-code.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder, User, UserBalance, RedemptionCode]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
