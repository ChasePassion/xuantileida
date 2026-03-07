import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topic } from './entities/topic.entity';
import { Category } from './entities/category.entity';
import { DailyBatch } from './entities/daily-batch.entity';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepo: Repository<Topic>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(DailyBatch)
    private readonly batchRepo: Repository<DailyBatch>,
    private readonly cacheService: CacheService,
  ) {}

  async getCategories() {
    const cacheKey = 'topics:categories';
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async getDailyTopics(options: { category?: string; limit?: number }) {
    const { category, limit = 30 } = options;

    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `topics:daily:${today}:${category || 'all'}:${limit}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const batch = await this.batchRepo.findOne({
      where: { batchDate: today, status: 'completed' },
    });

    if (!batch) {
      return { batchDate: today, topics: [], total: 0 };
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
      batchDate: today,
      topics: topics.map((t, idx) => ({
        id: t.id,
        rank: idx + 1,
        keyword: t.keyword,
        category: t.category?.slug || '',
        categoryName: t.category?.name || '',
        heatScore: t.heatScore,
        reason: t.reason,
        suggestedAngle: t.angles?.[0] || '',
        videoCount: t.videoCount,
        maxLikes: 0,
      })),
      total,
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

  async getTopicDetail(topicId: string) {
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
