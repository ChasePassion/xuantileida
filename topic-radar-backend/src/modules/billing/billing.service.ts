import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PricingRule } from './entities/pricing-rule.entity';
import { RechargeOrder } from './entities/recharge-order.entity';
import { ConsumeRecord } from './entities/consume-record.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { User } from '../users/entities/user.entity';
import { InsufficientBalanceException } from '../../common/exceptions/business.exceptions';

const MEMBERSHIP_PLANS: Record<string, { days: number; featureType: string }> = {
  monthly: { days: 30, featureType: 'membership_monthly' },
  quarterly: { days: 90, featureType: 'membership_quarterly' },
  yearly: { days: 365, featureType: 'membership_yearly' },
};

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
    const rules = await this.pricingRepo.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
    return {
      features: rules.map((r) => ({
        featureType: r.featureType,
        price: Number(r.price),
        description: r.description,
      })),
    };
  }

  async createRechargeOrder(userId: string, amount: number) {
    const order = this.orderRepo.create({
      userId,
      amount,
      status: 'pending',
    });
    await this.orderRepo.save(order);

    // TODO: 调用微信支付统一下单接口获取 payParams
    return {
      orderId: order.id,
      amount: Number(order.amount),
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

      // 更新订单
      order.status = 'paid';
      order.paymentNo = paymentNo;
      order.paidAt = new Date();
      await manager.save(order);

      // 增加余额
      const balance = await manager.findOne(UserBalance, {
        where: { userId: order.userId },
      });
      if (balance) {
        balance.balance = Number(balance.balance) + Number(order.amount);
        balance.totalRecharged =
          Number(balance.totalRecharged) + Number(order.amount);
        await manager.save(balance);
      }

      return { code: 'SUCCESS', message: 'OK' };
    });
  }

  async purchaseMembership(userId: string, plan: string) {
    const planConfig = MEMBERSHIP_PLANS[plan];
    if (!planConfig) {
      throw new BadRequestException('无效的会员类型');
    }

    const pricing = await this.pricingRepo.findOne({
      where: { featureType: planConfig.featureType, isActive: true },
    });
    const price = Number(pricing?.price || 0);
    if (price <= 0) {
      throw new BadRequestException('该会员类型暂不可购买');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 检查余额
      const balance = await manager.findOne(UserBalance, { where: { userId } });
      if (!balance || Number(balance.balance) < price) {
        throw new InsufficientBalanceException(
          Number(balance?.balance || 0),
          price,
        );
      }

      // 扣减余额
      balance.balance = Number(balance.balance) - price;
      balance.totalConsumed = Number(balance.totalConsumed) + price;
      await manager.save(balance);

      // 更新用户会员状态
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException('用户不存在');

      const now = new Date();
      const currentExpiry = user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now
        ? new Date(user.membershipExpiresAt)
        : now;
      const newExpiry = new Date(currentExpiry.getTime() + planConfig.days * 86400000);

      user.membership = 'premium';
      user.membershipExpiresAt = newExpiry;
      await manager.save(user);

      // 消费记录
      const consume = manager.create(ConsumeRecord, {
        userId,
        featureType: planConfig.featureType,
        amount: price,
        refId: userId,
        refType: 'membership',
        note: `购买${plan === 'monthly' ? '月度' : plan === 'quarterly' ? '季度' : '年度'}会员`,
      });
      await manager.save(consume);

      return {
        membership: 'premium',
        expiresAt: newExpiry,
        consumed: price,
        remainingBalance: Number(balance.balance),
      };
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

    // 默认返回消费记录
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
