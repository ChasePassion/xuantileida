import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PricingRule } from './entities/pricing-rule.entity';
import { RechargeOrder } from './entities/recharge-order.entity';
import { ConsumeRecord } from './entities/consume-record.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    PaymentModule,
    TypeOrmModule.forFeature([
      PricingRule,
      RechargeOrder,
      ConsumeRecord,
      UserBalance,
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
