import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisReport } from './entities/analysis-report.entity';
import { DimensionScore } from './entities/dimension-score.entity';
import { ScriptSegment } from './entities/script-segment.entity';
import { ReportUnlock } from './entities/report-unlock.entity';
import { ViralVideo } from '../videos/entities/viral-video.entity';
import { UserBalance } from '../users/entities/user-balance.entity';
import { PricingRule } from '../billing/entities/pricing-rule.entity';
import { ConsumeRecord } from '../billing/entities/consume-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalysisReport,
      DimensionScore,
      ScriptSegment,
      ReportUnlock,
      ViralVideo,
      UserBalance,
      PricingRule,
      ConsumeRecord,
    ]),
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
