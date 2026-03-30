import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RetentionService } from './retention.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('留存激励')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('retention')
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @Get('my-offers')
  @ApiOperation({ summary: '获取我的留存优惠' })
  async getMyOffers(@CurrentUser('sub') userId: string) {
    return this.retentionService.getMyOffers(userId);
  }

  @Post('accept/:offerId')
  @ApiOperation({ summary: '接受留存优惠' })
  async acceptOffer(
    @Param('offerId') offerId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.retentionService.acceptOffer(offerId, userId);
  }

  @Post('dismiss/:offerId')
  @ApiOperation({ summary: '忽略留存优惠' })
  async dismissOffer(
    @Param('offerId') offerId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.retentionService.dismissOffer(offerId, userId);
  }

  @Get('health')
  @ApiOperation({ summary: '获取用户健康评分' })
  async getHealthScore(@CurrentUser('sub') userId: string) {
    return this.retentionService.getHealthScore(userId);
  }
}
