const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const lockfile = require('proper-lockfile');
const http = require('http');
const https = require('https');

// 配置端口
const HTTP_PORT = 3001;
const HTTPS_PORT = 3443;
const WS_PORT = 8080;
const WSS_PORT = 8081;  // 安全 WebSocket 端口

// 应用版本号（使用启动时间戳）
const APP_VERSION = Date.now().toString();
console.log(`📱 当前应用版本: ${APP_VERSION}`);

// SSL 证书配置（可选）
const SSL_CERT_PATH = path.join(__dirname, 'ssl', 'cert.pem');
const SSL_KEY_PATH = path.join(__dirname, 'ssl', 'key.pem');

// 检查是否有 SSL 证书
const hasSSL = fs.existsSync(SSL_CERT_PATH) && fs.existsSync(SSL_KEY_PATH);

// 静态文件处理函数
const handleStaticFiles = (req, res) => {
    // 处理版本查询接口
    if (req.url === '/version') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(JSON.stringify({ version: APP_VERSION }));
        return;
    }

    // 解析 URL，去除查询参数
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    let filePath = '.' + urlObj.pathname;

    if (filePath === './') {
        filePath = './auth.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - 文件未找到</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('服务器错误: ' + error.code, 'utf-8');
            }
        } else {
            // 如果是 HTML 文件，注入版本号并替换资源链接
            if (contentType === 'text/html') {
                let html = content.toString('utf-8');

                // 注入版本号变量
                const versionScript = `<script>window.APP_VERSION = "${APP_VERSION}";</script>`;
                if (html.includes('<head>')) {
                    html = html.replace('<head>', '<head>\n    ' + versionScript);
                } else {
                    html = versionScript + html;
                }

                // 替换资源链接，加上版本号 (只替换本地 js 和 css)
                html = html.replace(/(src|href)=["']([^"']+\.(js|css))["']/g, (match, attr, url) => {
                    // 忽略已经是绝对路径的 (http/https)
                    if (url.startsWith('http') || url.startsWith('//')) return match;
                    return `${attr}="${url}?v=${APP_VERSION}"`;
                });

                // 设置响应头，禁止缓存 HTML
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                res.end(html, 'utf-8');
            } else {
            // 其他静态资源
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        }
    });
};

// 创建 HTTP 服务器
const httpServer = http.createServer(handleStaticFiles);

// HTTP 服务器监听所有网络接口
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP 服务器已启动: http://0.0.0.0:${HTTP_PORT}`);
    
    // 尝试获取本机 IP 地址
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                addresses.push(net.address);
            }
        }
    }
    if (addresses.length > 0) {
        console.log(`💡 推荐访问地址 (HTTP):`);
        addresses.forEach(addr => {
            console.log(`   http://${addr}:${HTTP_PORT}`);
        });
    }
});

// 如果有 SSL 证书，创建 HTTPS 服务器
let httpsServer;
if (hasSSL) {
    try {
        const sslOptions = {
            key: fs.readFileSync(SSL_KEY_PATH),
            cert: fs.readFileSync(SSL_CERT_PATH)
        };
        
        httpsServer = https.createServer(sslOptions, handleStaticFiles);
        
        httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
            console.log(`🔒 HTTPS 服务器已启动: https://0.0.0.0:${HTTPS_PORT}`);
            
            const os = require('os');
            const networkInterfaces = os.networkInterfaces();
            const addresses = [];
            for (const name of Object.keys(networkInterfaces)) {
                for (const net of networkInterfaces[name]) {
                    if (net.family === 'IPv4' && !net.internal) {
                        addresses.push(net.address);
                    }
                }
            }
            if (addresses.length > 0) {
                console.log(`💡 推荐访问地址 (HTTPS):`);
                addresses.forEach(addr => {
                    console.log(`   https://${addr}:${HTTPS_PORT}`);
                });
            }
        });
    } catch (error) {
        console.error('⚠️  HTTPS 服务器启动失败:', error.message);
    }
}

