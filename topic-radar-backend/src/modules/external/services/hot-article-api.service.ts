import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HotArticleItem } from '../interfaces/api.interface';

@Injectable()
export class HotArticleApiService {
  private readonly logger = new Logger(HotArticleApiService.name);
  private readonly arkApiKey: string;
  private readonly arkBaseUrl: string;
  private readonly arkModel: string;

  constructor(private readonly configService: ConfigService) {
    this.arkApiKey = this.configService.get<string>('api.ark.apiKey') || '';
    this.arkBaseUrl = this.configService.get<string>('api.ark.baseUrl') || '';
    this.arkModel = this.configService.get<string>('api.ark.model') || '';
  }

  /**
   * 使用 LLM 生成当前热门公众号文章标题
   * MVP阶段：利用 LLM 的知识库模拟热文数据，后续可替换为真实爬虫数据源
   * @param category 行业分类 slug
   * @param limit 数量
   */
  async fetchHotArticles(
    category: string,
    limit = 30,
  ): Promise<HotArticleItem[]> {
    const prompt = `你是一个微信公众号热文数据分析师。请针对"${category}"行业，生成${limit}条当前可能在微信公众号上广泛传播的热门文章标题。

要求：
- 标题要贴近当前热点话题，具备病毒式传播潜力
- 涵盖该行业的不同细分方向
- 标题风格要像真实的10万+爆文标题
- 每条标题后附一个虚拟的公众号名称

严格返回 JSON 数组，不要返回其他文字：
[
  {"title": "文章标题", "accountName": "公众号名称", "readCount": 100000}
]`;

    try {
      const response = await fetch(`${this.arkBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.arkApiKey}`,
        },
        body: JSON.stringify({
          model: this.arkModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.9,
        }),
      });

      if (!response.ok) {
        this.logger.error(`热文LLM生成请求失败: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // 提取JSON
      let cleaned = content.trim();
      const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) cleaned = jsonMatch[1].trim();

      const articles = JSON.parse(cleaned);
      return (Array.isArray(articles) ? articles : []).map((a: any) => ({
        title: a.title,
        author: a.author || '',
        accountName: a.accountName || a.account_name || '',
        url: '',
        readCount: a.readCount || a.read_count || 100000,
        likeCount: a.likeCount || a.like_count || 0,
        publishedAt: new Date().toISOString(),
        category,
      }));
    } catch (error) {
      this.logger.error(`热文生成异常: ${error.message}`);
      return [];
    }
  }
}
