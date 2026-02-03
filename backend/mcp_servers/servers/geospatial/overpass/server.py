"""
Overpass API查询MCP服务器
提供OpenStreetMap数据查询功能
基于Overpass API
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
OVERPASS_BASE = "https://overpass-api.de/api/interpreter"

# 创建MCP服务器实例
server = Server("overpass-mcp-server")


async def call_overpass(query: str) -> dict[str, Any]:
    """调用Overpass API"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            OVERPASS_BASE,
            data=query.encode("utf-8"),
            headers={"Content-Type": "text/plain"},
        )
        response.raise_for_status()
        return response.json()


@server.list_resources()
async def handle_list_resources() -> list[Resource]:
    """列出可用资源"""
    return [
        Resource(
            uri="overpass://status",
            name="服务状态",
            description="Overpass API查询MCP服务器状态信息",
            mimeType="application/json",
        )
    ]


@server.read_resource()
async def handle_read_resource(uri: str) -> str:
    """读取资源"""
    if uri == "overpass://status":
        status = {
            "server": "overpass-mcp-server",
            "version": "1.0.0",
            "endpoints": [
                "query_nodes - 查询节点（如：咖啡馆）",
                "query_ways - 查询路径（如：道路）",
                "query_relations - 查询关系",
                "custom_query - 自定义Overpass QL查询",
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
            name="query_nodes",
            description="查询指定区域内的节点（如：咖啡馆、餐厅等）",
            inputSchema={
                "type": "object",
                "properties": {
                    "tag": {
                        "type": "string",
                        "description": "OSM标签，如: amenity=cafe, amenity=restaurant",
                    },
                    "bbox": {
                        "type": "string",
                        "description": "边界框（南,西,北,东），如: 23.0,113.0,23.5,113.5。如果为空则使用中心点和半径",
                        "default": "",
                    },
                    "center": {
                        "type": "string",
                        "description": "中心点（纬度,经度），如: 23.129,113.264",
                        "default": "",
                    },
                    "radius": {
                        "type": "integer",
                        "description": "搜索半径（米），默认2000",
                        "default": 2000,
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回数量限制，默认50",
                        "default": 50,
                    },
                },
                "required": ["tag"],
            },
        ),
        Tool(
            name="query_ways",
            description="查询指定区域内的路径（如：道路、河流等）",
            inputSchema={
                "type": "object",
                "properties": {
                    "tag": {
                        "type": "string",
                        "description": "OSM标签，如: highway=primary, waterway=river",
                    },
                    "bbox": {
                        "type": "string",
                        "description": "边界框（南,西,北,东）",
                        "default": "",
                    },
                    "center": {
                        "type": "string",
                        "description": "中心点（纬度,经度）",
                        "default": "",
                    },
                    "radius": {
                        "type": "integer",
                        "description": "搜索半径（米），默认2000",
                        "default": 2000,
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回数量限制，默认50",
                        "default": 50,
                    },
                },
                "required": ["tag"],
            },
        ),
        Tool(
            name="custom_query",
            description="执行自定义的Overpass QL查询",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Overpass QL查询语句",
                    },
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

    if name == "query_nodes":
        tag = arguments.get("tag")
        bbox = arguments.get("bbox", "")
        center = arguments.get("center", "")
        radius = arguments.get("radius", 2000)
        limit = arguments.get("limit", 50)

        try:
            # 构建查询
            if bbox:
                # 使用边界框
                query = f"""
                [out:json][timeout:25];
                (
                  node["{tag}"]({bbox});
                );
                out {limit};
                """
            elif center:
                # 使用中心点和半径
                lat, lon = center.split(",")
                query = f"""
                [out:json][timeout:25];
                (
                  node["{tag}"](around:{radius},{lat},{lon});
                );
                out {limit};
                """
            else:
                return [
                    TextContent(
                        type="text",
                        text="必须提供bbox或center参数",
                    )
                ]

            data = await call_overpass(query)

            elements = data.get("elements", [])
            if not elements:
                return [
                    TextContent(
                        type="text",
                        text=f"未找到匹配的节点 (标签: {tag})",
                    )
                ]

            # 提取关键信息
            nodes = []
            for element in elements:
                nodes.append(
                    {
                        "id": element.get("id"),
                        "lat": element.get("lat"),
                        "lon": element.get("lon"),
                        "tags": element.get("tags", {}),
                    }
                )

            result = {
                "tag": tag,
                "total": len(nodes),
                "nodes": nodes,
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(result, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询失败: {str(e)}")]

    elif name == "query_ways":
        tag = arguments.get("tag")
        bbox = arguments.get("bbox", "")
        center = arguments.get("center", "")
        radius = arguments.get("radius", 2000)
        limit = arguments.get("limit", 50)

        try:
            # 构建查询
            if bbox:
                # 使用边界框
                query = f"""
                [out:json][timeout:25];
                (
                  way["{tag}"]({bbox});
                );
                out {limit};
                """
            elif center:
                # 使用中心点和半径
                lat, lon = center.split(",")
                query = f"""
                [out:json][timeout:25];
                (
                  way["{tag}"](around:{radius},{lat},{lon});
                );
                out {limit};
                """
            else:
                return [
                    TextContent(
                        type="text",
                        text="必须提供bbox或center参数",
                    )
                ]

            data = await call_overpass(query)

            elements = data.get("elements", [])
            if not elements:
                return [
                    TextContent(
                        type="text",
                        text=f"未找到匹配的路径 (标签: {tag})",
                    )
                ]

            # 提取关键信息
            ways = []
            for element in elements:
                ways.append(
                    {
                        "id": element.get("id"),
                        "tags": element.get("tags", {}),
                        "nodes": element.get("nodes", [])[:10],  # 只显示前10个节点
                    }
                )

            result = {
                "tag": tag,
                "total": len(ways),
                "ways": ways,
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(result, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询失败: {str(e)}")]

    elif name == "custom_query":
        query = arguments.get("query")

        try:
            data = await call_overpass(query)

            return [
                TextContent(
                    type="text",
                    text=json.dumps(data, ensure_ascii=False, indent=2),
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
                server_name="overpass-mcp-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
