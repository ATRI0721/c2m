# 天气 MCP 服务器

一个用于查询明天天气预报的 Model Context Protocol (MCP) 服务器。

## 功能特性

- 🌤️ 查询全球任意城市明天的天气预报
- 🌡️ 提供温度范围（最高/最低温度）
- 💧 显示降水概率
- 💨 显示最大风速
- 📍 支持中文和英文城市名称
- 🆓 使用免费的 Open-Meteo API，无需 API 密钥

## 安装

1. 克隆或下载此项目到本地

2. 安装依赖：
```bash
cd weather-mcp-server
npm install
```

3. 构建项目：
```bash
npm run build
```

## 配置

在你的 Claude Desktop 配置文件中添加此服务器：

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

添加以下配置：

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["d:\\code\\demo\\code2mcp\\test\\weather-mcp-server\\dist\\index.js"]
    }
  }
}
```

> 注意：请将路径修改为你实际的项目路径

## 使用方法

配置完成后，重启 Claude Desktop，然后就可以使用以下功能：

### 示例查询

- "查询北京明天的天气"
- "明天上海会下雨吗？"
- "告诉我纽约明天的天气预报"
- "Tokyo 明天的温度是多少？"

## API 说明

此服务器使用 [Open-Meteo API](https://open-meteo.com/)，这是一个免费的天气 API，特点：

- 无需注册或 API 密钥
- 支持全球天气预报
- 数据来源于国家气象服务
- 非商业用途完全免费

## 项目结构

```
weather-mcp-server/
├── src/
│   └── index.ts          # MCP 服务器主文件
├── dist/                 # 编译后的 JavaScript 文件
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
└── README.md             # 项目说明
```

## 开发

- **开发模式**: `npm run dev` (编译并运行)
- **构建**: `npm run build` (仅编译)
- **运行**: `npm start` (运行编译后的代码)

## 工具说明

### get_tomorrow_weather

获取指定城市明天的天气预报。

**参数:**
- `location` (string, 必需): 城市名称，例如："北京"、"上海"、"Tokyo"、"New York"

**返回信息:**
- 日期
- 天气状况（晴朗、多云、雨等）
- 温度范围
- 降水概率
- 最大风速

## 许可证

MIT
