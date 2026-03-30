import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyCrawlService } from './services/daily-crawl.service';
import { PushNotificationService } from './services/push-notification.service';
import { OrderTimeoutService } from './services/order-timeout.service';
import { TaskLog } from './entities/task-log.entity';
import { DailyBatch } from '../topics/entities/daily-batch.entity';
import { Topic } from '../topics/entities/topic.entity';
import { HotArticle } from '../topics/entities/hot-article.entity';
import { Category } from '../topics/entities/category.entity';
import { ViralVideo } from '../videos/entities/viral-video.entity';
import { TopicVideo } from '../videos/entities/topic-video.entity';
import { UserConfig } from '../users/entities/user-config.entity';
import { PaymentOrder } from '../payment/entities/payment-order.entity';
import { ExternalModule } from '../external/external.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      TaskLog,
      DailyBatch,
      Topic,
      HotArticle,
      Category,
      ViralVideo,
      TopicVideo,
      UserConfig,
      PaymentOrder,
    ]),
    ExternalModule,
  ],
  providers: [DailyCrawlService, PushNotificationService, OrderTimeoutService],
})
export class TasksModule {}
