import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { DailyBatch } from '../../topics/entities/daily-batch.entity';
import { Topic } from '../../topics/entities/topic.entity';
import { HotArticle } from '../../topics/entities/hot-article.entity';
import { Category } from '../../topics/entities/category.entity';
import { ViralVideo } from '../../videos/entities/viral-video.entity';
import { TopicVideo } from '../../videos/entities/topic-video.entity';
import { TaskLog } from '../entities/task-log.entity';
import { HotArticleApiService } from '../../external/services/hot-article-api.service';
import { VideoSearchApiService } from '../../external/services/video-search-api.service';
import { DouyinApiService } from '../../external/services/douyin-api.service';
import { KuaishouApiService } from '../../external/services/kuaishou-api.service';
import { LlmService } from '../../external/services/llm.service';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class DailyCrawlService {
  private readonly logger = new Logger(DailyCrawlService.name);

  constructor(
    @InjectRepository(DailyBatch)
    private readonly batchRepo: Repository<DailyBatch>,
    @InjectRepository(Topic)
    private readonly topicRepo: Repository<Topic>,
    @InjectRepository(HotArticle)
    private readonly articleRepo: Repository<HotArticle>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(ViralVideo)
    private readonly videoRepo: Repository<ViralVideo>,
    @InjectRepository(TopicVideo)
    private readonly topicVideoRepo: Repository<TopicVideo>,
    @InjectRepository(TaskLog)
    private readonly logRepo: Repository<TaskLog>,
    private readonly hotArticleApi: HotArticleApiService,
    private readonly videoSearchApi: VideoSearchApiService,
    private readonly douyinApi: DouyinApiService,
    private readonly kuaishouApi: KuaishouApiService,
    private readonly llmService: LlmService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 每日凌晨3:00执行选题抓取流水线
   * 选题来源：微信公众号热文 -> LLM提取
   * 视频搜索：同一批选题在三个平台（视频号、抖音、快手）并行搜索
   */
  @Cron('0 3 * * *')
  async runDailyCrawl() {
    const startedAt = new Date();
    const today = new Date().toISOString().split('T')[0];

    const taskLog = this.logRepo.create({
      taskName: 'daily_crawl',
      status: 'running',
      startedAt,
    });
    await this.logRepo.save(taskLog);

    try {
      // 1. 创建或获取今日批次
      let batch = await this.batchRepo.findOne({ where: { batchDate: today } });
      if (batch && batch.status === 'completed') {
        this.logger.log(`今日批次已完成，跳过: ${today}`);
        taskLog.status = 'skipped';
        taskLog.completedAt = new Date();
        taskLog.durationMs = Date.now() - startedAt.getTime();
        await this.logRepo.save(taskLog);
        return;
      }

      if (!batch) {
        batch = this.batchRepo.create({
          batchDate: today,
          status: 'running',
          startedAt,
        });
        await this.batchRepo.save(batch);
      } else {
        batch.status = 'running';
        batch.startedAt = startedAt;
        await this.batchRepo.save(batch);
      }

      // 2. 获取活跃行业分类
      const categories = await this.categoryRepo.find({
        where: { isActive: true },
      });

      // 3. 抓取公众号爆文
      let totalArticles = 0;
      const allTitles: string[] = [];

      for (const cat of categories) {
        const articles = await this.hotArticleApi.fetchHotArticles(cat.slug, 30);
        for (const a of articles) {
          const article = this.articleRepo.create({
            batchId: batch.id,
            categoryId: cat.id,
            title: a.title,
            author: a.author,
            accountName: a.accountName,
            url: a.url,
            readCount: a.readCount,
            likeCount: a.likeCount,
            publishedAt: a.publishedAt ? new Date(a.publishedAt) : undefined,
          });
          await this.articleRepo.save(article);
          allTitles.push(a.title);
          totalArticles++;
        }
      }

      this.logger.log(`抓取爆文完成: ${totalArticles} 篇`);
      batch.articleCount = totalArticles;
      await this.batchRepo.save(batch);

      // 4. LLM 提取选题关键词
      const topicExtractions = await this.llmService.extractTopics(allTitles, 30);
      this.logger.log(`LLM提取选题: ${topicExtractions.length} 个`);

      // 5. 保存选题 + 在三个平台搜索关联视频
      let totalVideos = 0;
      for (let i = 0; i < topicExtractions.length; i++) {
        const te = topicExtractions[i];
        const matchCat = categories.find((c) => c.slug === te.category);

        const topic = this.topicRepo.create({
          batchId: batch.id,
          categoryId: matchCat?.id,
          keyword: te.keyword,
          heatScore: te.heatScore || 50,
          reason: te.reason,
          angles: te.angles || [],
          rankInBatch: i + 1,
        });
        await this.topicRepo.save(topic);

        // 6. 三平台并行搜索视频
        const [wechatVideos, douyinVideos, kuaishouVideos] = await Promise.all([
          this.videoSearchApi.searchVideos(te.keyword),
          this.douyinApi.searchVideos(te.keyword, { publishTime: '7', contentType: '1' }),
          this.kuaishouApi.searchVideos(te.keyword),
        ]);

        const allVideos = [...wechatVideos, ...douyinVideos, ...kuaishouVideos];
        let videoCount = 0;

        for (const v of allVideos) {
          try {
            // 截断标题（快手返回的"标题"可能是完整文案）
            const safeTitle = (v.title || '').slice(0, 250);
            const safeCreatorName = (v.creatorName || '').slice(0, 120);

            const dedupHash = crypto
              .createHash('md5')
              .update(`${v.platform}_${safeTitle}_${v.creatorId}_${v.duration}`)
              .digest('hex');

            // 去重插入
            let video = await this.videoRepo.findOne({ where: { dedupHash } });
            if (!video) {
              video = this.videoRepo.create({
                title: safeTitle,
                coverUrl: v.coverUrl,
                videoUrl: v.videoUrl,
                duration: v.duration,
                likeCount: v.likeCount,
                commentCount: v.commentCount,
                shareCount: v.shareCount,
                collectCount: (v as any).collectCount || 0,
                creatorName: safeCreatorName,
                creatorId: v.creatorId,
                platform: v.platform,
                dedupHash,
              });
              await this.videoRepo.save(video);
            }

            // 创建选题-视频关联
            const exists = await this.topicVideoRepo.findOne({
              where: { topicId: topic.id, videoId: video.id },
            });
            if (!exists) {
              const tv = this.topicVideoRepo.create({
                topicId: topic.id,
                videoId: video.id,
                sortOrder: videoCount,
              });
              await this.topicVideoRepo.save(tv);
              videoCount++;
              totalVideos++;
            }
          } catch (videoErr) {
            this.logger.warn(`视频入库失败(跳过): ${(v.title || '').slice(0, 30)}... ${videoErr.message}`);
          }
        }

        topic.videoCount = videoCount;
        await this.topicRepo.save(topic);

        this.logger.log(
          `选题[${te.keyword}]: 视频号${wechatVideos.length}个, 抖音${douyinVideos.length}个, 快手${kuaishouVideos.length}个`,
        );
      }

      // 7. 完成批次
      batch.status = 'completed';
      batch.keywordCount = topicExtractions.length;
      batch.videoCount = totalVideos;
      batch.completedAt = new Date();
      await this.batchRepo.save(batch);

      // 8. 清除选题缓存
      await this.cacheService.delByPrefix('topics:');

      // 9. 更新日志
      taskLog.status = 'completed';
      taskLog.completedAt = new Date();
      taskLog.durationMs = Date.now() - startedAt.getTime();
      taskLog.recordsAffected = topicExtractions.length + totalVideos;
      await this.logRepo.save(taskLog);

      this.logger.log(
        `每日选题抓取完成: ${topicExtractions.length}个选题, ${totalVideos}个视频(三平台), 耗时${taskLog.durationMs}ms`,
      );
    } catch (error) {
      const batch = await this.batchRepo.findOne({ where: { batchDate: today } });
      if (batch) {
        batch.status = 'failed';
        batch.errorMessage = error.message;
        await this.batchRepo.save(batch);
      }

      taskLog.status = 'failed';
      taskLog.completedAt = new Date();
      taskLog.durationMs = Date.now() - startedAt.getTime();
      taskLog.errorMessage = error.message;
      await this.logRepo.save(taskLog);

      this.logger.error('每日选题抓取失败', error.stack);
    }
  }
}
