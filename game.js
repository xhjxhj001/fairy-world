// 游戏核心类
class IdleGame {
    constructor() {
        this.setupViewportHeightFix();

        this.activePanel = null;

        this.gameState = {
            sunlight: 0,
            starlight: 0,
            characterState: 'home', // home, traveling, returned
            travelStartTime: null,
            travelDuration: 0,
            selectedItems: [],
            photos: [],
            souvenirs: [],
            dreams: [],
            visitors: [],
            sharedLocations: [],
            lastDreamDate: null,
            isNightMode: false,
            sunlightCooldown: 0, // 阳光冷却时间（毫秒）
            starlightCooldown: 0,  // 星光冷却时间（毫秒）
            friends: [], // 好友列表 [{username, nickname, addedAt}]
            friendRequests: [] // 好友请求 [{from: {username, nickname}, timestamp}]
        };

        // 获取当前登录用户
        const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
        this.currentUser = {
            username: userData.username,
            nickname: userData.nickname,
            isGuest: userData.isGuest || false,
            sessionId: userData.sessionId  // 保存 sessionId
        };

        // 访问模式相关
        this.isVisiting = false;
        this.visitingUser = null;
        this.visitingGameState = null;

        // 在线用户列表
        this.onlineUsers = [];

        // WebSocket 相关
        this.ws = null;
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 2000; // 2秒
        this.isIntentionalClose = false; // 是否主动关闭
        this.authTimeout = null; // 认证超时定时器
        this.isAuthenticated = false; // 是否已认证
        this.authFailureCount = 0; // 认证失败计数
        this.maxAuthFailures = 3; // 最大认证失败次数
        
        // 音乐系统
        this.musicEnabled = localStorage.getItem('musicEnabled') === 'true'; // 默认静音
        this.currentBgm = null;
        this.sleepMusic = null;
        this.sleepMusicTimer = null;
        this.currentBgmIndex = 0;
        
        // 音乐文件路径
        this.musicTracks = {
            day: [
                'assets/music/day-bgm-1.mp3',
                'assets/music/day-bgm-2.mp3'
            ],
            night: [
                'assets/music/night-1.mp3',
                'assets/music/night-2.mp3',
                'assets/music/night-3.mp3'
            ],
            sleep: [
                'assets/music/sleep-1.mp3',
                'assets/music/sleep-2.mp3',
                'assets/music/sleep-3.mp3'
            ]
        };

        this.items = {
            food: [
                { id: 'apple', name: '苹果', icon: '🍎', cost: { sunlight: 10 }, effect: 'normal', desc: '脆甜的红苹果' },
                { id: 'honey', name: '蜂蜜', icon: '🍯', cost: { sunlight: 20 }, effect: 'friend', desc: '香甜的野生蜂蜜' },
                { id: 'berry', name: '浆果', icon: '🫐', cost: { starlight: 15 }, effect: 'night', desc: '夜晚采摘的蓝莓' },
                { id: 'peach', name: '水蜜桃', icon: '🍑', cost: { sunlight: 15 }, effect: 'normal', desc: '多汁的水蜜桃' },
                { id: 'grape', name: '葡萄', icon: '🍇', cost: { sunlight: 12 }, effect: 'normal', desc: '一串紫色葡萄' },
                { id: 'watermelon', name: '西瓜', icon: '🍉', cost: { sunlight: 25 }, effect: 'friend', desc: '消暑的大西瓜' },
                { id: 'strawberry', name: '草莓', icon: '🍓', cost: { sunlight: 18 }, effect: 'beauty', desc: '鲜红的草莓' },
                { id: 'cake', name: '蛋糕', icon: '🍰', cost: { sunlight: 35 }, effect: 'party', desc: '庆祝用的蛋糕' },
                { id: 'cookie', name: '饼干', icon: '🍪', cost: { sunlight: 8 }, effect: 'normal', desc: '香脆的小饼干' },
                { id: 'donut', name: '甜甜圈', icon: '🍩', cost: { sunlight: 16 }, effect: 'friend', desc: '甜蜜的圈圈' },
                { id: 'candy', name: '糖果', icon: '🍬', cost: { sunlight: 5 }, effect: 'normal', desc: '五彩的糖果' },
                { id: 'icecream', name: '冰淇淋', icon: '🍦', cost: { sunlight: 22 }, effect: 'cool', desc: '清凉的冰淇淋' },
                { id: 'mooncake', name: '月饼', icon: '🥮', cost: { starlight: 30 }, effect: 'night', desc: '中秋的月饼' },
                { id: 'chestnut', name: '栗子', icon: '🌰', cost: { sunlight: 14 }, effect: 'normal', desc: '香甜的糖炒栗子' },
                { id: 'mushroom', name: '蘑菇', icon: '🍄', cost: { starlight: 20 }, effect: 'magic', desc: '森林里的神秘蘑菇' }
            ],
            toy: [
                { id: 'ball', name: '小球', icon: '⚽', cost: { sunlight: 15 }, effect: 'normal', desc: '圆滚滚的小球' },
                { id: 'kite', name: '风筝', icon: '🪁', cost: { sunlight: 25 }, effect: 'sky', desc: '在空中飞舞的风筝' },
                { id: 'crystal', name: '水晶球', icon: '💎', cost: { starlight: 30 }, effect: 'magic', desc: '闪闪发光的水晶' },
                { id: 'balloon', name: '气球', icon: '🎈', cost: { sunlight: 12 }, effect: 'happy', desc: '五颜六色的气球' },
                { id: 'drum', name: '小鼓', icon: '🥁', cost: { sunlight: 20 }, effect: 'music', desc: '咚咚作响的小鼓' },
                { id: 'guitar', name: '吉他', icon: '🎸', cost: { sunlight: 35 }, effect: 'music', desc: '动听的弦乐器' },
                { id: 'dice', name: '骰子', icon: '🎲', cost: { sunlight: 10 }, effect: 'luck', desc: '幸运的骰子' },
                { id: 'puzzle', name: '拼图', icon: '🧩', cost: { sunlight: 18 }, effect: 'smart', desc: '益智拼图游戏' },
                { id: 'yoyo', name: '悠悠球', icon: '🪀', cost: { sunlight: 16 }, effect: 'skill', desc: '上下翻飞的悠悠球' },
                { id: 'blocks', name: '积木', icon: '🧱', cost: { sunlight: 22 }, effect: 'build', desc: '搭建梦想的积木' },
                { id: 'telescope', name: '望远镜', icon: '🔭', cost: { starlight: 40 }, effect: 'star', desc: '观星用的望远镜' },
                { id: 'compass', name: '指南针', icon: '🧭', cost: { sunlight: 28 }, effect: 'guide', desc: '指引方向的指南针' },
                { id: 'hourglass', name: '沙漏', icon: '⏳', cost: { starlight: 25 }, effect: 'time', desc: '流动的时间沙漏' },
                { id: 'magnet', name: '磁铁', icon: '🧲', cost: { sunlight: 14 }, effect: 'attract', desc: '神奇的磁铁' },
                { id: 'firework', name: '烟花', icon: '🎆', cost: { starlight: 45 }, effect: 'celebrate', desc: '璀璨的烟花' }
            ],
            charm: [
                { id: 'leaf', name: '幸运叶', icon: '🍀', cost: { sunlight: 20 }, effect: 'luck', desc: '四叶草带来好运' },
                { id: 'star', name: '流星', icon: '⭐', cost: { starlight: 25 }, effect: 'night', desc: '许愿的流星' },
                { id: 'flower', name: '樱花', icon: '🌸', cost: { sunlight: 15 }, effect: 'beauty', desc: '粉色的樱花花瓣' },
                { id: 'feather', name: '羽毛', icon: '🪶', cost: { sunlight: 18 }, effect: 'light', desc: '轻盈的白羽毛' },
                { id: 'shell', name: '贝壳', icon: '🐚', cost: { sunlight: 22 }, effect: 'ocean', desc: '海洋的礼物' },
                { id: 'rainbow', name: '彩虹', icon: '🌈', cost: { sunlight: 35 }, effect: 'hope', desc: '雨后的彩虹' },
                { id: 'moon', name: '月亮', icon: '🌙', cost: { starlight: 30 }, effect: 'dream', desc: '弯弯的月牙' },
                { id: 'sun', name: '太阳', icon: '☀️', cost: { sunlight: 30 }, effect: 'energy', desc: '温暖的阳光' },
                { id: 'snowflake', name: '雪花', icon: '❄️', cost: { starlight: 20 }, effect: 'pure', desc: '纯洁的雪花' },
                { id: 'butterfly', name: '蝴蝶', icon: '🦋', cost: { sunlight: 16 }, effect: 'transform', desc: '翩翩起舞的蝴蝶' },
                { id: 'dragonfly', name: '蜻蜓', icon: '🪲', cost: { sunlight: 14 }, effect: 'agile', desc: '灵活的蜻蜓' },
                { id: 'bee', name: '蜜蜂', icon: '🐝', cost: { sunlight: 12 }, effect: 'diligent', desc: '勤劳的小蜜蜂' },
                { id: 'sparkle', name: '星光', icon: '✨', cost: { starlight: 22 }, effect: 'magic', desc: '闪烁的星光' },
                { id: 'comet', name: '彗星', icon: '☄️', cost: { starlight: 35 }, effect: 'rare', desc: '罕见的彗星' },
                { id: 'key', name: '钥匙', icon: '🔑', cost: { starlight: 28 }, effect: 'unlock', desc: '神秘的金钥匙' }
            ]
        };

        this.locations = [
            { code: 'FOREST-001', name: '神秘森林', icon: '🌲', description: '充满魔法的古老森林，树木会在月光下低语' },
            { code: 'LAKE-002', name: '彩虹湖', icon: '🌈', description: '倒映着彩虹的宁静湖泊，湖水有七种颜色' },
            { code: 'MOUNTAIN-003', name: '星空山', icon: '⛰️', description: '可以触摸星星的高山，山顶常年被星光笼罩' },
            { code: 'GARDEN-004', name: '梦境花园', icon: '🌺', description: '开满奇花异草的花园，每朵花都藏着一个梦' },
            { code: 'BEACH-005', name: '月光海滩', icon: '🏖️', description: '夜晚会发光的海滩，沙子在月光下闪闪发亮' },
            { code: 'DESERT-006', name: '沙漠绿洲', icon: '🏜️', description: '沙漠深处的绿洲，传说藏着宝藏' },
            { code: 'SNOW-007', name: '极光雪原', icon: '🌌', description: '能看到极光的雪原，冰雪晶莹剔透' },
            { code: 'VOLCANO-008', name: '火山口', icon: '🌋', description: '休眠的火山口，温泉遍布' },
            { code: 'BAMBOO-009', name: '竹林秘境', icon: '🎋', description: '静谧的竹林，风吹过会奏响天籁' },
            { code: 'WATERFALL-010', name: '彩虹瀑布', icon: '💦', description: '巨大的瀑布，水雾中常现彩虹' },
            { code: 'CAVE-011', name: '水晶洞窟', icon: '💎', description: '布满水晶的洞穴，折射出梦幻光芒' },
            { code: 'ISLAND-012', name: '浮空岛', icon: '🏝️', description: '漂浮在云端的岛屿，可以俯瞰大地' },
            { code: 'CASTLE-013', name: '云端城堡', icon: '🏰', description: '建在云上的城堡，住着友善的精灵' },
            { code: 'BRIDGE-014', name: '天桥', icon: '🌉', description: '连接天地的彩虹桥，传说通往仙境' },
            { code: 'VALLEY-015', name: '樱花谷', icon: '🌸', description: '四季都有樱花的山谷，花瓣随风飘舞' },
            { code: 'PRAIRIE-016', name: '星星草原', icon: '🌾', description: '开满星形野花的草原，夜晚如星海' },
            { code: 'LIGHTHOUSE-017', name: '灯塔小岛', icon: '🗼', description: '孤独的灯塔守护着航海者的梦想' },
            { code: 'RUINS-018', name: '古代遗迹', icon: '🗿', description: '神秘的石像群，似乎藏着远古的秘密' }
        ];

        this.init();

        // 启动时检查一次更新
        this.checkUpdate();
        // 自动更新检查定时器
        this.checkUpdateTimer = setInterval(() => this.checkUpdate(), 60000); // 每分钟检查
    }

