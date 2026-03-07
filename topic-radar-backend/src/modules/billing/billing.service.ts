import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PricingRule } from './entities/pricing-rule.entity';
import { RechargeOrder } from './entities/recharge-order.entity';
import { ConsumeRecord } from './entities/consume-record.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { User } from '../users/entities/user.entity';

// VIP订阅价格
const VIP_PLANS = {
  monthly: { price: 59.9, days: 30, reportsPerMonth: 5, label: '月卡' },
  yearly: { price: 499, days: 365, reportsPerMonth: 15, label: '年卡' },
};

// 雷达币充值套餐
const COIN_PACKAGES = [
  { amount: 9.9, coins: 10, bonus: 0, label: '入门' },
  { amount: 29.9, coins: 35, bonus: 5, label: '热门' },
  { amount: 59.9, coins: 80, bonus: 20, label: '超值' },
  { amount: 99.9, coins: 150, bonus: 50, label: '豪华' },
];

// AI报告解锁价格
const REPORT_UNLOCK_COST = 5;

@Injectable()
export class BillingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PricingRule)
    private readonly pricingRepo: Repository<PricingRule>,
    @InjectRepository(RechargeOrder)
    private readonly orderRepo: Repository<RechargeOrder>,
    @InjectRepository(ConsumeRecord)
    private readonly consumeRepo: Repository<ConsumeRecord>,
    @InjectRepository(UserBalance)
    private readonly balanceRepo: Repository<UserBalance>,
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

    const order = this.orderRepo.create({
      userId,
      amount,
      status: 'pending',
    });
    await this.orderRepo.save(order);

    // TODO: 调用微信支付统一下单接口
    return {
      orderId: order.id,
      amount: Number(order.amount),
      coins: pkg.coins + pkg.bonus,
      status: order.status,
      payParams: {
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: 'placeholder',
        package: `prepay_id=placeholder_${order.id}`,
        signType: 'MD5',
        paySign: 'placeholder',
      },
    };
  }

  async createVipOrder(userId: string, plan: string) {
    const planConfig = VIP_PLANS[plan];
    if (!planConfig) {
      throw new BadRequestException('无效的会员类型');
    }

    const order = this.orderRepo.create({
      userId,
      amount: planConfig.price,
      status: 'pending',
    });
    await this.orderRepo.save(order);

    // TODO: 调用微信支付统一下单接口
    return {
      orderId: order.id,
      plan,
      price: planConfig.price,
      days: planConfig.days,
      label: planConfig.label,
      status: order.status,
      payParams: {
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: 'placeholder',
        package: `prepay_id=placeholder_${order.id}`,
        signType: 'MD5',
        paySign: 'placeholder',
      },
    };
  }

  async handleWechatCallback(paymentNo: string, orderId: string) {
    return await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(RechargeOrder, {
        where: { id: orderId, status: 'pending' },
      });
      if (!order) return { code: 'FAIL', message: '订单不存在或已处理' };

      order.status = 'paid';
      order.paymentNo = paymentNo;
      order.paidAt = new Date();
      await manager.save(order);

      // 增加雷达币余额
      const pkg = COIN_PACKAGES.find((p) => p.amount === Number(order.amount));
      if (pkg) {
        const coins = pkg.coins + pkg.bonus;
        const balance = await manager.findOne(UserBalance, {
          where: { userId: order.userId },
        });
        if (balance) {
          balance.balance = Number(balance.balance) + coins;
          balance.totalRecharged = Number(balance.totalRecharged) + Number(order.amount);
          await manager.save(balance);
        }
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
        where: { userId, status: 'paid' },
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
}
