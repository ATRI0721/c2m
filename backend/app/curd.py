from typing import Optional, List
from fastapi import HTTPException
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.security import get_password_hash
from app.models.database import (
    Conversation, User, Message, ToolCall
)
from app.models.interfaces import UserCreate, UserUpdate
from app.utils import generate_uuid, get_time


# ===========================================================
#  User 相关
# ===========================================================

def add_user(user: UserCreate, session: Session) -> Optional[User]:
    if session.exec(select(User).where(User.email == user.email)).one_or_none():
        return None

    user_db = User(
        email=user.email,
        hashed_password=get_password_hash(user.password)
    )
    session.add(user_db)
    session.flush()  # 获取 ID

    return user_db


def get_user_by_email(email: str, session: Session) -> Optional[User]:
    return session.exec(select(User).where(User.email == email)).one_or_none()


def get_user_by_id(id: str, session: Session) -> Optional[User]:
    return session.exec(select(User).where(User.id == id)).one_or_none()


def update_user(user: User, user_updated: UserUpdate, session: Session) -> User:
    if user_updated.password:
        user.hashed_password = get_password_hash(user_updated.password)
    session.add(user)
    session.flush()
    return user


def delete_user(user: User, session: Session) -> None:
    session.delete(user)


# ===========================================================
#  Conversation 相关
# ===========================================================

def add_conversation(user: User, title: str, model: str, session: Session) -> Conversation:
    conversation = Conversation(
        title=title,
        model=model,
        user_id=user.id
    )
    user.conversations.append(conversation)
    session.add(user)
    session.add(conversation)
    session.flush()
    return conversation


def get_conversations(user: User, session: Session):
    """返回用户的对话查询对象，用于分页"""
    return select(Conversation).where(
        Conversation.user_id == user.id
    ).order_by(Conversation.updated_at.desc())


def get_conversation_by_id(conversation_id: str, session: Session) -> Optional[Conversation]:
    return session.get(Conversation, conversation_id)


def update_conversation(conversation: Conversation, title: Optional[str] = None, session: Optional[Session] = None) -> Conversation:
    if title is not None:
        conversation.title = title
    conversation.updated_at = get_time()
    if session:
        session.add(conversation)
        session.flush()
    return conversation


def delete_conversation(conversation: Conversation, session: Session) -> None:
    session.delete(conversation)


# ===========================================================
#  Message 相关
# ===========================================================

def add_message(
    conversation: Conversation,
    role: str,
    content: str | None,
    session: Session
) -> Message:
    """
    添加消息到对话

    Args:
        conversation: 对话对象
        role: 消息角色 (user/assistant/system/tool)
        content: 消息内容
        session: 数据库会话

    Note:
        工具调用信息现在通过单独的 ToolCall 表存储，使用 create_tool_call() 和 link_tool_calls_to_message() 函数
    """
    message = Message(
        role=role,
        content=content,
        conversation_id=conversation.id
    )
    conversation.messages.append(message)
    conversation.updated_at = get_time()
    session.add(conversation)
    session.add(message)
    session.flush()
    return message


def get_conversation_messages(conversation_id: str, session: Session) -> List[Message]:
    return list(session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    ).all())


# ===========================================================
#  ToolCall 相关
# ===========================================================

def create_tool_call(
    conversation: Conversation,
    tool_call_id: str,
    tool_name: str,
    arguments: dict,
    mcp_server: str | None = None,
    message_id: str | None = None,
    session: Session | None = None,
) -> ToolCall:
    """
    创建工具调用记录

    Args:
        conversation: 对话对象
        tool_call_id: 工具调用 ID (e.g. "call_abc123")
        tool_name: 工具名称 (e.g. "environment:get_weather")
        arguments: 工具参数字典
        mcp_server: MCP 服务器名称
        message_id: 关联的消息 ID
        session: 数据库会话

    Returns:
        ToolCall: 创建的工具调用记录
    """
    tool_call = ToolCall(
        conversation_id=conversation.id,
        message_id=message_id,
        tool_call_id=tool_call_id,
        tool_name=tool_name,
        mcp_server=mcp_server,
        arguments=arguments,
        status="pending"
    )

    if session:
        session.add(tool_call)
        session.flush()

    return tool_call


