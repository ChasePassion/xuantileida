import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { ViralVideo } from './entities/viral-video.entity';
import { TopicVideo } from './entities/topic-video.entity';
import { AnalysisReport } from '../analysis/entities/analysis-report.entity';
import { ReportUnlock } from '../analysis/entities/report-unlock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ViralVideo, TopicVideo, AnalysisReport, ReportUnlock]),
  ],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
