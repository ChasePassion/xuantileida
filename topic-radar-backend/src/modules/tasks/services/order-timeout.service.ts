import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { PaymentOrder } from '../../payment/entities/payment-order.entity';

const ORDER_EXPIRY_MINUTES = 15;

@Injectable()
export class OrderTimeoutService {
  private readonly logger = new Logger(OrderTimeoutService.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private readonly paymentOrderRepo: Repository<PaymentOrder>,
  ) {}

  @Cron('*/5 * * * *')
  async handleExpiredOrders() {
    const expiryTime = new Date(Date.now() - ORDER_EXPIRY_MINUTES * 60 * 1000);

    const result = await this.paymentOrderRepo.update(
      {
        status: 10,
        createdAt: LessThan(expiryTime),
      },
      {
        status: 50,
        cancelledAt: new Date(),
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`已将 ${result.affected} 个超时订单标记为已取消`);
    }
  }
}