    // 检查更新
    async checkUpdate() {
        try {
            // 如果没有注入 APP_VERSION，可能是本地开发或旧版页面，跳过检查
            if (!window.APP_VERSION) return;

            const response = await fetch('/version');
            if (response.ok) {
                const data = await response.json();
                const serverVersion = data.version;
                
                if (serverVersion && window.APP_VERSION !== serverVersion) {
                    console.log(`📱 发现新版本: ${serverVersion} (当前: ${window.APP_VERSION})`);
                    
                    // 提示用户刷新
                    // 使用 confirm 可能打断游戏体验，但在 idle game 中通常可以接受
                    // 或者可以只显示一个通知 UI，让用户自己点击刷新
                    const notification = document.getElementById('notification');
                    const notificationText = document.getElementById('notification-text');
                    
                    if (notification && notificationText) {
                        notificationText.innerHTML = `
                            发现新版本！<br>
                            <button onclick="window.location.reload(true)" style="margin-top:5px;padding:4px 8px;cursor:pointer;">立即刷新</button>
                        `;
                        notification.style.display = 'block';
                        // 不自动隐藏，直到用户刷新
                    } else {
                        // 备用方案
                        if (confirm('游戏已发布新版本，是否刷新以获取最新内容？')) {
                             window.location.reload(true);
                        }
                    }
                }
            }
        } catch (e) {
            // 忽略网络错误，可能是离线状态
            // console.error('检查更新失败:', e);
        }
    }

    init() {
        // 🔒 检查登录状态
        const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
        console.log('🔐 检查登录状态:', userData);
        
        // 如果没有用户数据，跳转到登录页
        if (!userData.username) {
            console.log('❌ 未登录，跳转到登录页');
            window.location.href = 'auth.html';
            return;
        }
        
        console.log('✅ 已登录:', userData.nickname, '(', userData.username, ')');
        
        // 显示用户信息
        const nicknameElement = document.getElementById('user-nickname');
        if (nicknameElement) {
            nicknameElement.textContent = this.currentUser.nickname;
        } else {
            console.warn('⚠️  user-nickname 元素未找到');
        }
        
        this.loadGameState();
        
        // 首先检查并设置时间模式（在UI更新前）
        const hour = new Date().getHours();
        this.gameState.isNightMode = hour >= 19 || hour < 7;
        
        this.setupEventListeners();
        this.startGameLoop();
        this.updateUI();
        this.updateResourceDisplay(); // 初始化资源显示状态
        
        // 应用初始时间模式
        this.updateTimeMode();
        
        // 定期检查时间变化
        this.checkTimeOfDay();
        
        this.startResourceGeneration();
        this.initWebSocket();
        this.startAutoSave(); // 启动自动保存
        this.initMusicSystem(); // 初始化音乐系统
        
        // 延迟显示音乐引导，确保页面已完全加载
        setTimeout(() => {
            this.showMusicGuide();
        }, 1000);
        
        // 页面关闭前保存
        window.addEventListener('beforeunload', () => {
            this.saveGameState();
        });
        
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
        
        // 监听网络状态变化
        window.addEventListener('online', () => {
            console.log('🌐 网络已连接');
            this.onNetworkOnline();
        });
        
        window.addEventListener('offline', () => {
            console.log('🌐 网络已断开');
            this.updateConnectionStatus('disconnected');
        });
    }
    
