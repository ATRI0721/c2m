from typing import List
import logging
from fastapi import APIRouter, HTTPException, Depends

from app.core.deps import CurrentUser, SessionDep
from app.models.database import Conversation
from app.curd import (
    add_conversation,
    get_conversations,
    get_conversation_by_id,
    update_conversation,
    delete_conversation,
    add_message,
    get_conversation_messages
)
from app.models.interfaces import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    MessageResponse,
    PaginationParams,
    PaginatedResponse,
)
from app.models.dto import ConversationDTO, MessageDTO
from app.utils.pagination import paginate_query, calculate_total_pages

logger = logging.getLogger(__name__)

router = APIRouter(tags=["conversation"], prefix="/conversation")


@router.post("", response_model=ConversationResponse)
def create_conversation(
    conversation: ConversationCreate,
    session: SessionDep,
    current_user: CurrentUser
):
    """创建新对话"""
    conv = add_conversation(current_user, conversation.title, conversation.model, session)
    return ConversationDTO.from_orm(conv)


@router.get("")
def list_conversations(
    pagination: PaginationParams = Depends(),
    session: SessionDep = None,
    current_user: CurrentUser = None
):
    """获取当前用户的对话列表"""
    query = get_conversations(current_user, session)
    conversations, total = paginate_query(
        session,
        query,
        pagination.page,
        pagination.page_size
    )

    # 转换为DTO并分页
    items = [ConversationDTO.from_orm(conv) for conv in conversations]
    total_pages = calculate_total_pages(total, pagination.page_size)

    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=total_pages
    )


@router.get("/{conv_id}", response_model=ConversationResponse)
def get_conversation(conv_id: str, session: SessionDep, current_user: CurrentUser):
    """获取单个对话详情"""
    conv = get_conversation_by_id(conv_id, session)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return ConversationDTO.from_orm(conv)


@router.patch("/{conv_id}", response_model=ConversationResponse)
def update_conversation_handler(
    conv_id: str,
    conversation_update: ConversationUpdate,
    session: SessionDep,
    current_user: CurrentUser
):
    """更新对话标题"""
    conv = get_conversation_by_id(conv_id, session)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    updated_conv = update_conversation(conv, conversation_update.title, session)
    return ConversationDTO.from_orm(updated_conv)


@router.delete("/{conv_id}")
def delete_conversation_handler(conv_id: str, session: SessionDep, current_user: CurrentUser):
    """删除对话"""
    conv = get_conversation_by_id(conv_id, session)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    delete_conversation(conv, session)
    return {"message": "Conversation deleted successfully"}


@router.get("/{conv_id}/messages")
def list_messages(conv_id: str, session: SessionDep, current_user: CurrentUser):
    """获取对话的所有消息"""
    conv = get_conversation_by_id(conv_id, session)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    messages = get_conversation_messages(conv_id, session)
    return [MessageDTO.from_orm(msg) for msg in messages]


@router.post("/{conv_id}/messages", response_model=MessageResponse)
def create_message_handler(
    conv_id: str,
    message: dict,
    session: SessionDep,
    current_user: CurrentUser
):
    """添加消息到对话"""
    conv = get_conversation_by_id(conv_id, session)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    msg = add_message(
        conv,
        message.get("role", "user"),
        message.get("content", ""),
        session
    )
    return MessageDTO.from_orm(msg)
