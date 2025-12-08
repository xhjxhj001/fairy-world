# 社区分享卡片显示昵称修复

## 📋 问题描述

社区分享中的分享卡片底部显示的是账号名（username），但应该显示更友好的昵称（nickname）。

## ✨ 改进内容

### 改进前
```
┌─────────────────────────┐
│        🏔️ 神秘山峰       │
│   由 xhjxhj001 分享      │  ← 显示账号名
└─────────────────────────┘
```

### 改进后
```
┌─────────────────────────┐
│        🏔️ 神秘山峰       │
│   由 xhj 分享            │  ← 显示昵称
└─────────────────────────┘
```

## 🔧 技术实现

### 1. 修改分享数据结构

在 `shareLocation()` 函数中，同时保存昵称和账号名：

```javascript
const locationToShare = {
    ...location,
    sharedBy: this.currentUser.nickname,        // 使用昵称（用于显示）
    sharedByUsername: this.currentUser.username, // 保留账号名（用于逻辑判断）
    date: new Date().toLocaleDateString('zh-CN'),
    timestamp: Date.now()
};
```

### 2. 兼容性处理

为了兼容旧数据，在所有涉及 `sharedBy` 的逻辑中都做了兼容处理：

**去重逻辑**:
```javascript
// 使用 sharedByUsername 或 sharedBy（兼容旧数据）
const username = loc.sharedByUsername || loc.sharedBy;
const key = `${loc.code}-${username}`;
```

**重复检查**:
```javascript
const alreadyShared = this.gameState.sharedLocations.some(
    l => l.code === location.code && 
         (l.sharedByUsername === this.currentUser.username || 
          l.sharedBy === this.currentUser.username)
);
```

**消息去重**:
```javascript
const username = location.sharedByUsername || location.sharedBy;
const isDuplicate = this.gameState.sharedLocations.some(l => 
    (l.sharedByUsername || l.sharedBy) === username && 
    l.code === location.code && 
    l.timestamp === location.timestamp
);
```

### 3. 渲染保持不变

`renderSharedLocations()` 函数中的渲染代码无需修改，因为 `location.sharedBy` 现在存储的就是昵称：

```javascript
<div style="font-size: 11px; color: #999; margin-top: 10px;">
    由 ${location.sharedBy} 分享 · ${location.date}
</div>
```

## 📄 修改的文件

### `game.js`

**修改位置 1**: `shareLocation()` 函数（约第1642-1648行）
- 将 `sharedBy` 改为存储昵称
- 新增 `sharedByUsername` 字段存储账号名

**修改位置 2**: 分享重复检查（约第1633-1635行）
- 兼容 `sharedByUsername` 和 `sharedBy` 两种字段

**修改位置 3**: `renderSharedLocations()` 去重逻辑（约第2134-2143行）
- 使用 `sharedByUsername` 或 `sharedBy` 进行去重

**修改位置 4**: WebSocket 消息处理（约第639-659行）
- 兼容新旧数据结构的去重判断

## ✅ 优势

1. **更友好的显示**: 用户看到的是昵称而不是账号名
2. **向后兼容**: 旧的分享数据依然可以正常显示
3. **逻辑不变**: 所有去重、检查逻辑依然基于账号名
4. **数据完整**: 同时保存两个字段，灵活使用

## 🧪 测试建议

1. **新分享测试**
   - 登录游戏
   - 打开社区 → 共享地图
   - 选择一个地点并分享
   - 查看分享卡片底部是否显示昵称

2. **多用户测试**
   - 用不同账号登录
   - 各自分享地点
   - 查看彼此的分享卡片
   - 确认显示的是昵称而不是账号名

3. **兼容性测试**
   - 旧的分享记录（如果有）应该依然正常显示
   - 去重逻辑正常工作
   - 不会出现同一用户多次分享同一地点

## 📝 数据结构

### 旧数据结构
```javascript
{
    code: "LOC001",
    name: "神秘山峰",
    icon: "🏔️",
    sharedBy: "xhjxhj001",  // 账号名
    date: "2025/12/8",
    timestamp: 1733650000000
}
```

### 新数据结构
```javascript
{
    code: "LOC001",
    name: "神秘山峰",
    icon: "🏔️",
    sharedBy: "xhj",              // 昵称（用于显示）✨
    sharedByUsername: "xhjxhj001", // 账号名（用于逻辑）✨
    date: "2025/12/8",
    timestamp: 1733650000000
}
```

## 🎯 影响范围

- ✅ 社区分享卡片底部显示
- ✅ 新分享通知消息（依然显示昵称）
- ✅ 去重逻辑（基于账号名）
- ✅ 重复检查（基于账号名）
- ⚠️  旧数据兼容（会使用 `sharedBy` 字段作为 fallback）

## 📌 注意事项

1. **数据迁移**: 旧的分享数据会保持原样，新分享会使用新结构
2. **兼容性**: 代码中所有地方都做了向后兼容处理
3. **服务器**: 服务器端只是转发数据，无需修改
4. **显示逻辑**: `renderSharedLocations()` 无需修改，因为直接使用 `location.sharedBy`

## 🎉 总结

这次修改让社区分享功能更加人性化，用户看到的是熟悉的昵称而不是冰冷的账号名，同时保持了所有业务逻辑的正确性和数据的完整性！

---

**版本**: v2.4.1  
**更新日期**: 2025-12-08  
**改进类型**: UX优化

