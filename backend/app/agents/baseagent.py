"""
Agent基类 - 支持MCP客户端集成
所有具体的Agent都应该继承此类
"""
from typing import List, Set, Any, Dict
import json
import logging
import re
from app.models.dto import MessageDTO
from openai import AsyncOpenAI
from openai.types.chat import (
    ChatCompletionSystemMessageParam,
    ChatCompletionUserMessageParam,
    ChatCompletionAssistantMessageParam,
    ChatCompletionToolParam,
    ChatCompletionToolMessageParam,
)

from app.services.mcp_tool_registry import (
    MCPToolRegistry,
    get_mcp_tool_registry,
)

logger = logging.getLogger(__name__)


class BaseAgent:
    """Agent基类,所有具体的Agent都应该继承此类"""

    # Agent配置 (子类必须重写)
    name: str = ""  # Agent名称
    description: str = ""  # Agent描述
    model: str = ""  # 使用的大模型

    # MCP服务配置 (子类可选重写)
    mcp_services: Set[str] = set()  # 此Agent使用的MCP服务列表（统一配置，不再区分必需和可选）

    # 系统提示词 (子类可选重写)
    system_prompt: str = "你是一个AI助手。"

    # 是否启用函数调用
    enable_tool_calling: bool = True

    def __init__(
        self,
        openai_client: AsyncOpenAI,
        mcp_tool_registry: MCPToolRegistry = None
    ) -> None:
        """
        初始化Agent

        Args:
            openai_client: OpenAI异步客户端
            mcp_tool_registry: MCP工具注册表，默认使用全局实例
        """
        self.chat = openai_client
        self.mcp_tool_registry = mcp_tool_registry or get_mcp_tool_registry()

    async def _ensure_mcp_initialized(self) -> None:
        """确保MCP工具注册表已初始化"""
        try:
            if not self.mcp_tool_registry._initialized:
                await self.mcp_tool_registry.initialize()
                logger.info(f"[{self.name}] MCP tool registry initialized")
        except Exception as e:
            logger.warning(f"[{self.name}] Failed to initialize MCP tool registry: {e}")

    def to_openai_message(self, messages: List[MessageDTO]) -> List[dict]:
        """
        将MessageDTO列表转换为OpenAI格式

        新数据模型说明:
        - Message 只存储 role 和 content，以及关联的 tool_calls
        - ToolCall 存储工具调用的详细信息（arguments, result 等）
        - 需要从 ToolCall 结果重构 tool result 消息

        支持以下消息类型：
        - user/system: 普通消息
        - assistant: 助手消息，可能包含 tool_calls 和工具结果
        """
        openai_messages: List[dict] = []

        for msg in messages:
            if msg.role == "user":
                # 用户消息
                openai_messages.append(ChatCompletionUserMessageParam(
                    role="user",
                    content=msg.content or ""
                ))

            elif msg.role == "assistant":
                # 助手消息
                # 构建工具调用列表（从关联的 ToolCall 中提取）
                tool_calls_openai = []

                if msg.tool_calls:
                    for tc in msg.tool_calls:
                        # 只有已完成的工具调用才包含在历史中
                        if tc.status in ["completed", "failed"]:
                            tool_call_dict = {
                                'id': tc.tool_call_id,
                                'type': 'function',
                                'function': {
                                    'name': tc.tool_name,
                                    'arguments': json.dumps(tc.arguments, ensure_ascii=False)
                                }
                            }
                            tool_calls_openai.append(tool_call_dict)

                # 创建 assistant 消息
                # 注意：content 中可能包含占位符如 [TOOL_CALL:call_abc123]
                # 但在发送给 OpenAI 时，我们应该移除这些占位符
                content = msg.content or ""
                # 移除工具调用占位符
                import re
                content = re.sub(r'\n?\[TOOL_CALL:call_[a-f0-9]+\]\n?', '', content)

                openai_messages.append(ChatCompletionAssistantMessageParam(
                    role="assistant",
                    content=content or None,
                    tool_calls=tool_calls_openai if tool_calls_openai else None
                ))

                # 为每个工具调用添加 tool result 消息
                if msg.tool_calls:
                    for tc in msg.tool_calls:
                        # 只有有结果的工具调用才添加 tool result 消息
                        if tc.result and tc.status in ["completed", "failed"]:
                            # 格式化结果
                            if isinstance(tc.result, dict):
                                result_content = tc.result.get("content", str(tc.result))
                            else:
                                result_content = str(tc.result)

                            tool_message = ChatCompletionToolMessageParam(
                                role="tool",
                                tool_call_id=tc.tool_call_id,
                                content=result_content
                            )
                            openai_messages.append(tool_message)

            elif msg.role == "system":
                # 系统消息
                openai_messages.append(ChatCompletionSystemMessageParam(
                    role="system",
                    content=msg.content or ""
                ))

        return openai_messages

    async def get_system_prompt(
        self,
        enabled_mcp_services: Set[str] = None
    ) -> str:
        """
        获取系统提示词，包含MCP服务信息

        Args:
            enabled_mcp_services: 额外启用的MCP服务

        Returns:
            完整的系统提示词
        """
        # 确保MCP已初始化
        await self._ensure_mcp_initialized()

        prompt = self.system_prompt

        # 计算可用的MCP服务
        available_services = self.mcp_services.copy()
        if enabled_mcp_services:
            available_services = available_services.union(enabled_mcp_services)

        # 添加MCP工具信息到系统提示词
        if available_services:
            mcp_prompt = self.mcp_tool_registry.generate_system_prompt(available_services)
            if mcp_prompt:
                prompt += mcp_prompt

        return prompt

    async def get_mcp_tools(
        self,
        enabled_mcp_services: Set[str] = None
    ) -> List[ChatCompletionToolParam]:
        """
        获取MCP工具列表（OpenAI函数调用格式）

        Args:
            enabled_mcp_services: 额外启用的MCP服务

        Returns:
            OpenAI函数调用格式的工具列表
        """
        # 确保MCP已初始化
        await self._ensure_mcp_initialized()

        if not self.enable_tool_calling:
            return []

        # 计算可用的MCP服务
        available_services = self.mcp_services.copy()
        if enabled_mcp_services:
            available_services = available_services.union(enabled_mcp_services)

        # 获取工具列表
        tools = self.mcp_tool_registry.to_openai_tools(available_services)

        logger.debug(
            f"[{self.name}] Retrieved {len(tools)} MCP tools for services: {available_services}"
        )

        return tools

    async def execute_tool_call(
        self,
        tool_id: str,
        arguments: dict[str, Any]
    ) -> Any:
        """
        执行MCP工具调用

        Args:
            tool_id: 工具ID (格式: server_name:tool_name)
            arguments: 工具参数

        Returns:
            工具执行结果
        """
        logger.info(f"[{self.name}] Executing tool call: {tool_id}")

        try:
            result = await self.mcp_tool_registry.execute_tool_call(tool_id, arguments)
            return result
        except Exception as e:
            logger.error(f"[{self.name}] Tool call failed: {tool_id}, error: {e}")
            raise

    def _format_tool_result(self, result: Any) -> str:
        """
        格式化工具执行结果为字符串

        Args:
            result: 工具执行结果

        Returns:
            格式化后的字符串
        """
        from mcp.types import TextContent, ImageContent, EmbeddedResource

        if result is None:
            return "Tool executed successfully (no output)"

        if isinstance(result, list):
            # 处理Content列表
            formatted_parts = []
            for item in result:
                if isinstance(item, TextContent):
                    formatted_parts.append(item.text)
                elif isinstance(item, ImageContent):
                    formatted_parts.append(f"[Image: {item.data}]")
                elif isinstance(item, EmbeddedResource):
                    formatted_parts.append(f"[Resource: {item.uri}]")
                else:
                    formatted_parts.append(str(item))
            return "\n".join(formatted_parts)
        else:
            return str(result)

    async def generate_response(
        self,
        messages: List[MessageDTO],
        enabled_mcp_services: Set[str] = None
    ):
        """
        生成响应

        Args:
            messages: 历史消息列表
            enabled_mcp_services: 用户额外启用的MCP服务

        Raises:
            NotImplementedError: 子类必须实现此方法
        """
        raise NotImplementedError("Subclasses must implement this method.")
