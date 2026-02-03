"""
MCP客户端管理器 - 管理多个MCPClient实例
"""
import asyncio
import logging
from typing import Dict, List, Optional, Any

from mcp.types import Tool, Resource, Prompt

from app.services.mcp_client import MCPClient
from app.services.mcp_service import MCPManager, MCPServer, mcp_manager as default_mcp_manager

logger = logging.getLogger(__name__)


class MCPClientManager:
    """
    MCP客户端管理器 - 管理多个MCPClient实例

    职责：
    1. 管理多个MCPClient实例的生命周期
    2. 提供统一的初始化和关闭接口
    3. 提供工具、资源、提示词的聚合查询接口
    4. 路由工具调用到正确的客户端
    """

    def __init__(self, mcp_manager: MCPManager = None):
        """
        初始化MCP客户端管理器

        Args:
            mcp_manager: MCP服务器配置管理器
        """
        self.mcp_manager = mcp_manager if mcp_manager is not None else default_mcp_manager
        self._clients: Dict[str, MCPClient] = {}
        self._initialized = False

    async def initialize(self, server_names: List[str] = None) -> None:
        """
        初始化所有MCP客户端连接

        Args:
            server_names: 要初始化的服务器列表，None表示全部
        """
        if self._initialized:
            logger.warning("MCP Client Manager already initialized")
            return

        if server_names is None:
            server_names = self.mcp_manager.list_available_servers()

        logger.info(f"Initializing MCP connections for servers: {server_names}")

        # 并发连接所有服务器
        connect_tasks = []
        for server_name in server_names:
            config = self.mcp_manager.get_server(server_name)
            if config and config.enabled:
                client = MCPClient(server_name, config)
                self._clients[server_name] = client
                connect_tasks.append(client.connect())

        # 等待所有连接完成
        results = await asyncio.gather(*connect_tasks, return_exceptions=True)

        # 统计结果
        success_count = sum(1 for r in results if r is True)
        fail_count = sum(1 for r in results if r is not True)

        self._initialized = True
        logger.info(
            f"MCP Client Manager initialization completed: "
            f"{success_count} connected, {fail_count} failed"
        )

    async def close(self) -> None:
        """关闭所有MCP连接"""
        logger.info("Closing all MCP connections")

        disconnect_tasks = [
            client.disconnect() for client in self._clients.values()
        ]
        await asyncio.gather(*disconnect_tasks, return_exceptions=True)

        self._clients.clear()
        self._initialized = False

    def get_client(self, server_name: str) -> Optional[MCPClient]:
        """
        获取指定服务器的客户端

        Args:
            server_name: 服务器名称

        Returns:
            MCPClient实例，不存在返回None
        """
        return self._clients.get(server_name)

    def get_all_tools(self) -> Dict[str, List[Tool]]:
        """获取所有可用工具，按服务器分组"""
        return {
            name: client.tools
            for name, client in self._clients.items()
            if client.is_connected
        }

    def get_tools_flat(self) -> List[Tool]:
        """获取所有工具的扁平列表"""
        tools = []
        for client in self._clients.values():
            if client.is_connected:
                tools.extend(client.tools)
        return tools

    def get_all_resources(self) -> Dict[str, List[Resource]]:
        """获取所有可用资源，按服务器分组"""
        return {
            name: client.resources
            for name, client in self._clients.items()
            if client.is_connected
        }

    def get_all_prompts(self) -> Dict[str, List[Prompt]]:
        """获取所有提示词，按服务器分组"""
        return {
            name: client.prompts
            for name, client in self._clients.items()
            if client.is_connected
        }

    async def call_tool(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Any:
        """
        调用指定服务器的工具

        Args:
            server_name: 服务器名称
            tool_name: 工具名称
            arguments: 工具参数

        Returns:
            工具调用结果
        """
        client = self.get_client(server_name)
        if not client:
            raise ValueError(f"MCP server '{server_name}' not found")

        if not client.is_connected:
            raise ValueError(f"MCP server '{server_name}' is not connected")

        return await client.call_tool(tool_name, arguments)

    async def read_resource(self, server_name: str, uri: str) -> Any:
        """
        读取指定服务器的资源

        Args:
            server_name: 服务器名称
            uri: 资源URI

        Returns:
            资源内容
        """
        client = self.get_client(server_name)
        if not client:
            raise ValueError(f"MCP server '{server_name}' not found")

        if not client.is_connected:
            raise ValueError(f"MCP server '{server_name}' is not connected")

        return await client.read_resource(uri)

    async def get_prompt(
        self,
        server_name: str,
        prompt_name: str,
        arguments: Dict[str, Any] = None
    ) -> Any:
        """
        获取指定服务器的提示词

        Args:
            server_name: 服务器名称
            prompt_name: 提示词名称
            arguments: 提示词参数

        Returns:
            提示词内容
        """
        client = self.get_client(server_name)
        if not client:
            raise ValueError(f"MCP server '{server_name}' not found")

        if not client.is_connected:
            raise ValueError(f"MCP server '{server_name}' is not connected")

        return await client.get_prompt(prompt_name, arguments)

    def is_connected(self, server_name: str) -> bool:
        """检查服务器是否已连接"""
        client = self.get_client(server_name)
        return client is not None and client.is_connected

    def list_connected_servers(self) -> List[str]:
        """列出所有已连接的服务器"""
        return [
            name for name, client in self._clients.items()
            if client.is_connected
        ]


# 全局单例
_mcp_client_manager: Optional[MCPClientManager] = None


def get_mcp_client_manager() -> MCPClientManager:
    """获取全局MCP客户端管理器单例"""
    global _mcp_client_manager
    if _mcp_client_manager is None:
        _mcp_client_manager = MCPClientManager()
    return _mcp_client_manager


async def ensure_mcp_initialized(server_names: List[str] = None) -> MCPClientManager:
    """确保MCP客户端管理器已初始化"""
    manager = get_mcp_client_manager()
    if not manager._initialized:
        await manager.initialize(server_names)
    return manager
