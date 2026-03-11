import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateRechargeDto {
  @ApiProperty({ description: '充值金额（元）', enum: [9.9, 29.9, 59.9, 99.9] })
  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
