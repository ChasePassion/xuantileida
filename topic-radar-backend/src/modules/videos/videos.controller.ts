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
  @ApiOperation({ summary: '按选题获取视频列表（可按平台筛选）' })
  @ApiQuery({ name: 'platform', required: false, enum: ['wechat_video', 'douyin', 'kuaishou'], description: '平台筛选' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getVideosByTopic(
    @Param('topicId') topicId: string,
    @CurrentUser('sub') userId: string,
    @Query('platform') platform?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.videosService.getVideosByTopic(topicId, userId, platform, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取视频详情' })
  async getVideoDetail(@Param('id') id: string) {
    return this.videosService.getVideoDetail(id);
  }
}
