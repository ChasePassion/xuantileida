import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaymentOrder } from './entities/payment-order.entity';
import { User } from '../users/entities/user.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { RedemptionCode } from '../redemption/entities/redemption-code.entity';
import { ReturnPaymentStatusDto } from './dto/return-payment-status.dto';

type PaymentOrderType = 'recharge' | 'vip';

type ThirdPartyPayParams = {
  timeStamp: string;
  package: string;
  paySign: string;
  appId: string;
  signType: string;
  nonceStr: string;
};

type ThirdPartyPayResponse = {
  data?: string;
  error_code?: number;
  success?: boolean;
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @InjectRepository(PaymentOrder)
    private readonly paymentOrderRepo: Repository<PaymentOrder>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserBalance)
    private readonly userBalanceRepo: Repository<UserBalance>,
    @InjectRepository(RedemptionCode)
    private readonly redemptionCodeRepo: Repository<RedemptionCode>,
  ) {}

  async createOrder(
    userId: string,
    orderType: PaymentOrderType,
    productCode: string,
    productName: string,
    amount: number,
    coins?: number,
    vipDays?: number,
  ) {
    const user = await this.userRepo.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (!user.openid) {
      throw new BadRequestException('用户未绑定openId');
    }

    const orderCode = this.generateOrderCode();
    const order = this.paymentOrderRepo.create({
      orderCode,
      userId,
      orderType,
      productCode,
      productName,
      amount,
      coins,
      vipDays,
      status: 10,
      paymentChannel: 'jutongbao',
    });
    await this.paymentOrderRepo.save(order);

    const payParams = await this.requestThirdPartyPayment(orderCode, user.openid);
    return { payParams };
  }

  async getPaymentAmountAndStatus(orderCode: string) {
    const order = await this.paymentOrderRepo.findOne({
      where: { orderCode },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return {
      price: Number(order.amount),
      state: this.mapOrderState(order.status),
      name: order.productName,
    };
  }

  async returnPaymentStatus(dto: ReturnPaymentStatusDto) {
    if (![1, 2].includes(dto.paymentState)) {
      throw new UnprocessableEntityException('paymentState参数非法');
    }

    const finishAt = new Date(dto.finishTime);
    if (Number.isNaN(finishAt.getTime())) {
      throw new UnprocessableEntityException('finishTime参数非法');
    }

    return this.dataSource.transaction(async (manager) => {
      const order = await manager
        .createQueryBuilder(PaymentOrder, 'order')
        .setLock('pessimistic_write')
        .where('order.order_code = :orderCode', { orderCode: dto.order })
        .getOne();

      if (!order) {
        throw new NotFoundException('订单不存在');
      }

      if (dto.paymentState === 1) {
        await this.handlePaidCallback(manager, order, dto.wxTransactionId, finishAt);
      } else {
        await this.handleRefundCallback(manager, order, dto.wxTransactionId, finishAt);
      }

      return { success: true, code: 200 };
    });
  }

  private async requestThirdPartyPayment(
    orderCode: string,
    openId: string,
  ): Promise<ThirdPartyPayParams> {
    const appId =
      this.configService.get<string>('wechat.appId') || 'wx9221c6714e5f1169';
    const url =
      this.configService.get<string>('api.thirdPartyPayment.url') ||
      'https://applet.jutongbao.online/wechat/api/v1/applet/payment/pay';

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          appId,
          openId,
        },
        body: JSON.stringify({
          orderCode,
          payType: 102,
        }),
      });
    } catch (error) {
      this.logger.error('第三方支付下单请求失败', error);
      throw new ServiceUnavailableException('第三方支付服务不可用');
    }

    if (!response.ok) {
      this.logger.error(`第三方支付下单失败: HTTP ${response.status}`);
      throw new ServiceUnavailableException('第三方支付下单失败');
    }

    const result = (await response.json()) as ThirdPartyPayResponse;
    if (!result.success || !result.data) {
      this.logger.error(
        `第三方支付返回异常: success=${result.success}, error_code=${result.error_code}`,
      );
      throw new ServiceUnavailableException('第三方支付返回异常');
    }

    try {
      const payParams = JSON.parse(result.data) as ThirdPartyPayParams;
      return {
        timeStamp: payParams.timeStamp,
        package: payParams.package,
        paySign: payParams.paySign,
        appId: payParams.appId,
        signType: payParams.signType,
        nonceStr: payParams.nonceStr,
      };
    } catch (error) {
      this.logger.error('第三方支付参数解析失败', error);
      throw new ServiceUnavailableException('第三方支付参数解析失败');
    }
  }

  private async handlePaidCallback(
    manager: EntityManager,
    order: PaymentOrder,
    wxTransactionId: string,
    finishAt: Date,
  ) {
    if ([20, 30].includes(order.status)) {
      if (order.payTradeNo && order.payTradeNo !== wxTransactionId) {
        throw new ConflictException('订单已由其他支付流水处理');
      }
      return;
    }

    if ([40, 50, 60].includes(order.status)) {
      throw new ConflictException('订单状态冲突');
    }

    if (order.status !== 10) {
      throw new ConflictException('订单状态不可支付');
    }

    order.status = 20;
    order.paidAt = finishAt;
    order.payTradeNo = wxTransactionId;

    const effectValue =
      order.orderType === 'recharge'
        ? Number(order.coins || 0)
        : Number(order.vipDays || 0);
    const couponCode = await this.generateCouponCode(
      manager,
      order.id,
      order.orderType as PaymentOrderType,
      effectValue,
      order.orderCode,
    );
    order.couponCodeId = couponCode.id;

    await this.applyPaymentEffect(manager, order);
    await manager.save(order);
  }

  private async handleRefundCallback(
    manager: EntityManager,
    order: PaymentOrder,
    wxTransactionId: string,
    finishAt: Date,
  ) {
    if (order.status === 40) {
      if (order.refundTradeNo && order.refundTradeNo !== wxTransactionId) {
        throw new ConflictException('订单已由其他退款流水处理');
      }
      return;
    }

    if ([50, 60].includes(order.status)) {
      throw new ConflictException('订单已取消');
    }

    order.status = 40;
    order.refundedAt = finishAt;
    order.refundTradeNo = wxTransactionId;
    await manager.save(order);
  }

  private generateOrderCode(): string {
    const epochSeconds = Date.now().toString().slice(0, -3);
    const randomSuffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `XTLD${epochSeconds}${randomSuffix}`;
  }

  private async generateCouponCode(
    manager: EntityManager,
    orderId: string,
    orderType: PaymentOrderType,
    value: number,
    orderCode: string,
  ) {
    if (value <= 0) {
      throw new BadRequestException('支付订单权益值非法');
    }

    const couponCode = manager.create(RedemptionCode, {
      code: `PV${orderCode.slice(-18)}`,
      codeType: 'payment_voucher',
      value,
      maxUses: 1,
      batchName: orderCode,
      isActive: true,
    });

    const savedCode = await manager.save(couponCode);
    this.logger.log(
      `支付券生成成功 order=${orderCode}, orderId=${orderId}, type=${orderType}, value=${value}`,
    );
    return savedCode;
  }

  private async applyPaymentEffect(manager: EntityManager, order: PaymentOrder) {
    if (order.orderType === 'recharge') {
      const coins = Number(order.coins || 0);
      if (coins <= 0) {
        throw new BadRequestException('充值订单缺少雷达币数量');
      }

      let balance = await manager.findOne(UserBalance, {
        where: { userId: order.userId },
      });

      if (!balance) {
        balance = this.userBalanceRepo.create({
          userId: order.userId,
          balance: 0,
          totalRecharged: 0,
          totalConsumed: 0,
          frozenAmount: 0,
        });
      }

      balance.balance = Number(balance.balance) + coins;
      balance.totalRecharged = Number(balance.totalRecharged) + Number(order.amount);
      await manager.save(balance);
      return;
    }

    if (order.orderType === 'vip') {
      const vipDays = Number(order.vipDays || 0);
      if (vipDays <= 0) {
        throw new BadRequestException('会员订单缺少生效天数');
      }

      const user = await manager.findOne(User, {
        where: { id: order.userId, isDeleted: false },
      });
      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      const now = new Date();
      const baseDate =
        user.membership === 'premium' &&
        user.membershipExpiresAt &&
        new Date(user.membershipExpiresAt) > now
          ? new Date(user.membershipExpiresAt)
          : now;
      const expiresAt = new Date(baseDate);
      expiresAt.setDate(expiresAt.getDate() + vipDays);

      user.membership = 'premium';
      user.membershipExpiresAt = expiresAt;
      await manager.save(user);
      return;
    }

    throw new BadRequestException(`未知订单类型: ${order.orderType}`);
  }

  private mapOrderState(status: number): number {
    if (status === 10) {
      return 0;
    }

    if ([20, 30].includes(status)) {
      return 1;
    }

    if (status === 40) {
      return 2;
    }

    if ([50, 60].includes(status)) {
      return 3;
    }

    return 0;
  }
}
