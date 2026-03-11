import * as crypto from 'crypto';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { BillingService } from './billing.service';
import { RechargeOrder } from './entities/recharge-order.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { User } from '../users/entities/user.entity';

function signCallback(payload: string, key: string, timestamp: string, nonce: string) {
  return crypto
    .createHmac('sha256', key)
    .update(`${timestamp}\n${nonce}\n${payload}\n`)
    .digest('hex');
}

describe('BillingService', () => {
  const configValues: Record<string, string> = {
    'wechat.pay.mchId': 'mch_123',
    'wechat.pay.key': 'secret_key',
  };

  function createService(transactionImpl: Parameters<DataSource['transaction']>[0]) {
    const dataSource = {
      transaction: jest.fn(transactionImpl),
    } as unknown as DataSource;

    return new BillingService(
      dataSource,
      { get: jest.fn((key: string) => configValues[key]) } as unknown as ConfigService,
      {} as any,
      {} as any,
    );
  }

  it('credits user balance for recharge callbacks', async () => {
    const order = {
      id: 'order-1',
      userId: 'user-1',
      status: 'pending',
      orderType: 'recharge',
      paymentNo: null,
      paidAmount: 29.9,
      amount: 29.9,
      coins: 40,
      vipDays: null,
    } as RechargeOrder;
    const balance = {
      userId: 'user-1',
      balance: 10,
      totalRecharged: 0,
    } as UserBalance;
    const manager = {
      findOne: jest.fn(async (entity: unknown, options: any) => {
        if (entity === RechargeOrder) return options.where.id === order.id ? order : null;
        if (entity === UserBalance) return balance;
        return null;
      }),
      save: jest.fn(async (entity: any) => entity),
      create: jest.fn((_entity: unknown, value: any) => value),
    };
    const service = createService(async (cb) => cb(manager as any));
    const callback = {
      transaction_id: 'wx-pay-1',
      out_trade_no: 'order-1',
      mchid: 'mch_123',
      trade_state: 'SUCCESS',
      amount: { total: 2990, currency: 'CNY' },
    };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = 'nonce-1';
    const payload = JSON.stringify(callback);
    const signature = signCallback(payload, configValues['wechat.pay.key'], timestamp, nonce);

    const result = await service.handleWechatCallback(callback as any, payload, {
      signature,
      timestamp,
      nonce,
    });

    expect(result).toEqual({ code: 'SUCCESS', message: 'OK' });
    expect(balance.balance).toBe(50);
    expect(balance.totalRecharged).toBe(29.9);
  });

  it('extends vip membership for vip callbacks', async () => {
    const order = {
      id: 'order-2',
      userId: 'user-2',
      status: 'pending',
      orderType: 'vip',
      paymentNo: null,
      paidAmount: 59.9,
      amount: 59.9,
      coins: null,
      vipDays: 30,
    } as RechargeOrder;
    const user = {
      id: 'user-2',
      membership: 'free',
      membershipExpiresAt: null,
    } as User;
    const manager = {
      findOne: jest.fn(async (entity: unknown, options: any) => {
        if (entity === RechargeOrder) return options.where.id === order.id ? order : null;
        if (entity === User) return user;
        return null;
      }),
      save: jest.fn(async (entity: any) => entity),
      create: jest.fn((_entity: unknown, value: any) => value),
    };
    const service = createService(async (cb) => cb(manager as any));
    const callback = {
      transaction_id: 'wx-pay-2',
      out_trade_no: 'order-2',
      mchid: 'mch_123',
      trade_state: 'SUCCESS',
      amount: { total: 5990, currency: 'CNY' },
    };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = 'nonce-2';
    const payload = JSON.stringify(callback);
    const signature = signCallback(payload, configValues['wechat.pay.key'], timestamp, nonce);

    await service.handleWechatCallback(callback as any, payload, {
      signature,
      timestamp,
      nonce,
    });

    expect(user.membership).toBe('premium');
    expect(user.membershipExpiresAt).toBeInstanceOf(Date);
  });

  it('is idempotent for repeated callbacks with same payment number', async () => {
    const order = {
      id: 'order-3',
      userId: 'user-3',
      status: 'paid',
      orderType: 'recharge',
      paymentNo: 'wx-pay-3',
      paidAmount: 9.9,
      amount: 9.9,
      coins: 10,
      vipDays: null,
    } as RechargeOrder;
    const manager = {
      findOne: jest.fn(async (entity: unknown) => (entity === RechargeOrder ? order : null)),
      save: jest.fn(async (entity: any) => entity),
      create: jest.fn((_entity: unknown, value: any) => value),
    };
    const service = createService(async (cb) => cb(manager as any));
    const callback = {
      transaction_id: 'wx-pay-3',
      out_trade_no: 'order-3',
      mchid: 'mch_123',
      trade_state: 'SUCCESS',
      amount: { total: 990, currency: 'CNY' },
    };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = 'nonce-3';
    const payload = JSON.stringify(callback);
    const signature = signCallback(payload, configValues['wechat.pay.key'], timestamp, nonce);

    const result = await service.handleWechatCallback(callback as any, payload, {
      signature,
      timestamp,
      nonce,
    });

    expect(result).toEqual({ code: 'SUCCESS', message: 'OK' });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rejects callbacks with invalid signature', async () => {
    const service = createService(async (cb) => cb({} as any));

    await expect(
      service.handleWechatCallback(
        {
          transaction_id: 'wx-pay-4',
          out_trade_no: 'd0f3d42b-a5b4-4f33-b6c7-3f87bdf7e969',
          mchid: 'mch_123',
          trade_state: 'SUCCESS',
          amount: { total: 990, currency: 'CNY' },
        } as any,
        '{}',
        {
          signature: 'invalid',
          timestamp: String(Math.floor(Date.now() / 1000)),
          nonce: 'nonce-4',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('disables payment order creation when pay config is missing', async () => {
    const service = new BillingService(
      { transaction: jest.fn() } as unknown as DataSource,
      { get: jest.fn(() => undefined) } as unknown as ConfigService,
      {} as any,
      {} as any,
    );

    await expect(service.createRechargeOrder('user-1', 9.9)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
