# LLM 成本优化器 - 架构设计文档

**版本**: 1.0  
**创建日期**: 2025-03-08  
**负责人**: Designer Agent  
**项目**: OpenClaw LLM Cost Optimizer

---

## 1. 项目概述

### 1.1 背景与目标
OpenClaw 用户每月 LLM API 费用普遍超过 $400，缺乏有效的成本控制手段。本项目旨在通过智能路由、缓存、压缩和监控技术，实现 **30-50% 的成本降低**，同时保持性能影响 ≤5%。

### 1.2 价值主张
- 降低 LLM 相关 API 调用成本
- 提升资源利用效率
- 透明的成本分析和预测
- 自动化的优化策略

### 1.3 核心指标
- **成本降低率**: ≥30%（实测基准）
- **性能影响**: ≤5% 响应时间增加
- **缓存命中率**: ≥40%
- **路由准确率**: ≥90%（选择最优成本模型）

---

## 2. 系统架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         客户端请求 (Client Requests)                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    网关层 / 中间件 (Gateway/Middleware)            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  请求拦截器 (Request Interceptor)                            │   │
│  │  - 请求解析  - 参数标准化  - 认证验证                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
┌───────────────────────────────┬─────────────────────────────────────┐
│          缓存层 (Caching Layer)        │      监控系统 (Monitoring)       │
│  ┌────────────────────────────┐  │  ┌────────────────────────────┐   │
│  │  L1: 内存缓存 (LRU/MRU)    │  │  │  指标收集 (Metrics)        │   │
│  │  - 热点数据缓存            │  │  │  - 请求计数  - 成本统计   │   │
│  │  - TTL 过期策略            │  │  │  - 延迟监控  - 命中率     │   │
│  │                            │  │  └────────────────────────────┘   │
│  │  L2: 分布式缓存 (Redis)   │  │              │                    │
│  │  - 跨实例共享              │  │              ▼                    │
│  │  - 持久化存储              │  │  ┌────────────────────────────┐   │
│  │  - 缓存同步                │  │  │  分析引擎 (Analytics)      │   │
│  │                            │  │  │  - 趋势分析  - 成本预测   │   │
│  │  L3: 结果缓存 (SQLite)    │  │  │  - A/B 测试  - 报告生成   │   │
│  │  - 查询结果缓存            │  │  └────────────────────────────┘   │
│  │  - 结构化存储              │  │                                   │
│  └────────────────────────────┘  └───────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                策略引擎 (Strategy Engine)                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  策略管理器 (Strategy Manager)                               │   │
│  │  - 策略注册/注销  - 策略优先级  - 策略组合                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │  缓存策略        │  │  路由策略        │  │  压缩策略        │   │
│  │  - TTL 调整      │  │  - 成本优先      │  │  - 批量压缩      │   │
│  │  - 预热策略      │  │  - 性能优先      │  │  - 上下文压缩    │   │
│  │  - 驱逐策略      │  │  - 混合策略      │  │  - 去重          │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                智能路由 (Intelligent Router)                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  路由决策引擎 (Router Core)                                  │   │
│  │  - 模型选择  - 端点路由  - 故障转移                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ OpenRouter   │  │  本地模型    │  │  第三方 API  │             │
│  │ 集成          │  │  Ollama      │  │  自定义端点  │             │
│  │ - 多模型      │  │  - 免费      │  │  - 企业专线  │             │
│  │ - 价格对比    │  │  - 低延迟    │  │  - 高可用    │             │
│  │ - 智能降级    │  │              │  │              │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                外部服务 (External Services)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │ OpenAI API      │  │ Anthropic API   │  │ Google Gemini   │    │
│  │ - GPT-4         │  │ - Claude        │  │ - Gemini Pro    │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │ OpenRouter      │  │ Local Ollama    │  │ Custom Endpoint │    │
│  │ - 统一路由       │  │ - Llama 2       │  │ - 私有部署      │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 核心组件详细设计

### 3.1 策略引擎 (Strategy Engine)

**职责**: 管理和执行成本优化策略，动态调整系统行为。

#### 3.1.1 策略管理器 (Strategy Manager)

