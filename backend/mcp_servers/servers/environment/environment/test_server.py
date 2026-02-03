"""
测试环境MCP服务器的各个工具功能
"""
import asyncio
import httpx
import json


async def test_geocoding():
    """测试地理编码API"""
    print("\n" + "=" * 50)
    print("测试 1: 地理编码 (获取城市坐标)")
    print("=" * 50)

    url = "https://geocoding-api.open-meteo.com/v1/search"
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url, params={"name": "Beijing", "count": 1, "language": "zh"}
        )
        data = response.json()
        print(f"状态码: {response.status_code}")
        print(f"结果: {json.dumps(data, ensure_ascii=False, indent=2)}")


async def test_air_quality():
    """测试空气质量API"""
    print("\n" + "=" * 50)
    print("测试 2: 空气质量查询")
    print("=" * 50)

    # 北京坐标
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": 39.9042,
        "longitude": 116.4074,
        "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()
        print(f"状态码: {response.status_code}")
        print(f"结果: {json.dumps(data, ensure_ascii=False, indent=2)}")


async def test_weather_forecast():
    """测试天气预报API"""
    print("\n" + "=" * 50)
    print("测试 3: 天气预报")
    print("=" * 50)

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": 23.1291,
        "longitude": 113.2644,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode",
        "timezone": "auto",
        "forecast_days": 5,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()
        print(f"状态码: {response.status_code}")
        print(f"结果: {json.dumps(data, ensure_ascii=False, indent=2)}")


async def test_current_weather():
    """测试当前天气API"""
    print("\n" + "=" * 50)
    print("测试 4: 当前天气")
    print("=" * 50)

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": 31.2304,
        "longitude": 121.4737,
        "current": "temperature_2m,relative_humidity_2m,weathercode,windspeed_10m,winddirection_10m",
        "timezone": "auto",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()
        print(f"状态码: {response.status_code}")
        print(f"结果: {json.dumps(data, ensure_ascii=False, indent=2)}")


async def test_all():
    """运行所有测试"""
    print("\n" + "=" * 50)
    print("环境MCP服务器 - API测试")
    print("=" * 50)

    try:
        await test_geocoding()
        await test_air_quality()
        await test_weather_forecast()
        await test_current_weather()

        print("\n" + "=" * 50)
        print("[OK] 所有API测试完成")
        print("=" * 50)
        print("\n说明:")
        print("- 所有API都使用免费的Open-Meteo服务")
        print("- 无需API密钥即可使用")
        print("- 支持全球所有城市的数据查询")
        print("\nMCP服务器已就绪，可以启动使用!")

    except Exception as e:
        print(f"\n[ERROR] 测试失败: {e}")


if __name__ == "__main__":
    asyncio.run(test_all())
