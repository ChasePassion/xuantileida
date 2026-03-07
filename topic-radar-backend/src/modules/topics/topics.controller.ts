import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TopicsService } from './topics.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('选题')
@ApiBearerAuth()
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: '获取所有行业分类' })
  async getCategories() {
    return this.topicsService.getCategories();
  }

  @Get('daily')
  @ApiOperation({ summary: '获取今日AI推荐选题（免费版限3个，VIP全部）' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDailyTopics(
    @CurrentUser('sub') userId: string,
    @CurrentUser('membership') membership: string,
    @CurrentUser('membershipExpiresAt') membershipExpiresAt: string,
    @Query('category') category?: string,
    @Query('limit') limit?: number,
  ) {
    const isVip = this.topicsService.checkVipStatus(membership, membershipExpiresAt);
    return this.topicsService.getDailyTopics({ category, limit, isVip });
  }

  @Get('daily/stats')
  @ApiOperation({ summary: '获取今日选题统计' })
  async getDailyStats() {
    return this.topicsService.getDailyStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取选题详情（免费版每天限1个）' })
  async getTopicDetail(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('membership') membership: string,
    @CurrentUser('membershipExpiresAt') membershipExpiresAt: string,
  ) {
    const isVip = this.topicsService.checkVipStatus(membership, membershipExpiresAt);
    return this.topicsService.getTopicDetail(id, userId, isVip);
  }
}