    // 页面重新可见时的处理
    onPageVisible() {
        // 检查 WebSocket 连接状态
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('🔄 检测到断开，尝试重连...');
            this.reconnectAttempts = 0; // 重置计数器，因为用户重新打开页面
            this.initWebSocket();
        } else {
            console.log('✅ 连接正常');
            // 即使连接正常，也尝试ping一下确认
            this.pingServer();
        }
    }
    
    // 网络恢复时的处理
    onNetworkOnline() {
        console.log('🔄 网络恢复，检查连接...');
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.reconnectAttempts = 0;
            this.initWebSocket();
        }
    }
    
    // Ping 服务器确认连接
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

    // 启动自动保存（每30秒）
    startAutoSave() {
        setInterval(() => {
            this.saveGameState();
            console.log('自动保存游戏数据');
        }, 30000); // 30秒
    }

    initWebSocket() {
        try {
            // 清除之前的重连定时器
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

            // 动态获取主机名和端口
            const host = window.location.hostname || 'localhost';
            const port = window.location.port;
            
            // 根据页面协议选择 WebSocket 协议
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            
            // 智能端口检测：
            // 1. 如果是标准端口（80/443）或通过 Nginx 代理，使用 /ws 路径
            // 2. 如果是直接访问（3001端口），使用独立的 WebSocket 端口
            let wsUrl;
            if (port === '' || port === '80' || port === '443') {
                // 通过 Nginx 代理或标准端口，使用相对路径
                wsUrl = `${protocol}//${host}/ws`;
            } else if (port === '3001' || port === '3443') {
                // 直接访问 HTTP 服务器，使用独立 WebSocket 端口
                const wsPort = window.location.protocol === 'https:' ? '8081' : '8080';
                wsUrl = `${protocol}//${host}:${wsPort}`;
            } else {
                // 其他情况，尝试使用相对路径
                wsUrl = `${protocol}//${host}:${port}/ws`;
            }
            
            console.log('🔗 正在连接到游戏服务器...');
            this.updateConnectionStatus('connecting');
            
            // 连接到 WebSocket 服务器
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('✅ 已连接到游戏服务器');
                console.log('👤 当前用户:', this.currentUser);
                
                // 重置重连计数和认证状态
                this.reconnectAttempts = 0;
                this.isAuthenticated = false;
                this.updateConnectionStatus('connected');
                
                // 访客直接通知服务器（使用存储的信息）
                if (this.currentUser.isGuest) {
                    console.log('🎭 发送访客登录请求');
                    this.ws.send(JSON.stringify({
                        type: 'guest_login',
                        guestId: this.currentUser.username,
                        nickname: this.currentUser.nickname
                    }));
                    
                    // 访客模式设置认证超时（10秒）
                    this.authTimeout = setTimeout(() => {
                        if (!this.isAuthenticated) {
                            console.error('❌ 访客认证超时');
                            this.showNotification('连接超时，正在重试...');
                            this.ws.close();
                        }
                    }, 10000);
                } else {
                // 正式用户使用sessionId进行认证
                let userData;
                try {
                    userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
                } catch (e) {
                    console.error('❌ 本地数据损坏，清除缓存');
                    localStorage.removeItem('currentUser');
                    window.location.href = 'auth.html';
                    return;
                }

                console.log('📦 localStorage 数据:', {
                    username: userData.username,
                    nickname: userData.nickname,
                    hasSessionId: !!userData.sessionId
                });
                
                if (userData.sessionId) {
                        console.log('🔑 发送会话认证请求, sessionId:', userData.sessionId.substring(0, 10) + '...');
                        this.ws.send(JSON.stringify({
                            type: 'session_auth',
                            sessionId: userData.sessionId
                        }));
                        
                        // 设置认证超时（10秒）
                        this.authTimeout = setTimeout(() => {
                            if (!this.isAuthenticated) {
                                console.error('❌ 会话认证超时，可能网络问题或服务器繁忙');
                                
                                // 增加失败计数
                                this.authFailureCount++;
                                console.log(`⚠️ 认证失败次数: ${this.authFailureCount}/${this.maxAuthFailures}`);
                                
                                if (this.authFailureCount >= this.maxAuthFailures) {
                                    console.error('🚫 多次认证失败，强制清理缓存并重新登录');
                                    this.showNotification('连接异常，正在重置登录状态...');
                                    localStorage.removeItem('currentUser');
                                    setTimeout(() => window.location.href = 'auth.html', 1000);
                                    return;
                                }

                                this.showNotification('认证超时，正在重试...');
                                this.ws.close();
                            }
                        }, 10000);
                    } else {
                        console.error('❌ 无会话ID，请重新登录');
                        console.error('localStorage 内容:', userData);
                        this.showNotification('认证失败，请重新登录');
                        setTimeout(() => {
                            window.location.href = 'auth.html';
                        }, 2000);
                    }
                }
            };

            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            };

            this.ws.onclose = (event) => {
                console.log('🔌 与服务器断开连接', event.code, event.reason);
                clearTimeout(this.authTimeout); // 清除认证超时定时器
                this.isAuthenticated = false;
                this.updateConnectionStatus('disconnected');
                
                // 如果不是主动关闭，尝试重连
                if (!this.isIntentionalClose) {
                    this.attemptReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket 连接错误:', error);
                this.updateConnectionStatus('error');
            };
        } catch (e) {
            console.error('❌ WebSocket 初始化失败:', e);
            this.updateConnectionStatus('error');
            this.attemptReconnect();
        }
    }

    // 尝试重连
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('⚠️ 已达到最大重连次数，停止重连');
            this.updateConnectionStatus('failed');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000); // 最多30秒
        
        console.log(`🔄 将在 ${delay / 1000} 秒后尝试第 ${this.reconnectAttempts} 次重连...`);
        this.updateConnectionStatus('reconnecting', this.reconnectAttempts);
        
        this.reconnectTimer = setTimeout(() => {
            console.log(`🔄 开始第 ${this.reconnectAttempts} 次重连...`);
            this.initWebSocket();
        }, delay);
    }

    // 更新连接状态显示
    updateConnectionStatus(status, attempt = 0) {
        const statusBar = document.querySelector('.status-bar');
        if (!statusBar) return;

        // 移除旧的状态指示器
        let indicator = statusBar.querySelector('.connection-indicator');
        if (indicator) {
            indicator.remove();
        }

        // 创建新的状态指示器
        indicator = document.createElement('div');
        indicator.className = 'connection-indicator';
        
        let color = '#10b981'; // 绿色 - 已连接
        let text = '●';
        let title = '已连接';

        switch (status) {
            case 'connecting':
                color = '#f59e0b'; // 橙色
                text = '●';
                title = '正在连接...';
                break;
            case 'connected':
                color = '#10b981'; // 绿色
                text = '●';
                title = '已连接';
                break;
            case 'disconnected':
                color = '#ef4444'; // 红色
                text = '●';
                title = '已断开';
                break;
            case 'reconnecting':
                color = '#f59e0b'; // 橙色
                text = '●';
                title = `重连中 (${attempt}/${this.maxReconnectAttempts})...`;
                break;
            case 'error':
                color = '#ef4444'; // 红色
                text = '●';
                title = '连接错误';
                break;
            case 'failed':
                color = '#6b7280'; // 灰色
                text = '●';
                title = '连接失败';
                break;
        }

        indicator.style.cssText = `
            color: ${color};
            font-size: 12px;
            margin-left: 8px;
            cursor: pointer;
            animation: ${status === 'connecting' || status === 'reconnecting' ? 'pulse 1.5s ease-in-out infinite' : 'none'};
        `;
        indicator.textContent = text;
        indicator.title = title;
        
        // 点击状态指示器可以手动重连
        if (status === 'disconnected' || status === 'error' || status === 'failed') {
            indicator.style.cursor = 'pointer';
            indicator.addEventListener('click', () => {
                console.log('🔄 手动触发重连...');
                this.reconnectAttempts = 0; // 重置计数
                this.initWebSocket();
            });
        }
        
        const userInfo = statusBar.querySelector('.user-info');
        if (userInfo) {
            userInfo.appendChild(indicator);
        }
    }

    handleWebSocketMessage(message) {
        // 处理强制登出（多点登录）
        if (message.type === 'force_logout') {
            console.warn('⚠️  收到强制登出消息:', message.reason);
            clearTimeout(this.authTimeout);
            this.isIntentionalClose = true; // 标记为主动关闭，不要重连
            this.showNotification(message.reason || '您的账号在其他设备登录');
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 3000);
            return;
        }
        
        // 处理会话认证结果
        if (message.type === 'session_auth_result') {
            console.log('📨 收到会话认证结果:', message.success ? '成功' : '失败');
            clearTimeout(this.authTimeout); // 清除超时定时器
            
            if (message.success) {
                this.isAuthenticated = true;
                this.authFailureCount = 0; // 重置失败计数
                this.showNotification('已连接到多人社区');
                
                // 加载服务器上的用户数据
                if (message.userData && message.userData.gameState) {
                    console.log('📦 合并服务器数据到本地状态');
                    // 合并游戏状态
                    this.gameState = { ...this.gameState, ...message.userData.gameState };
                    
                    // 恢复旅行状态
                    if (this.gameState.characterState === 'traveling' && this.gameState.travelStartTime) {
                        const elapsed = Date.now() - this.gameState.travelStartTime;
                        if (elapsed >= this.gameState.travelDuration) {
                            this.characterReturn();
                        } else {
                            const character = document.getElementById('character');
                            character.classList.add('traveling');
                            document.getElementById('character-status').textContent = '旅行中...';
                        }
                    }
                    
                    this.updateUI();
                    console.log('✅ 用户数据加载完成');
                } else {
                    console.warn('⚠️  服务器返回的数据为空或格式不正确');
                }
                
                // 显示离线收益
                if (message.offlineRewards && message.offlineRewards.offlineHours > 0) {
                    this.showOfflineRewardsDialog(message.offlineRewards);
                }
            } else {
                // 会话认证失败，跳转到登录页
                console.error('❌ 会话认证失败:', message.error);
                this.showNotification(message.error || '认证失败，请重新登录');
                
                // 立即清除本地凭证，防止重连逻辑再次使用无效凭证
                localStorage.removeItem('currentUser');
                this.isIntentionalClose = true; // 标记为主动关闭，阻止自动重连
                
                setTimeout(() => {
                    window.location.href = 'auth.html';
                }, 2000);
            }
        }
        // 处理访客登录结果
        else if (message.type === 'guest_login_result') {
            console.log('📨 收到访客登录结果:', message.success ? '成功' : '失败');
            clearTimeout(this.authTimeout); // 清除超时定时器
            
            if (message.success) {
                this.isAuthenticated = true;
                this.showNotification('已连接到多人社区（访客模式）');
                console.log('✅ 访客模式认证成功');
            } else {
                console.error('❌ 访客登录失败');
            }
        }
        // 处理错误消息
        else if (message.type === 'error') {
            this.showNotification(message.message || '发生错误');
            // 如果是未认证错误，跳转到登录页
            if (message.message && message.message.includes('未认证')) {
                setTimeout(() => {
                    localStorage.removeItem('currentUser');
                    window.location.href = 'auth.html';
                }, 2000);
            }
        }
        // 保持兼容旧的auth_success消息（用于测试）
        else if (message.type === 'auth_success') {
            this.showNotification('已连接到多人社区');
            
            // 加载服务器上的用户数据
            if (message.userData && message.userData.gameState) {
                // 合并游戏状态
                this.gameState = { ...this.gameState, ...message.userData.gameState };
                
                // 恢复旅行状态
                if (this.gameState.characterState === 'traveling' && this.gameState.travelStartTime) {
                    const elapsed = Date.now() - this.gameState.travelStartTime;
                    if (elapsed >= this.gameState.travelDuration) {
                        this.characterReturn();
                    } else {
                        const character = document.getElementById('character');
                        character.classList.add('traveling');
                        document.getElementById('character-status').textContent = '旅行中...';
                    }
                }
                
                this.updateUI();
                console.log('已加载用户数据');
            }
            
            // 显示离线收益
            if (message.offlineRewards && message.offlineRewards.offlineHours > 0) {
                this.showOfflineRewardsDialog(message.offlineRewards);
            }
        } else if (message.type === 'save_result') {
            if (message.success) {
                console.log('游戏数据已保存到服务器');
            } else {
                console.error('游戏数据保存失败');
            }
        } else if (message.type === 'history') {
            // 加载历史分享
            if (message.data && Array.isArray(message.data)) {
                // 提取有效的 location 对象
                const historyLocations = message.data
                    .map(msg => msg.location)
                    .filter(loc => loc && loc.code && loc.name);

                // 合并历史数据，去重
                const newLocations = historyLocations.filter(serverLoc => 
                    !this.gameState.sharedLocations.some(localLoc => 
                        localLoc.date === serverLoc.date && localLoc.code === serverLoc.code
                    )
                );
                this.gameState.sharedLocations = [...newLocations, ...this.gameState.sharedLocations];
                this.renderSharedLocations();
            }
        } else if (message.type === 'share_location') {
            // 收到新的分享
            const location = message.location;
            // 避免重复添加自己刚分享的（虽然服务器可能会发回来）
            const username = location.sharedByUsername || location.sharedBy;
            const isDuplicate = this.gameState.sharedLocations.some(l => 
                (l.sharedByUsername || l.sharedBy) === username && l.code === location.code && l.timestamp === location.timestamp
            );
            
            if (!isDuplicate) {
                this.gameState.sharedLocations.unshift(location);
                this.renderSharedLocations();
                
                // 如果面板打开，提示有新动态
                if (this.activePanel === 'social-panel') {
                    const notify = document.createElement('div');
                    notify.className = 'notification-bubble'; // 需要在CSS添加样式
                } else {
                     this.showNotification(`收到 ${location.sharedBy} 的新分享！`);
                }
            }
        } else if (message.type === 'online_users') {
            // 更新在线用户列表
            console.log('👥 收到在线用户列表:', message.users);
            this.onlineUsers = message.users;
            this.renderOnlineUsers();
        } else if (message.type === 'friend_request') {
            // 收到好友申请
            this.gameState.friendRequests.push({
                from: message.from,
                timestamp: Date.now()
            });
            this.showNotification(`${message.from.nickname} 向你发送了好友申请`);
            this.saveGameState();
        } else if (message.type === 'friend_accepted') {
            // 好友申请被接受
            if (!this.gameState.friends.some(f => f.username === message.friend.username)) {
                this.gameState.friends.push({
                    username: message.friend.username,
                    nickname: message.friend.nickname,
                    addedAt: Date.now()
                });
                this.showNotification(`${message.friend.nickname} 接受了你的好友申请`);
                this.saveGameState();
            }
        } else if (message.type === 'receive_gift') {
            // 收到赠送
            const gift = message.gift;
            let giftDescription = '';
            
            if (gift.type === 'resource') {
                if (gift.resourceType === 'sunlight') {
                    this.gameState.sunlight += gift.amount;
                    giftDescription = `${gift.amount} 阳光露珠`;
                } else if (gift.resourceType === 'starlight') {
                    this.gameState.starlight += gift.amount;
                    giftDescription = `${gift.amount} 星光`;
                }
            } else if (gift.type === 'item') {
                // 添加到对应的收藏
                if (gift.category === 'photo') {
                    this.gameState.photos.push(gift.item);
                    giftDescription = `照片：${gift.item.name}`;
                } else if (gift.category === 'souvenir') {
                    this.gameState.souvenirs.push(gift.item);
                    giftDescription = `纪念品 ${gift.item.icon}`;
                }
            }
            
            // 添加到访客记录
            const visitorRecord = {
                id: Date.now(),
                name: message.from.nickname,
                username: message.from.username,
                type: 'gift', // 标记为礼物类型
                gift: {
                    type: gift.type,
                    description: giftDescription,
                    details: gift
                },
                date: new Date().toLocaleDateString('zh-CN')
            };
            this.gameState.visitors.push(visitorRecord);
            
            this.showNotification(`收到来自 ${message.from.nickname} 的礼物：${giftDescription}！`);
            this.updateUI();
            this.saveGameState();
        } else if (message.type === 'visitor_notification') {
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
    }

    setupViewportHeightFix() {
        const setViewportHeight = () => {
            document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
        };

        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', setViewportHeight);
    }

    setupEventListeners() {
        // 安全的事件绑定函数
        const safeAddEventListener = (elementId, event, handler) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`⚠️  元素未找到: ${elementId}`);
            }
        };
        
        // 资源收集
        safeAddEventListener('sunlight-field', 'click', () => this.collectResource('sunlight'));
        safeAddEventListener('starlight-field', 'click', () => this.collectResource('starlight'));

        // 面板切换
        safeAddEventListener('backpack-btn', 'click', () => this.togglePanel('backpack-panel'));
        safeAddEventListener('collection-btn', 'click', () => this.togglePanel('collection-panel'));
        safeAddEventListener('social-btn', 'click', () => this.togglePanel('social-panel'));
        safeAddEventListener('sleep-btn', 'click', () => this.togglePanel('sleep-panel'));

        // 关闭面板
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const panel = event.currentTarget.closest('.panel');
                if (panel?.id) {
                    this.closePanel(panel.id);
                }
            });
        });

        // 行囊系统
        this.setupBackpackPanel();
        
        // 收藏面板标签
        document.querySelectorAll('#collection-panel .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#collection-panel .tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.showCollectionTab(e.target.dataset.tab);
            });
        });

        // 社交面板标签
        document.querySelectorAll('#social-panel .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#social-panel .tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.showSocialTab(e.target.dataset.tab);
            });
        });

        // 社交功能
        safeAddEventListener('share-location-btn', 'click', () => this.shareLocation());

        // 助眠功能
        safeAddEventListener('story-btn', 'click', () => this.playBedtimeStory());
        safeAddEventListener('sleep-mode-btn', 'click', () => this.enterSleepMode());
        safeAddEventListener('wake-btn', 'click', () => this.exitSleepMode());

        // 面板遮罩
        const panelOverlay = document.getElementById('panel-overlay');
        if (panelOverlay) {
            panelOverlay.addEventListener('click', () => {
                if (this.activePanel) {
                    this.closePanel(this.activePanel);
                }
            });
        }

        // 访问模式按钮
        safeAddEventListener('back-home-btn', 'click', () => this.returnToHome());
        safeAddEventListener('add-friend-btn', 'click', () => this.sendFriendRequest());

        // 用户信息点击（退出登录）
        safeAddEventListener('user-nickname', 'click', () => {
            if (confirm('确定要退出登录吗？')) {
                localStorage.removeItem('currentUser');
                window.location.href = 'auth.html';
            }
        });
        
        // 音乐控制按钮
        safeAddEventListener('music-toggle-btn', 'click', () => this.toggleMusic());
    }

    setupBackpackPanel() {
        // 使用事件委托，只绑定一次
        const foodList = document.getElementById('food-list');
        const toyList = document.getElementById('toy-list');
        const charmList = document.getElementById('charm-list');
        
        // 为每个列表添加事件委托
        [foodList, toyList, charmList].forEach((container, idx) => {
            const category = ['food', 'toy', 'charm'][idx];
            container.addEventListener('click', (e) => {
                const card = e.target.closest('.item-card');
                if (card && !card.classList.contains('unaffordable')) {
                    const itemId = card.getAttribute('data-id');
                    const item = this.items[category].find(i => i.id === itemId);
                    if (item) {
                        this.toggleItem(item, category, card);
                    }
                }
            });
        });

        // 确认出发
        document.getElementById('confirm-backpack').addEventListener('click', () => this.startTravel());
        
        // 标记面板已初始化
        this.backpackInitialized = false;
    }

    renderItems(category, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // 使用文档片段批量插入，提高性能
        const fragment = document.createDocumentFragment();

        this.items[category].forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.setAttribute('data-id', item.id);
            
            // 检查是否能单独购买这个物品
            const canAfford = this.canAfford(item.cost);
            if (!canAfford) {
                card.classList.add('unaffordable');
            }
            
            // 如果已经选中，添加选中样式
            const isSelected = this.gameState.selectedItems.some(i => i.id === item.id);
            if (isSelected) {
                card.classList.add('selected');
            }
            
            const descText = item.desc ? `<div class="item-desc">${item.desc}</div>` : '';
            card.innerHTML = `
                <div class="item-icon">${item.icon}</div>
                <div class="item-name">${item.name}</div>
                ${descText}
                <div class="item-cost">${this.formatCost(item.cost)}</div>
            `;

            // 不需要绑定事件，使用事件委托
            fragment.appendChild(card);
        });
        
        // 一次性更新 DOM
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    formatCost(cost) {
        const parts = [];
        if (cost.sunlight) parts.push(`☀️${cost.sunlight}`);
        if (cost.starlight) parts.push(`✨${cost.starlight}`);
        return parts.join(' ');
    }

    toggleItem(item, category, cardElement) {
        const index = this.gameState.selectedItems.findIndex(i => i.id === item.id);
        
        if (index > -1) {
            // 取消选择
            this.gameState.selectedItems.splice(index, 1);
            cardElement.classList.remove('selected');
        } else {
            // 添加选择
            if (this.gameState.selectedItems.length >= 3) {
                this.showNotification('最多只能选择3件物品！');
                return;
            }
            
            // 计算如果添加这个物品后的总消耗
            const totalCost = this.calculateTotalCost([...this.gameState.selectedItems, { ...item, category }]);
            
            // 检查总消耗是否超过现有资源
            if (totalCost.sunlight > this.gameState.sunlight) {
                this.showNotification(`阳光露珠不足！需要${totalCost.sunlight}，当前只有${this.gameState.sunlight}`);
                return;
            }
            if (totalCost.starlight > this.gameState.starlight) {
                this.showNotification(`星光不足！需要${totalCost.starlight}，当前只有${this.gameState.starlight}`);
                return;
            }
            
            this.gameState.selectedItems.push({ ...item, category });
            cardElement.classList.add('selected');
        }

        this.updateSelectedItemsDisplay();
    }

    // 计算所选物品的总消耗
    calculateTotalCost(items) {
        const total = { sunlight: 0, starlight: 0 };
        items.forEach(item => {
            if (item.cost.sunlight) total.sunlight += item.cost.sunlight;
            if (item.cost.starlight) total.starlight += item.cost.starlight;
        });
        return total;
    }

    canAfford(cost) {
        if (cost.sunlight && this.gameState.sunlight < cost.sunlight) return false;
        if (cost.starlight && this.gameState.starlight < cost.starlight) return false;
        return true;
    }

    updateSelectedItemsDisplay() {
        const container = document.getElementById('selected-items');
        container.innerHTML = '';

        this.gameState.selectedItems.forEach((item, index) => {
            const tag = document.createElement('div');
            tag.className = 'selected-item';
            tag.innerHTML = `
                <span>${item.icon} ${item.name}</span>
                <span class="selected-item-remove" data-item-id="${item.id}" data-index="${index}">×</span>
            `;
            container.appendChild(tag);
        });

        // 为叉号按钮添加事件监听（使用事件委托）
        container.querySelectorAll('.selected-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = e.target.dataset.itemId;
                this.unselectItem(itemId);
            });
        });

        const confirmBtn = document.getElementById('confirm-backpack');
        confirmBtn.disabled = this.gameState.selectedItems.length === 0;
    }

    // 取消选中物品
    unselectItem(itemId) {
        // 从选中列表中移除
        const index = this.gameState.selectedItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
            this.gameState.selectedItems.splice(index, 1);
        }

        // 更新物品卡片的选中状态
        const card = document.querySelector(`.item-card[data-id="${itemId}"]`);
        if (card) {
            card.classList.remove('selected');
        }

        // 更新显示
        this.updateSelectedItemsDisplay();
        this.saveGameState();
    }

    // 刷新行囊面板（当资源变化时调用）
    refreshBackpackPanel() {
        // 只有在行囊面板打开时才刷新
        if (this.activePanel !== 'backpack-panel') {
            return;
        }
        
        // 保存当前选中的物品ID
        const selectedIds = this.gameState.selectedItems.map(item => item.id);
        
        // 使用 requestAnimationFrame 优化渲染时机
        requestAnimationFrame(() => {
            // 重新渲染物品列表
            this.renderItems('food', 'food-list');
            this.renderItems('toy', 'toy-list');
            this.renderItems('charm', 'charm-list');
            
            // 恢复选中状态
            selectedIds.forEach(id => {
                const card = document.querySelector(`.item-card[data-id="${id}"]`);
                if (card) card.classList.add('selected');
            });
            
            this.updateBackpackButton();
        });
    }

    startTravel() {
        if (this.gameState.characterState === 'traveling') {
            this.showNotification('主角正在旅行中...');
            return;
        }

        if (this.gameState.selectedItems.length === 0) {
            this.showNotification('请至少选择一件物品！');
            return;
        }

        // 再次检查资源是否足够（双重保险）
        const totalCost = this.calculateTotalCost(this.gameState.selectedItems);
        if (totalCost.sunlight > this.gameState.sunlight || totalCost.starlight > this.gameState.starlight) {
            this.showNotification('资源不足，无法出发！');
            return;
        }

        // 扣除资源
        this.gameState.selectedItems.forEach(item => {
            if (item.cost.sunlight) this.gameState.sunlight -= item.cost.sunlight;
            if (item.cost.starlight) this.gameState.starlight -= item.cost.starlight;
        });

        // 开始旅行
        this.gameState.characterState = 'traveling';
        this.gameState.travelStartTime = Date.now();
        this.gameState.travelDuration = 30000 + Math.random() * 60000; // 30-90秒

        const character = document.getElementById('character');
        character.classList.add('traveling');
        document.getElementById('character-status').textContent = '旅行中...';

        this.showNotification('主角出发了！');
        this.togglePanel('backpack-panel');
        this.updateUI();
        this.saveGameState();

        // 随机访客
        setTimeout(() => this.checkVisitor(), this.gameState.travelDuration / 2);
    }

    checkTravelStatus() {
        if (this.gameState.characterState === 'traveling') {
            const elapsed = Date.now() - this.gameState.travelStartTime;
            if (elapsed >= this.gameState.travelDuration) {
                this.characterReturn();
            }
        }
    }

    characterReturn() {
        this.gameState.characterState = 'returned';
        const character = document.getElementById('character');
        character.classList.remove('traveling');
        document.getElementById('character-status').textContent = '回来了！';

        // 生成带回的物品
        const photo = this.generatePhoto();
        const souvenir = this.generateSouvenir();

        this.gameState.photos.push(photo);
        if (souvenir) this.gameState.souvenirs.push(souvenir);

        this.showNotification(`主角带回了照片：${photo.name}！`);
        this.gameState.selectedItems = [];
        
        // 检查访客
        this.checkVisitorOnReturn();
        
        this.updateUI();
        this.saveGameState();
    }

    generatePhoto() {
        const locations = this.locations;
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];
        
        return {
            id: Date.now(),
            name: randomLocation.name,
            icon: randomLocation.icon,
            location: randomLocation.code,
            date: new Date().toLocaleDateString('zh-CN'),
            description: randomLocation.description
        };
    }

    generateSouvenir() {
        if (Math.random() < 0.5) { // 50%概率获得纪念品
            const souvenirs = [
                { icon: '🍃', name: '幸运树叶', desc: '来自神秘森林的魔法叶子' },
                { icon: '🪨', name: '许愿石', desc: '山顶上捡到的光滑石头' },
                { icon: '🌿', name: '薄荷草', desc: '散发清香的野生薄荷' },
                { icon: '💫', name: '星尘', desc: '从流星上飘落的星尘' },
                { icon: '🦋', name: '蝴蝶标本', desc: '美丽的蝴蝶翅膀标本' },
                { icon: '🐚', name: '螺旋贝', desc: '海边拾到的彩色贝壳' },
                { icon: '🪶', name: '凤凰羽毛', desc: '闪烁着火光的羽毛' },
                { icon: '💎', name: '水晶碎片', desc: '洞窟里的天然水晶' },
                { icon: '🌰', name: '橡果', desc: '松鼠藏的小橡果' },
                { icon: '🍄', name: '发光蘑菇', desc: '夜晚会发光的蘑菇' },
                { icon: '🔮', name: '占卜球', desc: '能预测天气的玻璃球' },
                { icon: '📿', name: '念珠手链', desc: '编织精美的手工手链' },
                { icon: '🎐', name: '风铃', desc: '清脆悦耳的玻璃风铃' },
                { icon: '🧿', name: '护身符', desc: '驱邪避凶的蓝色符咒' },
                { icon: '🪙', name: '古币', desc: '刻着神秘符号的金币' },
                { icon: '💌', name: '情书', desc: '陌生人留下的温暖纸条' },
                { icon: '🎴', name: '花牌', desc: '绘有四季之花的卡牌' },
                { icon: '🪷', name: '莲花灯', desc: '可以漂浮在水上的灯' },
                { icon: '🧊', name: '永冻之冰', desc: '永远不会融化的冰块' },
                { icon: '🌋', name: '火山岩', desc: '炽热的火山熔岩石' }
            ];
            
            const selected = souvenirs[Math.floor(Math.random() * souvenirs.length)];
            return {
                id: Date.now(),
                icon: selected.icon,
                name: selected.name,
                desc: selected.desc,
                date: new Date().toLocaleDateString('zh-CN')
            };
        }
        return null;
    }

    collectResource(type) {
        const now = Date.now();
        
        if (type === 'sunlight') {
            // 检查是否在冷却中
            if (this.gameState.sunlightCooldown > now) {
                const remainingSeconds = Math.ceil((this.gameState.sunlightCooldown - now) / 1000);
                this.showNotification(`阳光还在生成中，请等待 ${remainingSeconds} 秒`);
                return;
            }
            
            // 检查是否是白天
            if (this.gameState.isNightMode) {
                this.showNotification('现在是夜晚，无法收集阳光');
                return;
            }
            
            // 收集资源
            const amount = 5 + Math.floor(Math.random() * 5);
            this.gameState.sunlight += amount;
            this.showNotification(`+${amount} 阳光露珠`);
            
            // 设置冷却时间（10秒）
            this.gameState.sunlightCooldown = now + 10000;
            this.updateResourceDisplay();
            
        } else if (type === 'starlight') {
            // 检查是否在冷却中
            if (this.gameState.starlightCooldown > now) {
                const remainingSeconds = Math.ceil((this.gameState.starlightCooldown - now) / 1000);
                this.showNotification(`星光还在生成中，请等待 ${remainingSeconds} 秒`);
                return;
            }
            
            // 检查是否是夜晚
            if (!this.gameState.isNightMode) {
                this.showNotification('现在是白天，无法收集星光');
                return;
            }
            
            // 收集资源
            const amount = 5 + Math.floor(Math.random() * 5);
            this.gameState.starlight += amount;
            this.showNotification(`+${amount} 星光`);
            
            // 设置冷却时间（10秒）
            this.gameState.starlightCooldown = now + 10000;
            this.updateResourceDisplay();
        }
        
        this.updateUI();
        this.refreshBackpackPanel();
        this.saveGameState();
    }

    // 更新资源显示状态（显示/隐藏）
    updateResourceDisplay() {
        const now = Date.now();
        const sunlightField = document.getElementById('sunlight-field');
        const starlightField = document.getElementById('starlight-field');
        
        // 阳光字段
        if (this.gameState.sunlightCooldown > now) {
            sunlightField.classList.add('cooldown');
        } else {
            sunlightField.classList.remove('cooldown');
        }
        
        // 星光字段
        if (this.gameState.starlightCooldown > now) {
            starlightField.classList.add('cooldown');
        } else {
            starlightField.classList.remove('cooldown');
        }
    }

    startResourceGeneration() {
        // 自动生成资源
        setInterval(() => {
            if (this.gameState.isNightMode) {
                this.gameState.starlight += 1;
            } else {
                this.gameState.sunlight += 1;
            }
            this.updateUI();
            this.refreshBackpackPanel(); // 刷新行囊显示
            this.saveGameState();
        }, 10000); // 每10秒生成1点
    }

    checkTimeOfDay() {
        const hour = new Date().getHours();
        const isNight = hour >= 19 || hour < 7;
        
        // 始终更新状态，确保UI正确
        const wasNightMode = this.gameState.isNightMode;
        this.gameState.isNightMode = isNight;
        
        // 如果状态改变或是首次调用，更新UI
        if (isNight !== wasNightMode || wasNightMode === undefined) {
            this.updateTimeMode();
        }

        // 检查是否有新的梦境
        this.checkDream();
        
        // 每分钟检查一次时间，确保准时切换
        if (!this.timeCheckInterval) {
            this.timeCheckInterval = setInterval(() => {
                this.checkTimeOfDay();
            }, 60000); // 每分钟检查一次
        }
    }

    updateTimeMode() {
        const container = document.getElementById('game-container');
        const sky = document.getElementById('sky');
        const garden = document.getElementById('garden');
        const house = document.getElementById('house');
        const timeText = document.getElementById('time-text');

        if (this.gameState.isNightMode) {
            container.classList.add('night-mode');
            sky.classList.add('night');
            garden.classList.add('night');
            if(house) house.classList.add('night');
            timeText.textContent = '夜晚';
            document.querySelector('.time-indicator').classList.add('night');
            
            // 切换到夜晚时，重置星光冷却，允许立即收集
            this.gameState.starlightCooldown = 0;
        } else {
            container.classList.remove('night-mode');
            sky.classList.remove('night');
            garden.classList.remove('night');
            if(house) house.classList.remove('night');
            timeText.textContent = '白天';
            document.querySelector('.time-indicator').classList.remove('night');
            
            // 切换到白天时，重置阳光冷却，允许立即收集
            this.gameState.sunlightCooldown = 0;
        }
        
        // 更新资源显示
        this.updateResourceDisplay();
        
        // 切换背景音乐
        this.stopBgm();
        this.playBgmForTimeOfDay();
    }

    checkDream() {
        const today = new Date().toDateString();
        if (this.gameState.lastDreamDate !== today && this.gameState.isNightMode) {
            // 可以在这里生成梦境，但为了演示，我们简化处理
        }
    }

    checkVisitor() {
        if (Math.random() < 0.3 && this.gameState.characterState === 'traveling') {
            const visitor = {
                id: Date.now(),
                name: '神秘访客',
                gift: {
                    type: Math.random() < 0.5 ? 'sunlight' : 'starlight',
                    amount: 10 + Math.floor(Math.random() * 20)
                },
                date: new Date().toLocaleDateString('zh-CN')
            };

            this.gameState.visitors.push(visitor);
            
            if (visitor.gift.type === 'sunlight') {
                this.gameState.sunlight += visitor.gift.amount;
            } else {
                this.gameState.starlight += visitor.gift.amount;
            }

            this.showVisitorNotice(visitor);
            this.updateUI();
            this.refreshBackpackPanel(); // 刷新行囊显示
            this.saveGameState();
        }
    }

    checkVisitorOnReturn() {
        // 主角回来后检查是否有访客
        if (this.gameState.visitors.length > 0) {
            const recentVisitor = this.gameState.visitors[this.gameState.visitors.length - 1];
            const visitorTime = new Date(recentVisitor.id).getTime();
            const now = Date.now();
            // 如果访客是在主角旅行期间来的，显示通知
            if (this.gameState.travelStartTime && visitorTime >= this.gameState.travelStartTime && visitorTime <= now) {
                this.showVisitorNotice(recentVisitor);
            }
        }
    }

    showVisitorNotice(visitor) {
        const notice = document.getElementById('visitor-notice');
        notice.style.display = 'block';
        setTimeout(() => {
            notice.style.display = 'none';
        }, 3000);
    }

    togglePanel(panelId) {
        if (this.activePanel === panelId) {
            this.closePanel(panelId);
        } else {
            this.openPanel(panelId);
        }
    }

    openPanel(panelId) {
        if (this.activePanel && this.activePanel !== panelId) {
            this.closePanel(this.activePanel);
        }

        const panel = document.getElementById(panelId);
        panel.classList.add('active');
        this.activePanel = panelId;
        this.setPanelOverlay(true);

        // 行囊面板：延迟渲染，只在打开时渲染
        if (panelId === 'backpack-panel') {
            if (!this.backpackInitialized) {
                this.backpackInitialized = true;
            }
            // 每次打开都刷新物品状态（资源可能变化）
            this.renderItems('food', 'food-list');
            this.renderItems('toy', 'toy-list');
            this.renderItems('charm', 'charm-list');
            this.updateBackpackButton();
        }
        
        if (panelId === 'collection-panel') {
            this.showCollectionTab('photos');
        }
        if (panelId === 'social-panel') {
            this.showSocialTab('map');
        }
    }

    closePanel(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        panel.classList.remove('active');

        if (this.activePanel === panelId) {
            this.activePanel = null;
            this.setPanelOverlay(false);
        }
    }

    setPanelOverlay(isActive) {
        const overlay = document.getElementById('panel-overlay');
        if (!overlay) return;
        overlay.classList.toggle('active', isActive);
    }

    showCollectionTab(tab) {
        const content = document.getElementById('collection-content');
        content.innerHTML = '';

        if (tab === 'photos') {
            if (this.gameState.photos.length === 0) {
                content.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">还没有照片，让主角去旅行吧！</p>';
            } else {
                this.gameState.photos.forEach(photo => {
                    const item = document.createElement('div');
                    item.className = 'collection-item';
                    item.innerHTML = `
                        <div class="collection-image">${photo.icon}</div>
                        <div class="collection-title">${photo.name}</div>
                        <div class="collection-desc">${photo.description || ''}</div>
                        <div class="collection-date">${photo.date}</div>
                    `;
                    content.appendChild(item);
                });
            }
        } else if (tab === 'souvenirs') {
            if (this.gameState.souvenirs.length === 0) {
                content.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">还没有纪念品</p>';
            } else {
                this.gameState.souvenirs.forEach(souvenir => {
                    const item = document.createElement('div');
                    item.className = 'collection-item';
                    item.innerHTML = `
                        <div class="collection-image">${souvenir.icon}</div>
                        <div class="collection-title">${souvenir.name}</div>
                        <div class="collection-desc">${souvenir.desc || ''}</div>
                        <div class="collection-date">${souvenir.date}</div>
                    `;
                    content.appendChild(item);
                });
            }
        } else if (tab === 'dreams') {
            if (this.gameState.dreams.length === 0) {
                content.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">还没有记录梦境</p>';
            } else {
                this.gameState.dreams.forEach(dream => {
                    const item = document.createElement('div');
                    item.className = 'collection-item dream-item';
                    item.innerHTML = `
                        <div class="collection-image">${dream.icon || '💭'}</div>
                        <div class="collection-title">${dream.name}</div>
                        <div class="dream-text">${dream.text || ''}</div>
                        <div class="collection-date">${dream.date}</div>
                    `;
                    content.appendChild(item);
                });
            }
        }
    }

    showSocialTab(tab) {
        const content = document.getElementById('social-content');
        
        if (tab === 'map') {
            // 获取已发现的唯一地点（从照片中提取）
            const discoveredLocations = this.getDiscoveredLocations();
            
            let selectHtml = '';
            if (discoveredLocations.length > 0) {
                selectHtml = `
                    <div class="discovered-locations">
                        <h4 style="font-size: 14px; color: #888; margin-bottom: 12px;">选择已发现的地点</h4>
                        <div class="location-select-list" id="location-select-list">
                            ${discoveredLocations.map(loc => `
                                <div class="location-select-item" data-code="${loc.code}">
                                    <span class="loc-icon">${loc.icon}</span>
                                    <span class="loc-name">${loc.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <button class="share-btn" id="share-location-btn" disabled>分享选中的地点</button>
                `;
            } else {
                selectHtml = `
                    <p style="text-align: center; color: #999; padding: 20px; font-size: 14px;">
                        还没有发现任何地点，先让小狐狸去旅行吧！
                    </p>
                `;
            }
            
            content.innerHTML = `
                <div class="map-section">
                    <div class="share-location">
                        <h3>分享神秘地点</h3>
                        ${selectHtml}
                    </div>
                    <h3 style="font-size: 16px; color: #333; margin-bottom: 16px;">社区分享</h3>
                    <div class="shared-locations" id="shared-locations"></div>
                </div>
            `;
            
            // 绑定地点选择事件
            this.selectedLocationCode = null;
            document.querySelectorAll('.location-select-item').forEach(item => {
                item.addEventListener('click', () => {
                    document.querySelectorAll('.location-select-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    this.selectedLocationCode = item.dataset.code;
                    const shareBtn = document.getElementById('share-location-btn');
                    if (shareBtn) shareBtn.disabled = false;
                });
            });
            
            // 绑定分享按钮事件
            const shareBtn = document.getElementById('share-location-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', () => this.shareLocation());
            }
            this.renderSharedLocations();
        } else if (tab === 'online') {
            // 在线用户
            content.innerHTML = '<div class="online-users-list" id="online-users-list"></div>';
            this.renderOnlineUsers();
        } else if (tab === 'visitors') {
            content.innerHTML = '<div class="visitor-list" id="visitor-list"></div>';
            this.renderVisitors();
        } else if (tab === 'friends') {
            content.innerHTML = '<div class="friends-container" id="friends-container"></div>';
            this.renderFriends();
        }
    }

    renderVisitors() {
        const container = document.getElementById('visitor-list');
        if (!container) return;
        
        if (this.gameState.visitors.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">还没有访客记录</p>';
            return;
        }

        container.innerHTML = '';
        // 创建副本以避免修改原数组
        const visitorsCopy = [...this.gameState.visitors].reverse();
        visitorsCopy.forEach(visitor => {
            const item = document.createElement('div');
            item.className = 'location-card';
            item.style.marginBottom = '15px';
            
            // 根据访客类型显示不同的图标和内容
            let icon = '👤';
            let description = '';
            
            if (visitor.type === 'visit') {
                // 玩家访问
                icon = '👋';
                description = '<div style="color: #10b981; font-weight: 600;">来访问了你的小屋</div>';
            } else if (visitor.type === 'gift') {
                // 收到礼物
                icon = '🎁';
                description = `<div style="color: #667eea; font-weight: 600;">赠送了 ${visitor.gift.description}</div>`;
            } else if (visitor.gift && visitor.gift.amount) {
                // 旧的随机访客格式（带礼物）
                icon = '🎁';
                description = `<div style="color: #667eea; font-weight: 600;">+${visitor.gift.amount} ${visitor.gift.type === 'sunlight' ? '☀️ 阳光露珠' : '✨ 星光'}</div>`;
            } else {
                // 默认访客
                description = '<div style="color: #999;">路过小屋</div>';
            }
            
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="font-size: 24px;">${icon}</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${visitor.name}</div>
                        <div style="font-size: 11px; color: #999;">${visitor.date}</div>
                    </div>
                </div>
                ${description}
            `;
            container.appendChild(item);
        });
    }

    // 获取已发现的唯一地点（从照片中提取，去重）
    getDiscoveredLocations() {
        const uniqueLocations = new Map();
        this.gameState.photos.forEach(photo => {
            if (!uniqueLocations.has(photo.location)) {
                uniqueLocations.set(photo.location, {
                    code: photo.location,
                    name: photo.name,
                    icon: photo.icon,
                    description: photo.description
                });
            }
        });
        return Array.from(uniqueLocations.values());
    }

    shareLocation() {
        if (!this.selectedLocationCode) {
            this.showNotification('请先选择要分享的地点');
            return;
        }

        // 从已发现的地点中查找
        const discoveredLocations = this.getDiscoveredLocations();
            const location = discoveredLocations.find(l => l.code === this.selectedLocationCode);
        
        if (!location) {
            this.showNotification('未找到该地点');
            return;
        }

        // 检查是否已经分享过
        const alreadyShared = this.gameState.sharedLocations.some(
            l => l.code === location.code && (l.sharedByUsername === this.currentUser.username || l.sharedBy === this.currentUser.username)
        );
        
        if (alreadyShared) {
            this.showNotification('您已经分享过这个地点了');
            return;
        }

        const locationToShare = {
            ...location,
            sharedBy: this.currentUser.nickname,  // 使用昵称而不是账号名
            sharedByUsername: this.currentUser.username,  // 保留账号名用于去重等逻辑
            date: new Date().toLocaleDateString('zh-CN'),
            timestamp: Date.now()
        };

        // 发送到服务器
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'share_location',
                location: locationToShare
            }));
            this.showNotification(`已分享地点：${location.name}`);
        } else {
            // 离线模式：只保存到本地
            this.gameState.sharedLocations.unshift(locationToShare);
            this.renderSharedLocations();
            this.saveGameState();
            this.showNotification('网络未连接，仅保存到本地');
        }

        // 清除选中状态
        this.selectedLocationCode = null;
        document.querySelectorAll('.location-select-item').forEach(i => i.classList.remove('selected'));
        const shareBtn = document.getElementById('share-location-btn');
        if (shareBtn) shareBtn.disabled = true;
    }

    // 渲染在线用户列表
    renderOnlineUsers() {
        const container = document.getElementById('online-users-list');
        if (!container) {
            console.log('⚠️  在线用户列表容器不存在');
            return;
        }

        console.log('🎨 渲染在线用户列表，共', this.onlineUsers.length, '人');
        
        if (this.onlineUsers.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">当前没有在线用户</p>';
            return;
        }
        
        // 过滤掉自己
        const otherUsers = this.onlineUsers.filter(user => user.username !== this.currentUser.username);
        console.log('👤 当前用户:', this.currentUser.username);
        console.log('👥 其他用户:', otherUsers);
        
        if (otherUsers.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">当前没有其他在线用户</p>';
            return;
        }

        container.innerHTML = '';
        otherUsers.forEach(user => {

            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="user-avatar">🦊</div>
                <div class="user-info">
                    <div class="user-nickname">${user.nickname}</div>
                    <div class="user-status">${user.isGuest ? '访客' : '正式用户'}</div>
                </div>
            `;
            card.addEventListener('click', () => this.visitUserHouse(user));
            container.appendChild(card);
        });
    }

    // 访问其他玩家的小屋
    visitUserHouse(user) {
        this.isVisiting = true;
        this.visitingUser = user;

        // 隐藏正常操作栏，显示访问操作栏
        document.getElementById('action-bar').style.display = 'none';
        document.getElementById('visitor-action-bar').style.display = 'flex';

        // 关闭面板
        this.closePanel(this.activePanel);

        // 通知服务器，记录访问
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'visit_user',
                targetUsername: user.username
            }));
        }

        // 请求对方的游戏状态（简化实现，显示静态场景）
        this.showNotification(`正在访问 ${user.nickname} 的小屋...`);
    }

    // 返回自己的小屋
    returnToHome() {
        this.isVisiting = false;
        this.visitingUser = null;

        // 恢复正常操作栏
        document.getElementById('action-bar').style.display = 'flex';
        document.getElementById('visitor-action-bar').style.display = 'none';

        this.showNotification('已返回自己的小屋');
    }

    // 发送好友申请
    sendFriendRequest() {
        if (!this.visitingUser) return;

        // 检查是否已经是好友
        if (this.gameState.friends.some(f => f.username === this.visitingUser.username)) {
            this.showNotification('对方已经是你的好友了');
            return;
        }

        // 发送请求
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'friend_request',
                targetUsername: this.visitingUser.username
            }));
            this.showNotification(`已向 ${this.visitingUser.nickname} 发送好友申请`);
        } else {
            this.showNotification('网络未连接，无法发送好友申请');
        }
    }

    // 渲染好友列表
    renderFriends() {
        const container = document.getElementById('friends-container');
        if (!container) return;

        let html = '';

        // 显示好友申请
        if (this.gameState.friendRequests.length > 0) {
            html += '<div class="friend-requests"><h4>好友申请</h4>';
            this.gameState.friendRequests.forEach((req, index) => {
                html += `
                    <div class="friend-request-card">
                        <div class="user-avatar">🦊</div>
                        <div class="user-info">
                            <div class="user-nickname">${req.from.nickname}</div>
                        </div>
                        <div class="request-actions">
                            <button class="accept-btn" data-index="${index}">接受</button>
                            <button class="reject-btn" data-index="${index}">拒绝</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // 显示好友列表
        html += '<div class="friends-list"><h4>我的好友</h4>';
        if (this.gameState.friends.length === 0) {
            html += '<p style="text-align: center; color: #999; padding: 20px;">还没有好友</p>';
        } else {
            this.gameState.friends.forEach(friend => {
                html += `
                    <div class="friend-card">
                        <div class="user-avatar">🦊</div>
                        <div class="user-info">
                            <div class="user-nickname">${friend.nickname}</div>
                        </div>
                        <button class="gift-btn" data-username="${friend.username}">赠送</button>
                    </div>
                `;
            });
        }
        html += '</div>';

        container.innerHTML = html;

        // 绑定接受/拒绝按钮
        container.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.acceptFriendRequest(index);
            });
        });

        container.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.rejectFriendRequest(index);
            });
        });

        // 绑定赠送按钮
        container.querySelectorAll('.gift-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.dataset.username;
                this.showGiftDialog(username);
            });
        });
    }

    // 接受好友申请
    acceptFriendRequest(index) {
        const request = this.gameState.friendRequests[index];
        if (!request) return;

        // 添加到好友列表
        this.gameState.friends.push({
            username: request.from.username,
            nickname: request.from.nickname,
            addedAt: Date.now()
        });

        // 移除申请
        this.gameState.friendRequests.splice(index, 1);

        // 通知对方
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'friend_accept',
                targetUsername: request.from.username
            }));
        }

        this.showNotification(`已接受 ${request.from.nickname} 的好友申请`);
        this.saveGameState();
        this.renderFriends();
    }

    // 拒绝好友申请
    rejectFriendRequest(index) {
        const request = this.gameState.friendRequests[index];
        if (!request) return;

        this.gameState.friendRequests.splice(index, 1);
        this.showNotification('已拒绝好友申请');
        this.saveGameState();
        this.renderFriends();
    }

    // 显示赠送对话框
    showGiftDialog(username) {
        const friend = this.gameState.friends.find(f => f.username === username);
        if (!friend) return;

        // 创建自定义弹窗
        const dialog = document.createElement('div');
        dialog.className = 'gift-dialog-overlay';
        dialog.innerHTML = `
            <div class="gift-dialog">
                <div class="gift-dialog-header">
                    <h3>赠送礼物给 ${friend.nickname}</h3>
                    <button class="gift-dialog-close">×</button>
                </div>
                <div class="gift-dialog-content">
                    <div class="gift-type-selector">
                        <button class="gift-type-btn active" data-type="sunlight">
                            <span class="gift-icon">☀️</span>
                            <span class="gift-name">阳光露珠</span>
                            <span class="gift-count">${this.gameState.sunlight}</span>
                        </button>
                        <button class="gift-type-btn" data-type="starlight">
                            <span class="gift-icon">✨</span>
                            <span class="gift-name">星光</span>
                            <span class="gift-count">${this.gameState.starlight}</span>
                        </button>
                        <button class="gift-type-btn" data-type="photo">
                            <span class="gift-icon">📷</span>
                            <span class="gift-name">照片</span>
                            <span class="gift-count">${this.gameState.photos.length}</span>
                        </button>
                        <button class="gift-type-btn" data-type="souvenir">
                            <span class="gift-icon">🎁</span>
                            <span class="gift-name">纪念品</span>
                            <span class="gift-count">${this.gameState.souvenirs.length}</span>
                        </button>
                    </div>
                    <div class="gift-selection-area" id="gift-selection-area">
                        <!-- 动态内容 -->
                    </div>
                </div>
                <div class="gift-dialog-footer">
                    <button class="gift-dialog-btn cancel-btn">取消</button>
                    <button class="gift-dialog-btn confirm-btn">确认赠送</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 当前选中的礼物类型和数据
        let selectedType = 'sunlight';
        let selectedData = null;
        
        // 更新选择区域
        const updateSelectionArea = (type) => {
            selectedType = type;
            selectedData = null;
            const area = dialog.querySelector('#gift-selection-area');
            
            if (type === 'sunlight' || type === 'starlight') {
                const maxAmount = type === 'sunlight' ? this.gameState.sunlight : this.gameState.starlight;
                const icon = type === 'sunlight' ? '☀️' : '✨';
                const name = type === 'sunlight' ? '阳光露珠' : '星光';
                
                area.innerHTML = `
                    <div class="resource-input-area">
                        <label>赠送数量：</label>
                        <div class="resource-input-group">
                            <button class="amount-btn minus-btn">-</button>
                            <input type="number" class="resource-amount-input" value="1" min="1" max="${maxAmount}">
                            <button class="amount-btn plus-btn">+</button>
                        </div>
                        <div class="resource-info">
                            <span>最多可赠送：${maxAmount} ${icon}</span>
                        </div>
                    </div>
                `;
                
                // 绑定按钮事件
                const input = area.querySelector('.resource-amount-input');
                const minusBtn = area.querySelector('.minus-btn');
                const plusBtn = area.querySelector('.plus-btn');
                
                minusBtn.addEventListener('click', () => {
                    const val = parseInt(input.value) || 1;
                    if (val > 1) input.value = val - 1;
                });
                
                plusBtn.addEventListener('click', () => {
                    const val = parseInt(input.value) || 1;
                    if (val < maxAmount) input.value = val + 1;
                });
                
                input.addEventListener('input', () => {
                    let val = parseInt(input.value) || 0;
                    if (val < 1) val = 1;
                    if (val > maxAmount) val = maxAmount;
                    input.value = val;
                });
                
            } else if (type === 'photo') {
                if (this.gameState.photos.length === 0) {
                    area.innerHTML = '<p class="no-items">没有可赠送的照片</p>';
                } else {
                    area.innerHTML = `
                        <div class="item-list">
                            ${this.gameState.photos.map((photo, index) => `
                                <div class="item-card" data-index="${index}">
                                    <span class="item-icon">${photo.icon}</span>
                                    <div class="item-info">
                                        <div class="item-name">${photo.name}</div>
                                        <div class="item-desc">${photo.date}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    
                    // 绑定选择事件
                    area.querySelectorAll('.item-card').forEach(card => {
                        card.addEventListener('click', () => {
                            area.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
                            card.classList.add('selected');
                            selectedData = parseInt(card.dataset.index);
                        });
                    });
                }
            } else if (type === 'souvenir') {
                if (this.gameState.souvenirs.length === 0) {
                    area.innerHTML = '<p class="no-items">没有可赠送的纪念品</p>';
                } else {
                    area.innerHTML = `
                        <div class="item-list">
                            ${this.gameState.souvenirs.map((souvenir, index) => `
                                <div class="item-card" data-index="${index}">
                                    <span class="item-icon">${souvenir.icon}</span>
                                    <div class="item-info">
                                        <div class="item-name">${souvenir.name}</div>
                                        <div class="item-desc">${souvenir.date}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    
                    // 绑定选择事件
                    area.querySelectorAll('.item-card').forEach(card => {
                        card.addEventListener('click', () => {
                            area.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
                            card.classList.add('selected');
                            selectedData = parseInt(card.dataset.index);
                        });
                    });
                }
            }
        };
        
        // 初始化显示
        updateSelectionArea('sunlight');
        
        // 礼物类型切换
        dialog.querySelectorAll('.gift-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                dialog.querySelectorAll('.gift-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateSelectionArea(btn.dataset.type);
            });
        });
        
        // 关闭弹窗
        const closeDialog = () => {
            dialog.remove();
        };
        
        dialog.querySelector('.gift-dialog-close').addEventListener('click', closeDialog);
        dialog.querySelector('.cancel-btn').addEventListener('click', closeDialog);
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) closeDialog();
        });
        
        // 确认赠送
        dialog.querySelector('.confirm-btn').addEventListener('click', () => {
            let gift = null;
            
            if (selectedType === 'sunlight' || selectedType === 'starlight') {
                const input = dialog.querySelector('.resource-amount-input');
                const amount = parseInt(input.value) || 0;
                const maxAmount = selectedType === 'sunlight' ? this.gameState.sunlight : this.gameState.starlight;
                
                if (amount <= 0 || amount > maxAmount) {
                    this.showNotification(`${selectedType === 'sunlight' ? '阳光露珠' : '星光'}不足`);
                    return;
                }
                
                if (selectedType === 'sunlight') {
                    this.gameState.sunlight -= amount;
                } else {
                    this.gameState.starlight -= amount;
                }
                
                gift = { 
                    type: 'resource', 
                    resourceType: selectedType, 
                    amount: amount 
                };
                
            } else if (selectedType === 'photo') {
                if (selectedData === null) {
                    this.showNotification('请选择要赠送的照片');
                    return;
                }
                const photo = this.gameState.photos.splice(selectedData, 1)[0];
                gift = { type: 'item', category: 'photo', item: photo };
                
            } else if (selectedType === 'souvenir') {
                if (selectedData === null) {
                    this.showNotification('请选择要赠送的纪念品');
                    return;
                }
                const souvenir = this.gameState.souvenirs.splice(selectedData, 1)[0];
                gift = { type: 'item', category: 'souvenir', item: souvenir };
            }
            
            if (!gift) return;
            
            // 发送赠送请求
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'send_gift',
                    targetUsername: username,
                    gift: gift
                }));
                this.showNotification(`已向 ${friend.nickname} 赠送礼物`);
                this.updateUI();
                this.saveGameState();
                closeDialog();
            } else {
                this.showNotification('网络未连接，无法赠送');
            }
        });
    }

    renderSharedLocations() {
        const container = document.getElementById('shared-locations');
        if (!container) return;
        
        container.innerHTML = '';

        // 过滤掉无效的数据 (修复之前可能产生的 undefined 数据)
        this.gameState.sharedLocations = this.gameState.sharedLocations.filter(loc => loc && loc.code && loc.name);

        // 去重：相同地点+相同分享者只保留最新的一条
        const uniqueMap = new Map();
        this.gameState.sharedLocations.forEach(loc => {
            // 使用 sharedByUsername 或 sharedBy（兼容旧数据）
            const username = loc.sharedByUsername || loc.sharedBy;
            const key = `${loc.code}-${username}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, loc);
            }
        });
        const uniqueLocations = Array.from(uniqueMap.values());

        if (uniqueLocations.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">还没有分享的地点</p>';
            return;
        }

        uniqueLocations.forEach(location => {
            const card = document.createElement('div');
            card.className = 'location-card';
            card.innerHTML = `
                <div class="location-code">${location.code}</div>
                <div style="font-size: 24px; margin: 10px 0;">${location.icon}</div>
                <div style="font-weight: 600; margin-bottom: 5px;">${location.name}</div>
                <div class="location-desc">${location.description}</div>
                <div style="font-size: 11px; color: #999; margin-top: 10px;">由 ${location.sharedBy} 分享 · ${location.date}</div>
            `;
            card.addEventListener('click', () => {
                // 使用该地点
                this.useSharedLocation(location);
            });
            container.appendChild(card);
        });
    }

    useSharedLocation(location) {
        this.showNotification(`已记录地点：${location.name}，主角下次旅行可能会去那里！`);
    }

    playBedtimeStory() {
        if (!this.gameState.isNightMode) {
            this.showNotification('只有在夜晚才能听晚安故事哦~');
            return;
        }

        const stories = [
            '今天，小狐狸走过了一片开满樱花的山谷，花瓣如雪般飘落，它在那里遇到了一只会唱歌的小鸟...',
            '在星空下，小狐狸发现了一颗会发光的石头，它把石头带回了家，放在窗台上，整个房间都亮了起来...',
            '小狐狸来到了一个神秘的湖边，湖水倒映着彩虹，它在湖边坐了很久，感受着这份宁静...'
        ];

        const story = stories[Math.floor(Math.random() * stories.length)];
        this.showNotification(`📖 ${story}`, 5000);
    }

    enterSleepMode() {
        if (!this.gameState.isNightMode) {
            this.showNotification('只有在夜晚才能进入睡眠模式哦~');
            return;
        }

        document.getElementById('sleep-mode').style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // 显示定时器选择
        this.showSleepTimerDialog();
    }
    
    // 显示睡眠定时器选择对话框
    showSleepTimerDialog() {
        const timerOptions = [
            { label: '15分钟', minutes: 15 },
            { label: '30分钟', minutes: 30 },
            { label: '45分钟', minutes: 45 },
            { label: '60分钟', minutes: 60 },
            { label: '不限时', minutes: 0 }
        ];
        
        const dialog = document.createElement('div');
        dialog.className = 'sleep-timer-dialog';
        dialog.innerHTML = `
            <div class="sleep-timer-content">
                <h3>选择睡眠音乐定时</h3>
                <div class="timer-options">
                    ${timerOptions.map(opt => `
                        <button class="timer-option-btn" data-minutes="${opt.minutes}">
                            ${opt.label}
                        </button>
                    `).join('')}
                </div>
                <button class="timer-cancel-btn">取消</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 绑定事件
        dialog.querySelectorAll('.timer-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const minutes = parseInt(btn.dataset.minutes);
                this.playSleepMusic(minutes);
                dialog.remove();
                if (minutes > 0) {
                    this.showNotification(`🎵 睡眠音乐将在 ${minutes} 分钟后自动停止`);
                }
            });
        });
        
        dialog.querySelector('.timer-cancel-btn').addEventListener('click', () => {
            dialog.remove();
        });
    }

    exitSleepMode() {
        document.getElementById('sleep-mode').style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // 停止睡眠音乐
        this.stopSleepMusic();
        
        // 生成梦境
        this.generateDream();
    }

    generateDream() {
        const dreams = [
            {
                icon: '🌙',
                name: '月夜飞行',
                text: '在梦中，小狐狸骑着月光飞翔，穿越云层，看到了银色的天空之城...'
            },
            {
                icon: '⭐',
                name: '星座之旅',
                text: '在梦中，星星们变成了发光的阶梯，小狐狸沿着它们攀登，遇见了住在星座里的精灵...'
            },
            {
                icon: '💫',
                name: '流星许愿',
                text: '在梦中，无数流星划过夜空，每一颗都带着别人的愿望，小狐狸帮忙送达...'
            },
            {
                icon: '✨',
                name: '魔法森林',
                text: '在梦中，森林里的树木都会说话，它们邀请小狐狸参加月光下的舞会...'
            },
            {
                icon: '🌟',
                name: '彩虹之巅',
                text: '在梦中，小狐狸沿着彩虹爬到尽头，发现那里有一座七彩糖果城堡...'
            },
            {
                icon: '🌠',
                name: '时光之河',
                text: '在梦中，小狐狸坐着荷叶船顺流而下，河水倒映着过去和未来的画面...'
            },
            {
                icon: '🦋',
                name: '蝴蝶梦境',
                text: '在梦中，小狐狸变成了一只蝴蝶，在花海中自由飞舞，品尝花蜜的甘甜...'
            },
            {
                icon: '🌸',
                name: '樱花雨',
                text: '在梦中，漫天飞舞的樱花花瓣变成了粉色的音符，演奏着春天的乐章...'
            },
            {
                icon: '🎐',
                name: '风铃之声',
                text: '在梦中，天空中飘浮着无数风铃，它们的声音交织成美妙的旋律...'
            },
            {
                icon: '🏰',
                name: '云端城堡',
                text: '在梦中，小狐狸发现了一座建在云朵上的城堡，里面住着友善的云精灵...'
            },
            {
                icon: '🌊',
                name: '深海奇遇',
                text: '在梦中，小狐狸能在海底自由呼吸，与发光的鱼群一起游弋，探索沉没的宝藏...'
            },
            {
                icon: '🎨',
                name: '画中世界',
                text: '在梦中，小狐狸走进了一幅画里，一切都变成了水彩的颜色，可以随意涂改现实...'
            },
            {
                icon: '📚',
                name: '故事之书',
                text: '在梦中，小狐狸进入了一本魔法书，在书页间穿梭，经历了无数冒险故事...'
            },
            {
                icon: '🎪',
                name: '马戏团之夜',
                text: '在梦中，森林里的动物们组成了马戏团，小狐狸成为了空中飞人表演者...'
            },
            {
                icon: '🎭',
                name: '面具舞会',
                text: '在梦中，小狐狸参加了神秘的假面舞会，所有人都戴着华丽的面具翩翩起舞...'
            },
            {
                icon: '🔮',
                name: '水晶球预言',
                text: '在梦中，小狐狸遇到了一位占卜师，水晶球里显现出未来的许多可能...'
            },
            {
                icon: '🎹',
                name: '音乐盒世界',
                text: '在梦中，小狐狸变小了，进入了一个巨大的音乐盒，里面的齿轮和发条构成了奇妙世界...'
            },
            {
                icon: '🍃',
                name: '四季轮转',
                text: '在梦中，小狐狸亲眼看到了四季快速变换，春夏秋冬在几分钟内轮回...'
            },
            {
                icon: '🎆',
                name: '烟花之城',
                text: '在梦中，整座城市都是由烟花构成的，房屋、道路、树木都在绽放着光芒...'
            },
            {
                icon: '🌈',
                name: '七色之门',
                text: '在梦中，小狐狸发现了七扇彩色的门，每扇门后都是一个不同的奇幻世界...'
            }
        ];
        
        const selectedDream = dreams[Math.floor(Math.random() * dreams.length)];
        const dream = {
            id: Date.now(),
            icon: selectedDream.icon,
            name: selectedDream.name,
            date: new Date().toLocaleDateString('zh-CN'),
            text: selectedDream.text
        };

        this.gameState.dreams.push(dream);
        this.gameState.lastDreamDate = new Date().toDateString();
        
        // 显示梦境预览
        const preview = document.getElementById('dream-preview');
        document.getElementById('dream-image').textContent = dream.icon;
        document.getElementById('dream-text').textContent = dream.text;
        preview.style.display = 'block';
        
        this.saveGameState();
    }

    updateUI() {
        document.getElementById('sunlight-count').textContent = this.gameState.sunlight;
        document.getElementById('starlight-count').textContent = this.gameState.starlight;

        // 更新主角状态
        if (this.gameState.characterState === 'home') {
            document.getElementById('character-status').textContent = '在家';
        } else if (this.gameState.characterState === 'returned') {
            setTimeout(() => {
                this.gameState.characterState = 'home';
                document.getElementById('character-status').textContent = '在家';
            }, 5000);
        }
    }

    showNotification(message, duration = 2000) {
        const notification = document.getElementById('notification');
        document.getElementById('notification-text').textContent = message;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, duration);
    }

    startGameLoop() {
        setInterval(() => {
            this.checkTravelStatus();
            this.checkTimeOfDay();
            this.updateResourceDisplay(); // 定期检查资源冷却状态
        }, 1000);
    }

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
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'save_game',
                gameState: this.gameState
            }));
        } else {
            console.warn('WebSocket未连接，无法保存游戏数据');
        }
    }

    // 显示离线收益弹窗
    showOfflineRewardsDialog(rewards) {
        const hours = Math.floor(rewards.offlineHours);
        const minutes = Math.floor((rewards.offlineHours - hours) * 60);
        
        let timeText = '';
        if (hours > 0) {
            timeText = `${hours}小时${minutes}分钟`;
        } else {
            timeText = `${minutes}分钟`;
        }
        
        // 应用离线收益
        this.gameState.sunlight += rewards.sunlight;
        this.gameState.starlight += rewards.starlight;
        this.updateUI();
        this.saveGameState();
        
        // 显示弹窗
        const dialog = document.createElement('div');
        dialog.className = 'offline-rewards-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay"></div>
            <div class="dialog-content">
                <div class="dialog-header">
                    <h2>🎁 欢迎回来！</h2>
                </div>
                <div class="dialog-body">
                    <p class="offline-time">离线时间：${timeText}</p>
                    <div class="rewards-list">
                        <div class="reward-item">
                            <span class="reward-icon">☀️</span>
                            <span class="reward-text">阳光露珠</span>
                            <span class="reward-amount">+${rewards.sunlight}</span>
                        </div>
                        <div class="reward-item">
                            <span class="reward-icon">✨</span>
                            <span class="reward-text">星光</span>
                            <span class="reward-amount">+${rewards.starlight}</span>
                        </div>
                    </div>
                    <p class="offline-tip">💡 小狐狸在你离开时也没闲着哦！</p>
                </div>
                <div class="dialog-footer">
                    <button class="dialog-btn" id="close-rewards-dialog">领取奖励</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 绑定关闭事件
        document.getElementById('close-rewards-dialog').addEventListener('click', () => {
            dialog.remove();
        });
        
        // 点击遮罩也可关闭
        dialog.querySelector('.dialog-overlay').addEventListener('click', () => {
            dialog.remove();
        });
    }

    loadGameState() {
        // 访客模式：从 localStorage 加载
        if (this.currentUser.isGuest) {
            const savedData = localStorage.getItem(`guest_game_${this.currentUser.username}`);
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    this.gameState = { ...this.gameState, ...parsed.gameState };
                    console.log('📂 访客数据已从本地加载');
                    
                    // 计算离线收益
                    const offlineRewards = this.calculateGuestOfflineRewards(parsed.lastSave);
                    if (offlineRewards && (offlineRewards.sunlight > 0 || offlineRewards.starlight > 0)) {
                        this.showOfflineRewardsDialog(offlineRewards);
                    }
                } catch (e) {
                    console.error('访客数据加载失败:', e);
                }
            } else {
                console.log('🆕 新访客，创建初始数据');
            }
            return;
        }
        
        // 注册用户：游戏状态从服务器加载
        // WebSocket连接成功后会自动接收服务器数据
        console.log('等待服务器加载游戏数据...');
    }
    
    // 计算访客的离线收益
    calculateGuestOfflineRewards(lastSave) {
        if (!lastSave) return null;
        
        const now = Date.now();
        const offlineTime = now - lastSave;
        const offlineHours = offlineTime / (1000 * 60 * 60);
        
        // 每小时生成 360 点（每10秒1点）
        const sunlightPerHour = 360;
        const starlightPerHour = 360;
        
        // 最多累积12小时
        const effectiveHours = Math.min(offlineHours, 12);
        
        if (effectiveHours < 0.1) return null; // 少于6分钟不显示
        
        return {
            offlineHours: effectiveHours,
            sunlight: Math.floor(sunlightPerHour * effectiveHours),
            starlight: Math.floor(starlightPerHour * effectiveHours)
        };
    }
    
    // ==================== 音乐系统 ====================
    
    // 初始化音乐系统
    initMusicSystem() {
        console.log('🎵 初始化音乐系统');
        
        // 创建背景音乐音频对象
        this.currentBgm = new Audio();
        this.currentBgm.volume = 0.3; // 背景音乐音量30%
        this.currentBgm.loop = false; // 不自动循环，手动控制
        
        // 监听音乐播放结束事件
        this.currentBgm.addEventListener('ended', () => {
            this.playNextBgm();
        });
        
        // 监听音乐加载错误
        this.currentBgm.addEventListener('error', (e) => {
            console.error('背景音乐加载失败:', e);
        });
        
        // 根据当前时间播放对应的背景音乐
        if (this.musicEnabled) {
            this.playBgmForTimeOfDay();
        }
        
        // 更新音乐按钮状态
        this.updateMusicButton();
    }
    
    // 播放适合当前时间的背景音乐
    playBgmForTimeOfDay() {
        if (!this.musicEnabled) return;
        
        const musicType = this.gameState.isNightMode ? 'night' : 'day';
        this.playBgm(musicType, 0);
    }
    
    // 播放背景音乐
    playBgm(type, index = 0) {
        if (!this.musicEnabled) return;
        
        const tracks = this.musicTracks[type];
        if (!tracks || tracks.length === 0) {
            console.warn('没有找到音乐轨道:', type);
            return;
        }
        
        // 保存当前音乐类型和索引
        this.currentBgmType = type;
        this.currentBgmIndex = index % tracks.length;
        
        // 设置音乐路径
        this.currentBgm.src = tracks[this.currentBgmIndex];
        
        // 播放音乐
        this.currentBgm.play()
            .then(() => {
                console.log(`🎵 正在播放 ${type} 音乐:`, tracks[this.currentBgmIndex]);
            })
            .catch(e => {
                console.error('播放音乐失败:', e);
            });
    }
    
    // 播放下一首背景音乐
    playNextBgm() {
        if (!this.musicEnabled || !this.currentBgmType) return;
        
        const nextIndex = this.currentBgmIndex + 1;
        this.playBgm(this.currentBgmType, nextIndex);
    }
    
    // 停止背景音乐
    stopBgm() {
        if (this.currentBgm) {
            this.currentBgm.pause();
            this.currentBgm.currentTime = 0;
        }
    }
    
    // 切换音乐开关
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem('musicEnabled', this.musicEnabled);
        
        if (this.musicEnabled) {
            // 开启音乐
            this.playBgmForTimeOfDay();
            this.showNotification('🎵 音乐已开启');
        } else {
            // 关闭音乐
            this.stopBgm();
            this.stopSleepMusic();
            this.showNotification('🔇 音乐已静音');
        }
        
        this.updateMusicButton();
    }
    
    // 更新音乐按钮显示
    updateMusicButton() {
        const btn = document.getElementById('music-toggle-btn');
        if (!btn) return;
        
        if (this.musicEnabled) {
            btn.innerHTML = '🎵';
            btn.title = '点击静音';
            btn.classList.remove('muted');
        } else {
            btn.innerHTML = '🔇';
            btn.title = '点击开启音乐';
            btn.classList.add('muted');
        }
    }
    
    // 播放睡眠音乐（带定时器）
    playSleepMusic(minutes = 0) {
        if (!this.musicEnabled) return;
        
        // 停止背景音乐
        this.stopBgm();
        
        // 创建睡眠音乐对象（如果不存在）
        if (!this.sleepMusic) {
            this.sleepMusic = new Audio();
            this.sleepMusic.volume = 0.2; // 睡眠音乐音量20%
            this.sleepMusic.loop = false;
            
            // 监听播放结束，自动播放下一首
            this.sleepMusic.addEventListener('ended', () => {
                this.playNextSleepMusic();
            });
            
            this.sleepMusic.addEventListener('error', (e) => {
                console.error('睡眠音乐加载失败:', e);
            });
        }
        
        // 随机选择一首睡眠音乐
        this.currentSleepMusicIndex = Math.floor(Math.random() * this.musicTracks.sleep.length);
        this.sleepMusic.src = this.musicTracks.sleep[this.currentSleepMusicIndex];
        
        // 播放
        this.sleepMusic.play()
            .then(() => {
                console.log('🎵 正在播放睡眠音乐:', this.musicTracks.sleep[this.currentSleepMusicIndex]);
            })
            .catch(e => {
                console.error('播放睡眠音乐失败:', e);
            });
        
        // 设置定时器（如果指定了分钟数）
        if (minutes > 0) {
            // 清除旧的定时器
            if (this.sleepMusicTimer) {
                clearTimeout(this.sleepMusicTimer);
            }
            
            // 设置新的定时器
            this.sleepMusicTimer = setTimeout(() => {
                this.stopSleepMusic();
                console.log('⏰ 睡眠音乐定时结束');
            }, minutes * 60 * 1000);
            
            console.log(`⏰ 睡眠音乐将在 ${minutes} 分钟后自动停止`);
        }
    }
    
    // 播放下一首睡眠音乐
    playNextSleepMusic() {
        if (!this.musicEnabled || !this.sleepMusic) return;
        
        this.currentSleepMusicIndex = (this.currentSleepMusicIndex + 1) % this.musicTracks.sleep.length;
        this.sleepMusic.src = this.musicTracks.sleep[this.currentSleepMusicIndex];
        this.sleepMusic.play().catch(e => console.error('播放下一首睡眠音乐失败:', e));
    }
    
    // 停止睡眠音乐
    stopSleepMusic() {
        if (this.sleepMusic) {
            this.sleepMusic.pause();
            this.sleepMusic.currentTime = 0;
        }
        
        // 清除定时器
        if (this.sleepMusicTimer) {
            clearTimeout(this.sleepMusicTimer);
            this.sleepMusicTimer = null;
        }
        
        // 恢复背景音乐
        if (this.musicEnabled) {
            this.playBgmForTimeOfDay();
        }
    }
    
    // 显示音乐引导提示
    showMusicGuide() {
        // 如果已经显示过引导，不再显示
        if (localStorage.getItem('musicGuideShown') === 'true') {
            return;
        }
        
        // 如果音乐已开启，也不显示引导
        if (this.musicEnabled) {
            return;
        }
        
        // 创建引导提示
        const guide = document.createElement('div');
        guide.className = 'music-guide';
        guide.innerHTML = `
            <div class="music-guide-arrow">▼</div>
            <div class="music-guide-text">点击开启背景音乐</div>
        `;
        
        // 添加到页面
        const statusBar = document.querySelector('.status-bar');
        if (statusBar) {
            statusBar.appendChild(guide);
        }
        
        // 5秒后自动消失
        const hideGuide = () => {
            guide.classList.add('fade-out');
            setTimeout(() => {
                guide.remove();
            }, 300);
            localStorage.setItem('musicGuideShown', 'true');
        };
        
        setTimeout(hideGuide, 5000);
        
        // 点击音乐按钮时立即隐藏
        const musicBtn = document.getElementById('music-toggle-btn');
        if (musicBtn) {
            musicBtn.addEventListener('click', hideGuide, { once: true });
        }
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    window.game = new IdleGame();
});