def update_tool_call_status(
    tool_call: ToolCall,
    status: str,
    result: dict | None = None,
    error: bool = False,
    error_message: str | None = None,
    error_type: str | None = None,
    session: Session | None = None,
) -> ToolCall:
    """
    更新工具调用状态

    Args:
        tool_call: 工具调用对象
        status: 新状态 (running/completed/failed/timeout)
        result: 执行结果字典
        error: 是否出错
        error_message: 错误信息
        error_type: 错误类型
        session: 数据库会话

    Returns:
        ToolCall: 更新后的工具调用记录
    """
    import time

    tool_call.status = status

    if status == "running":
        tool_call.started_at = get_time()
    elif status in ["completed", "failed", "timeout"]:
        tool_call.completed_at = get_time()
        if tool_call.started_at:
            duration = (tool_call.completed_at - tool_call.started_at).total_seconds()
            tool_call.duration_ms = int(duration * 1000)

    if result is not None:
        tool_call.result = result

    if error:
        tool_call.error = error
        tool_call.error_message = error_message
        tool_call.error_type = error_type

    if session:
        session.add(tool_call)
        session.flush()

    return tool_call


def get_tool_calls_by_conversation(
    conversation_id: str,
    session: Session,
    status: str | None = None,
    limit: int | None = None,
) -> List[ToolCall]:
    """
    获取对话的工具调用记录

    Args:
        conversation_id: 对话 ID
        session: 数据库会话
        status: 过滤状态（可选）
        limit: 限制返回数量（可选）

    Returns:
        List[ToolCall]: 工具调用列表
    """
    query = select(ToolCall).where(ToolCall.conversation_id == conversation_id)

    if status:
        query = query.where(ToolCall.status == status)

    query = query.order_by(ToolCall.created_at.desc())

    if limit:
        query = query.limit(limit)

    return list(session.exec(query).all())


def get_tool_call_by_id(tool_call_id: str, session: Session) -> ToolCall | None:
    """
    根据 ID 获取工具调用记录

    Args:
        tool_call_id: 工具调用 ID
        session: 数据库会话

    Returns:
        ToolCall | None: 工具调用记录或 None
    """
    return session.exec(
        select(ToolCall).where(ToolCall.id == tool_call_id)
    ).one_or_none()


def get_tool_call_stats(
    conversation_id: str | None = None,
    tool_name: str | None = None,
    session: Session | None = None,
) -> dict:
    """
    获取工具调用统计信息

    Args:
        conversation_id: 对话 ID（可选，不提供则统计所有）
        tool_name: 工具名称（可选）
        session: 数据库会话

    Returns:
        dict: 统计信息字典
    """
    if not session:
        return {}

    query = select(ToolCall)

    if conversation_id:
        query = query.where(ToolCall.conversation_id == conversation_id)

    if tool_name:
        query = query.where(ToolCall.tool_name == tool_name)

    tool_calls = list(session.exec(query).all())

    total = len(tool_calls)
    completed = sum(1 for tc in tool_calls if tc.status == "completed")
    failed = sum(1 for tc in tool_calls if tc.error)
    pending = sum(1 for tc in tool_calls if tc.status == "pending")
    running = sum(1 for tc in tool_calls if tc.status == "running")

    # 计算平均执行时长
    completed_calls = [tc for tc in tool_calls if tc.duration_ms is not None]
    avg_duration = sum(tc.duration_ms for tc in completed_calls) / len(completed_calls) if completed_calls else 0

    return {
        "total": total,
        "completed": completed,
        "failed": failed,
        "pending": pending,
        "running": running,
        "avg_duration_ms": avg_duration,
        "success_rate": f"{(completed / total * 100):.1f}%" if total > 0 else "0%"
    }


def get_recent_tool_calls(
    session: Session,
    limit: int = 50,
    tool_name: str | None = None,
    mcp_server: str | None = None,
) -> List[ToolCall]:
    """
    获取最近的工具调用记录

    Args:
        session: 数据库会话
        limit: 返回数量限制
        tool_name: 过滤工具名称（可选）
        mcp_server: 过滤 MCP 服务器（可选）

    Returns:
        List[ToolCall]: 最近的工具调用列表
    """
    query = select(ToolCall)

    if tool_name:
        query = query.where(ToolCall.tool_name == tool_name)

    if mcp_server:
        query = query.where(ToolCall.mcp_server == mcp_server)

    query = query.order_by(ToolCall.created_at.desc()).limit(limit)

    return list(session.exec(query).all())


def link_tool_calls_to_message(
    tool_call_ids: List[str],
    message_id: str,
    session: Session,
) -> None:
    """
    将多个 ToolCall 关联到一个 Message

    Args:
        tool_call_ids: 工具调用 ID 列表
        message_id: 消息 ID
        session: 数据库会话
    """
    if not tool_call_ids:
        return

    for tool_call_id in tool_call_ids:
        tool_call = session.exec(
            select(ToolCall).where(ToolCall.tool_call_id == tool_call_id)
        ).one_or_none()

        if tool_call:
            tool_call.message_id = message_id
            session.add(tool_call)

    session.flush()
