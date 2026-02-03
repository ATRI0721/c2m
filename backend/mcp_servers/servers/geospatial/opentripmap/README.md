# OpenTripMap MCP Server

OpenTripMap POI查询MCP服务器，提供旅游景点POI查询功能。

## 功能

- 根据位置查询周边POI
- 获取POI详情
- 搜索地点

## 数据源

OpenTripMap API - 免费公开API（需要注册获取API密钥）

## 获取API密钥

1. 访问 https://opentripmap.com/
2. 注册账号
3. 在API页面获取密钥
4. 设置环境变量: `export OPENTRIPMAP_API_KEY=your_api_key`

## 安装

```bash
pip install -r requirements.txt
```

## 使用

```bash
python server.py
```

## 工具列表

### get_pois_by_location
根据经纬度查询周边的旅游景点POI

**参数**:
- lon (number): 经度，如: 113.264
- lat (number): 纬度，如: 23.129
- radius (integer): 搜索半径（单位：米），默认1000
- limit (integer): 返回数量限制，默认20
- kinds (string): POI类型，如: museums, attractions，默认tourist_attractions

**示例**:
```json
{
  "lon": 113.264,
  "lat": 23.129,
  "radius": 2000,
  "kinds": "museums"
}
```

### get_poi_details
根据POI的XID获取详细信息

**参数**:
- xid (string): POI的唯一标识符

**示例**:
```json
{
  "xid": "N123456"
}
```

### search_places
根据地名搜索地点

**参数**:
- name (string): 地点名称

**示例**:
```json
{
  "name": "Eiffel Tower"
}
```

## POI类型

常见的POI类型包括：
- tourist_attractions - 旅游景点
- museums - 博物馆
- _amusements - 娱乐场所
- churches - 教堂
- monuments - 纪念碑
- _architecture_extraordinary - 特色建筑

## MCP配置

```json
{
  "mcpServers": {
    "opentripmap": {
      "command": "python",
      "args": ["mcp_servers/opentripmap/server.py"],
      "env": {
        "OPENTRIPMAP_API_KEY": "your_api_key"
      }
    }
  }
}
```
