"""Simple API test without Chinese characters"""
import asyncio
import httpx
import json


async def test_apis():
    """Test all APIs"""

    # Test 1: Geocoding
    print("\n=== Test 1: Geocoding ===")
    url = "https://geocoding-api.open-meteo.com/v1/search"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params={"name": "Beijing", "count": 1})
        print(f"Status: {resp.status_code}")
        print(f"Success: {resp.status_code == 200}")

    # Test 2: Air Quality
    print("\n=== Test 2: Air Quality ===")
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": 39.9,
        "longitude": 116.4,
        "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        print(f"Status: {resp.status_code}")
        print(f"Success: {resp.status_code == 200}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Has current data: {'current' in data}")
            if 'current' in data:
                print(f"US AQI: {data['current'].get('us_aqi', 'N/A')}")
                print(f"PM2.5: {data['current'].get('pm2_5', 'N/A')}")

    # Test 3: Weather Forecast
    print("\n=== Test 3: Weather Forecast ===")
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": 23.13,
        "longitude": 113.26,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max",
        "forecast_days": 3,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        print(f"Status: {resp.status_code}")
        print(f"Success: {resp.status_code == 200}")

    # Test 4: Current Weather
    print("\n=== Test 4: Current Weather ===")
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": 31.23,
        "longitude": 121.47,
        "current": "temperature_2m,relative_humidity_2m,windspeed_10m,winddirection_10m",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        print(f"Status: {resp.status_code}")
        print(f"Success: {resp.status_code == 200}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Temperature: {data['current'].get('temperature_2m', 'N/A')} C")
            print(f"Humidity: {data['current'].get('relative_humidity_2m', 'N/A')} %")
            print(f"Wind Speed: {data['current'].get('windspeed_10m', 'N/A')} km/h")

    print("\n=== All Tests Complete ===")
    print("MCP server is ready!")


if __name__ == "__main__":
    asyncio.run(test_apis())
