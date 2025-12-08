/**
 * 安全性测试脚本
 * 测试新的服务器端认证和数据存储系统
 */

const WebSocket = require('ws');

// 测试配置
const WS_URL = 'ws://localhost:8080';
let testsPassed = 0;
let testsFailed = 0;

// 工具函数：创建WebSocket连接
function createConnection() {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        ws.on('open', () => resolve(ws));
        ws.on('error', reject);
        
        // 5秒超时
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
}

// 工具函数：等待特定消息
function waitForMessage(ws, messageType, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for ${messageType}`));
        }, timeout);
        
        ws.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.type === messageType) {
                clearTimeout(timer);
                resolve(msg);
            }
        });
    });
}

// 测试1：注册新用户
async function testRegister() {
    console.log('\n🧪 测试1: 用户注册');
    try {
        const ws = await createConnection();
        // 生成短的随机用户名（4-10个字符）
        const randomNum = Math.floor(Math.random() * 1000000);
        const testUsername = `test${randomNum}`;
        const testNickname = '测试用户';
        const testPassword = 'test123456';
        
        // 发送注册请求
        ws.send(JSON.stringify({
            type: 'register',
            username: testUsername,
            nickname: testNickname,
            password: testPassword
        }));
        
        const response = await waitForMessage(ws, 'register_result');
        
        if (response.success) {
            console.log('✅ 注册成功');
            testsPassed++;
            ws.close();
            return { username: testUsername, password: testPassword, nickname: testNickname };
        } else {
            console.log(`❌ 注册失败: ${response.error}`);
            testsFailed++;
            ws.close();
            return null;
        }
    } catch (e) {
        console.log(`❌ 注册测试失败: ${e.message}`);
        testsFailed++;
        return null;
    }
}

// 测试2：用户登录
async function testLogin(username, password) {
    console.log('\n🧪 测试2: 用户登录');
    try {
        const ws = await createConnection();
        
        ws.send(JSON.stringify({
            type: 'login',
            username: username,
            password: password
        }));
        
        const response = await waitForMessage(ws, 'login_result');
        
        if (response.success && response.sessionId) {
            console.log('✅ 登录成功，获得sessionId');
            testsPassed++;
            ws.close();
            return response.sessionId;
        } else {
            console.log(`❌ 登录失败: ${response.error}`);
            testsFailed++;
            ws.close();
            return null;
        }
    } catch (e) {
        console.log(`❌ 登录测试失败: ${e.message}`);
        testsFailed++;
        return null;
    }
}

// 测试3：错误密码登录
async function testWrongPassword(username) {
    console.log('\n🧪 测试3: 错误密码登录（安全测试）');
    try {
        const ws = await createConnection();
        
        ws.send(JSON.stringify({
            type: 'login',
            username: username,
            password: 'wrongpassword'
        }));
        
        const response = await waitForMessage(ws, 'login_result');
        
        if (!response.success && response.error) {
            console.log('✅ 正确拒绝了错误密码');
            testsPassed++;
        } else {
            console.log('❌ 安全漏洞：错误密码被接受');
            testsFailed++;
        }
        ws.close();
    } catch (e) {
        console.log(`❌ 错误密码测试失败: ${e.message}`);
        testsFailed++;
    }
}

// 测试4：会话认证
async function testSessionAuth(sessionId) {
    console.log('\n🧪 测试4: 会话认证');
    try {
        const ws = await createConnection();
        
        ws.send(JSON.stringify({
            type: 'session_auth',
            sessionId: sessionId
        }));
        
        const response = await waitForMessage(ws, 'session_auth_result');
        
        if (response.success) {
            console.log('✅ 会话认证成功');
            testsPassed++;
            ws.close();
            return true;
        } else {
            console.log(`❌ 会话认证失败: ${response.error}`);
            testsFailed++;
            ws.close();
            return false;
        }
    } catch (e) {
        console.log(`❌ 会话认证测试失败: ${e.message}`);
        testsFailed++;
        return false;
    }
}

// 测试5：无效会话
async function testInvalidSession() {
    console.log('\n🧪 测试5: 无效会话（安全测试）');
    try {
        const ws = await createConnection();
        
        ws.send(JSON.stringify({
            type: 'session_auth',
            sessionId: 'invalid-session-id'
        }));
        
        const response = await waitForMessage(ws, 'session_auth_result');
        
        if (!response.success) {
            console.log('✅ 正确拒绝了无效会话');
            testsPassed++;
        } else {
            console.log('❌ 安全漏洞：无效会话被接受');
            testsFailed++;
        }
        ws.close();
    } catch (e) {
        console.log(`❌ 无效会话测试失败: ${e.message}`);
        testsFailed++;
    }
}

// 测试6：游戏数据保存
async function testSaveGame(sessionId) {
    console.log('\n🧪 测试6: 游戏数据保存');
    try {
        const ws = await createConnection();
        
        // 先进行会话认证
        ws.send(JSON.stringify({
            type: 'session_auth',
            sessionId: sessionId
        }));
        
        await waitForMessage(ws, 'session_auth_result');
        
        // 保存游戏数据（完整字段）
        const testGameState = {
            sunlight: 100,
            starlight: 50,
            characterState: 'home',
            travelStartTime: null,
            travelDuration: 0,
            selectedItems: [],
            photos: [{ id: 1, location: 'test' }],
            souvenirs: [],
            dreams: [],
            visitors: [],
            sharedLocations: [],
            lastDreamDate: null,
            isNightMode: false,
            sunlightCooldown: 0,
            starlightCooldown: 0,
            friends: [],
            friendRequests: []
        };
        
        ws.send(JSON.stringify({
            type: 'save_game',
            gameState: testGameState
        }));
        
        const response = await waitForMessage(ws, 'save_result');
        
        if (response.success) {
            console.log('✅ 游戏数据保存成功');
            testsPassed++;
        } else {
            console.log('❌ 游戏数据保存失败');
            testsFailed++;
        }
        ws.close();
    } catch (e) {
        console.log(`❌ 保存游戏测试失败: ${e.message}`);
        testsFailed++;
    }
}

// 测试7：访客登录
async function testGuestLogin() {
    console.log('\n🧪 测试7: 访客登录');
    try {
        const ws = await createConnection();
        
        ws.send(JSON.stringify({
            type: 'guest_login',
            guestId: `GUEST-TEST-${Date.now()}`,
            nickname: '测试访客'
        }));
        
        const response = await waitForMessage(ws, 'guest_login_result');
        
        if (response.success && response.guestId) {
            console.log('✅ 访客登录成功');
            testsPassed++;
        } else {
            console.log('❌ 访客登录失败');
            testsFailed++;
        }
        ws.close();
    } catch (e) {
        console.log(`❌ 访客登录测试失败: ${e.message}`);
        testsFailed++;
    }
}

// 测试8：输入验证
async function testInputValidation() {
    console.log('\n🧪 测试8: 输入验证（安全测试）');
    try {
        const ws = await createConnection();
        
        // 测试非法用户名
        ws.send(JSON.stringify({
            type: 'register',
            username: 'ab',  // 太短
            nickname: '测试',
            password: 'test123'
        }));
        
        const response = await waitForMessage(ws, 'register_result');
        
        if (!response.success) {
            console.log('✅ 正确拒绝了非法输入');
            testsPassed++;
        } else {
            console.log('❌ 安全漏洞：接受了非法输入');
            testsFailed++;
        }
        ws.close();
    } catch (e) {
        console.log(`❌ 输入验证测试失败: ${e.message}`);
        testsFailed++;
    }
}

// 运行所有测试
async function runAllTests() {
    console.log('=================================');
    console.log('🔐 开始安全性测试');
    console.log('=================================');
    
    // 测试1: 注册
    const userInfo = await testRegister();
    if (!userInfo) {
        console.log('\n❌ 无法继续测试，注册失败');
        return;
    }
    
    // 测试2: 登录
    const sessionId = await testLogin(userInfo.username, userInfo.password);
    if (!sessionId) {
        console.log('\n❌ 无法继续测试，登录失败');
        return;
    }
    
    // 测试3: 错误密码
    await testWrongPassword(userInfo.username);
    
    // 测试4: 会话认证
    await testSessionAuth(sessionId);
    
    // 测试5: 无效会话
    await testInvalidSession();
    
    // 测试6: 保存游戏
    await testSaveGame(sessionId);
    
    // 测试7: 访客登录
    await testGuestLogin();
    
    // 测试8: 输入验证
    await testInputValidation();
    
    // 输出测试结果
    console.log('\n=================================');
    console.log('📊 测试结果汇总');
    console.log('=================================');
    console.log(`✅ 通过: ${testsPassed}`);
    console.log(`❌ 失败: ${testsFailed}`);
    console.log(`📈 通过率: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    console.log('=================================\n');
    
    if (testsFailed === 0) {
        console.log('🎉 所有测试通过！安全性改进成功！');
    } else {
        console.log('⚠️  部分测试失败，请检查代码');
    }
}

// 主函数
async function main() {
    console.log('请确保服务器已启动在 ws://localhost:8080\n');
    
    try {
        await runAllTests();
        process.exit(0);
    } catch (e) {
        console.error('\n❌ 测试过程中发生错误:', e.message);
        process.exit(1);
    }
}

// 运行测试
main();