// 创建 WebSocket 服务器（用于 ws://）
const wsHttpServer = http.createServer((req, res) => {
    res.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('此端口仅用于 WebSocket 连接');
});

const wss = new WebSocket.Server({
    noServer: true
});

wsHttpServer.listen(WS_PORT, '0.0.0.0', () => {
    console.log(`🔌 WebSocket 服务器已启动 (ws://): 端口 ${WS_PORT}`);
});

wsHttpServer.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// 如果有 SSL 证书，创建安全 WebSocket 服务器（用于 wss://）
if (hasSSL) {
    try {
        const sslOptions = {
            key: fs.readFileSync(SSL_KEY_PATH),
            cert: fs.readFileSync(SSL_CERT_PATH)
        };
        
        const wssHttpsServer = https.createServer(sslOptions, (req, res) => {
            res.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('此端口仅用于安全 WebSocket 连接');
        });
        
        wssHttpsServer.listen(WSS_PORT, '0.0.0.0', () => {
            console.log(`🔒 安全 WebSocket 服务器已启动 (wss://): 端口 ${WSS_PORT}`);
        });
        
        wssHttpsServer.on('upgrade', (request, socket, head) => {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        });
    } catch (error) {
        console.error('⚠️  安全 WebSocket 服务器启动失败:', error.message);
    }
}

if (!hasSSL) {
    console.log(`\n⚠️  未找到 SSL 证书，无法启用 HTTPS/WSS`);
    console.log(`💡 运行以下命令生成自签名证书:`);
    console.log(`   node generate-ssl-cert.js\n`);
}

// 在线用户管理
const onlineUsers = new Map(); // username -> { ws, nickname, username, isGuest, sessionId }

// 会话管理（用于验证身份）
const sessions = new Map(); // sessionId -> { username, createdAt }
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24小时

// 历史分享
const sharedHistory = [];
const HISTORY_LIMIT = 20;

// 用户数据存储目录
const USER_DATA_DIR = path.join(__dirname, 'user_data');
const ACCOUNTS_FILE = path.join(USER_DATA_DIR, 'accounts.json');

// 确保数据目录存在
if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR);
}

// 初始化账号文件
if (!fs.existsSync(ACCOUNTS_FILE)) {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify({}, null, 2));
}

// ============ 输入验证函数 ============

function validateUsername(username) {
    if (!username || typeof username !== 'string') return false;
    if (username.length < 4 || username.length > 20) return false;
    // 只允许字母、数字、下划线
    return /^[a-zA-Z0-9_]+$/.test(username);
}

function validateNickname(nickname) {
    if (!nickname || typeof nickname !== 'string') return false;
    if (nickname.length < 2 || nickname.length > 10) return false;
    return true;
}

function validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    return password.length >= 6;
}

function sanitizeGameState(gameState) {
    // 验证并清理游戏状态数据，防止注入
    if (!gameState || typeof gameState !== 'object') return null;

    // 只保留合法的字段
    const validState = {
        sunlight: Number(gameState.sunlight) || 0,
        starlight: Number(gameState.starlight) || 0,
        characterState: ['home', 'traveling', 'returned'].includes(gameState.characterState)
            ? gameState.characterState : 'home',
        travelStartTime: gameState.travelStartTime ? Number(gameState.travelStartTime) : null,
        travelDuration: Number(gameState.travelDuration) || 0,
        selectedItems: Array.isArray(gameState.selectedItems) ? gameState.selectedItems : [],
        photos: Array.isArray(gameState.photos) ? gameState.photos : [],
        souvenirs: Array.isArray(gameState.souvenirs) ? gameState.souvenirs : [],
        dreams: Array.isArray(gameState.dreams) ? gameState.dreams : [],
        visitors: Array.isArray(gameState.visitors) ? gameState.visitors : [],
        sharedLocations: Array.isArray(gameState.sharedLocations) ? gameState.sharedLocations : [],
        lastDreamDate: gameState.lastDreamDate || null,
        isNightMode: Boolean(gameState.isNightMode),
        sunlightCooldown: Number(gameState.sunlightCooldown) || 0,
        starlightCooldown: Number(gameState.starlightCooldown) || 0,
        friends: Array.isArray(gameState.friends) ? gameState.friends : [],
        friendRequests: Array.isArray(gameState.friendRequests) ? gameState.friendRequests : []
    };

    return validState;
}

