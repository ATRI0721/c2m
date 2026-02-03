from datetime import datetime
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import JSON

from app.utils import generate_uuid, get_time


class ToolCall(SQLModel, table=True):
    """
    工具调用记录表

    存储所有 MCP 工具调用的详细信息，包括参数、结果、状态等
    """
    __tablename__ = "tool_calls"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    created_at: datetime = Field(default_factory=get_time)

    # 关联信息
    conversation_id: str = Field(foreign_key="conversation.id", index=True)
    message_id: str | None = Field(default=None, foreign_key="message.id", index=True)

    # 工具标识
    tool_call_id: str = Field(index=True, description="OpenAI 工具调用 ID")  # e.g. "call_abc123"
    tool_name: str = Field(index=True, description="工具名称")  # e.g. "environment:get_weather"
    mcp_server: str | None = Field(default=None, index=True, description="MCP 服务器名称")

    # 参数和结果（使用 JSON 类型，支持结构化查询）
    arguments: dict = Field(default={}, sa_column=Column(JSON), description="工具参数")
    result: dict | None = Field(default=None, sa_column=Column(JSON), description="工具执行结果")

    # 执行元数据
    status: str = Field(
        default="pending",
        index=True,
        description="执行状态: pending/running/completed/failed/timeout"
    )
    started_at: datetime | None = Field(default=None, description="开始执行时间")
    completed_at: datetime | None = Field(default=None, description="完成时间")
    duration_ms: int | None = Field(default=None, description="执行时长（毫秒）")

    # 错误信息
    error: bool = Field(default=False, index=True, description="是否执行出错")
    error_message: str | None = Field(default=None, description="错误信息")
    error_type: str | None = Field(default=None, description="错误类型")

    # 重试信息
    retry_count: int = Field(default=0, description="已重试次数")
    max_retries: int = Field(default=3, description="最大重试次数")

    # 关系
    conversation: "Conversation" = Relationship(back_populates="tool_calls")
    message: "Message" = Relationship(back_populates="tool_calls")


class User(SQLModel, table=True):
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    email: str = Field(max_length=100, index=True, unique=True)
    hashed_password: str

    created_at: datetime = Field(default_factory=get_time)
    is_active: bool = Field(default=True)
    last_login: Optional[datetime] = None

    conversations: List["Conversation"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class Conversation(SQLModel, table=True):
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    created_at: datetime = Field(default_factory=get_time)
    updated_at: datetime = Field(default_factory=get_time)

    title: str = Field(max_length=100, default="新对话")
    model: str = Field(default="gpt-4o-mini", description="使用的大模型")

    user_id: str = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="conversations")

    messages: List["Message"] = Relationship(
        back_populates="conversation",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )

    tool_calls: List["ToolCall"] = Relationship(
        back_populates="conversation",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Message(SQLModel, table=True):
    """
    消息表（简化版）

    只存储消息的基本内容，工具调用信息通过 ToolCall 表关联
    """
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    created_at: datetime = Field(default_factory=get_time)

    role: str = Field(default="user", index=True)  # user / assistant / system
    content: str | None = Field(default=None)  # 消息内容

    conversation_id: str = Field(foreign_key="conversation.id", index=True)
    conversation: Conversation = Relationship(back_populates="messages")

    # 关联的工具调用（当 assistant 消息包含工具调用时）
    tool_calls: List["ToolCall"] = Relationship(
        back_populates="message",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
