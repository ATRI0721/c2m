"""
测试MCP服务集成 - 验证所有服务能正常连接和响应
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.mcp_client_manager import get_mcp_client_manager
from app.services.mcp_service import mcp_manager
import logging

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_mcp_integration():
    """测试MCP服务集成"""

    print("=" * 70)
    print("MCP服务集成测试")
    print("=" * 70)
    print()

    # 1. 检查配置加载
    print("1. 检查配置加载...")
    available_servers = mcp_manager.list_available_servers()
    print(f"   已加载 {len(available_servers)} 个服务器:")
    for name in sorted(available_servers):
        server = mcp_manager.get_server(name)
        status = "ENABLED" if server.enabled else "DISABLED"
        print(f"   - [{status}] {name}: {server.config.get('description', 'N/A')}")
    print()

    # 2. 初始化客户端连接
    print("2. 初始化MCP客户端连接...")
    client_manager = get_mcp_client_manager()

    try:
        await client_manager.initialize(available_servers)
        print("   ✓ 客户端初始化完成")
    except Exception as e:
        print(f"   ✗ 客户端初始化失败: {e}")
        return False

    print()

    # 3. 检查连接状态
    print("3. 检查连接状态...")
    connected_servers = client_manager.list_connected_servers()
    print(f"   已连接: {len(connected_servers)}/{len(available_servers)} 个服务器")

    for name in available_servers:
        is_connected = client_manager.is_connected(name)
        status = "✓ CONNECTED" if is_connected else "✗ FAILED"
        print(f"   {status}: {name}")
    print()

    # 4. 列出工具
    print("4. 列出可用的MCP工具...")
    all_tools = client_manager.get_all_tools()
    total_tools = sum(len(tools) for tools in all_tools.values())

    print(f"   总计 {total_tools} 个工具:")

    for server_name in sorted(all_tools.keys()):
        tools = all_tools[server_name]
        print(f"   - {server_name}: {len(tools)} 个工具")
        for tool in tools[:3]:  # 只显示前3个
            print(f"     • {tool.name}")
        if len(tools) > 3:
            print(f"     ... 还有 {len(tools) - 3} 个工具")
    print()

    # 5. 测试工具调用（选择简单的工具进行测试）
    print("5. 测试工具调用...")
    test_results = []

    # 测试population服务
    if client_manager.is_connected("population"):
        try:
            result = await client_manager.call_tool(
                "population",
                "get_population",
                {"country": "China"}
            )
            print(f"   ✓ population: get_population - 成功")
            test_results.append(("population", True))
        except Exception as e:
            print(f"   ✗ population: get_population - 失败: {e}")
            test_results.append(("population", False))

    # 测试exchange-rate服务
    if client_manager.is_connected("exchange-rate"):
        try:
            result = await client_manager.call_tool(
                "exchange-rate",
                "get_currencies",
                {}
            )
            print(f"   ✓ exchange-rate: get_currencies - 成功")
            test_results.append(("exchange-rate", True))
        except Exception as e:
            print(f"   ✗ exchange-rate: get_currencies - 失败: {e}")
            test_results.append(("exchange-rate", False))

    # 测试environment服务
    if client_manager.is_connected("environment"):
        try:
            result = await client_manager.call_tool(
                "environment",
                "get_air_quality",
                {"city": "Beijing"}
            )
            print(f"   ✓ environment: get_air_quality - 成功")
            test_results.append(("environment", True))
        except Exception as e:
            print(f"   ✗ environment: get_air_quality - 失败: {e}")
            test_results.append(("environment", False))

    print()

    # 6. 关闭连接
    print("6. 关闭所有连接...")
    await client_manager.close()
    print("   ✓ 所有连接已关闭")
    print()

    # 总结
    print("=" * 70)
    print("测试总结")
    print("=" * 70)

    connected_count = len(connected_servers)
    total_count = len(available_servers)

    print(f"配置的服务器: {total_count}")
    print(f"成功连接:     {connected_count}")
    print(f"连接失败:     {total_count - connected_count}")
    print(f"可用工具:     {total_tools}")

    if test_results:
        success_tests = sum(1 for _, success in test_results if success)
        print(f"工具测试:     {success_tests}/{len(test_results)} 通过")

    print()

    if connected_count == total_count:
        print("✓ 所有MCP服务都已成功连接！")
        return True
    else:
        print("✗ 部分MCP服务连接失败，请检查日志")
        return False


if __name__ == "__main__":
    try:
        success = asyncio.run(test_mcp_integration())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n测试被中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
