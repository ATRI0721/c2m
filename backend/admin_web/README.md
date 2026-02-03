# Code2MCP 管理控制台

现代化的 MCP 服务和 Agent 管理界面。

## ⚠️ 安全警告

**本管理控制台仅在本地开发环境使用，具有完整的配置管理权限。**

### 重要安全说明

1. **仅在本地运行** - 本控制台使用 local-api 直接读写配置文件，没有任何身份验证机制。**请勿在生产环境或公网环境中运行。**

2. **开发模式端口** - 默认运行在 `http://localhost:3000`，请确保仅限本地访问。

3. **文件直接访问** - local-api 中间件可以直接修改以下敏感文件：
   - `.env` - 包含管理员邮箱、API密钥等敏感配置
   - `mcp_servers/config/servers.json` - MCP服务器配置
   - `app/agents/config/*.json` - Agent配置文件

4. **生产环境部署** - 如需在生产环境使用管理功能，请：
   - 实现完整的身份验证和授权机制
   - 将 local-api 替换为受保护的后端 API
   - 添加 CSRF 保护
   - 使用 HTTPS

## 技术栈

- **React 19** - 最新版本的前端框架
- **TypeScript** - 类型安全
- **Vite 6** - 极速构建工具
- **TailwindCSS** - 实用优先的 CSS 框架
- **shadcn/ui** - 高质量 UI 组件
- **TanStack Query** - 强大的数据获取和状态管理
- **Radix UI** - 无障碍的组件基础

## 功能特性

- 📊 **仪表盘** - 系统概览和实时状态
- 🔌 **MCP 服务管理** - 查看、启用/禁用 MCP 服务
- 🤖 **Agent 管理** - 创建、编辑、删除 Agent
- ✨ **AI 辅助** - 智能配置助手

## 快速开始

### 安装依赖

```bash
cd admin_web
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
admin_web/
├── src/
│   ├── components/      # 组件
│   │   ├── ui/         # UI 基础组件 (shadcn/ui)
│   │   ├── MCPServerCard.tsx    # MCP 服务卡片
│   │   ├── MCPServerList.tsx    # MCP 服务列表
│   │   ├── AgentCard.tsx        # Agent 卡片
│   │   ├── AgentList.tsx        # Agent 列表
│   │   ├── AgentForm.tsx        # Agent 表单
│   │   ├── Sidebar.tsx          # 侧边栏导航
│   │   └── AIAssistant.tsx      # AI 助手
│   ├── pages/          # 页面
│   │   └── Dashboard.tsx         # 主仪表盘
│   ├── lib/            # 工具函数
│   │   ├── api.ts      # API 调用
│   │   └── utils.ts    # 工具函数
│   ├── types/          # TypeScript 类型
│   │   └── index.ts
│   ├── App.tsx         # 应用入口
│   ├── main.tsx        # 主文件
│   └── index.css       # 全局样式
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

## 设计特性

- 🎨 **深色主题** - 专业开发工具风格
- ✨ **玻璃态效果** - Glass morphism 设计
- 🌈 **渐变色彩** - 独特的视觉风格
- 💫 **流畅动画** - 优雅的交互体验
- 📱 **响应式** - 适配各种屏幕尺寸

## API 配置

应用会自动代理 `/api` 请求到 `http://localhost:8000`（后端服务）。

如需修改，编辑 `vite.config.ts` 中的 `proxy` 配置。

## 开发说明

### 添加新页面

1. 在 `src/pages/` 创建新组件
2. 在 `Dashboard.tsx` 中的 `activeTab` 状态处理中添加对应视图

### 添加新 API

在 `src/lib/api.ts` 中添加新的 API 函数。

### 自定义样式

- 主题颜色：编辑 `src/index.css` 中的 CSS 变量
- Tailwind 配置：编辑 `tailwind.config.ts`
- 组件样式：使用 Tailwind 类名

## 主要组件说明

### Dashboard (仪表盘)
- 主页面，包含侧边栏导航和内容区域
- 支持切换不同标签页：仪表盘、MCP服务、Agent管理、AI辅助

### MCPServerCard & MCPServerList
- 显示所有 MCP 服务器
- 支持启用/禁用切换
- 显示每个服务的工具数量和状态

### AgentCard & AgentList
- 显示所有 Agent
- 支持编辑和删除操作
- 显示 Agent 使用的 MCP 服务

### AgentForm
- 创建/编辑 Agent 的表单
- 支持配置系统提示词
- 支持 MCP 服务选择

### AIAssistant
- AI 配置助手界面
- 提供智能建议和帮助

## 依赖说明

主要依赖版本：
- react: ^19.0.0
- react-dom: ^19.0.0
- @tanstack/react-query: ^5.62.11
- tailwindcss: ^3.4.17
- lucide-react: ^0.468.0 (图标库)
- @radix-ui/* (UI 基础组件)
