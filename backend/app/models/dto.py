from typing import List, Optional
from datetime import datetime
from sqlmodel import SQLModel

from app.models.database import Conversation, Message, User, ToolCall


class ToolCallDTO(SQLModel):
    """工具调用数据传输对象"""
    id: str
    created_at: datetime
    conversation_id: str
    message_id: str | None

    # 工具标识
    tool_call_id: str
    tool_name: str
    mcp_server: str | None

    # 参数和结果
    arguments: dict = {}
    result: dict | None = None

    # 执行元数据
    status: str = "pending"
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: int | None = None

    # 错误信息
    error: bool = False
    error_message: str | None = None
    error_type: str | None = None

    # 重试信息
    retry_count: int = 0
    max_retries: int = 3

    @classmethod
    def from_orm(cls, tc: ToolCall) -> "ToolCallDTO":
        return cls(
            id=tc.id,
            created_at=tc.created_at,
            conversation_id=tc.conversation_id,
            message_id=tc.message_id,
            tool_call_id=tc.tool_call_id,
            tool_name=tc.tool_name,
            mcp_server=tc.mcp_server,
            arguments=tc.arguments or {},
            result=tc.result,
            status=tc.status or "pending",
            started_at=tc.started_at,
            completed_at=tc.completed_at,
            duration_ms=tc.duration_ms,
            error=tc.error if tc.error is not None else False,
            error_message=tc.error_message,
            error_type=tc.error_type,
            retry_count=tc.retry_count if tc.retry_count is not None else 0,
            max_retries=tc.max_retries if tc.max_retries is not None else 3,
        )


class MessageDTO(SQLModel):
    """消息数据传输对象（简化版）"""
    id: str
    created_at: datetime
    role: str
    content: str | None
    conversation_id: str

    # 关联的工具调用（可选）
    tool_calls: List[ToolCallDTO] = []

    @classmethod
    def from_orm(cls, m: Message) -> "MessageDTO":
        return cls(
            id=m.id,
            created_at=m.created_at,
            role=m.role,
            content=m.content,
            conversation_id=m.conversation_id,
            tool_calls=[ToolCallDTO.from_orm(tc) for tc in m.tool_calls] if m.tool_calls else [],
        )


class ConversationDTO(SQLModel):
    """对话数据传输对象"""
    id: str
    created_at: datetime
    updated_at: datetime
    title: str
    model: str
    messages: List[MessageDTO] = []
    tool_calls: List[ToolCallDTO] = []

    @classmethod
    def from_orm(cls, c: Conversation) -> "ConversationDTO":
        return cls(
            id=c.id,
            created_at=c.created_at,
            updated_at=c.updated_at,
            title=c.title,
            model=c.model,
            messages=[MessageDTO.from_orm(m) for m in c.messages],
            tool_calls=[ToolCallDTO.from_orm(tc) for tc in c.tool_calls] if c.tool_calls else [],
        )


class UserDTO(SQLModel):
    id: str
    email: str
    is_active: bool
    created_at: datetime
    last_login: datetime | None

    @classmethod
    def from_orm(cls, u: User) -> "UserDTO":
        return cls(
            id=u.id,
            email=u.email,
            is_active=u.is_active,
            created_at=u.created_at,
            last_login=u.last_login,
        )
