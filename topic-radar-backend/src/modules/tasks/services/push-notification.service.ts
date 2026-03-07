import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserConfig } from '../../users/entities/user-config.entity';
import { DailyBatch } from '../../topics/entities/daily-batch.entity';
import { TaskLog } from '../entities/task-log.entity';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    @InjectRepository(UserConfig)
    private readonly configRepo: Repository<UserConfig>,
    @InjectRepository(DailyBatch)
    private readonly batchRepo: Repository<DailyBatch>,
    @InjectRepository(TaskLog)
    private readonly logRepo: Repository<TaskLog>,
  ) {}

  /**
   * 每日8:00推送选题通知
   */
  @Cron('0 8 * * *')
  async pushDailyNotification() {
    const startedAt = new Date();
    const taskLog = this.logRepo.create({
      taskName: 'push_notification',
      status: 'running',
      startedAt,
    });
    await this.logRepo.save(taskLog);

    try {
      const today = new Date().toISOString().split('T')[0];
      const batch = await this.batchRepo.findOne({
        where: { batchDate: today, status: 'completed' },
      });

      if (!batch) {
        this.logger.warn('今日批次未完成，跳过推送');
        taskLog.status = 'skipped';
        taskLog.completedAt = new Date();
        taskLog.durationMs = Date.now() - startedAt.getTime();
        await this.logRepo.save(taskLog);
        return;
      }

      // 获取订阅推送的用户
      const subscribers = await this.configRepo.find({
        where: { pushEnabled: true },
      });

      let sent = 0;
      for (const sub of subscribers) {
        try {
          // TODO: 调用微信订阅消息API
          // await this.sendWechatSubscribeMessage(sub.userId, batch);
          sent++;
        } catch (e) {
          this.logger.warn(`推送失败 userId=${sub.userId}: ${e.message}`);
        }
      }

      taskLog.status = 'completed';
      taskLog.completedAt = new Date();
      taskLog.durationMs = Date.now() - startedAt.getTime();
      taskLog.recordsAffected = sent;
      await this.logRepo.save(taskLog);

      this.logger.log(`推送完成: ${sent}/${subscribers.length} 用户`);
    } catch (error) {
      taskLog.status = 'failed';
      taskLog.completedAt = new Date();
      taskLog.durationMs = Date.now() - startedAt.getTime();
      taskLog.errorMessage = error.message;
      await this.logRepo.save(taskLog);
      this.logger.error('推送任务失败', error.stack);
    }
  }
}
