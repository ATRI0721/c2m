"""
配置管理MCP服务器
专门用于Code2MCP系统的配置管理，包括Agent和MCP服务器的配置
此服务仅提供给assistant agent使用，具有完整的配置管理权限
"""
import asyncio
import json
import os
import sys
from typing import Any
from datetime import datetime
from pathlib import Path

from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
)

# 创建MCP服务器实例
server = Server("config-admin-mcp-server")


def _get_agents_dir() -> Path:
    """获取Agent配置目录"""
    return Path(__file__).resolve().parent.parent.parent.parent / "app" / "agents" / "config"


def _get_mcp_config_file() -> Path:
    """获取MCP配置文件路径"""
    return Path(__file__).resolve().parent.parent.parent / "config" / "servers.json"


def read_agent_config(agent_name: str) -> dict[str, Any] | None:
    """读取指定agent的配置"""
    config_file = _get_agents_dir() / f"{agent_name}.json"
    if not config_file.exists():
        return None
    with open(config_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def list_all_agents() -> dict[str, Any]:
    """列出所有agent配置"""
    agents_dir = _get_agents_dir()
    agents = {}
    if agents_dir.exists():
        for config_file in agents_dir.glob("*.json"):
            agent_name = config_file.stem
            agents[agent_name] = read_agent_config(agent_name)
    return agents


def write_agent_config(agent_name: str, config: dict[str, Any]) -> bool:
    """写入agent配置"""
    config_file = _get_agents_dir() / f"{agent_name}.json"
    try:
        config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[ERROR] 写入agent配置失败: {e}", file=sys.stderr)
        return False


def delete_agent_config(agent_name: str) -> bool:
    """删除agent配置"""
    config_file = _get_agents_dir() / f"{agent_name}.json"
    if not config_file.exists():
        return False
    try:
        os.remove(config_file)
        return True
    except Exception as e:
        print(f"[ERROR] 删除agent配置失败: {e}", file=sys.stderr)
        return False


def read_mcp_config() -> dict[str, Any]:
    """读取MCP服务器配置"""
    mcp_config_file = _get_mcp_config_file()
    if not mcp_config_file.exists():
        return {"mcpServers": {}}
    with open(mcp_config_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def write_mcp_config(config: dict[str, Any]) -> bool:
    """写入MCP服务器配置"""
    mcp_config_file = _get_mcp_config_file()
    try:
        mcp_config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(mcp_config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[ERROR] 写入MCP配置失败: {e}", file=sys.stderr)
        return False


@server.list_resources()
async def handle_list_resources() -> list[Resource]:
    """列出可用资源"""
    return [
        Resource(
            uri="config-admin://status",
            name="服务状态",
            description="配置管理MCP服务器状态信息",
            mimeType="application/json",
        ),
        Resource(
            uri="config-admin://agents",
            name="Agent列表",
            description="所有Agent配置列表",
            mimeType="application/json",
        ),
        Resource(
            uri="config-admin://mcp-servers",
            name="MCP服务器配置",
            description="MCP服务器配置列表",
            mimeType="application/json",
        ),
    ]


@server.read_resource()
async def handle_read_resource(uri: str) -> str:
    """读取资源"""
    if uri == "config-admin://status":
        status = {
            "server": "config-admin-mcp-server",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat(),
            "capabilities": [
                "list_agents - 列出所有Agent",
                "get_agent - 获取指定Agent配置",
                "create_agent - 创建新Agent",
                "update_agent - 更新Agent配置",
                "delete_agent - 删除Agent",
                "list_mcp_servers - 列出所有MCP服务器",
                "get_mcp_server - 获取指定MCP服务器配置",
                "update_mcp_server - 更新MCP服务器配置",
            ],
        }
        return json.dumps(status, ensure_ascii=False, indent=2)
    elif uri == "config-admin://agents":
        agents = list_all_agents()
        return json.dumps(agents, ensure_ascii=False, indent=2)
    elif uri == "config-admin://mcp-servers":
        config = read_mcp_config()
        return json.dumps(config, ensure_ascii=False, indent=2)
    else:
        raise ValueError(f"未知的资源URI: {uri}")


@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """列出可用工具"""
    return [
        # Agent管理工具
        Tool(
            name="list_agents",
            description="列出系统中所有可用的Agent及其配置信息",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="get_agent",
            description="获取指定Agent的详细配置信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent_name": {
                        "type": "string",
                        "description": "Agent名称，如: chat, city, weather, assistant",
                    },
                },
                "required": ["agent_name"],
            },
        ),
        Tool(
            name="create_agent",
            description="创建一个新的Agent配置",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Agent名称（唯一标识符）",
                    },
                    "description": {
                        "type": "string",
                        "description": "Agent描述",
                    },
                    "model": {
                        "type": "string",
                        "description": "使用的模型，如: deepseek-chat",
                        "default": "deepseek-chat",
                    },
                    "system_prompt": {
                        "type": "string",
                        "description": "系统提示词",
                    },
                    "mcp_services": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "需要使用的MCP服务列表",
                        "default": [],
                    },
                    "enable_tool_calling": {
                        "type": "boolean",
                        "description": "是否启用工具调用",
                        "default": True,
                    },
                },
                "required": ["name", "description", "system_prompt"],
            },
        ),
        Tool(
            name="update_agent",
            description="更新现有Agent的配置",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent_name": {
                        "type": "string",
                        "description": "要更新的Agent名称",
                    },
                    "description": {
                        "type": "string",
                        "description": "新的Agent描述",
                    },
                    "model": {
                        "type": "string",
                        "description": "新的模型",
                    },
                    "system_prompt": {
                        "type": "string",
                        "description": "新的系统提示词",
                    },
                    "mcp_services": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "新的MCP服务列表",
                    },
                    "enable_tool_calling": {
                        "type": "boolean",
                        "description": "是否启用工具调用",
                    },
                },
                "required": ["agent_name"],
            },
        ),
        Tool(
            name="delete_agent",
            description="删除指定的Agent配置（谨慎操作）",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent_name": {
                        "type": "string",
                        "description": "要删除的Agent名称",
                    },
                },
                "required": ["agent_name"],
            },
        ),
        # MCP服务器管理工具
        Tool(
            name="list_mcp_servers",
            description="列出所有配置的MCP服务器及其配置信息",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="get_mcp_server",
            description="获取指定MCP服务器的详细配置",
            inputSchema={
                "type": "object",
                "properties": {
                    "server_name": {
                        "type": "string",
                        "description": "MCP服务器名称，如: environment, geocoding",
                    },
                },
                "required": ["server_name"],
            },
        ),
        Tool(
            name="add_mcp_server",
            description="添加或更新MCP服务器配置",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "MCP服务器名称（唯一标识符）",
                    },
                    "command": {
                        "type": "string",
                        "description": "启动命令，如: python, node, uv",
                    },
                    "args": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "命令参数列表",
                    },
                    "description": {
                        "type": "string",
                        "description": "服务器描述",
                    },
                    "env": {
                        "type": "object",
                        "description": "环境变量配置",
                    },
                },
                "required": ["name", "command", "args"],
            },
        ),
        Tool(
            name="remove_mcp_server",
            description="删除指定的MCP服务器配置（谨慎操作）",
            inputSchema={
                "type": "object",
                "properties": {
                    "server_name": {
                        "type": "string",
                        "description": "要删除的MCP服务器名称",
                    },
                },
                "required": ["server_name"],
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict[str, Any]
) -> list[TextContent]:
    """处理工具调用"""

    # Agent管理
    if name == "list_agents":
        agents = list_all_agents()
        return [
            TextContent(
                type="text",
                text=json.dumps(agents, ensure_ascii=False, indent=2),
            )
        ]

    elif name == "get_agent":
        agent_name = arguments.get("agent_name")
        if not agent_name:
            return [TextContent(type="text", text="错误: 缺少agent_name参数")]

        config = read_agent_config(agent_name)
        if config is None:
            return [
                TextContent(
                    type="text",
                    text=f"错误: 未找到Agent '{agent_name}'",
                )
            ]

        return [
            TextContent(
                type="text",
                text=json.dumps(config, ensure_ascii=False, indent=2),
            )
        ]

    elif name == "create_agent":
        required_fields = ["name", "description", "system_prompt"]
        for field in required_fields:
            if field not in arguments:
                return [
                    TextContent(
                        type="text",
                        text=f"错误: 缺少必需参数 '{field}'",
                    )
                ]

        agent_name = arguments["name"]
        # 检查是否已存在
        if read_agent_config(agent_name) is not None:
            return [
                TextContent(
                    type="text",
                    text=f"错误: Agent '{agent_name}' 已存在",
                )
            ]

        # 构建配置
        config = {
            "name": agent_name,
            "description": arguments["description"],
            "model": arguments.get("model", "deepseek-chat"),
            "system_prompt": arguments["system_prompt"],
            "mcp_services": arguments.get("mcp_services", []),
            "enable_tool_calling": arguments.get("enable_tool_calling", True),
        }

        if write_agent_config(agent_name, config):
            return [
                TextContent(
                    type="text",
                    text=f"成功创建Agent '{agent_name}'\n配置:\n{json.dumps(config, ensure_ascii=False, indent=2)}",
                )
            ]
        else:
            return [TextContent(type="text", text=f"错误: 创建Agent '{agent_name}' 失败")]

    elif name == "update_agent":
        agent_name = arguments.get("agent_name")
        if not agent_name:
            return [TextContent(type="text", text="错误: 缺少agent_name参数")]

        # 读取现有配置
        config = read_agent_config(agent_name)
        if config is None:
            return [
                TextContent(
                    type="text",
                    text=f"错误: 未找到Agent '{agent_name}'",
                )
            ]

        # 更新配置
        if "description" in arguments:
            config["description"] = arguments["description"]
        if "model" in arguments:
            config["model"] = arguments["model"]
        if "system_prompt" in arguments:
            config["system_prompt"] = arguments["system_prompt"]
        if "mcp_services" in arguments:
            config["mcp_services"] = arguments["mcp_services"]
        if "enable_tool_calling" in arguments:
            config["enable_tool_calling"] = arguments["enable_tool_calling"]

        if write_agent_config(agent_name, config):
            return [
                TextContent(
                    type="text",
                    text=f"成功更新Agent '{agent_name}'\n新配置:\n{json.dumps(config, ensure_ascii=False, indent=2)}",
                )
            ]
        else:
            return [TextContent(type="text", text=f"错误: 更新Agent '{agent_name}' 失败")]

    elif name == "delete_agent":
        agent_name = arguments.get("agent_name")
        if not agent_name:
            return [TextContent(type="text", text="错误: 缺少agent_name参数")]

        # 保护：不允许删除assistant自身
        if agent_name == "assistant":
            return [
                TextContent(
                    type="text",
                    text="错误: 不允许删除assistant agent",
                )
            ]

        if delete_agent_config(agent_name):
            return [
                TextContent(
                    type="text",
                    text=f"成功删除Agent '{agent_name}'",
                )
            ]
        else:
            return [
                TextContent(
                    type="text",
                    text=f"错误: 删除Agent '{agent_name}' 失败，可能不存在",
                )
            ]

    # MCP服务器管理
    elif name == "list_mcp_servers":
        config = read_mcp_config()
        return [
            TextContent(
                type="text",
                text=json.dumps(config, ensure_ascii=False, indent=2),
            )
        ]

    elif name == "get_mcp_server":
        server_name = arguments.get("server_name")
        if not server_name:
            return [TextContent(type="text", text="错误: 缺少server_name参数")]

        config = read_mcp_config()
        servers = config.get("mcpServers", {})
        if server_name not in servers:
            return [
                TextContent(
                    type="text",
                    text=f"错误: 未找到MCP服务器 '{server_name}'",
                )
            ]

        return [
            TextContent(
                type="text",
                text=json.dumps(servers[server_name], ensure_ascii=False, indent=2),
            )
        ]

    elif name == "add_mcp_server":
        required_fields = ["name", "command", "args"]
        for field in required_fields:
            if field not in arguments:
                return [
                    TextContent(
                        type="text",
                        text=f"错误: 缺少必需参数 '{field}'",
                    )
                ]

        server_name = arguments["name"]
        config = read_mcp_config()

        server_config = {
            "command": arguments["command"],
            "args": arguments["args"],
        }

        if "description" in arguments:
            server_config["description"] = arguments["description"]
        if "env" in arguments:
            server_config["env"] = arguments["env"]

        config["mcpServers"][server_name] = server_config

        if write_mcp_config(config):
            return [
                TextContent(
                    type="text",
                    text=f"成功添加/更新MCP服务器 '{server_name}'\n配置:\n{json.dumps(server_config, ensure_ascii=False, indent=2)}",
                )
            ]
        else:
            return [TextContent(type="text", text=f"错误: 保存MCP服务器配置失败")]

    elif name == "remove_mcp_server":
        server_name = arguments.get("server_name")
        if not server_name:
            return [TextContent(type="text", text="错误: 缺少server_name参数")]

        config = read_mcp_config()
        servers = config.get("mcpServers", {})

        if server_name not in servers:
            return [
                TextContent(
                    type="text",
                    text=f"错误: 未找到MCP服务器 '{server_name}'",
                )
            ]

        del servers[server_name]
        config["mcpServers"] = servers

        if write_mcp_config(config):
            return [
                TextContent(
                    type="text",
                    text=f"成功删除MCP服务器 '{server_name}'",
                )
            ]
        else:
            return [TextContent(type="text", text=f"错误: 保存MCP服务器配置失败")]

    else:
        return [TextContent(type="text", text=f"未知的工具: {name}")]


async def main():
    """主函数"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="config-admin-mcp-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
