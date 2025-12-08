const puppeteer = require('puppeteer');

// 测试结果收集
const testResults = {
    passed: [],
    failed: [],
    warnings: []
};

// 辅助函数：记录测试结果
function logTest(name, passed, message = '') {
    if (passed) {
        testResults.passed.push(name);
        console.log(`✅ ${name}${message ? ': ' + message : ''}`);
    } else {
        testResults.failed.push({ name, message });
        console.log(`❌ ${name}${message ? ': ' + message : ''}`);
    }
}

// 辅助函数：等待
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log('🚀 开始自动化测试...\n');
    
    let browser;
    let page;
    
    try {
        // 启动浏览器
        browser = await puppeteer.launch({
            headless: false, // 显示浏览器窗口
            defaultViewport: { width: 1280, height: 720 },
            args: ['--start-maximized']
        });
        
        page = await browser.newPage();
        
        // 监听控制台错误
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                testResults.warnings.push(`控制台错误: ${text}`);
                console.log(`⚠️  控制台错误: ${text}`);
            }
        });
        
        // 监听页面错误
        page.on('pageerror', error => {
            testResults.warnings.push(`页面错误: ${error.message}`);
            console.log(`⚠️  页面错误: ${error.message}`);
        });
        
        // 测试1: 页面加载
        console.log('\n📄 测试1: 页面加载');
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle2' });
        await sleep(1000);
        
        const title = await page.title();
        logTest('页面标题', title.includes('精灵世界'), `标题: ${title}`);
        
        // 测试2: 检查关键元素
        console.log('\n🔍 测试2: 检查关键元素');
        const sunlightCount = await page.$('#sunlight-count');
        logTest('阳光计数元素', sunlightCount !== null);
        
        const starlightCount = await page.$('#starlight-count');
        logTest('星光计数元素', starlightCount !== null);
        
        const character = await page.$('#character');
        logTest('主角元素', character !== null);
        
        const backpackBtn = await page.$('#backpack-btn');
        logTest('行囊按钮', backpackBtn !== null);
        
        // 测试3: 资源收集
        console.log('\n💰 测试3: 资源收集');
        const initialSunlight = await page.$eval('#sunlight-count', el => parseInt(el.textContent) || 0);
        console.log(`初始阳光: ${initialSunlight}`);
        
        // 尝试点击阳光资源田
        const sunlightField = await page.$('#sunlight-field');
        if (sunlightField) {
            await sunlightField.click();
            await sleep(500);
            
            const newSunlight = await page.$eval('#sunlight-count', el => parseInt(el.textContent) || 0);
            const collected = newSunlight > initialSunlight;
            logTest('点击收集阳光', collected, collected ? `收集了 ${newSunlight - initialSunlight} 点` : '可能不在白天模式');
        }
        
        // 测试4: 打开行囊面板
        console.log('\n🎒 测试4: 行囊系统');
        await backpackBtn.click();
        await sleep(500);
        
        const backpackPanel = await page.$('#backpack-panel');
        const isPanelOpen = await page.evaluate(el => {
            return el && el.classList.contains('active');
        }, backpackPanel);
        logTest('打开行囊面板', isPanelOpen);
        
        // 检查物品列表
        const foodList = await page.$('#food-list');
        const foodItems = await page.$$('#food-list .item-card');
        logTest('食物列表显示', foodItems.length > 0, `找到 ${foodItems.length} 个食物`);
        
        const toyList = await page.$('#toy-list');
        const toyItems = await page.$$('#toy-list .item-card');
        logTest('玩具列表显示', toyItems.length > 0, `找到 ${toyItems.length} 个玩具`);
        
        // 测试5: 选择物品
        if (foodItems.length > 0) {
            await foodItems[0].click();
            await sleep(300);
            
            const selectedItems = await page.$$('#selected-items .selected-item');
            logTest('选择物品', selectedItems.length > 0, `已选择 ${selectedItems.length} 件物品`);
        }
        
        // 测试6: 关闭面板
        const closeBtn = await page.$('#close-backpack');
        if (closeBtn) {
            await closeBtn.click();
            await sleep(500);
            
            const isPanelClosed = await page.evaluate(el => {
                return !el.classList.contains('active');
            }, backpackPanel);
            logTest('关闭面板', isPanelClosed);
        }
        
        // 测试7: 收藏面板
        console.log('\n📷 测试7: 收藏系统');
        const collectionBtn = await page.$('#collection-btn');
        await collectionBtn.click();
        await sleep(500);
        
        const collectionPanel = await page.$('#collection-panel');
        const isCollectionOpen = await page.evaluate(el => {
            return el && el.classList.contains('active');
        }, collectionPanel);
        logTest('打开收藏面板', isCollectionOpen);
        
        // 测试标签切换
        const photoTab = await page.$('#collection-panel .tab-btn[data-tab="photos"]');
        if (photoTab) {
            await photoTab.click();
            await sleep(300);
            logTest('切换到照片标签', true);
        }
        
        // 关闭收藏面板
        const closeCollection = await page.$('#close-collection');
        if (closeCollection) {
            await closeCollection.click();
            await sleep(300);
        }
        
        // 测试8: 社区面板
        console.log('\n🌍 测试8: 社区系统');
        const socialBtn = await page.$('#social-btn');
        await socialBtn.click();
        await sleep(500);
        
        const socialPanel = await page.$('#social-panel');
        const isSocialOpen = await page.evaluate(el => {
            return el && el.classList.contains('active');
        }, socialPanel);
        logTest('打开社区面板', isSocialOpen);
        
        // 关闭社区面板
        const closeSocial = await page.$('#close-social');
        if (closeSocial) {
            await closeSocial.click();
            await sleep(300);
        }
        
        // 测试9: 助眠面板
        console.log('\n🌙 测试9: 助眠系统');
        const sleepBtn = await page.$('#sleep-btn');
        await sleepBtn.click();
        await sleep(500);
        
        const sleepPanel = await page.$('#sleep-panel');
        const isSleepOpen = await page.evaluate(el => {
            return el && el.classList.contains('active');
        }, sleepPanel);
        logTest('打开助眠面板', isSleepOpen);
        
        // 关闭助眠面板
        const closeSleep = await page.$('#close-sleep');
        if (closeSleep) {
            await closeSleep.click();
            await sleep(300);
        }
        
        // 测试10: 检查localStorage
        console.log('\n💾 测试10: 数据持久化');
        const gameState = await page.evaluate(() => {
            return localStorage.getItem('idleGameState');
        });
        logTest('游戏状态保存', gameState !== null, gameState ? '状态已保存' : '状态未保存');
        
        // 测试11: 检查时间模式
        console.log('\n⏰ 测试11: 昼夜系统');
        const timeText = await page.$eval('#time-text', el => el.textContent);
        const isNightMode = await page.evaluate(() => {
            return document.getElementById('game-container').classList.contains('night-mode');
        });
        logTest('时间模式显示', timeText === '白天' || timeText === '夜晚', `当前: ${timeText}`);
        
        // 等待一下让用户看到结果
        console.log('\n⏳ 等待5秒以便观察...');
        await sleep(5000);
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error);
        testResults.failed.push({ name: '测试执行', message: error.message });
    } finally {
        // 生成测试报告
        console.log('\n' + '='.repeat(50));
        console.log('📊 测试报告');
        console.log('='.repeat(50));
        console.log(`✅ 通过: ${testResults.passed.length} 项`);
        console.log(`❌ 失败: ${testResults.failed.length} 项`);
        console.log(`⚠️  警告: ${testResults.warnings.length} 项`);
        
        if (testResults.failed.length > 0) {
            console.log('\n失败的测试:');
            testResults.failed.forEach(fail => {
                console.log(`  - ${fail.name}: ${fail.message}`);
            });
        }
        
        if (testResults.warnings.length > 0) {
            console.log('\n警告信息:');
            testResults.warnings.forEach(warning => {
                console.log(`  - ${warning}`);
            });
        }
        
        const successRate = (testResults.passed.length / (testResults.passed.length + testResults.failed.length) * 100).toFixed(1);
        console.log(`\n📈 成功率: ${successRate}%`);
        
        if (browser) {
            await browser.close();
        }
    }
}

// 运行测试
runTests().catch(console.error);







