import { VideosService } from './videos.service';

describe('VideosService', () => {
  function createQueryBuilder(topicVideos: any[], total: number) {
    return {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([topicVideos, total]),
    };
  }

  it('loads reports and unlocks in batch instead of per-row queries', async () => {
    const now = new Date('2026-03-08T00:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    const topicVideos = [
      {
        topicId: 'topic-1',
        video: {
          id: 'video-1',
          title: '爆款视频一',
          coverUrl: 'https://example.com/1.png',
          duration: 30,
          likeCount: 10,
          commentCount: 2,
          shareCount: 1,
          collectCount: 1,
          creatorName: '作者一',
          creatorId: 'creator-1',
          platform: 'douyin',
          firstSeenAt: new Date('2026-03-07T00:00:00Z'),
          createdAt: new Date('2026-03-07T00:00:00Z'),
        },
      },
      {
        topicId: 'topic-1',
        video: {
          id: 'video-2',
          title: '爆款视频二',
          coverUrl: 'https://example.com/2.png',
          duration: 45,
          likeCount: 20,
          commentCount: 3,
          shareCount: 2,
          collectCount: 2,
          creatorName: '作者二',
          creatorId: 'creator-2',
          platform: 'kuaishou',
          firstSeenAt: new Date('2026-03-06T00:00:00Z'),
          createdAt: new Date('2026-03-06T00:00:00Z'),
        },
      },
    ];
    const reportRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'report-1', videoId: 'video-1', status: 'completed' },
        { id: 'report-2', videoId: 'video-2', status: 'completed' },
      ]),
    };
    const unlockRepo = {
      find: jest.fn().mockResolvedValue([{ reportId: 'report-2', userId: 'user-1' }]),
    };
    const service = new VideosService(
      {} as any,
      { createQueryBuilder: jest.fn().mockReturnValue(createQueryBuilder(topicVideos, 2)) } as any,
      reportRepo as any,
      unlockRepo as any,
    );

    const result = await service.getVideosByTopic('topic-1', 'user-1', true, undefined, 1, 10);

    expect(reportRepo.find).toHaveBeenCalledTimes(1);
    expect(unlockRepo.find).toHaveBeenCalledTimes(1);
    expect(result.videos).toEqual([
      expect.objectContaining({ id: 'video-1', hasReport: true, isReportUnlocked: false }),
      expect.objectContaining({ id: 'video-2', hasReport: true, isReportUnlocked: true }),
    ]);

    jest.useRealTimers();
  });
});
