# LLM Cost Optimizer for OpenClaw

[![OpenClaw Compatible](https://img.shields.io/badge/OpenClaw-Compatible-ff6b6b)](https://github.com/openclaw/openclaw)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](/LICENSE)
[![Status](https://img.shields.io/badge/status-Alpha-orange)](/LICENSE)

[English](#english) | [中文](#中文)

---

## English

**Status**: Alpha (core design complete, implementation in progress) | **License**: MIT | **Author**: maichanks

> ⚡ **One-Click Deploy**: `curl -fsSL https://raw.githubusercontent.com/maichanks/llm-cost-optimizer/main/deploy.js -o deploy.js && node deploy.js`
>
> Monitor, analyze, and reduce LLM API costs across providers. Features planned: token tracking, prompt compression, semantic caching, budget alerts. **Currently a design placeholder** — deploy to see development progress and roadmap.

**📊 Architecture ready** | 🆓 MIT | 🔜 In development | ⭐ OpenClaw compatible

### Features

- Token usage tracking per model
- Prompt compression heuristics
- Redis-based semantic caching
- Budget alerts (Slack/Feishu)
- CSV reports
- OpenClaw integration: send alerts to OpenClaw channels

### 🚀 One-Click Deploy

Run the automated deployment script:

```bash
curl -fsSL https://raw.githubusercontent.com/maichanks/llm-cost-optimizer/main/deploy.js -o deploy.js && node deploy.js
```

This will clone the repo, install dependencies, and create a `.env` file.

---


### Quick Start (Standalone)

```bash
git clone https://github.com/maichanks/llm-cost-optimizer.git
cd llm-cost-optimizer
pnpm install
cp .env.example .env
# Edit .env with your keys and alert settings
node scripts/analyze.js --input ./logs
node monitor.js
```

### OpenClaw Integration

You can run this as a background service and send budget alerts through OpenClaw:

1. **Install to OpenClaw skills** (optional, for unified management):

```bash
cp -r llm-cost-optimizer $HOME/.openclaw/workspace/skills/
cd $HOME/.openclaw/workspace/skills/llm-cost-optimizer
pnpm install
```

2. **Configure alert channel** in `.env`:

```env
ALERT_CHANNEL=feishu    # or telegram, slack
ALERT_TARGET=ou_OPEN_ID # your OpenClaw user/chat open_id
```

3. **Add cron for continuous monitoring** (runs in isolated session):

```bash
openclaw cron add \
  --name "LLM Cost Monitor" \
  --cron "*/30 * * * *" \
  --session isolated \
  --message "node $HOME/.openclaw/workspace/skills/llm-cost-optimizer/monitor.js"
```

The `monitor.js` script will check usage and send alerts via OpenClaw message API when budget thresholds are exceeded.

---

## 中文

**状态**: Alpha | **许可证**: MIT | **作者**: maichanks

用于监控、分析和降低多模型 LLM API 成本的实用工具集，可独立运行或与 OpenClaw 集成。

### 功能

- 按模型统计 token 消耗
- 提示词压缩启发式规则
- 基于 Redis 的语义缓存
- 预算告警（支持 Slack/飞书）
- CSV 报表导出
- OpenClaw 集成：告警可通过 OpenClaw 频道发送

### 快速开始（独立模式）

```bash
git clone https://github.com/maichanks/llm-cost-optimizer.git
cd llm-cost-optimizer
pnpm install
cp .env.example .env
# 编辑 .env 填入密钥和告警设置
node scripts/analyze.js --input ./logs
node monitor.js
```

### OpenClaw 集成

可将此工具作为后台服务运行，并通过 OpenClaw 发送预算告警：

1. **安装到 OpenClaw skills**（可选，统一管理）：

```bash
cp -r llm-cost-optimizer $HOME/.openclaw/workspace/skills/
cd $HOME/.openclaw/workspace/skills/llm-cost-optimizer
pnpm install
```

2. **配置告警频道** 在 `.env` 中：

```env
ALERT_CHANNEL=feishu    # 或 telegram, slack
ALERT_TARGET=ou_OPEN_ID # 你的 OpenClaw 用户/群组 open_id
```

3. **添加 cron 定时监控**（在独立会话运行）：

```bash
openclaw cron add \
  --name "LLM Cost Monitor" \
  --cron "*/30 * * * *" \
  --session isolated \
  --message "node $HOME/.openclaw/workspace/skills/llm-cost-optimizer/monitor.js"
```

`monitor.js` 脚本会检查使用情况，当超出预算阈值时通过 OpenClaw 消息 API 发送告警。

---

## 📝 Keywords

`openclaw`, `llm`, `cost-optimization`, `openrouter`, `budget-monitoring`, `token-tracking`, `semantic-caching`, `redis`, `prompt-compression`, `ai-cost`, `api-cost-management`

---

## 🔗 Related OpenClaw Projects

- [Smart Digest](https://github.com/maichanks/smart-digest) - AI-powered news digest for OpenClaw
- [OpenClaw GitHub Trending Notifier](https://github.com/maichanks/openclaw-github-trending) - GitHub trending notifications
- [Security Hardening for OpenClaw](https://github.com/maichanks/security-hardening) - Security toolkit
- [Multi-Platform Publisher](https://github.com/maichanks/multi-platform-publisher) - Multi-platform content publishing

---

## 📄 License

MIT © 2026 maichanks <hankan1993@gmail.com>
