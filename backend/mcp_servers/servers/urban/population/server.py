"""
人口查询MCP服务器
提供全球国家/地区人口数据查询功能
基于REST Countries API
"""
import asyncio
import json
import os
from typing import Any, Optional
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
REST_COUNTRIES_BASE = "https://restcountries.com/v3.1"

# 创建MCP服务器实例
server = Server("population-mcp-server")


async def call_restcountries(endpoint: str, params: dict[str, Any] = None) -> dict[str, Any]:
    """调用REST Countries API"""
    url = f"{REST_COUNTRIES_BASE}{endpoint}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


@server.list_resources()
async def handle_list_resources() -> list[Resource]:
    """列出可用资源"""
    return [
        Resource(
            uri="population://status",
            name="服务状态",
            description="人口查询MCP服务器状态信息",
            mimeType="application/json",
        )
    ]


@server.read_resource()
async def handle_read_resource(uri: str) -> str:
    """读取资源"""
    if uri == "population://status":
        status = {
            "server": "population-mcp-server",
            "version": "1.0.0",
            "endpoints": [
                "get_population_by_name - 根据国家名称查询人口",
                "get_population_by_code - 根据国家代码查询人口",
                "list_all_countries - 列出所有国家",
                "search_countries - 搜索国家",
            ],
        }
        return json.dumps(status, ensure_ascii=False, indent=2)
    else:
        raise ValueError(f"未知的资源URI: {uri}")


@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """列出可用工具"""
    return [
        Tool(
            name="get_population_by_name",
            description="根据国家名称查询人口数据",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "国家名称（英文），如: China, United States, Japan",
                    }
                },
                "required": ["name"],
            },
        ),
        Tool(
            name="get_population_by_code",
            description="根据国家代码查询人口数据（支持ISO 3166-1 alpha-2或alpha-3代码）",
            inputSchema={
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "国家代码，如: CN, USA, JPN 或 CHN, USA, JPN",
                    }
                },
                "required": ["code"],
            },
        ),
        Tool(
            name="list_all_countries",
            description="列出所有国家及其基本人口信息",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="search_countries",
            description="根据关键词搜索国家",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜索关键词",
                    }
                },
                "required": ["query"],
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict[str, Any]
) -> list[TextContent]:
    """处理工具调用"""

    if name == "get_population_by_name":
        country_name = arguments.get("name")

        try:
            data = await call_restcountries(f"/name/{country_name}")

            if not data or len(data) == 0:
                return [
                    TextContent(
                        type="text",
                        text=f"未找到国家: {country_name}",
                    )
                ]

            country = data[0]
            result = {
                "name": country.get("name", {}).get("common", ""),
                "official_name": country.get("name", {}).get("official", ""),
                "population": country.get("population"),
                "region": country.get("region"),
                "subregion": country.get("subregion"),
                "capital": country.get("capital", []),
                "area": country.get("area"),
                "languages": country.get("languages"),
                "currencies": country.get("currencies"),
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(result, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询失败: {str(e)}")]

    elif name == "get_population_by_code":
        code = arguments.get("code")

        try:
            data = await call_restcountries(f"/alpha/{code}")

            if isinstance(data, list) and len(data) > 0:
                country = data[0]
            elif isinstance(data, dict):
                country = data
            else:
                return [
                    TextContent(
                        type="text",
                        text=f"未找到国家代码: {code}",
                    )
                ]

            result = {
                "name": country.get("name", {}).get("common", ""),
                "official_name": country.get("name", {}).get("official", ""),
                "population": country.get("population"),
                "region": country.get("region"),
                "subregion": country.get("subregion"),
                "capital": country.get("capital", []),
                "area": country.get("area"),
                "languages": country.get("languages"),
                "currencies": country.get("currencies"),
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(result, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询失败: {str(e)}")]

    elif name == "list_all_countries":
        try:
            data = await call_restcountries("/all")

            # 只返回基本信息以减少数据量
            countries = []
            for country in data:
                countries.append(
                    {
                        "name": country.get("name", {}).get("common", ""),
                        "code": country.get("cca2", ""),
                        "population": country.get("population"),
                        "region": country.get("region"),
                    }
                )

            result = {
                "total": len(countries),
                "countries": countries,
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(result, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询失败: {str(e)}")]

    elif name == "search_countries":
        query = arguments.get("query")

        try:
            data = await call_restcountries(f"/name/{query}")

            if not data or len(data) == 0:
                return [
                    TextContent(
                        type="text",
                        text=f"未找到匹配的国家: {query}",
                    )
                ]

            results = []
            for country in data:
                results.append(
                    {
                        "name": country.get("name", {}).get("common", ""),
                        "code": country.get("cca2", ""),
                        "population": country.get("population"),
                        "region": country.get("region"),
                    }
                )

            return [
                TextContent(
                    type="text",
                    text=json.dumps(results, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询失败: {str(e)}")]

    else:
        return [TextContent(type="text", text=f"未知的工具: {name}")]


async def main():
    """主函数"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="population-mcp-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
