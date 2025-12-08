# 访客记录功能增强

## ✨ 新增功能

访客记录系统现在可以记录更多类型的互动：

### 1. 玩家访问记录 👋
当有其他玩家访问你的小屋时，会自动记录到访客列表中。

### 2. 礼物接收记录 🎁
当你收到好友赠送的礼物时，会详细记录礼物信息。

## 🔧 实现细节

### 客户端 (game.js)

#### 1. 访问小屋时通知服务器
```javascript
visitUserHouse(user) {
    // ... 现有代码 ...
    
    // 通知服务器，记录访问
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
            type: 'visit_user',
            targetUsername: user.username
        }));
    }
}
```

#### 2. 接收访问通知
```javascript
else if (message.type === 'visitor_notification') {
    // 收到访客通知
    const visitorRecord = {
        id: Date.now(),
        name: message.visitor.nickname,
        username: message.visitor.username,
        type: 'visit', // 标记为访问类型
        date: new Date().toLocaleDateString('zh-CN')
    };
    this.gameState.visitors.push(visitorRecord);
    this.showNotification(`${message.visitor.nickname} 来访问你的小屋了！`);
    this.saveGameState();
}
```

#### 3. 接收礼物时记录详情
```javascript
else if (message.type === 'receive_gift') {
    // ... 处理礼物 ...
    
    // 添加到访客记录
    const visitorRecord = {
        id: Date.now(),
        name: message.from.nickname,
        username: message.from.username,
        type: 'gift', // 标记为礼物类型
        gift: {
            type: gift.type,
            description: giftDescription, // 如 "10 阳光露珠"
            details: gift
        },
        date: new Date().toLocaleDateString('zh-CN')
    };
    this.gameState.visitors.push(visitorRecord);
}
```

#### 4. 增强的访客记录显示
```javascript
renderVisitors() {
    // 根据访客类型显示不同的图标和内容
    if (visitor.type === 'visit') {
        icon = '👋';
        description = '来访问了你的小屋';
    } else if (visitor.type === 'gift') {
        icon = '🎁';
        description = `赠送了 ${visitor.gift.description}`;
    } else if (visitor.gift && visitor.gift.amount) {
        // 旧的随机访客格式
        icon = '🎁';
        description = `+${visitor.gift.amount} 阳光/星光`;
    }
}
```

### 服务器端 (server.js)

#### 1. 处理访问请求并通知被访问者
```javascript
else if (parsed.type === 'visit_user') {
    const targetUser = onlineUsers.get(parsed.targetUsername);
    if (targetUser) {
        // 通知被访问者有人来访
        targetUser.ws.send(JSON.stringify({
            type: 'visitor_notification',
            visitor: {
                username: currentUser.username,
                nickname: currentUser.nickname
            }
        }));
        console.log(`👋 ${currentUser.nickname} 访问了 ${targetUser.nickname} 的小屋`);
    }
}
```

#### 2. 增强礼物赠送日志
```javascript
else if (parsed.type === 'send_gift') {
    // ... 发送礼物 ...
    
    // 记录详细日志
    let giftDesc = '';
    if (parsed.gift.type === 'resource') {
        giftDesc = `${parsed.gift.amount} ${parsed.gift.resourceType === 'sunlight' ? '阳光露珠' : '星光'}`;
    } else if (parsed.gift.type === 'item') {
        giftDesc = `${parsed.gift.category === 'photo' ? '照片' : '纪念品'}`;
    }
    console.log(`🎁 ${currentUser.nickname} 向 ${targetUser.nickname} 赠送了 ${giftDesc}`);
}
```

## 📊 访客记录类型

访客记录现在支持三种类型：

| 类型 | type 字段 | 图标 | 描述 | 数据结构 |
|------|----------|------|------|----------|
| **随机访客** | 无或旧格式 | 🎁 | NPC 访客留下礼物 | `{ name, gift: { type, amount }, date }` |
| **玩家访问** | `'visit'` | 👋 | 其他玩家访问小屋 | `{ name, username, type: 'visit', date }` |
| **礼物接收** | `'gift'` | 🎁 | 收到玩家赠送礼物 | `{ name, username, type: 'gift', gift: { description, details }, date }` |

## 🎯 用户体验

### 访问小屋流程
1. 玩家 A 在"社区"面板点击在线玩家列表
2. 选择玩家 B 并点击访问
3. 玩家 B 收到通知："玩家A 来访问你的小屋了！"
4. 玩家 B 的访客记录中新增一条记录，显示玩家 A 的访问

### 赠送礼物流程
1. 玩家 A 在"好友"面板找到好友 B
2. 点击"赠送"按钮，选择要赠送的物品/资源
3. 玩家 B 收到通知："收到来自玩家A 的礼物：10 阳光露珠！"
4. 玩家 B 的访客记录中新增一条记录，详细显示礼物信息
5. 资源/物品自动添加到玩家 B 的账户中

## 🎨 界面展示

### 访客记录面板

访客记录按时间倒序显示，最新的在最上面：

```
┌─────────────────────────────────────┐
│ 👋 玩家昵称                          │
│    2024/12/07                        │
│    来访问了你的小屋                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🎁 好友昵称                          │
│    2024/12/07                        │
│    赠送了 50 阳光露珠                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🎁 神秘访客                          │
│    2024/12/07                        │
│    +15 ☀️ 阳光露珠                   │
└─────────────────────────────────────┘
```

