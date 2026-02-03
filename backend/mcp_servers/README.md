# MCP模块

城市计算项目的MCP（Model Context Protocol）服务器模块。

## 目录结构

```
mcp_servers/
├── servers/              # MCP服务器（按类别组织）
│   ├── environment/      # 环境数据类
│   ├── geospatial/       # 地理空间类
│   ├── urban/            # 城市规划类
│   └── economic/         # 经济数据类
├── config/               # 配置文件
│   └── servers.json      # 服务器配置
├── scripts/              # 工具脚本
│   ├── manager.py        # 服务器管理器
│   ├── install.py        # 安装脚本
│   └── verify.py         # 验证脚本
├── docs/                 # 文档
│   ├── PROJECT_REPORT.md # 项目报告
│   └── SUMMARY.md        # 总结报告
├── registry.json         # 服务器注册表
└── registry.py           # 注册表模块
```

## 快速开始

### 1. 列出所有服务器

```bash
python mcp_servers/scripts/manager.py list
```

### 2. 按类别列出服务器

```bash
python mcp_servers/scripts/manager.py list --category environment
```

### 3. 验证所有服务器

```bash
python mcp_servers/scripts/manager.py verify
```

### 4. 生成配置文件

```bash
python mcp_servers/scripts/manager.py config
```

### 5. 查看统计信息

```bash
python mcp_servers/scripts/manager.py stats
```

## 服务器分类

### 环境数据 (environment)
- **environment**: 空气质量、天气查询
- **usgs-quakes**: 美国地震查询

### 地理空间 (geospatial)
- **geocoding**: 地址/坐标互转（Nominatim）
- **osm**: OSM路线规划
- **overpass**: OSM数据查询
- **opentripmap**: 旅游POI查询
- **wikidata**: Wikidata SPARQL查询

### 城市规划 (urban)
- **population**: 人口查询
- **opengov**: 城市开放数据

### 经济数据 (economic)
- **exchange-rate**: 汇率查询

## 注册表

所有服务器的信息存储在 [registry.json](registry.json) 中，包含：

- 服务器ID和名称
- 运行时类型（python/node）
- 入口文件
- API来源
- 是否需要认证
- 状态

## 配置

Claude配置文件位于 [config/servers.json](config/servers.json)，包含所有MCP服务器的启动配置。

## 添加新服务器

1. 在相应的类别目录下创建服务器代码
2. 更新 `registry.json` 添加服务器信息
3. 运行 `python mcp_servers/scripts/manager.py config` 生成配置
4. 运行 `python mcp_servers/scripts/manager.py verify` 验证

## 架构设计原则

### 高内聚
- 同类服务器放在同一目录
- 共享功能模块化
- 清晰的职责划分

### 低耦合
- 通过注册表解耦服务器和配置
- 统一的管理接口
- 独立的配置文件

## 文档

- [项目报告](docs/PROJECT_REPORT.md) - 详细的项目报告
- [总结报告](docs/SUMMARY.md) - 项目完成总结
- [服务器清单](docs/mcp_servers_list.md) - 所有服务器清单

## 维护

- 定期运行 `verify` 检查服务器状态
- 更新 `registry.json` 添加新服务器
- 查看 `stats` 了解服务器分布
