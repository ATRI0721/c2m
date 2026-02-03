"""
汇率查询MCP服务器
提供货币汇率查询、转换、历史数据等功能
基于Frankfurter API (European Central Bank)
"""
import asyncio
import json
from typing import Any
from datetime import datetime, timedelta
import httpx

from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
)

# 配置
FRANKFURTER_BASE = "https://api.frankfurter.app"

# 创建MCP服务器实例
server = Server("exchange-rate-mcp-server")


async def call_frankfurter(endpoint: str, params: dict[str, Any] = None) -> dict[str, Any]:
    """调用Frankfurter API"""
    url = f"{FRANKFURTER_BASE}{endpoint}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        if params:
            response = await client.get(url, params=params)
        else:
            response = await client.get(url)
        response.raise_for_status()
        return response.json()


@server.list_resources()
async def handle_list_resources() -> list[Resource]:
    """列出可用资源"""
    return [
        Resource(
            uri="exchange://currencies",
            name="支持的货币列表",
            description="获取所有支持的货币代码和名称",
            mimeType="application/json",
        ),
        Resource(
            uri="exchange://latest/EUR",
            name="最新汇率",
            description="获取最新汇率（以EUR为基准）",
            mimeType="application/json",
        ),
    ]


@server.read_resource()
async def handle_read_resource(uri: str) -> str:
    """读取资源"""
    if uri == "exchange://currencies":
        data = await call_frankfurter("/currencies")
        return json.dumps(data, ensure_ascii=False, indent=2)

    elif uri.startswith("exchange://latest/"):
        # 从URI中提取基准货币
        parts = uri.split("/")
        base = parts[3] if len(parts) > 3 else "EUR"
        data = await call_frankfurter(f"/latest?from={base}")
        return json.dumps(data, ensure_ascii=False, indent=2)

    else:
        raise ValueError(f"未知资源: {uri}")


@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """列出可用工具"""
    return [
        Tool(
            name="get_currencies",
            description="获取所有支持的货币列表",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="get_latest_rate",
            description="获取最新汇率",
            inputSchema={
                "type": "object",
                "properties": {
                    "from": {
                        "type": "string",
                        "description": "基准货币代码（如USD、EUR、CNY）",
                        "default": "EUR",
                    },
                    "to": {
                        "type": "string",
                        "description": "目标货币代码（如USD、EUR、CNY），可选，不提供则返回所有货币",
                    },
                },
                "required": [],
            },
        ),
        Tool(
            name="convert_amount",
            description="转换货币金额",
            inputSchema={
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "number",
                        "description": "要转换的金额",
                    },
                    "from": {
                        "type": "string",
                        "description": "源货币代码（如USD、EUR、CNY）",
                    },
                    "to": {
                        "type": "string",
                        "description": "目标货币代码（如USD、EUR、CNY）",
                    },
                },
                "required": ["amount", "from", "to"],
            },
        ),
        Tool(
            name="get_historical_rate",
            description="获取历史汇率",
            inputSchema={
                "type": "object",
                "properties": {
                    "from": {
                        "type": "string",
                        "description": "基准货币代码（如USD、EUR、CNY）",
                        "default": "EUR",
                    },
                    "to": {
                        "type": "string",
                        "description": "目标货币代码（如USD、EUR、CNY）",
                    },
                    "date": {
                        "type": "string",
                        "description": "日期（格式：YYYY-MM-DD），最多追溯到1999年",
                    },
                },
                "required": ["date"],
            },
        ),
        Tool(
            name="get_time_series",
            description="获取一段时间内的汇率变化趋势",
            inputSchema={
                "type": "object",
                "properties": {
                    "from": {
                        "type": "string",
                        "description": "基准货币代码（如USD、EUR、CNY）",
                        "default": "EUR",
                    },
                    "to": {
                        "type": "string",
                        "description": "目标货币代码（如USD、EUR、CNY）",
                    },
                    "start_date": {
                        "type": "string",
                        "description": "开始日期（格式：YYYY-MM-DD）",
                    },
                    "end_date": {
                        "type": "string",
                        "description": "结束日期（格式：YYYY-MM-DD）",
                    },
                },
                "required": ["start_date", "end_date"],
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """调用工具"""

    if name == "get_currencies":
        data = await call_frankfurter("/currencies")
        return [
            TextContent(
                type="text",
                text=json.dumps(data, ensure_ascii=False, indent=2),
            )
        ]

    elif name == "get_latest_rate":
        params = {}
        if "from" in arguments:
            params["from"] = arguments["from"]
        if "to" in arguments:
            params["to"] = arguments["to"]

        data = await call_frankfurter("/latest", params)
        return [
            TextContent(
                type="text",
                text=json.dumps(data, ensure_ascii=False, indent=2),
            )
        ]

    elif name == "convert_amount":
        amount = arguments["amount"]
        from_currency = arguments["from"]
        to_currency = arguments["to"]

        params = {
            "amount": amount,
            "from": from_currency,
            "to": to_currency,
        }

        data = await call_frankfurter("/latest", params)

        # 格式化输出
        result = {
            "query": {
                "amount": amount,
                "from": from_currency,
                "to": to_currency,
            },
            "result": data.get("rates", {}).get(to_currency, "N/A"),
            "rate": data.get("rates", {}).get(to_currency),
            "date": data.get("date"),
        }

        return [
            TextContent(
                type="text",
                text=json.dumps(result, ensure_ascii=False, indent=2),
            )
        ]

    elif name == "get_historical_rate":
        date = arguments["date"]
        params = {}
        if "from" in arguments:
            params["from"] = arguments["from"]
        if "to" in arguments:
            params["to"] = arguments["to"]

        data = await call_frankfurter(f"/{date}", params)
        return [
            TextContent(
                type="text",
                text=json.dumps(data, ensure_ascii=False, indent=2),
            )
        ]

    elif name == "get_time_series":
        start_date = arguments["start_date"]
        end_date = arguments["end_date"]
        params = {
            "start_date": start_date,
            "end_date": end_date,
        }
        if "from" in arguments:
            params["from"] = arguments["from"]
        if "to" in arguments:
            params["to"] = arguments["to"]

        data = await call_frankfurter(params["start_date"] + ".." + params["end_date"], params)
        return [
            TextContent(
                type="text",
                text=json.dumps(data, ensure_ascii=False, indent=2),
            )
        ]

    else:
        raise ValueError(f"未知工具: {name}")


async def main():
    """主函数"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="exchange-rate-mcp-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
