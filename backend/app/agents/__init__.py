"""
Agent模块初始化
提供动态Agent工厂和MCP集成支持
"""
from typing import Dict, Optional
import logging

from openai import AsyncOpenAI

from app.agents.baseagent import BaseAgent
from app.agents.dynamic_agent import DynamicAgent
from app.agents.agent_factory import AgentFactory, get_agent_factory
from app.agents.agent_config import get_agent_config_manager
from app.services.mcp_tool_registry import get_mcp_tool_registry

logger = logging.getLogger(__name__)


def create_openai_client() -> AsyncOpenAI:
    """创建OpenAI客户端"""
    from app.core.config import settings
    return AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL
    )


# Agent池: 存储已初始化的Agent实例
_agent_pool: Dict[str, BaseAgent] = {}
_agent_factory: Optional[AgentFactory] = None
_initialized = False  # 跟踪Agent池是否已初始化


def _initialize_agent_pool():
    """初始化Agent池,从配置文件动态创建所有Agent实例"""
    global _agent_pool, _agent_factory, _initialized

    # 创建OpenAI客户端
    client = create_openai_client()

    # 获取MCP工具注册表
    mcp_registry = get_mcp_tool_registry()

    # 创建Agent工厂
    _agent_factory = AgentFactory(client, mcp_registry)

    # 创建所有Agent实例
    _agent_pool = _agent_factory.create_all_agents()

    _initialized = True
    logger.info(f"Initialized agent pool with {len(_agent_pool)} agents")


# 移除模块加载时的自动初始化
# 现在由main.py在lifespan中显式调用，确保MCP已初始化
# _initialize_agent_pool()


def _ensure_agent_pool():
    """确保Agent池已初始化（延迟初始化）"""
    global _initialized
    if not _initialized:
        logger.info("Agent pool not initialized, initializing now...")
        _initialize_agent_pool()


def get_agent(agent_name: str) -> BaseAgent:
    """
    从Agent池中获取指定名称的Agent实例

    Args:
        agent_name: Agent名称

    Returns:
        Agent实例

    Raises:
        ValueError: 如果Agent不存在
    """
    # 确保Agent池已初始化
    _ensure_agent_pool()

    if agent_name not in _agent_pool:
        available = list(_agent_pool.keys())
        raise ValueError(
            f"Agent '{agent_name}' not found. "
            f"Available agents: {available}"
        )

    return _agent_pool[agent_name]


def list_agents() -> Dict[str, Dict[str, any]]:
    """
    列出所有可用的Agent信息

    直接从Agent池获取已初始化的Agent实例
    """
    # 确保Agent池已初始化
    _ensure_agent_pool()

    agents_info = {}
    for name, agent in _agent_pool.items():
        agents_info[name] = {
            "name": agent.name,
            "description": agent.description,
            "model": agent.model,
            "mcp_services": list(agent.mcp_services),
            "enable_tool_calling": agent.enable_tool_calling,
        }

    return agents_info


def reload_agents():
    """
    重新加载Agent配置和实例

    用于配置文件更新后的热重载
    """
    global _agent_pool, _agent_factory

    logger.info("Reloading agents...")

    # 清空现有池
    _agent_pool.clear()

    # 重新初始化
    _initialize_agent_pool()

    logger.info("Agents reloaded successfully")


async def initialize_mcp_for_agents(server_names: list = None) -> None:
    """
    初始化所有Agent的MCP工具集成

    Args:
        server_names: 要连接的MCP服务器列表，None表示所有
    """
    from app.services.mcp_client_manager import ensure_mcp_initialized
    from app.services.mcp_tool_registry import ensure_tool_registry

    try:
        # 确保MCP客户端管理器已初始化
        await ensure_mcp_initialized(server_names)

        # 确保工具注册表已初始化
        await ensure_tool_registry()

        logger.info(f"MCP integration initialized for all agents")

    except Exception as e:
        logger.error(f"Failed to initialize MCP integration: {e}")
        raise


__all__ = [
    "BaseAgent",
    "DynamicAgent",
    "get_agent",
    "list_agents",
    "reload_agents",
    "initialize_mcp_for_agents",
    "get_agent_factory",
]