// ============ 账号管理函数 ============

// 读取所有账号（带文件锁）
async function loadAccounts() {
    let release;
    try {
        release = await lockfile.lock(ACCOUNTS_FILE, { retries: 5, stale: 5000 });
        const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error loading accounts:', e);
        return {};
    } finally {
        if (release) await release();
    }
}

// 保存所有账号（带文件锁）
async function saveAccounts(accounts) {
    let release;
    try {
        release = await lockfile.lock(ACCOUNTS_FILE, { retries: 5, stale: 5000 });
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving accounts:', e);
        return false;
    } finally {
        if (release) await release();
    }
}

// 注册新用户
async function registerUser(username, nickname, password) {
    // 验证输入
    if (!validateUsername(username)) {
        return { success: false, error: '用户名格式不正确（4-20个字符，只能包含字母数字下划线）' };
    }
    if (!validateNickname(nickname)) {
        return { success: false, error: '昵称格式不正确（2-10个字符）' };
    }
    if (!validatePassword(password)) {
        return { success: false, error: '密码至少需要6个字符' };
    }

    const accounts = await loadAccounts();

    // 检查用户名是否已存在
    if (accounts[username]) {
        return { success: false, error: '该用户名已被注册' };
    }

    try {
        // 使用bcrypt加密密码（自动加盐）
        const hashedPassword = await bcrypt.hash(password, 10);

        accounts[username] = {
            username: username,
            nickname: nickname,
            password: hashedPassword,
            createdAt: Date.now()
        };

        const saved = await saveAccounts(accounts);
        if (saved) {
            return { success: true };
        } else {
            return { success: false, error: '保存账号失败' };
        }
    } catch (e) {
        console.error('Register error:', e);
        return { success: false, error: '注册失败' };
    }
}

// 验证登录
async function authenticateUser(username, password) {
    if (!validateUsername(username)) {
        return { success: false, error: '用户名格式不正确' };
    }

    const accounts = await loadAccounts();
    const account = accounts[username];

    if (!account) {
        return { success: false, error: '用户名不存在' };
    }

    try {
        // 使用bcrypt验证密码
        const match = await bcrypt.compare(password, account.password);
        if (match) {
            // 生成会话ID
            const sessionId = generateSessionId();
            sessions.set(sessionId, {
                username: username,
                createdAt: Date.now()
            });

            return {
                success: true,
                nickname: account.nickname,
                sessionId: sessionId
            };
        } else {
            return { success: false, error: '密码错误' };
        }
    } catch (e) {
        console.error('Authentication error:', e);
        return { success: false, error: '登录失败' };
    }
}

// 生成会话ID
function generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 验证会话
function validateSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    // 检查会话是否过期
    if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
        sessions.delete(sessionId);
        return null;
    }

    return session.username;
}

// 清理过期会话
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.createdAt > SESSION_TIMEOUT) {
            sessions.delete(sessionId);
        }
    }
}, 60 * 60 * 1000); // 每小时清理一次

// ============ 游戏数据管理函数 ============

// 读取用户游戏数据（带文件锁）
async function loadUserData(username) {
    const filePath = path.join(USER_DATA_DIR, `${username}.json`);
    let release;
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }

        release = await lockfile.lock(filePath, { retries: 5 });
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`Error loading user data for ${username}:`, e);
        return null;
    } finally {
        if (release) await release();
    }
}

// 保存用户游戏数据（带文件锁）
async function saveUserData(username, gameState) {
    const filePath = path.join(USER_DATA_DIR, `${username}.json`);
    let release;
    try {
        // 清理和验证游戏状态
        const sanitizedState = sanitizeGameState(gameState);
        if (!sanitizedState) {
            console.error('Invalid game state');
            return false;
        }

        const data = {
            username: username,
            gameState: sanitizedState,
            lastLogout: Date.now()
        };

        // 如果文件存在，使用锁；如果不存在，直接创建
        if (fs.existsSync(filePath)) {
            release = await lockfile.lock(filePath, { retries: 5, stale: 10000 });
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`Error saving user data for ${username}:`, e);
        return false;
    } finally {
        if (release) await release();
    }
}

