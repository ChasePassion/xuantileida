import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientBalanceException extends HttpException {
  constructor(balance: number, required: number) {
    super(
      {
        code: HttpStatus.PAYMENT_REQUIRED,
        message: '余额不足',
        error: 'InsufficientBalance',
        details: { balance, required, shortfall: required - balance },
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

export class ReportAlreadyUnlockedException extends HttpException {
  constructor(reportId: string) {
    super(
      {
        code: HttpStatus.CONFLICT,
        message: '您已解锁过该报告',
        error: 'AlreadyUnlocked',
        details: { reportId },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class MembershipRequiredException extends HttpException {
  constructor() {
    super(
      {
        code: HttpStatus.FORBIDDEN,
        message: '该功能需要升级会员',
        error: 'MembershipRequired',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
