import logging
from fastapi import APIRouter, HTTPException, Depends

from app.core.deps import CurrentUser, SessionDep, GetConversation, get_system_config
from app.core.config import settings
from app.models.interfaces import MCPToolInfo, MCPServer
from app.services.mcp_tool_registry import get_mcp_tool_registry

logger = logging.getLogger(__name__)

router = APIRouter(tags=["mcp"], prefix="/mcp")


@router.get("/servers", response_model=list[MCPServer])
async def list_mcp_servers(
    current_user: CurrentUser = None
):
    """
    获取可用的MCP服务器列表
    根据用户类型返回不同的服务器列表
    """
    config = get_system_config()
    tool_registry = get_mcp_tool_registry()

    # 获取所有MCP服务器配置
    mcp_servers_config = config.get("mcpServers", {})

    # 判断是否为admin用户
    is_admin = current_user and current_user.email in settings.ADMIN_EMAILS

    # 获取公开的MCP服务器列表
    public_mcp_servers = config.get("public_mcp_servers", [])

    # 从工具注册表获取实际工具列表（按服务器分组）
    tools_by_server = tool_registry.list_tools_by_server() if tool_registry._initialized else {}

    # 根据用户类型过滤服务器
    servers = []

    for server_name, server_config in mcp_servers_config.items():
        # Admin用户可以访问所有服务器（包括敏感的config-admin）
        # 普通用户只能访问公开的服务器
        if is_admin:
            should_include = True
        else:
            should_include = server_name in public_mcp_servers

        if should_include:
            # 获取该服务器的所有工具
            server_tools = tools_by_server.get(server_name, [])
            running = len(server_tools) > 0

            # 构建工具列表
            tools = []
            for tool_id in server_tools:
                wrapper = tool_registry.tools.get(tool_id)
                if wrapper:
                    tools.append(MCPToolInfo(
                        tool_id=wrapper.tool_id,
                        server_name=wrapper.server_name,
                        name=wrapper.tool.name,
                        description=wrapper.tool.description
                    ))

            servers.append(MCPServer(
                name=server_name,
                description=server_config.get("description", ""),
                running=running,
                tools=tools,
                command=server_config.get("command", ""),
                args=server_config.get("args", [])
            ))

    logger.info(f"Returning {len(servers)} MCP servers for user (admin={is_admin})")

    return servers


@router.get("/servers/{name}", response_model=MCPServer)
async def get_mcp_server_detail(
    name: str,
    current_user: CurrentUser
):
    """
    获取单个MCP服务器的详情
    （实际上和列表中的信息一致，保留此接口以便通过单个服务器名查询）
    """
    config = get_system_config()
    tool_registry = get_mcp_tool_registry()

    # 获取所有MCP服务器配置
    mcp_servers_config = config.get("mcpServers", {})

    # 判断是否为admin用户
    is_admin = current_user and current_user.email in settings.ADMIN_EMAILS

    # 获取公开的MCP服务器列表
    public_mcp_servers = config.get("public_mcp_servers", [])

    # 权限检查
    if not is_admin and name not in public_mcp_servers:
        raise HTTPException(
            status_code=403,
            detail=f"MCP server '{name}' is not available"
        )

    if name not in mcp_servers_config:
        raise HTTPException(
            status_code=404,
            detail=f"MCP server '{name}' not found"
        )

    server_config = mcp_servers_config[name]

    # 获取该服务器的所有工具
    tools = []
    if tool_registry._initialized:
        server_tools = tool_registry.get_tools_for_agent({name})
        for wrapper in server_tools:
            if wrapper.server_name == name:
                tools.append(MCPToolInfo(
                    tool_id=wrapper.tool_id,
                    server_name=wrapper.server_name,
                    name=wrapper.tool.name,
                    description=wrapper.tool.description
                ))

    running = len(tools) > 0

    return MCPServer(
        name=name,
        description=server_config.get("description", ""),
        running=running,
        tools=tools,
        command=server_config.get("command", ""),
        args=server_config.get("args", [])
    )
