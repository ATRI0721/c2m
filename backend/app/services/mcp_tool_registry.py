"""
MCP工具注册表
负责将MCP工具转换为OpenAI函数调用格式，并提供工具调用能力
"""
import json
import logging
import re
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass

from mcp.types import Tool
from openai.types.chat import ChatCompletionToolParam

from app.services.mcp_client_manager import MCPClientManager, get_mcp_client_manager

logger = logging.getLogger(__name__)


def sanitize_tool_name(tool_id: str) -> str:
    """
    将工具ID转换为符合LLM API要求的名称格式
    只允许字母、数字、下划线和连字符

    Args:
        tool_id: 原始工具ID (格式: server_name:tool_name)

    Returns:
        符合要求的工具名称
    """
    # 将冒号和点替换为下划线
    sanitized = tool_id.replace(':', '_').replace('.', '_')
    # 移除其他不符合的字符
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', sanitized)
    return sanitized


@dataclass
class MCPToolWrapper:
    """MCP工具包装器"""
    server_name: str
    tool: Tool
    tool_id: str  # 格式: server_name:tool_name

    def to_openai_function(self) -> ChatCompletionToolParam:
        """
        将MCP工具转换为OpenAI函数调用格式

        Returns:
            符合OpenAI函数调用格式的工具定义
        """
        # 使用符合要求的工具名称
        function_name = sanitize_tool_name(self.tool_id)

        function = {
            "type": "function",
            "function": {
                "name": function_name,
                "description": self.tool.description or f"Tool from {self.server_name}",
            }
        }

        # 添加输入schema
        if self.tool.inputSchema:
            function["function"]["parameters"] = self.tool.inputSchema

        return function  # type: ignore


