# LLM 成本优化器 - API 规范

**版本**: 1.0  
**创建日期**: 2025-03-08  
**负责人**: Designer Agent  

---

## 1. 概述

本 API 规范定义了 LLM 成本优化器对外提供的所有接口。主要目标：

1. **完全兼容 OpenAI API**: 现有用户无需修改代码即可使用
2. **提供管理接口**: 用于配置、监控和管理优化器
3. **开放监控数据**: 支持 Prometheus 集成
4. **清晰的错误处理**: 标准化错误码和信息

所有 API 端点 (除 `/metrics` 外) 均支持 CORS 和 JSON 响应格式。

---

## 2. 基础信息

### 2.1 服务地址

```
生产环境: https://api.yourdomain.com/v1
开发环境: http://localhost:3000/v1
```

### 2.2 认证

成本优化器本身不提供用户认证，依赖上游的 OpenClaw 认证。但对于管理 API，可以配置 API Key:

```
Authorization: Bearer <API_KEY>
```

### 2.3 通用响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "req_123456",
    "timestamp": "2025-03-08T03:40:00Z",
    "version": "1.0.0"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request parameter is invalid",
    "details": { ... },
    "request_id": "req_123456"
  },
  "meta": {
    "request_id": "req_123456",
    "timestamp": "2025-03-08T03:40:00Z"
  }
}
```

---

## 3. LLM API 端点 (兼容 OpenAI)

### 3.1 Chat Completions

**端点**: `POST /chat/completions`

与 OpenAI Chat Completions API 完全兼容。

#### 请求参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `model` | string | 是 | 模型名称，如 `gpt-4`, `claude-3-opus` |
| `messages` | array | 是 | 对话消息数组 |
| `temperature` | number | 否 | 采样温度，默认 1.0 |
| `max_tokens` | number | 否 | 最大输出 token 数 |
| `stream` | boolean | 否 | 是否流式输出，默认 false |
| `top_p` | number | 否 | Top-p 采样，默认 1.0 |
| `frequency_penalty` | number | 否 | 频率惩罚，默认 0.0 |
| `presence_penalty` | number | 否 | 存在惩罚，默认 0.0 |
| `user` | string | 否 | 用户标识 (用于多租户) |

**messages 数组格式**:
```json
[
  {"role": "system", "content": "You are a helpful assistant."},
  {"role": "user", "content": "Hello!"},
  {"role": "assistant", "content": "Hi there!"},
  {"role": "user", "content": "How are you?"}
]
```

#### 响应

**非流式响应**:
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I assist you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21
  }
}
```

**优化器附加 Header**:
```
X-Cost-USD: 0.0023                    # 本次请求成本 (美元)
X-Cache-Hit: true                     # 是否命中缓存
X-Cache-Level: L1/L2/L3/none          # 缓存层级
X-Routed-Model: gpt-4-turbo-preview   # 实际使用的模型
X-Provider: openrouter                # 提供商
X-Batch-Size: 1                       # 批量大小 (如果批处理)
X-Strategy-Applied: adaptive_ttl,batch_compression  # 应用的策略
```

#### 示例请求

```bash
curl -X POST "http://localhost:3000/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Explain quantum computing"}
    ],
    "max_tokens": 500
  }'
```

#### 错误码

| 错误码 | HTTP 状态 | 描述 |
|--------|-----------|------|
| `INVALID_MODEL` | 400 | 模型不存在或不可用 |
| `PROVIDER_DOWN` | 503 | 所有提供商不可用 |
| `BATCH_TIMEOUT` | 504 | 批处理超时 |
| `CACHE_ERROR` | 500 | 缓存系统错误 |
| `ROUTING_ERROR` | 500 | 路由决策失败 |
| `RATE_LIMITED` | 429 | 请求频率超限 |

---

### 3.2 Completions (Legacy)

**端点**: `POST /completions`

兼容 OpenAI Completions API (文本补全)。

#### 请求参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `model` | string | 是 | 模型名称 |
| `prompt` | string | 是 | 提示文本 |
| `max_tokens` | number | 否 | 最大输出 token 数 |
| `temperature` | number | 否 | 采样温度 |
| `stream` | boolean | 否 | 是否流式 |

