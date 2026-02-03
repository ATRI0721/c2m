# Code2MCP 配置管理系统

## 概述

Code2MCP现在具有完整的配置管理能力，包括：

1. **config-admin MCP服务** - 专门用于管理Agent和MCP服务器配置
2. **白名单机制** - 保护敏感配置不被普通用户访问
3. **AI配置助手** - 通过对话方式管理配置

---

## 1. Config-Admin MCP服务

### 功能

`config-admin`是一个特殊的MCP服务器，提供完整的配置管理能力：

#### Agent管理工具
- `list_agents` - 列出所有Agent及其配置
- `get_agent` - 获取指定Agent的详细配置
- `create_agent` - 创建新的Agent配置
- `update_agent` - 更新现有Agent配置
- `delete_agent` - 删除Agent配置

#### MCP服务器管理工具
- `list_mcp_servers` - 列出所有MCP服务器配置
- `get_mcp_server` - 获取指定MCP服务器配置
- `add_mcp_server` - 添加或更新MCP服务器
- `remove_mcp_server` - 删除MCP服务器配置

### 安全限制

- 此服务仅对`assistant` agent可用
- 普通用户无法直接访问此服务
- assistant agent不能删除自身

---

## 2. 白名单机制

### 配置位置

白名单配置存储在 `.env` 文件中：

```bash
PUBLIC_AGENTS=["chat", "city", "weather", "code"]
PUBLIC_MCP_SERVERS=["environment", "geocoding", "osm", ...]
ADMIN_AGENTS=["assistant"]
```

### 三个白名单层次

1. **PUBLIC_AGENTS** - 前端用户可以看到和使用的普通Agent
2. **PUBLIC_MCP_SERVERS** - 前端用户可以看到和使用的MCP服务器
3. **ADMIN_AGENTS** - 具有完整权限的Agent（可访问config-admin等敏感服务）

### Admin Web白名单管理

在 **admin_web** 的"白名单管理"页面，你可以：

- ✅ **可视化选择** - 点击徽章来添加/移除白名单项
- ✅ **实时保存** - 修改直接写入.env文件
- ✅ **智能提示** - 显示未列出的资源，避免遗漏
- ✅ **警告提醒** - Admin Agent用红色标识，提醒谨慎操作

#### 使用步骤

1. 启动admin_web: `cd admin_web && npm run dev`
2. 访问 http://localhost:3000
3. 点击左侧"🛡️ 白名单管理"
4. 点击徽章来切换白名单状态
5. 点击"保存配置"按钮
6. **重要**: 重启后端服务使更改生效

### API过滤

所有相关API都支持`all`参数：

- `GET /api/v1/chat/agents?all=true` - 获取所有Agent（包括assistant）
- `GET /api/v1/chat/mcp/servers?all=true` - 获取所有MCP服务器（包括config-admin）
- `GET /api/v1/chat/mcp/tools?all=true` - 获取所有工具（包括敏感服务的工具）

默认情况下，前端只能访问白名单中的资源。

---

## 3. AI配置助手 (Assistant Agent)

### 功能

`assistant` agent是一个专门的配置管理助手，具有以下特点：

- **完整的config-admin访问权限** - 可以读取和修改所有配置
- **智能对话界面** - 通过自然语言管理配置
- **安全确认机制** - 修改前会征求用户同意
- **自我保护** - 不能删除自身

### 使用示例

#### 创建Agent
```
用户: 帮我创建一个专门处理旅游咨询的agent
助手: 好的，我来帮您创建一个旅游咨询agent。我需要了解一些信息：
     1. 这个agent的主要用途是什么？
     2. 需要使用哪些MCP服务？
     ...
```

#### 查看配置
```
用户: 显示所有可用的MCP服务器
助手: [使用list_mcp_servers工具] 系统中配置了以下MCP服务器：...
```

#### 更新配置
```
用户: 给chat agent添加weather服务
助手: 我将给chat agent添加weather MCP服务，确认吗？
     [用户确认]
     [使用update_agent工具]
     已成功更新chat agent配置！
```

---

## 4. 配置文件结构

### Agent配置

位置：`app/agents/config/{agent_name}.json`

```json
{
  "name": "agent-name",
  "description": "Agent描述",
  "model": "deepseek-chat",
  "system_prompt": "系统提示词",
  "mcp_services": ["service1", "service2"],
  "enable_tool_calling": true
}
```

### MCP服务器配置

位置：`mcp_servers/config/servers.json`

