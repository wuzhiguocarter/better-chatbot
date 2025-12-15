#!/bin/sh
set -e

# 你应用实际运行的 uid/gid（按需改）
APP_UID="${APP_UID:-1000}"
APP_GID="${APP_GID:-1000}"

# 只在 root 启动时修复
if [ "$(id -u)" = "0" ]; then
  chown -R "$APP_UID:$APP_GID" /app/RAGFlowMCP 2>/dev/null || true
fi

exec "$@"
