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
   * 千人千面推广文案生成
   */
  async generatePromoContent(
    platform: string,
    userProfile: {
      industries: string[];
      daysSinceRegister: number;
      unlockedReports: number;
      topicsViewed: number;
      isVip: boolean;
    },
  ): Promise<{ copies: Array<{ style: string; title: string; content: string; hashtags: string[] }> } | null> {
    const platformGuide: Record<string, string> = {
      xiaohongshu: '小红书笔记风格: 标题带emoji, 口语化, 300-500字, 分段清晰, 结尾带话题标签',
      douyin: '抖音短视频文案: 简短有力, 制造好奇心, 50-100字, 适合口播或字幕',
      wechat_moments: '微信朋友圈: 真实感, 个人体验, 100-200字, 自然不硬广',
      general: '通用社交媒体分享文案: 简洁有力, 突出价值, 100-150字',
    };

    const userStage = userProfile.daysSinceRegister < 7 ? '新用户(刚发现宝藏工具)'
      : userProfile.daysSinceRegister < 30 ? '活跃用户(有一定使用体验)'
      : '资深用户(长期使用者)';

    const systemPrompt = `你是一位精通中国社交媒体营销的文案专家，擅长为工具类App撰写推广文案。
要求:
- 文案必须真实自然，像真实用户分享，不能有广告感
- 必须融入用户的真实使用数据，增强可信度
- 每条文案风格不同: 真诚体验型 / 数据展示型 / 痛点共鸣型
- 必须返回JSON格式`;

    const userPrompt = `为"选题雷达"小程序生成3条${platformGuide[platform] || platformGuide.general}推广文案。

产品介绍: 选题雷达是一款AI驱动的短视频选题工具，每日推荐30个爆款选题+关联视频数据，提供专业级视频拆解分析报告(7维度评分+钩子分析+病毒系数+可复制要素)。

用户画像:
- 关注行业: ${userProfile.industries.join('、') || '综合'}
- 使用天数: ${userProfile.daysSinceRegister}天
- 已解锁报告: ${userProfile.unlockedReports}份
- 已浏览选题: ${userProfile.topicsViewed}个
- 用户阶段: ${userStage}
- VIP状态: ${userProfile.isVip ? '付费VIP用户' : '免费用户'}

请返回JSON:
{
  "copies": [
    {
      "style": "真诚体验型",
      "title": "文案标题",
      "content": "文案正文",
      "hashtags": ["话题标签1", "话题标签2"]
    },
    { "style": "数据展示型", ... },
    { "style": "痛点共鸣型", ... }
  ]
}`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.85,
          max_tokens: 2000,
        }),
      });

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      this.logger.error('推广文案生成失败', err);
      return null;
    }
  }

  /**
   * 生成专业级视频拆解分析报告
   * 整合花书抖音脚本7维度 + YouTube病毒式内容11维度 + 火山引擎视频理解
   */
  async analyzeVideo(videoTitle: string, transcript: string, platform = 'douyin', duration = 60) {
    const systemPrompt = `你是顶级短视频爆款架构师，同时精通抖音运营、YouTube病毒式内容分析和专业视频拆解。
你的分析必须像"犯罪现场调查"一样系统化、精确、专业。
分析要具体到秒级时间点，评语要引用原文案佐证，不允许空泛笼统的描述。
所有评分必须有数据或案例支撑理由。`;

    const userPrompt = `请对以下短视频进行【法医级】全维度深度拆解分析。

## 视频信息
- 标题：${videoTitle}
- 平台：${platform}
- 时长：约${duration}秒
- 文案/转录：
${transcript || '（无文案，请根据标题进行专业推断分析，但推断内容需合理）'}

## 分析要求

请从7个维度打分（0-10分，精确到0.1），每个维度评语需80-150字，必须具体引用视频中的表达方式或手法：

1. **选题力(topic_power)**：选题与当前平台趋势的契合度、搜索热度、受众基数、差异化角度
2. **钩子力(hook_power)**：前3秒留人能力、文案钩子类型（反常识/痛点/数据/场景/悬念/利益）、视觉钩子配合
3. **节奏力(rhythm_power)**：整体节奏模式（快-慢-快/渐进加速/脉冲式）、信息密度、注意力曲线管理
4. **表现力(performance_power)**：表达方式、人设感染力、画面质感、BGM配合、文字排版
5. **留存力(retention_power)**：开放回路、模式打断、悬念缺口、"等一下"时刻数量
6. **情感力(emotion_power)**：情感弧线走向、身份认同触发、痛点共鸣、情绪峰值设计
7. **变现力(monetize_power)**：CTA设计（类型/时机/措辞）、转化路径、价值交换设计、行动驱动力

## 严格返回JSON（不要返回其他文字）:

{
  "overallScore": 8.5,
  "summary": "200字专业总结，包含：核心爆款因素分析 + 同类视频对比定位 + 一句话学习价值",
  "dimensions": [
    {"dimension": "topic_power", "score": 9.0, "comment": "80-150字专业评语，引用具体手法"},
    {"dimension": "hook_power", "score": 8.5, "comment": "80-150字，拆解前3秒每一个设计"},
    {"dimension": "rhythm_power", "score": 8.0, "comment": "80-150字，分析节奏变化和信息密度"},
    {"dimension": "performance_power", "score": 7.5, "comment": "80-150字，评价表达力和制作水准"},
    {"dimension": "retention_power", "score": 8.0, "comment": "80-150字，列举留人机制"},
    {"dimension": "emotion_power", "score": 8.5, "comment": "80-150字，分析情感设计"},
    {"dimension": "monetize_power", "score": 9.0, "comment": "80-150字，评价变现链路设计"}
  ],
  "hookAnalysis": {
    "textHookType": "反常识|痛点|数据|场景|悬念|利益",
    "textHookContent": "前3秒完整文案转录",
    "textHookStrength": 8.5,
    "visualHookType": "视觉奇观|产品堆叠|画面突变|动作冲击|文字弹出|POV",
    "visualHookDesc": "视觉钩子的具体画面描述",
    "synergy": "文案×视觉配合分析",
    "firstFrameAnalysis": "0秒画面能否独立吸引点击",
    "soundDesign": "前3秒的声音设计（BGM突变/音效/语气变化）"
  },
  "retentionAnalysis": {
    "openLoops": ["具体的未解悬念1", "悬念2"],
    "patternInterrupts": ["具体的反转/意外时刻"],
    "curiosityGaps": ["制造的信息缺口"],
    "payoffPoints": ["悬念的揭晓时刻与时间点"],
    "retentionScore": 8.0
  },
  "viralScore": {
    "shareability": 8.0,
    "shareReason": "为什么用户会转发",
    "commentBait": 7.5,
    "commentBaitExamples": ["会引发评论的具体点"],
    "saveability": 8.0,
    "saveReason": "为什么用户会收藏",
    "totalViralScore": 78,
    "viralVerdict": "强爆款潜质|优质内容|中等表现|需优化"
  },
  "emotionalArc": {
    "arcType": "过山车型|递进型|蜕变型",
    "arcDescription": "情感走势：好奇→紧张→释放→兴奋→行动",
    "triggerWords": ["视频中的情感触发词"],
    "identityHooks": ["让观众觉得'这说的就是我'的表述"],
    "peakMoment": "情绪最高点的时间和内容"
  },
  "scriptStructure": [
    {
      "segmentType": "hook",
      "startTime": 0,
      "endTime": 3,
      "text": "开场钩子完整文案",
      "technique": "使用的手法名称",
      "techniqueDetail": "手法的具体运用方式和效果分析",
      "psychologyPrinciple": "利用的心理学原理"
    },
    {
      "segmentType": "pain",
      "startTime": 3,
      "endTime": 10,
      "text": "痛点切入文案",
      "technique": "痛点共鸣",
      "techniqueDetail": "如何激活观众的切身痛点",
      "psychologyPrinciple": "损失厌恶/焦虑激活"
    },
    {
      "segmentType": "core",
      "startTime": 10,
      "endTime": 45,
      "text": "核心干货内容概述",
      "technique": "干货密集/故事驱动/对比展示",
      "techniqueDetail": "内容编排策略和信息密度控制",
      "psychologyPrinciple": "认知流畅性/权威效应"
    },
    {
      "segmentType": "climax",
      "startTime": 45,
      "endTime": 52,
      "text": "高潮转折内容",
      "technique": "视觉冲击/数据揭晓/反转",
      "techniqueDetail": "如何制造情绪峰值",
      "psychologyPrinciple": "峰终定律"
    },
    {
      "segmentType": "cta",
      "startTime": 52,
      "endTime": 60,
      "text": "行动号召文案",
      "technique": "CTA引导类型",
      "techniqueDetail": "行动驱动的具体设计",
      "psychologyPrinciple": "互惠原理/稀缺效应"
    }
  ],
  "replicableElements": {
    "canCopy": ["可以直接照搬的元素列表"],
    "needAdapt": ["需要根据自身调整的元素"],
    "cannotCopy": ["依赖个人IP/资源无法复制的元素"],
    "templateFramework": "用一句话概括这个视频的可复用框架公式"
  },
  "creatorTips": {
    "titleTemplates": ["基于此视频的3个标题模板（用[主题]占位）"],
    "hookTemplates": ["3个开头钩子模板（用[产品/话题]占位）"],
    "ctaTemplates": ["2个结尾CTA模板"],
    "abTestSuggestions": ["2-3个可以A/B测试的改进建议"],
    "commonMistakes": ["模仿此类视频最容易犯的2个错误"]
  }
}`;

    try {
      const content = await this.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const result = this.extractJson(content);
      this.logger.log(`LLM专业拆解完成: ${videoTitle}, 总分: ${result.overallScore}`);
      return result;
    } catch (error) {
      this.logger.error(`LLM视频分析异常: ${error.message}`);
      return null;
    }
  }
}
