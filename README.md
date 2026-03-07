# 选题雷达 (Topic Radar)

短视频爆款选题发现与拆解分析平台，覆盖抖音、快手、视频号三大平台。

## 项目结构

```
├── topic-radar-backend/    # NestJS 后端 API
│   ├── src/
│   │   ├── modules/        # 功能模块 (10个)
│   │   ├── config/         # 配置文件
│   │   ├── scripts/        # 运维脚本
│   │   └── database/       # 数据库迁移
│   └── .env.example        # 环境变量模板
│
├── topic-radar-mini/       # 微信小程序前端
│   ├── components/         # 自定义组件 (7个)
│   ├── pages/              # 页面 (8个)
│   ├── utils/              # 工具层
│   └── app.json            # 小程序配置
```

## 技术栈

**后端:**
- NestJS + TypeScript
- PostgreSQL + TypeORM
- 火山方舟 (豆包大模型) - 选题提取 + 视频拆解
- 极致了 API - 抖音/快手视频搜索

**前端:**
- 原生微信小程序
- 自定义 Canvas 雷达图组件
- 简约商务风 UI

## 核心功能

1. **选题发现** - AI 从热文提取 30 个爆款选题关键词
2. **视频搜索** - 跨平台搜索抖音/快手相关视频
3. **AI 拆解** - 5 维雷达图评分 + 脚本结构时间线分析
4. **付费解锁** - 雷达币充值 + 报告解锁机制

## 快速开始

### 后端

```bash
cd topic-radar-backend
cp .env.example .env  # 填入你的 API Key
npm install
npm run start:dev
```

### 小程序

用微信开发者工具打开 `topic-radar-mini/` 目录。

## API 文档

启动后端后访问: `http://localhost:3000/api-docs` (Swagger)

## 数据库

17 张表，覆盖用户、选题、视频、分析报告、计费等模块。
