# 选题雷达问题解决执行方案

生成时间：2026-03-12

## 1. 阅读范围与依据

- 已通读 `topic-radar-backend/` 与 `topic-radar-mini/` 下全部代码文件，并结合数据库脚本、配置文件、测试文件一起核对。
- 仓库内未找到单独命名为“项目总结”或“架构图”的文档；当前可作为项目结构依据的文件是根目录 `README.md`。
- 本方案聚焦两个问题：
  - 问题一：支付接入第三方，并新增 `/rest/getPaymentAmountAndStatus`、`/rest/returnPaymentStatus`
  - 问题二：后端上线部署与小程序发布闭环

## 2. 当前代码现状结论

### 2.1 后端现状

- 全局接口前缀是 `/api`，定义在 `topic-radar-backend/src/main.ts`。
- 全局响应会被统一包装为 `{ code, message, data, timestamp }`，定义在 `topic-radar-backend/src/common/interceptors/transform.interceptor.ts`。
- 当前支付下单未接入：
  - `POST /billing/recharge`
  - `POST /billing/subscribe`
  - 两个接口在 `topic-radar-backend/src/modules/billing/billing.service.ts` 中直接抛出 `ServiceUnavailableException`。
- 当前仅实现了微信支付回调落账 `POST /billing/wechat-callback`，但它处理的是现有 `recharge_orders` 表的“待支付 -> 已支付”。
- 现有订单模型不满足新需求：
  - `recharge_orders.id` 是 UUID，不是外部要求的业务订单号
  - 只有 `pending/paid` 状态，没有退款、取消、待使用
  - 没有 `name`
  - 没有退款时间、退款流水号
  - 没有“首付成功后生成券码并绑定订单”的字段
- 现有券码体系存在，但与支付订单没有绑定：
  - `redemption_codes`
  - `redemption_records`
- 上传未接通：
  - 后端只有 `/storage/presigned-url`
  - `storage.service.ts` 直接抛 `NotImplementedException`
  - 没有 `/upload/image`
- 微信登录已接通到 `jscode2session`：
  - 环境变量：`WECHAT_APPID`、`WECHAT_SECRET`
  - 落点：`topic-radar-backend/src/modules/auth/auth.service.ts`

### 2.2 小程序现状

- 小程序 `AppID` 仍是占位值 `wx0000000000000000`，文件为 `topic-radar-mini/project.config.json`。
- 前端接口基址仍写死为 `http://localhost:3000/api`，文件为 `topic-radar-mini/utils/config.js`。
- 当前充值页支付链路是：
  - 小程序调用 `/billing/recharge` 或 `/billing/subscribe`
  - 后端返回 `payParams`
  - 前端再执行 `wx.requestPayment`
- 但后端当前不会返回真实 `payParams`，所以支付链路实际上不可用。
- 当前小程序没有独立订单页、支付结果页、交易记录页。
- 唯一真实上传点是 `promo-notes` 页面，调用的是 `BASE_URL + '/upload/image'`，但后端没有该接口。
- 当前登录链路是 `wx.login -> /auth/wechat-login -> JWT`，前端未缓存 `openid`。

### 2.3 关键业务判断

- 你给出的新支付要求，不是对当前 `recharge_orders` 的小修小补，而是“新增一个外部支付联动能力”。
- 现有代码最缺的不是配置，而是订单模型、公开路由、状态机、退款字段、幂等写回、券码绑定、线上环境闭环。
- 推荐做法是：
  - 保留现有 `recharge/vip` 业务入口
  - 在后端补齐“业务订单 + 第三方支付联动”能力
  - 新增对外 `/rest/*` 公共接口给第三方回查和回写
  - 由后端持有 `appId/openId/orderCode` 并与第三方交互
- 不建议让小程序直接持有 `secret` 或自行拼第三方支付流程。

## 3. 总体实施策略

按 5 个阶段执行，先补模型和接口，再接第三方，再做部署与小程序发布。

### 阶段 0：先确认的外部前提

- 已知正式域名：`xuanti.jutongbao.online`
- 已知服务器公网 IP：`8.147.63.231`
- 已知服务器登录密码：`Jtb123456`
- 上述服务器密码属于敏感信息，建议仅用于当前部署，部署完成后立即改密。
- 正式接口前缀按该域名预留为 `https://xuanti.jutongbao.online`，并确认 HTTPS 证书已签发和可用。
- 确认真实小程序 `AppID`、`AppSecret`。
- 确认支付商户信息与第三方联调负责人贾悦。
- 确认订单号前缀规则，例如 `XTLD`。
- 确认“支付成功后生成的券码”业务含义：
  - 是 VIP 天数兑换码
  - 还是雷达币充值码
  - 还是外部平台专用核销码
