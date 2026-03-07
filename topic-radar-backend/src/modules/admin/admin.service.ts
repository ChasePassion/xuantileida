import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { RechargeOrder } from '../billing/entities/recharge-order.entity';
import { RedemptionCode } from '../redemption/entities/redemption-code.entity';
import { RedemptionRecord } from '../redemption/entities/redemption-record.entity';
import { Referral } from '../referral/entities/referral.entity';
import { ReferralReward } from '../referral/entities/referral-reward.entity';
import { DailyBatch } from '../topics/entities/daily-batch.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserBalance)
    private readonly balanceRepo: Repository<UserBalance>,
    @InjectRepository(RechargeOrder)
    private readonly orderRepo: Repository<RechargeOrder>,
    @InjectRepository(RedemptionCode)
    private readonly codeRepo: Repository<RedemptionCode>,
    @InjectRepository(RedemptionRecord)
    private readonly recordRepo: Repository<RedemptionRecord>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    @InjectRepository(ReferralReward)
    private readonly rewardRepo: Repository<ReferralReward>,
    @InjectRepository(DailyBatch)
    private readonly batchRepo: Repository<DailyBatch>,
  ) {}

  // ========== 仪表盘 ==========

  async getDashboard() {
    const totalUsers = await this.userRepo.count({ where: { isDeleted: false } });
    const vipUsers = await this.userRepo
      .createQueryBuilder('u')
      .where("u.membership = 'premium'")
      .andWhere('u.membership_expires_at > NOW()')
      .getCount();

    const today = new Date().toISOString().split('T')[0];
    const todayUsers = await this.userRepo
      .createQueryBuilder('u')
      .where('DATE(u.created_at) = :today', { today })
      .getCount();

    const totalOrders = await this.orderRepo.count();
    const paidOrders = await this.orderRepo.count({ where: { status: 'paid' } });

    const revenueResult = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.amount)', 'total')
      .where("o.status = 'paid'")
      .getRawOne();
    const totalRevenue = parseFloat(revenueResult?.total || '0');

    const todayRevenueResult = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.amount)', 'total')
      .where("o.status = 'paid'")
      .andWhere('DATE(o.created_at) = :today', { today })
      .getRawOne();
    const todayRevenue = parseFloat(todayRevenueResult?.total || '0');

    const totalReferrals = await this.referralRepo.count();
    const validReferrals = await this.referralRepo.count({ where: { isValid: true } });

    const latestBatch = await this.batchRepo.findOne({
      where: { status: 'completed' },
      order: { batchDate: 'DESC' },
    });

    return {
      users: { total: totalUsers, vip: vipUsers, today: todayUsers },
      orders: { total: totalOrders, paid: paidOrders },
      revenue: { total: totalRevenue, today: todayRevenue },
      referrals: { total: totalReferrals, valid: validReferrals },
      latestBatch: latestBatch
        ? { date: latestBatch.batchDate, keywords: latestBatch.keywordCount, videos: latestBatch.videoCount }
        : null,
    };
  }

  // ========== 用户管理 ==========

  async getUsers(page = 1, limit = 20, search?: string) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.balance', 'b')
      .where('u.is_deleted = false');

    if (search) {
      qb.andWhere('(u.nickname ILIKE :s OR u.phone ILIKE :s OR u.openid ILIKE :s)', { s: `%${search}%` });
    }

    qb.orderBy('u.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      users: users.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        phone: u.phone,
        membership: u.membership,
        membershipExpiresAt: u.membershipExpiresAt,
        role: u.role,
        balance: u.balance?.balance || 0,
        createdAt: u.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async setUserRole(userId: string, role: string) {
    await this.userRepo.update(userId, { role });
    return { success: true };
  }

  async setUserMembership(userId: string, membership: string, days: number) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    await this.userRepo.update(userId, { membership, membershipExpiresAt: expiresAt });
    return { success: true, expiresAt };
  }

  // ========== 订单管理 ==========

  async getOrders(page = 1, limit = 20, status?: string) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoin('o.user', 'u')
      .addSelect(['u.id', 'u.nickname', 'u.phone']);

    if (status) {
      qb.where('o.status = :status', { status });
    }

    qb.orderBy('o.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await qb.getManyAndCount();

    return {
      orders: orders.map((o) => ({
        id: o.id,
        userId: o.user?.id,
        userName: o.user?.nickname || o.user?.phone || '-',
        amount: o.amount,
        status: o.status,
        paymentNo: o.paymentNo,
        paidAt: o.paidAt,
        createdAt: o.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  // ========== 兑换码管理 ==========

  async getCodes(page = 1, limit = 20) {
    const [codes, total] = await this.codeRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { codes, total, page, limit };
  }

  async generateCodes(codeType: string, value: number, count: number, batchName?: string, maxUses = 1, expiresInDays?: number) {
    const codes: RedemptionCode[] = [];
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : undefined;

    for (let i = 0; i < count; i++) {
      const codeStr = 'TR' + this.randomString(8);
      const entity = this.codeRepo.create({
        code: codeStr,
        codeType,
        value,
        maxUses,
        batchName: batchName || `batch_${new Date().toISOString().split('T')[0]}`,
        expiresAt,
      });
      codes.push(entity);
    }

    const saved = await this.codeRepo.save(codes);
    return { generated: saved.length, codes: saved.map((c) => c.code) };
  }

  async getRedemptionRecords(page = 1, limit = 20) {
    const qb = this.recordRepo
      .createQueryBuilder('r')
      .leftJoin(User, 'u', 'u.id = r.user_id')
      .addSelect(['u.nickname', 'u.phone'])
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  // ========== 推荐数据 ==========

  async getReferralStats() {
    const totalReferrals = await this.referralRepo.count();
    const validReferrals = await this.referralRepo.count({ where: { isValid: true } });
    const vipConversions = await this.referralRepo.count({ where: { firstVip: true } });

    const rewardResult = await this.rewardRepo
      .createQueryBuilder('r')
      .select('SUM(r.amount)', 'total')
      .getRawOne();
    const totalRewards = parseFloat(rewardResult?.total || '0');

    // top referrers
    const topReferrers = await this.referralRepo
      .createQueryBuilder('ref')
      .select('ref.referrer_id', 'referrerId')
      .addSelect('COUNT(*)', 'count')
      .leftJoin(User, 'u', 'u.id = ref.referrer_id')
      .addSelect('u.nickname', 'nickname')
      .groupBy('ref.referrer_id')
      .addGroupBy('u.nickname')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total: totalReferrals,
      valid: validReferrals,
      vipConversions,
      totalRewardsGranted: totalRewards,
      topReferrers,
    };
  }

  private randomString(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
