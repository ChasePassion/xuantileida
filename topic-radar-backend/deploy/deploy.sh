#!/bin/bash
set -e

# ============================================================
# 选题雷达后端部署脚本
# 服务器: 8.147.63.231
# 域名: xuanti.jutongbao.online
# ============================================================

APP_DIR="/opt/topic-radar-backend"
BACKUP_DIR="/opt/topic-radar-backups"

echo "===== 选题雷达后端部署开始 ====="
echo "时间: $(date)"

# 1. 创建必要目录
echo "[1/8] 创建目录..."
mkdir -p "$APP_DIR/logs"
mkdir -p "$BACKUP_DIR"

# 2. 备份当前版本
echo "[2/8] 备份当前版本..."
if [ -d "$APP_DIR/dist" ]; then
    BACKUP_NAME="backup-$(date +%Y%m%d%H%M%S)"
    cp -r "$APP_DIR/dist" "$BACKUP_DIR/$BACKUP_NAME/"
    echo "  备份到: $BACKUP_DIR/$BACKUP_NAME"
fi

# 3. 安装依赖（如果 package.json 有变化）
echo "[3/8] 检查依赖..."
cd "$APP_DIR"
if ! npm ci --production 2>/dev/null; then
    echo "  npm ci 失败，尝试 npm install --production"
    npm install --production
fi

# 4. 构建
echo "[4/8] 构建项目..."
npm run build

# 5. 检查 .env.production
echo "[5/8] 检查环境变量..."
if [ ! -f "$APP_DIR/.env.production" ]; then
    echo "  错误: .env.production 不存在！"
    echo "  请复制 .env.example 为 .env.production 并填入真实值"
    exit 1
fi

# 6. 数据库迁移检查
echo "[6/8] 数据库..."
echo "  请确保 PostgreSQL 已运行且 .env.production 中数据库配置正确"
echo "  如需同步表结构，临时设置 DB_SYNC=true 重启一次即可"

# 7. 重启服务
echo "[7/8] 重启服务..."
if command -v pm2 &> /dev/null; then
    pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
    pm2 save
else
    echo "  PM2 未安装，使用 systemctl 或手动重启"
    echo "  安装 PM2: npm install -g pm2"
fi

# 8. 验证
echo "[8/8] 验证服务..."
sleep 3
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/billing/pricing | grep -q "200"; then
    echo "  服务启动成功!"
else
    echo "  警告: 服务可能未正常启动，请检查日志"
    echo "  日志: $APP_DIR/logs/error.log"
fi

echo ""
echo "===== 部署完成 ====="
echo ""
echo "后续操作清单:"
echo "  1. 确认 Nginx 配置已生效: sudo nginx -t && sudo systemctl reload nginx"
echo "  2. 确认 HTTPS 证书有效: sudo certbot renew --dry-run"
echo "  3. 将以下信息提供给贾悦进行联调:"
echo "     - 回查接口: https://xuanti.jutongbao.online/rest/getPaymentAmountAndStatus"
echo "     - 回写接口: https://xuanti.jutongbao.online/rest/returnPaymentStatus"
echo "     - AppID: wx9221c6714e5f1169"
echo "     - AppSecret: dee5588e95340cffd29d800cd7aebc35"
echo "     - 订单号前缀: XTLD"
echo "  4. 首次部署后立即修改服务器密码!"
