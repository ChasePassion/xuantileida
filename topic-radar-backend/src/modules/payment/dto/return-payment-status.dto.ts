import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class ReturnPaymentStatusDto {
  @IsNotEmpty()
  @IsString()
  order: string;

  @IsNotEmpty()
  @IsString()
  wxTransactionId: string;

  @IsNotEmpty()
  @IsString()
  finishTime: string;

  @IsNotEmpty()
  @IsInt()
  paymentState: number;
}
