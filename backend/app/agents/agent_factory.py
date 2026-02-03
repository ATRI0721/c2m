"""
Agent工厂
根据配置文件动态创建Agent实例
"""
import logging
from typing import Dict, Optional

from openai import AsyncOpenAI

from app.agents.dynamic_agent import DynamicAgent
from app.agents.agent_config import get_agent_config_manager
from app.services.mcp_tool_registry import MCPToolRegistry, get_mcp_tool_registry

logger = logging.getLogger(__name__)


class AgentFactory:
    """
    Agent工厂类
    负责根据配置创建Agent实例
    """

    def __init__(
        self,
        openai_client: AsyncOpenAI,
        mcp_tool_registry: MCPToolRegistry = None
    ):
        """
        初始化Agent工厂

        Args:
            openai_client: OpenAI异步客户端
            mcp_tool_registry: MCP工具注册表，默认使用全局实例
        """
        self.openai_client = openai_client
        self.mcp_tool_registry = mcp_tool_registry or get_mcp_tool_registry()
        self.config_manager = get_agent_config_manager()

        # 加载所有配置
        self.config_manager.load_all_configs()

        logger.info("AgentFactory initialized")

    def create_agent(self, agent_name: str) -> Optional[DynamicAgent]:
        """
        创建指定名称的Agent实例

        Args:
            agent_name: Agent名称

        Returns:
            DynamicAgent实例，不存在返回None
        """
        config = self.config_manager.get_config(agent_name)

        if not config:
            logger.error(f"Agent config not found: {agent_name}")
            return None

        try:
            agent = DynamicAgent(
                config=config,
                openai_client=self.openai_client,
                mcp_tool_registry=self.mcp_tool_registry
            )

            logger.info(f"Created agent instance: {agent_name}")
            return agent

        except Exception as e:
            logger.error(f"Failed to create agent {agent_name}: {e}")
            return None

    def create_all_agents(self) -> Dict[str, DynamicAgent]:
        """
        创建所有配置的Agent实例

        Returns:
            Agent字典，key为agent名称
        """
        agents = {}

        for agent_name in self.config_manager.get_available_agents():
            agent = self.create_agent(agent_name)
            if agent:
                agents[agent_name] = agent

        logger.info(f"Created {len(agents)} agent instances")
        return agents

    def get_available_agents(self) -> list[str]:
        """
        获取所有可用的Agent名称列表

        Returns:
            Agent名称列表
        """
        return self.config_manager.get_available_agents()

    def get_agent_config(self, agent_name: str):
        """
        获取指定Agent的配置

        Args:
            agent_name: Agent名称

        Returns:
            AgentConfig对象，不存在返回None
        """
        return self.config_manager.get_config(agent_name)

    def reload_configs(self) -> None:
        """重新加载配置文件"""
        self.config_manager.reload_configs()
        logger.info("Agent configurations reloaded")


# 全局工厂实例
_global_agent_factory: Optional[AgentFactory] = None


def get_agent_factory(
    openai_client: AsyncOpenAI = None,
    mcp_tool_registry: MCPToolRegistry = None
) -> AgentFactory:
    """
    获取全局Agent工厂实例

    Args:
        openai_client: OpenAI异步客户端
        mcp_tool_registry: MCP工具注册表

    Returns:
        AgentFactory实例
    """
    global _global_agent_factory

    if _global_agent_factory is None:
        if openai_client is None:
            raise ValueError("openai_client must be provided on first call")
        _global_agent_factory = AgentFactory(openai_client, mcp_tool_registry)

    return _global_agent_factory
