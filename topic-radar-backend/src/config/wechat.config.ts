import { registerAs } from '@nestjs/config';

export default registerAs('wechat', () => ({
  appId: process.env.WECHAT_APPID,
  secret: process.env.WECHAT_SECRET,
  pay: {
    mchId: process.env.WECHAT_PAY_MCHID,
    key: process.env.WECHAT_PAY_KEY,
    certPath: process.env.WECHAT_PAY_CERT_PATH,
    keyPath: process.env.WECHAT_PAY_KEY_PATH,
  },
}));