#### 响应格式

同 Chat Completions，但 `choices[0].text` 直接包含输出文本。

---

### 3.3 Embeddings

**端点**: `POST /embeddings`

生成文本嵌入向量。

#### 请求参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `model` | string | 是 | 嵌入模型名称 |
| `input` | string/array | 是 | 输入文本或文本数组 |
| `encoding_format` | string | 否 | 返回格式: `float` (默认) 或 `base64` |
| `dimensions` | number | 否 | 嵌入维度 (如果模型支持) |

#### 响应

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.0189941066, -0.007386668, ...],
      "index": 0
    }
  ],
  "model": "text-embedding-ada-002",
  "usage": {
    "prompt_tokens": 8,
    "total_tokens": 8
  }
}
```

**Header**: 同样附加优化器 Header (成本、缓存等)

---

## 4. 成本管理 API

### 4.1 获取成本报告

**端点**: `GET /cost/report`

#### 查询参数

| 参数 | 类型 | 必需 | 描述 | 示例 |
|------|------|------|------|------|
| `period` | string | 是 | 统计周期: `hour` `day` `week` `month` | `day` |
| `date` | string | 否 | 查询日期 (YYYY-MM-DD), 默认今天 | `2025-03-07` |
| `group_by` | string | 否 | 分组维度: `model` `provider` `hour` | `model` |
| `tenant_id` | string | 否 | 多租户: 指定租户 ID | `tenant_123` |

#### 响应

```json
{
  "success": true,
  "data": {
    "period": "day",
    "date": "2025-03-07",
    "summary": {
      "total_cost": 45.67,
      "total_requests": 12456,
      "avg_cost_per_request": 0.00367,
      "savings": 23.45,
      "savings_percentage": 33.9
    },
    "breakdown": {
      "by_model": {
        "gpt-4": {
          "requests": 3421,
          "cost": 28.34,
          "percentage": 62.1
        },
        "gpt-3.5-turbo": {
          "requests": 7890,
          "cost": 12.12,
          "percentage": 26.5
        },
        "claude-3-haiku": {
          "requests": 1145,
          "cost": 5.21,
          "percentage": 11.4
        }
      },
      "by_hour": {
        "00": { "cost": 1.23, "requests": 345 },
        "01": { "cost": 0.98, "requests": 289 },
        // ...
      }
    },
    "trends": {
      "cost_7d_avg": 42.34,
      "cost_30d_avg": 48.56,
      "requests_growth_rate": 0.12,
      "cost_growth_rate": -0.23
    },
    "recommendations": [
      "考虑将非关键请求切换到更经济的模型 (gpt-3.5-turbo)",
      "缓存命中率偏低 (25%), 建议调整缓存 TTL 策略",
      "凌晨时段 (02:00-06:00) 请求量低, 可启用自动扩缩容"
    ]
  },
  "meta": {
    "generated_at": "2025-03-08T03:40:00Z",
    "data_source": "optimizer.db"
  }
}
```

#### 示例请求

```bash
curl "http://localhost:3000/v1/cost/report?period=day&date=2025-03-07&group_by=model"
```

---

### 4.2 实时成本追踪

**端点**: `GET /cost/realtime`

返回当前统计周期 (默认 24 小时) 的实时数据。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `window` | string | 否 | 时间窗口: `1h` `6h` `24h` (默认) |

#### 响应

```json
{
  "success": true,
  "data": {
    "window": "24h",
    "current": {
      "cost": 38.45,
      "requests": 9876,
      "cache_hit_rate": 0.42
    },
    "projected_24h": 45.67,
    "budget_remaining": 14.33,  // 如果有设置预算
    "alerts": [
      {
        "level": "warning",
        "message": "今日成本已超过预算的 80%",
        "suggested_action": "启用成本优先模式"
      }
    ]
  }
}
```

---

### 4.3 成本预测

**端点**: `GET /cost/forecast`

预测未来成本趋势。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `days` | number | 否 | 预测天数, 默认 30 |
| `model` | string | 否 | 指定模型预测 |

#### 响应

```json
{
  "success": true,
  "data": {
    "period": "2025-03-08 to 2025-04-07",
    "forecast": [
      { "date": "2025-03-08", "cost": 45.2 },
      { "date": "2025-03-09", "cost": 46.1 },
      // ...
    ],
    "confidence_interval": {
      "lower": 42.5,
      "upper": 52.3,
      "confidence": 0.95
    },
    "factors": {
      "trend": "increasing",
      "seasonality": "weekday_peak",
      "anomalies": []
    }
  }
}
```

---

## 5. 缓存管理 API

### 5.1 缓存统计

**端点**: `GET /cache/stats`

#### 响应

```json
{
  "success": true,
  "data": {
    "levels": {
      "memory": {
        "entries": 842,
        "capacity": 1000,
        "hit_rate": 0.65,
        "evictions": 124
      },
      "redis": {
        "entries": 5432,
        "capacity": 10000,
        "hit_rate": 0.38,
        "memory_usage_mb": 256
      },
      "sqlite": {
        "entries": 12543,
        "hit_rate": 0.12,
        "size_mb": 128
      }
    },
    "overall": {
      "total_hits": 87654,
      "total_misses": 112345,
      "overall_hit_rate": 0.438,
      "avg_entry_size_kb": 4.2,
      "cost_saved_estimate": 15.67
    },
    "config": {
      "adaptive_ttl_enabled": true,
      "current_ttl_memory": 300,
      "current_ttl_redis": 1800
    }
  }
}
```

---

### 5.2 手动缓存失效

**端点**: `POST /cache/invalidate`

#### 请求体

```json
{
  "pattern": "model:gpt-4:*",  // 支持通配符
  "reason": "price_change",   // 失效原因
  "force": false              // 强制立即清理
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "invalidated_entries": 234,
    "levels_affected": ["memory", "redis"]
  }
}
```

---

### 5.3 列出缓存条目

**端点**: `GET /cache/entries`

**注意**: 仅管理员使用，生产环境建议开启认证。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `limit` | number | 否 | 返回数量，默认 100 |
| `offset` | number | 否 | 分页偏移，默认 0 |
| `model` | string | 否 | 筛选模型 |
| `min_size` | number | 否 | 最小条目大小 (bytes) |

#### 响应

```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "key": "cache:model=gpt-4:prompt=abc123:params=...",
        "model": "gpt-4",
        "prompt_hash": "abc123",
        "created_at": "2025-03-08T02:30:00Z",
        "expires_at": "2025-03-08T03:30:00Z",
        "access_count": 15,
        "size_bytes": 1024
      }
      // ...
    ],
    "total": 5432,
    "limit": 100,
    "offset": 0
  }
}
```

---

## 6. 策略管理 API

### 6.1 列出策略

**端点**: `GET /strategies`

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `type` | string | 否 | 筛选类型: `caching` `routing` `compression` |
| `enabled` | boolean | 否 | 筛选激活状态 |

#### 响应

```json
{
  "success": true,
  "data": {
    "strategies": [
      {
        "id": "adaptive_ttl",
        "name": "Adaptive TTL Strategy",
        "type": "caching",
        "description": "Dynamically adjusts cache TTL based on request frequency",
        "enabled": true,
        "priority": 1,
        "config": {
          "min_ttl": 60,
          "max_ttl": 3600,
          "hit_rate_target": 0.4
        },
        "conditions": [
          {
            "metric": "cache_hit_rate",
            "operator": "<",
            "value": 0.4,
            "action": "increase_ttl"
          }
        ],
        "created_at": "2025-03-07T10:00:00Z",
        "updated_at": "2025-03-08T01:30:00Z"
      },
      {
        "id": "cost_first_routing",
        "name": "Cost-First Routing",
        "type": "routing",
        "enabled": true,
        "priority": 2,
        "config": {
          "weight_cost": 0.9,
          "weight_latency": 0.05,
          "weight_availability": 0.05
        }
      }
    ],
    "total": 8,
    "active_count": 5
  }
}
```

---

### 6.2 创建策略

**端点**: `POST /strategies`

**权限**: 管理员

#### 请求体

```json
{
  "name": "Custom Batch Strategy",
  "type": "compression",
  "description": "Custom batch compression settings",
  "priority": 3,
  "config": {
    "batch_window_ms": 3000,
    "max_batch_size": 15,
    "min_batch_size": 2
  },
  "conditions": [
    {
      "metric": "queue_size",
      "operator": ">=",
      "value": 5,
      "action": "enable_batching"
    }
  ],
  "enabled": false  // 创建后默认禁用
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "batch_strategy_123",
    "created_at": "2025-03-08T03:40:00Z"
  }
}
```

---

### 6.3 获取策略详情

**端点**: `GET /strategies/:id`

#### 响应

同列表中的单个策略对象，额外包含执行统计:

```json
{
  "success": true,
  "data": {
    "id": "adaptive_ttl",
    // ... 基础信息
    "statistics": {
      "executions_total": 12456,
      "executions_last_24h": 3421,
      "actions_taken": {
        "increase_ttl": 1234,
        "decrease_ttl": 567
      },
      "last_executed": "2025-03-08T03:39:00Z"
    }
  }
}
```

---

### 6.4 更新策略

** endpoint**: `PUT /strategies/:id`

#### 请求体 (可部分更新)

```json
{
  "config": {
    "min_ttl": 120,
    "max_ttl": 7200
  },
  "enabled": true
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "updated_at": "2025-03-08T03:41:00Z"
  }
}
```

---

### 6.5 删除策略

**端点**: `DELETE /strategies/:id`

#### 响应

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

### 6.6 激活策略

**端点**: `POST /strategies/:id/activate`

立即激活策略，使其生效。

#### 响应

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "activated_at": "2025-03-08T03:42:00Z"
  }
}
```

