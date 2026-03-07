import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 生成 COS 预签名上传 URL
   */
  async getPresignedUploadUrl(
    userId: string,
    filename: string,
    contentType: string,
  ) {
    const bucket = this.configService.get<string>('COS_BUCKET') || 'topic-radar-dev';
    const region = this.configService.get<string>('COS_REGION') || 'ap-guangzhou';
    const ext = path.extname(filename);
    const key = `uploads/${userId}/${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;

    // 生产环境: 使用腾讯云 COS SDK 生成真正的预签名 URL
    // 开发环境: 返回模拟 URL
    const uploadUrl = `https://${bucket}.cos.${region}.myqcloud.com/${key}?sign=dev_placeholder`;
    const accessUrl = `https://${bucket}.cos.${region}.myqcloud.com/${key}`;

    return {
      uploadUrl,
      accessUrl,
      key,
      contentType,
      expiresIn: 3600,
    };
  }

  /**
   * 生成 COS 预签名下载 URL
   */
  async getPresignedDownloadUrl(key: string) {
    const bucket = this.configService.get<string>('COS_BUCKET') || 'topic-radar-dev';
    const region = this.configService.get<string>('COS_REGION') || 'ap-guangzhou';

    return {
      downloadUrl: `https://${bucket}.cos.${region}.myqcloud.com/${key}?sign=dev_placeholder`,
      expiresIn: 3600,
    };
  }

  /**
   * 验证文件类型
   */
  validateFileType(filename: string, allowedTypes: string[]) {
    const ext = path.extname(filename).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      throw new BadRequestException(
        `不支持的文件类型 ${ext}，允许: ${allowedTypes.join(', ')}`,
      );
    }
  }
}