```typescript
interface Strategy {
  id: string;
  name: string;
  type: 'caching' | 'routing' | 'compression' | 'monitoring';
  priority: number; // 1-10, 1 is highest
  config: Record<string, any>;
  enabled: boolean;
  conditions: Condition[]; // 激活条件
  actions: Action[]; // 执行动作
}

interface StrategyManager {
  register(strategy: Strategy): void;
  unregister(strategyId: string): void;
  activate(strategyId: string): void;
  deactivate(strategyId: string): void;
  evaluate(request: Request, context: Context): StrategyResult;
  combine(strategies: Strategy[]): CombinedStrategy;
}
```

#### 3.1.2 缓存策略

- **TTL 自适应调整**: 根据请求频率动态调整缓存时间
  - 高频请求 → 延长 TTL (最高 1 小时)
  - 低频请求 → 缩短 TTL (最低 60 秒)
- **预热策略**: 预测热点数据并提前缓存
- **驱逐策略**: LRU + LFU 混合算法
- **分层策略**: L1 (内存) → L2 (Redis) → L3 (SQLite)

#### 3.1.3 路由策略

- **成本优先**: 选择价格最低的可用模型
- **性能优先**: 选择延迟最低的模型（仅限非关键请求）
- **混合策略**: 权重 = α×成本 + β×性能 + γ×可用性
- **区域感知**: 选择地理上最近的端点以降低延迟

#### 3.1.4 压缩策略

- **批量压缩**: 将多个独立请求合并为批量请求
  - 最大批量大小: 10 个请求
  - 超时时间: 2 秒
- **上下文压缩**: 对对话历史进行摘要压缩
  - 保留最近 5 轮对话
  - 对更早的历史生成摘要
- **去重策略**: 识别并消除重复请求

### 3.2 智能路由 (Intelligent Router)

#### 3.2.1 路由决策引擎

```typescript
interface RoutingDecision {
  model: string;
  provider: string;
  estimatedCost: number;
  estimatedLatency: number;
  confidence: number;
  fallbackChain: string[]; // 降级链
}

interface Router {
  selectModel(request: Request, constraints: Constraints): Promise<RoutingDecision>;
  updateMetrics(provider: string, metrics: ProviderMetrics): void;
  getAvailableProviders(): Provider[];
  addProvider(provider: Provider): void;
  removeProvider(providerId: string): void;
}
```

#### 3.2.2 路由策略算法

**成本-性能综合评分**:
```
score = w1 × (1 - normalized_cost) + w2 × (1 - normalized_latency) + w3 × availability
```
其中权重可配置:
- 默认: w1=0.6 (成本), w2=0.3 (性能), w3=0.1 (可用性)
- 成本优先模式: w1=0.9, w2=0.05, w3=0.05
- 性能优先模式: w1=0.2, w2=0.75, w3=0.05

**实时价格监控**:
- 每 5 分钟从 OpenRouter API 获取最新价格
- 本地缓存价格表，TTL=5 分钟
- 价格变动超过 10% 时触发告警

**故障转移**:
1. 主选模型失败 → 立即选择备选链中的下一个
2. 连续失败 3 次 → 暂时屏蔽该提供商（10 分钟）
3. 所有提供商失败 → 返回错误，建议用户检查配置

#### 3.2.3 提供商集成

**OpenRouter 集成**:
```typescript
// 使用 OpenRouter SDK 或直接 API
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});
```
- 自动价格对比
- 统一 API 端点
- 内置故障转移

**本地模型 (Ollama)**:
- 无 API 成本
- 低延迟
- 适合非关键或开发场景

**第三方自定义端点**:
- 企业专线/私有部署
- 支持自定义认证
- 可配置权重和优先级

### 3.3 缓存层 (Cache Layer)

#### 3.3.1 多级缓存架构

```
┌─────────────────────────────────────────┐
│          应用层 (Application)            │
└─────────────────┬───────────────────────┘
                  │ 读取优先
                  ▼
┌─────────────────────────────────────────┐
│    L1: 内存缓存 (LRU/MRU)               │
│    - 容量: 1000 条记录                  │
│    - TTL: 动态 (60s-3600s)             │
│    - 命中后返回, 未命中 → L2           │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│    L2: 分布式缓存 (Redis)               │
│    - 容量: 10000+ 条记录                │
│    - TTL: 1-24 小时                    │
│    - 跨实例共享                         │
│    - 命中后返回, 未命中 → L3           │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│    L3: 持久化缓存 (SQLite)              │
│    - 容量: 无限制 (受磁盘限制)          │
│    - TTL: 1-7 天                       │
│    - 查询结果缓存                       │
│    - 统计分析用历史数据                 │
└─────────────────────────────────────────┘
```

