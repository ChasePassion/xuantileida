import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class PurchaseMembershipDto {
  @ApiProperty({ description: '会员类型', enum: ['monthly', 'yearly'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['monthly', 'yearly'])
  plan: string;
}
