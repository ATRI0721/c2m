# 城市计算项目 - MCP服务器清单

根据Excel文件中的需求，以下是已找到的MCP服务器实现：

## 已有MCP实现的服务

### 环境类
- [x] **environment** - 已实现 (mcp_servers/environment/)
  - 空气质量查询
  - 天气预测/查询
  - 风速/风向预测/查询
  - 湿度预测/查询
  - 气温预测/查询

### 城市规划类
- [x] **geocoding-mcp** - https://github.com/geocoding-ai/mcp
  - 地址/坐标互转 (Nominatim API)
  - 无需API密钥

- [x] **osm-mcp-server** - https://github.com/tpp6me/osm-mcp-server
  - Nominatim地理编码
  - OSRM路线规划
  - 距离计算

- [x] **opengov-mcp-server** - https://github.com/srobbin/opengov-mcp-server
  - 城市开放数据查询 (Socrata API)
  - 支持全球政府开放数据门户

### 交通系统类
- [x] **opentripplanner-mcp** - https://github.com/entur/opentripplanner-mcp
  - 多模态公共交通规划
  - 支持公交、地铁、自行车、步行

- [x] **mapbox-mcp** - https://docs.mapbox.com/api/guides/mcp-server/
  - 路线规划
  - 地理编码
  - 搜索功能
  - 等时圈
  - 需要API密钥

### 社交应用类
- [x] **strava-mcp** - https://github.com/r-huijts/strava-mcp
  - GPS轨迹数据获取
  - 运动活动分析
  - 需要OAuth认证

- [x] **foursquare-places-mcp** - https://github.com/foursquare/foursquare-places-mcp
  - 地点详情与Tips
  - 需要API密钥

- [x] **yelp-mcp** - https://github.com/Yelp/yelp-mcp
  - 商户与点评
  - 需要API密钥

- [x] **wikidata-mcp** - https://github.com/zzaebok/mcp-wikidata
  - 语义实体与标签 (SPARQL查询)
  - 无需API密钥

### 公共安全类
- [x] **usgs-quakes-mcp** - https://github.com/blake365/usgs-quakes-mcp
  - 美国地震查询
  - 无需API密钥

### 经济类
- [x] **zillow-mcp** - https://github.com/sap156/zillow-mcp-server
  - 房地产市场趋势
  - 需要API密钥

- [x] **exchange-rate-mcp** - https://github.com/sin4ch/exchange-rate-mcp
  - 货币汇率查询
  - 部分API无需密钥

### 能源类
- [x] **climatiq-mcp** - https://github.com/jagan-shanmugam/climatiq-mcp-server
  - 碳排放计算
  - 需要API密钥

### 活动与旅游类
- [x] **eventbrite-mcp** - https://mcpservers.org/servers/vishalsachdev/eventbrite-mcp
  - 本地活动发现
  - 需要API密钥

- [x] **meetup-scraper-mcp** - https://apify.com/filip_cicvarek/meetup-scraper/api/mcp
  - 社区发现
  - Meetup事件抓取

## 需要创建MCP封装的服务

### 无MCP但有公开API的服务
1. **人口查询** - 可使用世界银行API或restcountries API
2. **路线矩阵** - 可使用OSRM API
3. **多点最优访问顺序** - 可使用Mapbox Optimization API
4. **旅游长尾POI (OpenTripMap)** - 需要创建MCP封装
5. **多源POI检索 (Geoapify)** - 需要创建MCP封装
6. **OSM标签查询 (Overpass API)** - 需要创建MCP封装

### 需要跳过的服务（需要付费/Visa）
- 水资源查询
- 燃油价格
- 电力价格预测

### 需要跳过的服务（API有问题）
- 飞行时间估算
- 路线规划（中国地图服务需要特殊配置）

## 配置优先级

### 高优先级（免费、无需密钥）
1. wikidata-mcp
2. usgs-quakes-mcp
3. geocoding-mcp
4. opengov-mcp-server
5. osm-mcp-server
6. exchange-rate-mcp (使用Frankfurter免费API)

### 中优先级（需要密钥但有免费额度）
1. yelp-mcp
2. foursquare-places-mcp
3. mapbox-mcp
4. eventbrite-mcp
5. opentripplanner-mcp

### 低优先级（需要OAuth/复杂配置）
1. strava-mcp
2. zillow-mcp
3. climatiq-mcp
