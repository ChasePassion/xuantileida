import {
  Injectable,
  Logger,
  BadRequestException,
  NotImplementedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  /**
   * 生成 COS 预签名上传 URL
   */
  async getPresignedUploadUrl(
    userId: string,
    filename: string,
    contentType: string,
  ) {
    const ext = path.extname(filename);
    const key = `uploads/${userId}/${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    this.logger.warn(`COS 预签名上传未接入 SDK，已阻止生成假地址: ${key}`);
    throw new NotImplementedException(
      `文件存储尚未接入腾讯云 COS 预签名能力，上传功能已禁用。目标对象: ${key}，内容类型: ${contentType}`,
    );
  }

  /**
   * 生成 COS 预签名下载 URL
   */
  async getPresignedDownloadUrl(key: string) {
    this.logger.warn(`COS 预签名下载未接入 SDK，已阻止生成假地址: ${key}`);
    throw new NotImplementedException(
      `文件存储尚未接入腾讯云 COS 预签名能力，下载功能已禁用。目标对象: ${key}`,
    );
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
