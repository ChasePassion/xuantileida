# Miniapp Frontend Prototype

这个目录当前是 React 原型稿，不是已接入后端 API 的正式前端。

## 当前状态

- 页面数据全部来自 `src/data/mockData.js`
- 没有统一 API client、登录态管理或真实接口调用
- 适合做交互演示，不适合直接当生产前端交付

## 启动方式

```bash
npm install
npm run dev
```

## 后续接入建议

- 新增 API 层，替换全部 `mockData` 依赖
- 接入鉴权 token 和错误态处理
- 以 `TopicHome`、`VideoList`、`AnalysisReport` 三条主链路优先联调
