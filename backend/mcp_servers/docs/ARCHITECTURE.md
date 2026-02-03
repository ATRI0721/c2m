# MCP模块架构设计

## 设计原则

### 高内聚
- **按领域分类**：服务器按功能领域组织（环境、地理、城市、经济）
- **模块化设计**：每个类别独立管理，职责清晰
- **统一接口**：同类服务器遵循相似的API设计

### 低耦合
- **注册表模式**：通过registry.json解耦服务器和配置
- **配置分离**：配置文件独立于服务器代码
- **统一管理**：通过manager.py统一管理所有服务器

## 目录结构

```
mcp_servers/                      # MCP根目录
├── __init__.py                   # 模块初始化
├── registry.py                   # 注册表管理
├── registry.json                 # 服务器注册表（核心）
│
├── servers/                      # 服务器目录（高内聚）
│   ├── environment/              # 环境数据领域
│   │   ├── environment/          # 自建环境服务器
│   │   └── usgs-quakes-mcp/      # 第三方地震服务器
│   ├── geospatial/               # 地理空间领域
│   │   ├── geocoding-mcp/        # 地理编码
│   │   ├── osm-mcp-server/       # OSM路线
│   │   ├── overpass/             # OSM查询
│   │   ├── opentripmap/          # 旅游POI
│   │   └── wikidata-mcp/         # Wikidata
│   ├── urban/                    # 城市规划领域
│   │   ├── population/           # 人口查询
│   │   └── opengov-mcp/          # 城市数据
│   └── economic/                 # 经济数据领域
│       └── exchange-rate/        # 汇率查询
│
├── config/                       # 配置目录（解耦）
│   └── servers.json              # Claude配置文件
│
├── scripts/                      # 工具脚本
│   ├── __init__.py
│   ├── manager.py                # 统一管理器
│   ├── install.py                # 安装脚本
│   └── verify.py                 # 验证脚本
│
└── docs/                         # 文档
    ├── PROJECT_REPORT.md         # 项目报告
    ├── SUMMARY.md                # 总结
    └── mcp_servers_list.md       # 服务器清单
```

## 核心组件

### 1. 注册表 (registry.json)

服务器注册中心，存储所有服务器的元数据：

```json
{
  "categories": {
    "environment": {
      "name": "环境数据",
      "description": "空气质量、天气、地震等",
      "servers": [
        {
          "id": "environment",
          "name": "环境数据服务器",
          "type": "custom",
          "path": "mcp_servers/servers/environment/environment",
          "runtime": "python",
          "entry": "server.py",
          "api": "Open-Meteo",
          "auth_required": false
        }
      ]
    }
  }
}
```

**优点**：
- 集中管理服务器信息
- 解耦服务器实现和配置
- 便于查询和统计

### 2. 管理器 (manager.py)

统一的MCP服务器管理接口：

```python
# 列出服务器
manager.list_servers(category="environment")

# 验证服务器
manager.verify_servers()

# 生成配置
manager.generate_config()

# 统计信息
manager.get_stats()
```

**优点**：
- 统一的操作接口
- 自动化配置生成
- 简化日常维护

### 3. 配置文件 (config/servers.json)

Claude使用的MCP配置文件，从注册表自动生成：

```json
{
  "mcpServers": {
    "environment": {
      "command": "python",
      "args": ["mcp_servers/servers/environment/environment/server.py"],
      "description": "..."
    }
  }
}
```

**优点**：
- 可自动生成
- 与注册表同步
- 版本可控

## 数据流

```
registry.json (注册表)
      ↓
MCPServerRegistry (读取)
      ↓
MCPManager (管理)
      ↓
config/servers.json (生成)
      ↓
Claude Desktop (使用)
```

## 扩展性

### 添加新服务器

1. 在对应类别目录创建服务器代码
2. 更新registry.json
3. 运行manager生成配置
4. 无需修改其他代码

### 添加新类别

1. 创建新的类别目录
2. 在registry.json添加类别定义
3. 移动或创建服务器
4. 自动被manager识别

## 优势总结

### 与旧结构对比

| 方面 | 旧结构 | 新结构 |
|------|--------|--------|
| **组织方式** | 混乱（自建/第三方分开） | 按领域分类 |
| **配置管理** | 分散（多个配置文件） | 集中（注册表） |
| **服务器发现** | 手动查找 | 自动发现 |
| **维护成本** | 高 | 低 |
| **扩展性** | 差 | 优秀 |
| **内聚性** | 低 | 高 |
| **耦合度** | 高 | 低 |

### 设计模式

- **注册表模式**：统一管理服务器元数据
- **工厂模式**：manager作为服务器工厂
- **策略模式**：不同类别使用不同策略
- **单一职责**：每个组件职责明确

## 未来扩展

1. **动态加载**：支持运行时加载服务器
2. **健康检查**：定期检查服务器状态
3. **依赖管理**：自动安装服务器依赖
4. **版本控制**：支持多版本服务器
5. **热重载**：配置变更自动重载
