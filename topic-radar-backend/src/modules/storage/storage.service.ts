import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'public/uploads';
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

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
    throw new Error(
      `文件存储尚未接入腾讯云 COS 预签名能力，上传功能已禁用。目标对象: ${key}，内容类型: ${contentType}`,
    );
  }

  /**
   * 生成 COS 预签名下载 URL
   */
  async getPresignedDownloadUrl(key: string) {
    this.logger.warn(`COS 预签名下载未接入 SDK，已阻止生成假地址: ${key}`);
    throw new Error(
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

  /**
   * 保存图片到本地存储
   */
  async saveImage(userId: string, file: any): Promise<{ url: string }> {
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    const userDir = path.join(this.uploadDir, userId);

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const filepath = path.join(userDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    const url = `/uploads/${userId}/${filename}`;
    this.logger.log(`图片上传成功: ${url}`);

    return { url };
  }
}
