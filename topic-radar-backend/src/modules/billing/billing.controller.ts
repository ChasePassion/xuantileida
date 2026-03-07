import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { IsNotEmpty, IsNumber, IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateRechargeDto {
  @ApiProperty({ description: '充值金额', enum: [50, 100, 200, 500, 1000] })
  @IsNotEmpty()
  @IsNumber()
  @IsIn([50, 100, 200, 500, 1000])
  amount: number;
}

class PurchaseMembershipDto {
  @ApiProperty({ description: '会员类型', enum: ['monthly', 'quarterly', 'yearly'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['monthly', 'quarterly', 'yearly'])
  plan: string;
}

@ApiTags('计费')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Public()
  @Get('pricing')
  @ApiOperation({ summary: '获取定价规则' })
  async getPricing() {
    return this.billingService.getPricing();
  }

  @ApiBearerAuth()
  @Post('recharge')
  @ApiOperation({ summary: '创建充值订单' })
  async createRecharge(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRechargeDto,
  ) {
    return this.billingService.createRechargeOrder(userId, dto.amount);
  }

  @ApiBearerAuth()
  @Post('membership')
  @ApiOperation({ summary: '购买会员' })
  async purchaseMembership(
    @CurrentUser('sub') userId: string,
    @Body() dto: PurchaseMembershipDto,
  ) {
    return this.billingService.purchaseMembership(userId, dto.plan);
  }

  @Public()
  @Post('wechat-callback')
  @ApiOperation({ summary: '微信支付回调' })
  async wechatCallback(@Body() body: any) {
    // TODO: 验证微信签名
    return this.billingService.handleWechatCallback(
      body.transaction_id,
      body.out_trade_no,
    );
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
