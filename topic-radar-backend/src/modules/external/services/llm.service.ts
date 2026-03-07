import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmTopicExtraction } from '../interfaces/api.interface';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('api.ark.apiKey') || '';
    this.baseUrl = this.configService.get<string>('api.ark.baseUrl') || 'https://ark.cn-beijing.volces.com/api/v3';
    this.model = this.configService.get<string>('api.ark.model') || 'doubao-seed-2.0-pro-32k';
  }

  /**
   * 调用火山方舟 Chat API（OpenAI 兼容）
   */
  private async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`火山方舟API请求失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * 从JSON字符串中提取JSON（处理markdown代码块）
   */
  private extractJson(raw: string): any {
    let cleaned = raw.trim();
    // 去掉 ```json ... ``` 包裹
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      cleaned = jsonBlockMatch[1].trim();
    }
    return JSON.parse(cleaned);
  }

  /**
   * 从爆文标题中提取选题关键词
   */
  async extractTopics(
    titles: string[],
    targetCount = 30,
  ): Promise<LlmTopicExtraction[]> {
    const prompt = `你是一个短视频选题专家。请从以下公众号爆文标题中，提取${targetCount}个最有短视频爆款潜力的选题关键词。

文章标题列表：
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

严格返回 JSON 数组，格式如下，不要返回任何其他文字：
[
  {
    "keyword": "选题关键词（2-8字）",
    "reason": "为什么这个选题有爆款潜力（1句话）",
    "angles": ["建议角度1", "建议角度2"],
    "heatScore": 85,
    "category": "所属行业slug(education/tech/food/life/finance/health/entertainment)"
  }
]`;

    try {
      const content = await this.chat([{ role: 'user', content: prompt }]);
      const parsed = this.extractJson(content);
      const topics = Array.isArray(parsed) ? parsed : (parsed.topics || parsed.keywords || []);
      this.logger.log(`LLM提取选题成功: ${topics.length}个`);
      return topics;
    } catch (error) {
      this.logger.error(`LLM选题提取异常: ${error.message}`);
      return [];
    }
  }

  /**
   * 生成视频拆解分析报告
   */
  async analyzeVideo(videoTitle: string, transcript: string) {
    const prompt = `你是一个短视频爆款拆解专家。请对以下视频进行全面拆解分析。

视频标题：${videoTitle}
视频文案/描述：
${transcript || '（无文案，请根据标题推断内容进行分析）'}

严格返回 JSON 对象，格式如下，不要返回任何其他文字：
{
  "overallScore": 8.5,
  "summary": "100字以内的总结",
  "dimensions": [
    {"dimension": "topic_angle", "score": 9.0, "comment": "50字以内评语"},
    {"dimension": "opening_hook", "score": 8.0, "comment": "50字以内评语"},
    {"dimension": "info_density", "score": 8.5, "comment": "50字以内评语"},
    {"dimension": "emotional_resonance", "score": 8.0, "comment": "50字以内评语"},
    {"dimension": "cta_effectiveness", "score": 9.0, "comment": "50字以内评语"}
  ],
  "scriptStructure": [
    {"segmentType": "hook", "startTime": 0, "endTime": 3, "text": "开头文案", "technique": "使用的技巧"},
    {"segmentType": "core", "startTime": 3, "endTime": 50, "text": "核心内容", "technique": "使用的技巧"},
    {"segmentType": "cta", "startTime": 50, "endTime": 60, "text": "结尾引导", "technique": "使用的技巧"}
  ]
}`;

    try {
      const content = await this.chat([{ role: 'user', content: prompt }]);
      const result = this.extractJson(content);
      this.logger.log(`LLM视频拆解完成: ${videoTitle}, 总分: ${result.overallScore}`);
      return result;
    } catch (error) {
      this.logger.error(`LLM视频分析异常: ${error.message}`);
      return null;
    }
  }
}
