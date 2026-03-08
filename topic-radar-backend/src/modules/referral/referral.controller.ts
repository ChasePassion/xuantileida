import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class BindReferralDto {
  @ApiProperty({ description: '推荐人code (userId)' })
  @IsNotEmpty()
  @IsString()
  referrerCode: string;
}

@ApiTags('推荐激励')
@ApiBearerAuth()
@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post('bind')
  @ApiOperation({ summary: '绑定推荐关系' })
  async bind(
    @CurrentUser('sub') userId: string,
    @Body() dto: BindReferralDto,
  ) {
    const result = await this.referralService.bindReferral(userId, dto.referrerCode);
    return { bound: !!result };
  }

  @Get('stats')
  @ApiOperation({ summary: '我的推荐统计' })
  async stats(@CurrentUser('sub') userId: string) {
    return this.referralService.getMyReferralStats(userId);
  }

  @Get('list')
  @ApiOperation({ summary: '我的推荐明细' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.referralService.getMyReferrals(userId, +page, +limit);
  }

  @Get('poster-data')
  @ApiOperation({ summary: '获取分享海报数据' })
  async posterData(@CurrentUser('sub') userId: string) {
    const stats = await this.referralService.getMyReferralStats(userId);
    return {
      referralCode: stats.referralCode,
      qrCodePath: `pages/discover/index?ref=${userId}`,
      totalReferred: stats.totalReferred,
    };
  }

  @Get('tiers')
  @ApiOperation({ summary: '获取推荐阶梯配置' })
  async getTiers() {
    return this.referralService.getTiers();
  }

  @Get('my-tier')
  @ApiOperation({ summary: '获取我的推荐等级' })
  @UseGuards(AuthGuard)
  async getMyTier(@CurrentUser('sub') userId: string) {
    return this.referralService.getMyTier(userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: '推荐排行榜' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLeaderboard(@Query('limit') limit?: number) {
    return this.referralService.getLeaderboard(limit || 20);
  }
}
