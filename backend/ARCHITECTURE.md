# 城市计算项目 - 架构说明

## 📁 项目结构

```
backend/
│
├── 📱 app/                          # FastAPI应用（后端服务）
│   ├── agents/                      # AI代理定义
│   ├── apis/                        # REST API路由
│   ├── core/                        # 核心配置
│   ├── models/                      # 数据模型
│   ├── services/                    # 业务逻辑
│   └── main.py                      # 应用入口
│
├── 🌐 mcp_servers/                  # MCP服务器模块 ⭐
│   ├── servers/                     # 按类别组织的MCP服务器
│   │   ├── environment/             # 环境数据（2个）
│   │   │   ├── environment/         # ✅ 空气质量+天气
│   │   │   └── usgs-quakes-mcp/     # ✅ 美国地震
│   │   ├── geospatial/              # 地理空间（5个）
│   │   │   ├── geocoding-mcp/       # ✅ 地址/坐标互转
│   │   │   ├── osm-mcp-server/      # ✅ 路线规划
│   │   │   ├── overpass/            # ✅ OSM数据查询
│   │   │   ├── opentripmap/         # ✅ 旅游POI
│   │   │   └── wikidata-mcp/        # ✅ Wikidata
│   │   ├── urban/                   # 城市规划（2个）
│   │   │   ├── population/          # ✅ 人口查询
│   │   │   └── opengov-mcp/         # ✅ 城市开放数据
│   │   └── economic/                # 经济数据（1个）
│   │       └── exchange-rate/       # ✅ 汇率查询
│   │
│   ├── config/                      # 配置文件
│   │   └── servers.json             # Claude配置
│   ├── scripts/                     # 管理工具
│   │   ├── manager.py               # 统一管理器
│   │   ├── install.py               # 安装脚本
│   │   └── verify.py                # 验证脚本
│   ├── docs/                        # 文档
│   ├── registry.json                # 服务器注册表 ⭐
│   ├── registry.py                  # 注册表管理
│   └── README.md                    # MCP模块说明
│
├── 🧪 tests/                        # 测试代码
│   ├── unit/                        # 单元测试
│   ├── integration/                 # 集成测试
│   └── e2e/                         # 端到端测试
│
├── 💾 data/                         # 数据文件
├── .env                             # 环境变量
├── requirements.txt                 # Python依赖
└── README.md                        # 项目说明
```

## 🎯 MCP模块详细说明

### 1️⃣ 环境数据 (environment)

| 服务器 | 功能 | API | 密钥 |
|--------|------|-----|------|
| **environment** | 空气质量、天气、风速、湿度、气温 | Open-Meteo | ❌ |
| **usgs-quakes** | 美国地震查询 | USGS | ❌ |

### 2️⃣ 地理空间 (geospatial)

| 服务器 | 功能 | API | 密钥 |
|--------|------|-----|------|
| **geocoding** | 地址/坐标互转 | Nominatim | ❌ |
| **osm** | 路线规划、距离计算 | OSRM | ❌ |
| **overpass** | OSM节点、路径查询 | Overpass | ❌ |
| **opentripmap** | 旅游景点POI | OpenTripMap | ⚠️ 需要 |
| **wikidata** | SPARQL查询 | Wikidata | ❌ |

### 3️⃣ 城市规划 (urban)

| 服务器 | 功能 | API | 密钥 |
|--------|------|-----|------|
| **population** | 国家人口数据 | REST Countries | ❌ |
| **opengov** | 城市开放数据 | Socrata | ❌ |

### 4️⃣ 经济数据 (economic)

| 服务器 | 功能 | API | 密钥 |
|--------|------|-----|------|
| **exchange-rate** | 货币汇率、转换 | Frankfurter | ❌ |

## 🔧 使用方式

### 方式1：通过管理器（推荐）

```bash
# 列出所有服务器
python -m mcp_servers.scripts.manager list

# 按类别列出
python -m mcp_servers.scripts.manager list --category environment

# 验证服务器
python -m mcp_servers.scripts.manager verify

# 生成配置
python -m mcp_servers.scripts.manager config

# 查看统计
python -m mcp_servers.scripts.manager stats
```

### 方式2：使用注册表

```python
from mcp_servers import MCPServerRegistry

registry = MCPServerRegistry()

# 列出所有服务器
servers = registry.list_servers()

# 获取特定服务器
server = registry.get_server("environment")

# 获取统计信息
stats = registry.get_stats()
```

## 📊 统计信息

- **总服务器数**: 9个
- **自建服务器**: 4个
- **第三方服务器**: 5个
- **需要认证**: 1个
- **完全免费**: 8个

