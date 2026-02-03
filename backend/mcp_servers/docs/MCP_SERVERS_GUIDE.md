# MCP服务器配置指南

## 概述

本文档介绍如何配置和使用 MCP（Model Context Protocol）服务器，包括本地自建的 Python 服务器和官方的 npm 服务器。

---

## 本地自建的 Python MCP 服务器

这些是项目内部开发的 Python 服务器，已经验证可以正常工作：

| 服务器名称 | 描述 | 文件路径 | 状态 |
|-----------|------|---------|------|
| **config-admin** | 配置管理服务器 - 管理Agent和MCP服务器配置（仅限assistant使用） | `servers/config_admin/server.py` | ✅ 可用 |
| **environment** | 环境数据服务器 - 空气质量、天气查询 | `servers/environment/environment/server.py` | ✅ 可用 |
| **overpass** | Overpass OSM数据查询 | `servers/geospatial/overpass/server.py` | ✅ 可用 |
| **opentripmap** | OpenTripMap旅游POI查询 | `servers/geospatial/opentripmap/server.py` | ✅ 可用 |
| **population** | 人口查询 (REST Countries API) | `servers/urban/population/server.py` | ✅ 可用 |

---

## 官方 npm MCP 服务器

### 可用的官方服务器

这些是 Anthropic 官方维护的 MCP 服务器，可以通过 npx 直接使用：

| 服务器名称 | npm包名 | 描述 | 状态 |
|-----------|---------|------|------|
| **filesystem** | `@modelcontextprotocol/server-filesystem` | 文件系统操作服务器 | ✅ 可用 |
| **everything** | `@modelcontextprotocol/server-everything` | 综合测试服务器 | ✅ 可用 |

官方资源：
- 官方MCP仓库：https://github.com/modelcontextprotocol/servers
- 官方MCP Registry：https://registry.modelcontextprotocol.io/

### 配置官方 npm 服务器

**方法1: 使用 npx 直接运行（推荐）**

无需安装，直接使用 npx 运行：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./allowed_path"],
      "description": "文件系统操作服务器"
    },
    "everything": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "description": "综合测试服务器"
    }
  }
}
```

**方法2: 全局安装后使用**

```bash
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-everything
```

---

## 推荐的完整配置

结合本地和官方服务器的推荐配置：

```json
{
  "mcpServers": {
    "environment": {
      "command": "python",
      "args": ["mcp_servers/servers/environment/environment/server.py"],
      "description": "环境数据服务器 - 空气质量、天气查询"
    },
    "population": {
      "command": "python",
      "args": ["mcp_servers/servers/urban/population/server.py"],
      "description": "人口查询 (REST Countries API)"
    },
    "overpass": {
      "command": "python",
      "args": ["mcp_servers/servers/geospatial/overpass/server.py"],
      "description": "Overpass OSM数据查询"
    },
    "opentripmap": {
      "command": "python",
      "args": ["mcp_servers/servers/geospatial/opentripmap/server.py"],
      "description": "OpenTripMap旅游POI查询"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./data"],
      "description": "文件系统服务器",
      "enabled": false
    },
    "everything": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "description": "测试服务器",
      "enabled": false
    }
  }
}
```

**说明**：
- 本地 Python 服务器默认启用
- `filesystem` 和 `everything` 默认禁用，需要时可以启用
- `filesystem` 需要指定允许访问的目录路径

---

## 功能对比

### 当前可用的 MCP 服务器功能

| 功能 | 服务器 | 工具 |
|------|--------|-----|
| 天气查询 | environment | get_current_weather, get_weather_forecast |
| 空气质量 | environment | get_air_quality, get_aqi_info |
| 气温查询 | environment | get_temperature_info |
| 风速/风向 | environment | get_wind_info |
| 湿度查询 | environment | get_humidity_info |
| 人口查询 | population | get_population |
| OSM数据查询 | overpass | query_nodes, query_ways, custom_query |
| 旅游POI | opentripmap | get_pois, get_poi_details |
| 文件系统操作 | filesystem | read_file, write_file, create_directory, list_directory |
| 综合测试 | everything | 多种测试工具和资源 |

---

## 测试 MCP 服务器

### 测试本地 Python 服务器

```bash
# 检查所有服务器
python -m mcp_servers.scripts.manager verify

# 列出所有服务器
python -m mcp_servers.scripts.manager list

# 查看统计信息
python -m mcp_servers.scripts.manager stats
```

### 测试官方 npm 服务器

```bash
# 测试 filesystem
npx -y @modelcontextprotocol/server-filesystem ./data

# 测试 everything
npx -y @modelcontextprotocol/server-everything
```

---

## 添加新的 MCP 服务器

### 使用官方 npm 服务器

1. 访问 [MCP Registry](https://modelcontextprotocol.info/tools/registry/) 查找可用服务器
2. 使用 `npx` 命令配置服务器
3. 更新 `mcp_servers/config/servers.json` 配置文件

### 创建自定义 Python 服务器

参考现有服务器结构创建新的 MCP 服务器：

1. 在 `mcp_servers/servers/` 相应类别目录下创建服务器目录
2. 创建 `server.py` 文件实现服务器逻辑
3. 创建 `requirements.txt` 列出依赖
4. 创建 `README.md` 说明服务器功能
5. 更新 `registry.json` 添加服务器信息
6. 运行 `python -m mcp_servers.scripts.manager config` 生成配置
7. 运行 `python -m mcp_servers.scripts.manager verify` 验证

---

## 注意事项

1. **网络要求**: 使用 npx 安装官方服务器需要网络连接
2. **版本兼容**: 确保npm和Node.js版本足够新（建议Node.js 18+）
3. **首次运行**: 首次运行npx命令时可能需要下载包，会较慢
4. **缓存**: npx会缓存下载的包，后续运行会很快
5. **文件系统**: 使用 filesystem 服务器时，注意限制访问目录的范围
6. **API密钥**: 某些服务器（如 opentripmap）需要配置 API 密钥

---

## 下一步建议

1. **使用当前可用配置**: 先用本地 Python 服务器进行开发和测试
2. **根据需要添加**: 如果需要文件系统或更多功能，可以启用官方 npm 服务器
3. **社区服务器**: 从 [MCP Registry](https://modelcontextprotocol.info/tools/registry/) 查找社区开发的服务器
4. **自定义开发**: 参考现有 Python 服务器结构，开发自己的 MCP 服务器

---

## 相关资源

- **官方MCP文档**: https://modelcontextprotocol.io/
- **官方服务器GitHub**: https://github.com/modelcontextprotocol/servers
- **MCP中文资源**: https://github.com/yzfly/Awesome-MCP-ZH
- **项目架构**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **服务器清单**: [mcp_servers_list.md](mcp_servers_list.md)

---

**更新时间**: 2025-02-02
