import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SkipWrap } from '../../common/decorators/skip-wrap.decorator';
import { GetPaymentStatusDto } from './dto/get-payment-status.dto';
import { ReturnPaymentStatusDto } from './dto/return-payment-status.dto';
import { PaymentService } from './payment.service';

@Public()
@SkipWrap()
@Controller('rest')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('getPaymentAmountAndStatus')
  async getPaymentAmountAndStatus(@Body() dto: GetPaymentStatusDto) {
    return this.paymentService.getPaymentAmountAndStatus(dto.order);
  }

  @Post('returnPaymentStatus')
  async returnPaymentStatus(@Body() dto: ReturnPaymentStatusDto) {
    return this.paymentService.returnPaymentStatus(dto);
  }
}
