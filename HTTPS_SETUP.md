# HTTPS/WSS 支持说明

## 概述

游戏现在支持 HTTPS 和安全 WebSocket (WSS) 连接，这对于以下场景是必需的：

1. **部署在 HTTPS 服务器上**：如果你的网站使用 HTTPS，浏览器会要求 WebSocket 也必须使用安全连接 (WSS)
2. **使用反向代理**：如 Nginx、Apache 等配置了 SSL 的反向代理
3. **云平台部署**：许多云平台强制要求使用 HTTPS

## 快速开始

### 1. 生成自签名证书（开发/测试环境）

```bash
node generate-ssl-cert.js
```

这将在 `ssl/` 目录下生成以下文件：
- `cert.pem`: SSL 证书
- `key.pem`: 私钥

### 2. 启动服务器

```bash
node server.js
```

服务器将自动检测 SSL 证书并启用以下服务：

#### HTTP 服务 (不安全)
- **HTTP 服务器**: `http://localhost:3001`
- **WebSocket**: `ws://localhost:8080`

#### HTTPS 服务 (安全)
- **HTTPS 服务器**: `https://localhost:3443`
- **安全 WebSocket**: `wss://localhost:8081`

### 3. 访问游戏

根据你的需求选择协议：

- **HTTP 访问**: `http://localhost:3001` 或 `http://<IP地址>:3001`
- **HTTPS 访问**: `https://localhost:3443` 或 `https://<IP地址>:3443`

## 客户端自动适配

客户端代码会自动根据页面协议选择正确的 WebSocket 连接：

- 如果页面通过 HTTP 加载 → 使用 `ws://`
- 如果页面通过 HTTPS 加载 → 使用 `wss://`

## 自签名证书的浏览器警告

使用自签名证书时，浏览器会显示安全警告。这是正常的，因为证书不是由受信任的证书颁发机构签发的。

### 如何接受自签名证书

#### Chrome/Edge
1. 在警告页面点击"高级"
2. 点击"继续前往 localhost (不安全)"

#### Firefox
1. 点击"高级..."
2. 点击"接受风险并继续"

#### Safari
1. 点击"显示详细信息"
2. 点击"访问此网站"

### 移动设备

在移动设备上，你可能需要：
1. 首先访问 HTTPS 地址并接受证书
2. 然后才能正常使用游戏

## 生产环境部署

对于生产环境，**不应使用自签名证书**，而应使用由受信任机构签发的正式 SSL 证书。

### 推荐方案

#### 1. Let's Encrypt (免费)

最流行的免费 SSL 证书解决方案：

```bash
# 安装 certbot
sudo apt-get install certbot

# 生成证书（需要域名）
sudo certbot certonly --standalone -d yourdomain.com

# 证书将保存在
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

然后修改 `server.js` 中的证书路径：

```javascript
const SSL_CERT_PATH = '/etc/letsencrypt/live/yourdomain.com/fullchain.pem';
const SSL_KEY_PATH = '/etc/letsencrypt/live/yourdomain.com/privkey.pem';
```

#### 2. 使用反向代理 (推荐)

更常见的方案是使用 Nginx 或 Apache 作为反向代理处理 SSL：

**Nginx 配置示例**:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # HTTP 代理
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket 代理
    location /ws/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

使用反向代理的好处：
- SSL 终止在代理层，Node.js 应用无需处理 SSL
- 更容易管理证书更新
- 更好的性能和安全性
- 可以统一管理多个应用

## 端口说明

| 服务 | 端口 | 协议 | 用途 |
|------|------|------|------|
| HTTP 服务器 | 3001 | HTTP | 提供静态文件 |
| HTTPS 服务器 | 3443 | HTTPS | 提供静态文件 (安全) |
| WebSocket | 8080 | WS | 游戏数据通信 |
| 安全 WebSocket | 8081 | WSS | 游戏数据通信 (安全) |

## 故障排除

### 问题 1: 浏览器提示 "无法建立 WebSocket 连接"

**原因**: 页面使用 HTTPS 加载，但服务器未启用 WSS

**解决方案**: 
1. 运行 `node generate-ssl-cert.js` 生成证书
2. 重启服务器

### 问题 2: 证书过期

自签名证书有效期为 365 天。过期后重新生成：

```bash
node generate-ssl-cert.js
```

### 问题 3: 防火墙阻止端口

确保以下端口可以访问：
- 3001 (HTTP)
- 3443 (HTTPS)
- 8080 (WS)
- 8081 (WSS)

```bash
# Ubuntu/Debian
sudo ufw allow 3001
sudo ufw allow 3443
sudo ufw allow 8080
sudo ufw allow 8081
```

### 问题 4: openssl 命令不存在

**macOS**: 已预装 openssl

**Linux**:
```bash
sudo apt-get install openssl  # Ubuntu/Debian
sudo yum install openssl       # CentOS/RHEL
```

**Windows**: 
下载并安装 [Win32 OpenSSL](https://slproweb.com/products/Win32OpenSSL.html)

## 安全建议

1. **不要将私钥提交到 Git**：`ssl/` 目录应该添加到 `.gitignore`
2. **定期更新证书**：自签名证书每年更新一次
3. **使用强密码**：确保用户账号使用强密码
4. **限制访问**：生产环境应配置防火墙规则
5. **使用反向代理**：生产环境推荐使用 Nginx 等专业的反向代理

## 更多信息

- [WebSocket 安全性](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket)
- [Let's Encrypt 官方文档](https://letsencrypt.org/getting-started/)
- [Nginx WebSocket 代理配置](https://nginx.org/en/docs/http/websocket.html)

