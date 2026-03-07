import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { Topic } from './entities/topic.entity';
import { Category } from './entities/category.entity';
import { DailyBatch } from './entities/daily-batch.entity';
import { HotArticle } from './entities/hot-article.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Topic, Category, DailyBatch, HotArticle]),
  ],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
