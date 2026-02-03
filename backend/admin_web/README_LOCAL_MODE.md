# Admin Web 本地文件模式

## 概述

admin_web 界面已改造为**不依赖后端服务器**的模式，可以直接读取和修改本地配置文件。

## 修改内容

### 1. 配置文件

#### Agent 配置文件
- **路径**: `backend/config/agents.json`
- **说明**: 将原本硬编码在 `app/agents/__init__.py` 中的 Agent 配置移到了独立的 JSON 文件
- **结构**:
  ```json
  {
    "agents": {
      "agent_name": {
        "name": "agent_name",
        "description": "描述",
        "model": "模型名称",
        "system_prompt": "系统提示词",
        "mcp_services": ["服务列表"],
        "required_mcp_services": ["必需服务"],
        "enable_tool_calling": true
      }
    }
  }
  ```

#### MCP 服务器配置文件
- **路径**: `backend/mcp_servers/config/servers.json`
- **说明**: MCP 服务器的配置文件，保持原有结构

### 2. Vite 配置

#### 文件: `admin_web/vite.config.ts`
- 添加了 `localFileApiPlugin` 插件
- 在开发服务器中添加中间件，处理本地文件 API
- 支持以下端点：
  - `GET /local-api/mcp-servers` - 读取 MCP 服务器配置
  - `POST /local-api/mcp-servers` - 更新 MCP 服务器配置
  - `GET /local-api/agents` - 读取 Agent 配置
  - `POST /local-api/agents` - 更新 Agent 配置

### 3. 前端 API 层

#### 新建文件: `admin_web/src/lib/localApi.ts`
- 替代原有的 `api.ts`（需要后端服务器）
- 使用 `/local-api/*` 端点直接操作本地文件
- 提供与原 API 相同的接口格式，确保组件兼容

### 4. 组件更新

#### Dashboard 组件 (`admin_web/src/pages/Dashboard.tsx`)
- 从 `@/lib/localApi` 导入 API 函数
- 添加 Agent 创建、更新、删除的本地文件操作
- 支持直接修改配置文件并刷新

#### MCPServerCard 组件 (`admin_web/src/components/MCPServerCard.tsx`)
- 显示服务器描述信息
- 显示命令和参数信息

## 使用方法

### 启动前端

```bash
cd backend/admin_web
npm install  # 首次运行需要安装依赖
npm run dev  # 启动开发服务器
```

访问 http://localhost:3000

### 功能说明

1. **查看 MCP 服务**: 在"MCP 服务"标签页可以查看所有配置的 MCP 服务器
2. **查看/编辑 Agent**: 在"Agent 管理"标签页可以：
   - 查看所有 Agent
   - 创建新 Agent
   - 编辑现有 Agent
   - 删除 Agent

### 配置文件更新

所有修改会**实时保存**到配置文件：
- Agent 修改 → `backend/config/agents.json`
- MCP 服务器修改 → `backend/mcp_servers/config/servers.json`

## 注意事项

1. **开发模式**: 当前配置仅在 Vite 开发模式下有效（`npm run dev`）
2. **生产构建**: 如果需要生产环境使用，需要调整配置或添加后端 API
3. **文件权限**: 确保运行开发服务器的用户对配置文件有读写权限

## 后续集成

如果需要让后端服务器也使用这些配置文件：

1. 修改 `app/agents/__init__.py`，从 `config/agents.json` 读取 Agent 配置
2. Agent 初始化时从 JSON 文件动态创建，而不是硬编码

示例代码：

```python
import json
from pathlib import Path

def load_agents_config():
    config_path = Path(__file__).parent.parent / 'config' / 'agents.json'
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)

# 在初始化时使用配置
def _initialize_agent_pool():
    global _agent_pool
    config = load_agents_config()

    for name, agent_config in config['agents'].items():
        # 动态创建 Agent 实例
        ...
```

## 文件变更清单

### 新增文件
- `backend/config/agents.json` - Agent 配置文件
- `backend/admin_web/src/lib/localApi.ts` - 本地文件 API

### 修改文件
- `backend/admin_web/vite.config.ts` - 添加本地文件 API 插件
- `backend/admin_web/src/pages/Dashboard.tsx` - 使用本地 API
- `backend/admin_web/src/components/MCPServerCard.tsx` - 显示更多信息
- `backend/admin_web/src/types/index.ts` - 扩展 MCPServer 类型

## 开发建议

1. **测试**: 修改配置后刷新页面查看效果
2. **备份**: 修改前可以备份配置文件
3. **验证**: JSON 格式错误会导致加载失败，注意格式正确性
