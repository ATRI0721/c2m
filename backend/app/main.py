from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.logging import setup_logging
from app.apis import routers


# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    """应用生命周期管理"""
    # 启动时执行
    logger.info("Starting Code2MCP application...")

    try:
        # 初始化 MCP 客户端管理器
        from app.services.mcp_client_manager import get_mcp_client_manager
        from app.services.mcp_tool_registry import get_mcp_tool_registry

        logger.info("Initializing MCP Client Manager...")
        client_manager = get_mcp_client_manager()

        # 获取所有可用服务器，排除跳过的服务器
        skip_servers = settings.MCP_SKIP_SERVERS
        all_servers = client_manager.mcp_manager.list_available_servers()
        connect_servers = [s for s in all_servers if s not in skip_servers]

        if skip_servers:
            logger.info(f"Skipping MCP servers: {skip_servers}")

        logger.info(f"Connecting to MCP servers: {connect_servers}")
        await client_manager.initialize(connect_servers)

        connected_servers = client_manager.list_connected_servers()
        logger.info(f"MCP Client Manager initialized with {len(connected_servers)} connections: {connected_servers}")

        # 初始化工具注册表
        logger.info("Initializing MCP Tool Registry...")
        tool_registry = get_mcp_tool_registry()
        await tool_registry.initialize()
        logger.info(f"MCP Tool Registry initialized with {len(tool_registry.tools)} tools")

        # 初始化 Agent 池（在 MCP 之后初始化，确保时序正确）
        logger.info("Initializing Agent pool...")
        from app.agents import _initialize_agent_pool
        _initialize_agent_pool()
        logger.info("Agent pool initialized successfully")

        logger.info("Code2MCP application startup completed successfully")

    except Exception as e:
        logger.error(f"Failed to initialize MCP services: {e}", exc_info=True)
        # 不阻止应用启动，只记录错误
        logger.warning("Application will continue, but MCP services may not be available")

    yield

    # 关闭时执行
    logger.info("Shutting down Code2MCP application...")

    try:
        # 清理 MCP 连接
        from app.services.mcp_client_manager import get_mcp_client_manager
        client_manager = get_mcp_client_manager()
        await client_manager.close()
        logger.info("MCP connections closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


app = FastAPI(
    title="Code2MCP API",
    version="1.0.0",
    description="""
    ## Code2MCP Backend API

    A flexible AI application backend framework with multi-Agent management and MCP (Model Context Protocol) service integration.

    ### Features

    * **Multi-Agent System**: Create and manage multiple AI agents with different capabilities
    * **Conversation Management**: Efficient conversation and message handling with streaming support
    * **MCP Integration**: Native support for Model Context Protocol services
    * **User Management**: Complete authentication and authorization system
    * **High Performance**: Agent pool management with singleton pattern

    ### Authentication

    Most endpoints require JWT authentication. Include your token in the Authorization header:

    `Authorization: Bearer <your-token>`

    ### Agents

    The system supports multiple AI agents, each with specialized capabilities:

    * **chat**: General-purpose conversational AI
    * **code**: Code writing and analysis assistant

    You can extend the system by adding custom agents.
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User registration, login, and token management"
        },
        {
            "name": "User Management",
            "description": "User profile and account management"
        },
        {
            "name": "Conversations",
            "description": "Conversation and message management"
        },
        {
            "name": "Chat",
            "description": "AI chat interactions with streaming support"
        },
        {
            "name": "Health",
            "description": "System health check endpoints"
        }
    ],
    lifespan=lifespan
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(",") if hasattr(settings, 'ALLOWED_ORIGINS') else ["http://localhost", "http://localhost:80", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 路由注册
app.include_router(routers, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint with database status

    Returns the current health status of the API and database connection.
    Use this for monitoring and load balancer health checks.
    """
    version = "1.0.0"
    try:
        from app.core.db import engine

        # Test database connection
        with engine.connect() as conn:
            conn.execute("SELECT 1")

        return {
            "status": "ok",
            "database": "connected",
            "version": version
        }
    except Exception as e:
        return {
            "status": "degraded",
            "database": "disconnected",
            "version": version,
            "error": str(e)
        }
