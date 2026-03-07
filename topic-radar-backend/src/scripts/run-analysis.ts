/**
 * 手动触发LLM拆解分析 - 对数据库中第一条视频生成分析报告
 * 用法: npx ts-node src/scripts/run-analysis.ts
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { LlmService } from '../modules/external/services/llm.service';
import { ViralVideo } from '../modules/videos/entities/viral-video.entity';
import { AnalysisReport } from '../modules/analysis/entities/analysis-report.entity';
import { DimensionScore } from '../modules/analysis/entities/dimension-score.entity';
import { ScriptSegment } from '../modules/analysis/entities/script-segment.entity';

async function main() {
  console.log('=== 手动触发LLM拆解分析 ===\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const llmService = app.get(LlmService);

  const videoRepo = dataSource.getRepository(ViralVideo);
  const reportRepo = dataSource.getRepository(AnalysisReport);
  const dimRepo = dataSource.getRepository(DimensionScore);
  const segRepo = dataSource.getRepository(ScriptSegment);

  // 取点赞最高的视频
  const video = await videoRepo
    .createQueryBuilder('v')
    .orderBy('v.like_count', 'DESC')
    .getOne();

  if (!video) {
    console.log('数据库中没有视频数据');
    await app.close();
    return;
  }

  console.log(`分析视频: ${video.title}`);
  console.log(`平台: ${video.platform}, 点赞: ${video.likeCount}\n`);

  // 调用LLM分析
  console.log('正在调用火山方舟LLM进行拆解分析...');
  const result = await llmService.analyzeVideo(video.title, '');

  if (!result) {
    console.log('LLM分析返回空结果');
    await app.close();
    return;
  }

  console.log(`\nLLM分析完成! 总分: ${result.overallScore}`);
  console.log(`摘要: ${result.summary}\n`);

  // 保存分析报告
  const report = reportRepo.create({
    videoId: video.id,
    overallScore: result.overallScore,
    summary: result.summary,
    status: 'completed',
  });
  await reportRepo.save(report);
  console.log(`报告已保存: ${report.id}`);

  // 保存维度评分
  if (result.dimensions) {
    for (const dim of result.dimensions) {
      const score = dimRepo.create({
        reportId: report.id,
        dimension: dim.dimension,
        score: dim.score,
        comment: dim.comment,
      });
      await dimRepo.save(score);
    }
    console.log(`维度评分已保存: ${result.dimensions.length} 个维度`);
  }

  // 保存脚本结构
  if (result.scriptStructure) {
    for (let i = 0; i < result.scriptStructure.length; i++) {
      const seg = result.scriptStructure[i];
      const segment = segRepo.create({
        reportId: report.id,
        segmentType: seg.segmentType,
        startTime: seg.startTime,
        endTime: seg.endTime,
        originalText: seg.text,
        technique: seg.technique,
        sortOrder: i,
      });
      await segRepo.save(segment);
    }
    console.log(`脚本结构已保存: ${result.scriptStructure.length} 段`);
  }

  console.log('\n=== 分析完成 ===');
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('执行失败:', err);
  process.exit(1);
});