#### 3.3.2 缓存键设计

```typescript
// Cache Key 格式: prefix:hash
const generateCacheKey = (request: Request): string => {
  const components = [
    'model',           // 使用的模型
    'prompt_hash',     // 提示词的 SHA256 哈希
    'params',          // 参数 (temperature, max_tokens, etc.)
    'timestamp_bucket' // 时间桶 (按小时/天分组)
  ];
  return `cache:${components.map(c => `${c}=${computeHash(request[c])}`).join(':')}`;
};
```

**示例**:
```
cache:model=gpt-4:prompt=abc123:params=temperature0.7_max1000:hour=20250308-03
```

#### 3.3.3 缓存策略配置

```yaml
caching:
  enabled: true
  levels:
    - name: memory
      type: lru
      capacity: 1000
      ttl_min: 60
      ttl_max: 3600
    - name: redis
      type: distributed
      capacity: 10000
      ttl_min: 3600
      ttl_max: 86400
      connection: ${REDIS_URL}
    - name: sqlite
      type: persistent
      ttl_min: 86400
      ttl_max: 604800
      db_path: ./data/cache.db
  invalidation:
    on_update: true  # 模型更新时清理相关缓存
    on_price_change: true  # 价格变动超过阈值时清理
```

#### 3.3.4 批处理缓存

- **聚合窗口**: 2 秒
- **最大批量**: 10 个请求
- **触发条件**: 相同模型 + 相同参数的请求
- **过期处理**: 超时后立即发送当前批次

### 3.4 监控系统 (Monitoring System)

#### 3.4.1 指标收集 (Metrics Collection)

```typescript
interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  labels: Record<string, string>;
  value: number;
  timestamp: Date;
}

interface MetricsCollector {
  increment(name: string, labels?: Record<string, string>): void;
  gauge(name: string, value: number, labels?: Record<string, string>): void;
  histogram(name: string, value: number, buckets?: number[], labels?: Record<string, string>): void;
  getAll(name?: string): Metric[];
  getSnapshot(): MetricsSnapshot;
}
```

#### 3.4.2 核心指标

**成本指标**:
- `llm_cost_total` (counter): 总成本 (美元)
- `llm_cost_by_model` (counter): 各模型成本
- `llm_cost_per_request` (histogram): 单次请求成本分布
- `estimated_savings` (gauge): 预估节省金额

**性能指标**:
- `request_count` (counter): 总请求数
- `request_duration` (histogram): 请求延迟分布 (P50, P95, P99)
- `cache_hit_rate` (gauge): 缓存命中率
- `batch_efficiency` (gauge): 批处理效率 (平均批量大小)

**路由指标**:
- `routes_total` (counter): 路由决策数
- `routes_by_model` (counter): 各模型使用次数
- `routing_errors` (counter): 路由错误数
- `fallback_rate` (gauge): 降级使用率

**系统指标**:
- `strategies_active` (gauge): 活跃策略数
- `queue_size` (gauge): 批处理队列大小
- `memory_usage` (gauge): 内存占用
- `cache_size` (gauge): 各缓存层级大小

#### 3.4.3 分析引擎 (Analytics Engine)

**成本分析**:
```typescript
interface CostAnalysis {
  period: 'daily' | 'weekly' | 'monthly';
  totalCost: number;
  projectedCost: number; // 未来 30 天预测
  savings: number;
  savingsPercentage: number;
  costByModel: Record<string, number>;
  costByTimeOfDay: Record<string, number>; // 按小时分组
  recommendations: string[]; // 优化建议
}
```

**趋势分析**:
- 请求量趋势 (按小时、日、周)
- 成本趋势与异常检测
- 模型使用占比变化
- 缓存命中率趋势

**A/B 测试**:
- 对比不同策略的效果
- 统计显著性检验
- 渐进式策略部署

#### 3.4.4 告警与通知

```yaml
alerts:
  - name: "成本超限"
    condition: "cost_last_24h > threshold * 1.2"
    threshold: 100  # 美元
    severity: critical
    actions: [notify_admin, auto_adjust_strategies]

  - name: "性能下降"
    condition: "p95_latency > baseline * 1.5"
    severity: warning
    actions: [log, notify]

  - name: "缓存命中率过低"
    condition: "cache_hit_rate < 0.3"
    severity: info
    actions: [log, adjust_ttl]
```

