from typing import Annotated
from sqlmodel import Session

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError
import json
import logging
from pathlib import Path
from app.core import security
from app.core.config import settings
from app.core.db import get_session
from app.models.database import Conversation, User


reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/user/login/password")

SessionDep = Annotated[Session, Depends(get_session)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = payload['sub']
    except:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

def get_conversation(session: SessionDep, current_user: CurrentUser, conversation_id: str) -> Conversation:
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conversation.user != current_user:
        raise HTTPException(status_code=403, detail="Forbidden")
    return conversation

GetConversation = Annotated[Conversation, Depends(get_conversation)]


def get_system_config() -> dict:
    """
    获取系统配置

    从配置文件和环境变量中加载系统配置，包括：
    - agents: AI助手配置
    - mcpServers: MCP服务器配置
    - public_agents: 公开的agent列表
    - public_mcp_servers: 公开的MCP服务器列表
    - admin_mcp_servers: 管理员可访问的MCP服务器列表

    Returns:
        系统配置字典
    """
    
    logger = logging.getLogger(__name__)

    config = {
        "agents": {},
        "mcpServers": {},
        "public_agents": settings.PUBLIC_AGENTS,
        "public_mcp_servers": settings.PUBLIC_MCP_SERVERS,
        "admin_mcp_servers": ["config-admin"]
    }

    # 加载 agents 配置 - 从 app/agents/config/ 目录加载
    agents_config_dir = Path("app") / "agents" / "config"
    if agents_config_dir.exists():
        try:
            for config_file in agents_config_dir.glob("*.json"):
                with open(config_file, 'r', encoding='utf-8') as f:
                    agent_config = json.load(f)
                    agent_name = agent_config.get("name", config_file.stem)
                    config["agents"][agent_name] = agent_config
                    logger.info(f"Loaded agent config: {agent_name}")
        except Exception as e:
            logger.warning(f"Failed to load agents config from {agents_config_dir}: {e}")
    else:
        logger.warning(f"Agents config directory not found: {agents_config_dir}")

    # 加载 MCP servers 配置
    # 首先尝试从环境变量加载
    if settings.MCP_SERVERS_CONFIG and settings.MCP_SERVERS_CONFIG != "{}":
        try:
            config["mcpServers"] = json.loads(settings.MCP_SERVERS_CONFIG)
        except Exception as e:
            logger.warning(f"Failed to parse MCP_SERVERS_CONFIG from env: {e}")

    # 如果环境变量为空，从配置文件加载
    if not config["mcpServers"]:
        mcp_config_path = Path("mcp_servers") / "config" / "servers.json"
        if mcp_config_path.exists():
            try:
                with open(mcp_config_path, 'r', encoding='utf-8') as f:
                    config["mcpServers"] = json.load(f).get("mcpServers", {})
            except Exception as e:
                logger.warning(f"Failed to load MCP servers config from file: {e}")

    logger.info(f"Loaded {len(config['agents'])} agents: {list(config['agents'].keys())}")

    return config
