import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import wechatConfig from './config/wechat.config';
import apiConfig from './config/api.config';
import { validateEnvironment } from './config/env.validation';

import { AuthGuard } from './common/guards/auth.guard';
import { ThrottleGuard } from './common/guards/throttle.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TopicsModule } from './modules/topics/topics.module';
import { VideosModule } from './modules/videos/videos.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { BillingModule } from './modules/billing/billing.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CacheModule } from './modules/cache/cache.module';
import { StorageModule } from './modules/storage/storage.module';
import { ExternalModule } from './modules/external/external.module';
import { ReferralModule } from './modules/referral/referral.module';
import { RedemptionModule } from './modules/redemption/redemption.module';
import { AdminModule } from './modules/admin/admin.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { RetentionModule } from './modules/retention/retention.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { PaymentModule } from './modules/payment/payment.module';

// Entity imports
import { User } from './modules/users/entities/user.entity';
import { UserConfig } from './modules/users/entities/user-config.entity';
import { UserBalance } from './modules/users/entities/user-balance.entity';
import { Category } from './modules/topics/entities/category.entity';
import { DailyBatch } from './modules/topics/entities/daily-batch.entity';
import { Topic } from './modules/topics/entities/topic.entity';
import { HotArticle } from './modules/topics/entities/hot-article.entity';
import { ViralVideo } from './modules/videos/entities/viral-video.entity';
import { TopicVideo } from './modules/videos/entities/topic-video.entity';
import { AnalysisReport } from './modules/analysis/entities/analysis-report.entity';
import { DimensionScore } from './modules/analysis/entities/dimension-score.entity';
import { ScriptSegment } from './modules/analysis/entities/script-segment.entity';
import { ReportUnlock } from './modules/analysis/entities/report-unlock.entity';
import { PricingRule } from './modules/billing/entities/pricing-rule.entity';
import { RechargeOrder } from './modules/billing/entities/recharge-order.entity';
import { ConsumeRecord } from './modules/billing/entities/consume-record.entity';
import { TaskLog } from './modules/tasks/entities/task-log.entity';
import { Referral } from './modules/referral/entities/referral.entity';
import { ReferralReward } from './modules/referral/entities/referral-reward.entity';
import { DailyViewLog } from './modules/referral/entities/daily-view-log.entity';
import { RedemptionCode } from './modules/redemption/entities/redemption-code.entity';
import { RedemptionRecord } from './modules/redemption/entities/redemption-record.entity';
import { ReferralTier } from './modules/referral/entities/referral-tier.entity';
import { PromoNote } from './modules/promotion/entities/promo-note.entity';
import { PromoTemplate } from './modules/promotion/entities/promo-template.entity';
import { UserPromoContent } from './modules/promotion/entities/user-promo-content.entity';
import { RetentionOffer } from './modules/retention/entities/retention-offer.entity';
import { UserHealthScore } from './modules/retention/entities/user-health-score.entity';
import { Campaign } from './modules/campaign/entities/campaign.entity';
import { CampaignParticipation } from './modules/campaign/entities/campaign-participation.entity';
import { Achievement } from './modules/campaign/entities/achievement.entity';
import { UserAchievement } from './modules/campaign/entities/user-achievement.entity';
import { PaymentOrder } from './modules/payment/entities/payment-order.entity';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
      load: [databaseConfig, redisConfig, wechatConfig, apiConfig],
      validate: validateEnvironment,
    }),

    // TypeORM 数据库连接
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        entities: [
          User, UserConfig, UserBalance,
          Category, DailyBatch, Topic, HotArticle,
          ViralVideo, TopicVideo,
          AnalysisReport, DimensionScore, ScriptSegment, ReportUnlock,
          PricingRule, RechargeOrder, ConsumeRecord,
          PaymentOrder,
          TaskLog,
          Referral, ReferralReward, DailyViewLog,
          RedemptionCode, RedemptionRecord,
          ReferralTier,
          PromoNote, PromoTemplate, UserPromoContent,
          RetentionOffer, UserHealthScore,
          Campaign, CampaignParticipation, Achievement, UserAchievement,
        ],
        synchronize: config.get('database.synchronize'),
        logging: config.get('database.logging'),
      }),
    }),

    // JWT 全局配置
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '7d') as any,
        },
      }),
      global: true,
    }),

    // 基础模块
    CacheModule,

    // 业务模块
    AuthModule,
    UsersModule,
    TopicsModule,
    VideosModule,
    AnalysisModule,
    BillingModule,
    PaymentModule,
    StorageModule,
    ExternalModule,
    TasksModule,
    ReferralModule,
    RedemptionModule,
    AdminModule,
    PromotionModule,
    RetentionModule,
    CampaignModule,
  ],
  providers: [
    // 全局 AuthGuard
    { provide: APP_GUARD, useClass: AuthGuard },
    // 全局限流
    { provide: APP_GUARD, useClass: ThrottleGuard },
    // 全局异常过滤器
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // 全局响应转换
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // 全局日志
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
