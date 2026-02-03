"""
OpenTripMap POI查询MCP服务器
提供旅游景点POI查询功能
基于OpenTripMap API
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
OPENTRIPMAP_BASE = "https://api.opentripmap.com/0.1/en"
OPENTRIPMAP_API_KEY = os.getenv("OPENTRIPMAP_API_KEY", "5ae2e3f221c38a28845f05b6b7dd6fe41a62472467e3f9e3a4b50852")

# 创建MCP服务器实例
server = Server("opentripmap-mcp-server")


async def call_opentripmap(endpoint: str, params: dict[str, Any] = None) -> dict[str, Any]:
    """调用OpenTripMap API"""
    params = params or {}
    params["apikey"] = OPENTRIPMAP_API_KEY

    url = f"{OPENTRIPMAP_BASE}{endpoint}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


@server.list_resources()
async def handle_list_resources() -> list[Resource]:
    """列出可用资源"""
    return [
        Resource(
            uri="opentripmap://status",
            name="服务状态",
            description="OpenTripMap POI查询MCP服务器状态信息",
            mimeType="application/json",
        )
    ]


@server.read_resource()
async def handle_read_resource(uri: str) -> str:
    """读取资源"""
    if uri == "opentripmap://status":
        status = {
            "server": "opentripmap-mcp-server",
            "version": "1.0.0",
            "endpoints": [
                "get_pois_by_location - 根据位置查询POI",
                "get_poi_details - 获取POI详情",
                "search_places - 搜索地点",
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
            name="get_pois_by_location",
            description="根据经纬度查询周边的旅游景点POI",
            inputSchema={
                "type": "object",
                "properties": {
                    "lon": {
                        "type": "number",
                        "description": "经度，如: 113.264",
                    },
                    "lat": {
                        "type": "number",
                        "description": "纬度，如: 23.129",
                    },
                    "radius": {
                        "type": "integer",
                        "description": "搜索半径（单位：米），默认1000",
                        "default": 1000,
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回数量限制，默认20",
                        "default": 20,
                    },
                    "kinds": {
                        "type": "string",
                        "description": "POI类型，如: museums, attractions,_amusements (多个用逗号分隔)",
                        "default": "tourist_attractions",
                    },
                },
                "required": ["lon", "lat"],
            },
        ),
        Tool(
            name="get_poi_details",
            description="根据POI的XID获取详细信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "xid": {
                        "type": "string",
                        "description": "POI的唯一标识符",
                    }
                },
                "required": ["xid"],
            },
        ),
        Tool(
            name="search_places",
            description="根据地名搜索地点",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "地点名称",
                    }
                },
                "required": ["name"],
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict[str, Any]
) -> list[TextContent]:
    """处理工具调用"""

    if name == "get_pois_by_location":
        lon = arguments.get("lon")
        lat = arguments.get("lat")
        radius = arguments.get("radius", 1000)
        limit = arguments.get("limit", 20)
        kinds = arguments.get("kinds", "tourist_attractions")

        try:
            data = await call_opentripmap(
                "/places/radius",
                {
                    "lon": lon,
                    "lat": lat,
                    "radius": radius,
                    "limit": limit,
                    "kinds": kinds,
                    "format": "json",
                },
            )

            if not data or len(data) == 0:
                return [
                    TextContent(
                        type="text",
                        text=f"未找到周边POI (位置: {lat}, {lon}, 半径: {radius}m)",
                    )
                ]

            # 提取关键信息
            pois = []
            for poi in data:
                pois.append(
                    {
                        "xid": poi.get("xid"),
                        "name": poi.get("name"),
                        "kinds": poi.get("kinds"),
                        "rate": poi.get("rate"),
                        "distance": poi.get("dist"),
                        "point": poi.get("point"),
                    }
                )

            result = {
                "location": {"lat": lat, "lon": lon},
                "radius": radius,
                "total": len(pois),
                "pois": pois,
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(result, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询失败: {str(e)}")]

    elif name == "get_poi_details":
        xid = arguments.get("xid")

        try:
            data = await call_opentripmap(f"/places/xid/{xid}")

            result = {
                "xid": data.get("xid"),
                "name": data.get("name"),
                "address": data.get("address"),
                "rate": data.get("rate"),
                "description": data.get("wikipedia_extracts", {}).get("text")
                or data.get("info", {}).get("descr"),
                "image": data.get("preview", {}).get("source"),
                "url": data.get("otm"),
                "kinds": data.get("kinds"),
                "point": data.get("point"),
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(result, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询失败: {str(e)}")]

    elif name == "search_places":
        name = arguments.get("name")

        try:
            data = await call_opentripmap("/places/autocomplete", {"name": name})

            if not data or len(data) == 0:
                return [
                    TextContent(
                        type="text",
                        text=f"未找到匹配的地点: {name}",
                    )
                ]

            results = []
            for place in data:
                results.append(
                    {
                        "name": place.get("name"),
                        "xid": place.get("xid"),
                        "point": place.get("point"),
                        "country": place.get("country"),
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
                server_name="opentripmap-mcp-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
