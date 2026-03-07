/**
 * 手动触发每日选题抓取流水线
 * 用法: npx ts-node src/scripts/run-crawl.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DailyCrawlService } from '../modules/tasks/services/daily-crawl.service';

async function main() {
  console.log('=== 手动触发选题抓取流水线 ===');
  console.log(`时间: ${new Date().toISOString()}`);

  const app = await NestFactory.createApplicationContext(AppModule);
  const crawlService = app.get(DailyCrawlService);

  console.log('开始执行...\n');
  await crawlService.runDailyCrawl();

  console.log('\n=== 执行完成 ===');
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('执行失败:', err);
  process.exit(1);
});