---

### 6.7 停用策略

**端点**: `POST /strategies/:id/deactivate`

#### 响应

```json
{
  "success": true,
  "data": {
    "enabled": false,
    "deactivated_at": "2025-03-08T03:42:00Z"
  }
}
```

---

## 7. 路由管理 API

### 7.1 列出提供商

**端点**: `GET /routing/providers`

#### 响应

```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": "openrouter_default",
        "name": "OpenRouter",
        "type": "openrouter",
        "status": "healthy",
        "priority": 1,
        "weight": 1.0,
        "stats": {
          "requests": 12543,
          "errors": 23,
          "error_rate": 0.0018,
          "avg_latency_ms": 245
        },
        "models_available": 45
      },
      {
        "id": "ollama_local",
        "name": "Local Ollama",
        "type": "ollama",
        "status": "healthy",
        "priority": 2,
        "weight": 0.5,
        "stats": {
          "requests": 3421,
          "errors": 0,
          "error_rate": 0,
          "avg_latency_ms": 120
        },
        "models_available": 3
      }
    ]
  }
}
```

---

### 7.2 添加提供商

**端点**: `POST /routing/providers`

#### 请求体

```json
{
  "type": "custom",
  "name": "Enterprise GPT-4",
  "base_url": "https://api.your-company.com/v1",
  "api_key": "sk-...",  // 或使用环境变量引用
  "auth_type": "bearer", // bearer | api_key | none
  "priority": 3,
  "weight": 0.8,
  "models": [
    {
      "id": "gpt-4-custom",
      "name": "GPT-4 Custom",
      "max_tokens": 8192,
      "cost_per_1k_input": 0.03,
      "cost_per_1k_output": 0.06
    }
  ]
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "provider_id": "custom_provider_456"
  }
}
```

