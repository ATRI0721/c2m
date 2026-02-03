# Code2MCP Backend

> 一个灵活的 AI 应用后端框架,支持多 Agent 管理、对话系统和 MCP (Model Context Protocol) 服务集成

## 项目简介

Code2MCP Backend 是一个基于 FastAPI 构建的现代化 AI 应用后端框架。它提供了一个完整的 Agent 系统,让开发者可以轻松创建和管理多个具有不同能力的 AI 助手,每个 Agent 都可以配置独立的大模型、提示词和 MCP 服务。

### 核心特性

- **🤖 多 Agent 系统** - 支持创建多个独立的 AI 助手，每个 Agent 有专属的模型、提示词和能力配置
- **📝 动态配置** - 通过配置文件动态创建 Agent，无需修改代码
- **💬 对话管理** - 简洁高效的对话和消息管理，支持流式响应
- **🔌 MCP 服务集成** - 原生支持 Model Context Protocol，可轻松扩展 AI 能力
- **🔧 工具调用可视化** - SSE 实时返回工具调用过程，前端可展示执行状态
- **👤 用户管理** - 完整的用户认证、授权和管理功能
- **⚡ 高性能** - Agent 池化管理，单例模式复用，无需重复创建实例
- **🎯 易扩展** - 清晰的架构设计，只需添加配置即可创建新 Agent

## 技术栈

- **框架**: FastAPI 0.123.0
- **数据库**: SQLite + SQLModel
- **认证**: JWT (JSON Web Tokens)
- **AI 集成**: OpenAI API (兼容各类大模型)
- **异步**: AsyncIO + 异步流式响应

## 应用场景

### 1. 多角色 AI 助手平台
为不同场景创建专用 Agent:
- `chat` - 通用聊天助手
- `weather` - 天气与环境数据查询
- `code` - 代码编写和分析
- `city` - 城市计算专家助手

### 2. 企业级 AI 服务
- 员工助手 (文档查询、流程咨询)
- 客户服务 (智能问答、工单处理)
- 技术支持 (代码诊断、问题排查)

### 3. MCP 能力扩展
通过 MCP 服务为 AI 添加外部能力:
- 环境数据 (天气、空气质量)
- 地理空间 (路线规划、POI查询)
- 城市规划 (人口数据、开放数据)
- 经济数据 (汇率查询)

## 📚 文档

### 📖 前端开发文档
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** ⭐
  - 完整的前端接口文档
  - 包含所有API端点、请求/响应格式
  - 认证机制、错误处理
  - React集成示例

### 🔧 开发者文档
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 系统架构设计
- **[MCP_API_DOCUMENTATION.md](./MCP_API_DOCUMENTATION.md)** - MCP服务集成指南
- **[REFACTOR_REPORT.md](./REFACTOR_REPORT.md)** - 代码重构记录

### 📖 项目结构

```
backend/
├── app/                       # FastAPI应用
│   ├── agents/                # Agent系统
│   │   ├── baseagent.py      # Agent基类（通用能力）
│   │   ├── dynamic_agent.py  # 动态Agent实现（流式响应+工具调用）
│   │   ├── agent_factory.py  # Agent工厂
│   │   ├── agent_config.py   # Agent配置管理
│   │   └── __init__.py       # Agent池管理
│   ├── apis/                  # API路由
│   │   ├── auth.py           # 认证接口
│   │   ├── user.py           # 用户管理
│   │   └── chat.py           # 对话与Agent接口
│   ├── core/                  # 核心配置
│   │   ├── config.py         # 配置管理
│   │   ├── security.py       # 安全认证
│   │   └── deps.py           # 依赖注入
│   ├── models/                # 数据模型
│   │   ├── database.py       # 数据库模型
│   │   ├── dto.py            # 数据传输对象
│   │   └── interfaces.py     # 接口定义
│   ├── services/              # 服务层
│   │   ├── chat_service.py   # 聊天服务（编排层）
│   │   ├── mcp_service.py    # MCP服务配置
│   │   ├── mcp_client_manager.py  # MCP客户端管理
│   │   └── mcp_tool_registry.py   # MCP工具注册表
│   └── main.py                # 应用入口
├── mcp_servers/              # MCP服务器模块 ✨
│   ├── servers/              # 按类别组织的MCP服务器
│   │   ├── environment/      # 环境数据
│   │   ├── geospatial/       # 地理空间
│   │   └── urban/            # 城市规划
│   ├── registry.py           # 服务器注册表
│   └── scripts/              # MCP管理工具
├── tests/                    # 测试代码
│   ├── unit/                # 单元测试
│   ├── integration/         # 集成测试
│   └── e2e/                 # 端到端测试
├── data/                     # 数据库文件
├── requirements.txt
├── API_DOCUMENTATION.md     # 前端API文档 ⭐
├── ARCHITECTURE.md          # 系统架构文档
└── .env                      # 环境变量配置
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件,配置 OPENAI_API_KEY 等参数
```

