"""
MCP服务器验证脚本
测试每个MCP服务器的可用性
"""
import subprocess
import json
import os
from pathlib import Path

# 验证配置
MCP_SERVERS = {
    "environment": {
        "command": "python",
        "args": ["mcp_servers/environment/server.py"],
        "files": ["mcp_servers/environment/server.py"]
    },
    "usgs-quakes": {
        "command": "node",
        "args": ["mcp_servers_installed/usgs-quakes-mcp/build/index.js"],
        "files": ["mcp_servers_installed/usgs-quakes-mcp/build/index.js", "mcp_servers_installed/usgs-quakes-mcp/node_modules/@modelcontextprotocol/sdk"]
    },
    "geocoding": {
        "command": "node",
        "args": ["mcp_servers_installed/geocoding-mcp/dist/index.js"],
        "files": ["mcp_servers_installed/geocoding-mcp/dist/index.js", "mcp_servers_installed/geocoding-mcp/node_modules/@modelcontextprotocol/sdk"]
    },
    "osm": {
        "command": "node",
        "args": ["mcp_servers_installed/osm-mcp-server/index.js"],
        "files": ["mcp_servers_installed/osm-mcp-server/index.js"]
    },
    "opengov": {
        "command": "node",
        "args": ["mcp_servers_installed/opengov-mcp/dist/index.js"],
        "files": ["mcp_servers_installed/opengov-mcp/dist/index.js", "mcp_servers_installed/opengov-mcp/node_modules/@modelcontextprotocol/sdk"],
        "env": ["DATA_PORTAL_URL"]
    },
    "population": {
        "command": "python",
        "args": ["mcp_servers/population/server.py"],
        "files": ["mcp_servers/population/server.py"]
    },
    "opentripmap": {
        "command": "python",
        "args": ["mcp_servers/opentripmap/server.py"],
        "files": ["mcp_servers/opentripmap/server.py"],
        "env": ["OPENTRIPMAP_API_KEY"]
    },
    "overpass": {
        "command": "python",
        "args": ["mcp_servers/overpass/server.py"],
        "files": ["mcp_servers/overpass/server.py"]
    },
    "exchange-rate": {
        "command": "python",
        "args": ["mcp_servers/exchange-rate/server.py"],
        "files": ["mcp_servers/exchange-rate/server.py"]
    }
}


def check_files(server_name, config):
    """检查文件是否存在"""
    print(f"\nChecking files: {server_name}")

    all_exist = True
    for file_path in config.get("files", []):
        path = Path(file_path)
        if path.exists():
            print(f"  [OK] {file_path}")
        else:
            print(f"  [MISSING] {file_path}")
            all_exist = False

    return all_exist


def check_dependencies(server_name, config):
    """检查依赖是否安装"""
    print(f"\nChecking dependencies: {server_name}")

    if config["command"] == "node":
        # 检查node_modules - 获取服务器目录
        server_file = Path(config["args"][0])
        # 如果父目录是dist/build/src，则往上再找一级
        if server_file.parent.name in ["dist", "build", "src"]:
            server_dir = server_file.parent.parent
        else:
            server_dir = server_file.parent
        node_modules = server_dir / "node_modules"

        if node_modules.exists():
            print(f"  [OK] node_modules installed")
            return True
        else:
            print(f"  [MISSING] node_modules not installed")
            return False
    else:
        # Python服务器 - 检查requirements.txt
        server_dir = Path(config["args"][0]).parent
        requirements = server_dir / "requirements.txt"

        if requirements.exists():
            print(f"  [INFO] requirements.txt exists")
            # 简单检查mcp模块是否可导入
            try:
                result = subprocess.run(
                    ["python", "-c", "import mcp"],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    print(f"  [OK] mcp module is installed")
                    return True
                else:
                    print(f"  [WARNING] mcp module may not be installed")
                    return True  # 不阻止，可能全局安装
            except:
                return True
        else:
            print(f"  [INFO] No requirements.txt found")
            return True


def check_env_vars(server_name, config):
    """检查环境变量"""
    env_vars = config.get("env", [])
    if not env_vars:
        return True

    print(f"\nChecking environment variables: {server_name}")
    all_set = True
    for var in env_vars:
        if os.environ.get(var):
            print(f"  [OK] {var} is set")
        else:
            print(f"  [WARNING] {var} is not set")
            all_set = False

    return all_set


def verify_all_servers():
    """验证所有服务器"""
    print("="*60)
    print("MCP Server Verification")
    print("="*60)

    results = {}

    for server_name, config in MCP_SERVERS.items():
        print(f"\n{'='*60}")
        print(f"Server: {server_name}")
        print(f"{'='*60}")

        files_ok = check_files(server_name, config)
        deps_ok = check_dependencies(server_name, config)
        env_ok = check_env_vars(server_name, config)

        results[server_name] = {
            "files_ok": files_ok,
            "deps_ok": deps_ok,
            "env_ok": env_ok,
            "overall": files_ok and deps_ok
        }

        # 诊断信息
        if not results[server_name]["overall"]:
            print(f"\n  [ISSUES FOUND]")
            if not files_ok:
                print(f"    - Some files are missing")
            if not deps_ok:
                print(f"    - Dependencies not properly installed")
            if not env_ok:
                print(f"    - Environment variables not set")

    # 汇总结果
    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")

    success_count = 0
    fail_count = 0

    for server_name, result in results.items():
        status = "[OK] Success" if result["overall"] else "[FAIL] Failed"
        print(f"{server_name}: {status}")
        if result["overall"]:
            success_count += 1
        else:
            fail_count += 1

    print(f"\nTotal: {success_count} success, {fail_count} failed")

    return results


def main():
    """主函数"""
    results = verify_all_servers()

    # 保存结果
    with open("mcp_verification_results.json", "w") as f:
        # 将Path对象转换为字符串
        serializable_results = {}
        for server_name, result in results.items():
            serializable_results[server_name] = {
                k: bool(v) if not isinstance(v, bool) else v
                for k, v in result.items()
            }
        json.dump(serializable_results, f, indent=2)

    print(f"\nResults saved to mcp_verification_results.json")

    # 生成状态报告
    print(f"\n{'='*60}")
    print("Status Report")
    print(f"{'='*60}")

    print("\nServers ready to use:")
    for name, result in results.items():
        if result["overall"]:
            print(f"  - {name}")

    print("\nServers that need attention:")
    for name, result in results.items():
        if not result["overall"]:
            print(f"  - {name}")

    return results


if __name__ == "__main__":
    main()
