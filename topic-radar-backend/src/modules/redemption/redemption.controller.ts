import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RedemptionService } from './redemption.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class RedeemDto {
  @ApiProperty({ description: '兑换码' })
  @IsNotEmpty()
  @IsString()
  code: string;
}

@ApiTags('兑换码')
@ApiBearerAuth()
@Controller('redemption')
export class RedemptionController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Post('redeem')
  @ApiOperation({ summary: '使用兑换码' })
  async redeem(
    @CurrentUser('sub') userId: string,
    @Body() dto: RedeemDto,
  ) {
    return this.redemptionService.redeem(userId, dto.code);
  }

  @Get('records')
  @ApiOperation({ summary: '我的兑换记录' })
  async records(@CurrentUser('sub') userId: string) {
    return this.redemptionService.getMyRecords(userId);
  }

  @Post('generate')
  @ApiOperation({ summary: '批量生成兑换码（管理接口）' })
  async generate(@Body() body: any) {
    return this.redemptionService.generateCodes({
      codeType: body.codeType || 'vip_days',
      value: body.value || 7,
      count: body.count || 10,
      maxUses: body.maxUses || 1,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      batchName: body.batchName,
    });
  }
}