- 确认退款是否只来自第三方回写，不再走任何人工审批。
- 确认是否必须由小程序直连 `https://applet.jutongbao.online/wechat/api/v1/applet/payment/pay`。
  - 推荐答案：否，改为后端代理调用，前端只接收 `wx.requestPayment` 参数

### 阶段 1：后端订单模型改造

目标：让后端具备“可查询、可回写、可退款、可幂等”的业务订单能力。

- 新增或改造订单字段，建议不要直接复用 UUID 作为外部订单号。
- 推荐在订单表增加这些字段：
  - `orderCode`：外部唯一订单号，满足前缀规则
  - `productName`：对外返回 `name`
  - `orderStatus`：内部状态，至少覆盖未支付、已支付待使用、已退款、已取消
  - `payTradeNo`
  - `paidAt`
  - `refundTradeNo`
  - `refundedAt`
  - `cancelledAt`
  - `couponCodeId` 或 `generatedCouponCode`
  - `paymentChannel`
  - `paymentStateRaw`
- 如果你希望减少对现有账务逻辑的冲击，建议新增独立的 `payment_orders` 表，而不是强行把 `recharge_orders` 改成外部通用订单表。
- 如果最终仍复用 `recharge_orders`，也必须至少补齐上述字段和状态。

### 阶段 2：新增对外 `/rest` 公共接口

目标：满足第三方支付平台固定协议。

- 新增公开控制器，路径严格为：
  - `POST /rest/getPaymentAmountAndStatus`
  - `POST /rest/returnPaymentStatus`
- 这两个接口必须满足两个技术条件：
  - 不走 JWT 鉴权
  - 不走全局 `{ code, data, message }` 包装
- 实现方式建议：
  - 在 `main.ts` 中把 `/rest/(.*)` 从全局前缀 `/api` 中排除
  - 为 `/rest` 单独增加“跳过响应包装”的机制
- `getPaymentAmountAndStatus` 规则：
  - 入参：`order`
  - 出参：`price, state, name`
  - 返回扁平结构
  - 状态映射固定：
    - `10 -> 0`
    - `20/30 -> 1`
    - `40 -> 2`
    - `50/60 -> 3`
- `returnPaymentStatus` 规则：
  - 入参：`order, wxTransactionId, finishTime, paymentState`
  - 出参：`success, code`
  - 返回扁平结构
  - 同一订单重复回写必须幂等
- 幂等规则必须落在数据库事务里：
  - `paymentState = 1`
    - 首次成功才写 `paidAt`、`payTradeNo`
    - 首次成功才生成券码
    - 重复回写只返回成功，不重复生成券码
  - `paymentState = 2`
    - 订单直接改为已退款
    - 写退款时间和退款流水
    - 不走现有人工退款审核流
- 需要定义标准错误码，建议至少有：
  - `200`：成功
  - `404`：订单不存在
  - `409`：订单状态冲突
  - `422`：参数非法
  - `500`：服务异常

### 阶段 3：第三方支付接入

目标：让当前充值/VIP 页面真正能拉起支付。

- 后端改造 `/billing/recharge`、`/billing/subscribe`：
  - 先创建业务订单
  - 生成 `orderCode`
  - 查询当前用户 `openid`
  - 调用第三方支付接口
  - 把第三方返回的支付参数转给前端
- 推荐后端代理调用第三方支付接口，而不是小程序直连。
- 推荐原因：
  - 前端当前没有 `openid`
  - 不需要把敏感支付编排暴露到小程序
  - 与当前充值页 `payParams -> wx.requestPayment` 的代码结构最兼容
- 若第三方强制要求小程序直连，则需要额外补：
  - 在登录返回中显式返回 `openid`
  - 前端安全存储并传给第三方
  - 仍然不能把 `secret` 放到小程序侧
- 需要提供给贾悦的联调信息清单：
  - `https://xuanti.jutongbao.online/rest/getPaymentAmountAndStatus`
  - `https://xuanti.jutongbao.online/rest/returnPaymentStatus`
  - 真实小程序 `AppID`
  - 真实小程序 `Secret`
  - 订单号前缀规则
  - 支付环境说明：测试/正式

### 阶段 4：小程序改造

目标：让支付链路、登录链路、发布链路进入可上线状态。

- 把 `topic-radar-mini/utils/config.js` 从单一 `localhost` 改成可切换环境配置。
- 线上地址必须改成 HTTPS 域名。
- `project.config.json` 替换为真实 `AppID`。
- 修复充值页支付细节：
  - 支付发起期间锁按钮，直到 `requestPayment` 成功/失败回调后再恢复
  - 支付取消与支付失败分开提示
  - 订单过期 15 分钟后要走“已取消”状态
- 修复余额不足跳转：
  - 当前应跳到 `充值币` tab，而不是默认 `VIP` tab
- 登录缓存补齐：
  - 当前 `userInfo` 没有 `membershipExpiresAt`
  - 需要补齐，避免支付成功后 VIP 状态显示错误
