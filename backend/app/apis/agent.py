import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

from app.core.deps import CurrentUser, SessionDep, GetConversation, get_system_config
from app.core.config import settings
from app.models.database import Conversation
from app.curd import get_conversation_by_id
from app.models.interfaces import AgentsListResponse, AssistantChatRequest
from app.services.chat_service import chat_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["agent"], prefix="/agent")


class AgentDetail(BaseModel):
    """单个Agent详情响应"""
    name: str
    description: str
    model: str
    system_prompt: str = ""
    mcp_services: list[str] = []


@router.get("", response_model=AgentsListResponse)
async def list_agents(
    current_user: CurrentUser = None
):
    """
    获取可用的Agent列表
    根据用户类型返回不同的Agent列表
    """
    config = get_system_config()

    # 获取所有agent
    all_agents = config.get("agents", {})

    # 判断是否为admin用户
    is_admin = current_user and current_user.email in settings.ADMIN_EMAILS

    # 根据用户类型过滤agent
    if is_admin:
        # Admin用户可以看到所有agent
        filtered_agents = all_agents
    else:
        # 普通用户只能看到公开的agent
        public_agents = config.get("public_agents", [])
        filtered_agents = {
            name: agent for name, agent in all_agents.items()
            if name in public_agents
        }

    return AgentsListResponse(agents=filtered_agents)


@router.get("/{name}", response_model=AgentDetail)
async def get_agent_detail(
    name: str,
    current_user: CurrentUser
):
    """
    获取单个Agent的详情
    """
    config = get_system_config()

    # 获取所有agent配置
    all_agents = config.get("agents", {})

    # 判断是否为admin用户
    is_admin = current_user and current_user.email in settings.ADMIN_EMAILS

    # 获取公开的agent列表
    public_agents = config.get("public_agents", [])

    # 权限检查
    if not is_admin and name not in public_agents:
        raise HTTPException(
            status_code=403,
            detail=f"Agent '{name}' is not available"
        )

    if name not in all_agents:
        raise HTTPException(
            status_code=404,
            detail=f"Agent '{name}' not found"
        )

    agent_config = all_agents[name]

    # 从 app.agents 模块获取实际配置
    try:
        from app.agents import get_agent
        agent = get_agent(name)
        system_prompt = agent.system_prompt if hasattr(agent, 'system_prompt') else ""
        model = agent.model if hasattr(agent, 'model') else ""
    except Exception as e:
        logger.warning(f"Failed to get agent details for '{name}': {e}")
        system_prompt = ""
        model = agent_config.get("model", "")

    return AgentDetail(
        name=name,
        description=agent_config.get("description", ""),
        model=model,
        system_prompt=system_prompt,
        mcp_services=agent_config.get("mcp_services", [])
    )


@router.post("/assistant/chat")
async def assistant_chat(
    request: AssistantChatRequest,
    session: SessionDep,
    current_user: CurrentUser
):
    """
    AI助手端点，提供配置和管理的智能建议

    此端点专门用于管理员获取配置帮助，assistant agent 拥有完整的系统访问权限。
    """
    # 权限检查：只有管理员可以使用
    is_admin = current_user and current_user.email in settings.ADMIN_EMAILS

    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="AI助手仅限管理员使用"
        )

    # 验证 conversation_id（如果提供）
    if request.conversation_id:
        conv = get_conversation_by_id(request.conversation_id, session)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    async def generate():
        try:
            async for chunk in chat_service.stream_chat(
                user_id=str(current_user.id),
                conversation_id=request.conversation_id,
                message=request.message,
                agent_name="assistant",
                mcp_services=[],
                session=session
            ):
                yield chunk
        except Exception as e:
            logger.error(f"Assistant chat error: {e}")
            error_data = json.dumps({"type": "error", "message": str(e)}, ensure_ascii=False)
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Nginx / some proxies: disable response buffering for SSE
            "X-Accel-Buffering": "no",
        },
    )
