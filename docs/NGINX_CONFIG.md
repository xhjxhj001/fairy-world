# Nginx 反向代理配置指南

## 概述

如果您已经有 HTTPS 证书和 Nginx，这是**推荐的部署方式**。Nginx 处理 SSL 终止，Node.js 应用只需监听 HTTP 端口即可。

## Nginx 配置示例

### 完整配置

```nginx
# /etc/nginx/sites-available/idle-game
# 或 /etc/nginx/conf.d/idle-game.conf

# 上游服务器定义
upstream idle_game_http {
    server 127.0.0.1:3001;
    keepalive 64;
}

upstream idle_game_ws {
    server 127.0.0.1:8080;
    keepalive 64;
}

# HTTPS 服务器
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;  # 替换为您的域名

    # SSL 证书配置
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    # SSL 优化配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 日志
    access_log /var/log/nginx/idle-game-access.log;
    error_log /var/log/nginx/idle-game-error.log;

    # 静态文件和 HTTP 请求代理
    location / {
        proxy_pass http://idle_game_http;
        proxy_http_version 1.1;
        
        # 代理头设置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 连接保持
        proxy_set_header Connection "";
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 代理（关键配置）
    location /ws {
        proxy_pass http://idle_game_ws;
        proxy_http_version 1.1;
        
        # WebSocket 必需的头
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 代理头设置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 超时设置（保持长连接）
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        
        # 缓冲设置
        proxy_buffering off;
    }

    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot|mp3|wav)$ {
        proxy_pass http://idle_game_http;
        proxy_cache_valid 200 1d;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;  # 替换为您的域名
    
    # 重定向所有 HTTP 请求到 HTTPS
    return 301 https://$server_name$request_uri;
}
```

## 配置步骤

### 1. 创建配置文件

```bash
sudo nano /etc/nginx/sites-available/idle-game
```

或

```bash
sudo nano /etc/nginx/conf.d/idle-game.conf
```

### 2. 修改配置

将上面的配置复制进去，并修改以下内容：

- `yourdomain.com` → 替换为您的域名
- `ssl_certificate` → 您的 SSL 证书路径
- `ssl_certificate_key` → 您的 SSL 私钥路径

### 3. 创建符号链接（仅 sites-available 方式需要）

```bash
sudo ln -s /etc/nginx/sites-available/idle-game /etc/nginx/sites-enabled/
```

### 4. 测试配置

```bash
sudo nginx -t
```

应该看到：
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. 重新加载 Nginx

```bash
sudo systemctl reload nginx
# 或
sudo nginx -s reload
```

### 6. 启动 Node.js 服务器

```bash
cd /path/to/idle-game-1
node server.js
```

## 验证部署

### 检查服务状态

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 检查端口监听
sudo netstat -tlnp | grep -E '(80|443|3001|8080)'
```

### 浏览器测试

1. 访问 `https://yourdomain.com`
2. 打开浏览器开发者工具 (F12)
3. 查看 Console 标签，应该看到：
   ```
   🔗 连接到 WebSocket 服务器: wss://yourdomain.com/ws
   ✅ 已连接到游戏服务器
   ```
4. 查看 Network 标签，筛选 WS，应该看到一个成功的 WebSocket 连接

## 简化配置（最小版本）

如果您只需要基本功能：

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # HTTP 代理
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket 代理
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 7d;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## 常见问题

### 1. WebSocket 连接失败：ERR_SSL_PROTOCOL_ERROR

**原因**：Nginx 没有正确代理 WebSocket

**解决**：
- 确保配置了 `location /ws` 段
- 检查 `proxy_set_header Upgrade` 和 `Connection` 是否正确

### 2. WebSocket 频繁断开

**原因**：超时设置太短

**解决**：增加超时时间
```nginx
proxy_read_timeout 7d;
proxy_send_timeout 7d;
```

### 3. 403 Forbidden

**原因**：文件权限或 SELinux 问题

**解决**：
```bash
# 检查 SELinux（CentOS/RHEL）
sudo setsebool -P httpd_can_network_connect 1

# 检查文件权限
sudo chown -R nginx:nginx /path/to/idle-game-1
```

### 4. 502 Bad Gateway

**原因**：Node.js 服务器未运行或端口错误

**解决**：
```bash
# 检查 Node.js 是否运行
ps aux | grep node

# 检查端口监听
sudo netstat -tlnp | grep 3001
sudo netstat -tlnp | grep 8080

# 重启 Node.js 服务器
node server.js
```

## 使用 PM2 保持服务运行

推荐使用 PM2 管理 Node.js 进程：

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name idle-game

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs idle-game
```

## 性能优化

### 启用 Gzip 压缩

在 `http` 或 `server` 块中添加：

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript 
           application/x-javascript application/xml+rss 
           application/json application/javascript;
```

### 静态资源缓存

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|mp3)$ {
    proxy_pass http://idle_game_http;
    expires 7d;
    add_header Cache-Control "public, immutable";
}
```

### 连接限制（防止 DDoS）

```nginx
limit_req_zone $binary_remote_addr zone=game_limit:10m rate=10r/s;

server {
    ...
    limit_req zone=game_limit burst=20 nodelay;
}
```

## 总结

使用 Nginx 反向代理的优势：

✅ **无需在 Node.js 应用中处理 SSL**  
✅ **统一的证书管理**（支持 Let's Encrypt 自动更新）  
✅ **更好的性能**（Nginx 处理静态文件更高效）  
✅ **更高的安全性**（Nginx 可配置各种安全策略）  
✅ **支持负载均衡**（可轻松扩展到多个 Node.js 实例）  
✅ **便于维护**（证书更新、日志管理等）

您的当前配置已经非常完善，只需要确保 Nginx 配置了 `/ws` 路径的 WebSocket 代理即可！