```json
{
  "mcpServers": {
    "server-name": {
      "command": "python",
      "args": ["path/to/server.py"],
      "description": "服务器描述",
      "env": {
        "API_KEY": "xxx"
      }
    }
  }
}
```

---

## 5. 安全最佳实践

### 白名单管理

1. **定期审查** - 定期检查PUBLIC_AGENTS和PUBLIC_MCP_SERVERS列表
2. **通过Admin Web管理** - 使用admin_web的白名单管理功能，可视化操作更安全
3. **环境变量覆盖** - 可以通过环境变量动态调整白名单
4. **最小权限原则** - 只将必要的Agent和服务加入公开列表
5. **Admin Agent保护** - Admin Agent数量应保持最少（通常只有assistant）

### Admin Agent保护

1. **限制访问** - assistant agent只在后端内部使用，不暴露给前端（除非在ADMIN_AGENTS中）
2. **监控操作** - 记录所有配置修改操作
3. **确认机制** - 危险操作前要求用户确认

### 敏感服务保护

1. **config-admin保护** - 只对ADMIN_AGENTS中的agent可见
2. **API密钥管理** - 使用环境变量存储敏感信息
3. **文件权限** - 确保配置文件权限正确
2. **最小权限原则** - 只公开必要的资源
3. **环境变量覆盖** - 可以通过环境变量动态调整白名单

### Admin Agent保护

1. **限制访问** - assistant agent只在后端内部使用，不暴露给前端
2. **监控操作** - 记录所有配置修改操作
3. **确认机制** - 危险操作前要求用户确认

### 敏感服务保护

1. **config-admin保护** - 只对ADMIN_AGENTS中的agent可见
2. **API密钥管理** - 使用环境变量存储敏感信息
3. **文件权限** - 确保配置文件权限正确

---

## 6. Admin Web白名单管理

### 概述

Admin Web提供了一个可视化的白名单管理界面，让管理员可以轻松控制哪些Agent和MCP服务器对前端用户可见。

### 访问方式

1. 启动Admin Web: `cd admin_web && npm run dev`
2. 访问: http://localhost:3000
3. 点击左侧导航的"🛡️ 白名单管理"

### 功能特点

#### 1. 公开Agent管理
- **显示**: 所有可用的Agent列表
- **操作**: 点击徽章来切换白名单状态
- **状态**: 已选中的Agent显示为实心徽章
- **提示**: 显示未列出的Agent（既不在公开列表，也不在管理员列表）

#### 2. 公开MCP服务器管理
- **显示**: 所有可用的MCP服务器（自动排除config-admin）
- **操作**: 点击徽章来切换白名单状态
- **保护**: config-admin自动隐藏，不会显示在列表中
- **提示**: 显示未列出的服务器

#### 3. Admin Agent管理
- **显示**: 所有可用的Agent
- **警告**: 使用红色标识，提醒这些Agent具有完整权限
- **操作**: 点击徽章来切换管理员权限
- **保护**: 警告提示框提醒谨慎操作

#### 4. 智能提示
- **重要提示卡片**: 说明白名单的作用和注意事项
- **未列出资源警告**: 显示既不在公开列表也不在管理员列表的资源
- **保存确认**: 提醒需要重启后端服务

### 使用流程

#### 步骤1: 打开白名单管理页面
```
访问 Admin Web -> 点击"白名单管理"
```

#### 步骤2: 选择公开Agent
```
点击徽章来选择哪些Agent对普通用户可见
- 绿色 = 已选中（公开可见）
- 灰色 = 未选中（不可见）
```

#### 步骤3: 选择公开MCP服务器
```
点击徽章来选择哪些MCP服务器对普通用户可用
config-admin自动排除，不会显示在列表中
```

#### 步骤4: 配置Admin Agent
```
谨慎选择哪些Agent具有管理员权限
这些Agent可以访问config-admin等敏感服务
```

#### 步骤5: 保存配置
```
点击"保存配置"按钮
配置会直接写入.env文件
```

#### 步骤6: 重启服务
```
⚠️ 重要：必须重启后端服务才能使更改生效
```

### 配置存储

白名单配置存储在 `.env` 文件中：

```bash
# 白名单配置（由Admin Web管理）
PUBLIC_AGENTS=["chat","city","weather","code"]
PUBLIC_MCP_SERVERS=["environment","geocoding","osm","overpass","opentripmap","wikidata","population"]
ADMIN_AGENTS=["assistant"]
```

### 技术实现

#### 前端组件
- **文件**: `admin_web/src/components/WhitelistManager.tsx`
- **功能**: 白名单的可视化管理和编辑