---

### 7.3 更新提供商

**端点**: `PUT /routing/providers/:id`

支持更新权重、优先级、状态等。

---

### 7.4 路由决策日志

**端点**: `GET /routing/decisions`

查看路由决策历史。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `limit` | number | 否 | 默认 100 |
| `model` | string | 否 | 筛选最终模型 |
| `provider` | string | 否 | 筛选提供商 |
| `min_latency` | number | 否 | 最小延迟 (ms) |

#### 响应

```json
{
  "success": true,
  "data": {
    "decisions": [
      {
        "timestamp": "2025-03-08T03:39:00Z",
        "request_hash": "req_abc123",
        "requested_model": "gpt-4",
        "selected_model": "gpt-4-turbo-preview",
        "provider": "openrouter_default",
        "considered_models": ["gpt-4", "gpt-4-turbo", "claude-3-opus"],
        "score": 0.87,
        "reasoning": "lowest_cost_with_acceptable_latency",
        "latency_ms": 234
      }
    ]
  }
}
```

---

## 8. 监控与指标 API

### 8.1 Prometheus 指标

**端点**: `GET /metrics`

返回 Prometheus 格式的指标数据。

#### 支持的指标

**成本指标**:
```
# HELP llm_cost_total_total Total cost in USD
# TYPE llm_cost_total counter
llm_cost_total{model="gpt-4",provider="openrouter"} 45.67

# HELP llm_cost_per_request Cost per request in USD
# TYPE llm_cost_per_request histogram
llm_cost_per_request_bucket{le="0.001"} 1234
llm_cost_per_request_bucket{le="0.01"} 5678
llm_cost_per_request_bucket{le="+Inf"} 9876
```

