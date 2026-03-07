import { Module } from '@nestjs/common';
import { HotArticleApiService } from './services/hot-article-api.service';
import { VideoSearchApiService } from './services/video-search-api.service';
import { DouyinApiService } from './services/douyin-api.service';
import { KuaishouApiService } from './services/kuaishou-api.service';
import { LlmService } from './services/llm.service';

@Module({
  providers: [
    HotArticleApiService,
    VideoSearchApiService,
    DouyinApiService,
    KuaishouApiService,
    LlmService,
  ],
  exports: [
    HotArticleApiService,
    VideoSearchApiService,
    DouyinApiService,
    KuaishouApiService,
    LlmService,
  ],
})
export class ExternalModule {}