## 🤖 Agent系统架构

### 架构分层

```
┌─────────────────────────────────────────┐
│           API Layer (chat.py)           │  REST API 接口层
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      ChatService (chat_service.py)      │  服务编排层
│  - 对话管理                              │
│  - 消息持久化                            │
│  - SSE事件格式化                         │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       AgentFactory (agent_factory.py)   │  工厂层
│  - Agent创建和管理                       │
│  - 配置加载                              │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      DynamicAgent (dynamic_agent.py)    │  具体实现层
│  - 流式响应生成                          │
│  - 工具调用循环                          │
│  - 事件通知（content/tool_call/result）  │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        BaseAgent (baseagent.py)         │  抽象基类层
│  - MCP工具集成                           │
│  - 消息格式转换                          │
│  - 通用能力定义                          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│    MCPToolRegistry (mcp_tool_registry)  │  工具注册层
│  - 工具注册和查找                        │
│  - 工具执行管理                          │
└─────────────────────────────────────────┘
```

### 组件职责

| 组件 | 文件 | 职责 |
|------|------|------|
| **BaseAgent** | `agents/baseagent.py` | 抽象基类，定义Agent通用能力 |
| **DynamicAgent** | `agents/dynamic_agent.py` | 具体实现，处理流式响应和工具调用循环 |
| **AgentFactory** | `agents/agent_factory.py` | 工厂类，负责Agent创建和配置管理 |
| **ChatService** | `services/chat_service.py` | 服务编排层，管理对话和SSE事件 |
| **MCPToolRegistry** | `services/mcp_tool_registry.py` | MCP工具注册表，管理所有可用工具 |

### 数据流转

#### 1. 聊天请求流程

```
用户请求
    │
    ▼
API Layer (chat.py)
    │
    ▼
ChatService.stream_chat()
    │
    ├── 1. 验证用户和对话
    ├── 2. 保存用户消息
    ├── 3. 调用 Agent.generate_response()
    │       │
    │       ├── 生成文本内容 → yield "content"
    │       ├── 调用工具 → yield {"type": "tool_call", ...}
    │       └── 工具结果 → yield {"type": "tool_result", ...}
    │
    ├── 4. 格式化SSE事件
    └── 5. 保存助手回复
```

#### 2. SSE事件类型

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

### 设计原则

#### 单一职责原则
- **BaseAgent**: 只定义通用接口和工具集成
- **DynamicAgent**: 只处理响应生成逻辑
- **AgentFactory**: 只负责创建实例
- **ChatService**: 只做服务编排，不关心Agent内部实现

#### 开闭原则
- 新增Agent只需添加配置，无需修改代码
- 通过继承BaseAgent可以自定义特殊Agent

#### 依赖倒置
- 高层模块（ChatService）依赖抽象（BaseAgent）
- 低层模块（DynamicAgent）实现抽象

### 工具调用循环

```
┌─────────────────────────────────────┐
│  调用 OpenAI API (stream=True)      │
└────────────┬────────────────────────┘
             │
             ├─── 返回文本内容
             │    └── yield content
             │
             └─── 返回工具调用
                  │
                  ├── 发送 tool_call 事件
                  │
                  ├── 执行MCP工具
                  │
                  ├── 发送 tool_result 事件
                  │
                  └── 继续下一轮循环
```

## 🔄 与主项目的关系

```
┌─────────────────┐
│   FastAPI App   │  后端应用层
└────────┬────────┘
         │
         ├──> 调用 MCP服务器
         │
┌────────▼────────┐
│  MCP 模块        │  工具层（高内聚低耦合）
└────────┬────────┘
         │
         ├──> environment/  (环境数据)
         ├──> geospatial/   (地理空间)
         ├──> urban/        (城市规划)
         └──> economic/     (经济数据)
```

## 🎨 设计优势

### ✅ 高内聚
- 同类服务器聚合在一起
- 每个类别职责单一明确
- 共享功能可复用

### ✅ 低耦合
- 通过注册表解耦
- 配置自动生成
- 独立的模块边界

### ✅ 易维护
- 统一的管理接口
- 清晰的目录结构
- 完善的文档

### ✅ 可扩展
- 添加新服务器只需2步
- 新类别自动识别
- 配置自动同步

## 📚 相关文档

- [MCP模块说明](mcp_servers/README.md)
- [架构设计](mcp_servers/docs/ARCHITECTURE.md)
- [项目报告](mcp_servers/docs/PROJECT_REPORT.md)
- [服务器清单](mcp_servers/docs/mcp_servers_list.md)
