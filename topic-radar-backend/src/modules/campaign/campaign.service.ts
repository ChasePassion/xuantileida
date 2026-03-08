import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignParticipation } from './entities/campaign-participation.entity';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { User } from '../users/entities/user.entity';
import { UserBalance } from '../users/entities/user-balance.entity';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignParticipation)
    private readonly participationRepo: Repository<CampaignParticipation>,
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepo: Repository<UserAchievement>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserBalance)
    private readonly balanceRepo: Repository<UserBalance>,
  ) {}

  // ========== Campaign Methods ==========

  /**
   * Get all active campaigns for the current user
   */
  async getActiveCampaigns(userId: string) {
    const now = new Date();
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // Get all active campaigns within time range
    const campaigns = await this.campaignRepo
      .createQueryBuilder('c')
      .where('c.isActive = :active', { active: true })
      .andWhere('c.startAt <= :now', { now })
      .andWhere('c.endAt >= :now', { now })
      .orderBy('c.createdAt', 'DESC')
      .getMany();

    // Filter by target audience and max participants
    const filteredCampaigns = campaigns.filter((campaign) => {
      // Check target audience
      if (campaign.targetAudience) {
        if (campaign.targetAudience === 'free' && user.membership !== 'free') {
          return false;
        }
        if (campaign.targetAudience === 'premium' && user.membership !== 'premium') {
          return false;
        }
      }

      // Check max participants
      if (campaign.maxParticipants && campaign.currentParticipants >= campaign.maxParticipants) {
        return false;
      }

      return true;
    });

    // Get user's participation status for each campaign
    const campaignIds = filteredCampaigns.map((c) => c.id);
    const participations = campaignIds.length > 0
      ? await this.participationRepo.find({
          where: { userId, campaignId: campaignIds as any },
        })
      : [];

    const participationMap = new Map(
      participations.map((p) => [p.campaignId, p])
    );

    return filteredCampaigns.map((campaign) => ({
      ...campaign,
      hasParticipated: participationMap.has(campaign.id),
      participation: participationMap.get(campaign.id) || null,
    }));
  }

  /**
   * Participate in a campaign
   */
  async participateCampaign(campaignId: string, userId: string, actionType?: string) {
    return await this.dataSource.transaction(async (manager) => {
      const campaign = await manager.findOne(Campaign, {
        where: { id: campaignId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!campaign) {
        throw new NotFoundException('活动不存在');
      }

      if (!campaign.isActive) {
        throw new BadRequestException('活动已结束');
      }

      const now = new Date();
      if (now < campaign.startAt || now > campaign.endAt) {
        throw new BadRequestException('活动不在有效时间范围内');
      }

      // Check max participants
      if (campaign.maxParticipants && campaign.currentParticipants >= campaign.maxParticipants) {
        throw new BadRequestException('活动参与人数已满');
      }

      // Check if already participated with same action
      const existing = await manager.findOne(CampaignParticipation, {
        where: { campaignId, userId, ...(actionType ? { actionType } : {}) },
      });

      if (existing) {
        throw new BadRequestException('您已参与过该活动');
      }

      // Create participation record
      const participation = manager.create(CampaignParticipation, {
        campaignId,
        userId,
        actionType,
      });
      await manager.save(participation);

      // Increment current participants
      campaign.currentParticipants += 1;
      await manager.save(campaign);

      return {
        success: true,
        campaign,
        participation,
      };
    });
  }

  /**
   * Create a new campaign (admin only)
   */
  async createCampaign(data: Partial<Campaign>) {
    const campaign = this.campaignRepo.create(data);
    return await this.campaignRepo.save(campaign);
  }

  /**
   * Update a campaign (admin only)
   */
  async updateCampaign(id: string, data: Partial<Campaign>) {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException('活动不存在');
    }

    Object.assign(campaign, data);
    return await this.campaignRepo.save(campaign);
  }

  // ========== Achievement Methods ==========

  /**
   * Get all achievements with user's unlock status
   */
  async getAchievements(userId: string) {
    const achievements = await this.achievementRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    const userAchievements = await this.userAchievementRepo.find({
      where: { userId },
    });

    const unlockedMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua])
    );

    // Get user stats for progress calculation
    const stats = await this.getUserStats(userId);

    return achievements.map((achievement) => {
      const userAchievement = unlockedMap.get(achievement.id);
      const isUnlocked = !!userAchievement;

      // Calculate progress
      let progress = 0;
      if (!isUnlocked) {
        progress = this.calculateProgress(achievement, stats);
      }

      return {
        ...achievement,
        isUnlocked,
        progress,
        unlockedAt: userAchievement?.unlockedAt || null,
        shared: userAchievement?.shared || false,
        sharedAt: userAchievement?.sharedAt || null,
      };
    });
  }

  /**
   * Check and unlock achievements for a user
   */
  async checkAndUnlockAchievements(userId: string) {
    const stats = await this.getUserStats(userId);
    const achievements = await this.achievementRepo.find();

    // Get already unlocked achievements
    const userAchievements = await this.userAchievementRepo.find({
      where: { userId },
    });
    const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));

    const newlyUnlocked: Achievement[] = [];

    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue;

      // Check if user qualifies
      const qualified = this.checkQualification(achievement, stats);
      if (qualified) {
        await this.dataSource.transaction(async (manager) => {
          // Create user achievement record
          const userAchievement = manager.create(UserAchievement, {
            userId,
            achievementId: achievement.id,
          });
          await manager.save(userAchievement);

          // Grant rewards
          if (achievement.rewardType && achievement.rewardValue) {
            if (achievement.rewardType === 'coins') {
              await this.grantCoins(userId, achievement.rewardValue, manager);
            } else if (achievement.rewardType === 'vip_days') {
              await this.grantVipDays(userId, achievement.rewardValue, manager);
            }
          }
        });

        newlyUnlocked.push(achievement);
      }
    }

    return {
      newlyUnlocked,
      count: newlyUnlocked.length,
    };
  }

  /**
   * Share an achievement to get bonus coins
   */
  async shareAchievement(achievementId: string, userId: string) {
    return await this.dataSource.transaction(async (manager) => {
      const userAchievement = await manager.findOne(UserAchievement, {
        where: { userId, achievementId },
        relations: ['achievement'],
      });

      if (!userAchievement) {
        throw new NotFoundException('成就未解锁');
      }

      if (userAchievement.shared) {
        throw new BadRequestException('该成就已分享过');
      }

      const achievement = userAchievement.achievement;
      if (!achievement.shareBonusCoins || achievement.shareBonusCoins <= 0) {
        throw new BadRequestException('该成就没有分享奖励');
      }

      // Mark as shared
      userAchievement.shared = true;
      userAchievement.sharedAt = new Date();
      await manager.save(userAchievement);

      // Grant bonus coins
      await this.grantCoins(userId, achievement.shareBonusCoins, manager);

      return {
        success: true,
        bonusCoins: achievement.shareBonusCoins,
      };
    });
  }

  // ========== Helper Methods ==========

  /**
   * Get user statistics for achievement checking
   */
  private async getUserStats(userId: string) {
    // Get report unlocks count
    const reportUnlocks = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM report_unlocks WHERE user_id = $1',
      [userId]
    );

    // Get referrals count (valid only)
    const referrals = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = $1 AND is_valid = true',
      [userId]
    );

    // Get distinct daily view dates
    const dailyViews = await this.dataSource.query(
      'SELECT COUNT(DISTINCT view_date) as count FROM daily_view_logs WHERE user_id = $1',
      [userId]
    );

    // Get promo notes count
    const promoNotes = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM promo_notes WHERE user_id = $1',
      [userId]
    );

    return {
      reportUnlocks: parseInt(reportUnlocks[0]?.count || '0', 10),
      referrals: parseInt(referrals[0]?.count || '0', 10),
      dailyViews: parseInt(dailyViews[0]?.count || '0', 10),
      promoNotes: parseInt(promoNotes[0]?.count || '0', 10),
    };
  }

  /**
   * Calculate progress towards an achievement
   */
  private calculateProgress(achievement: Achievement, stats: any): number {
    let current = 0;

    switch (achievement.conditionType) {
      case 'report_unlocks':
        current = stats.reportUnlocks;
        break;
      case 'referrals':
        current = stats.referrals;
        break;
      case 'daily_views':
        current = stats.dailyViews;
        break;
      case 'promo_notes':
        current = stats.promoNotes;
        break;
    }

    const progress = Math.min(100, Math.floor((current / achievement.conditionValue) * 100));
    return progress;
  }

  /**
   * Check if user qualifies for an achievement
   */
  private checkQualification(achievement: Achievement, stats: any): boolean {
    let current = 0;

    switch (achievement.conditionType) {
      case 'report_unlocks':
        current = stats.reportUnlocks;
        break;
      case 'referrals':
        current = stats.referrals;
        break;
      case 'daily_views':
        current = stats.dailyViews;
        break;
      case 'promo_notes':
        current = stats.promoNotes;
        break;
    }

    return current >= achievement.conditionValue;
  }

  /**
   * Grant coins to user
   */
  private async grantCoins(userId: string, amount: number, manager: any) {
    const balance = await manager.findOne(UserBalance, { where: { userId } });
    if (balance) {
      balance.balance = Number(balance.balance) + amount;
      await manager.save(balance);
    }
  }

  /**
   * Grant VIP days to user
   */
  private async grantVipDays(userId: string, days: number, manager: any) {
    const user = await manager.findOne(User, { where: { id: userId } });
    if (!user) return;

    const now = new Date();
    const currentExpiry = user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now
      ? new Date(user.membershipExpiresAt)
      : now;
    user.membership = 'premium';
    user.membershipExpiresAt = new Date(currentExpiry.getTime() + days * 86400000);
    await manager.save(user);
  }
}
