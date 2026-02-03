# 环境 MCP 服务器

提供城市环境数据查询的MCP服务器，支持空气质量、天气、风速、湿度、气温等功能。

## 功能特性

- **空气质量查询**: 查询指定城市的空气质量指数(AQI)和污染物浓度(PM2.5, PM10, O3, SO2, NO2, CO)
- **天气预测/查询**: 获取指定城市的天气预报，包括天气状况、温度、降水概率等
- **风速/风向查询**: 查询指定城市的风速和风向信息
- **湿度查询**: 查询指定城市的湿度信息
- **气温查询**: 查询指定城市的气温信息

## 数据源

- **Open-Meteo API**: 免费的天气和空气质量API（主要数据源）
- **Weather API167**: 备用天气数据API（需要RapidAPI密钥）

## 安装和运行

### 本地运行

```bash
# 安装依赖
pip install -r requirements.txt

# 运行MCP服务器
python server.py
```

### Docker运行

```bash
# 使用docker-compose运行
docker-compose -f docker-compose.mcp.yml up -d

# 查看日志
docker-compose -f docker-compose.mcp.yml logs -f
```

## MCP工具列表

| 工具名称 | 描述 | 参数 |
|---------|------|------|
| get_air_quality | 查询空气质量 | city, country(可选) |
| get_weather_forecast | 天气预报 | city, days(可选) |
| get_current_weather | 当前天气 | city |
| get_wind_info | 风速风向 | city, date(可选) |
| get_humidity_info | 湿度信息 | city, date(可选) |
| get_temperature_info | 气温信息 | city, date(可选) |

## 使用示例

### 查询空气质量
```
工具: get_air_quality
参数: {"city": "北京"}
```

### 获取天气预报
```
工具: get_weather_forecast
参数: {"city": "广州", "days": 5}
```

### 查询风速风向
```
工具: get_wind_info
参数: {"city": "上海"}
```

## 项目配置

在项目的`.env`文件中已添加环境MCP服务器配置：

```env
MCP_SERVERS_CONFIG={"environment":{"command":"python","args":["mcp_servers/environment/server.py"],"env":{"RAPIDAPI_KEY":""}}}
```

## 环境变量

- `RAPIDAPI_KEY`: RapidAPI密钥（可选，目前主要使用免费的Open-Meteo API）

## 注意事项

1. 目前主要使用Open-Meteo免费API，无需API密钥
2. 如需使用Weather API167获取更多数据，请在RapidAPI注册并获取密钥
3. 服务器使用stdio传输协议，适合与Claude Desktop等MCP客户端集成

## 技术栈

- Python 3.12+
- MCP SDK (Model Context Protocol)
- httpx (HTTP客户端)
- Open-Meteo API
- Docker