**性能指标**:
```
# HELP llm_request_duration_seconds Request duration
# TYPE llm_request_duration_seconds histogram
llm_request_duration_seconds_bucket{model="gpt-4",le="0.5"} 3456
llm_request_duration_seconds_bucket{model="gpt-4",le="1.0"} 8765
llm_request_duration_seconds_bucket{model="gpt-4",le="+Inf"} 9876

# HELP llm_cache_hit_rate Cache hit rate (0-1)
# TYPE llm_cache_hit_rate gauge
llm_cache_hit_rate{level="memory"} 0.65
llm_cache_hit_rate{level="redis"} 0.38
```

**路由指标**:
```
# HELP llm_routes_total Number of routing decisions
# TYPE llm_routes_total counter
llm_routes_total{model="gpt-4",provider="openrouter"} 5432

# HELP llm_fallback_rate Fallback rate (0-1)
# TYPE llm_fallback_rate gauge
llm_fallback_rate 0.012
```

---

### 8.2 健康检查

**端点**: `GET /health`

返回服务整体健康状态。

#### 响应

```json
{
  "status": "healthy",  // healthy | degraded | unhealthy
  "checks": {
    "cache": {
      "status": "healthy",
      "latency_ms": 2,
      "details": {}
    },
    "routing": {
      "status": "healthy",
      "providers_healthy": 2,
      "providers_total": 2
    },
    "database": {
      "status": "healthy",
      "latency_ms": 5,
      "connected": true
    },
    "redis": {
      "status": "healthy",
      "ping_ms": 1
    }
  },
  "version": "1.0.0",
  "timestamp": "2025-03-08T03:40:00Z"
}
```

---

### 8.3 就绪检查

**端点**: `GET /ready`

检查服务是否准备好接收请求 (比 `/health` 更严格)。

#### 响应

```json
{
  "ready": true,
  "checks": {
    "providers_available": true,
    "cache_initialized": true,
    "strategies_loaded": true,
    "min_providers_healthy": 1
  }
}
```

---

### 8.4 获取指标快照

**端点**: `GET /metrics/snapshot`

返回结构化的指标数据，供前端展示。

