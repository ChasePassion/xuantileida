import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('视频')
@ApiBearerAuth()
@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get('by-topic/:topicId')
  @ApiOperation({ summary: '按选题获取视频列表（免费版数据打码）' })
  @ApiQuery({ name: 'platform', required: false, enum: ['wechat_video', 'douyin', 'kuaishou'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getVideosByTopic(
    @Param('topicId') topicId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('membership') membership: string,
    @CurrentUser('membershipExpiresAt') membershipExpiresAt: string,
    @Query('platform') platform?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const isVip = membership === 'premium' && membershipExpiresAt && new Date(membershipExpiresAt) > new Date();
    return this.videosService.getVideosByTopic(topicId, userId, !!isVip, platform, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取视频详情' })
  async getVideoDetail(
    @Param('id') id: string,
    @CurrentUser('membership') membership: string,
    @CurrentUser('membershipExpiresAt') membershipExpiresAt: string,
  ) {
    const isVip = membership === 'premium' && membershipExpiresAt && new Date(membershipExpiresAt) > new Date();
    return this.videosService.getVideoDetail(id, !!isVip);
  }
}
