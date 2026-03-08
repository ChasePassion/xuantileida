import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PromotionService } from './promotion.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SubmitPromoNoteDto {
  @ApiProperty({ description: '推广平台' })
  @IsNotEmpty()
  @IsString()
  platform: string;

  @ApiProperty({ description: '截图URL' })
  @IsNotEmpty()
  @IsString()
  screenshotUrl: string;

  @ApiProperty({ description: '笔记链接（可选）', required: false })
  @IsOptional()
  @IsString()
  noteUrl?: string;
}

class ReviewNoteDto {
  @ApiProperty({ description: '是否通过' })
  @IsNotEmpty()
  @IsBoolean()
  approved: boolean;

  @ApiProperty({ description: '拒绝原因（拒绝时必填）', required: false })
  @IsOptional()
  @IsString()
  rejectReason?: string;
}

@ApiTags('推广激励')
@Controller('api/promo')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get('rules')
  @ApiOperation({ summary: '获取推广规则（公开）' })
  async getRules() {
    return this.promotionService.getPromoRules();
  }

  @Post('submit')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交推广笔记' })
  async submit(
    @CurrentUser('sub') userId: string,
    @Body() dto: SubmitPromoNoteDto,
  ) {
    return this.promotionService.submitPromoNote(
      userId,
      dto.platform,
      dto.screenshotUrl,
      dto.noteUrl,
    );
  }

  @Get('my-records')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的推广记录' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async myRecords(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.promotionService.getMyRecords(userId, +page, +limit);
  }

  @Post(':id/review')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '审核推广笔记（管理员）' })
  async review(
    @CurrentUser('sub') reviewerId: string,
    @Param('id') noteId: string,
    @Body() dto: ReviewNoteDto,
  ) {
    return this.promotionService.reviewNote(
      noteId,
      reviewerId,
      dto.approved,
      dto.rejectReason,
    );
  }

  @Get('templates')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取推广模板' })
  @ApiQuery({ name: 'platform', required: false, type: String })
  @ApiQuery({ name: 'targetAudience', required: false, type: String })
  async templates(
    @Query('platform') platform?: string,
    @Query('targetAudience') targetAudience?: string,
  ) {
    return this.promotionService.getTemplates(platform, targetAudience);
  }
}
