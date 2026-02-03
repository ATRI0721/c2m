import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.deps import CurrentUser, SessionDep, GetConversation, get_system_config
from app.core.config import settings
from app.models.database import Conversation
from app.curd import get_conversation_by_id
from app.models.interfaces import ChatStreamRequest
from app.services.chat_service import chat_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"], prefix="/chat")


@router.post("/stream")
async def chat_stream(
    request: ChatStreamRequest,
    session: SessionDep,
    current_user: CurrentUser
):
    """流式聊天端点"""
    # 验证对话属于当前用户 (if conversation_id is provided)
    conv = None
    if request.conversation_id:
        conv = get_conversation_by_id(request.conversation_id, session)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    # 权限检查：验证用户是否有权使用指定的 agent
    config = get_system_config()
    is_admin = current_user and current_user.email in settings.ADMIN_EMAILS
    public_agents = config.get("public_agents", [])
    admin_agents = settings.ADMIN_AGENTS

    # 检查 agent 访问权限
    if request.agent in admin_agents and not is_admin:
        raise HTTPException(
            status_code=403,
            detail=f"Agent '{request.agent}' is restricted to administrators only"
        )

    # 普通用户只能使用公开的 agent
    if not is_admin and request.agent not in public_agents:
        raise HTTPException(
            status_code=403,
            detail=f"Agent '{request.agent}' is not available. Available agents: {', '.join(public_agents)}"
        )

    async def generate():
        try:
            async for chunk in chat_service.stream_chat(
                user_id=str(current_user.id),
                conversation_id=conv.id if conv else None,
                message=request.message,
                agent_name=request.agent,
                mcp_services=request.mcp_services,
                session=session
            ):
                yield chunk
        except Exception as e:
            import json
            error_data = json.dumps({"type": "error", "message": str(e)}, ensure_ascii=False)
            yield f"data: {error_data}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
