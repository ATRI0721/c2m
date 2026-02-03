from typing import List, Dict, Any, Optional
import json
from pathlib import Path
from app.core.config import settings


class MCPServer:
    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
        self.enabled = config.get("enabled", True)
        self.command = config.get("command", "")
        self.args = config.get("args", [])
        self.env = config.get("env", {})


class MCPManager:
    def __init__(self):
        self.servers: Dict[str, MCPServer] = {}
        self._load_servers()

    def _load_servers(self):
        """从配置加载MCP服务器"""
        import logging

        logger = logging.getLogger(__name__)

        # 首先尝试从环境变量加载
        config_data = None
        try:
            config_str = settings.MCP_SERVERS_CONFIG
            if config_str and config_str != "{}":
                config_data = json.loads(config_str)
                logger.info(f"Loaded MCP config from environment variable ({len(config_data)} servers)")
        except Exception as e:
            logger.warning(f"Failed to parse MCP_SERVERS_CONFIG from env: {e}")

        # 如果环境变量为空，从配置文件加载
        if not config_data:
            # 尝试多个可能的配置文件路径
            possible_paths = [
                # 当前工作目录下的相对路径
                Path("mcp_servers") / "config" / "servers.json",
                # 当前文件的相对路径
                Path(__file__).parent.parent.parent / "mcp_servers" / "config" / "servers.json",
                # 绝对路径
                Path("/app/mcp_servers/config/servers.json"),
            ]

            config_path = None
            for path in possible_paths:
                if path.exists():
                    config_path = path
                    break

            if config_path:
                try:
                    with open(config_path, 'r', encoding='utf-8') as f:
                        full_config = json.load(f)
                        config_data = full_config.get("mcpServers", {})
                        logger.info(f"Loaded MCP config from file {config_path} ({len(config_data)} servers)")
                except Exception as e:
                    logger.error(f"Failed to load MCP config from file {config_path}: {e}")
            else:
                logger.warning(f"MCP config file not found in any of these paths: {possible_paths}")

        # 创建服务器实例
        if config_data:
            for name, server_config in config_data.items():
                self.servers[name] = MCPServer(name, server_config)

        logger.info(f"Total MCP servers loaded: {len(self.servers)}")

    def get_server(self, name: str) -> Optional[MCPServer]:
        """获取指定名称的MCP服务器"""
        return self.servers.get(name)

    def get_enabled_servers(self, server_names: List[str]) -> List[MCPServer]:
        """获取启用的MCP服务器列表"""
        enabled = []
        for name in server_names:
            server = self.get_server(name)
            if server and server.enabled:
                enabled.append(server)
        return enabled

    def list_available_servers(self) -> List[str]:
        """列出所有可用的MCP服务器"""
        return [name for name, server in self.servers.items() if server.enabled]


# 全局MCP管理器实例
mcp_manager = MCPManager()