class MCPToolRegistry:
    """
    MCP工具注册表

    负责：
    1. 注册所有MCP工具
    2. 将MCP工具转换为OpenAI函数格式
    3. 处理工具调用请求
    4. 提供工具发现和查询
    """

    def __init__(self, mcp_client_manager: MCPClientManager = None):
        self.mcp_client_manager = mcp_client_manager or get_mcp_client_manager()
        self.tools: Dict[str, MCPToolWrapper] = {}  # tool_id -> MCPToolWrapper
        self._sanitized_name_map: Dict[str, str] = {}  # sanitized_name -> tool_id
        self._initialized = False

    async def initialize(self) -> None:
        """初始化工具注册表，从所有连接的MCP服务器加载工具"""
        if self._initialized:
            logger.warning("MCP Tool Registry already initialized")
            return

        logger.info("Initializing MCP Tool Registry")

        # 确保MCP客户端管理器已初始化
        if not self.mcp_client_manager._initialized:
            await self.mcp_client_manager.initialize()

        # 从所有连接的服务器加载工具
        all_tools = self.mcp_client_manager.get_all_tools()
        for server_name, tools in all_tools.items():
            for tool in tools:
                self._register_tool(server_name, tool)

        self._initialized = True
        logger.info(f"MCP Tool Registry initialized with {len(self.tools)} tools")

    def _register_tool(self, server_name: str, tool: Tool) -> None:
        """注册单个工具"""
        tool_id = f"{server_name}:{tool.name}"
        wrapper = MCPToolWrapper(
            server_name=server_name,
            tool=tool,
            tool_id=tool_id
        )
        self.tools[tool_id] = wrapper
        # 创建消毒后的名称映射
        sanitized_name = sanitize_tool_name(tool_id)
        self._sanitized_name_map[sanitized_name] = tool_id
        logger.debug(f"Registered tool: {tool_id} -> {sanitized_name}")

    def get_all_tools(self) -> Dict[str, MCPToolWrapper]:
        """获取所有注册的工具"""
        return self.tools

    def get_tools_for_agent(self, mcp_services: set) -> List[MCPToolWrapper]:
        """
        获取指定Agent可用的工具

        Args:
            mcp_services: Agent需要的MCP服务名称集合

        Returns:
            该Agent可用的工具列表
        """
        available_tools = []
        for tool_wrapper in self.tools.values():
            if tool_wrapper.server_name in mcp_services:
                available_tools.append(tool_wrapper)

        return available_tools

    def to_openai_tools(
        self,
        mcp_services: set = None
    ) -> List[ChatCompletionToolParam]:
        """
        将MCP工具转换为OpenAI函数调用格式

        Args:
            mcp_services: 要包含的MCP服务集合，None表示包含所有工具

        Returns:
            OpenAI函数调用格式的工具列表
        """
        if mcp_services is None:
            # 包含所有工具
            tools_to_include = list(self.tools.values())
        else:
            tools_to_include = self.get_tools_for_agent(mcp_services)

        openai_tools = []
        for wrapper in tools_to_include:
            try:
                openai_tools.append(wrapper.to_openai_function())
            except Exception as e:
                logger.error(f"Error converting tool {wrapper.tool_id}: {e}")

        logger.debug(f"Converted {len(openai_tools)} tools to OpenAI format")
        return openai_tools

    async def execute_tool_call(
        self,
        tool_id: str,
        arguments: Dict[str, Any]
    ) -> Any:
        """
        执行工具调用

        Args:
            tool_id: 工具ID (可能是消毒后的名称或原始的server_name:tool_name格式)
            arguments: 工具参数

        Returns:
            工具执行结果
        """
        # 如果是消毒后的名称，映射回原始tool_id
        actual_tool_id = self._sanitized_name_map.get(tool_id, tool_id)

        wrapper = self.tools.get(actual_tool_id)
        if not wrapper:
            raise ValueError(f"Tool '{tool_id}' (mapped to '{actual_tool_id}') not found in registry")

        logger.info(f"Executing tool call: {actual_tool_id} with args: {arguments}")

        try:
            result = await self.mcp_client_manager.call_tool(
                server_name=wrapper.server_name,
                tool_name=wrapper.tool.name,
                arguments=arguments
            )
            return result
        except Exception as e:
            logger.error(f"Error executing tool {actual_tool_id}: {e}")
            raise

    def get_tool_info(self, tool_id: str) -> Optional[Dict[str, Any]]:
        """
        获取工具信息

        Args:
            tool_id: 工具ID

        Returns:
            工具信息字典
        """
        wrapper = self.tools.get(tool_id)
        if not wrapper:
            return None

        return {
            "tool_id": wrapper.tool_id,
            "server_name": wrapper.server_name,
            "name": wrapper.tool.name,
            "description": wrapper.tool.description,
            "input_schema": wrapper.tool.inputSchema
        }

    def list_tools_by_server(self) -> Dict[str, List[str]]:
        """
        按服务器列出所有工具

        Returns:
            服务器名称 -> 工具ID列表的映射
        """
        result: Dict[str, List[str]] = {}
        for wrapper in self.tools.values():
            if wrapper.server_name not in result:
                result[wrapper.server_name] = []
            result[wrapper.server_name].append(wrapper.tool_id)
        return result

    def generate_system_prompt(self, mcp_services: set) -> str:
        """
        为Agent生成关于MCP工具的系统提示词

        Args:
            mcp_services: Agent可用的MCP服务集合

        Returns:
            系统提示词文本
        """
        if not mcp_services:
            return ""

        tools = self.get_tools_for_agent(mcp_services)
        if not tools:
            return ""

        # 按服务器分组工具
        tools_by_server: Dict[str, List[MCPToolWrapper]] = {}
        for tool in tools:
            if tool.server_name not in tools_by_server:
                tools_by_server[tool.server_name] = []
            tools_by_server[tool.server_name].append(tool)

        prompt_parts = ["\n你可以使用以下MCP服务的工具:\n"]

        for server_name, server_tools in sorted(tools_by_server.items()):
            prompt_parts.append(f"### {server_name}\n")
            for tool in server_tools:
                desc = tool.tool.description or "无描述"
                prompt_parts.append(f"- **{tool.tool.name}**: {desc}")
            prompt_parts.append("")

        return "\n".join(prompt_parts)


# 全局单例
_mcp_tool_registry: Optional[MCPToolRegistry] = None


def get_mcp_tool_registry() -> MCPToolRegistry:
    """获取全局MCP工具注册表单例"""
    global _mcp_tool_registry
    if _mcp_tool_registry is None:
        _mcp_tool_registry = MCPToolRegistry()
    return _mcp_tool_registry


async def ensure_tool_registry() -> MCPToolRegistry:
    """确保工具注册表已初始化"""
    registry = get_mcp_tool_registry()
    if not registry._initialized:
        await registry.initialize()
    return registry
