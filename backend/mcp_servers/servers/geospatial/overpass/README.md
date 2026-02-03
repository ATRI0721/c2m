# Overpass API MCP Server

Overpass API查询MCP服务器，提供OpenStreetMap数据查询功能。

## 功能

- 查询节点（咖啡馆、餐厅等）
- 查询路径（道路、河流等）
- 自定义Overpass QL查询

## 数据源

Overpass API - 免费公开API，无需密钥

## 安装

```bash
pip install -r requirements.txt
```

## 使用

```bash
python server.py
```

## 工具列表

### query_nodes
查询指定区域内的节点（如：咖啡馆、餐厅等）

**参数**:
- tag (string): OSM标签，如: amenity=cafe, amenity=restaurant
- bbox (string): 边界框（南,西,北,东），如: 23.0,113.0,23.5,113.5
- center (string): 中心点（纬度,经度），如: 23.129,113.264
- radius (integer): 搜索半径（米），默认2000
- limit (integer): 返回数量限制，默认50

**注意**: bbox和center至少提供一个

**示例**:
```json
{
  "tag": "amenity=cafe",
  "center": "23.129,113.264",
  "radius": 1000,
  "limit": 20
}
```

### query_ways
查询指定区域内的路径（如：道路、河流等）

**参数**:
- tag (string): OSM标签，如: highway=primary, waterway=river
- bbox (string): 边界框（南,西,北,东）
- center (string): 中心点（纬度,经度）
- radius (integer): 搜索半径（米），默认2000
- limit (integer): 返回数量限制，默认50

**示例**:
```json
{
  "tag": "highway=primary",
  "bbox": "23.0,113.0,23.5,113.5",
  "limit": 50
}
```

### custom_query
执行自定义的Overpass QL查询

**参数**:
- query (string): Overpass QL查询语句

**示例**:
```json
{
  "query": "[out:json];node[\"amenity\"=\"cafe\"](around:1000,23.129,113.264);out 20;"
}
```

## 常用OSM标签

### 设施 (amenity)
- amenity=cafe - 咖啡馆
- amenity=restaurant - 餐厅
- amenity=bar - 酒吧
- amenity=hospital - 医院
- amenity=school - 学校

### 道路 (highway)
- highway=primary - 主要道路
- highway=secondary - 次要道路
- highway=residential - 居住区道路
- highway=pedestrian - 步行街

### 水域 (waterway)
- waterway=river - 河流
- waterway=stream - 溪流
- waterway=canal - 运河

## MCP配置

```json
{
  "mcpServers": {
    "overpass": {
      "command": "python",
      "args": ["mcp_servers/overpass/server.py"]
    }
  }
}
```

## Overpass QL查询示例

查找广州市所有博物馆：
```
[out:json][timeout:25];
area["name"="Guangzhou"]->.searchArea;
node["tourism"="museum"](area.searchArea);
out;
```

查找指定区域内的咖啡馆：
```
[out:json][timeout:25];
(
  node["amenity"="cafe"](23.0,113.0,23.5,113.5);
);
out 50;
```

## 参考资料

- [Overpass API官方文档](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Overpass QL语言指南](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL)
- [OSM标签列表](https://wiki.openstreetmap.org/wiki/Map_Features)
