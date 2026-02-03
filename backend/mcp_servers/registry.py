"""
MCP服务器注册表
统一管理所有MCP服务器的注册信息
"""
import json
from pathlib import Path
from typing import Dict, List, Any


class MCPServerRegistry:
    """MCP服务器注册表"""

    def __init__(self, registry_file=None):
        if registry_file is None:
            registry_file = Path(__file__).parent / "registry.json"

        self.registry_file = Path(registry_file)
        self.data = self._load_registry()

    def _load_registry(self) -> Dict[str, Any]:
        """加载注册表"""
        if self.registry_file.exists():
            with open(self.registry_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"registry": {}, "categories": {}}

    def _save_registry(self):
        """保存注册表"""
        with open(self.registry_file, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def list_categories(self) -> Dict[str, Dict]:
        """列出所有类别"""
        return self.data.get("categories", {})

    def list_servers(self, category: str = None) -> Dict[str, Dict]:
        """列出服务器"""
        if category:
            cat_data = self.data["categories"].get(category, {})
            return {s["id"]: s for s in cat_data.get("servers", [])}
        else:
            # 返回所有服务器
            servers = {}
            for cat_name, cat_data in self.data["categories"].items():
                for server in cat_data.get("servers", []):
                    servers[server["id"]] = {
                        **server,
                        "category": cat_name
                    }
            return servers

    def list_all_servers(self) -> Dict[str, Dict]:
        """列出所有服务器（按ID索引）"""
        return self.list_servers()

    def get_server(self, server_id: str) -> Dict[str, Any]:
        """获取服务器信息"""
        servers = self.list_servers()
        return servers.get(server_id, {})

    def add_server(self, category: str, server_info: Dict[str, Any]):
        """添加服务器"""
        if category not in self.data["categories"]:
            self.data["categories"][category] = {
                "name": category,
                "description": "",
                "servers": []
            }

        self.data["categories"][category]["servers"].append(server_info)
        self._save_registry()

    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        stats = {
            "total_servers": 0,
            "custom_servers": 0,
            "third_party_servers": 0,
            "requires_auth": 0,
            "by_category": {},
            "by_status": {}
        }

        for cat_name, cat_data in self.data["categories"].items():
            servers = cat_data.get("servers", [])
            stats["total_servers"] += len(servers)
            stats["by_category"][cat_name] = len(servers)

            for server in servers:
                if server.get("type") == "custom":
                    stats["custom_servers"] += 1
                else:
                    stats["third_party_servers"] += 1

                if server.get("auth_required"):
                    stats["requires_auth"] += 1

                status = server.get("status", "unknown")
                stats["by_status"][status] = stats["by_status"].get(status, 0) + 1

        return stats

    def get_servers_by_type(self, server_type: str) -> List[Dict]:
        """按类型获取服务器"""
        servers = []
        for cat_name, cat_data in self.data["categories"].items():
            for server in cat_data.get("servers", []):
                if server.get("type") == server_type:
                    servers.append(server)
        return servers

    def get_servers_requiring_auth(self) -> List[Dict]:
        """获取需要认证的服务器"""
        servers = []
        for cat_name, cat_data in self.data["categories"].items():
            for server in cat_data.get("servers", []):
                if server.get("auth_required"):
                    servers.append(server)
        return servers


def main():
    """测试代码"""
    registry = MCPServerRegistry()

    print("=== 类别列表 ===")
    for cat_id, cat_info in registry.list_categories().items():
        print(f"{cat_id}: {cat_info['name']} - {cat_info['description']}")

    print("\n=== 所有服务器 ===")
    servers = registry.list_servers()
    for server_id, server_info in servers.items():
        print(f"{server_id}: {server_info['name']}")

    print("\n=== 统计信息 ===")
    print(json.dumps(registry.get_stats(), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
