# API 接口文档

## 概述

本文档描述 Code2MCP 后端系统提供的所有 REST API 接口。API 基于 FastAPI 框架构建，采用 JWT 进行身份认证，支持 Server-Sent Events (SSE) 流式响应。

### 基础信息

| 项目 | 值 |
|------|-----|
| **基础URL** | `http://localhost:8000/api/v1` |
| **API版本** | v1 |
| **认证方式** | JWT Bearer Token |
| **数据格式** | JSON |
| **字符编码** | UTF-8 |

### API 文档

FastAPI 自动生成的交互式 API 文档：
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### 路径规范

所有业务接口路径都包含 `/api/v1` 前缀。

**示例**：用户注册的完整路径为 `/api/v1/user/register`

---

## 目录

- [健康检查](#健康检查)
- [用户管理](#用户管理)
- [认证授权](#认证授权)
- [聊天对话](#聊天对话)
- [MCP服务](#mcp服务)
- [对话管理](#对话管理)
- [Agent管理](#agent管理)
- [通用说明](#通用说明)

---

## 健康检查

### 健康检查

```
GET /health
```

**描述**：检查API服务及数据库连接状态

**认证**：无需认证

**请求头**：无需特殊请求头

**响应示例**：

```json
{
  "status": "ok",
  "database": "connected",
  "version": "1.0.0"
}
```

**响应字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 服务状态：`ok`(正常) / `degraded`(降级) |
| database | string | 数据库状态：`connected`(已连接) / `disconnected`(未连接) |
| version | string | API版本号 |
| error | string | 错误信息（仅降级时存在） |

---

## 用户管理

### 用户注册

```
POST /api/v1/user/register
```

**描述**：创建新用户账户

**认证**：无需认证

**请求头**：

```
Content-Type: application/json
```

**请求体 (Request Body)**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| email | string | 是 | 合法邮箱格式 | 用户邮箱，作为唯一标识 |
| password | string | 是 | 最小长度6位 | 用户密码 |
| verification_code | string | 是 | - | 邮箱验证码 |

**请求示例**：

```json
{
  "email": "user@example.com",
  "password": "password123",
  "verification_code": "123456"
}
```

**成功响应 (200 OK)**：

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImV4cCI6MTcwNjc4MTIwMH0.xxx",
  "user": {
    "id": "user_123",
    "email": "user@example.com"
  }
}
```

**错误响应**：

- `400 Bad Request`: 用户已存在 / 参数验证失败
- `500 Internal Server Error`: 服务器错误

---

### 验证码登录

```
POST /api/v1/user/login/code
```

**描述**：使用邮箱和验证码登录

**认证**：无需认证

**请求头**：

```
Content-Type: application/json
```

**请求体 (Request Body)**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 用户邮箱 |
| verification_code | string | 是 | 邮箱验证码 |

**请求示例**：

```json
{
  "email": "user@example.com",
  "verification_code": "123456"
}
```

**成功响应 (200 OK)**：同用户注册

**错误响应**：

- `400 Bad Request`: 用户不存在 / 验证码错误

---

### 密码登录

```
POST /api/v1/user/login/password
```

**描述**：使用邮箱和密码登录

**认证**：无需认证

**请求头**：

```
Content-Type: application/json
```

**请求体 (Request Body)**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 用户邮箱 |
| password | string | 是 | 用户密码 |

**请求示例**：

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**成功响应 (200 OK)**：同用户注册

**错误响应**：

- `400 Bad Request`: 用户不存在 / 密码错误

---

### 更新用户信息

```
PATCH /api/v1/user/update
```

**描述**：更新当前用户信息

**认证**：需要认证

**请求头**：

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求体 (Request Body)**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| password | string | 否 | 新密码 |

**请求示例**：

```json
{
  "password": "newpassword123"
}
```

**成功响应 (200 OK)**：同用户注册

**错误响应**：

- `401 Unauthorized`: Token无效或过期
- `500 Internal Server Error`: 服务器错误

---

### 删除用户

```
DELETE /api/v1/user/delete
```

**描述**：删除当前用户账户及其所有数据

**认证**：需要认证

**请求头**：

```
Authorization: Bearer {access_token}
```

**成功响应 (200 OK)**：

```json
{
  "message": "User deleted"
}
```

**错误响应**：

- `401 Unauthorized`: Token无效或过期
- `500 Internal Server Error`: 服务器错误

---

## 认证授权

### 发送验证码

```
POST /api/v1/auth/send-verification/{type}
```

**描述**：向指定邮箱发送验证码

**认证**：无需认证

**路径参数 (Path Parameters)**：

| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 验证类型：`register`(注册) / `reset`(重置密码) |

**请求头**：

```
Content-Type: application/json
```

**请求体 (Request Body)**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 接收验证码的邮箱地址 |

**请求示例**：

```json
{
  "email": "user@example.com"
}
```

**成功响应 (200 OK)**：

```json
{
  "message": "Verification code sent"
}
```

**错误响应**：

- `400 Bad Request`: 邮箱格式错误

---

### 验证验证码

```
POST /api/v1/auth/verify-verification
```

**描述**：验证邮箱验证码是否正确

**认证**：无需认证

**请求头**：

```
Content-Type: application/json
```

**请求体 (Request Body)**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 用户邮箱 |
| verification_code | string | 是 | 待验证的验证码 |

**请求示例**：

```json
{
  "email": "user@example.com",
  "verification_code": "123456"
}
```

**成功响应 (200 OK)**：

```json
{
  "message": "Email verified",
  "valid": true
}
```

**错误响应**：

- `400 Bad Request`: 验证码错误

---

### 验证Token

```
GET /api/v1/auth/verify
```

**描述**：验证当前访问令牌是否有效，返回用户信息

**认证**：需要认证

**请求头**：

```
Authorization: Bearer {access_token}
```

**成功响应 (200 OK)**：同用户注册

**错误响应**：

- `401 Unauthorized`: Token无效或过期

---

### 刷新Token

```
GET /api/v1/auth/refresh-token
```

**描述**：获取新的访问令牌（当Token即将过期时）

**认证**：需要认证

**请求头**：

```
Authorization: Bearer {access_token}
```

**成功响应 (200 OK)**：同用户注册

**错误响应**：

- `401 Unauthorized`: Token无效或已过期

---

## 聊天对话

### 流式聊天

```
POST /api/v1/chat/stream
```

**描述**：与AI Agent进行流式对话，支持Server-Sent Events (SSE)实时响应

**认证**：需要认证

**请求头**：

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求体 (Request Body)**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| conversation_id | string \| null | 否 | null | 对话ID，为`null`时创建新对话 |
| message | string | 是 | - | 用户消息内容 |
| agent | string | 否 | "chat" | Agent名称，需为可用Agent |
| mcp_services | string[] | 否 | [] | 额外启用的MCP服务名称列表 |

**请求示例**：

```json
{
  "conversation_id": null,
  "message": "帮我查一下北京的天气",
  "agent": "chat",
  "mcp_services": ["weather"]
}
```

**响应格式**：Server-Sent Events (SSE) 流式响应

**Content-Type**: `text/event-stream`

**SSE事件格式**：每行以 `data: ` 前缀开头，后跟JSON数据

**事件类型**：

| type | 说明 | 数据结构 |
|------|------|----------|
| content | 文本内容片段 | `{"type": "content", "content": "文本"}` |
| tool_call | 工具调用开始 | `{"type": "tool_call", "tool_id": "工具ID", "arguments": {...}, "placeholder": "占位符"}` |
| tool_result | 工具返回结果 | `{"type": "tool_result", "tool_id": "工具ID", "result": "结果", "error": boolean}` |
| end | 流结束标记 | `{"type": "end"}` |
| error | 错误信息 | `{"type": "error", "message": "错误描述"}` |

**事件详细说明**：

##### tool_call（工具调用开始）
表示开始执行一个MCP工具调用。

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 固定值 `"tool_call"` |
| tool_id | string | 工具唯一标识，格式：`server_name:tool_name`（如 `environment:get_weather`） |
| arguments | object | 工具调用参数 |
| placeholder | string | 文本占位符，用于在响应中标记工具调用位置 |

**示例**：
```json
data: {"type": "tool_call", "tool_id": "environment:get_current_weather", "arguments": {"city": "北京"}, "placeholder": "\n[TOOL_CALL:call_abc123]\n"}
```

##### tool_result（工具返回结果）
表示工具调用完成，包含执行结果或错误信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 固定值 `"tool_result"` |
| tool_id | string | 工具唯一标识，与tool_call中的tool_id对应 |
| result | string | 工具执行结果（成功时返回数据，失败时返回错误消息） |
| error | boolean | 执行状态：`false`表示成功，`true`表示失败 |

**成功示例**：
```json
data: {"type": "tool_result", "tool_id": "environment:get_current_weather", "result": "{\"temperature\": 15, \"unit\": \"celsius\", \"description\": \"晴朗\"}", "error": false}
```

**失败示例**：
```json
data: {"type": "tool_result", "tool_id": "environment:get_current_weather", "result": "Error: API request failed - timeout", "error": true}
```

**响应示例**：

```
data: {"type": "content", "content": "北京的"}

data: {"type": "content", "content": "天气是"}

data: {"type": "tool_call", "tool_id": "environment:get_current_weather", "arguments": {"city": "北京"}, "placeholder": "\n[TOOL_CALL:call_abc123]\n"}

data: {"type": "tool_result", "tool_id": "environment:get_current_weather", "result": "{\"temperature\": 15, \"unit\": \"celsius\"}", "error": false}

data: {"type": "content", "content": "晴天，温度15°C"}

data: {"type": "end"}
```

**SSE解析说明**：

1. 每行以 `data: ` 开头，需要去掉此前缀
2. 每行是独立的JSON对象，需分别解析
3. 遇到 `type: "end"` 或 `type: "error"` 时流结束
4. 建议客户端设置超时时间（如60秒）

**占位符处理**：

`tool_call` 事件中的 `placeholder` 字段表示工具调用在响应文本中的位置标记。

**占位符格式**：`\n[TOOL_CALL:call_abc123]\n`

**处理流程**：
1. **流式响应阶段**：当遇到 `tool_call` 事件时，将 `placeholder` 字段的内容插入到当前响应文本中
2. **保存到数据库**：流结束后，包含占位符的完整响应文本会被保存为 assistant 消息
3. **前端显示建议**：
   - **保留占位符**：将 `[TOOL_CALL:call_id]` 替换为工具调用图标或标记
   - **关联结果**：使用 `call_id` 关联 `tool_call` 和 `tool_result` 事件
   - **状态管理**：根据 `tool_result` 的 `error` 字段更新占位符状态（成功/失败）

**示例**：

| SSE 事件 | 处理动作 | 显示内容 |
|---------|---------|----------|
| `content: "查询北京天气"` | 追加文本 | `查询北京天气` |
| `tool_call: {placeholder: "\n[TOOL_CALL:call_123]\n"}` | 插入占位符 | `查询北京天气\n🔧[工具调用中]\n` |
| `tool_result: {error: false, result: "{...}"}` | 更新状态 | `查询北京天气\n✅[天气查询成功]\n` |
| `content: "温度15°C"` | 追加文本 | `查询北京天气\n✅[天气查询成功]\n温度15°C` |

**最终保存到数据库的 assistant 消息内容**（包含占位符）：
```
查询北京天气
[TOOL_CALL:call_123]
温度15°C
```

**权限说明**：

- 普通用户只能使用公开的 Agent
- 管理员用户可使用所有 Agent
- 使用受限 Agent 返回 `403 Forbidden`

**错误响应**：

- `400 Bad Request`: conversation_id不存在或不属于当前用户
- `403 Forbidden`: 无权限使用指定Agent
- `500 Internal Server Error`: 服务器错误，错误信息在SSE流中

---

## MCP服务

### 获取MCP服务器列表

```
GET /api/v1/mcp/servers
```

**描述**：获取可用的MCP服务器列表及工具信息

**认证**：可选（未认证时仅返回公开服务器）

**请求头**：

```
Authorization: Bearer {access_token}  // 可选
```

**查询参数 (Query Parameters)**：无

**成功响应 (200 OK)**：

```json
[
  {
    "name": "filesystem",
    "description": "文件系统操作",
    "running": true,
    "tools": [
      {
        "tool_id": "filesystem-read",
        "server_name": "filesystem",
        "name": "read_file",
        "description": "读取文件内容"
      },
      {
        "tool_id": "filesystem-write",
        "server_name": "filesystem",
        "name": "write_file",
        "description": "写入文件内容"
      }
    ],
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"]
  }
]
```

**响应字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | MCP服务器名称（唯一标识） |
| description | string | 服务器描述 |
| running | boolean | 服务器是否正在运行 |
| tools | array | 该服务器提供的工具列表 |
| tools[].tool_id | string | 工具唯一标识 |
| tools[].server_name | string | 所属服务器名称 |
| tools[].name | string | 工具名称 |
| tools[].description | string | 工具描述 |
| command | string | 启动命令 |
| args | string[] | 启动参数 |

**权限说明**：

- **未认证/普通用户**：仅返回公开的MCP服务器
- **管理员用户**：返回所有服务器（包括敏感服务如config-admin）

---

### 获取MCP服务器详情

```
GET /api/v1/mcp/servers/{name}
```

**描述**：获取单个MCP服务器的详细信息

**认证**：需要认证

**路径参数 (Path Parameters)**：

| 参数 | 类型 | 说明 |
|------|------|------|
| name | string | MCP服务器名称 |

**成功响应 (200 OK)**：同MCP服务器列表中的单项

**错误响应**：

- `403 Forbidden`: 无权限访问该服务器（普通用户访问非公开服务器）
- `404 Not Found`: 服务器不存在

---

## 对话管理

### 创建对话

```
POST /api/v1/conversation
```

**描述**：创建新的对话会话

**认证**：需要认证

**请求头**：

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求体 (Request Body)**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | 是 | - | 对话标题 |
| model | string | 否 | "gpt-4o-mini" | 使用的模型名称 |

**请求示例**：

```json
{
  "title": "代码助手对话",
  "model": "gpt-4o"
}
```

**成功响应 (200 OK)**：

```json
{
  "id": "conv_123",
  "created_at": "2024-01-15T08:30:00Z",
  "updated_at": "2024-01-15T08:30:00Z",
  "title": "代码助手对话",
  "model": "gpt-4o",
  "messages": []
}
```

**错误响应**：

- `401 Unauthorized`: Token无效
- `500 Internal Server Error`: 创建失败

---

### 获取对话列表

```
GET /api/v1/conversation
```

**描述**：获取当前用户的对话列表（分页）

**认证**：需要认证

**请求头**：

```
Authorization: Bearer {access_token}
```

**查询参数 (Query Parameters)**：

| 参数 | 类型 | 必填 | 默认值 | 约束 | 说明 |
|------|------|------|--------|------|------|
| page | integer | 否 | 1 | ≥ 1 | 页码（从1开始） |
| page_size | integer | 否 | 20 | 1-100 | 每页数量 |

**请求示例**：

```
GET /api/v1/conversation?page=1&page_size=20
```

**成功响应 (200 OK)**：

```json
{
  "items": [
    {
      "id": "conv_123",
      "created_at": "2024-01-15T08:30:00Z",
      "updated_at": "2024-01-15T09:15:00Z",
      "title": "对话1",
      "model": "gpt-4o-mini"
    },
    {
      "id": "conv_124",
      "created_at": "2024-01-14T10:00:00Z",
      "updated_at": "2024-01-14T11:30:00Z",
      "title": "对话2",
      "model": "gpt-4o"
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

**错误响应**：

- `401 Unauthorized`: Token无效
- `400 Bad Request`: 分页参数超出范围

---

### 获取对话详情

```
GET /api/v1/conversation/{conv_id}
```

**描述**：获取单个对话的详细信息，包含所有消息

**认证**：需要认证

**路径参数 (Path Parameters)**：

| 参数 | 类型 | 说明 |
|------|------|------|
| conv_id | string | 对话ID |

**成功响应 (200 OK)**：

```json
{
  "id": "conv_123",
  "created_at": "2024-01-15T08:30:00Z",
  "updated_at": "2024-01-15T09:15:00Z",
  "title": "对话标题",
  "model": "gpt-4o-mini",
  "messages": [
    {
      "id": "msg_123",
      "created_at": "2024-01-15T08:30:00Z",
      "role": "user",
      "content": "你好",
      "conversation_id": "conv_123",
      "tool_calls": []
    },
    {
      "id": "msg_124",
      "created_at": "2024-01-15T08:30:05Z",
      "role": "assistant",
      "content": "你好！有什么可以帮助你的？",
      "conversation_id": "conv_123",
      "tool_calls": []
    }
  ]
}
```

**错误响应**：

- `401 Unauthorized`: Token无效
- `403 Forbidden`: 无权访问该对话（不属于当前用户）
- `404 Not Found`: 对话不存在

---

### 更新对话

```
PATCH /api/v1/conversation/{conv_id}
```

**描述**：更新对话标题

**认证**：需要认证

**请求头**：

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**路径参数 (Path Parameters)**：

| 参数 | 类型 | 说明 |
|------|------|------|
| conv_id | string | 对话ID |

**请求体 (Request Body)**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 新的对话标题 |

**请求示例**：

```json
{
  "title": "新标题"
}
```

**成功响应 (200 OK)**：同"获取对话详情"响应

**错误响应**：

- `401 Unauthorized`: Token无效
- `403 Forbidden`: 无权访问该对话
- `404 Not Found`: 对话不存在

---

### 删除对话

```
DELETE /api/v1/conversation/{conv_id}
```

**描述**：删除指定对话及其所有消息

**认证**：需要认证

**请求头**：

```
Authorization: Bearer {access_token}
```

**路径参数 (Path Parameters)**：

| 参数 | 类型 | 说明 |
|------|------|------|
| conv_id | string | 对话ID |

**成功响应 (200 OK)**：

```json
{
  "message": "Conversation deleted successfully"
}
```

**错误响应**：

- `401 Unauthorized`: Token无效
- `403 Forbidden`: 无权访问该对话
- `404 Not Found`: 对话不存在

---

### 获取对话消息列表

```
GET /api/v1/conversation/{conv_id}/messages
```

**描述**：获取对话中的所有消息

**认证**：需要认证

**路径参数 (Path Parameters)**：

| 参数 | 类型 | 说明 |
|------|------|------|
| conv_id | string | 对话ID |

**成功响应 (200 OK)**：

```json
[
  {
    "id": "msg_123",
    "created_at": "2024-01-15T08:30:00Z",
    "role": "user",
    "content": "帮我查一下天气",
    "conversation_id": "conv_123",
    "tool_calls": []
  },
  {
    "id": "msg_124",
    "created_at": "2024-01-15T08:30:05Z",
    "role": "assistant",
    "content": "正在查询天气信息...\n[TOOL_CALL:call_abc123]\n今天北京天气不错。",
    "conversation_id": "conv_123",
    "tool_calls": [
      {
        "id": "tc_123",
        "created_at": "2024-01-15T08:30:06Z",
        "conversation_id": "conv_123",
        "message_id": "msg_124",
        "tool_call_id": "call_abc123",
        "tool_name": "environment:get_current_weather",
        "mcp_server": "environment",
        "arguments": {"city": "北京"},
        "result": {"temperature": 15, "unit": "celsius", "description": "晴朗"},
        "status": "completed",
        "started_at": "2024-01-15T08:30:06Z",
        "completed_at": "2024-01-15T08:30:07Z",
        "duration_ms": 1000,
        "error": false,
        "error_message": null,
        "error_type": null,
        "retry_count": 0,
        "max_retries": 3
      }
    ]
  }
]
```

**消息字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 消息唯一标识 |
| created_at | string | 创建时间（ISO 8601格式，UTC） |
| role | string | 消息角色：`user`/`assistant`/`system` |
| content | string \| null | 消息内容（assistant消息可能包含工具调用占位符如 `[TOOL_CALL:call_abc123]`） |
| conversation_id | string | 所属对话ID |
| tool_calls | array | 关联的工具调用列表（仅assistant消息可能有值） |

**tool_calls 字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 工具调用记录ID |
| created_at | string | 创建时间（ISO 8601格式，UTC） |
| conversation_id | string | 所属对话ID |
| message_id | string \| null | 关联的消息ID |
| tool_call_id | string | OpenAI工具调用ID（如 `call_abc123`） |
| tool_name | string | 工具名称（格式：`server_name:tool_name`） |
| mcp_server | string \| null | MCP服务器名称 |
| arguments | object | 工具调用参数 |
| result | object \| null | 工具执行结果 |
| status | string | 执行状态：`pending`/`running`/`completed`/`failed`/`timeout` |
| started_at | string \| null | 开始执行时间 |
| completed_at | string \| null | 完成时间 |
| duration_ms | number \| null | 执行时长（毫秒） |
| error | boolean | 是否执行出错 |
| error_message | string \| null | 错误信息 |
| error_type | string \| null | 错误类型 |
| retry_count | number | 已重试次数 |
| max_retries | number | 最大重试次数 |

**错误响应**：

- `401 Unauthorized`: Token无效
- `403 Forbidden`: 无权访问该对话
- `404 Not Found`: 对话不存在

---

### 添加消息到对话

```
POST /api/v1/conversation/{conv_id}/messages
```

**描述**：向对话中添加新消息

**认证**：需要认证

**请求头**：

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**路径参数 (Path Parameters)**：

| 参数 | 类型 | 说明 |
|------|------|------|
| conv_id | string | 对话ID |

**请求体 (Request Body)**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| role | string | 否 | "user" | 消息角色：`user`/`assistant`/`system` |
| content | string | 否 | "" | 消息内容 |

**请求示例**：

```json
{
  "role": "user",
  "content": "帮我查一下天气"
}
```

**成功响应 (200 OK)**：

```json
{
  "id": "msg_125",
  "created_at": "2024-01-15T08:30:10Z",
  "role": "user",
  "content": "帮我查一下天气",
  "conversation_id": "conv_123",
  "tool_calls": []
}
```

**错误响应**：

- `401 Unauthorized`: Token无效
- `403 Forbidden`: 无权访问该对话
- `404 Not Found`: 对话不存在

---

## Agent管理

### 获取Agent列表

```
GET /api/v1/agent
```

**描述**：获取可用的Agent列表

**认证**：可选（未认证时仅返回公开Agent）

**请求头**：

```
Authorization: Bearer {access_token}  // 可选
```

**成功响应 (200 OK)**：

```json
{
  "agents": {
    "chat": {
      "name": "chat",
      "description": "通用对话助手",
      "model": "gpt-4o-mini",
      "mcp_services": []
    },
    "coder": {
      "name": "coder",
      "description": "代码编写助手",
      "model": "gpt-4o",
      "mcp_services": ["filesystem"]
    },
    "city": {
      "name": "city",
      "description": "城市数据分析助手",
      "model": "gpt-4o",
      "mcp_services": ["population", "geospatial"]
    }
  }
}
```

**响应字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| agents | object | Agent字典，键为Agent名称 |
| agents[].name | string | Agent名称（唯一标识） |
| agents[].description | string | Agent描述 |
| agents[].model | string | 使用的模型 |
| agents[].mcp_services | string[] | 集成的MCP服务列表 |

**权限说明**：

- **未认证/普通用户**：仅返回公开的Agent
- **管理员用户**：返回所有Agent

---

### 获取Agent详情

```
GET /api/v1/agent/{name}
```

**描述**：获取单个Agent的详细信息，包括系统提示词

**认证**：需要认证

**路径参数 (Path Parameters)**：

| 参数 | 类型 | 说明 |
|------|------|------|
| name | string | Agent名称 |

**成功响应 (200 OK)**：

```json
{
  "name": "coder",
  "description": "代码编写助手",
  "model": "gpt-4o",
  "system_prompt": "你是一个专业的代码编写助手。你可以帮助用户编写、审查和优化代码...",
  "mcp_services": ["filesystem", "database"]
}
```

**响应字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | Agent名称 |
| description | string | Agent描述 |
| model | string | 使用的模型 |
| system_prompt | string | 系统提示词 |
| mcp_services | string[] | 可使用的MCP服务列表 |

**错误响应**：

- `401 Unauthorized`: Token无效
- `403 Forbidden`: 无权限访问该Agent（普通用户访问非公开Agent）
- `404 Not Found`: Agent不存在

---

### AI助手聊天

```
POST /api/v1/agent/assistant/chat
```

**描述**：AI助手端点，提供配置和管理的智能建议（仅管理员可用）

**认证**：需要认证（仅管理员）

**请求头**：

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求体 (Request Body)**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| message | string | 是 | - | 用户消息 |
| conversation_id | string \| null | 否 | null | 对话ID，为`null`时创建新对话 |

**请求示例**：

```json
{
  "message": "如何添加新的MCP服务？",
  "conversation_id": null
}
```

**响应格式**：Server-Sent Events (SSE) 流式响应

格式说明同"流式聊天"接口

**错误响应**：

- `401 Unauthorized`: Token无效
- `403 Forbidden`: 非管理员用户
- `404 Not Found`: conversation_id不存在

---

## 通用说明

### 响应格式规范

#### 成功响应

API没有统一的响应包装格式，每个接口根据业务直接返回相应数据：

**1. 对象响应**（注册、登录、详情等）
```json
{
  "access_token": "xxx",
  "user": {"id": "xxx", "email": "xxx"}
}
```

**2. 消息响应**（删除操作）
```json
{
  "message": "操作成功"
}
```

**3. 分页响应**（列表查询）
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}
```

**4. 数组响应**（获取消息列表）
```json
[
  {"id": "1", "content": "..."},
  {"id": "2", "content": "..."}
]
```

**5. 字典响应**（Agent列表）
```json
{
  "agents": {
    "chat": {...},
    "coder": {...}
  }
}
```

#### 错误响应

所有错误响应遵循统一格式：

```json
{
  "detail": "错误描述信息"
}
```

#### HTTP状态码

| 状态码 | 说明 | 示例场景 |
|--------|------|----------|
| 200 OK | 请求成功 | 获取数据成功 |
| 400 Bad Request | 请求参数错误 | 参数验证失败、数据已存在 |
| 401 Unauthorized | 未授权 | Token无效或过期 |
| 403 Forbidden | 权限不足 | 访问他人资源、使用受限Agent |
| 404 Not Found | 资源不存在 | 对话/Agent不存在 |
| 500 Internal Server Error | 服务器错误 | 服务器内部异常 |

---

### 身份认证

#### JWT Token

除注册和登录接口外，所有接口都需要在请求头中携带有效的JWT Token：

```
Authorization: Bearer {access_token}
```

**Token格式**：`Bearer` + 空格 + `access_token`

**示例**：
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImV4cCI6MTcwNjc4MTIwMH0.xxx
```

#### Token获取方式

| 方式 | 接口 | 说明 |
|------|------|------|
| 注册 | `POST /user/register` | 创建新用户并获取Token |
| 验证码登录 | `POST /user/login/code` | 使用验证码登录 |
| 密码登录 | `POST /user/login/password` | 使用密码登录 |
| 刷新Token | `GET /auth/refresh-token` | Token即将过期时刷新 |

#### Token有效期

- **默认有效期**：3天（72小时）
- **过期处理**：使用 `/auth/refresh-token` 接口刷新
- **存储建议**：客户端应安全存储Token（如localStorage、httpOnly cookie）

---

### 用户权限

#### 普通用户

- 可使用公开的Agent列表
- 可访问公开的MCP服务
- 只能管理自己创建的对话
- 无法访问系统配置相关功能

#### 管理员用户

- 可使用所有Agent（包括配置管理类Agent）
- 可访问所有MCP服务（包括敏感服务如config-admin）
- 可使用AI助手功能（`/agent/assistant/chat`）
- 其他权限与普通用户相同

**管理员判断依据**：用户邮箱在系统配置的 `ADMIN_EMAILS` 列表中

**默认管理员邮箱**：`Admin@localhost`

---

### 请求规范

#### Content-Type

所有POST/PUT/PATCH请求必须设置正确的Content-Type：

```
Content-Type: application/json
```

#### 请求体格式

- 使用JSON格式
- 字段名使用小写蛇形命名（snake_case）
- 日期时间使用ISO 8601格式（UTC时区）：`2024-01-15T08:30:00Z`
- 布尔值使用小写：`true` / `false`
- 空值使用`null`（非JSON中）

#### 请求头规范

| 请求头 | 格式 | 说明 |
|--------|------|------|
| Authorization | `Bearer {token}` | 认证Token |
| Content-Type | `application/json` | 请求体类型 |

---

### 响应规范

#### 数据格式

- 使用JSON格式
- 字段名使用小写蛇形命名（snake_case）
- 日期时间使用ISO 8601格式（UTC时区）
- 布尔值使用小写：`true` / `false`
- 空值使用`null`

#### 分页规范

**查询参数**：
- `page`: 页码，从1开始
- `page_size`: 每页数量，范围1-100，默认20

**分页响应**：
```json
{
  "items": [...],      // 当前页数据
  "total": 100,         // 总记录数
  "page": 1,            // 当前页码
  "page_size": 20,      // 每页数量
  "total_pages": 5      // 总页数
}
```

---

### SSE流式响应规范

#### 连接建立

客户端应使用EventSource或类似技术建立SSE连接：

**JavaScript示例**：
```javascript
const eventSource = new EventSource('/api/v1/chat/stream', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);

  if (data.type === 'end') {
    eventSource.close();
  }
};
```

#### 数据解析

每行数据格式：`data: {json_data}`

解析步骤：
1. 读取一行数据
2. 去除 `data: ` 前缀
3. 解析剩余部分为JSON
4. 根据 `type` 字段处理数据

#### 超时处理

- 建议设置连接超时：60秒
- 建议设置读取超时：120秒
- 超时后应关闭连接并重新建立

#### 错误处理

- 检查HTTP状态码
- 处理 `type: "error"` 事件
- 实现重连机制（指数退避）

---

### 参数类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| string | 字符串 | `"hello"` |
| integer | 整数 | `42` |
| boolean | 布尔值 | `true` / `false` |
| array | 数组 | `["item1", "item2"]` |
| string[] | 字符串数组 | `["a", "b", "c"]` |
| object | 对象 | `{"key": "value"}` |
| string \| null | 可空字符串 | `"value"` 或 `null` |

---

### 注意事项

1. **时区处理**：所有时间字段使用ISO 8601格式（UTC时区），客户端需自行转换

2. **错误重试**：
   - 4xx错误：通常是客户端错误，不建议重试
   - 5xx错误：服务器错误，可以使用指数退避策略重试

3. **并发限制**：
   - 建议客户端限制并发请求数量
   - 流式接口建议单一连接

4. **数据验证**：
   - 客户端应在发送前验证数据格式
   - 服务端会验证数据并返回详细错误信息

5. **安全建议**：
   - Token应安全存储，防止XSS攻击
   - 使用HTTPS传输（生产环境）
   - 不要在URL中传递敏感信息

---

### 数据模型定义

#### UserCreate
```typescript
{
  email: string;          // 用户邮箱
  password: string;       // 用户密码（最少6位）
  verification_code: string;  // 验证码
}
```

#### UserLoginPassword
```typescript
{
  email: string;          // 用户邮箱
  password: string;       // 用户密码
}
```

#### UserLoginCode
```typescript
{
  email: string;          // 用户邮箱
  verification_code: string;  // 验证码
}
```

#### UserUpdate
```typescript
{
  password?: string;      // 新密码（可选）
}
```

#### ConversationCreate
```typescript
{
  title: string;          // 对话标题
  model?: string;         // 模型名称（可选，默认"gpt-4o-mini"）
}
```

#### ConversationUpdate
```typescript
{
  title?: string;         // 新标题（可选）
}
```

#### ChatStreamRequest
```typescript
{
  conversation_id?: string | null;  // 对话ID（可选）
  message: string;        // 用户消息
  agent?: string;         // Agent名称（可选，默认"chat"）
  mcp_services?: string[];  // MCP服务列表（可选）
}
```

#### AssistantChatRequest
```typescript
{
  message: string;        // 用户消息
  conversation_id?: string | null;  // 对话ID（可选）
}
```

#### PaginationParams
```typescript
{
  page?: number;          // 页码（可选，默认1，最小1）
  page_size?: number;     // 每页数量（可选，默认20，范围1-100）
}
```

