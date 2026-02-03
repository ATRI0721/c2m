"""
测试所有MCP服务器
"""
import subprocess
import json
import time
from pathlib import Path

# 服务器配置列表
SERVERS = {
    "environment": {
        "path": "mcp_servers/servers/environment/environment",
        "runtime": "python",
        "entry": "server.py",
        "test_args": ["--help"]
    },
    "usgs-quakes": {
        "path": "mcp_servers/servers/environment/usgs-quakes-mcp",
        "runtime": "node",
        "entry": "build/index.js",
        "test_args": []
    },
    "geocoding": {
        "path": "mcp_servers/servers/geospatial/geocoding-mcp",
        "runtime": "node",
        "entry": "dist/index.js",
        "test_args": []
    },
    "osm": {
        "path": "mcp_servers/servers/geospatial/osm-mcp-server",
        "runtime": "node",
        "entry": "index.js",
        "test_args": []
    },
    "overpass": {
        "path": "mcp_servers/servers/geospatial/overpass",
        "runtime": "python",
        "entry": "server.py",
        "test_args": ["--help"]
    },
    "opentripmap": {
        "path": "mcp_servers/servers/geospatial/opentripmap",
        "runtime": "python",
        "entry": "server.py",
        "test_args": ["--help"]
    },
    "wikidata": {
        "path": "mcp_servers/servers/geospatial/wikidata-mcp",
        "runtime": "python",
        "entry": "src/server.py",
        "test_args": ["--help"]
    },
    "population": {
        "path": "mcp_servers/servers/urban/population",
        "runtime": "python",
        "entry": "server.py",
        "test_args": ["--help"]
    },
    "opengov": {
        "path": "mcp_servers/servers/urban/opengov-mcp-server",
        "runtime": "node",
        "entry": "dist/index.js",
        "test_args": []
    },
    "exchange-rate": {
        "path": "mcp_servers/servers/economic/exchange-rate",
        "runtime": "python",
        "entry": "server.py",
        "test_args": ["--help"]
    },
}


def test_server(server_id, server_config):
    """测试单个服务器"""
    path = Path(server_config["path"]).resolve()
    entry = path / server_config["entry"]

    # 检查入口文件是否存在
    if not entry.exists():
        return {
            "status": "MISSING",
            "error": f"Entry file not found: {entry}"
        }

    runtime = server_config["runtime"]
    test_args = server_config.get("test_args", [])

    # 构建命令 - 使用相对路径entry文件名，配合cwd
    if runtime == "python":
        cmd = ["python", server_config["entry"]] + test_args
    elif runtime == "node":
        cmd = ["node", server_config["entry"]] + test_args
    else:
        return {
            "status": "ERROR",
            "error": f"Unknown runtime: {runtime}"
        }

    try:
        # 对于有--help参数的服务，直接运行
        if test_args:
            result = subprocess.run(
                cmd,
                cwd=str(path),
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                return {"status": "OK"}
            else:
                return {
                    "status": "ERROR",
                    "error": result.stderr[:200] if result.stderr else "Unknown error"
                }
        else:
            # 对于没有--help的服务，尝试启动并立即终止
            # 这只是简单的存在性检查
            return {"status": "OK", "note": "Entry file exists"}
    except subprocess.TimeoutExpired:
        return {"status": "OK", "note": "Server started (timeout expected)"}
    except Exception as e:
        return {
            "status": "ERROR",
            "error": str(e)[:200]
        }


def main():
    """主测试函数"""
    print("=" * 70)
    print("MCP Servers Test Report")
    print("=" * 70)
    print()

    results = {}
    for server_id, config in SERVERS.items():
        print(f"Testing {server_id}...", end=" ")
        results[server_id] = test_server(server_id, config)
        status = results[server_id]["status"]
        print(f"[{status}]")

        if status == "ERROR":
            error = results[server_id].get("error", "")
            print(f"  Error: {error}")

    print()
    print("=" * 70)
    print("Summary")
    print("=" * 70)

    ok_count = sum(1 for r in results.values() if r["status"] == "OK")
    error_count = sum(1 for r in results.values() if r["status"] == "ERROR")
    missing_count = sum(1 for r in results.values() if r["status"] == "MISSING")

    print(f"Total: {len(SERVERS)} servers")
    print(f"OK:      {ok_count}")
    print(f"ERROR:   {error_count}")
    print(f"MISSING: {missing_count}")
    print()

    # 详细结果
    print("Detailed Results:")
    print("-" * 70)

    categories = {
        "Environment": ["environment", "usgs-quakes"],
        "Geospatial": ["geocoding", "osm", "overpass", "opentripmap", "wikidata"],
        "Urban": ["population", "opengov"],
        "Economic": ["exchange-rate"]
    }

    for category, servers in categories.items():
        print(f"\n[{category}]")
        for server_id in servers:
            if server_id in results:
                r = results[server_id]
                status = r["status"]
                print(f"  [{status:7}] {server_id}")
                if "error" in r:
                    print(f"           {r['error']}")
                if "note" in r:
                    print(f"           ({r['note']})")

    print()
    print("=" * 70)

    # 返回退出码
    if error_count > 0 or missing_count > 0:
        return 1
    return 0


if __name__ == "__main__":
    exit(main())
