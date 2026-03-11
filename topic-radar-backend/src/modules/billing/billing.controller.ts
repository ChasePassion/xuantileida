import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateRechargeDto } from './dto/create-recharge.dto';
import { PurchaseMembershipDto } from './dto/purchase-membership.dto';
import { WechatPayCallbackDto } from './dto/wechat-pay-callback.dto';

@ApiTags('计费')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Public()
  @Get('pricing')
  @ApiOperation({ summary: '获取定价规则（雷达币套餐 + VIP价格）' })
  async getPricing() {
    return this.billingService.getPricing();
  }

  @ApiBearerAuth()
  @Post('recharge')
  @ApiOperation({ summary: '创建雷达币充值订单' })
  async createRecharge(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRechargeDto,
  ) {
    return this.billingService.createRechargeOrder(userId, dto.amount);
  }

  @ApiBearerAuth()
  @Post('subscribe')
  @ApiOperation({ summary: '购买VIP会员（月卡59.9/年卡499）' })
  async subscribe(
    @CurrentUser('sub') userId: string,
    @Body() dto: PurchaseMembershipDto,
  ) {
    return this.billingService.createVipOrder(userId, dto.plan);
  }

  @Public()
  @Post('wechat-callback')
  @ApiOperation({ summary: '微信支付回调' })
  @ApiHeader({ name: 'x-wechat-signature', required: true })
  @ApiHeader({ name: 'x-wechat-timestamp', required: true })
  @ApiHeader({ name: 'x-wechat-nonce', required: true })
  async wechatCallback(
    @Body() body: WechatPayCallbackDto,
    @Headers('x-wechat-signature') signature?: string,
    @Headers('x-wechat-timestamp') timestamp?: string,
    @Headers('x-wechat-nonce') nonce?: string,
  ) {
    return this.billingService.handleWechatCallback(body, JSON.stringify(body), {
      signature,
      timestamp,
      nonce,
    });
  }

  @ApiBearerAuth()
  @Get('transactions')
  @ApiOperation({ summary: '交易记录' })
  @ApiQuery({ name: 'type', required: false, enum: ['recharge', 'consume'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTransactions(
    @CurrentUser('sub') userId: string,
    @Query('type') type?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.billingService.getTransactions(userId, type, +page, +limit);
  }
}
