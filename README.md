# LLM Cost Optimizer

[English](#english) | [中文](#中文)

---

## English

**Status**: Alpha | **License**: MIT | **Author**: maichanks

Utilities to monitor, analyze, and reduce LLM API costs across providers.

### Features

- Token usage tracking per model
- Prompt compression heuristics
- Redis-based semantic caching
- Budget alerts (Slack/Feishu)
- CSV reports

### Quick Start

```bash
git clone https://github.com/maichanks/llm-cost-optimizer.git
cd llm-cost-optimizer
pnpm install
cp .env.example .env
# Edit .env with your keys
node scripts/analyze.js --input ./logs
node monitor.js
```

---

## 中文

**状态**: Alpha | **许可证**: MIT | **作者**: maichanks

用于监控、分析和降低多模型 LLM API 成本的实用工具集。

### 功能

- 按模型统计 token 消耗
- 提示词压缩启发式规则
- 基于 Redis 的语义缓存
- 预算告警（支持 Slack/飞书）
- CSV 报表导出

### 快速开始

```bash
git clone https://github.com/maichanks/llm-cost-optimizer.git
cd llm-cost-optimizer
pnpm install
cp .env.example .env
# 编辑 .env 填入密钥
node scripts/analyze.js --input ./logs
node monitor.js
```