### 颜色区分
- **访问记录**：绿色 (#10b981) - 温馨的访问
- **礼物记录**：紫色 (#667eea) - 珍贵的礼物
- **随机访客**：紫色 (#667eea) - 神秘的惊喜

## 🔔 通知系统

所有访客相关的互动都会触发通知：

| 事件 | 通知内容 |
|------|----------|
| 玩家访问你的小屋 | "玩家昵称 来访问你的小屋了！" |
| 收到资源礼物 | "收到来自 玩家昵称 的礼物：50 阳光露珠！" |
| 收到物品礼物 | "收到来自 玩家昵称 的礼物：照片：神秘森林！" |
| 随机访客 | "有访客来过小屋！" |

## 💾 数据保存

### 访客记录数据结构

**玩家访问记录：**
```json
{
  "id": 1733580123456,
  "name": "玩家昵称",
  "username": "player001",
  "type": "visit",
  "date": "2024/12/7"
}
```

**礼物接收记录：**
```json
{
  "id": 1733580123456,
  "name": "好友昵称",
  "username": "friend001",
  "type": "gift",
  "gift": {
    "type": "resource",
    "description": "50 阳光露珠",
    "details": {
      "type": "resource",
      "resourceType": "sunlight",
      "amount": 50
    }
  },
  "date": "2024/12/7"
}
```

**随机访客记录（旧格式）：**
```json
{
  "id": 1733580123456,
  "name": "神秘访客",
  "gift": {
    "type": "sunlight",
    "amount": 15
  },
  "date": "2024/12/7"
}
```

### 保存位置

- **注册用户**：服务器端 `user_data/游戏数据_<username>.json`
- **访客用户**：浏览器 localStorage `guest_game_<guestId>`

## 🧪 测试方法

### 测试玩家访问记录

1. **准备两个账号**
   - 账号 A：在设备 1 登录
   - 账号 B：在设备 2 登录（或同一设备不同浏览器）

2. **执行访问**
   - 账号 A：打开"社区" → "在线用户"
   - 点击账号 B 进行访问
   - 查看通知："正在访问 B 的小屋..."

3. **验证记录**
   - 账号 B：打开"社区" → "访客记录"
   - 应该看到账号 A 的访问记录（👋 图标）
   - 记录内容："来访问了你的小屋"

### 测试礼物接收记录

1. **准备好友关系**
   - 账号 A 和账号 B 互为好友

2. **赠送礼物**
   - 账号 A：打开"社区" → "好友"
   - 找到账号 B，点击"赠送"
   - 选择礼物类型（如阳光露珠 50）

3. **验证记录**
   - 账号 B：收到通知："收到来自 A 的礼物：50 阳光露珠！"
   - 打开"社区" → "访客记录"
   - 应该看到账号 A 的礼物记录（🎁 图标）
   - 记录详细显示礼物内容

### 测试服务器日志

在服务器终端查看日志：

```bash
# 访问小屋
👋 玩家A 访问了 玩家B 的小屋

# 赠送礼物
🎁 玩家A 向 玩家B 赠送了 50 阳光露珠
```

## 🎁 礼物类型详解

系统支持四种礼物类型：

### 1. 阳光露珠 ☀️
- 资源类型
- 可自定义数量
- 显示：`赠送了 X 阳光露珠`

### 2. 星光 ✨
- 资源类型
- 可自定义数量
- 显示：`赠送了 X 星光`

### 3. 照片 📷
- 物品类型
- 从自己的收藏中选择
- 显示：`赠送了 照片：地点名称`

### 4. 纪念品 🎁
- 物品类型
- 从自己的收藏中选择
- 显示：`赠送了 纪念品 [图标]`

## 📝 注意事项

### 数据兼容性
- 新格式的访客记录包含 `type` 字段
- 旧格式的随机访客记录没有 `type` 字段
- 渲染时会自动识别格式并正确显示

### 网络要求
- 访问记录和礼物记录都需要 WebSocket 连接
- 如果网络断开，会显示"网络未连接"提示
- 重新连接后可以继续使用

### 隐私保护
- 访客记录只保存昵称和用户名
- 不会显示访客的详细游戏数据
- 只有互为好友才能赠送礼物

## 🚀 未来扩展

### 可能的增强功能
- [ ] 访客留言功能
- [ ] 访客回访提醒
- [ ] 礼物回赠快捷按钮
- [ ] 访客统计（今日访客数、本周访客数等）
- [ ] 访客排行榜（最常访问的玩家）
- [ ] 限制访客记录数量（如只保留最近 50 条）

## 📋 修改文件清单

本次功能涉及以下文件：

- ✅ `game.js` - 客户端逻辑
  - 修改 `visitUserHouse()` - 添加访问通知
  - 修改 WebSocket 消息处理 - 添加访客通知和礼物记录
  - 修改 `renderVisitors()` - 增强显示逻辑
  
- ✅ `server.js` - 服务器端逻辑
  - 修改 `visit_user` 处理 - 发送访客通知
  - 修改 `send_gift` 处理 - 增强日志输出
  
- ✅ `VISITOR_RECORDS_ENHANCEMENT.md` - 本文档

---

修复日期：2025-12-07  
作者：AI Assistant

