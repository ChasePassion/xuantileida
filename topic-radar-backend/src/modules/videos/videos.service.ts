import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViralVideo } from './entities/viral-video.entity';
import { TopicVideo } from './entities/topic-video.entity';
import { AnalysisReport } from '../analysis/entities/analysis-report.entity';
import { ReportUnlock } from '../analysis/entities/report-unlock.entity';

const PLATFORM_LABELS: Record<string, string> = {
  wechat_video: '视频号',
  douyin: '抖音',
  kuaishou: '快手',
};

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(ViralVideo)
    private readonly videoRepo: Repository<ViralVideo>,
    @InjectRepository(TopicVideo)
    private readonly topicVideoRepo: Repository<TopicVideo>,
    @InjectRepository(AnalysisReport)
    private readonly reportRepo: Repository<AnalysisReport>,
    @InjectRepository(ReportUnlock)
    private readonly unlockRepo: Repository<ReportUnlock>,
  ) {}

  async getVideosByTopic(
    topicId: string,
    userId: string,
    isVip: boolean,
    platform?: string,
    page = 1,
    limit = 10,
  ) {
    const qb = this.topicVideoRepo
      .createQueryBuilder('tv')
      .leftJoinAndSelect('tv.video', 'v')
      .where('tv.topicId = :topicId', { topicId })
      .andWhere('v.isDeleted = false');

    if (platform) {
      qb.andWhere('v.platform = :platform', { platform });
    }

    qb.orderBy('tv.sortOrder', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [topicVideos, total] = await qb.getManyAndCount();

    const videos = await Promise.all(
      topicVideos.map(async (tv) => {
        const v = tv.video;
        const report = await this.reportRepo.findOne({
          where: { videoId: v.id, status: 'completed' },
        });
        const isUnlocked = report
          ? !!(await this.unlockRepo.findOne({
              where: { userId, reportId: report.id },
            }))
          : false;

        const now = new Date();
        const pubDate = v.firstSeenAt || v.createdAt;
        const daysAgo = Math.floor(
          (now.getTime() - new Date(pubDate).getTime()) / 86400000,
        );

        return {
          id: v.id,
          topicId,
          title: v.title,
          coverUrl: v.coverUrl,
          duration: v.duration,
          // 免费版数据打码
          likes: isVip ? v.likeCount : null,
          comments: isVip ? v.commentCount : null,
          shares: isVip ? v.shareCount : null,
          collects: isVip ? v.collectCount : null,
          dataMasked: !isVip,
          creator: { name: v.creatorName, id: v.creatorId, avatar: null },
          platform: v.platform,
          platformLabel: PLATFORM_LABELS[v.platform] || v.platform,
          pubTime: pubDate,
          daysAgo,
          hasReport: !!report,
          isReportUnlocked: isUnlocked,
        };
      }),
    );

    return { videos, total, page, limit, isVip };
  }

  async getVideoDetail(videoId: string, isVip = false) {
    const video = await this.videoRepo.findOne({
      where: { id: videoId, isDeleted: false },
    });
    if (!video) throw new NotFoundException('视频不存在');

    return {
      id: video.id,
      title: video.title,
      coverUrl: video.coverUrl,
      videoUrl: video.videoUrl,
      duration: video.duration,
      likes: isVip ? video.likeCount : null,
      comments: isVip ? video.commentCount : null,
      shares: isVip ? video.shareCount : null,
      collects: isVip ? video.collectCount : null,
      dataMasked: !isVip,
      creator: {
        name: video.creatorName,
        id: video.creatorId,
        avatar: null,
      },
      platform: video.platform,
      platformLabel: PLATFORM_LABELS[video.platform] || video.platform,
      firstSeenAt: video.firstSeenAt,
    };
  }
}
