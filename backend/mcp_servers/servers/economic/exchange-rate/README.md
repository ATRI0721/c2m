# Exchange Rate MCP Server

汇率查询MCP服务器，提供货币汇率查询、转换、历史数据等功能。

## 功能

- 获取所有支持的货币列表
- 获取最新汇率
- 货币金额转换
- 查询历史汇率
- 查询一段时间内的汇率变化趋势

## 数据源

基于 [Frankfurter API](https://api.frankfurter.app/) (European Central Bank)

## 安装依赖

```bash
pip install -r requirements.txt
```

## 运行

```bash
python server.py
```

## 工具说明

### get_currencies
获取所有支持的货币列表

### get_latest_rate
获取最新汇率
- from: 基准货币代码（如USD、EUR、CNY）
- to: 目标货币代码（可选）

### convert_amount
转换货币金额
- amount: 要转换的金额
- from: 源货币代码
- to: 目标货币代码

### get_historical_rate
获取历史汇率
- date: 日期（格式：YYYY-MM-DD）
- from: 基准货币代码（可选）
- to: 目标货币代码（可选）

### get_time_series
获取一段时间内的汇率变化趋势
- start_date: 开始日期（格式：YYYY-MM-DD）
- end_date: 结束日期（格式：YYYY-MM-DD）
- from: 基准货币代码（可选）
- to: 目标货币代码（可选）
