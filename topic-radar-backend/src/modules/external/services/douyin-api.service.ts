import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DouyinVideoResult } from '../interfaces/api.interface';
import { VideoSearchResult } from '../interfaces/api.interface';

@Injectable()
export class DouyinApiService {
  private readonly logger = new Logger(DouyinApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('api.jizhile.baseUrl') || 'https://www.dajiala.com';
    this.apiKey = this.configService.get<string>('api.jizhile.apiKey') || '';
  }

  /**
   * 抖音综合搜索视频
   * POST /fbmain/monitor/v3/douyin_general_search3
   */
  async searchVideos(
    keyword: string,
    options?: {
      publishTime?: '0' | '1' | '7' | '180';
      contentType?: '0' | '1' | '2';
      filterDuration?: '0' | '0-1' | '1-5' | '1-10000';
    },
  ): Promise<VideoSearchResult[]> {
    try {
      const url = `${this.baseUrl}/fbmain/monitor/v3/douyin_general_search3?key=${this.apiKey}`;
      const formData = new FormData();
      formData.append('keyword', keyword);
      if (options?.publishTime) formData.append('publish_time', options.publishTime);
      if (options?.contentType) formData.append('content_type', options.contentType);
      if (options?.filterDuration) formData.append('filter_duration', options.filterDuration);

      const response = await fetch(url, { method: 'POST', body: formData });
      if (!response.ok) {
        this.logger.error(`抖音搜索API请求失败: ${response.status}`);
        return [];
      }

      const result = await response.json();
      if (result.code !== 0) {
        this.logger.error(`抖音搜索API错误: ${result.msg}`);
        return [];
      }

      const items = result.data?.data || [];
      return items.map((item: any) => {
        const info = item.aweme_info || item;
        const stats = info.statistics || {};
        const author = info.author || {};
        return {
          title: info.desc || '',
          coverUrl: info.video?.cover?.url_list?.[0] || '',
          videoUrl: '',
          duration: Math.floor((info.video?.duration || 0) / 1000),
          likeCount: stats.digg_count || 0,
          commentCount: stats.comment_count || 0,
          shareCount: stats.share_count || 0,
          collectCount: stats.collect_count || 0,
          creatorName: author.nickname || '',
          creatorId: author.sec_uid || author.uid || '',
          platform: 'douyin',
        };
      });
    } catch (error) {
      this.logger.error(`抖音搜索API调用异常: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取抖音视频详情
   * POST /fbmain/monitor/v3/douyin_aweme_detail
   */
  async getVideoDetail(awemeId: string): Promise<DouyinVideoResult | null> {
    try {
      const url = `${this.baseUrl}/fbmain/monitor/v3/douyin_aweme_detail?key=${this.apiKey}`;
      const formData = new FormData();
      formData.append('aweme_id', awemeId);

      const response = await fetch(url, { method: 'POST', body: formData });
      if (!response.ok) return null;

      const result = await response.json();
      if (result.code !== 0) return null;

      const detail = result.data?.aweme_detail;
      if (!detail) return null;

      const stats = detail.statistics || {};
      const author = detail.author || {};

      return {
        awemeId: detail.aweme_id || awemeId,
        title: detail.preview_title || detail.desc || '',
        createTime: detail.create_time || 0,
        authorUid: author.uid || '',
        authorNickname: author.nickname || '',
        authorAvatar: author.avatar_thumb?.url_list?.[0] || '',
        authorSecUid: author.sec_uid || '',
        commentCount: stats.comment_count || 0,
        diggCount: stats.digg_count || 0,
        shareCount: stats.share_count || 0,
        collectCount: stats.collect_count || 0,
      };
    } catch (error) {
      this.logger.error(`抖音视频详情API调用异常: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取抖音用户信息
   * POST /fbmain/monitor/v3/douyin_user_data
   */
  async getUserInfo(secUserId: string) {
    try {
      const url = `${this.baseUrl}/fbmain/monitor/v3/douyin_user_data?key=${this.apiKey}`;
      const formData = new FormData();
      formData.append('sec_user_id', secUserId);

      const response = await fetch(url, { method: 'POST', body: formData });
      if (!response.ok) return null;

      const result = await response.json();
      if (result.code !== 0) return null;

      const user = result.data?.user;
      if (!user) return null;

      return {
        nickname: user.nickname || '',
        followerCount: user.mplatform_followers_count || user.max_follower_count || 0,
        followingCount: user.following_count || 0,
        signature: user.signature || '',
        totalFavorited: user.total_favorited || 0,
      };
    } catch (error) {
      this.logger.error(`抖音用户信息API调用异常: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取抖音用户主页历史发布
   * POST /fbmain/monitor/v3/douyin_user_post
   */
  async getUserPosts(secUserId: string, maxCursor?: string) {
    try {
      const url = `${this.baseUrl}/fbmain/monitor/v3/douyin_user_post?key=${this.apiKey}`;
      const formData = new FormData();
      formData.append('sec_user_id', secUserId);
      if (maxCursor) formData.append('max_cursor', maxCursor);

      const response = await fetch(url, { method: 'POST', body: formData });
      if (!response.ok) return { posts: [], maxCursor: '' };

      const result = await response.json();
      if (result.code !== 0) return { posts: [], maxCursor: '' };

      const awemeList = result.data?.aweme_list || [];
      return {
        posts: awemeList.map((item: any) => ({
          awemeId: item.aweme_id,
          title: item.item_title || item.desc || '',
          commentCount: item.statistics?.comment_count || 0,
          diggCount: item.statistics?.digg_count || 0,
          shareCount: item.statistics?.share_count || 0,
          collectCount: item.statistics?.collect_count || 0,
        })),
        maxCursor: result.data?.max_cursor || '',
      };
    } catch (error) {
      this.logger.error(`抖音用户发布API调用异常: ${error.message}`);
      return { posts: [], maxCursor: '' };
    }
  }
}
