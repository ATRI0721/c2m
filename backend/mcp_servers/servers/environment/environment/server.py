"""
环境MCP服务器
提供空气质量查询、天气预测/查询、风速/风向、湿度、气温等功能
基于Weather API167和Open-Meteo API
"""
import asyncio
import json
import os
from typing import Any, Optional
from datetime import datetime
import httpx

from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)

# 配置
WEATHER_API_BASE = "https://weather-api167.p.rapidapi.com"
OPEN_METEO_BASE = "https://api.open-meteo.com"
OPEN_METEO_AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com"
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")

# 创建MCP服务器实例
server = Server("environment-mcp-server")


async def call_weather_api(
    endpoint: str, params: dict[str, Any]
) -> dict[str, Any]:
    """调用Weather API167"""
    url = f"{WEATHER_API_BASE}{endpoint}"
    headers = {
        "x-rapidapi-host": "weather-api167.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()


async def call_open_meteo(
    endpoint: str, params: dict[str, Any]
) -> dict[str, Any]:
    """调用Open-Meteo API"""
    url = f"{OPEN_METEO_BASE}{endpoint}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


@server.list_resources()
async def handle_list_resources() -> list[Resource]:
    """列出可用资源"""
    return [
        Resource(
            uri="environment://status",
            name="服务状态",
            description="环境MCP服务器状态信息",
            mimeType="application/json",
        )
    ]


@server.read_resource()
async def handle_read_resource(uri: str) -> str:
    """读取资源"""
    if uri == "environment://status":
        status = {
            "server": "environment-mcp-server",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat(),
            "endpoints": [
                "air_quality - 空气质量查询",
                "weather_forecast - 天气预报",
                "current_weather - 当前天气",
                "wind_info - 风速风向查询",
                "humidity_info - 湿度查询",
                "temperature_info - 气温查询",
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
            name="get_air_quality",
            description="查询指定城市的空气质量指数(AQI)和污染物浓度(PM2.5, PM10, O3, SO2, NO2, CO)",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称，如: Beijing, Guangzhou, Shanghai",
                    },
                    "country": {
                        "type": "string",
                        "description": "国家代码(可选)，默认CN",
                        "default": "CN",
                    },
                },
                "required": ["city"],
            },
        ),
        Tool(
            name="get_weather_forecast",
            description="获取指定城市的天气预报，包括天气状况、温度、降水概率等",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称",
                    },
                    "days": {
                        "type": "integer",
                        "description": "预报天数(1-5)，默认5天",
                        "default": 5,
                        "minimum": 1,
                        "maximum": 5,
                    },
                },
                "required": ["city"],
            },
        ),
        Tool(
            name="get_current_weather",
            description="获取指定城市当前的天气状况",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称",
                    },
                },
                "required": ["city"],
            },
        ),
        Tool(
            name="get_wind_info",
            description="查询指定城市的风速和风向信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名称"},
                    "date": {
                        "type": "string",
                        "description": "日期(可选)，格式YYYY-MM-DD，默认今天",
                    },
                },
                "required": ["city"],
            },
        ),
        Tool(
            name="get_humidity_info",
            description="查询指定城市的湿度信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名称"},
                    "date": {
                        "type": "string",
                        "description": "日期(可选)，格式YYYY-MM-DD",
                    },
                },
                "required": ["city"],
            },
        ),
        Tool(
            name="get_temperature_info",
            description="查询指定城市的气温信息，包括当前温度、最高/最低温度",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名称"},
                    "date": {
                        "type": "string",
                        "description": "日期(可选)，格式YYYY-MM-DD",
                    },
                },
                "required": ["city"],
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict[str, Any]
) -> list[TextContent | ImageContent | EmbeddedResource]:
    """处理工具调用"""

    if name == "get_air_quality":
        city = arguments.get("city")
        country = arguments.get("country", "CN")
        location = f"{city},{country}"

        try:
            # 使用Open-Meteo API获取空气质量数据
            # 首先需要获取城市的经纬度
            geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
            async with httpx.AsyncClient() as client:
                geo_response = await client.get(
                    geocoding_url, params={"name": city, "count": 1, "language": "zh"}
                )
                geo_data = geo_response.json()

                if (
                    not geo_data.get("results")
                    or len(geo_data["results"]) == 0
                ):
                    return [
                        TextContent(
                            type="text",
                            text=f"错误: 无法找到城市 '{city}' 的坐标信息",
                        )
                    ]

                lat = geo_data["results"][0]["latitude"]
                lon = geo_data["results"][0]["longitude"]

            # 获取空气质量数据
            aqi_url = f"{OPEN_METEO_AIR_QUALITY_BASE}/v1/air-quality"
            aqi_response = await call_open_meteo(
                aqi_url,
                {
                    "latitude": lat,
                    "longitude": lon,
                    "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi",
                },
            )

            result = {
                "city": city,
                "country": country,
                "coordinates": {"latitude": lat, "longitude": lon},
                "air_quality": aqi_response.get("current", {}),
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(result, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询空气质量失败: {str(e)}")]

    elif name == "get_weather_forecast":
        city = arguments.get("city")
        days = arguments.get("days", 5)

        try:
            # 使用Open-Meteo API获取天气预报
            geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
            async with httpx.AsyncClient() as client:
                geo_response = await client.get(
                    geocoding_url, params={"name": city, "count": 1, "language": "zh"}
                )
                geo_data = geo_response.json()

                if (
                    not geo_data.get("results")
                    or len(geo_data["results"]) == 0
                ):
                    return [
                        TextContent(
                            type="text",
                            text=f"错误: 无法找到城市 '{city}' 的坐标信息",
                        )
                    ]

                lat = geo_data["results"][0]["latitude"]
                lon = geo_data["results"][0]["longitude"]

            # 获取天气预报数据
            forecast_url = f"{OPEN_METEO_BASE}/v1/forecast"
            forecast_response = await call_open_meteo(
                forecast_url,
                {
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode",
                    "timezone": "auto",
                    "forecast_days": days,
                },
            )

            result = {
                "city": city,
                "forecast_days": days,
                "forecast": forecast_response.get("daily", {}),
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(result, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询天气预报失败: {str(e)}")]

    elif name == "get_current_weather":
        city = arguments.get("city")

        try:
            geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
            async with httpx.AsyncClient() as client:
                geo_response = await client.get(
                    geocoding_url, params={"name": city, "count": 1, "language": "zh"}
                )
                geo_data = geo_response.json()

                if (
                    not geo_data.get("results")
                    or len(geo_data["results"]) == 0
                ):
                    return [
                        TextContent(
                            type="text",
                            text=f"错误: 无法找到城市 '{city}' 的坐标信息",
                        )
                    ]

                lat = geo_data["results"][0]["latitude"]
                lon = geo_data["results"][0]["longitude"]

            # 获取当前天气数据
            weather_url = f"{OPEN_METEO_BASE}/v1/forecast"
            weather_response = await call_open_meteo(
                weather_url,
                {
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,weathercode,windspeed_10m,winddirection_10m",
                    "timezone": "auto",
                },
            )

            result = {
                "city": city,
                "current_weather": weather_response.get("current", {}),
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(result, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询当前天气失败: {str(e)}")]

    elif name == "get_wind_info":
        city = arguments.get("city")

        try:
            # 使用当前天气API获取风速风向信息
            result_call = await handle_call_tool(
                "get_current_weather", {"city": city}
            )
            data = json.loads(result_call[0].text)

            if "error" in data.lower():
                return [TextContent(type="text", text=data)]

            # 提取风速风向信息
            current = data.get("current_weather", {})
            wind_info = {
                "city": city,
                "wind_speed_kmh": current.get("windspeed_10m"),
                "wind_direction_degrees": current.get("winddirection_10m"),
                "timestamp": current.get("time"),
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(wind_info, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询风速风向失败: {str(e)}")]

    elif name == "get_humidity_info":
        city = arguments.get("city")

        try:
            result_call = await handle_call_tool(
                "get_current_weather", {"city": city}
            )
            data = json.loads(result_call[0].text)

            if "error" in data.lower():
                return [TextContent(type="text", text=data)]

            current = data.get("current_weather", {})
            humidity_info = {
                "city": city,
                "relative_humidity_percent": current.get("relative_humidity_2m"),
                "timestamp": current.get("time"),
            }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(humidity_info, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询湿度信息失败: {str(e)}")]

    elif name == "get_temperature_info":
        city = arguments.get("city")
        date = arguments.get("date")

        try:
            if date:
                # 获取特定日期的温度
                geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
                async with httpx.AsyncClient() as client:
                    geo_response = await client.get(
                        geocoding_url,
                        params={"name": city, "count": 1, "language": "zh"},
                    )
                    geo_data = geo_response.json()

                    if (
                        not geo_data.get("results")
                        or len(geo_data["results"]) == 0
                    ):
                        return [
                            TextContent(
                                type="text",
                                text=f"错误: 无法找到城市 '{city}' 的坐标信息",
                            )
                        ]

                    lat = geo_data["results"][0]["latitude"]
                    lon = geo_data["results"][0]["longitude"]

                forecast_url = f"{OPEN_METEO_BASE}/v1/forecast"
                forecast_response = await call_open_meteo(
                    forecast_url,
                    {
                        "latitude": lat,
                        "longitude": lon,
                        "daily": "temperature_2m_max,temperature_2m_min",
                        "timezone": "auto",
                        "start_date": date,
                        "end_date": date,
                    },
                )

                daily = forecast_response.get("daily", {})
                temp_info = {
                    "city": city,
                    "date": date,
                    "temperature_max_c": daily.get("temperature_2m_max", [None])[0],
                    "temperature_min_c": daily.get("temperature_2m_min", [None])[0],
                }
            else:
                # 获取当前温度
                result_call = await handle_call_tool(
                    "get_current_weather", {"city": city}
                )
                data = json.loads(result_call[0].text)

                if "error" in data.lower():
                    return [TextContent(type="text", text=data)]

                current = data.get("current_weather", {})
                temp_info = {
                    "city": city,
                    "temperature_c": current.get("temperature_2m"),
                    "timestamp": current.get("time"),
                }

            return [
                TextContent(
                    type="text",
                    text=json.dumps(temp_info, ensure_ascii=False, indent=2),
                )
            ]

        except Exception as e:
            return [TextContent(type="text", text=f"查询气温信息失败: {str(e)}")]

    else:
        return [TextContent(type="text", text=f"未知的工具: {name}")]


async def main():
    """主函数"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="environment-mcp-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