---

## 4. 数据流与交互

### 4.1 请求处理流程

```
1. 请求到达 → 请求拦截器
2. 检查缓存 (L1 → L2 → L3)
   - 命中: 返回缓存结果，记录命中指标
   - 未命中: 继续下一步
3. 策略引擎评估
   - 收集上下文 (请求特征、当前负载、成本状态)
   - 评估所有策略，生成策略结果
4. 智能路由决策
   - 根据策略结果选择模型和提供商
   - 考虑成本、延迟、可用性
5. 批处理检查
   - 是否可与其他请求合并
   - 加入批处理队列或立即发送
6. 发送请求 → 外部 LLM API
7. 响应处理
   - 记录成本、延迟
   - 存入缓存 (根据策略)
   - 更新指标
8. 返回结果给客户端
```

### 4.2 后台任务

**价格监控任务** (每 5 分钟):
- 从 OpenRouter 获取最新价格
- 更新本地价格表
- 检测价格变动，触发缓存失效

**策略优化任务** (每小时):
- 分析历史数据
- 调整策略参数 (TTL、批量大小等)
- 生成优化建议

**报告生成任务** (每日 00:00):
- 生成日/周/月成本报告
- 计算节省金额
- 发送邮件通知 (可选)

**缓存清理任务** (每 1 小时):
- 清理过期缓存
- 统计缓存使用情况
- 调整各层级容量

---

## 5. 存储设计

### 5.1 数据库 Schema (SQLite)

**缓存表 (cache_entries)**:
```sql
CREATE TABLE cache_entries (
  key TEXT PRIMARY KEY,
  value BLOB NOT NULL,
  model TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP,
  size_bytes INTEGER
);

CREATE INDEX idx_cache_expires ON cache_entries(expires_at);
CREATE INDEX idx_cache_model ON cache_entries(model);
```

**成本记录表 (cost_records)**:
```sql
CREATE TABLE cost_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  request_id TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd REAL NOT NULL,
  latency_ms INTEGER,
  cached BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_cost_timestamp ON cost_records(timestamp);
CREATE INDEX idx_cost_model ON cost_records(model);
```

**路由决策表 (routing_decisions)**:
```sql
CREATE TABLE routing_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  request_hash TEXT NOT NULL,
  selected_model TEXT NOT NULL,
  considered_models TEXT NOT NULL, -- JSON array
  decision_score REAL,
  reasoning TEXT,
  latency_ms INTEGER
);

CREATE INDEX idx_routing_timestamp ON routing_decisions(timestamp);
CREATE INDEX idx_routing_model ON routing_decisions(selected_model);
```

**策略执行表 (strategy_executions)**:
```sql
CREATE TABLE strategy_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  strategy_id TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  context TEXT, -- JSON with request features
  result TEXT -- outcome metrics
);

CREATE INDEX idx_strategy_timestamp ON strategy_executions(timestamp);
CREATE INDEX idx_strategy_id ON strategy_executions(strategy_id);
```

### 5.2 Redis Schema

**缓存键模式**:
```
cache:{model}:{prompt_hash} → response_value
locks:{request_hash} → 防重入锁
batch:{model}:{params} → 批处理队列
metrics:{type}:{timestamp} → 临时指标
prices:current → 当前价格表
```

---

## 6. API 设计

详细的 API 规范请参见 [`API.md`](./API.md)。

### 6.1 核心 API 端点

#### 6.1.1 Chat Completions (兼容 OpenAI 格式)

```
POST /v1/chat/completions
```

这是主 API 端点，与 OpenAI API 完全兼容，但会增加额外的优化逻辑。

**请求示例**:
```json
{
  "model": "gpt-4",
  "messages": [
    {"role": "user", "content": "Hello, world!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false
}
```

**响应**: 标准的 OpenAI 格式，额外 headers:
```
X-Cost-USD: 0.0023
X-Cache-Hit: true/false
X-Routed-Model: gpt-4-turbo-preview
X-Batch-Size: 1
```

#### 6.1.2 成本报告

```
GET /v1/cost/report?period=day&date=2025-03-07
```

返回指定时间段的成本分析报告。