// 计算离线收益
function calculateOfflineRewards(lastLogout) {
    const now = Date.now();
    const offlineTime = now - lastLogout; // 毫秒
    const offlineHours = offlineTime / (1000 * 60 * 60); // 小时

    // 每小时自动生成资源
    const sunlightPerHour = 20;
    const starlightPerHour = 20;

    // 最多计算24小时
    const cappedHours = Math.min(offlineHours, 24);

    return {
        sunlight: Math.floor(cappedHours * sunlightPerHour),
        starlight: Math.floor(cappedHours * starlightPerHour),
        offlineTime: offlineTime,
        offlineHours: cappedHours
    };
}

// ============ WebSocket 处理 ============

wss.on('connection', (ws) => {
    console.log('🔌 New client connected');
    let currentUser = null;
    let isAuthenticated = false;

    ws.on('message', async (message) => {
        try {
            const parsed = JSON.parse(message);
            console.log('📥 Received:', parsed.type, parsed.username || parsed.guestId || '');

            // ========== 注册 ==========
            if (parsed.type === 'register') {
                const result = await registerUser(
                    parsed.username,
                    parsed.nickname,
                    parsed.password
                );

                ws.send(JSON.stringify({
                    type: 'register_result',
                    success: result.success,
                    error: result.error
                }));
            }

            // ========== 登录 ==========
            else if (parsed.type === 'login') {
                const result = await authenticateUser(
                    parsed.username,
                    parsed.password
                );

                if (result.success) {
                    // 认证成功
                    isAuthenticated = true;
                    currentUser = {
                        username: parsed.username,
                        nickname: result.nickname,
                        isGuest: false,
                        ws: ws,
                        sessionId: result.sessionId
                    };
                    onlineUsers.set(parsed.username, currentUser);

                    // 加载用户数据
                    const userData = await loadUserData(parsed.username);
                    let offlineRewards = null;

                    if (userData) {
                        // 计算离线收益
                        offlineRewards = calculateOfflineRewards(userData.lastLogout);
                    }

                    ws.send(JSON.stringify({
                        type: 'login_result',
                        success: true,
                        sessionId: result.sessionId,
                        nickname: result.nickname,
                        userData: userData,
                        offlineRewards: offlineRewards
                    }));

                    // 发送历史数据
                    ws.send(JSON.stringify({
                        type: 'history',
                        data: sharedHistory
                    }));

                    // 广播在线用户列表更新
                    broadcastOnlineUsers();
                    console.log(`User ${result.nickname} logged in`);
                } else {
                    ws.send(JSON.stringify({
                        type: 'login_result',
                        success: false,
                        error: result.error
                    }));
                }
            }

            // ========== 访客登录 ==========
            else if (parsed.type === 'guest_login') {
                const guestId = parsed.guestId || `GUEST-${Math.floor(Math.random() * 1000000)}`;
                const nickname = parsed.nickname || `访客${guestId.slice(-5)}`;

                isAuthenticated = true; // 访客也需要认证
                currentUser = {
                    username: guestId,
                    nickname: nickname,
                    isGuest: true,
                    ws: ws,
                    sessionId: generateSessionId()
                };
                onlineUsers.set(guestId, currentUser);

                ws.send(JSON.stringify({
                    type: 'guest_login_result',
                    success: true,
                    guestId: guestId,
                    nickname: nickname
                }));

                // 发送历史数据
                ws.send(JSON.stringify({
                    type: 'history',
                    data: sharedHistory
                }));

                broadcastOnlineUsers();
                console.log(`Guest ${nickname} connected`);
            }

            // ========== 会话认证（用于游戏页面重连） ==========
            else if (parsed.type === 'session_auth') {
                console.log(`📝 收到会话认证请求, sessionId: ${parsed.sessionId.substring(0, 10)}...`);
                const username = validateSession(parsed.sessionId);

                if (username) {
                    console.log(`✅ 会话有效, 用户: ${username}`);
                    // 会话有效，加载用户账号信息
                    const accounts = await loadAccounts();
                    const account = accounts[username];

                    if (account) {
                        // 检查是否有旧连接（多点登录）
                        const existingUser = onlineUsers.get(username);
                        if (existingUser && existingUser.ws !== ws) {
                            console.log(`⚠️  检测到多点登录，关闭旧连接: ${username}`);
                            try {
                                // 通知旧连接
                                existingUser.ws.send(JSON.stringify({
                                    type: 'force_logout',
                                    reason: '您的账号在其他设备登录'
                                }));
                                // 关闭旧连接
                                existingUser.ws.close(1000, 'Multi-login detected');
                            } catch (e) {
                                console.error('关闭旧连接失败:', e);
                            }
                        }
                        
                        isAuthenticated = true;
                        currentUser = {
                            username: username,
                            nickname: account.nickname,
                            isGuest: false,
                            ws: ws,
                            sessionId: parsed.sessionId
                        };
                        onlineUsers.set(username, currentUser);
                        console.log(`👤 用户 ${account.nickname} 已上线 (${onlineUsers.size} 人在线)`);

                        // 加载用户数据
                        console.log(`📂 正在加载用户数据: ${username}`);
                        const userData = await loadUserData(username);
                        let offlineRewards = null;

                        if (userData) {
                            // 计算离线收益
                            offlineRewards = calculateOfflineRewards(userData.lastLogout);
                            if (offlineRewards) {
                                console.log(`💰 计算离线收益:`, offlineRewards);
                            }
                        } else {
                            console.log(`⚠️  用户数据为空，将返回默认数据`);
                        }

                        const response = {
                            type: 'session_auth_result',
                            success: true,
                            nickname: account.nickname,
                            userData: userData,
                            offlineRewards: offlineRewards
                        };
                        console.log(`📤 发送认证成功响应给 ${username}`);
                        ws.send(JSON.stringify(response));

                        // 发送历史数据
                        ws.send(JSON.stringify({
                            type: 'history',
                            data: sharedHistory
                        }));

                        broadcastOnlineUsers();
                        console.log(`✅ 用户 ${account.nickname} 重新连接成功`);
                    } else {
                        console.log(`❌ 账号不存在: ${username}`);
                        ws.send(JSON.stringify({
                            type: 'session_auth_result',
                            success: false,
                            error: '用户不存在'
                        }));
                    }
                } else {
                    console.log(`❌ 会话无效或已过期: ${parsed.sessionId.substring(0, 10)}...`);
                    ws.send(JSON.stringify({
                        type: 'session_auth_result',
                        success: false,
                        error: '会话已过期，请重新登录'
                    }));
                }
            }

            // ========== 以下操作需要认证 ==========
            else if (!isAuthenticated || !currentUser) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: '未认证，请先登录'
                }));
                return;
            }

            // 保存游戏状态
            else if (parsed.type === 'save_game') {
                if (currentUser && !currentUser.isGuest) {
                    const success = await saveUserData(currentUser.username, parsed.gameState);
                    ws.send(JSON.stringify({
                        type: 'save_result',
                        success: success
                    }));
                } else {
                    // 访客不保存数据
                    ws.send(JSON.stringify({
                        type: 'save_result',
                        success: false,
                        message: '访客模式不保存数据'
                    }));
                }
            }

            // 分享地点
            else if (parsed.type === 'share_location') {
                const shareData = {
                    ...parsed,
                    timestamp: Date.now()
                };
                sharedHistory.push(shareData);
                if (sharedHistory.length > HISTORY_LIMIT) {
                    sharedHistory.shift();
                }
                broadcast(shareData);
            }

            // 请求在线用户列表
            else if (parsed.type === 'get_online_users') {
                sendOnlineUsers(ws);
            }

            // 请求访问其他玩家的数据
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

            // 分享游戏状态（用于访问）
            else if (parsed.type === 'share_game_state') {
                ws.send(JSON.stringify({
                    type: 'game_state_response',
                    state: parsed.state
                }));
            }

            // 好友申请
            else if (parsed.type === 'friend_request') {
                const targetUser = onlineUsers.get(parsed.targetUsername);
                if (targetUser) {
                    targetUser.ws.send(JSON.stringify({
                        type: 'friend_request',
                        from: {
                            username: currentUser.username,
                            nickname: currentUser.nickname
                        }
                    }));
                }
            }

            // 接受好友申请
            else if (parsed.type === 'friend_accept') {
                const targetUser = onlineUsers.get(parsed.targetUsername);
                if (targetUser) {
                    targetUser.ws.send(JSON.stringify({
                        type: 'friend_accepted',
                        friend: {
                            username: currentUser.username,
                            nickname: currentUser.nickname
                        }
                    }));
                }
            }

            // 好友赠送
            else if (parsed.type === 'send_gift') {
                const targetUser = onlineUsers.get(parsed.targetUsername);
                if (targetUser) {
                    targetUser.ws.send(JSON.stringify({
                        type: 'receive_gift',
                        from: {
                            username: currentUser.username,
                            nickname: currentUser.nickname
                        },
                        gift: parsed.gift
                    }));

                    // 记录日志
                    let giftDesc = '';
                    if (parsed.gift.type === 'resource') {
                        giftDesc = `${parsed.gift.amount} ${parsed.gift.resourceType === 'sunlight' ? '阳光露珠' : '星光'}`;
                    } else if (parsed.gift.type === 'item') {
                        giftDesc = `${parsed.gift.category === 'photo' ? '照片' : '纪念品'}`;
                    }
                    console.log(`🎁 ${currentUser.nickname} 向 ${targetUser.nickname} 赠送了 ${giftDesc}`);
                }
            }
            // Ping/Pong 心跳
            else if (parsed.type === 'ping') {
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: Date.now()
                }));
            }

        } catch (e) {
            console.error('Error parsing message:', e);
            ws.send(JSON.stringify({
                type: 'error',
                message: '消息格式错误'
            }));
        }
    });

    ws.on('close', () => {
        if (currentUser) {
            console.log(`User ${currentUser.nickname} disconnected`);
            onlineUsers.delete(currentUser.username);
            // 注意：不删除session，让它自然过期
            // 这样用户可以重新连接而无需重新登录
            broadcastOnlineUsers();
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function broadcast(data) {
    const message = JSON.stringify(data);
    onlineUsers.forEach((user) => {
        if (user.ws.readyState === WebSocket.OPEN) {
            user.ws.send(message);
        }
    });
}

function broadcastOnlineUsers() {
    const userList = Array.from(onlineUsers.values()).map(u => ({
        username: u.username,
        nickname: u.nickname,
        isGuest: u.isGuest
    }));

    console.log('📢 广播在线用户列表，共', userList.length, '人:',
        userList.map(u => u.nickname).join(', '));

    const message = JSON.stringify({
        type: 'online_users',
        users: userList
    });

    onlineUsers.forEach((user) => {
        if (user.ws.readyState === WebSocket.OPEN) {
            user.ws.send(message);
        }
    });
}

function sendOnlineUsers(ws) {
    const userList = Array.from(onlineUsers.values()).map(u => ({
        username: u.username,
        nickname: u.nickname,
        isGuest: u.isGuest
    }));

    ws.send(JSON.stringify({
        type: 'online_users',
        users: userList
    }));
}

console.log('🔌 WebSocket 服务器已启动: ws://0.0.0.0:8080');
console.log(`📁 用户数据目录: ${USER_DATA_DIR}`);
console.log(`👥 账号文件: ${ACCOUNTS_FILE}`);
console.log('\n✅ 服务器启动完成！');
console.log('🎮 开始游戏: 在浏览器中打开上面显示的地址\n');
