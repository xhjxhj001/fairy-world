# 部署指南

本游戏支持两种部署方式，请根据您的情况选择。

## 方案对比

| 特性 | 方案一：直接部署 | 方案二：Nginx 反向代理（推荐）|
|------|----------------|--------------------------|
| **适用场景** | 本地开发、局域网 | 生产环境、公网部署 |
| **SSL 证书** | 需要自签名证书 | 使用现有证书 |
| **端口** | 多个端口（3001, 8080, 8081） | 标准端口（80, 443） |
| **性能** | 一般 | 优秀 |
| **安全性** | 基础 | 高 |
| **维护难度** | 简单 | 中等 |
| **是否推荐** | 仅用于开发测试 | ✅ 生产环境推荐 |

## 方案一：直接部署（开发/测试）

### 适用情况
- 本地开发
- 局域网内访问
- 快速测试
- 不需要公网访问

### 配置步骤

1. **生成 SSL 证书（如果需要 HTTPS）**
   ```bash
   node generate-ssl-cert.js
   ```

2. **启动服务器**
   ```bash
   node server.js
   ```

3. **访问游戏**
   - HTTP: `http://localhost:3001`
   - HTTPS: `https://localhost:3443`

### 优点
- 配置简单
- 快速启动
- 无需额外软件

### 缺点
- 需要开放多个端口
- 自签名证书有浏览器警告
- 性能不如反向代理
- 不适合生产环境

### 详细文档
参考：[HTTPS_SETUP.md](./HTTPS_SETUP.md)

---

## 方案二：Nginx 反向代理（推荐）⭐

### 适用情况
- ✅ **您的情况**：已有域名和 SSL 证书
- 公网部署
- 生产环境
- 需要高性能
- 需要专业的安全配置

### 架构图

```
浏览器
  ↓ HTTPS (443)
Nginx (SSL 终止)
  ↓ HTTP (3001)          ↓ WebSocket (8080)
  Node.js HTTP 服务      Node.js WebSocket 服务
```

### 配置步骤

#### 1. 配置 Nginx

添加 WebSocket 代理配置到您现有的 Nginx 配置：

```nginx
# 在您现有的 server 块中添加

# WebSocket 代理（关键！）
location /ws {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 7d;
}
```

#### 2. 重新加载 Nginx

```bash
sudo nginx -t  # 测试配置
sudo nginx -s reload  # 重新加载
```

#### 3. 启动 Node.js 服务器

```bash
cd /path/to/idle-game-1
node server.js
```

#### 4. 访问游戏

直接访问您的域名：
```
https://yourdomain.com
```

客户端会自动连接：
- HTTP: `https://yourdomain.com` → Nginx → `http://localhost:3001`
- WebSocket: `wss://yourdomain.com/ws` → Nginx → `ws://localhost:8080`

### 优点
- ✅ 使用现有 SSL 证书
- ✅ 标准端口（80/443）
- ✅ 更好的性能
- ✅ 更高的安全性
- ✅ 便于维护
- ✅ 支持负载均衡
- ✅ 统一的日志管理

### 注意事项

**重要**：必须在 Nginx 中配置 `/ws` 路径代理，否则 WebSocket 连接会失败！

### 详细文档
参考：[NGINX_CONFIG.md](./NGINX_CONFIG.md)

---

## 您的情况

根据您的描述：
> 通过访问域名的 HTTPS 地址，nginx 转发到本地 localhost:3001

您应该使用 **方案二（Nginx 反向代理）**。

### 您需要做的

1. ✅ **不需要**运行 `generate-ssl-cert.js`
2. ✅ **不需要**自签名证书
3. ✅ **只需要**在 Nginx 配置中添加 WebSocket 代理

### 快速配置

在您现有的 Nginx 配置文件中，找到您的 `server` 块，添加：

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    # 您现有的配置
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 【新增】WebSocket 代理（必需！）
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }
}
```

### 重新加载并测试

```bash
# 测试配置
sudo nginx -t

# 重新加载
sudo nginx -s reload

# 启动游戏服务器（如果还没启动）
node server.js

# 测试访问
curl -I https://yourdomain.com
```

### 验证 WebSocket 连接

访问 `https://yourdomain.com`，打开浏览器控制台 (F12)，应该看到：

```
🔗 连接到 WebSocket 服务器: wss://yourdomain.com/ws
✅ 已连接到游戏服务器
```

---

## 使用 PM2 保持服务运行（推荐）

无论哪种方案，都建议使用 PM2 管理 Node.js 进程：

```bash
# 全局安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name idle-game

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 设置开机自启
pm2 startup
pm2 save

# 重启应用
pm2 restart idle-game

# 停止应用
pm2 stop idle-game
```

---

## 故障排除

### WebSocket 连接失败

**症状**：控制台显示 WebSocket 连接错误

**检查清单**：
1. ✅ Nginx 是否配置了 `/ws` 路径
2. ✅ Node.js 服务器是否正在运行（`ps aux | grep node`）
3. ✅ 8080 端口是否被监听（`netstat -tlnp | grep 8080`）
4. ✅ 防火墙是否允许内部通信
5. ✅ Nginx 错误日志（`sudo tail -f /var/log/nginx/error.log`）

### 连接到错误的端口

**症状**：WebSocket 尝试连接 `wss://yourdomain.com:8080`

**原因**：客户端检测逻辑错误

**解决**：检查浏览器控制台的连接 URL，应该是：
- ✅ 正确：`wss://yourdomain.com/ws`
- ❌ 错误：`wss://yourdomain.com:8080`

如果是错误的，清除浏览器缓存并重新加载页面。

---

## 相关文档

- [NGINX_CONFIG.md](./NGINX_CONFIG.md) - 详细的 Nginx 配置指南
- [HTTPS_SETUP.md](./HTTPS_SETUP.md) - 直接部署和 SSL 证书指南
- [README.md](./README.md) - 项目总体说明
- [QUICKSTART.md](./QUICKSTART.md) - 快速开始指南

---

## 总结

**您的最佳选择**：使用现有的 Nginx + SSL 证书

**只需两步**：
1. 在 Nginx 配置中添加 `/ws` 路径的 WebSocket 代理
2. 运行 `node server.js` 启动游戏服务器

**无需**：
- ❌ 生成自签名证书
- ❌ 在 Node.js 中配置 SSL
- ❌ 开放额外的端口到公网

客户端代码已经更新，会自动检测部署方式并选择正确的连接方式！🎉