#### 6.1.3 缓存管理

```
GET  /v1/cache/stats          # 缓存统计信息
POST /v1/cache/invalidate     # 手动失效缓存
GET  /v1/cache/entries        # 列出缓存条目 (管理员)
```

#### 6.1.4 策略管理

```
GET    /v1/strategies                    # 列出所有策略
POST   /v1/strategies                    # 创建新策略
PUT    /v1/strategies/:id                # 更新策略
DELETE /v1/strategies/:id                # 删除策略
POST   /v1/strategies/:id/activate       # 激活策略
POST   /v1/strategies/:id/deactivate     # 停用策略
```

#### 6.1.5 监控指标

```
GET /v1/metrics              # Prometheus 格式指标
GET /v1/health               # 健康检查
GET /v1/ready                # 就绪检查
```

---

## 7. 配置管理

### 7.1 配置文件格式

```yaml
# config/cost-optimizer.yaml
version: "1.0"

# 全局开关
enabled: true
mode: "production"  # development | staging | production

# 缓存配置
cache:
  enabled: true
  levels:
    - type: memory
      capacity: 1000
      ttl: 300
    - type: redis
      url: ${REDIS_URL}
      capacity: 10000
      ttl: 3600
    - type: sqlite
      path: "./data/cache.db"
      ttl: 86400

# 路由配置
routing:
  strategy: "adaptive"  # adaptive | cost-first | performance-first
  providers:
    - type: openrouter
      api_key: ${OPENROUTER_API_KEY}
      priority: 1
      weight: 1.0
    - type: ollama
      base_url: "http://localhost:11434"
      priority: 2
      weight: 0.5

# 批处理配置
batching:
  enabled: true
  window_ms: 2000
  max_batch_size: 10
  max_wait_ms: 100

# 监控配置
monitoring:
  metrics_enabled: true
  analytics_enabled: true
  reporting_interval: 3600
  retention_days: 90

# 策略配置
strategies:
  - id: "adaptive_ttl"
    type: "caching"
    enabled: true
    priority: 1
    config:
      min_ttl: 60
      max_ttl: 3600
      hit_rate_target: 0.4
```

### 7.2 环境变量

| 变量名 | 描述 | 默认值 | 必需 |
|--------|------|--------|------|
| `OPENROUTER_API_KEY` | OpenRouter API 密钥 | - | 是 |
| `REDIS_URL` | Redis 连接字符串 | - | 否 (可使用内存缓存) |
| `COST_OPTIMIZER_CONFIG` | 配置文件路径 | `./config/cost-optimizer.yaml` | 否 |
| `LOG_LEVEL` | 日志级别 | `info` | 否 |
| `METRICS_PORT` | 指标服务端口 | `9090` | 否 |
| `CACHE_DIR` | 缓存目录 | `./data` | 否 |

---

## 8. 部署架构

### 8.1 单节点部署 (开发/小规模)

```
┌─────────────────────────────────────────────┐
│           OpenClaw + cost-optimizer         │
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │   API 层    │  │   业务逻辑层        │  │
│  └──────┬──────┘  └──────────┬──────────┘  │
│         │                    │              │
│  ┌──────┴────────────────────┴──────┐     │
│  │    成本优化器 (单进程)             │     │
│  │  - 策略引擎  - 路由  - 缓存  - 监控│     │
│  └───────────────────────────────────┘     │
│         │                                   │
│  ┌──────┴─────────────────────┐            │
│  │  本地存储                  │            │
│  │  - SQLite (缓存+成本数据)  │            │
│  │  - 文件系统 (日志)         │            │
│  └────────────────────────────┘            │
└─────────────────────────────────────────────┘
```

### 8.2 集群部署 (大规模)

```
┌─────────────────────────────────────────────────────────┐
│              负载均衡器 (Nginx / HAProxy)               │
└──────────────┬──────────────┬──────────────┬────────────┘
               │              │              │
    ┌──────────▼──┐  ┌────────▼────────┐  ┌─▼────────────┐
    │  OpenClaw   │  │   OpenClaw      │  │  OpenClaw    │
    │  Instance 1 │  │   Instance 2    │  │  Instance N  │
    └──────┬──────┘  └────────┬───────┘  └──────┬───────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
                    ┌─────────▼────────────┐
                    │   Redis Cluster      │
                    │  (分布式缓存)         │
                    └─────────┬────────────┘
                              │
                    ┌─────────▼────────────┐
                    │   Monitoring Stack   │
                    │  - Prometheus        │
                    │  - Grafana           │
                    │  - Alertmanager      │
                    └──────────────────────┘
```

