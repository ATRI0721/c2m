"""
MCP服务器安装脚本
自动下载和配置MCP服务器
"""
import os
import subprocess
import json
import sys
from pathlib import Path

# MCP服务器配置列表
MCP_SERVERS = {
    # 高优先级 - 免费、无需密钥
    "wikidata-mcp": {
        "repo": "zzaebok/mcp-wikidata",
        "type": "python",
        "priority": "high",
        "description": "Wikidata SPARQL查询"
    },
    "usgs-quakes-mcp": {
        "repo": "blake365/usgs-quakes-mcp",
        "type": "python",
        "priority": "high",
        "description": "美国地震查询"
    },
    "geocoding-mcp": {
        "repo": "geocoding-ai/mcp",
        "type": "node",
        "priority": "high",
        "description": "Nominatim地理编码"
    },
    "opengov-mcp": {
        "repo": "srobbin/opengov-mcp-server",
        "type": "python",
        "priority": "high",
        "description": "Socrata城市开放数据"
    },
    "osm-mcp-server": {
        "repo": "tpp6me/osm-mcp-server",
        "type": "python",
        "priority": "high",
        "description": "OSM路线规划与地理编码"
    },
    # 中优先级 - 需要API密钥但有免费额度
    "yelp-mcp": {
        "repo": "Yelp/yelp-mcp",
        "type": "node",
        "priority": "medium",
        "description": "Yelp商户点评",
        "env_required": ["YELP_API_KEY"]
    },
    "foursquare-places-mcp": {
        "repo": "foursquare/foursquare-places-mcp",
        "type": "node",
        "priority": "medium",
        "description": "Foursquare地点信息",
        "env_required": ["FOURSQUARE_API_KEY"]
    },
    "opentripplanner-mcp": {
        "repo": "entur/opentripplanner-mcp",
        "type": "java",
        "priority": "medium",
        "description": "多模态交通规划"
    },
    # 低优先级 - 需要OAuth/复杂配置
    "strava-mcp": {
        "repo": "r-huijts/strava-mcp",
        "type": "python",
        "priority": "low",
        "description": "Strava GPS运动数据",
        "env_required": ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_REFRESH_TOKEN"]
    },
    "climatiq-mcp": {
        "repo": "jagan-shanmugam/climatiq-mcp-server",
        "type": "python",
        "priority": "low",
        "description": "碳排放计算",
        "env_required": ["CLIMATIQ_API_KEY"]
    }
}

def run_command(cmd, cwd=None):
    """运行命令"""
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    return True

def clone_repo(repo_url, dest_dir):
    """克隆GitHub仓库"""
    if os.path.exists(dest_dir):
        print(f"目录已存在: {dest_dir}")
        return True
    return run_command(f"git clone https://github.com/{repo_url} {dest_dir}")

def install_python_server(server_name, server_config, server_dir):
    """安装Python MCP服务器"""
    print(f"\n{'='*60}")
    print(f"安装Python服务器: {server_name}")
    print(f"{'='*60}")

    # 克隆仓库
    if not clone_repo(server_config["repo"], server_dir):
        return False

    # 安装依赖
    requirements_file = os.path.join(server_dir, "requirements.txt")
    if os.path.exists(requirements_file):
        print(f"安装依赖: {requirements_file}")
        run_command(f"pip install -r {requirements_file}")

    return True

def install_node_server(server_name, server_config, server_dir):
    """安装Node.js MCP服务器"""
    print(f"\n{'='*60}")
    print(f"安装Node.js服务器: {server_name}")
    print(f"{'='*60}")

    # 克隆仓库
    if not clone_repo(server_config["repo"], server_dir):
        return False

    # 安装依赖
    package_json = os.path.join(server_dir, "package.json")
    if os.path.exists(package_json):
        print(f"安装依赖: npm install")
        run_command(f"npm install", cwd=server_dir)

    return True

def install_java_server(server_name, server_config, server_dir):
    """安装Java MCP服务器"""
    print(f"\n{'='*60}")
    print(f"安装Java服务器: {server_name}")
    print(f"{'='*60}")

    # 克隆仓库
    if not clone_repo(server_config["repo"], server_dir):
        return False

    print("Java服务器需要手动构建，请查看README文档")
    return True

def install_server(server_name, server_config, base_dir):
    """安装MCP服务器"""
    server_dir = os.path.join(base_dir, server_name)

    # 检查是否需要环境变量
    if "env_required" in server_config:
        print(f"注意: 此服务器需要以下环境变量: {', '.join(server_config['env_required'])}")
        response = input("是否继续安装? (y/n): ")
        if response.lower() != 'y':
            print(f"跳过 {server_name}")
            return None

    # 根据类型安装
    if server_config["type"] == "python":
        success = install_python_server(server_name, server_config, server_dir)
    elif server_config["type"] == "node":
        success = install_node_server(server_name, server_config, server_dir)
    elif server_config["type"] == "java":
        success = install_java_server(server_name, server_config, server_dir)
    else:
        print(f"未知的服务器类型: {server_config['type']}")
        return None

    if success:
        return server_dir
    return None

def main():
    """主函数"""
    base_dir = os.path.join(os.getcwd(), "mcp_servers_installed")
    os.makedirs(base_dir, exist_ok=True)

    print("="*60)
    print("MCP服务器安装脚本")
    print("="*60)

    # 按优先级排序
    high_priority = {k: v for k, v in MCP_SERVERS.items() if v["priority"] == "high"}
    medium_priority = {k: v for k, v in MCP_SERVERS.items() if v["priority"] == "medium"}
    low_priority = {k: v for k, v in MCP_SERVERS.items() if v["priority"] == "low"}

    print("\n选择要安装的服务器:")
    print("1. 高优先级 (免费、无需密钥)")
    print("2. 中优先级 (需要API密钥)")
    print("3. 低优先级 (需要OAuth/复杂配置)")
    print("4. 全部")
    print("5. 自定义选择")

    choice = input("\n请选择 (1-5): ")

    servers_to_install = {}
    if choice == "1":
        servers_to_install = high_priority
    elif choice == "2":
        servers_to_install = medium_priority
    elif choice == "3":
        servers_to_install = low_priority
    elif choice == "4":
        servers_to_install = MCP_SERVERS
    elif choice == "5":
        print("\n可用的服务器:")
        for i, (name, config) in enumerate(MCP_SERVERS.items(), 1):
            print(f"{i}. {name} - {config['description']} ({config['priority']})")
        selected = input("\n请输入服务器编号 (用逗号分隔): ")
        indices = [int(x.strip()) - 1 for x in selected.split(",")]
        servers_to_install = {list(MCP_SERVERS.keys())[i]: list(MCP_SERVERS.values())[i] for i in indices}
    else:
        print("无效选择")
        return

    # 安装服务器
    installed = {}
    for name, config in servers_to_install.items():
        server_dir = install_server(name, config, base_dir)
        if server_dir:
            installed[name] = {
                "dir": server_dir,
                "type": config["type"],
                "description": config["description"]
            }

    # 保存安装记录
    with open(os.path.join(base_dir, "installed.json"), "w") as f:
        json.dump(installed, f, indent=2)

    print(f"\n{'='*60}")
    print(f"安装完成! 已安装 {len(installed)} 个服务器")
    print(f"{'='*60}")
    for name, info in installed.items():
        print(f"- {name}: {info['dir']}")

if __name__ == "__main__":
    main()
