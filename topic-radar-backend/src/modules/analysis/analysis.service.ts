import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AnalysisReport } from './entities/analysis-report.entity';
import { DimensionScore } from './entities/dimension-score.entity';
import { ScriptSegment } from './entities/script-segment.entity';
import { ReportUnlock } from './entities/report-unlock.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { PricingRule } from '../billing/entities/pricing-rule.entity';
import { ConsumeRecord } from '../billing/entities/consume-record.entity';
import { ViralVideo } from '../videos/entities/viral-video.entity';
import {
  InsufficientBalanceException,
  ReportAlreadyUnlockedException,
} from '../../common/exceptions/business.exceptions';

const DIMENSION_LABELS: Record<string, { label: string; color: string }> = {
  topic_angle: { label: '选题角度', color: 'violet' },
  opening_hook: { label: '开头吸引力', color: 'cyan' },
  info_density: { label: '信息密度', color: 'violet' },
  emotional_resonance: { label: '情感共鸣', color: 'fire' },
  cta_effectiveness: { label: 'CTA有效性', color: 'cyan' },
};

const SEGMENT_LABELS: Record<string, string> = {
  hook: 'Hook钩子',
  pain: '痛点切入',
  core: '核心内容',
  climax: '高潮转折',
  cta: '行动号召',
};

@Injectable()
export class AnalysisService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AnalysisReport)
    private readonly reportRepo: Repository<AnalysisReport>,
    @InjectRepository(ReportUnlock)
    private readonly unlockRepo: Repository<ReportUnlock>,
    @InjectRepository(ViralVideo)
    private readonly videoRepo: Repository<ViralVideo>,
    @InjectRepository(PricingRule)
    private readonly pricingRepo: Repository<PricingRule>,
  ) {}

  async getReportByVideoId(videoId: string, userId: string) {
    const report = await this.reportRepo.findOne({
      where: { videoId, status: 'completed' },
      relations: ['dimensions', 'scriptSegments', 'video'],
    });

    if (!report) throw new NotFoundException('该视频暂无拆解报告');

    const isUnlocked = !!(await this.unlockRepo.findOne({
      where: { userId, reportId: report.id },
    }));

    const pricing = await this.pricingRepo.findOne({
      where: { featureType: 'analysis_unlock', isActive: true },
    });

    return this.formatReport(report, isUnlocked, pricing?.price || 8);
  }

  async unlockReport(reportId: string, userId: string) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. 检查是否已解锁
      const existing = await manager.findOne(ReportUnlock, {
        where: { userId, reportId },
      });
      if (existing) {
        throw new ReportAlreadyUnlockedException(reportId);
      }

      // 2. 获取定价
      const pricing = await manager.findOne(PricingRule, {
        where: { featureType: 'analysis_unlock', isActive: true },
      });
      const price = Number(pricing?.price || 8);

      // 3. 检查并扣减余额
      const balance = await manager.findOne(UserBalance, { where: { userId } });
      if (!balance || Number(balance.balance) < price) {
        throw new InsufficientBalanceException(
          Number(balance?.balance || 0),
          price,
        );
      }

      balance.balance = Number(balance.balance) - price;
      balance.totalConsumed = Number(balance.totalConsumed) + price;
      await manager.save(balance);

      // 4. 创建消费记录
      const consume = manager.create(ConsumeRecord, {
        userId,
        featureType: 'analysis_unlock',
        amount: price,
        refId: reportId,
        refType: 'analysis_report',
        note: '拆解报告解锁',
      });
      await manager.save(consume);

      // 5. 创建解锁记录
      const unlock = manager.create(ReportUnlock, {
        userId,
        reportId,
        consumeId: consume.id,
      });
      await manager.save(unlock);

      // 6. 更新解锁计数
      await manager.increment(AnalysisReport, { id: reportId }, 'unlockCount', 1);

      // 7. 返回完整报告
      const report = await manager.findOne(AnalysisReport, {
        where: { id: reportId },
        relations: ['dimensions', 'scriptSegments', 'video'],
      });

      return {
        consumed: price,
        remainingBalance: Number(balance.balance),
        report: this.formatReport(report!, true, price),
      };
    });
  }

  async getMyUnlocks(userId: string, page = 1, limit = 10) {
    const [unlocks, total] = await this.unlockRepo.findAndCount({
      where: { userId },
      relations: ['report', 'report.video'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: unlocks.map((u) => ({
        reportId: u.reportId,
        videoTitle: u.report?.video?.title,
        overallScore: u.report?.overallScore,
        unlockedAt: u.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  private formatReport(
    report: AnalysisReport,
    isUnlocked: boolean,
    unlockPrice: number,
  ) {
    const video = report.video;
    return {
      reportId: report.id,
      videoId: report.videoId,
      title: video?.title || '',
      likes: video?.likeCount || 0,
      platform: video?.platform || 'unknown',
      duration: video?.duration || 0,
      overallScore: Number(report.overallScore),
      isUnlocked,
      unlockPrice,
      unlockCount: report.unlockCount,
      dimensions: (report.dimensions || [])
        .sort((a, b) => {
          const order = Object.keys(DIMENSION_LABELS);
          return order.indexOf(a.dimension) - order.indexOf(b.dimension);
        })
        .map((d) => ({
          dimension: d.dimension,
          label: DIMENSION_LABELS[d.dimension]?.label || d.dimension,
          score: Number(d.score),
          color: DIMENSION_LABELS[d.dimension]?.color || 'violet',
          comment: isUnlocked ? d.comment : null,
        })),
      scriptStructure: isUnlocked
        ? (report.scriptSegments || [])
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((s) => ({
              time: s.startTime != null && s.endTime != null
                ? `${s.startTime}-${s.endTime}s`
                : '',
              type: s.segmentType,
              label: SEGMENT_LABELS[s.segmentType] || s.segmentType,
              text: s.originalText || '',
              technique: s.technique || '',
            }))
        : null,
      summary: isUnlocked ? report.summary : null,
    };
  }
}
