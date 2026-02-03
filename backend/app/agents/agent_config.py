"""
Agent配置管理模块
负责加载和管理Agent配置文件
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class AgentConfig:
    """Agent配置数据类"""

    name: str
    description: str
    model: str
    system_prompt: str
    mcp_services: List[str] = field(default_factory=list)
    enable_tool_calling: bool = True

    def __post_init__(self):
        """初始化后处理，确保mcp_services为列表格式"""
        if isinstance(self.mcp_services, set):
            self.mcp_services = list(self.mcp_services)


class AgentConfigManager:
    """Agent配置管理器"""

    def __init__(self, config_dir: str = None):
        """
        初始化配置管理器

        Args:
            config_dir: 配置文件目录路径，默认为app/agents/config
        """
        if config_dir is None:
            # 默认配置目录
            current_file = Path(__file__)
            config_dir = current_file.parent / "config"

        self.config_dir = Path(config_dir)
        self._configs: Dict[str, AgentConfig] = {}

        logger.info(f"AgentConfigManager initialized with config_dir: {self.config_dir}")

    def load_all_configs(self) -> Dict[str, AgentConfig]:
        """
        加载所有配置文件

        Returns:
            配置字典，key为agent名称
        """
        self._configs.clear()

        if not self.config_dir.exists():
            logger.warning(f"Config directory does not exist: {self.config_dir}")
            return self._configs

        # 遍历配置目录中的所有JSON文件
        for config_file in self.config_dir.glob("*.json"):
            try:
                config = self._load_config_file(config_file)
                if config:
                    self._configs[config.name] = config
                    logger.info(f"Loaded config for agent: {config.name}")
            except Exception as e:
                logger.error(f"Failed to load config file {config_file}: {e}")

        logger.info(f"Total loaded {len(self._configs)} agent configs")
        return self._configs

    def _load_config_file(self, config_file: Path) -> Optional[AgentConfig]:
        """
        加载单个配置文件

        Args:
            config_file: 配置文件路径

        Returns:
            AgentConfig对象，失败返回None
        """
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            # 验证必需字段
            required_fields = ["name", "description", "model", "system_prompt"]
            for field in required_fields:
                if field not in data:
                    logger.error(f"Missing required field '{field}' in {config_file}")
                    return None

            # 创建配置对象
            config = AgentConfig(
                name=data["name"],
                description=data["description"],
                model=data["model"],
                system_prompt=data["system_prompt"],
                mcp_services=data.get("mcp_services", []),
                enable_tool_calling=data.get("enable_tool_calling", True)
            )

            return config

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in {config_file}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error loading {config_file}: {e}")
            return None

    def get_config(self, agent_name: str) -> Optional[AgentConfig]:
        """
        获取指定agent的配置

        Args:
            agent_name: agent名称

        Returns:
            AgentConfig对象，不存在返回None
        """
        # 如果配置未加载，先加载
        if not self._configs:
            self.load_all_configs()

        return self._configs.get(agent_name)

    def get_all_configs(self) -> Dict[str, AgentConfig]:
        """
        获取所有agent配置

        Returns:
            配置字典
        """
        # 如果配置未加载，先加载
        if not self._configs:
            self.load_all_configs()

        return self._configs.copy()

    def get_available_agents(self) -> List[str]:
        """
        获取所有可用的agent名称列表

        Returns:
            agent名称列表
        """
        # 如果配置未加载，先加载
        if not self._configs:
            self.load_all_configs()

        return list(self._configs.keys())

    def reload_configs(self) -> Dict[str, AgentConfig]:
        """
        重新加载所有配置文件

        Returns:
            配置字典
        """
        logger.info("Reloading agent configs")
        return self.load_all_configs()


# 全局配置管理器实例
_global_config_manager: Optional[AgentConfigManager] = None


def get_agent_config_manager() -> AgentConfigManager:
    """
    获取全局配置管理器实例

    Returns:
        AgentConfigManager实例
    """
    global _global_config_manager

    if _global_config_manager is None:
        _global_config_manager = AgentConfigManager()
        _global_config_manager.load_all_configs()

    return _global_config_manager
