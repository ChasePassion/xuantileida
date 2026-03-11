type EnvRecord = Record<string, unknown>;

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validateOptionalGroup(
  config: EnvRecord,
  groupName: string,
  keys: string[],
): void {
  const presentKeys = keys.filter((key) => asOptionalString(config[key]));
  if (presentKeys.length > 0 && presentKeys.length !== keys.length) {
    const missingKeys = keys.filter((key) => !asOptionalString(config[key]));
    throw new Error(
      `${groupName} 配置不完整，缺少: ${missingKeys.join(', ')}`,
    );
  }
}

export function validateEnvironment(config: EnvRecord): EnvRecord {
  const jwtSecret = asOptionalString(config.JWT_SECRET);
  if (!jwtSecret) {
    throw new Error('JWT_SECRET 未配置，服务拒绝启动');
  }

  validateOptionalGroup(config, '微信支付', ['WECHAT_PAY_MCHID', 'WECHAT_PAY_KEY']);
  validateOptionalGroup(config, '腾讯云 COS', [
    'COS_SECRET_ID',
    'COS_SECRET_KEY',
    'COS_BUCKET',
    'COS_REGION',
  ]);

  return config;
}