**组件说明**:
- **无状态实例**: OpenClaw + cost-optimizer 每个实例独立运行
- **共享缓存**: Redis 集群提供跨实例缓存共享
- **监控**: Prometheus 收集所有实例指标，Grafana 可视化
- **成本数据**: 所有实例写入同一个 PostgreSQL 数据库

---

## 9. 扩展性设计

### 9.1 插件化策略系统

```typescript
// 自定义策略接口
interface CustomStrategy {
  name: string;
  version: string;
  author: string;
  
  // 生命周期钩子
  initialize(config: Record<string, any>): void;
  evaluate(request: Request, context: Context): StrategyEvaluation;
  finalize(): void;
  
  // 配置模式
  schema: JSONSchema;
}

// 动态加载策略
const loadStrategies = async (dir: string): Promise<Strategy[]> => {
  const strategies: Strategy[] = [];
  const files = await fs.readdir(dir);
  
  for (const file of files) {
    if (file.endsWith('.strategy.js')) {
      const StrategyClass = await import(path.join(dir, file));
      const strategy = new StrategyClass.default();
      strategies.push(strategy);
    }
  }
  
  return strategies;
};
```

### 9.2 多租户支持

```typescript
interface Tenant {
  id: string;
  name: string;
  config: TenantConfig;
  limits: {
    max_daily_cost: number;
    max_request_rate: number;
    allowed_models: string[];
  };
  billing: {
    plan: 'free' | 'basic' | 'premium';
    monthly_budget: number;
  };
}

// 多租户上下文
const tenantContext = new Map<string, Tenant>();
```

### 9.3 模型提供商扩展

```typescript
interface ModelProvider {
  name: string;
  version: string;
  
  // 模型列表
  listModels(): Promise<ModelInfo[]>;
  
  // 价格信息
  getPricing(): Promise<PricingInfo>;
  
  // API 调用
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  
  // 健康检查
  healthCheck(): Promise<HealthStatus>;
  
  // 认证
  authenticate(): boolean;
}
```

---

## 10. 安全考虑

### 10.1 API 密钥管理
- 所有外部 API 密钥存储在环境变量中
- 禁止日志中记录敏感信息
- 支持密钥轮换

### 10.2 隔离性
- 不同租户数据完全隔离
- 缓存键包含租户 ID 前缀
- 数据库行级安全策略

### 10.3 审计日志
- 所有管理操作记录审计日志
- 包括策略变更、配置更新、用户操作
- 日志不可篡改（可选区块链存证）

### 10.4 资源限制
- 每个租户/用户请求频率限制
- 最大并发请求数控制
- 成本上限截断 (soft/hard limit)

---

## 11. 测试策略

### 11.1 单元测试
- 策略引擎: 测试策略组合、激活条件
- 路由: 测试评分算法、故障转移
- 缓存: 测试 TTL、淘汰、序列化
- 监控: 测试指标收集、汇总

### 11.2 集成测试
- 端到端请求流程
- 缓存命中/未命中场景
- 多提供商故障场景
- 批处理触发机制

### 11.3 负载测试
- 模拟 1000+ RPS 场景
- 成本节省率验证 (对比基准)
- 内存泄漏检测
- Redis 瓶颈测试

### 11.4 A/B 测试
- 新旧策略对比
- 不同权重配置效果
- 用户反馈收集

---

## 12. 技术栈

### 12.1 后端
- **运行环境**: Node.js 18+
- **框架**: Express.js 或 Fastify
- **语言**: TypeScript
- **缓存**: Redis 7+, node-redis
- **数据库**: SQLite (轻量) / PostgreSQL (集群)
- **监控**: Prometheus client, Grafana

### 12.2 依赖库
```json
{
  "dependencies": {
    "openrouter": "^1.0.0",      // 或直接使用 fetch
    "redis": "^4.6.0",
    "lru-cache": "^10.0.0",
    "sqlite3": "^5.1.0",
    "prom-client": "^14.0.0",
    "node-cron": "^3.0.0",
    "yaml": "^2.3.0",
    "joi": "^17.9.0",            // 验证
    "winston": "^3.9.0"          // 日志
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "supertest": "^6.0.0",
    "artillery": "^2.0.0"        // 负载测试
  }
}
```

