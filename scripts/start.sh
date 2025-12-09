#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# 切换到项目根目录
cd "$SCRIPT_DIR/.." || exit

# 配置
APP_NAME="game.js"
PID_FILE="server.pid"
LOG_FILE="server.log"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🎮 准备启动精灵世界服务器...${NC}"

# 1. 环境检查
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Node.js，请先安装。${NC}"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 正在安装依赖...${NC}"
    export PUPPETEER_SKIP_DOWNLOAD=true
    npm install
fi

# 2. 检查是否已运行
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  服务器似乎已经在运行中 (PID: $PID)${NC}"
        echo "   如果需要重启，请运行 ./scripts/restart.sh"
        echo "   如果需要停止，请运行 ./scripts/stop.sh"
        exit 1
    else
        # PID文件存在但进程不在，清理残留文件
        rm "$PID_FILE"
    fi
fi

# 3. 启动服务 (后台运行)
echo -e "${GREEN}🚀 正在启动服务器...${NC}"
nohup node server.js > "$LOG_FILE" 2>&1 &

# 4. 获取并保存 PID
PID=$!
echo $PID > "$PID_FILE"

# 5. 等待几秒检查状态
sleep 2
if ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 服务器启动成功! (PID: $PID)${NC}"
    echo -e "📄 日志输出至: ${YELLOW}$LOG_FILE${NC}"
    echo ""
    
    # 获取 IP 提示访问
    if [[ "$OSTYPE" == "darwin"* ]]; then
        IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        IP=$(hostname -I | awk '{print $1}')
    else
        IP="localhost"
    fi

    echo "📍 访问地址:"
    echo -e "   🏠 本机: ${GREEN}http://localhost:3001${NC}"
    if [ ! -z "$IP" ]; then
        echo -e "   📡 局域网: ${GREEN}http://${IP}:3001${NC}"
    fi
    echo ""
    echo "💡 提示:"
    echo "   - 查看日志: ./scripts/log.sh"
    echo "   - 停止服务: ./scripts/stop.sh"
    echo "   - 重启服务: ./scripts/restart.sh"
else
    echo -e "${RED}❌ 服务器启动失败，请查看日志:${NC}"
    cat "$LOG_FILE"
fi
