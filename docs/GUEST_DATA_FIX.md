# 访客数据保存功能修复说明

## 问题描述
之前访客模式的游戏数据不会保存，刷新页面后数据就会清空。

## 原因分析
1. **服务器端拒绝保存访客数据**：server.js 中明确表示"访客模式不保存数据"
2. **访客 ID 每次重新生成**：每次访客登录都会生成新的 guestId，导致无法加载之前的数据

## 修复方案

### 1. 游戏数据本地存储 (game.js)

#### saveGameState() 修改
- **访客模式**：游戏数据保存到浏览器的 localStorage
- **注册用户**：游戏数据保存到服务器

```javascript
saveGameState() {
    // 访客模式：保存到 localStorage
    if (this.currentUser.isGuest) {
        const saveData = {
            gameState: this.gameState,
            lastSave: Date.now()
        };
        localStorage.setItem(`guest_game_${this.currentUser.username}`, JSON.stringify(saveData));
        console.log('💾 访客数据已保存到本地');
        return;
    }
    
    // 注册用户：保存到服务器
    // ...
}
```

#### loadGameState() 修改
- **访客模式**：从 localStorage 加载游戏数据，并计算离线收益
- **注册用户**：从服务器加载游戏数据

```javascript
loadGameState() {
    // 访客模式：从 localStorage 加载
    if (this.currentUser.isGuest) {
        const savedData = localStorage.getItem(`guest_game_${this.currentUser.username}`);
        if (savedData) {
            // 加载数据并计算离线收益
            // ...
        }
        return;
    }
    
    // 注册用户：从服务器加载
    // ...
}
```

#### 新增离线收益计算
为访客添加了 `calculateGuestOfflineRewards()` 方法，让访客也能享受离线收益：
- 每小时生成 360 点阳光和星光
- 最多累积 12 小时
- 少于 6 分钟不显示离线收益

### 2. 访客 ID 持久化 (auth.html)

修改访客登录逻辑，让访客 ID 能够复用：

```javascript
// 检查是否已有访客信息，如果有则复用
let guestId, nickname;
const existingUser = localStorage.getItem('currentUser');
if (existingUser) {
    const userData = JSON.parse(existingUser);
    if (userData.isGuest) {
        guestId = userData.username;
        nickname = userData.nickname;
        console.log('🎭 复用现有访客账号:', guestId);
    }
}

// 如果没有现有访客信息，生成新的
if (!guestId) {
    guestId = `GUEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    nickname = `访客${Math.floor(Math.random() * 10000)}`;
    console.log('🆕 创建新访客账号:', guestId);
}
```

## 功能特点

### ✅ 访客数据持久化
- 游戏数据保存到浏览器本地存储
- 刷新页面后数据不会丢失
- 关闭浏览器后再打开，数据依然存在

### ✅ 离线收益
- 访客也能享受离线收益
- 重新进入游戏时自动计算并弹窗显示

### ✅ 自动保存
- 每 30 秒自动保存
- 页面关闭前自动保存

### ✅ 访客 ID 复用
- 首次访问生成唯一 ID
- 后续访问复用相同 ID
- 确保能够加载之前的游戏数据

## 数据存储位置

### 访客模式
- **存储位置**：浏览器 localStorage
- **存储键名**：`guest_game_${guestId}`
- **存储内容**：
  ```json
  {
    "gameState": { /* 游戏状态 */ },
    "lastSave": 1733580000000
  }
  ```

### 注册用户
- **存储位置**：服务器文件系统
- **存储路径**：`user_data/游戏数据_{username}.json`

## 注意事项

### 浏览器存储限制
- localStorage 有大小限制（通常 5-10MB）
- 清除浏览器数据会删除访客的游戏数据

### 建议
- **推荐注册账号**：获得更好的数据安全性
- **跨设备同步**：只有注册用户可以跨设备同步数据
- **定期备份**：访客数据仅存在本地，建议定期注册账号保存进度

## 测试方法

1. **访客模式登录**
   - 点击"访客模式进入"
   - 查看控制台日志，确认是否复用现有访客账号

2. **数据保存测试**
   - 访客模式下进行游戏
   - 收集一些资源、物品等
   - 刷新页面，检查数据是否还在

3. **离线收益测试**
   - 访客模式下进行游戏
   - 关闭浏览器等待一段时间
   - 重新打开游戏，查看是否显示离线收益弹窗

4. **清除数据测试**
   - 打开浏览器开发者工具
   - 找到 localStorage
   - 删除 `guest_game_*` 键，确认数据被清除

## 修改文件清单

- ✅ `game.js` - 修改 saveGameState() 和 loadGameState()
- ✅ `auth.html` - 修改访客登录逻辑，实现 guestId 复用
- ✅ `GUEST_DATA_FIX.md` - 本说明文档

---

修复日期：2025-12-07
修复者：AI Assistant

