import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoSearchResult } from '../interfaces/api.interface';

@Injectable()
export class VideoSearchApiService {
  private readonly logger = new Logger(VideoSearchApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('api.jizhile.baseUrl') || 'https://www.dajiala.com';
    this.apiKey = this.configService.get<string>('api.jizhile.apiKey') || '';
  }

  /**
   * 搜索视频号视频 (暂用抖音搜索代替，后续接入视频号专用API)
   * 视频号暂无公开搜索API，MVP阶段标记为 wechat_video 平台
   * @param keyword 关键词
   */
  async searchVideos(keyword: string): Promise<VideoSearchResult[]> {
    // MVP阶段：视频号暂无公开搜索API
    // 返回空数组，视频数据由抖音+快手提供
    // 后续对接视频号创作者API后补充
    this.logger.log(`视频号搜索: "${keyword}" (MVP暂无视频号API，跳过)`);
    return [];
  }
}