#### 响应

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-03-08T03:40:00Z",
    "period": "5m",
    "requests": {
      "total": 1234,
      "by_model": {
        "gpt-4": 456,
        "gpt-3.5-turbo": 678,
        "claude-3-haiku": 100
      }
    },
    "cost": {
      "total_usd": 3.45,
      "by_model": {
        "gpt-4": 2.34,
        "gpt-3.5-turbo": 0.89,
        "claude-3-haiku": 0.22
      }
    },
    "performance": {
      "p50_latency_ms": 234,
      "p95_latency_ms": 567,
      "p99_latency_ms": 890
    },
    "cache": {
      "hit_rate": 0.438,
      "hit_rate_by_level": {
        "memory": 0.65,
        "redis": 0.38,
        "sqlite": 0.12
      }
    },
    "batching": {
      "enabled": true,
      "queue_size": 3,
      "avg_batch_size": 4.2
    }
  }
}
```

---

## 9. 配置管理 API

### 9.1 获取当前配置

**端点**: `GET /config`

#### 响应

```json
{
  "success": true,
  "data": {
    "version": "1.0",
    "mode": "production",
    "cache": {
      "enabled": true,
      "levels": [...]
    },
    "routing": {
      "strategy": "adaptive",
      "providers": [...]
    },
    "batching": {
      "enabled": true,
      "window_ms": 2000,
      "max_batch_size": 10
    },
    "monitoring": {
      "metrics_enabled": true,
      "reporting_interval": 3600
    }
  }
}
```

---

### 9.2 更新配置

**端点**: `PUT /config`

**权限**: 管理员，需要重启服务才能完全生效。

#### 请求体 (支持部分更新)

```json
{
  "cache": {
    "levels": [
      {
        "type": "memory",
        "capacity": 2000  // 增加容量
      }
    ]
  },
  "routing": {
    "strategy": "cost-first"  // 切换到成本优先模式
  }
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "updated_fields": ["cache.levels[0].capacity", "routing.strategy"],
    "requires_restart": false,
    "applied_at": "2025-03-08T03:41:00Z"
  }
}
```

---

### 9.3 验证配置

**端点**: `POST /config/validate`

在应用配置前进行语法和语义验证。

#### 请求体

与 `/config` PUT 方法相同。

#### 响应

```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      "Cache capacity increased by 100%, may increase memory usage"
    ]
  }
}
```

---

## 10. 系统管理 API

### 10.1 系统状态

**端点**: `GET /system/status`

返回详细系统状态。

#### 响应

```json
{
  "success": true,
  "data": {
    "uptime": 3600,
    "version": "1.0.0",
    "node": "instance-1",
    "resources": {
      "memory": {
        "used_mb": 512,
        "total_mb": 4096,
        "percent": 12.5
      },
      "cpu": {
        "percent": 15.2,
        "cores": 8
      }
    },
    "services": {
      "redis": "connected",
      "database": "connected",
      "openrouter_api": "healthy"
    },
    "config_loaded_at": "2025-03-08T00:00:00Z",
    "last_metrics_flush": "2025-03-08T03:39:00Z"
  }
}
```

---

### 10.2 清理缓存

**端点**: `POST /system/cleanup`

手动触发清理任务。

#### 请求体

```json
{
  "targets": ["expired_cache", "old_metrics", "log_files"],
  "dry_run": false,
  "older_than_days": 7
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "cleaned": {
      "expired_cache_entries": 1234,
      "old_metrics_records": 56789,
      "freed_mb": 256
    }
  }
}
```

---

### 10.3 重启服务

**端点**: `POST /system/restart`

**注意**: 生产环境谨慎使用。

#### 响应

```json
{
  "success": true,
  "data": {
    "restarting": true,
    "estimated_downtime_seconds": 5
  }
}
```

---

## 11. WebSocket 端点 (流式)

### 11.1 实时指标推送

**端点**: `ws://localhost:3000/metrics/stream`

连接后，服务器每分钟推送一次指标快照。

#### 消息格式

```json
{
  "type": "metrics_snapshot",
  "data": {
    "timestamp": "2025-03-08T03:40:00Z",
    "requests_per_second": 12.3,
    "cost_per_minute": 0.056,
    "cache_hit_rate": 0.44,
    "active_strategies": 5
  }
}
```

---

### 11.2 流式请求 (可选)

如果客户端需要流式 LLM 响应，可以直接使用 OpenAI 的 stream 模式:

