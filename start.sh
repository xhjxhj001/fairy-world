#!/bin/bash

# 精灵世界游戏服务器启动脚本

echo "🎮 正在启动精灵世界游戏服务器..."
echo ""

# 检查 node 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
    echo ""
fi

# 获取本机 IP 地址
echo "📡 检测网络地址..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP=$(hostname -I | awk '{print $1}')
else
    IP="<你的IP地址>"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎮 精灵世界 - 治愈放置游戏"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 本机访问:"
echo "   http://localhost:3001"
echo ""
echo "📱 局域网访问:"
echo "   http://${IP}:3001"
echo ""
echo "💡 提示:"
echo "   - 请确保防火墙允许端口 3001 和 8080"
echo "   - 局域网设备需连接到同一 WiFi"
echo "   - 按 Ctrl+C 停止服务器"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 启动服务器
node server.js

