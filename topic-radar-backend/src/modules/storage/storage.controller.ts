import {
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

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
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.mp4',
      '.mp3',
      '.wav',
    ]);
    return this.storageService.getPresignedUploadUrl(
      userId,
      filename,
      contentType,
    );
  }

  @Post('upload/image')
  @ApiOperation({ summary: '上传图片' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException('仅支持 jpg/png/gif/webp 格式图片'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: any,
  ) {
    return this.storageService.saveImage(userId, file);
  }
}