- 如果要保留前端主动查单能力，建议补一个订单列表或支付结果页。

### 阶段 5：部署与微信后台配置

目标：完成“后端上线 + 小程序体验版/正式版可运行”。

- 云服务器准备：
  - 已有云服务器：`8.147.63.231`
  - 绑定正式域名：`xuanti.jutongbao.online`
  - 使用当前登录密码完成首轮部署：`Jtb123456`
  - 首次上线后立刻修改服务器密码，并收口到运维保管
  - 安装 Node.js、PostgreSQL 或接入云数据库
  - 配置 Nginx 或 Caddy
  - 配置 HTTPS 证书
  - 配置进程守护，例如 PM2
- 后端正式环境变量必须落地：
  - 数据库：`DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_DATABASE`
  - 安全：`JWT_SECRET`
  - 微信登录：`WECHAT_APPID / WECHAT_SECRET`
  - 外部能力：`JIZHILE_API_KEY / ARK_API_KEY`
  - 对象存储：`COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION`
  - 支付：`WECHAT_PAY_MCHID / WECHAT_PAY_KEY / WECHAT_PAY_CERT_PATH / WECHAT_PAY_KEY_PATH`
- 上传方案必须补闭环，二选一：
  - 方案 A：实现 COS 预签名上传，并让小程序改为走 `/storage/presigned-url`
  - 方案 B：新增真正的 `/upload/image` 接口，并接到 COS 或本地持久化存储
- 微信后台必须配置：
  - `request` 合法域名
  - `uploadFile` 合法域名
  - `downloadFile` 合法域名
  - 若有静态图片/CDN，也要补资源域名
- 微信开发者工具发布前操作：
  - 体验版开启“不校验合法域名”
  - 确认真实 `AppID` 已绑定
- 微信后台非代码配置：
  - 隐私保护指引
  - 业务类目与支付能力匹配
  - 小程序名称、简介、图标
  - 审核用测试账号和说明
  - 相册权限说明，覆盖 `referral` 页面保存海报场景

## 4. 必须同步修复的高风险项

这些问题不一定在本次支付需求里直接点名，但都属于上线前必须处理的生产风险。

- `billing.wechat-callback` 当前使用 `JSON.stringify(body)` 做验签输入，不是原始请求体，验签逻辑有风险。
- 现有全局响应包装会破坏第三方要求的扁平返回。
- `promotion`、`retention`、`campaign` 控制器带了 `api/` 前缀，叠加全局前缀后会变成 `/api/api/...`。
- `redemption/generate` 目前没有管理员权限保护。
- `promo-notes` 页面调用 `/upload/image`，但后端不存在这个接口。
- `share-center` 页面调用的部分推广内容接口在后端没有完整控制器暴露，建议在部署前做一次前后端路由一致性清查。

## 5. 推荐实施顺序

1. 先确认域名、HTTPS、真实 `AppID/Secret`、订单号规则、券码业务语义。
2. 设计并落库新的业务订单模型。
3. 完成 `/rest/getPaymentAmountAndStatus`、`/rest/returnPaymentStatus`。
4. 改造 `/billing/recharge`、`/billing/subscribe` 接第三方支付。
5. 修正小程序支付页、登录缓存、环境配置。
6. 补齐上传方案。
7. 部署后端正式环境并配置域名、证书、环境变量。
8. 把两条 `/rest` 地址、`AppID`、`Secret` 交给贾悦联调。
9. 在微信后台补齐合法域名、隐私、类目、审核资料。
10. 用体验版做完整支付、退款、重复回写、上传、保存海报验证。

## 6. 验收标准

- 小程序能在真实 `AppID` 下正常 `wx.login`。
- 小程序所有接口都走正式 HTTPS 域名，不再使用 `localhost`。
- `POST /rest/getPaymentAmountAndStatus` 可被第三方直接访问，且返回扁平结构。
- `POST /rest/returnPaymentStatus` 可重复回写，重复回写不重复生成券码。
- 支付成功后订单变为“已支付待使用”，写入 `paidAt`、`payTradeNo`。
- 退款回写后订单变为“已退款”，写入退款时间和退款流水。
- 小程序充值/VIP 购买可以真实拉起 `wx.requestPayment`。
- 15 分钟超时订单会自动或被动标记为已取消。
- 上传图片功能可在体验版和正式版正常使用。
- 微信后台审核所需的域名、隐私、类目、权限说明全部补齐。

## 7. 当前最核心缺口总结

- 没有可供第三方查询/回写的 `/rest` 接口。
- 没有满足新需求的业务订单模型。
- 现有支付下单逻辑未接入第三方。
- 小程序仍是占位 `AppID + localhost`。
- 上传方案未完成。
- 云服务器、HTTPS、微信后台配置都还没落地。

以上 6 项补齐后，问题一和问题二才算真正闭环。
