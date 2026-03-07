import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('拆解分析')
@ApiBearerAuth()
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('video/:videoId')
  @ApiOperation({ summary: '获取视频拆解报告（预览/完整）' })
  async getReport(
    @Param('videoId') videoId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.analysisService.getReportByVideoId(videoId, userId);
  }

  @Post('unlock/:reportId')
  @ApiOperation({ summary: '解锁拆解报告（扣费）' })
  async unlockReport(
    @Param('reportId') reportId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.analysisService.unlockReport(reportId, userId);
  }

  @Get('my-unlocks')
  @ApiOperation({ summary: '我的已解锁报告' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyUnlocks(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.analysisService.getMyUnlocks(userId, +page, +limit);
  }
}
