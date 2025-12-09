#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# 切换到项目根目录
cd "$SCRIPT_DIR/.." || exit

echo "📄 正在监控日志 (按 Ctrl+C 退出)..."
tail -f server.log
