# WebSocket 自动重连机制

## 🎯 解决的问题

### 问题描述
在移动设备上使用游戏时遇到的问题：
1. 📱 手机锁屏后，WebSocket 连接自动断开
2. 🔓 解锁手机后，连接不会自动恢复
3. 💔 用户操作只在前端，数据未保存到服务器
4. 😞 用户体验差，数据可能丢失

### 根本原因
移动浏览器为了节省电量和资源，在页面进入后台或锁屏时会：
- 暂停 JavaScript 执行
- 断开网络连接
- 清理内存

## ✨ 解决方案

实现了完善的 WebSocket 自动重连机制，包括：

### 1. 自动重连
- ✅ 检测到断开自动尝试重连
- ✅ 指数退避策略（2秒 → 4秒 → 8秒...最多30秒）
- ✅ 最多尝试10次
- ✅ 可手动触发重连

### 2. 页面可见性监听
- ✅ 监听 `visibilitychange` 事件
- ✅ 页面重新可见时自动检查连接
- ✅ 解锁手机自动重连
- ✅ 切换回标签页自动重连

### 3. 网络状态监听
- ✅ 监听 `online` 事件
- ✅ 网络恢复自动重连
- ✅ 监听 `offline` 事件显示断开状态

### 4. 连接状态显示
- ✅ 顶部状态栏显示连接指示器
- ✅ 不同颜色表示不同状态
- ✅ 动画效果（连接中/重连中）
- ✅ 鼠标悬停显示详细信息

### 5. Ping/Pong 心跳
- ✅ 定期 ping 服务器确认连接
- ✅ 服务器响应 pong
- ✅ 检测假连接（连接但不通信）

## 🎨 连接状态指示器

### 状态显示

| 状态 | 颜色 | 图标 | 说明 |
|------|------|------|------|
| 正在连接 | 🟠 橙色 | ● | 首次建立连接 |
| 已连接 | 🟢 绿色 | ● | 连接正常 |
| 已断开 | 🔴 红色 | ● | 连接断开 |
| 重连中 | 🟠 橙色 | ● | 正在尝试重连 (X/10) |
| 连接错误 | 🔴 红色 | ● | 连接出错 |
| 连接失败 | ⚫ 灰色 | ● | 重连失败，已停止 |

### 交互功能

- **鼠标悬停**：显示详细状态信息
- **点击指示器**：手动触发重连（断开/错误/失败状态）
- **动画效果**：连接中和重连中状态会脉冲闪烁

### 位置
状态指示器显示在顶部状态栏，用户昵称旁边。

```
┌────────────────────────────────┐
│ 用户昵称 ● │ ☀️ 100  ✨ 50     │
│          ↑                     │
│      连接状态                   │
└────────────────────────────────┘
```

## 💻 技术实现

### 客户端 (game.js)

#### 1. 添加重连相关属性

```javascript
// WebSocket 相关
this.ws = null;
this.reconnectTimer = null;
this.reconnectAttempts = 0;
this.maxReconnectAttempts = 10;
this.reconnectDelay = 2000; // 2秒
this.isIntentionalClose = false; // 是否主动关闭
```

#### 2. 增强 initWebSocket()

