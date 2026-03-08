import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Referral } from './entities/referral.entity';
import { ReferralReward } from './entities/referral-reward.entity';
import { ReferralTier } from './entities/referral-tier.entity';
import { DailyViewLog } from './entities/daily-view-log.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { User } from '../users/entities/user.entity';

// 奖励配置
const REWARDS = {
  REGISTER_REFERRER: 10,   // 推荐人: 新用户注册得10币
  REGISTER_NEW_USER: 5,    // 新用户: 注册礼包5币
  FIRST_RECHARGE: 20,      // 推荐人: 被推荐人首充得20币
  FIRST_VIP_COINS: 50,     // 推荐人: 被推荐人开VIP得50币
  FIRST_VIP_DAYS: 7,       // 推荐人: 被推荐人开VIP送7天VIP
  MONTHLY_CAP: 50,         // 每月注册奖励上限50人
};

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    @InjectRepository(ReferralReward)
    private readonly rewardRepo: Repository<ReferralReward>,
    @InjectRepository(ReferralTier)
    private readonly tierRepo: Repository<ReferralTier>,
    @InjectRepository(DailyViewLog)
    private readonly viewLogRepo: Repository<DailyViewLog>,
    @InjectRepository(UserBalance)
    private readonly balanceRepo: Repository<UserBalance>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 绑定推荐关系（注册时调用）
   */
  async bindReferral(referredUserId: string, referrerCode: string) {
    // referrerCode = referrer's userId or referralCode
    const referrer = await this.userRepo.findOne({
      where: { id: referrerCode, isDeleted: false },
    });
    if (!referrer) return null;
    if (referrer.id === referredUserId) return null;

    // 检查是否已绑定
    const existing = await this.referralRepo.findOne({
      where: { referredId: referredUserId },
    });
    if (existing) return null;

    const referral = this.referralRepo.create({
      referrerId: referrer.id,
      referredId: referredUserId,
      isValid: false, // 需要完成1次选题浏览才算有效
    });
    await this.referralRepo.save(referral);

    // 立即发放新用户礼包(5币)
    await this.grantCoins(referredUserId, REWARDS.REGISTER_NEW_USER, referral.id, 'new_user_gift', '新用户注册礼包');

    return referral;
  }

  /**
   * 验证推荐有效性（用户完成首次选题浏览后调用）
   */
  async validateReferral(referredUserId: string) {
    const referral = await this.referralRepo.findOne({
      where: { referredId: referredUserId, isValid: false },
    });
    if (!referral) return;

    // 检查推荐人本月已奖励人数
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthCount = await this.rewardRepo
      .createQueryBuilder('r')
      .where('r.userId = :uid', { uid: referral.referrerId })
      .andWhere('r.rewardType = :type', { type: 'register_coins' })
      .andWhere('r.createdAt >= :start', { start: monthStart })
      .getCount();

    if (monthCount >= REWARDS.MONTHLY_CAP) {
      this.logger.warn(`推荐人 ${referral.referrerId} 本月注册奖励已达上限`);
      referral.isValid = true;
      await this.referralRepo.save(referral);
      return;
    }

    // 标记有效 + 发放推荐人奖励
    referral.isValid = true;
    await this.referralRepo.save(referral);
    await this.grantCoins(referral.referrerId, REWARDS.REGISTER_REFERRER, referral.id, 'register_coins', '推荐新用户注册奖励');
  }

  /**
   * 被推荐人首次充值触发
   */
  async onFirstRecharge(referredUserId: string) {
    const referral = await this.referralRepo.findOne({
      where: { referredId: referredUserId, isValid: true, firstRecharge: false },
    });
    if (!referral) return;

    referral.firstRecharge = true;
    await this.referralRepo.save(referral);
    await this.grantCoins(referral.referrerId, REWARDS.FIRST_RECHARGE, referral.id, 'first_recharge_coins', '被推荐人首次充值奖励');
  }

  /**
   * 被推荐人首次开通VIP触发
   */
  async onFirstVip(referredUserId: string) {
    const referral = await this.referralRepo.findOne({
      where: { referredId: referredUserId, isValid: true, firstVip: false },
    });
    if (!referral) return;

    referral.firstVip = true;
    await this.referralRepo.save(referral);

    // 送50币
    await this.grantCoins(referral.referrerId, REWARDS.FIRST_VIP_COINS, referral.id, 'first_vip_coins', '被推荐人开通VIP奖励');

    // 送7天VIP
    await this.grantVipDays(referral.referrerId, REWARDS.FIRST_VIP_DAYS, referral.id);
  }

  /**
   * 获取我的推荐统计
   */
  async getMyReferralStats(userId: string) {
    const totalReferred = await this.referralRepo.count({ where: { referrerId: userId } });
    const validReferred = await this.referralRepo.count({ where: { referrerId: userId, isValid: true } });
    const totalCoinsEarned = await this.rewardRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amount), 0)', 'total')
      .where('r.userId = :uid', { uid: userId })
      .andWhere('r.rewardType LIKE :pattern', { pattern: '%coins%' })
      .getRawOne();

    return {
      totalReferred,
      validReferred,
      totalCoinsEarned: Number(totalCoinsEarned?.total || 0),
      referralCode: userId, // 推荐码就是userId
    };
  }

  /**
   * 获取推荐明细
   */
  async getMyReferrals(userId: string, page = 1, limit = 20) {
    const [list, total] = await this.referralRepo.findAndCount({
      where: { referrerId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      referrals: list.map((r) => ({
        id: r.id,
        isValid: r.isValid,
        firstRecharge: r.firstRecharge,
        firstVip: r.firstVip,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * 记录每日浏览日志（免费版限制用）
   */
  async logView(userId: string, viewType: string, refId: string) {
    const viewDate = new Date().toISOString().split('T')[0];
    const log = this.viewLogRepo.create({ userId, viewDate, viewType, refId });
    await this.viewLogRepo.save(log);
  }

  /**
   * 获取今日浏览次数
   */
  async getTodayViewCount(userId: string, viewType: string): Promise<number> {
    const viewDate = new Date().toISOString().split('T')[0];
    return this.viewLogRepo.count({ where: { userId, viewDate, viewType } });
  }

  private async grantCoins(userId: string, amount: number, referralId: string, rewardType: string, note: string) {
    await this.dataSource.transaction(async (manager) => {
      const balance = await manager.findOne(UserBalance, { where: { userId } });
      if (balance) {
        balance.balance = Number(balance.balance) + amount;
        await manager.save(balance);
      }

      const reward = manager.create(ReferralReward, {
        userId,
        referralId,
        rewardType,
        amount,
        note,
      });
      await manager.save(reward);
    });
  }

  private async grantVipDays(userId: string, days: number, referralId: string) {
    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) return;

      const now = new Date();
      const currentExpiry = user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now
        ? new Date(user.membershipExpiresAt)
        : now;
      user.membership = 'premium';
      user.membershipExpiresAt = new Date(currentExpiry.getTime() + days * 86400000);
      await manager.save(user);

      const reward = manager.create(ReferralReward, {
        userId,
        referralId,
        rewardType: 'first_vip_days',
        amount: days,
        note: `推荐奖励${days}天VIP`,
      });
      await manager.save(reward);
    });
  }

  /**
   * 获取阶梯配置
   */
  async getTiers() {
    return this.tierRepo.find({ order: { sortOrder: 'ASC' } });
  }

  /**
   * 获取用户当前等级
   */
  async getMyTier(userId: string) {
    const validCount = await this.referralRepo.count({
      where: { referrerId: userId, isValid: true },
    });
    const tiers = await this.tierRepo.find({ order: { minReferrals: 'DESC' } });
    const currentTier = tiers.find(t => validCount >= t.minReferrals) || tiers[tiers.length - 1];
    const nextTier = tiers.find(t => t.minReferrals > validCount && t.minReferrals > (currentTier?.minReferrals || 0));
    return {
      currentTier,
      validReferrals: validCount,
      nextTier: nextTier || null,
      referralsToNext: nextTier ? nextTier.minReferrals - validCount : 0,
    };
  }

  /**
   * 推荐排行榜 Top 20
   */
  async getLeaderboard(limit = 20) {
    const results = await this.referralRepo
      .createQueryBuilder('r')
      .select('r.referrer_id', 'referrerId')
      .addSelect('COUNT(*)', 'count')
      .where('r.is_valid = true')
      .groupBy('r.referrer_id')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
    return results.map((r, i) => ({
      rank: i + 1,
      referrerId: r.referrerId,
      validReferrals: Number(r.count),
    }));
  }
}
