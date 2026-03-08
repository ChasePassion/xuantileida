import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { RetentionOffer } from './entities/retention-offer.entity';
import { UserHealthScore } from './entities/user-health-score.entity';
import { User } from '../users/entities/user.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { ReportUnlock } from '../analysis/entities/report-unlock.entity';
import { DailyViewLog } from '../referral/entities/daily-view-log.entity';
import { RechargeOrder } from '../billing/entities/recharge-order.entity';
import { Referral } from '../referral/entities/referral.entity';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RetentionOffer)
    private readonly offerRepo: Repository<RetentionOffer>,
    @InjectRepository(UserHealthScore)
    private readonly healthScoreRepo: Repository<UserHealthScore>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserBalance)
    private readonly balanceRepo: Repository<UserBalance>,
  ) {}

  /**
   * Get all pending/shown retention offers for user
   */
  async getMyOffers(userId: string) {
    const now = new Date();
    const offers = await this.offerRepo.find({
      where: {
        userId,
        status: 'pending' as any, // Will match 'pending' or 'shown'
        expiresAt: MoreThan(now),
      },
      order: { createdAt: 'DESC' },
    });

    // Filter to only pending or shown
    const validOffers = offers.filter(o => o.status === 'pending' || o.status === 'shown');

    return validOffers.map(offer => ({
      id: offer.id,
      offerType: offer.offerType,
      offerValue: JSON.parse(offer.offerValue),
      triggerReason: offer.triggerReason,
      originalPrice: offer.originalPrice,
      offerPrice: offer.offerPrice,
      status: offer.status,
      expiresAt: offer.expiresAt,
      createdAt: offer.createdAt,
    }));
  }

  /**
   * Accept a retention offer
   */
  async acceptOffer(offerId: string, userId: string) {
    return await this.dataSource.transaction(async (manager) => {
      // Verify offer belongs to user and is pending/shown
      const offer = await manager.findOne(RetentionOffer, {
        where: { id: offerId, userId },
      });

      if (!offer) {
        throw new NotFoundException('Offer not found');
      }

      if (offer.status !== 'pending' && offer.status !== 'shown') {
        throw new BadRequestException('Offer is not available');
      }

      if (new Date() > offer.expiresAt) {
        throw new BadRequestException('Offer has expired');
      }

      // Mark as accepted
      offer.status = 'accepted';
      offer.acceptedAt = new Date();
      await manager.save(offer);

      // Apply the offer based on type
      const offerValue = JSON.parse(offer.offerValue);

      if (offer.offerType === 'discount') {
        // Create a recharge order with discounted price
        const rechargeOrder = manager.create(RechargeOrder, {
          userId,
          amount: offer.offerPrice ?? 0,
          status: 'pending',
        });
        await manager.save(rechargeOrder);

        this.logger.log(`Created discounted recharge order ${rechargeOrder.id} for user ${userId}`);
        return { success: true, orderId: rechargeOrder.id };
      } else if (offer.offerType === 'extend_trial') {
        // Add VIP days
        const days = offerValue.days || 7;
        const user = await manager.findOne(User, { where: { id: userId } });
        if (!user) {
          throw new NotFoundException('User not found');
        }

        const now = new Date();
        const currentExpiry = user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now
          ? new Date(user.membershipExpiresAt)
          : now;
        user.membership = 'premium';
        user.membershipExpiresAt = new Date(currentExpiry.getTime() + days * 86400000);
        await manager.save(user);

        this.logger.log(`Extended VIP for user ${userId} by ${days} days`);
        return { success: true, vipDays: days, expiresAt: user.membershipExpiresAt };
      } else if (offer.offerType === 'bonus_coins') {
        // Add coins to balance
        const coins = offerValue.coins || 0;
        const balance = await manager.findOne(UserBalance, { where: { userId } });
        if (balance) {
          balance.balance = Number(balance.balance) + coins;
          await manager.save(balance);
        }

        this.logger.log(`Added ${coins} bonus coins to user ${userId}`);
        return { success: true, coinsAdded: coins };
      }

      return { success: true };
    });
  }

  /**
   * Dismiss a retention offer
   */
  async dismissOffer(offerId: string, userId: string) {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, userId },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'pending' && offer.status !== 'shown') {
      throw new BadRequestException('Offer cannot be dismissed');
    }

    offer.status = 'dismissed';
    await this.offerRepo.save(offer);

    return { success: true };
  }

  /**
   * Generate retention offers based on user's VIP status
   */
  async generateRetentionOffers(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const offers = [];

    // Check VIP status
    const isVip = user.membership === 'premium' && user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now;
    const daysUntilExpiry = isVip
      ? Math.ceil((new Date(user.membershipExpiresAt).getTime() - now.getTime()) / 86400000)
      : 0;
    const daysSinceExpiry = !isVip && user.membershipExpiresAt
      ? Math.ceil((now.getTime() - new Date(user.membershipExpiresAt).getTime()) / 86400000)
      : 0;

    // Determine trigger and offer
    let triggerReason = '';
    let offerType = '';
    let offerValue: any = {};
    let originalPrice: number | null = 99.00;
    let offerPrice: number | null = 99.00;
    let expiresAt = new Date();

    if (isVip && daysUntilExpiry <= 7 && daysUntilExpiry > 3) {
      triggerReason = 'expiring_7d';
      offerType = 'discount';
      offerPrice = 89.10; // 10% discount
      offerValue = { discount: 10, description: '10% off renewal' };
      expiresAt = new Date(now.getTime() + 7 * 86400000);
    } else if (isVip && daysUntilExpiry <= 3 && daysUntilExpiry > 1) {
      triggerReason = 'expiring_3d';
      offerType = 'discount';
      offerPrice = 79.20; // 20% discount
      offerValue = { discount: 20, bonusCoins: 10, description: '20% off + 10 bonus coins' };
      expiresAt = new Date(now.getTime() + 3 * 86400000);
    } else if (isVip && daysUntilExpiry <= 1) {
      triggerReason = 'expiring_1d';
      offerType = 'discount';
      offerPrice = 69.30; // 30% discount
      offerValue = { discount: 30, description: '30% off - 24h flash sale' };
      expiresAt = new Date(now.getTime() + 24 * 3600000);
    } else if (!isVip && daysSinceExpiry >= 1 && daysSinceExpiry < 7) {
      triggerReason = 'expired_1d';
      offerType = 'extend_trial';
      offerValue = { days: 7, description: '7 days free trial' };
      expiresAt = new Date(now.getTime() + 7 * 86400000);
      originalPrice = null;
      offerPrice = null;
    } else if (!isVip && daysSinceExpiry >= 7) {
      triggerReason = 'expired_7d';
      offerType = 'discount';
      offerPrice = 69.30; // 30% discount
      offerValue = { discount: 30, description: 'Flash sale - 30% off to win you back' };
      expiresAt = new Date(now.getTime() + 3 * 86400000);
    }

    if (!triggerReason) {
      return { message: 'No offers available at this time' };
    }

    // Check if active offer of same trigger already exists
    const existingOffer = await this.offerRepo.findOne({
      where: {
        userId,
        triggerReason,
        status: 'pending' as any, // Will match pending/shown
        expiresAt: MoreThan(now),
      },
    });

    if (existingOffer && (existingOffer.status === 'pending' || existingOffer.status === 'shown')) {
      return { message: 'Active offer already exists', offerId: existingOffer.id };
    }

    // Create new offer
    const offer = this.offerRepo.create({
      userId,
      offerType,
      offerValue: JSON.stringify(offerValue),
      triggerReason,
      originalPrice,
      offerPrice,
      status: 'pending',
      expiresAt,
    });
    await this.offerRepo.save(offer);

    this.logger.log(`Generated retention offer ${offer.id} for user ${userId} with trigger ${triggerReason}`);
    return { success: true, offerId: offer.id };
  }

  /**
   * Calculate user health score
   */
  async calculateHealthScore(userId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    // Login frequency (0-20): count distinct days with daily_view_logs in last 7 days
    const loginDays = await this.dataSource.query(
      `SELECT COUNT(DISTINCT view_date) as count FROM daily_view_logs
       WHERE user_id = $1 AND view_date >= $2`,
      [userId, sevenDaysAgoStr]
    );
    const loginFrequencyScore = Math.min(20, Math.floor((loginDays[0]?.count || 0) * 20 / 7));

    // Feature usage (0-25): count distinct view_types in daily_view_logs last 7 days
    const featureUsage = await this.dataSource.query(
      `SELECT COUNT(DISTINCT view_type) as count FROM daily_view_logs
       WHERE user_id = $1 AND view_date >= $2`,
      [userId, sevenDaysAgoStr]
    );
    const featureUsageScore = Math.min(25, (featureUsage[0]?.count || 0) * 5);

    // Unlock activity (0-25): count report_unlocks in last 7 days
    const unlocks = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM report_unlocks
       WHERE user_id = $1 AND created_at >= $2`,
      [userId, sevenDaysAgo]
    );
    const unlockActivityScore = Math.min(25, (unlocks[0]?.count || 0) * 5);

    // Engagement (0-15): count referrals + check for activity
    const referrals = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM referrals WHERE referrer_id = $1`,
      [userId]
    );
    const engagementScore = Math.min(15, (referrals[0]?.count || 0) * 3);

    // Billing health (0-15): check balance > 0 and VIP active
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const balance = await this.balanceRepo.findOne({ where: { userId } });
    let billingHealthScore = 0;
    if (balance && Number(balance.balance) > 0) {
      billingHealthScore += 7;
    }
    if (user && user.membership === 'premium' && user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now) {
      billingHealthScore += 8;
    }

    // Total score
    const score = loginFrequencyScore + featureUsageScore + unlockActivityScore + engagementScore + billingHealthScore;

    // Risk level
    let riskLevel = 'low';
    if (score < 30) {
      riskLevel = 'high';
    } else if (score < 60) {
      riskLevel = 'medium';
    }

    // Save to database
    const healthScore = this.healthScoreRepo.create({
      userId,
      score,
      loginFrequencyScore,
      featureUsageScore,
      unlockActivityScore,
      engagementScore,
      billingHealthScore,
      riskLevel,
    });
    await this.healthScoreRepo.save(healthScore);

    this.logger.log(`Calculated health score ${score} (${riskLevel}) for user ${userId}`);
    return {
      score,
      loginFrequencyScore,
      featureUsageScore,
      unlockActivityScore,
      engagementScore,
      billingHealthScore,
      riskLevel,
      calculatedAt: healthScore.calculatedAt,
    };
  }

  /**
   * Get latest health score for user
   */
  async getHealthScore(userId: string) {
    const latestScore = await this.healthScoreRepo.findOne({
      where: { userId },
      order: { calculatedAt: 'DESC' },
    });

    if (!latestScore) {
      // Calculate if not exists
      return await this.calculateHealthScore(userId);
    }

    return {
      score: latestScore.score,
      loginFrequencyScore: latestScore.loginFrequencyScore,
      featureUsageScore: latestScore.featureUsageScore,
      unlockActivityScore: latestScore.unlockActivityScore,
      engagementScore: latestScore.engagementScore,
      billingHealthScore: latestScore.billingHealthScore,
      riskLevel: latestScore.riskLevel,
      calculatedAt: latestScore.calculatedAt,
    };
  }
}