### 12.3 现有集成
- **searxng**: 免费搜索替代
- **tavily-search**: 搜索缓存增强
- **OpenRouter API**: 智能路由
- **OpenClaw skill 系统**: 插件化集成

---

## 13. 实施路线图

### Phase 1: 核心功能 (Week 1-2)
- [ ] 基础项目结构搭建
- [ ] 策略引擎框架实现
- [ ] 简单缓存层 (内存 + SQLite)
- [ ] 基本路由逻辑 (OpenRouter 集成)
- [ ] 核心指标收集

### Phase 2: 完善与优化 (Week 3-4)
- [ ] Redis 集成
- [ ] 策略管理系统
- [ ] 批处理优化
- [ ] 监控仪表板初版
- [ ] 单元测试覆盖

### Phase 3: 智能优化 (Week 5-6)
- [ ] 自适应 TTL 算法
- [ ] 价格监控与动态路由
- [ ] A/B 测试框架
- [ ] 成本预测模型
- [ ] 告警系统

### Phase 4: 生产就绪 (Week 7-8)
- [ ] 配置管理完善
- [ ] 多租户支持
- [ ] 集群部署文档
- [ ] 安全审计
- [ ] 性能调优与负载测试
- [ ] 文档完善与用户指南

---

## 14. 关键假设与依赖

### 14.1 假设
- OpenRouter 价格 API 稳定可用
- Redis 作为可选依赖，未配置时降级到内存+SQLite
- 用户愿意接受 ≤5% 性能损失以换取成本节省
- 请求模式具有一定规律性，缓存策略有效

### 14.2 外部依赖
- OpenRouter API (提供价格与路由)
- Redis (可选，推荐用于生产集群)
- 标准 LLM API (OpenAI, Anthropic, Google 等)

---

## 15. 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| OpenRouter 价格波动剧烈 | 高 | 中 | 实现价格缓存与降级策略，支持手动价格覆盖 |
| 缓存导致数据过期 | 中 | 中 | TTL 最小值限制，按模型设置差异化 TTL |
| 性能下降超过 5% | 高 | 低 | 启用性能优先模式，A/B 测试验证 |
| 缓存击穿 (大量未命中) | 中 | 低 | 预热机制，热点数据预加载 |
| 路由决策延迟增加 | 中 | 低 | 异步决策，预计算路由表 |
| 多租户数据泄露 | 高 | 低 | 严格隔离，审计日志，渗透测试 |

---

## 16. 成功指标追踪

| 指标 | 目标 | 测量方法 | 监控频率 |
|------|------|----------|----------|
| 成本降低率 | ≥30% | (基准成本 - 当前成本) / 基准成本 | 每日 |
| 缓存命中率 | ≥40% | cache_hits / total_requests | 实时 |
| P95 延迟增加 | ≤5% | (优化后 P95 - 基准 P95) / 基准 P95 | 每小时 |
| 路由准确率 | ≥90% | 选择最优成本模型的比例 | 每日 |
| 系统可用性 | ≥99.5% | uptime / total_time | 实时 |
| 用户采用率 | 3 个月 100+ | 活跃用户数 | 每周 |

---

## 17. 附录

### 17.1 术语表

- **L1/L2/L3 缓存**: 第一级(内存) / 第二级(分布式) / 第三级(持久化)
- **TTL**: Time To Live (生存时间)
- **LRU**: Least Recently Used (最近最少使用)
- **LFU**: Least Frequently Used (最不经常使用)
- **MRU**: Most Recently Used (最近最常使用)
- **P50/P95/P99**: 百分位数延迟
- **RPS**: Requests Per Second (每秒请求数)

### 17.2 参考文档
- OpenRouter API 文档: https://openrouter.ai/docs
- LiteLLM 成本优化实践: https://litellm.com
- Redis 缓存最佳实践
- OpenAI API 成本计算

### 17.3 相关项目
- [LiteLLM](https://github.com/BerriAI/litellm) - 统一 LLM API 网关
- [OpenAI Rate Limit Handler](https://github.com/queue-equations/rate-limiter)
- [CacheON](https://github.com/tiangolo/cachecontrol) - HTTP 缓存控制

---

**文档结束**