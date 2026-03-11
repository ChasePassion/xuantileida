import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  it('requires JWT_SECRET', () => {
    expect(() => validateEnvironment({})).toThrow('JWT_SECRET');
  });

  it('rejects partial wechat pay config', () => {
    expect(() =>
      validateEnvironment({
        JWT_SECRET: 'test-secret',
        WECHAT_PAY_MCHID: '123456',
      }),
    ).toThrow('微信支付');
  });

  it('rejects partial cos config', () => {
    expect(() =>
      validateEnvironment({
        JWT_SECRET: 'test-secret',
        COS_BUCKET: 'topic-radar',
      }),
    ).toThrow('腾讯云 COS');
  });

  it('accepts complete optional groups', () => {
    expect(
      validateEnvironment({
        JWT_SECRET: 'test-secret',
        WECHAT_PAY_MCHID: '123456',
        WECHAT_PAY_KEY: 'abc123',
        COS_SECRET_ID: 'secret-id',
        COS_SECRET_KEY: 'secret-key',
        COS_BUCKET: 'bucket',
        COS_REGION: 'ap-guangzhou',
      }),
    ).toEqual(
      expect.objectContaining({
        JWT_SECRET: 'test-secret',
      }),
    );
  });
});
