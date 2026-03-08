import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PromoNote } from './entities/promo-note.entity';
import { PromoTemplate } from './entities/promo-template.entity';
import { UserPromoContent } from './entities/user-promo-content.entity';
import { User } from '../users/entities/user.entity';
import { UserBalance } from '../users/entities/user-balance.entity';

// 推广奖励配置
const PROMO_REWARDS = {
  xiaohongshu: { days: 3, type: 'vip_days' },
  douyin: { days: 3, type: 'vip_days' },
  wechat_moments: { days: 1, type: 'vip_days' },
};

const MONTHLY_LIMIT_PER_PLATFORM = 2; // 每平台每月限制2次
const FIRST_TIME_MULTIPLIER = 2; // 首次奖励翻倍

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PromoNote)
    private readonly promoNoteRepo: Repository<PromoNote>,
    @InjectRepository(PromoTemplate)
    private readonly templateRepo: Repository<PromoTemplate>,
    @InjectRepository(UserPromoContent)
    private readonly contentRepo: Repository<UserPromoContent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserBalance)
    private readonly balanceRepo: Repository<UserBalance>,
  ) {}

  /**
   * 获取推广规则配置
   */
  getPromoRules() {
    return {
      platforms: Object.keys(PROMO_REWARDS).map((platform) => ({
        platform,
        rewardType: PROMO_REWARDS[platform].type,
        rewardValue: PROMO_REWARDS[platform].days,
        unit: 'days',
      })),
      monthlyLimit: MONTHLY_LIMIT_PER_PLATFORM,
      firstTimeBonus: {
        enabled: true,
        multiplier: FIRST_TIME_MULTIPLIER,
        description: '首次推广奖励翻倍',
      },
    };
  }

  /**
   * 提交推广笔记
   */
  async submitPromoNote(
    userId: string,
    platform: string,
    screenshotUrl: string,
    noteUrl?: string,
  ) {
    // 验证平台
    if (!PROMO_REWARDS[platform]) {
      throw new BadRequestException('不支持的推广平台');
    }

    // 检查本月该平台提交次数
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthCount = await this.promoNoteRepo
      .createQueryBuilder('pn')
      .where('pn.userId = :userId', { userId })
      .andWhere('pn.platform = :platform', { platform })
      .andWhere('pn.createdAt >= :start', { start: monthStart })
      .getCount();

    if (monthCount >= MONTHLY_LIMIT_PER_PLATFORM) {
      throw new BadRequestException(
        `本月该平台推广次数已达上限（${MONTHLY_LIMIT_PER_PLATFORM}次）`,
      );
    }

    // 检查是否首次推广
    const totalCount = await this.promoNoteRepo.count({
      where: { userId, status: 'approved' },
    });
    const isFirstTime = totalCount === 0;

    // 计算奖励
    const baseReward = PROMO_REWARDS[platform].days;
    const rewardValue = isFirstTime
      ? baseReward * FIRST_TIME_MULTIPLIER
      : baseReward;

    // 创建推广记录
    const note = this.promoNoteRepo.create({
      userId,
      platform,
      screenshotUrl,
      noteUrl,
      status: 'pending',
      rewardType: PROMO_REWARDS[platform].type,
      rewardValue,
    });

    await this.promoNoteRepo.save(note);

    return {
      id: note.id,
      platform: note.platform,
      status: note.status,
      expectedReward: {
        type: note.rewardType,
        value: note.rewardValue,
        isFirstTime,
      },
      createdAt: note.createdAt,
    };
  }

  /**
   * 获取我的推广记录（分页）
   */
  async getMyRecords(userId: string, page = 1, limit = 20) {
    const [list, total] = await this.promoNoteRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      records: list.map((note) => ({
        id: note.id,
        platform: note.platform,
        status: note.status,
        rewardType: note.rewardType,
        rewardValue: note.rewardValue,
        rejectReason: note.rejectReason,
        createdAt: note.createdAt,
        reviewedAt: note.reviewedAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * 审核推广笔记
   */
  async reviewNote(
    noteId: string,
    reviewerId: string,
    approved: boolean,
    rejectReason?: string,
  ) {
    const note = await this.promoNoteRepo.findOne({ where: { id: noteId } });
    if (!note) {
      throw new BadRequestException('推广记录不存在');
    }

    if (note.status !== 'pending') {
      throw new BadRequestException('该记录已审核，不能重复审核');
    }

    note.status = approved ? 'approved' : 'rejected';
    note.reviewerId = reviewerId;
    note.reviewedAt = new Date();
    if (!approved && rejectReason) {
      note.rejectReason = rejectReason;
    }

    await this.promoNoteRepo.save(note);

    // 如果审核通过，发放奖励
    if (approved) {
      if (note.rewardType === 'vip_days') {
        await this.grantVipDays(note.userId, note.rewardValue, note.id);
      } else if (note.rewardType === 'coins') {
        await this.grantCoins(note.userId, note.rewardValue, note.id);
      }
    }

    return {
      id: note.id,
      status: note.status,
      reviewedAt: note.reviewedAt,
    };
  }

  /**
   * 获取推广模板
   */
  async getTemplates(platform?: string, targetAudience?: string) {
    const queryBuilder = this.templateRepo
      .createQueryBuilder('t')
      .where('t.isActive = :isActive', { isActive: true });

    if (platform) {
      queryBuilder.andWhere('t.platform = :platform', { platform });
    }

    if (targetAudience) {
      queryBuilder.andWhere('t.targetAudience = :targetAudience', {
        targetAudience,
      });
    }

    const templates = await queryBuilder
      .orderBy('t.useCount', 'DESC')
      .getMany();

    return templates.map((t) => ({
      id: t.id,
      templateType: t.templateType,
      platform: t.platform,
      targetAudience: t.targetAudience,
      title: t.title,
      content: t.content,
      variables: t.variables,
      useCount: t.useCount,
    }));
  }

  /**
   * 标记内容为已使用
   */
  async markContentUsed(contentId: string) {
    const content = await this.contentRepo.findOne({
      where: { id: contentId },
    });
    if (!content) {
      throw new BadRequestException('内容不存在');
    }

    content.isUsed = true;
    await this.contentRepo.save(content);

    // 如果有关联的模板，增加使用次数（这里假设 contextData 中可能包含 templateId）
    if (content.contextData?.templateId) {
      await this.templateRepo.increment(
        { id: content.contextData.templateId },
        'useCount',
        1,
      );
    }

    return { success: true };
  }

  /**
   * 发放VIP天数
   */
  private async grantVipDays(userId: string, days: number, noteId: string) {
    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) {
        this.logger.error(`用户不存在: ${userId}`);
        return;
      }

      const now = new Date();
      const currentExpiry =
        user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now
          ? new Date(user.membershipExpiresAt)
          : now;

      user.membership = 'premium';
      user.membershipExpiresAt = new Date(
        currentExpiry.getTime() + days * 86400000,
      );
      await manager.save(user);

      this.logger.log(
        `推广奖励: 用户 ${userId} 获得 ${days} 天VIP (推广记录: ${noteId})`,
      );
    });
  }

  /**
   * 发放金币
   */
  private async grantCoins(userId: string, amount: number, noteId: string) {
    await this.dataSource.transaction(async (manager) => {
      const balance = await manager.findOne(UserBalance, {
        where: { userId },
      });
      if (balance) {
        balance.balance = Number(balance.balance) + amount;
        await manager.save(balance);

        this.logger.log(
          `推广奖励: 用户 ${userId} 获得 ${amount} 金币 (推广记录: ${noteId})`,
        );
      }
    });
  }
}
