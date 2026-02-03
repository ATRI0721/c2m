# Population MCP Server

人口查询MCP服务器，提供全球国家/地区人口数据查询功能。

## 功能

- 根据国家名称查询人口
- 根据国家代码查询人口
- 列出所有国家
- 搜索国家

## 数据源

REST Countries API - 免费公开API，无需密钥

## 安装

```bash
pip install -r requirements.txt
```

## 使用

```bash
python server.py
```

## 工具列表

### get_population_by_name
根据国家名称查询人口数据

**参数**:
- name (string): 国家名称（英文），如: China, United States, Japan

**示例**:
```json
{
  "name": "China"
}
```

### get_population_by_code
根据国家代码查询人口数据

**参数**:
- code (string): 国家代码，如: CN, USA, JPN 或 CHN, USA, JPN

**示例**:
```json
{
  "code": "CN"
}
```

### list_all_countries
列出所有国家及其基本人口信息

**示例**:
```json
{}
```

### search_countries
根据关键词搜索国家

**参数**:
- query (string): 搜索关键词

**示例**:
```json
{
  "query": "China"
}
```

## MCP配置

```json
{
  "mcpServers": {
    "population": {
      "command": "python",
      "args": ["mcp_servers/population/server.py"]
    }
  }
}
```
