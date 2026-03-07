import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('文件存储')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('presigned-url')
  @ApiOperation({ summary: '获取预签名上传URL' })
  @ApiQuery({ name: 'filename', required: true })
  @ApiQuery({ name: 'contentType', required: false })
  async getPresignedUrl(
    @CurrentUser('sub') userId: string,
    @Query('filename') filename: string,
    @Query('contentType') contentType = 'application/octet-stream',
  ) {
    this.storageService.validateFileType(filename, [
      '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3', '.wav',
    ]);
    return this.storageService.getPresignedUploadUrl(userId, filename, contentType);
  }
}
