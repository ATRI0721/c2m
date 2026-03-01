"""
动态Agent实现
根据配置文件动态创建的Agent，支持完整的工具调用循环
"""
import json
import logging
from typing import List, Set, AsyncGenerator, Dict, Union

from openai import AsyncOpenAI
from fastapi import HTTPException

from app.agents.baseagent import BaseAgent
from app.agents.agent_config import AgentConfig
from app.services.mcp_tool_registry import MCPToolRegistry, get_mcp_tool_registry
from app.models.dto import MessageDTO

logger = logging.getLogger(__name__)


class DynamicAgent(BaseAgent):
    """
    动态Agent类
    根据配置动态创建，无需为每个Agent创建单独的类
    """

    def __init__(
        self,
        config: AgentConfig,
        openai_client: AsyncOpenAI,
        mcp_tool_registry: MCPToolRegistry = None
    ):
        """
        初始化动态Agent

        Args:
            config: Agent配置对象
            openai_client: OpenAI异步客户端
            mcp_tool_registry: MCP工具注册表
        """
        # 设置配置属性
        self.name = config.name
        self.description = config.description
        self.model = config.model
        self.system_prompt = config.system_prompt
        self.mcp_services = set(config.mcp_services)
        self.enable_tool_calling = config.enable_tool_calling

        # 调用父类初始化
        super().__init__(openai_client, mcp_tool_registry)

        logger.info(
            f"DynamicAgent '{self.name}' initialized with "
            f"{len(self.mcp_services)} MCP services: {self.mcp_services}"
        )

    async def generate_response(
        self,
        messages: List[MessageDTO],
        enabled_mcp_services: Set[str] = None
    ) -> AsyncGenerator[Union[str, Dict], None]:
        """
        生成流式响应，支持工具调用循环

        Args:
            messages: 历史消息列表
            enabled_mcp_services: 用户额外启用的MCP服务

        Yields:
            str: 文本内容
            dict: 工具调用相关事件，包含 type 字段:
                - {"type": "tool_call", "tool_id": str, "arguments": dict}
                - {"type": "tool_result", "tool_id": str, "result": str, "error": bool}
                - {"type": "error", "message": str}
        """
        if enabled_mcp_services is None:
            enabled_mcp_services = set()

        # 构建OpenAI消息列表
        openai_messages = self.to_openai_message(messages)

        # 添加系统提示词
        system_prompt = await self.get_system_prompt(enabled_mcp_services)
        openai_messages.insert(0, {"role": "system", "content": system_prompt})

        # 获取可用的MCP工具
        mcp_tools = await self.get_mcp_tools(enabled_mcp_services)
        logger.info(f"[{self.name}] MCP tools count: {len(mcp_tools)}")
        if mcp_tools:
            logger.info(f"[{self.name}] Tool names: {[t['function']['name'] for t in mcp_tools]}")

        # 工具调用循环 - 最多20轮防止无限循环
        max_iterations = 20
        iteration = 0

        while iteration < max_iterations:
            try:
                # 调用 OpenAI API（流式），并通过 tool_calls 循环完成工具调用
                api_kwargs = {
                    "model": self.model,
                    "messages": openai_messages,
                    "stream": True
                }
                if mcp_tools:
                    api_kwargs["tools"] = mcp_tools
                    # 默认交给模型判断是否需要调用工具
                    api_kwargs["tool_choice"] = "auto"

                logger.info(
                    f"[{self.name}] Calling API iteration={iteration}, "
                    f"tool_choice={api_kwargs.get('tool_choice', 'none')}, model={self.model}"
                )

                stream = await self.chat.chat.completions.create(**api_kwargs)

                # 收集响应内容和工具调用（tool_calls 在 streaming 模式下会分片到多个 chunk）
                content_parts: list[str] = []
                tool_calls_buffer: dict[int, dict] = {}
                finish_reason = None

                async for chunk in stream:
                    if not getattr(chunk, "choices", None):
                        continue
                    choice = chunk.choices[0]
                    if choice.finish_reason:
                        finish_reason = choice.finish_reason

                    delta = getattr(choice, "delta", None)
                    if not delta:
                        continue

                    # 文本增量
                    if getattr(delta, "content", None):
                        content_parts.append(delta.content)
                        yield delta.content

                    # 工具调用增量
                    if getattr(delta, "tool_calls", None):
                        for tc in delta.tool_calls:
                            idx = tc.index
                            entry = tool_calls_buffer.setdefault(
                                idx,
                                {
                                    "id": tc.id,
                                    "type": tc.type or "function",
                                    "function": {"name": "", "arguments": ""},
                                },
                            )

                            # id/type 可能在后续 chunk 才出现
                            if tc.id:
                                entry["id"] = tc.id
                            if tc.type:
                                entry["type"] = tc.type

                            if tc.function:
                                if tc.function.name:
                                    entry["function"]["name"] = tc.function.name
                                if tc.function.arguments:
                                    entry["function"]["arguments"] += tc.function.arguments

                content = "".join(content_parts)
                tool_calls_list = [tool_calls_buffer[i] for i in sorted(tool_calls_buffer.keys())]

                logger.info(
                    f"[{self.name}] Stream finished: finish_reason={finish_reason}, "
                    f"content_chars={len(content)}, tool_calls={len(tool_calls_list)}"
                )

                # 如果有工具调用，处理它们
                if tool_calls_list:

                    # 添加助手消息（包含工具调用）到历史
                    openai_messages.append({
                        'role': 'assistant',
                        'content': content or None,
                        'tool_calls': tool_calls_list
                    })

                    # 执行所有工具调用
                    async for item in self._execute_all_tool_calls(tool_calls_list):
                        # item 可能是事件字典或 OpenAI 消息字典
                        if isinstance(item, dict) and 'type' in item:
                            # 这是事件，yield 给前端
                            yield item
                        else:
                            # 这是 OpenAI 消息，添加到历史
                            openai_messages.append(item)

                    # 继续下一轮循环，让LLM基于工具结果生成响应
                    iteration += 1
                    continue
                else:
                    if mcp_tools and iteration == 0:
                        logger.info(f"[{self.name}] No tool_calls emitted while tools are available")
                    break

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"[{self.name}] Error in generate_response iteration {iteration}: {e}")
                yield {"type": "error", "message": str(e)}
                raise HTTPException(
                    status_code=500,
                    detail=f"{self.name} agent generation failed: {str(e)}"
                )

        if iteration >= max_iterations:
            logger.warning(f"[{self.name}] Reached maximum tool call iterations ({max_iterations})")

    async def _execute_all_tool_calls(
        self,
        tool_calls: List[Dict]
    ) -> AsyncGenerator[Union[Dict, str], None]:
        """
        执行所有工具调用并返回结果

        Args:
            tool_calls: 工具调用列表

        Yields:
            dict: 工具调用事件或 OpenAI 消息
        """
        for tool_call in tool_calls:
            sanitized_tool_name = tool_call['function']['name']
            call_id = tool_call['id']
            tool_id = sanitized_tool_name
            if self.mcp_tool_registry and hasattr(self.mcp_tool_registry, "_sanitized_name_map"):
                tool_id = self.mcp_tool_registry._sanitized_name_map.get(sanitized_tool_name, sanitized_tool_name)

            try:
                # 解析参数
                raw_arguments = tool_call['function'].get('arguments', '')
                arguments = json.loads(raw_arguments) if raw_arguments and raw_arguments.strip() else {}

                logger.info(f"[{self.name}] Executing tool: {tool_id} with args: {arguments}")

                # 发送工具调用开始事件
                yield {
                    "type": "tool_call",
                    "tool_id": tool_id,
                    "arguments": arguments
                }

                # 执行工具调用
                result = await self.execute_tool_call(tool_id, arguments)

                # 格式化结果为字符串
                result_content = self._format_tool_result(result)

                # 发送工具执行结果事件
                yield {
                    "type": "tool_result",
                    "tool_id": tool_id,
                    "result": result_content,
                    "error": False
                }

                # 返回用于 OpenAI 历史的结果
                yield {
                    'role': 'tool',
                    'tool_call_id': call_id,
                    'content': result_content
                }

            except json.JSONDecodeError as e:
                logger.error(f"[{self.name}] Invalid JSON in tool arguments: {e}")
                error_msg = f"Error: Invalid JSON in arguments - {str(e)}"
                yield {
                    "type": "tool_result",
                    "tool_id": tool_id,
                    "result": error_msg,
                    "error": True
                }
                yield {
                    'role': 'tool',
                    'tool_call_id': call_id,
                    'content': error_msg
                }
            except Exception as e:
                logger.error(f"[{self.name}] Error executing tool {tool_id}: {e}")
                error_msg = f"Error: {str(e)}"
                yield {
                    "type": "tool_result",
                    "tool_id": tool_id,
                    "result": error_msg,
                    "error": True
                }
                yield {
                    'role': 'tool',
                    'tool_call_id': call_id,
                    'content': error_msg
                }
