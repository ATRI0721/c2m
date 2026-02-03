"""
MCP模块 - 城市计算MCP服务器集合

提供按类别组织的MCP服务器，包括：
- 环境数据（environment）
- 地理空间（geospatial）
- 城市规划（urban）
- 经济数据（economic）
"""

__version__ = "1.0.0"

from mcp_servers.registry import MCPServerRegistry

__all__ = ["MCPServerRegistry"]
