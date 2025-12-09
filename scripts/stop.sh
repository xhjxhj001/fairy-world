#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# 切换到项目根目录
cd "$SCRIPT_DIR/.." || exit

PID_FILE="server.pid"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ ! -f "$PID_FILE" ]; then
    echo -e "${YELLOW}⚠️  未找到运行中的服务器 (PID文件不存在)${NC}"
    exit 0
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}🛑 正在停止服务器 (PID: $PID)...${NC}"
    kill "$PID"
    
    # 等待进程结束
    count=0
    while ps -p "$PID" > /dev/null 2>&1; do
        sleep 1
        count=$((count+1))
        if [ $count -gt 10 ]; then
            echo -e "${RED}⚠️  进程未响应，强制关闭...${NC}"
            kill -9 "$PID"
            break
        fi
    done
    
    echo -e "${GREEN}✅ 服务器已停止${NC}"
else
    echo -e "${YELLOW}⚠️  进程 $PID 不存在，清理 PID 文件${NC}"
fi

rm "$PID_FILE"
