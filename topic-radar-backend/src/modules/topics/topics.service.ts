import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topic } from './entities/topic.entity';
import { Category } from './entities/category.entity';
import { DailyBatch } from './entities/daily-batch.entity';
import { CacheService } from '../cache/cache.service';
import { DailyViewLog } from '../referral/entities/daily-view-log.entity';

const FREE_TOPIC_LIMIT = 3;
const FREE_DETAIL_LIMIT = 1;

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepo: Repository<Topic>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(DailyBatch)
    private readonly batchRepo: Repository<DailyBatch>,
    @InjectRepository(DailyViewLog)
    private readonly viewLogRepo: Repository<DailyViewLog>,
    private readonly cacheService: CacheService,
  ) {}

  checkVipStatus(membership: string, membershipExpiresAt: string): boolean {
    if (membership !== 'premium') return false;
    if (!membershipExpiresAt) return false;
    return new Date(membershipExpiresAt) > new Date();
  }

  async getCategories() {
    const cacheKey = 'topics:categories:v2';
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const categories = await this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });

    // 获取最近一批数据的各分类选题数
    const latestBatch = await this.batchRepo.findOne({
      where: { status: 'completed' },
      order: { batchDate: 'DESC' },
    });

    const countMap: Record<string, number> = {};
    let totalCount = 0;
    if (latestBatch) {
      const counts = await this.topicRepo
        .createQueryBuilder('t')
        .select('c.slug', 'slug')
        .addSelect('COUNT(t.id)', 'count')
        .leftJoin('t.category', 'c')
        .where('t.batchId = :batchId', { batchId: latestBatch.id })
        .groupBy('c.slug')
        .getRawMany();
      for (const row of counts) {
        const c = parseInt(row.count, 10);
        countMap[row.slug] = c;
        totalCount += c;
      }
    }

    const result = {
      totalCount,
      categories: categories.map((cat) => ({
        slug: cat.slug,
        name: cat.name,
        icon: (cat as any).icon,
        topicCount: countMap[cat.slug] || 0,
      })),
    };
    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async getDailyTopics(options: { category?: string; limit?: number; isVip?: boolean }) {
    const { category, limit = 30, isVip = false } = options;

    // 免费版看延迟1天的数据，VIP看实时
    const targetDate = isVip
      ? new Date().toISOString().split('T')[0]
      : new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const cacheKey = `topics:daily:${targetDate}:${category || 'all'}:${limit}:${isVip}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    let batch = await this.batchRepo.findOne({
      where: { batchDate: targetDate, status: 'completed' },
    });

    if (!batch) {
      batch = await this.batchRepo.findOne({
        where: { status: 'completed' },
        order: { batchDate: 'DESC' },
      });
      if (!batch) {
        return { batchDate: targetDate, topics: [], total: 0, isVip };
      }
    }

    const qb = this.topicRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'c')
      .where('t.batchId = :batchId', { batchId: batch.id });

    if (category) {
      qb.andWhere('c.slug = :slug', { slug: category });
    }

    qb.orderBy('t.rankInBatch', 'ASC').take(limit);

    const [topics, total] = await qb.getManyAndCount();

    const result = {
      batchDate: batch.batchDate,
      isVip,
      topics: topics.map((t, idx) => {
        const rank = idx + 1;
        const isLocked = !isVip && rank > FREE_TOPIC_LIMIT;

        return {
          id: isLocked ? null : t.id,
          rank,
          keyword: isLocked ? t.keyword.charAt(0) + '***' : t.keyword,
          category: t.category?.slug || '',
          categoryName: t.category?.name || '',
          heatScore: isLocked ? null : t.heatScore,
          reason: isLocked ? null : t.reason,
          suggestedAngle: isLocked ? null : (t.angles?.[0] || ''),
          videoCount: isLocked ? null : t.videoCount,
          maxLikes: 0,
          locked: isLocked,
        };
      }),
      total,
      freeLimit: isVip ? null : FREE_TOPIC_LIMIT,
    };
    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async getDailyStats() {
    const today = new Date().toISOString().split('T')[0];
    const batch = await this.batchRepo.findOne({
      where: { batchDate: today },
    });

    const categoryCount = await this.categoryRepo.count({ where: { isActive: true } });

    return {
      topicCount: batch?.keywordCount || 0,
      viralCount: batch?.videoCount || 0,
      industryCount: categoryCount,
      updateTime: batch?.completedAt
        ? new Date(batch.completedAt).toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '暂无更新',
      batchDate: today,
    };
  }

  async getTopicDetail(topicId: string, userId?: string, isVip = false) {
    if (!isVip && userId) {
      const viewDate = new Date().toISOString().split('T')[0];
      const alreadyViewed = await this.viewLogRepo.findOne({
        where: { userId, viewDate, viewType: 'topic_detail', refId: topicId },
      });
      const todayViews = await this.viewLogRepo.count({
        where: { userId, viewDate, viewType: 'topic_detail' },
      });

      if (!alreadyViewed && todayViews >= FREE_DETAIL_LIMIT) {
        throw new ForbiddenException({
          message: '免费版每天只能查看1个选题详情，升级VIP解锁全部',
          code: 'FREE_LIMIT_REACHED',
          todayViews,
          limit: FREE_DETAIL_LIMIT,
        });
      }

      if (!alreadyViewed) {
        const log = this.viewLogRepo.create({ userId, viewDate, viewType: 'topic_detail', refId: topicId });
        await this.viewLogRepo.save(log);
      }
    }

    const topic = await this.topicRepo.findOne({
      where: { id: topicId },
      relations: ['category', 'topicVideos', 'topicVideos.video'],
    });

    if (!topic) throw new NotFoundException('选题不存在');

    return {
      id: topic.id,
      keyword: topic.keyword,
      category: topic.category?.slug || '',
      categoryName: topic.category?.name || '',
      heatScore: topic.heatScore,
      reason: topic.reason,
      angles: topic.angles,
      videoCount: topic.videoCount,
      videos: topic.topicVideos?.map((tv) => ({
        id: tv.video.id,
        title: tv.video.title,
        likes: tv.video.likeCount,
        relevanceScore: tv.relevanceScore,
      })) || [],
    };
  }
}
