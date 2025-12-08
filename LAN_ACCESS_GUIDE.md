# 局域网访问指南

## 问题修复说明

### 原问题
从局域网其他设备访问游戏时，点击"访客模式"或"登录"按钮会提示"无法连接到服务器"。

### 根本原因
1. **WebSocket 地址写死为 localhost**：`auth.html` 中的 WebSocket 连接地址固定为 `ws://localhost:8080`
2. **缺少 HTTP 服务器**：原来需要单独启动 HTTP 服务器来提供 HTML 文件
3. **未明确监听所有网络接口**：WebSocket 服务器没有明确配置监听 `0.0.0.0`

### 修复内容

#### 1. 动态 WebSocket 地址 (auth.html)
```javascript
// 修复前
ws = new WebSocket('ws://localhost:8080');

// 修复后
const host = window.location.hostname || 'localhost';
const wsUrl = `ws://${host}:8080`;
ws = new WebSocket(wsUrl);
```

#### 2. 添加 HTTP 服务器 (server.js)
- 在端口 3000 启动 HTTP 服务器
- 自动提供静态文件服务
- 默认打开 `auth.html`（登录页）
- 监听所有网络接口 `0.0.0.0`

#### 3. WebSocket 服务器配置 (server.js)
```javascript
const wss = new WebSocket.Server({ 
    port: 8080,
    host: '0.0.0.0' // 监听所有网络接口
});
```

#### 4. 显示本机 IP 地址
服务器启动时自动显示可用的访问地址，方便局域网设备连接。

## 使用方法

### 1. 启动服务器

```bash
cd /Users/xuhuanju/personal/Agent/fine-apps/idle-game-1
node server.js
```

你会看到类似以下输出：

```
🌐 HTTP 服务器已启动: http://0.0.0.0:3000
📱 局域网访问: http://<你的IP地址>:3000
💡 推荐访问地址:
   http://192.168.1.100:3000
🔌 WebSocket 服务器已启动: ws://0.0.0.0:8080
📁 用户数据目录: /Users/xuhuanju/personal/Agent/fine-apps/idle-game-1/user_data
👥 账号文件: /Users/xuhuanju/personal/Agent/fine-apps/idle-game-1/user_data/accounts.json

✅ 服务器启动完成！
🎮 开始游戏: 在浏览器中打开上面显示的地址
```

### 2. 访问游戏

#### 本机访问
- 打开浏览器访问：`http://localhost:3000`

#### 局域网其他设备访问
- 使用服务器启动时显示的 IP 地址
- 例如：`http://192.168.1.100:3000`

### 3. 登录游戏
- **注册新账号**：输入昵称、账号、密码
- **登录已有账号**：输入账号和密码  
- **访客模式**：点击"访客模式进入"按钮

## 端口说明

| 端口 | 服务类型 | 用途 |
|------|---------|------|
| 3000 | HTTP | 提供网页文件（HTML、CSS、JS） |
| 8080 | WebSocket | 实时通信（游戏数据、多人功能） |

## 常见问题

### 问题 1：无法从其他设备访问

**可能原因**：
- 防火墙阻止了端口访问
- 设备不在同一局域网
- IP 地址错误

**解决方案**：

1. **检查防火墙**（macOS）：
   ```bash
   # 查看防火墙状态
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
   
   # 添加 Node.js 到允许列表
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/node
   ```

2. **临时关闭防火墙测试**（macOS）：
   - 系统偏好设置 → 安全性与隐私 → 防火墙
   - 点击"关闭防火墙"（测试完记得重新开启）

3. **检查局域网连接**：
   - 确保所有设备连接到同一个 WiFi 网络
   - 不要使用访客网络

4. **验证 IP 地址**：
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

### 问题 2：连接 WebSocket 失败

**症状**：网页能打开，但点击登录时提示"无法连接到服务器"

**解决方案**：
1. 检查服务器是否正常运行
2. 查看浏览器控制台错误信息（F12）
3. 确认 WebSocket 地址正确：
   ```javascript
   // 在浏览器控制台执行
   console.log(window.location.hostname);
   ```