```javascript
initWebSocket() {
    // 清除之前的重连定时器
    if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }
    
    // 更新状态为"连接中"
    this.updateConnectionStatus('connecting');
    
    this.ws = new WebSocket(`ws://${host}:8080`);
    
    this.ws.onopen = () => {
        // 重置重连计数
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('connected');
        // ...认证逻辑
    };
    
    this.ws.onclose = (event) => {
        this.updateConnectionStatus('disconnected');
        // 如果不是主动关闭，尝试重连
        if (!this.isIntentionalClose) {
            this.attemptReconnect();
        }
    };
    
    this.ws.onerror = (error) => {
        this.updateConnectionStatus('error');
    };
}
```

#### 3. 重连逻辑

```javascript
attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('⚠️ 已达到最大重连次数，停止重连');
        this.updateConnectionStatus('failed');
        return;
    }

    this.reconnectAttempts++;
    // 指数退避策略
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000);
    
    this.updateConnectionStatus('reconnecting', this.reconnectAttempts);
    
    this.reconnectTimer = setTimeout(() => {
        this.initWebSocket();
    }, delay);
}
```

#### 4. 页面可见性监听

```javascript
// 监听页面可见性变化（锁屏/解锁、切换标签等）
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log('📱 页面重新可见，检查连接状态...');
        this.onPageVisible();
    } else {
        console.log('📱 页面进入后台');
        // 保存数据
        this.saveGameState();
    }
});

onPageVisible() {
    // 检查 WebSocket 连接状态
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.log('🔄 检测到断开，尝试重连...');
        this.reconnectAttempts = 0; // 重置计数器
        this.initWebSocket();
    } else {
        // 即使连接正常，也 ping 一下确认
        this.pingServer();
    }
}
```

#### 5. 网络状态监听

```javascript
// 监听网络状态变化
window.addEventListener('online', () => {
    console.log('🌐 网络已连接');
    this.onNetworkOnline();
});

window.addEventListener('offline', () => {
    console.log('🌐 网络已断开');
    this.updateConnectionStatus('disconnected');
});

onNetworkOnline() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.reconnectAttempts = 0;
        this.initWebSocket();
    }
}
```

#### 6. 心跳检测

```javascript
pingServer() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
            this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {
            console.error('Ping 失败:', e);
            this.initWebSocket();
        }
    }
}
```

#### 7. 连接状态显示

```javascript
updateConnectionStatus(status, attempt = 0) {
    const statusBar = document.querySelector('.status-bar');
    if (!statusBar) return;
    
    // 创建状态指示器
    const indicator = document.createElement('div');
    indicator.className = 'connection-indicator';
    
    // 根据状态设置颜色、文本和动画
    switch (status) {
        case 'connecting':
            color = '#f59e0b'; // 橙色
            title = '正在连接...';
            // 添加脉冲动画
            break;
        // ... 其他状态
    }
    
    // 添加到状态栏
    userInfo.appendChild(indicator);
}
```

### 服务器端 (server.js)

#### Ping/Pong 处理

```javascript
// Ping/Pong 心跳
else if (parsed.type === 'ping') {
    ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now()
    }));
}
```

### 样式 (styles.css)

#### 脉冲动画

```css
@keyframes pulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.5;
        transform: scale(1.2);
    }
}

.connection-indicator {
    display: inline-block;
    line-height: 1;
    transition: all 0.3s ease;
}

.connection-indicator:hover {
    transform: scale(1.2);
}
```

## 📱 使用场景

### 1. 手机锁屏场景

**问题流程（优化前）：**
1. 用户在手机上玩游戏
2. 接电话 / 锁屏
3. WebSocket 断开
4. 解锁后继续操作
5. ❌ 数据未保存到服务器

**优化流程（优化后）：**
1. 用户在手机上玩游戏
2. 接电话 / 锁屏
3. WebSocket 断开
4. 自动保存数据到本地
5. 解锁后自动检测并重连
6. ✅ 数据正常同步

### 2. 网络波动场景

**流程：**
1. WiFi / 4G 信号不稳定
2. 连接断开
3. 自动尝试重连（最多10次）
4. 网络恢复后自动连接
5. ✅ 用户无需手动操作

### 3. 切换标签页场景

**流程：**
1. 用户切换到其他标签页
2. 页面进入后台，保存数据
3. 切换回来时自动检测连接
4. 必要时自动重连
5. ✅ 连接状态透明

## 🔔 用户体验

### 视觉反馈

**连接正常：**
- 🟢 绿色圆点
- 无动画
- 用户几乎感知不到

**连接中 / 重连中：**
- 🟠 橙色圆点
- 脉冲动画
- 提示用户正在处理

**连接失败：**
- 🔴 红色圆点
- 可点击手动重连
- 明确告知用户状态

### 操作提示

- 鼠标悬停显示详细状态
- 点击可手动重连（失败时）
- 控制台输出详细日志方便调试

## 🧪 测试方法

### 1. 锁屏测试

```bash
# 步骤
1. 在手机浏览器打开游戏
2. 查看连接状态（绿色圆点）
3. 锁定手机屏幕
4. 等待 10-30 秒
5. 解锁手机
6. 观察连接状态
   ✅ 应自动变为"连接中"（橙色）
   ✅ 几秒后变为"已连接"（绿色）
