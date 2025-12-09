#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# 切换到项目根目录
cd "$SCRIPT_DIR/.." || exit

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🛠️  开始项目初始化...${NC}"

# 1. 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Node.js${NC}"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 2. 设置脚本执行权限
echo -e "${YELLOW}🔑 设置脚本权限...${NC}"
chmod +x scripts/*.sh
echo "   - 脚本权限已设置"

# 3. 安装/更新依赖
echo -e "${YELLOW}📦 安装项目依赖...${NC}"
export PUPPETEER_SKIP_DOWNLOAD=true 
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
else
    echo -e "${RED}❌ 依赖安装失败${NC}"
    exit 1
fi

# 4. 创建必要目录
echo -e "${YELLOW}📂 检查目录结构...${NC}"
if [ ! -d "user_data" ]; then
    mkdir -p user_data
    echo "   - 创建 user_data 目录"
fi

if [ ! -d "ssl" ]; then
    mkdir -p ssl
    echo "   - 创建 ssl 目录 (用于存放 HTTPS 证书)"
fi

# 5. 检查 SSL 证书
echo -e "${YELLOW}🔒 SSL 证书检查...${NC}"
if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
    echo -e "${GREEN}✅ 检测到 SSL 证书${NC}"
else
    echo -e "${YELLOW}⚠️  未检测到 SSL 证书${NC}"
    echo "   如果需要启用 HTTPS，请运行: node scripts/generate-ssl-cert.js"
fi

echo ""
echo -e "${GREEN}✨ 初始化完成！${NC}"
echo "你可以通过以下命令启动游戏:"
echo -e "   ${GREEN}./scripts/start.sh${NC}"
