"""
MCP服务器管理器
统一管理MCP服务器的安装、验证、配置
"""
import json
import sys
from pathlib import Path

# 添加MCP根目录到路径
MCP_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(MCP_ROOT))

from registry import MCPServerRegistry


class MCPManager:
    """MCP服务器管理器"""

    def __init__(self):
        self.registry = MCPServerRegistry()
        self.config_file = MCP_ROOT / "config" / "servers.json"

    def list_servers(self, category=None):
        """列出服务器"""
        return self.registry.list_servers(category)

    def get_server(self, server_id):
        """获取服务器信息"""
        return self.registry.get_server(server_id)

    def verify_servers(self):
        """验证所有服务器"""
        results = {}
        for server_id, server_info in self.registry.list_all_servers().items():
            results[server_id] = self._verify_server(server_info)
        return results

    def _verify_server(self, server_info):
        """验证单个服务器"""
        server_path = MCP_ROOT / server_info["path"]
        entry_file = server_path / server_info["entry"]

        return {
            "exists": entry_file.exists(),
            "path": str(server_path),
            "auth_required": server_info.get("auth_required", False),
            "status": "ok" if entry_file.exists() else "missing"
        }

    def generate_config(self, output_file=None):
        """生成Claude配置文件"""
        if output_file is None:
            output_file = MCP_ROOT / "config" / "servers.json"

        config = {"mcpServers": {}}

        for server_id, server_info in self.registry.list_all_servers().items():
            server_config = {
                "command": server_info["runtime"],
                "args": [str(MCP_ROOT / server_info["path"] / server_info["entry"])],
                "description": server_info["description"]
            }

            # 添加环境变量（如果需要）
            if server_info.get("auth_required"):
                env_var = server_info.get("auth_env")
                if env_var:
                    server_config["env"] = {env_var: ""}

            config["mcpServers"][server_id] = server_config

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        return config

    def get_stats(self):
        """获取统计信息"""
        return self.registry.get_stats()


def main():
    """主函数"""
    manager = MCPManager()

    import argparse
    parser = argparse.ArgumentParser(description="MCP服务器管理器")
    parser.add_argument("action", choices=["list", "verify", "config", "stats"],
                       help="操作: list-列出服务器, verify-验证服务器, config-生成配置, stats-统计信息")
    parser.add_argument("--category", help="按类别过滤")
    parser.add_argument("--server", help="服务器ID")

    args = parser.parse_args()

    if args.action == "list":
        servers = manager.list_servers(args.category)
        for server_id, info in servers.items():
            print(f"{server_id}: {info['name']} - {info['description']}")

    elif args.action == "verify":
        results = manager.verify_servers()
        for server_id, result in results.items():
            status = "✓" if result["status"] == "ok" else "✗"
            print(f"{status} {server_id}: {result['status']}")

    elif args.action == "config":
        config = manager.generate_config()
        print(f"配置已生成: {manager.config_file}")

    elif args.action == "stats":
        stats = manager.get_stats()
        print(json.dumps(stats, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
