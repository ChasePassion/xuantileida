import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoSearchResult, KuaishouHotItem } from '../interfaces/api.interface';

@Injectable()
export class KuaishouApiService {
  private readonly logger = new Logger(KuaishouApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('api.jizhile.baseUrl') || 'https://www.dajiala.com';
    this.apiKey = this.configService.get<string>('api.jizhile.apiKey') || '';
  }

  /**
   * 快手搜索视频
   * POST /fbmain/monitor/v3/ks_search_video_v1
   */
  async searchVideos(keyword: string): Promise<VideoSearchResult[]> {
    try {
      const url = `${this.baseUrl}/fbmain/monitor/v3/ks_search_video_v1?key=${this.apiKey}`;
      const formData = new FormData();
      formData.append('keyword', keyword);

      const response = await fetch(url, { method: 'POST', body: formData });
      if (!response.ok) {
        this.logger.error(`快手搜索API请求失败: ${response.status}`);
        return [];
      }

      const result = await response.json();
      if (result.code !== 0) {
        this.logger.error(`快手搜索API错误: ${result.msg}`);
        return [];
      }

      const feeds = result.data?.mixFeeds || result.data?.feeds || [];
      return feeds.map((item: any) => {
        const feed = item.feed || item;
        return {
          title: feed.pureTitle || feed.caption || '',
          coverUrl: feed.coverUrl || feed.headUrl || '',
          videoUrl: '',
          duration: Math.floor((feed.duration || 0) / 1000),
          likeCount: feed.likeCount || feed.like_count || 0,
          commentCount: feed.comment_count || feed.commentCount || 0,
          shareCount: feed.share_count || feed.shareCount || 0,
          collectCount: feed.collect_count || feed.collectCount || 0,
          creatorName: feed.user_name || feed.userName || '',
          creatorId: feed.user_id || feed.userId || '',
          platform: 'kuaishou',
        };
      });
    } catch (error) {
      this.logger.error(`快手搜索API调用异常: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取快手热搜榜单
   * POST /fbmain/monitor/v3/ks_hot_board_v2
   */
  async getHotBoard(): Promise<KuaishouHotItem[]> {
    try {
      const url = `${this.baseUrl}/fbmain/monitor/v3/ks_hot_board_v2?key=${this.apiKey}`;
      const response = await fetch(url, { method: 'POST' });
      if (!response.ok) {
        this.logger.error(`快手榜单API请求失败: ${response.status}`);
        return [];
      }

      const result = await response.json();
      if (result.code !== 0) {
        this.logger.error(`快手榜单API错误: ${result.msg}`);
        return [];
      }

      const topHots = result.data?.topHots || [];
      const hots = result.data?.hots || [];
      const allHots = [...topHots, ...hots];

      return allHots.map((item: any) => ({
        keyword: item.keyword || '',
        hotValue: item.hotValue || 0,
      }));
    } catch (error) {
      this.logger.error(`快手榜单API调用异常: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取快手视频详情
   * POST /fbmain/monitor/v3/ks_video_detail_app
   */
  async getVideoDetail(photoId: string) {
    try {
      const url = `${this.baseUrl}/fbmain/monitor/v3/ks_video_detail_app?key=${this.apiKey}`;
      const formData = new FormData();
      formData.append('photo_id', photoId);

      const response = await fetch(url, { method: 'POST', body: formData });
      if (!response.ok) return null;

      const result = await response.json();
      if (result.code !== 0) return null;

      return result.data;
    } catch (error) {
      this.logger.error(`快手视频详情API调用异常: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取快手用户信息
   * POST /fbmain/monitor/v3/ks_user_info_app
   */
  async getUserInfo(userId: string) {
    try {
      const url = `${this.baseUrl}/fbmain/monitor/v3/ks_user_info_app?key=${this.apiKey}`;
      const formData = new FormData();
      formData.append('user_id', userId);

      const response = await fetch(url, { method: 'POST', body: formData });
      if (!response.ok) return null;

      const result = await response.json();
      if (result.code !== 0) return null;

      return result.data;
    } catch (error) {
      this.logger.error(`快手用户信息API调用异常: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取快手用户主页发布
   * POST /fbmain/monitor/v3/ks_user_post_app
   */
  async getUserPosts(userId: string, pcursor?: string) {
    try {
      const url = `${this.baseUrl}/fbmain/monitor/v3/ks_user_post_app?key=${this.apiKey}`;
      const formData = new FormData();
      formData.append('user_id', userId);
      if (pcursor) formData.append('pcursor', pcursor);

      const response = await fetch(url, { method: 'POST', body: formData });
      if (!response.ok) return { posts: [], pcursor: '' };

      const result = await response.json();
      if (result.code !== 0) return { posts: [], pcursor: '' };

      return {
        posts: result.data?.feeds || [],
        pcursor: result.data?.pcursor || '',
      };
    } catch (error) {
      this.logger.error(`快手用户发布API调用异常: ${error.message}`);
      return { posts: [], pcursor: '' };
    }
  }
}
