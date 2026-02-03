from typing import List, AsyncGenerator, Set, Union
import json
from fastapi import HTTPException

from app.curd import (
    add_conversation,
    get_conversation_by_id,
    add_message,
    get_conversation_messages,
    create_tool_call,
    update_tool_call_status,
    link_tool_calls_to_message
)
from app.models.database import Conversation
from app.models.dto import MessageDTO
from app.agents import get_agent
from app.utils import generate_uuid


logger = None  # 将从 __main__ 导入


class ChatService:
    """聊天服务,负责处理Agent的调用和对话管理"""

    async def stream_chat(
        self,
        user_id: str,
        conversation_id: str | None,
        message: str,
        agent_name: str,
        mcp_services: List[str],
        session
    ) -> AsyncGenerator[str, None]:
        """
        流式聊天处理

        Args:
            user_id: 用户ID
            conversation_id: 对话ID,为None时创建新对话
            message: 用户消息
            agent_name: Agent名称
            mcp_services: 启用的MCP服务列表
            session: 数据库会话
        """
        import logging
        logger = logging.getLogger(__name__)

        # 1. 获取并验证Agent
        try:
            agent = get_agent(agent_name)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # 2. 获取或创建对话
        conversation: Conversation | None = None
        if conversation_id:
            conversation = get_conversation_by_id(conversation_id, session)
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
            if conversation.user_id != user_id:
                raise HTTPException(status_code=403, detail="Forbidden")
        else:
            # 创建新对话
            from app.models.database import User
            user = session.get(User, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            conversation = add_conversation(user, f"与{agent.name}的对话", agent.model, session)

        # 3. 保存用户消息
        add_message(conversation, "user", message, session)

        # 4. 获取历史消息
        history_messages = get_conversation_messages(conversation.id, session)

        # 5. 使用Agent生成响应
        full_response = ""
        pending_tool_call = None  # 存储待处理的 ToolCall 对象
        current_tool_call_ids = []  # 记录本次响应创建的所有 tool_call_id

        try:
            enabled_mcp_services = set(mcp_services)
            async for chunk in agent.generate_response(
                messages=[MessageDTO.from_orm(m) for m in history_messages],
                enabled_mcp_services=enabled_mcp_services
            ):
                # 处理不同类型的返回值
                if isinstance(chunk, str):
                    # 文本内容
                    full_response += chunk
                    yield self._format_sse("content", {"content": chunk})
                elif isinstance(chunk, dict):
                    # 结构化事件
                    event_type = chunk.get("type")

                    if event_type == "tool_call":
                        # 工具调用开始
                        tool_id = chunk["tool_id"]
                        arguments = chunk["arguments"]

                        # 生成工具调用ID
                        tool_call_id = f"call_{generate_uuid()[:8]}"

                        # 提取 MCP 服务器名称
                        mcp_server = tool_id.split(":")[0] if ":" in tool_id else None

                        # 创建工具调用记录（使用新的数据模型）
                        tool_call = create_tool_call(
                            conversation=conversation,
                            tool_call_id=tool_call_id,
                            tool_name=tool_id,
                            arguments=arguments,
                            mcp_server=mcp_server,
                            message_id=None,  # 暂不关联消息
                            session=session
                        )

                        # 更新状态为 running
                        update_tool_call_status(
                            tool_call=tool_call,
                            status="running",
                            session=session
                        )

                        # 记录 tool_call_id，用于后续关联到消息
                        current_tool_call_ids.append(tool_call_id)

                        # 记录待处理的工具调用对象
                        pending_tool_call = tool_call

                        # 🔥 关键改动：在响应文本中插入占位符
                        placeholder = f"\n[TOOL_CALL:{tool_call_id}]\n"
                        full_response += placeholder

                        # 发送给前端
                        yield self._format_sse("tool_call", {
                            "tool_id": tool_id,
                            "arguments": arguments,
                            "placeholder": placeholder  # 告诉前端占位符位置
                        })

                        logger.info(f"Created tool_call: tool_id={tool_id}, call_id={tool_call_id}, placeholder={placeholder}")

                    elif event_type == "tool_result":
                        # 工具执行结果
                        tool_id = chunk["tool_id"]
                        result = chunk["result"]
                        is_error = chunk.get("error", False)

                        # 使用新的数据模型更新工具调用状态
                        if pending_tool_call:
                            status = "failed" if is_error else "completed"

                            # 将结果转换为字典格式存储
                            result_dict = {"content": result} if isinstance(result, str) else result

                            update_tool_call_status(
                                tool_call=pending_tool_call,
                                status=status,
                                result=result_dict,
                                error=is_error,
                                error_message=str(result) if is_error else None,
                                error_type="ToolExecutionError" if is_error else None,
                                session=session
                            )

                            logger.info(
                                f"Updated tool_call: tool_id={tool_id}, "
                                f"status={status}, duration={pending_tool_call.duration_ms}ms"
                            )

                        # 清空待处理的工具调用
                        pending_tool_call = None

                        # 发送给前端
                        yield self._format_sse("tool_result", {
                            "tool_id": tool_id,
                            "result": result,
                            "error": is_error
                        })

                        logger.info(f"Saved tool_result: tool_id={tool_id}, error={is_error}")

                    elif event_type == "error":
                        # 错误事件
                        yield self._format_sse("error", {"message": chunk["message"]})

            # 6. 保存助手回复（包含占位符的完整文本）
            if full_response:
                assistant_message = add_message(conversation, "assistant", full_response, session)
                logger.info(f"Saved assistant response: {len(full_response)} chars (with placeholders)")

                # 7. 将本次响应的所有工具调用关联到助手消息
                if current_tool_call_ids:
                    link_tool_calls_to_message(
                        tool_call_ids=current_tool_call_ids,
                        message_id=assistant_message.id,
                        session=session
                    )
                    logger.info(f"Linked {len(current_tool_call_ids)} tool_calls to message {assistant_message.id}")

        except HTTPException:
            raise
        except Exception as e:
            # 返回错误信息
            logger.error(f"Chat generation error: {e}", exc_info=True)
            yield self._format_sse("error", {"message": str(e)})
            raise HTTPException(status_code=500, detail=f"Chat generation failed: {str(e)}")

    def _format_sse(self, event_type: str, data: dict) -> str:
        """格式化为 SSE 事件"""
        sse_data = json.dumps({"type": event_type, **data}, ensure_ascii=False)
        return f"data: {sse_data}\n\n"


# 全局聊天服务实例
chat_service = ChatService()
