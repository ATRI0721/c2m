#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import https from "https";

// 创建MCP服务器实例
const server = new Server(
  {
    name: "weather-mcp-server",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 获取天气信息的函数
function getWeatherData(location: string, dateStr?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 使用Open-Meteo免费API（无需API密钥）
    // 首先需要通过地理编码API获取位置坐标
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=zh&format=json`;

    https.get(geoUrl, (geoRes) => {
      let geoData = "";

      geoRes.on("data", (chunk) => {
        geoData += chunk;
      });

      geoRes.on("end", () => {
        try {
          const geoResult = JSON.parse(geoData);

          if (!geoResult.results || geoResult.results.length === 0) {
            reject(new Error(`未找到位置: ${location}`));
            return;
          }

          const { latitude, longitude, name, country } = geoResult.results[0];

          // 获取最多16天的天气预报（Open-Meteo免费API限制）
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&timezone=auto&forecast_days=16`;

          https.get(weatherUrl, (weatherRes) => {
            let weatherData = "";

            weatherRes.on("data", (chunk) => {
              weatherData += chunk;
            });

            weatherRes.on("end", () => {
              try {
                const weatherResult = JSON.parse(weatherData);
                const daily = weatherResult.daily;

                // 确定要查询哪一天的天气
                let targetDate = dateStr;
                let dayIndex = 0;

                if (targetDate) {
                  // 如果指定了日期，找到对应的索引
                  dayIndex = daily.time.findIndex((d: string) => d === targetDate);
                  if (dayIndex === -1) {
                    reject(new Error(`无法找到日期 ${targetDate} 的天气预报（仅支持未来16天内的日期）`));
                    return;
                  }
                } else {
                  // 默认获取明天的天气（索引1）
                  dayIndex = 1;
                  if (dayIndex >= daily.time.length) {
                    reject(new Error("无法获取明天的天气预报"));
                    return;
                  }
                }

                const weather = {
                  date: daily.time[dayIndex],
                  location: `${name}, ${country}`,
                  weatherCode: daily.weathercode[dayIndex],
                  maxTemp: daily.temperature_2m_max[dayIndex],
                  minTemp: daily.temperature_2m_min[dayIndex],
                  precipitationProb: daily.precipitation_probability_max[dayIndex],
                  windSpeed: daily.windspeed_10m_max[dayIndex],
                };

                // 天气代码解析
                const weatherCodes: { [key: number]: string } = {
                  0: "晴朗",
                  1: "大部分晴朗",
                  2: "多云",
                  3: "阴天",
                  45: "雾",
                  48: "白霜雾",
                  51: "毛毛雨（轻）",
                  53: "毛毛雨（中）",
                  55: "毛毛雨（密）",
                  61: "小雨",
                  63: "中雨",
                  65: "大雨",
                  66: "冻雨（轻）",
                  67: "冻雨（重）",
                  71: "小雪",
                  73: "中雪",
                  75: "大雪",
                  77: "雪粒",
                  80: "阵雨（轻）",
                  81: "阵雨（中）",
                  82: "阵雨（大）",
                  85: "阵雪（轻）",
                  86: "阵雪（重）",
                  95: "雷暴",
                  96: "雷暴伴有冰雹（轻）",
                  99: "雷暴伴有冰雹（重）",
                };

                const weatherDescription =
                  weatherCodes[weather.weatherCode] || "未知";

                // 判断是今天、明天还是指定日期
                const today = new Date().toISOString().split('T')[0];
                const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                let dateLabel = weather.date;
                if (weather.date === today) {
                  dateLabel = "今天";
                } else if (weather.date === tomorrow) {
                  dateLabel = "明天";
                }

                const response = `
📍 **${weather.location} ${dateLabel}的天气预报**

📅 日期: ${weather.date}

🌤️ 天气状况: ${weatherDescription}

🌡️ 温度范围: ${weather.minTemp}°C ~ ${weather.maxTemp}°C

💧 降水概率: ${weather.precipitationProb}%

💨 最大风速: ${weather.windSpeed} km/h
                `.trim();

                resolve(response);
              } catch (error) {
                reject(new Error("解析天气数据失败"));
              }
            });

            weatherRes.on("error", (error: unknown) => {
              reject(new Error(`获取天气数据失败: ${error instanceof Error ? error.message : "未知错误"}`));
            });
          });
        } catch (error) {
          reject(new Error("解析地理位置数据失败"));
        }
      });

      geoRes.on("error", (error: unknown) => {
        reject(new Error(`获取地理位置失败: ${error instanceof Error ? error.message : "未知错误"}`));
      });
    });
  });
}

// 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_weather",
        description:
          "获取指定城市指定日期的天气预报，包括温度、天气状况、降水概率和风速等信息。支持未来16天内的天气预报。如果不指定日期，默认返回明天的天气。",
        inputSchema: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "城市名称，例如: 北京、上海、Tokyo、New York",
            },
            date: {
              type: "string",
              description: "日期（可选），格式: YYYY-MM-DD，例如: 2026-02-06。不指定则返回明天的天气。",
            },
          },
          required: ["location"],
        },
      },
    ],
  };
});

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_weather") {
    const location = args?.location as string;
    const date = args?.date as string | undefined;

    if (!location) {
      throw new Error("缺少必需的参数: location");
    }

    try {
      const weather = await getWeatherData(location, date);
      return {
        content: [
          {
            type: "text",
            text: weather,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `错误: ${error instanceof Error ? error.message : "未知错误"}`,
          },
        ],
        isError: true,
      };
    }
  } else {
    throw new Error(`未知的工具: ${name}`);
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("天气MCP服务器已启动");
}

main().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});
