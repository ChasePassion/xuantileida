import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // 静态文件（管理后台）
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // 全局前缀
  app.setGlobalPrefix(process.env.API_PREFIX || 'api');

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger API 文档
  const swaggerConfig = new DocumentBuilder()
    .setTitle('选题雷达 API')
    .setDescription('爆款视频选题与智能生成工具 - 后端接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`服务启动成功 http://localhost:${port}`);
  logger.log(`API 文档 http://localhost:${port}/docs`);
  logger.log(`管理后台 http://localhost:${port}/admin.html`);
}

bootstrap();
