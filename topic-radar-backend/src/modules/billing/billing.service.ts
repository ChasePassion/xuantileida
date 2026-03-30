import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PricingRule } from './entities/pricing-rule.entity';
import { RechargeOrder } from './entities/recharge-order.entity';
import { ConsumeRecord } from './entities/consume-record.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { User } from '../users/entities/user.entity';
import { WechatPayCallbackDto } from './dto/wechat-pay-callback.dto';
import { PaymentService } from '../payment/payment.service';

// VIP订阅价格
export const VIP_PLANS = {
  monthly: { price: 59.9, days: 30, reportsPerMonth: 5, label: '月卡' },
  yearly: { price: 499, days: 365, reportsPerMonth: 15, label: '年卡' },
};

// 雷达币充值套餐
export const COIN_PACKAGES = [
  { amount: 9.9, coins: 10, bonus: 0, label: '入门' },
  { amount: 29.9, coins: 35, bonus: 5, label: '热门' },
  { amount: 59.9, coins: 80, bonus: 20, label: '超值' },
  { amount: 99.9, coins: 150, bonus: 50, label: '豪华' },
];

// AI报告解锁价格
const REPORT_UNLOCK_COST = 5;
const CALLBACK_TOLERANCE_SECONDS = 300;

type CallbackHeaders = {
  signature?: string;
  timestamp?: string;
  nonce?: string;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
    @InjectRepository(RechargeOrder)
    private readonly orderRepo: Repository<RechargeOrder>,
    @InjectRepository(ConsumeRecord)
    private readonly consumeRepo: Repository<ConsumeRecord>,
  ) {}

  async getPricing() {
    return {
      vipPlans: Object.entries(VIP_PLANS).map(([key, plan]) => ({
        plan: key,
        price: plan.price,
        days: plan.days,
        reportsPerMonth: plan.reportsPerMonth,
        label: plan.label,
      })),
      coinPackages: COIN_PACKAGES.map((pkg) => ({
        amount: pkg.amount,
        coins: pkg.coins,
        bonus: pkg.bonus,
        total: pkg.coins + pkg.bonus,
        label: pkg.label,
      })),
      reportUnlockCost: REPORT_UNLOCK_COST,
    };
  }

  async createRechargeOrder(userId: string, amount: number) {
    const pkg = COIN_PACKAGES.find((p) => p.amount === amount);
    if (!pkg) {
      throw new BadRequestException('无效的充值金额');
    }

    return this.paymentService.createOrder(
      userId,
      'recharge',
      `coin_${Math.round(pkg.amount * 100)}`,
      `雷达币充值${pkg.coins + pkg.bonus}币`,
      pkg.amount,
      pkg.coins + pkg.bonus,
    );
  }

  async createVipOrder(userId: string, plan: string) {
    const planConfig = VIP_PLANS[plan];
    if (!planConfig) {
      throw new BadRequestException('无效的会员类型');
    }

    return this.paymentService.createOrder(
      userId,
      'vip',
      `vip_${plan}`,
      `VIP会员${planConfig.label}`,
      planConfig.price,
      undefined,
      planConfig.days,
    );
  }

  async handleWechatCallback(
    callback: WechatPayCallbackDto,
    rawBody: string,
    headers: CallbackHeaders,
  ) {
    const wechatPayConfig = this.assertWechatPayConfigured();
    this.assertValidCallbackHeaders(headers);
    this.assertRecentTimestamp(headers.timestamp!);
    this.assertValidSignature(
      rawBody,
      headers.timestamp!,
      headers.nonce!,
      headers.signature!,
      wechatPayConfig.key,
    );

    if (callback.mchid !== wechatPayConfig.mchId) {
      throw new BadRequestException('支付回调商户号不匹配');
    }

    if (callback.trade_state !== 'SUCCESS') {
      throw new BadRequestException(`支付结果非法: ${callback.trade_state}`);
    }

    return await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(RechargeOrder, {
        where: { id: callback.out_trade_no },
      });
      if (!order) {
        throw new NotFoundException('订单不存在');
      }

      const expectedAmountFen = Math.round(Number(order.paidAmount) * 100);
      if (callback.amount.total !== expectedAmountFen) {
        throw new BadRequestException('支付金额校验失败');
      }

      if (order.status === 'paid') {
        if (order.paymentNo && order.paymentNo !== callback.transaction_id) {
          throw new BadRequestException('订单已由其他支付单号处理');
        }
        return { code: 'SUCCESS', message: 'OK' };
      }

      order.status = 'paid';
      order.paymentNo = callback.transaction_id;
      order.paidAt = new Date();
      await manager.save(order);

      if (order.orderType === 'recharge') {
        await this.applyRechargeSuccess(manager, order);
      } else if (order.orderType === 'vip') {
        await this.applyVipSuccess(manager, order);
      } else {
        throw new BadRequestException(`未知订单类型: ${order.orderType}`);
      }

      return { code: 'SUCCESS', message: 'OK' };
    });
  }

  async getTransactions(
    userId: string,
    type?: string,
    page = 1,
    limit = 20,
  ) {
    if (type === 'recharge') {
      const [orders, total] = await this.orderRepo.findAndCount({
        where: { userId, status: 'paid', orderType: 'recharge' },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return {
        transactions: orders.map((o) => ({
          id: o.id,
          type: 'recharge',
          amount: Number(o.amount),
          featureType: 'recharge',
          note: '余额充值',
          createdAt: o.paidAt || o.createdAt,
        })),
        total,
        page,
        limit,
      };
    }

    const [records, total] = await this.consumeRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      transactions: records.map((r) => ({
        id: r.id,
        type: 'consume',
        amount: Number(r.amount),
        featureType: r.featureType,
        note: r.note,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  private assertWechatPayConfigured() {
    const mchId = this.configService.get<string>('wechat.pay.mchId')?.trim();
    const key = this.configService.get<string>('wechat.pay.key')?.trim();

    if (!mchId || !key) {
      throw new ServiceUnavailableException('微信支付未配置，支付功能已禁用');
    }

    return { mchId, key };
  }

  private assertValidCallbackHeaders(headers: CallbackHeaders) {
    if (!headers.signature || !headers.timestamp || !headers.nonce) {
      throw new BadRequestException('支付回调签名头缺失');
    }
  }

  private assertRecentTimestamp(timestamp: string) {
    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds)) {
      throw new BadRequestException('支付回调时间戳非法');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestampSeconds) > CALLBACK_TOLERANCE_SECONDS) {
      throw new BadRequestException('支付回调已过期');
    }
  }

  private assertValidSignature(
    rawBody: string,
    timestamp: string,
    nonce: string,
    signature: string,
    secretKey: string,
  ) {
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(`${timestamp}\n${nonce}\n${rawBody}\n`)
      .digest('hex');

    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      this.logger.warn('支付回调验签失败');
      throw new BadRequestException('支付回调验签失败');
    }
  }

  private async applyRechargeSuccess(manager: any, order: RechargeOrder) {
    const coins = Number(order.coins || 0);
    if (coins <= 0) {
      throw new BadRequestException('充值订单缺少雷达币数量');
    }

    let balance = await manager.findOne(UserBalance, {
      where: { userId: order.userId },
    });
    if (!balance) {
      balance = manager.create(UserBalance, {
        userId: order.userId,
        balance: 0,
        totalRecharged: 0,
        totalConsumed: 0,
        frozenAmount: 0,
      });
    }

    balance.balance = Number(balance.balance) + coins;
    balance.totalRecharged =
      Number(balance.totalRecharged) + Number(order.paidAmount);
    await manager.save(balance);
  }

  private async applyVipSuccess(manager: any, order: RechargeOrder) {
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
  }
}
