# 项目总结

## 项目架构

### topic-radar-backend/
后端服务

### topic-radar-mini/
微信小程序

## 问题一：支付

### 概述
有域名的时候需要配上域名前缀，如 `https://xxx.com`。新增下面两个接口之后需要提供小程序的 appId 和 secret 信息，最后给上述信息给贾悦调整配置一下，才可调用 `https://applet.jutongbao.online/wechat/api/v1/applet/payment/pay` 第三方接口进行支付。

### 新增对外接口

放在统一公开路由上，路径严格为：

- `POST /rest/getPaymentAmountAndStatus`
- `POST /rest/returnPaymentStatus`

### getPaymentAmountAndStatus 接口

直接按第三方扁平结构返回，不走现有 `{code,data,message}` 包装：

- **入参**：order
- **返回**：price, state, name
- **状态映射固定为**：10 → 0，20/30 → 1，40 → 2，50/60 → 3

### returnPaymentStatus 接口

也按第三方扁平结构返回：

- **入参**：order, wxTransactionId, finishTime, paymentState
- **返回**：success, code
- **幂等处理**：同一订单重复回写不能重复生成券码或重复推进状态。

### 回写状态落库规则

- **paymentState = 1**：订单改为已支付后的待使用状态，写入 `paid_at`、`pay_trade_no`，并只在首次成功时生成券码。
- **paymentState = 2**：订单直接改为已退款，写入退款时间和交易流水；不再走现有人工退款审核流。

### 订单信息查询接口

**接口地址**：接口前缀 `/rest/getPaymentAmountAndStatus`【POST】

**参数**：
- `order`【订单编号唯一，前缀拼接项目名简写，金穗丰项目示例：JSFZF2026011816502】

**返回**：
- `price`【支付金额】
- `state`【支付状态：0：未支付、1：已支付、2：已退款、3：已取消】
- `name`【商品名称】

### 订单状态回写接口

**接口地址**：接口前缀 `/rest/returnPaymentStatus`【POST】

**参数**：
- `order`【订单编号唯一，前缀拼接项目名简写，金穗丰项目示例：JSFZF2026011816502】
- `wxTransactionId`【交易流水号】
- `finishTime`【支付时间】
- `paymentState`【支付状态：1：已支付、2：已退款】

**返回**：
- `success`【状态：true（成功）、false（失败）】
- `code`【错误码：200（成功）、其他（失败，不同码不同原因）】

### 第三方支付接口

**请求接口**：`https://applet.jutongbao.online/wechat/api/v1/applet/payment/pay`

**请求方式**：POST

**请求参数**：

| 参数名称 | 请求类型 | 是否必须 | 数据类型 | 参数说明 |
|---------|---------|--------|--------|---------|
| appId | header | 是 | string | 小程序appId |
| openId | header | 是 | string | 用户openId |
| orderCode | body | 是 | string | 订单编号【每个订单编号发起支付有效期只有15分钟，记得系统订单要做超时已取消处理】 |
| payType | body | 否，默认102 | integer | 支付方式：102 盛付通 |

**接口返回**：

```json
{
    "data": "{\"timeStamp\":\"xxxxxxxx\",\"package\":\"xxxxxxxx\",\"paySign\":\"xxxxxxxx\",\"appId\":\"xxxxxxxx\",\"signType\":\"xxxxxxxx\",\"nonceStr\":\"xxxxxxxx\"}",
    "error_code": 1,
    "success": true
}
```

## 问题二：部署

### 部署计划

1. 后端部署云服务器（还没有买好）
2. 小程序代码上传至微信公众平台（注意体验版要开启不校验合法域名）

### 核心缺口

#### 小程序 AppID 配置

- 小程序 AppID 还没填真实值
- `project.config.json` 里还是 `wx0000000000000000`
- 这意味着还没把代码绑定到正式小程序

#### 前端接口地址配置

前端接口地址还没切到线上，`config.js` 里还是 `http://localhost:3000/api`。上线至少要补：

- 线上 HTTPS 接口域名
- 微信后台的 request 合法域名
- 如果有图片/文件，还要补 upload/download 合法域名

#### 微信登录配套配置

微信登录配套配置没闭环。前端会直接 `wx.login()`（auth.js）；后端会调用 `jscode2session`（auth.service.ts）。所以必须补齐并保证一致：

- `WECHAT_APPID`
- `WECHAT_SECRET`
- 且要和小程序后台的真实 AppID 是同一个

#### 后端正式环境变量

后端正式环境变量还没落地，至少包括这些（见 `.env.example`）：

- **数据库**：`DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE`
- **安全**：`JWT_SECRET`
- **微信登录**：`WECHAT_APPID` / `WECHAT_SECRET`
- **外部能力**：`JIZHILE_API_KEY` / `ARK_API_KEY`
- **对象存储**：`COS_SECRET_ID` / `COS_SECRET_KEY` / `COS_BUCKET` / `COS_REGION`
- **支付**：`WECHAT_PAY_MCHID` / `WECHAT_PAY_KEY` / `WECHAT_PAY_CERT_PATH` / `WECHAT_PAY_KEY_PATH`

#### 上传相关配置

上传相关配置也没闭环。前端把图片传到 `/upload/image`（promo-notes/index.js）；但后端实际只有 `/storage/presigned-url`，而且 COS 也明确"未接入"（见 storage.controller.ts 和 storage.service.ts）。所以还缺：

- 正式上传方案
- COS 访问域名
- 微信后台 upload/download 域名白名单

#### 微信后台非代码类配置

微信后台还要补非代码类配置：

- 隐私保护指引
- 业务类目与支付能力匹配
- 审核用的小程序名称、简介、图标、测试账号、服务类目说明
- 如果要保存海报到相册，还要处理相册权限说明（referral/index.js）