### 问题 3：端口被占用

**症状**：启动服务器时报错 `EADDRINUSE`

**解决方案**：
```bash
# macOS/Linux - 查找占用端口的进程
lsof -i :3000
lsof -i :8080

# 杀死占用端口的进程
kill -9 <PID>

# 或者修改端口
# 编辑 server.js，将 HTTP_PORT 改为其他值（如 3001）
```

### 问题 4：访客数据不保存

这已经修复了！访客数据现在保存在浏览器的 localStorage 中。详见 `GUEST_DATA_FIX.md`。

## 网络要求

### 同一局域网
✅ 所有设备必须连接到同一个路由器/WiFi
✅ 不要使用访客网络（通常有隔离机制）
✅ 确保路由器没有启用 AP 隔离

### 不同网络
❌ 无法直接访问（需要内网穿透或公网 IP）
❌ 手机流量无法访问电脑上的服务器

## 测试清单

### 本机测试
- [ ] 启动服务器成功
- [ ] 浏览器访问 `http://localhost:3000` 正常
- [ ] 注册/登录功能正常
- [ ] 访客模式正常
- [ ] 游戏功能正常

### 局域网测试
- [ ] 获取服务器 IP 地址
- [ ] 其他设备连接到同一 WiFi
- [ ] 浏览器访问 `http://<IP>:3000` 正常
- [ ] WebSocket 连接成功
- [ ] 登录/访客模式正常
- [ ] 多人功能正常（能看到在线玩家）

## 高级配置

### 修改端口

编辑 `server.js`：

```javascript
// HTTP 端口
const HTTP_PORT = 3000; // 改为你想要的端口

// WebSocket 端口（需要同时修改客户端）
const wss = new WebSocket.Server({ 
    port: 8080, // 改为你想要的端口
    host: '0.0.0.0'
});
```

### 仅开放特定 IP

如果只想让特定设备访问：

```javascript
const httpServer = http.createServer((req, res) => {
    // 获取客户端 IP
    const clientIP = req.connection.remoteAddress;
    
    // 白名单
    const allowedIPs = ['192.168.1.100', '192.168.1.101'];
    
    if (!allowedIPs.includes(clientIP)) {
        res.writeHead(403);
        res.end('访问被拒绝');
        return;
    }
    
    // ... 原来的代码 ...
});
```

## 安全建议

⚠️ **局域网使用建议**：
1. 仅在可信的局域网环境中使用
2. 不要在公共 WiFi 上开放服务器
3. 定期更改账号密码
4. 注意保护个人信息

⚠️ **公网访问警告**：
- 本服务器不适合直接暴露到公网
- 如需公网访问，请使用专业的反向代理和 HTTPS
- 详见 `SECURITY.md`

## 故障排查步骤

1. **检查服务器状态**
   ```bash
   # 查看服务器日志
   node server.js
   ```

2. **检查网络连接**
   ```bash
   # Ping 服务器 IP
   ping 192.168.1.100
   ```

3. **检查端口连通性**
   ```bash
   # macOS/Linux
   nc -zv 192.168.1.100 3000
   nc -zv 192.168.1.100 8080
   
   # Windows (PowerShell)
   Test-NetConnection 192.168.1.100 -Port 3000
   ```

4. **查看浏览器控制台**
   - 按 F12 打开开发者工具
   - 查看 Console 选项卡的错误信息
   - 查看 Network 选项卡的请求详情

5. **重启服务器**
   - Ctrl+C 停止服务器
   - 重新运行 `node server.js`

## 修改文件清单

本次修复涉及以下文件：

- ✅ `server.js` - 添加 HTTP 服务器，配置监听所有网络接口
- ✅ `auth.html` - 修改 WebSocket 连接为动态地址
- ✅ `game.js` - 已经使用动态地址（无需修改）
- ✅ `LAN_ACCESS_GUIDE.md` - 本文档

---

修复日期：2025-12-07  
作者：AI Assistant

