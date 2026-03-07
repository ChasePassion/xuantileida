import { registerAs } from '@nestjs/config';

export default registerAs('api', () => ({
  jizhile: {
    apiKey: process.env.JIZHILE_API_KEY,
    baseUrl: process.env.JIZHILE_BASE_URL || 'https://www.dajiala.com',
  },
  ark: {
    apiKey: process.env.ARK_API_KEY,
    baseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    model: process.env.ARK_MODEL || 'doubao-seed-2.0-pro-32k',
  },
  cos: {
    secretId: process.env.COS_SECRET_ID,
    secretKey: process.env.COS_SECRET_KEY,
    bucket: process.env.COS_BUCKET,
    region: process.env.COS_REGION || 'ap-guangzhou',
  },
}));
