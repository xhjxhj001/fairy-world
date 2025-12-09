# 会话过期自动修复补丁

## 📋 问题描述

用户长时间未访问页面后，服务器端的会话（Session）过期，但客户端本地缓存（LocalStorage）中仍保存着旧的会话ID。
当用户刷新页面时，客户端尝试使用过期的会话ID进行重连，服务器拒绝认证，但客户端此前没有正确清除本地无效缓存，导致死循环，用户必须手动清除浏览器缓存才能解决。

## 🛠️ 修复方案

### 1. 认证失败立即清除缓存

在 `game.js` 的 WebSocket 消息处理逻辑中，当收到服务器返回的 `session_auth_result: false`（认证失败）消息时：

- **立即** 执行 `localStorage.removeItem('currentUser')`，确保后续操作不会再读取到无效凭证。
- 设置 `isIntentionalClose = true`，阻止 WebSocket 断开后的自动重连机制，避免干扰跳转逻辑。
- 显示"认证失败，请重新登录"提示。
- 延迟 2 秒后跳转回登录页。

```javascript
// 修改前
setTimeout(() => {
    localStorage.removeItem('currentUser'); // 延迟清除，可能导致竞态条件
    window.location.href = 'auth.html';
}, 2000);

// 修改后
localStorage.removeItem('currentUser'); // 立即清除！
this.isIntentionalClose = true; // 阻止自动重连
setTimeout(() => {
    window.location.href = 'auth.html';
}, 2000);
```

### 2. 本地数据完整性保护

在 `initWebSocket` 初始化连接时，增加了对 `localStorage` 数据的完整性检查：

- 使用 `try-catch` 包裹 `JSON.parse`。
- 如果数据损坏（解析错误），立即清除缓存并跳转到登录页。

## ✅ 预期效果

- **场景**: 用户长时间离开后回来刷新页面。
- **行为**: 
  1. 页面加载，尝试连接。
  2. 服务器返回"会话已过期"。
  3. 客户端提示"认证失败"，并**立即**自动清除无效缓存。
  4. 自动跳转到登录页。
  5. 用户重新登录，一切正常。
- **不再需要用户手动清除浏览器缓存！**

## 📄 修改文件

- `game.js`

---
**修复日期**: 2025-12-08
**补丁版本**: v2.4.2

