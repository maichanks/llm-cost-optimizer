#!/usr/bin/env node
// LLM Cost Optimizer - Deploy script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'llm-cost-optimizer';
const REPO_URL = 'https://github.com/maichanks/llm-cost-optimizer.git';
const INSTALL_DIR = path.join(process.env.HOME || '/home/admin', '.openclaw', 'workspace', 'skills', PROJECT);

console.log(`💰 Deploying ${PROJECT}...`);

// 1. Clone
if (!fs.existsSync(INSTALL_DIR)) {
  console.log('📥 Cloning repository...');
  execSync(`git clone ${REPO_URL} "${INSTALL_DIR}"`, { stdio: 'inherit' });
} else {
  console.log('✅ Already exists, skipping clone');
}

// 2. Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('pnpm install', { cwd: INSTALL_DIR, stdio: 'inherit' });
} catch (e) {
  console.log('pnpm not found, trying npm...');
  execSync('npm install', { cwd: INSTALL_DIR, stdio: 'inherit' });
}

// 3. Copy .env example
const envExample = path.join(INSTALL_DIR, '.env.example');
const envTarget = path.join(INSTALL_DIR, '.env');
if (fs.existsSync(envExample) && !fs.existsSync(envTarget)) {
  console.log('🔧 Creating .env from example...');
  fs.copyFileSync(envExample, envTarget);
  console.log('⚠️ ACTION REQUIRED: Please edit .env:');
  console.log('   - OPENROUTER_API_KEY=your-key');
  console.log('   - ALERT_CHANNEL=feishu (or telegram/slack)');
  console.log('   - ALERT_TARGET=ou_OPEN_ID');
} else {
  console.log('✅ .env already exists');
}

// 4. Done
console.log('\n✅ Deployment complete!');
console.log('\n📝 Next steps:');
console.log(`   1. Review .env: ${envTarget}`);
console.log(`   2. Test: node ${path.join(INSTALL_DIR, 'monitor.js')}`);
console.log(`   3. Add to cron for continuous monitoring:`);
console.log(`      openclaw cron add --name "LLM Cost Monitor" --cron "*/30 * * * *" --session isolated --message "node ${ path.join(INSTALL_DIR, 'monitor.js') }"`);
