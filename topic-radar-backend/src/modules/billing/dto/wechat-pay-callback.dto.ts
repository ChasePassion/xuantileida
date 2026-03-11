import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class WechatPayCallbackAmountDto {
  @IsInt()
  @Min(1)
  total: number;

  @IsString()
  @IsNotEmpty()
  currency: string;
}

export class WechatPayCallbackDto {
  @IsString()
  @IsNotEmpty()
  transaction_id: string;

  @IsUUID()
  out_trade_no: string;

  @IsString()
  @IsNotEmpty()
  mchid: string;

  @IsString()
  @IsNotEmpty()
  trade_state: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WechatPayCallbackAmountDto)
  amount: WechatPayCallbackAmountDto;
}