### 3. 启动服务

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 访问文档

服务启动后，访问以下地址：

- **Swagger UI**: http://localhost:8000/docs
- **API文档**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### 5. 测试 API

```bash
# 获取所有可用 Agent
curl http://localhost:8000/api/v1/chat/agents

# 用户注册
curl -X POST http://localhost:8000/api/v1/user/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","verification_code":"123456"}'

# 流式聊天 (需要先登录获取token)
curl -X POST http://localhost:8000/api/v1/chat/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好",
    "agent": "chat",
    "mcp_services": []
  }'
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
pytest

# 运行特定测试
pytest tests/unit/test_mcp_tool_registry.py
pytest tests/integration/test_city_agent_mcp.py

# 查看测试覆盖率
pytest --cov=app --cov-report=html
```

### 测试覆盖率

| 模块 | 覆盖率 | 说明 |
|------|--------|------|
| `mcp_tool_registry.py` | 85% | MCP工具注册表 |
| `mcp_client_manager.py` | 80% | MCP客户端管理器 |
| `city_agent.py` | 92% | 城市计算Agent |
| `weather_agent.py` | 92% | 天气Agent |
| `baseagent.py` | 84% | Agent基类 |

## 🔧 Agent 系统

### 架构设计

Agent 系统采用分层架构，职责清晰：

| 组件 | 职责 |
|------|------|
| **BaseAgent** | 抽象基类，定义通用能力（MCP工具集成、消息转换） |
| **DynamicAgent** | 具体实现，处理流式响应和工具调用循环 |
| **AgentFactory** | 工厂类，根据配置动态创建Agent实例 |
| **ChatService** | 服务编排层，管理对话和SSE事件格式化 |

### Agent 配置

每个 Agent 通过配置文件定义，支持以下配置：

- `name`: Agent 名称
- `description`: Agent 描述
- `model`: 使用的大模型
- `system_prompt`: 系统提示词
- `mcp_services`: 使用的 MCP 服务列表
- `enable_tool_calling`: 是否启用工具调用

### 可用的 Agent

| Agent | 名称 | 描述 | MCP服务 |
|-------|------|------|---------|
| `chat` | 通用聊天 | 日常对话、问答 | 无 |
| `weather` | 天气助手 | 天气、空气质量查询 | environment |
| `code` | 代码助手 | 代码编写、调试、分析 | 无 |
| `city` | 城市计算 | 城市数据综合查询 | 10+服务 |
| `assistant` | AI助手 | 系统配置和管理建议 | config-admin |

### 添加新的 Agent

现在通过配置文件即可添加新 Agent，无需修改代码：

1. 在配置文件中添加 Agent 定义：

```json
{
  "agents": {
    "my_agent": {
      "name": "my_agent",
      "description": "我的自定义Agent",
      "model": "deepseek-chat",
      "system_prompt": "你是一个...",
      "mcp_services": ["environment"],
      "enable_tool_calling": true
    }
  },
  "public_agents": ["chat", "my_agent"]
}
```

2. 重启服务，Agent 会自动加载

**注意**:
- Agent 池在应用启动时自动初始化
- 所有 Agent 以单例形式存在，性能高效
- 支持热重载配置（需调用 reload 接口）

### 流式响应格式

Agent 通过 SSE (Server-Sent Events) 返回结构化事件：

```javascript
// 文本内容
{"type": "content", "content": "文本片段"}

// 工具调用开始
{"type": "tool_call", "tool_id": "server:tool", "arguments": {...}}

// 工具执行结果
{"type": "tool_result", "tool_id": "server:tool", "result": "...", "error": false}

// 错误事件
{"type": "error", "message": "错误描述"}
```

详细说明请参考 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 📊 数据模型

### User（用户）
- `id`: 用户ID
- `email`: 邮箱
- `hashed_password`: 加密密码
- `created_at`: 创建时间
- `is_active`: 是否激活
- `last_login`: 最后登录时间
- `conversations`: 关联的对话列表

### Conversation（对话）
- `id`: 对话ID
- `created_at`: 创建时间
- `updated_at`: 更新时间
- `title`: 对话标题
- `model`: 使用的大模型
- `user_id`: 所属用户ID
- `messages`: 关联的消息列表

### Message（消息）
- `id`: 消息ID
- `created_at`: 创建时间
- `role`: 角色 (user/assistant/system)
- `content`: 消息内容
- `conversation_id`: 所属对话ID

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**最后更新**: 2025-02-02