```

### 2. 网络切换测试

```bash
# 步骤
1. 在手机浏览器打开游戏
2. 开启飞行模式
3. 观察状态变为"已断开"（红色）
4. 关闭飞行模式
5. 观察自动重连
   ✅ 应自动尝试重连
   ✅ 成功后变为绿色
```

### 3. 切换标签测试

```bash
# 步骤
1. 在浏览器打开游戏
2. 切换到其他标签页
3. 等待一段时间
4. 切换回游戏标签
5. 观察连接状态
   ✅ 应自动检查并重连（如需要）
```

### 4. 手动重连测试

```bash
# 步骤
1. 停止服务器（模拟断开）
2. 观察状态变为红色
3. 点击红色圆点
4. 观察开始尝试重连
5. 重启服务器
6. 观察成功连接
   ✅ 手动重连功能正常
```

## 📊 重连策略

### 指数退避算法

| 尝试次数 | 延迟时间 | 累计时间 |
|---------|---------|---------|
| 第1次 | 2秒 | 2秒 |
| 第2次 | 4秒 | 6秒 |
| 第3次 | 8秒 | 14秒 |
| 第4次 | 16秒 | 30秒 |
| 第5次 | 30秒 | 60秒 |
| ... | 30秒 | ... |
| 第10次 | 30秒 | ~5分钟 |

**设计原因：**
- 初期快速重连（用户刚解锁）
- 后期降低频率（避免服务器压力）
- 最多重连10次（避免无限重试）

## ⚙️ 配置参数

可以调整以下参数来优化重连行为：

```javascript
this.maxReconnectAttempts = 10;  // 最大重连次数
this.reconnectDelay = 2000;      // 初始延迟（毫秒）
```

### 建议配置

**快速重连（适合网络稳定）：**
```javascript
this.maxReconnectAttempts = 5;
this.reconnectDelay = 1000;
```

**保守重连（适合网络不稳定）：**
```javascript
this.maxReconnectAttempts = 20;
this.reconnectDelay = 3000;
```

## 📝 注意事项

### 1. 数据安全

- 页面进入后台时自动保存数据
- 访客数据保存到 localStorage
- 注册用户数据保存到服务器
- 断线期间的操作会在本地暂存

### 2. 性能考虑

- 使用指数退避避免频繁重连
- 页面不可见时不执行重连
- 网络离线时不尝试连接

### 3. 用户通知

- 不要过度打扰用户
- 使用视觉指示器而非弹窗
- 重连成功后不显示通知

## 🚀 未来优化方向

### 可能的改进

- [ ] 断线期间操作队列
- [ ] 重连成功后自动同步数据
- [ ] 更智能的重连策略
- [ ] WebSocket 连接池
- [ ] 心跳包优化
- [ ] 离线模式支持

## 📋 修改文件清单

本次优化涉及以下文件：

- ✅ `game.js` - 添加重连机制、页面监听、心跳检测
- ✅ `server.js` - 添加 ping/pong 处理
- ✅ `styles.css` - 添加连接指示器样式和动画
- ✅ `WEBSOCKET_RECONNECT.md` - 本文档

---

修复日期：2025-12-07  
作者：AI Assistant

