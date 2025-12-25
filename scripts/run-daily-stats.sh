#!/bin/bash
#
# 每日统计任务脚本
# 用于生成用户聊天统计报表和 HTML 仪表盘
#
# 使用方法:
#   ./scripts/run-daily-stats.sh
#
# Crontab 配置: ${workspaceDir}替换为你的项目路径
#  每天午夜运行一次
#   0 0 * * * ${workspaceDir}/scripts/run-daily-stats.sh >> ${workspaceDir}/logs/cron.log 2>&1
#

set -e

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# 日志目录
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"

# 日志文件
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/daily-stats-$TIMESTAMP.log"

echo "═══════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "📊 每日统计任务开始: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════════════" | tee -a "$LOG_FILE"

# 1. 生成终端统计报表
echo "" | tee -a "$LOG_FILE"
echo "🔄 正在生成终端统计报表..." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if npx tsx "$PROJECT_DIR/scripts/user-stats-report.ts" 2>&1 | tee -a "$LOG_FILE"; then
    echo "✅ 终端统计报表生成成功" | tee -a "$LOG_FILE"
else
    echo "❌ 终端统计报表生成失败" | tee -a "$LOG_FILE"
    exit 1
fi

# 2. 生成 HTML 仪表盘
echo "" | tee -a "$LOG_FILE"
echo "🔄 正在生成 HTML 仪表盘..." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if npx tsx "$PROJECT_DIR/scripts/generate-html-dashboard.ts" 2>&1 | tee -a "$LOG_FILE"; then
    echo "✅ HTML 仪表盘生成成功" | tee -a "$LOG_FILE"
else
    echo "❌ HTML 仪表盘生成失败" | tee -a "$LOG_FILE"
    exit 1
fi

# 完成
echo "" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "✅ 每日统计任务完成: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