#### Local API
- **文件**: `admin_web/src/lib/localApi.ts`
- **端点**: `/local-api/whitelist`
- **功能**: 读写.env文件中的白名单配置

#### Vite中间件
- **文件**: `admin_web/vite.config.ts`
- **插件**: `localFileApiPlugin`
- **处理**: 拦截/local-api/*请求，直接操作文件系统

### 安全建议

1. **备份.env文件** - 修改前备份，以防出错
2. **测试配置** - 在测试环境先验证白名单配置
3. **最小权限** - 只将必要的Agent和服务加入公开列表
4. **定期审查** - 定期检查白名单配置是否合理
5. **监控重启** - 记录白名单修改和服务重启操作

### 故障排查

#### 保存后配置未生效
- **原因**: 后端服务未重启
- **解决**: 重启后端服务

#### .env文件格式错误
- **原因**: JSON格式不正确
- **解决**: 检查PUBLIC_AGENTS等变量的JSON格式

#### 白名单页面加载失败
- **原因**: .env文件不存在或权限问题
- **解决**: 确保.env文件存在且有读写权限

---

## 7. 使用场景

### 场景1：通过Admin Web管理白名单

1. 访问admin_web的白名单管理页面
2. 点击徽章选择要公开的Agent和MCP服务器
3. 选择具有管理员权限的Agent
4. 保存配置并重启后端服务

### 场景2：通过Admin Web创建Agent

### 场景1：通过admin_web创建Agent

1. 用户在admin_web的Agent管理页面点击"创建Agent"
2. 填写Agent信息和选择MCP服务
3. 系统调用local API保存配置
4. 配置写入`app/agents/config/`目录

### 场景2：通过AI助手配置

1. 用户在admin_web的AI辅助页面提问
2. assistant agent理解用户需求
3. assistant调用config-admin工具查看/修改配置
4. 向用户反馈操作结果

### 场景3：后端直接配置

1. 开发者直接编辑配置文件
2. 重启服务使配置生效
3. 通过API验证配置

---

## 7. 故障排查

### Agent不显示

- 检查agent名称是否在PUBLIC_AGENTS白名单中
- 确认配置文件格式正确
- 查看后端日志获取错误信息

### MCP服务不显示

- 检查服务名称是否在PUBLIC_MCP_SERVERS白名单中
- 确认servers.json配置正确
- 测试MCP服务器是否能正常启动

### AI助手无响应

- 确认config-admin服务已配置
- 检查assistant agent配置中mcp_services包含"config-admin"
- 确认enable_tool_calling为true
- 查看后端日志确认工具调用情况

---

## 8. 扩展指南

### 添加新的公开Agent

在`app/core/config.py`的PUBLIC_AGENTS中添加：

```python
PUBLIC_AGENTS = ["chat", "city", "weather", "code", "your-new-agent"]
```

### 添加新的公开MCP服务

在`app/core/config.py`的PUBLIC_MCP_SERVERS中添加：

```python
PUBLIC_MCP_SERVERS = [..., "your-new-service"]
```

### 创建新的Admin Agent

1. 在`app/agents/config/`创建新的agent配置
2. 添加"config-admin"到mcp_services
3. 设置enable_tool_calling为true
4. 在ADMIN_AGENTS中添加新agent名称

---

## 9. API参考

### Agent相关

- `GET /api/v1/chat/agents` - 获取公开Agent列表
- `GET /api/v1/chat/agents?all=true` - 获取所有Agent（需要admin权限）
- `POST /api/v1/chat/stream` - 使用指定Agent进行对话

### MCP相关

- `GET /api/v1/chat/mcp/servers` - 获取公开MCP服务器列表
- `GET /api/v1/chat/mcp/servers?all=true` - 获取所有MCP服务器
- `GET /api/v1/chat/mcp/tools` - 获取公开工具列表
- `GET /api/v1/chat/mcp/tools?all=true` - 获取所有工具

### AI助手

- `POST /api/v1/chat/assistant/chat` - 与AI配置助手对话

---

## 10. 注意事项

1. **配置文件修改后需要重启服务** - 直接修改JSON文件后需要重启后端服务
2. **白名单配置在环境变量中** - 生产环境建议通过环境变量设置
3. **备份重要配置** - 修改配置前建议备份
4. **测试配置** - 在生产环境应用前先在测试环境验证

---

## 更新日志

### v1.0.0 (当前版本)
- ✅ 创建config-admin MCP服务
- ✅ 添加白名单机制
- ✅ 实现AI配置助手
- ✅ 更新admin_web前端
- ✅ 完善文档

---

如有问题，请参考主README文档或提交Issue。
