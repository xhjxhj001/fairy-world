#!/usr/bin/env node

/**
 * 生成自签名 SSL 证书
 * 用于支持 HTTPS 和 WSS (安全 WebSocket) 连接
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sslDir = path.join(__dirname, 'ssl');
const certPath = path.join(sslDir, 'cert.pem');
const keyPath = path.join(sslDir, 'key.pem');

console.log('🔐 开始生成 SSL 自签名证书...\n');

// 创建 ssl 目录
if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir);
    console.log('✅ 已创建 ssl 目录');
}

// 检查是否已有证书
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log('⚠️  检测到已存在的证书文件');
    console.log('   cert.pem:', certPath);
    console.log('   key.pem:', keyPath);
    console.log('\n是否要覆盖现有证书？(y/n)');
    
    // 这里简化处理，直接覆盖
    console.log('   继续生成新证书...\n');
}

try {
    // 使用 openssl 生成自签名证书
    console.log('📝 正在生成证书...');
    
    const command = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log('\n✅ SSL 证书生成成功！\n');
    console.log('证书文件位置:');
    console.log('  📄 证书:', certPath);
    console.log('  🔑 私钥:', keyPath);
    console.log('\n⚠️  重要提示:');
    console.log('  1. 这是自签名证书，浏览器会显示"不安全"警告');
    console.log('  2. 在浏览器中需要手动接受证书才能访问');
    console.log('  3. 仅用于开发和测试环境，生产环境请使用正式证书');
    console.log('  4. 证书有效期为 365 天\n');
    console.log('🚀 现在可以使用 HTTPS 和 WSS 了！');
    console.log('   运行 node server.js 启动服务器\n');
    
} catch (error) {
    console.error('\n❌ 证书生成失败:', error.message);
    console.log('\n可能的原因:');
    console.log('  1. 系统未安装 openssl');
    console.log('  2. 权限不足');
    console.log('\n解决方案:');
    console.log('  macOS: 已预装 openssl');
    console.log('  Ubuntu/Debian: sudo apt-get install openssl');
    console.log('  Windows: 下载并安装 Win32 OpenSSL (https://slproweb.com/products/Win32OpenSSL.html)\n');
    process.exit(1);
}