```bash
curl -N -X POST "http://localhost:3000/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

服务器会使用 Server-Sent Events (SSE) 格式流式转发 LLM 响应，并在最后的 `data: [DONE]` 之前插入优化器元数据:

```
data: {"id":"...","choices":[...],"usage":{...}}
data: {"optimizer_meta":{"cost_usd":0.0023,"cache_hit":false}}
data: [DONE]
```

---

## 12. 错误码详表

| 错误码 | HTTP 状态 | 描述 | 建议操作 |
|--------|-----------|------|----------|
| `INVALID_REQUEST` | 400 | 请求参数无效 | 检查 JSON 格式和必填字段 |
| `INVALID_MODEL` | 400 | 模型不存在 | 使用 `/routing/providers` 查看可用模型 |
| `AUTH_FAILED` | 401 | 认证失败 | 检查 API Key |
| `PERMISSION_DENIED` | 403 | 无权限访问该资源 | 联系管理员 |
| `RATE_LIMITED` | 429 | 请求频率超限 | 降低请求频率或升级配额 |
| `PROVIDER_DOWN` | 503 | 所有提供商不可用 | 稍后重试，或检查网络配置 |
| `BATCH_TIMEOUT` | 504 | 批处理超时 | 减少 `max_batch_size` 或优化批处理参数 |
| `CACHE_ERROR` | 500 | 缓存系统故障 | 检查 Redis/SQLite 连接 |
| `ROUTING_ERROR` | 500 | 路由决策失败 | 检查提供商配置 |
| `INTERNAL_ERROR` | 500 | 内部错误 | 联系支持并提供 request_id |
| `SERVICE_UNAVAILABLE` | 503 | 服务暂时不可用 | 稍后重试 |

**通用错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_DOWN",
    "message": "All LLM providers are currently unavailable. Please try again later or check your configuration.",
    "details": {
      "providers_checked": ["openrouter", "ollama"],
      "all_failed": true,
      "suggested_action": "check_network_connectivity"
    },
    "request_id": "req_abc123",
    "support_url": "https://yourdomain.com/support"
  },
  "meta": {
    "timestamp": "2025-03-08T03:40:00Z",
    "version": "1.0.0"
  }
}
```

---

## 13. 客户端 SDK

为简化集成，提供官方 SDK (可选)。

### TypeScript/JavaScript

```bash
npm install @your-org/cost-optimizer-client
```

**使用示例**:

```typescript
import { CostOptimizerClient } from '@your-org/cost-optimizer-client';

const client = new CostOptimizerClient({
  baseUrl: 'http://localhost:3000/v1',
  apiKey: process.env.OPTIMIZER_API_KEY
});

// 普通请求
const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }]
});

console.log(response.choices[0].message.content);
console.log(`Cost: $${response.meta.costUsd}`);

// 获取成本报告
const report = await client.cost.getReport({
  period: 'day',
  groupBy: 'model'
});
```

### Python

```bash
pip install cost-optimizer-client
```

```python
from cost_optimizer import Client

client = Client(
    base_url="http://localhost:3000/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello"}]
)

print(response.choices[0].message.content)
print(f"Cost: ${response.meta.cost_usd}")
```

---

## 14. 配额与限流

### 14.1 默认限流

- **RPM** (每分钟请求数): 1000
- **RPS** (每秒请求数): 20
- **TPM** (每分钟 token 数): 100000

### 14.2 响应 Header 中的配额信息

```
X-RateLimit-Limit: 1000           # 周期内最大请求数
X-RateLimit-Remaining: 987        # 剩余请求数
X-RateLimit-Reset: 60             # 重置时间 (秒)
X-RateLimit-Resource: requests    # 限制类型: requests / tokens
```

### 14.3 限流响应

当超出配额时，返回 `429 Too Many Requests`:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Try again in 30 seconds.",
    "details": {
      "retry_after": 30,
      "limit": 1000,
      "resource": "requests"
    }
  }
}
```

---

## 15. API 变更策略

### 15.1 版本控制

API 版本通过 URL 路径表示:

```
/v1/chat/completions  (当前稳定版本)
/v2/chat/completions  (未来可能的新版本)
```

### 15.2 弃用通知

当 API 即将变更时，响应的 Header 中会包含:

```
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: <https://docs.yourdomain.com/changelog/v2>; rel="successor-version"
```

客户端应在收到 `Deprecation: true` 后 6 个月内迁移到新版本。

---

## 16. 附录

### 16.1 兼容性矩阵

| 客户端库 | 推荐版本 | 兼容 API 版本 |
|----------|----------|---------------|
| openai-python | >=1.0.0 | v1 |
| openai-node | >=4.0.0 | v1 |
| @your-org/cost-optimizer-client | latest | v1 |

### 16.2 示例代码库

完整示例代码托管于:  
https://github.com/your-org/cost-optimizer-examples

### 16.3 支持

- **文档**: https://docs.yourdomain.com/cost-optimizer
- **Issues**: https://github.com/your-org/cost-optimizer/issues
- **社区**: https://discord.yourdomain.com

---

**文档结束**