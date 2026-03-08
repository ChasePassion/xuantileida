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

const DIMENSION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  topic_power: { label: '选题力', color: '#7C3AED', icon: '🎯' },
  hook_power: { label: '钩子力', color: '#EF4444', icon: '🪝' },
  rhythm_power: { label: '节奏力', color: '#F59E0B', icon: '🎵' },
  performance_power: { label: '表现力', color: '#10B981', icon: '🎬' },
  retention_power: { label: '留存力', color: '#3B82F6', icon: '🧲' },
  emotion_power: { label: '情感力', color: '#EC4899', icon: '💡' },
  monetize_power: { label: '变现力', color: '#06B6D4', icon: '💰' },
  // 向后兼容旧维度
  topic_angle: { label: '选题角度', color: '#7C3AED', icon: '🎯' },
  opening_hook: { label: '开头吸引力', color: '#EF4444', icon: '🪝' },
  info_density: { label: '信息密度', color: '#F59E0B', icon: '🎵' },
  emotional_resonance: { label: '情感共鸣', color: '#EC4899', icon: '💡' },
  cta_effectiveness: { label: 'CTA有效性', color: '#06B6D4', icon: '💰' },
};

const SEGMENT_LABELS: Record<string, { label: string; color: string }> = {
  hook: { label: '开场钩子', color: '#EF4444' },
  pain: { label: '痛点切入', color: '#F59E0B' },
  core: { label: '核心内容', color: '#7C3AED' },
  climax: { label: '情绪高潮', color: '#EC4899' },
  cta: { label: '行动引导', color: '#10B981' },
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
    const dimOrder = [
      'topic_power', 'hook_power', 'rhythm_power', 'performance_power',
      'retention_power', 'emotion_power', 'monetize_power',
      // 兼容旧维度
      'topic_angle', 'opening_hook', 'info_density', 'emotional_resonance', 'cta_effectiveness',
    ];

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

      // 7维度评分（始终返回分数和标签，评语仅解锁后可见）
      dimensions: (report.dimensions || [])
        .sort((a, b) => dimOrder.indexOf(a.dimension) - dimOrder.indexOf(b.dimension))
        .map((d) => ({
          dimension: d.dimension,
          label: DIMENSION_LABELS[d.dimension]?.label || d.dimension,
          icon: DIMENSION_LABELS[d.dimension]?.icon || '📊',
          score: Number(d.score),
          color: DIMENSION_LABELS[d.dimension]?.color || '#7C3AED',
          comment: isUnlocked ? d.comment : null,
        })),

      // 脚本时间线（解锁后）
      scriptStructure: isUnlocked
        ? (report.scriptSegments || [])
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((s) => ({
              time: s.startTime != null && s.endTime != null
                ? `${this.formatTime(s.startTime)}-${this.formatTime(s.endTime)}`
                : '',
              type: s.segmentType,
              label: SEGMENT_LABELS[s.segmentType]?.label || s.segmentType,
              color: SEGMENT_LABELS[s.segmentType]?.color || '#7C3AED',
              text: s.originalText || '',
              technique: s.technique || '',
              techniqueDetail: s.techniqueDetail || '',
              psychologyPrinciple: s.psychologyPrinciple || '',
            }))
        : null,

      // 专业总结（解锁后）
      summary: isUnlocked ? report.summary : null,

      // === 以下为专业版深度分析（解锁后可见）===

      // 钩子深度分析
      hookAnalysis: isUnlocked ? report.hookAnalysis : (report.hookAnalysis ? {
        textHookType: report.hookAnalysis.textHookType,
        textHookStrength: report.hookAnalysis.textHookStrength,
        // 未解锁只显示类型和强度，不显示详情
      } : null),

      // 留存机制分析
      retentionAnalysis: isUnlocked ? report.retentionAnalysis : null,

      // 病毒系数
      viralScore: isUnlocked ? report.viralScore : (report.viralScore ? {
        totalViralScore: report.viralScore.totalViralScore,
        viralVerdict: report.viralScore.viralVerdict,
      } : null),

      // 情感弧线
      emotionalArc: isUnlocked ? report.emotionalArc : null,

      // 可复制要素
      replicableElements: isUnlocked ? report.replicableElements : null,

      // 创作者实操建议
      creatorTips: isUnlocked ? report.creatorTips : null,
    };
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
