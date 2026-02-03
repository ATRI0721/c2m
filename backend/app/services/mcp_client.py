"""
MCP客户端 - 负责到单个 MCP server 的连接管理
"""
import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from sys import version_info

from mcp.client.session import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.types import Tool, Resource, Prompt
from pydantic_core import ValidationError

# Python 3.11+ has BaseExceptionGroup built-in
if version_info >= (3, 11):
    from builtins import BaseExceptionGroup
else:
    from exceptiongroup import BaseExceptionGroup

logger = logging.getLogger(__name__)


def resolve_path(path_str: str) -> str:
    """将相对路径转换为绝对路径"""
    path = Path(path_str)
    if path.is_absolute():
        return str(path)
    return str(path.resolve())


class MCPClient:
    """
    MCP客户端 - 负责到单个MCP服务器的连接管理

    职责：
    1. 建立和维护到单个MCP server的连接
    2. 管理session的生命周期（连接、初始化、关闭）
    3. 提供工具调用、资源读取、提示词获取等操作接口
    4. 管理并发锁（stdio连接不支持并发）
    """

    def __init__(self, name: str, config):
        """
        初始化MCP客户端

        Args:
            name: 服务器名称
            config: 服务器配置 (MCPServer对象)
        """
        self.name = name
        self.config = config
        self.session: Optional[ClientSession] = None
        self._connection_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self._ready_event = asyncio.Event()
        self._stop_event = asyncio.Event()

        # 缓存的工具、资源和提示词
        self._tools: List[Tool] = []
        self._resources: List[Resource] = []
        self._prompts: List[Prompt] = []

    async def connect(self, timeout: float = 30.0) -> bool:
        """
        建立到MCP服务器的连接

        使用后台任务来保持连接活跃，因为 ClientSession 是异步上下文管理器

        Args:
            timeout: 连接超时时间（秒）

        Returns:
            是否连接成功
        """
        if not self.config.enabled:
            logger.info(f"MCP server '{self.name}' is disabled, skipping")
            self._ready_event.set()
            return False

        logger.info(f"Connecting to MCP server: {self.name}")

        # 启动后台任务来管理连接
        self._connection_task = asyncio.create_task(self._manage_connection())

        # 等待连接就绪
        try:
            await asyncio.wait_for(self._ready_event.wait(), timeout=timeout)
            return self.session is not None
        except asyncio.TimeoutError:
            logger.error(f"Timeout connecting to '{self.name}'")
            await self.disconnect()
            return False

    async def _manage_connection(self) -> None:
        """
        在后台任务中管理连接生命周期

        使用 async with 确保正确的资源清理
        """
        # 构建服务器参数
        resolved_args = [
            resolve_path(arg) if not arg.startswith('-') else arg
            for arg in self.config.args
        ]
        server_params = StdioServerParameters(
            command=self.config.command,
            args=resolved_args,
            env=self.config.env or None
        )

        try:
            async with stdio_client(server_params) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    self.session = session

                    # 初始化会话
                    await session.initialize()

                    # 获取工具、资源和提示词（处理不支持的功能）
                    from mcp.shared.exceptions import McpError

                    # 获取工具
                    try:
                        tools_result = await session.list_tools()
                        self._tools = tools_result.tools or []
                    except McpError as e:
                        if "Method not found" in str(e):
                            logger.warning(f"{self.name} does not support tools")
                            self._tools = []
                        else:
                            raise
                    except ValidationError as e:
                        # 某些MCP服务器可能返回不符合协议的响应格式
                        logger.debug(f"{self.name} tools response validation failed: {e}")
                        self._tools = []

                    # 获取资源
                    try:
                        resources_result = await session.list_resources()
                        self._resources = resources_result.resources or []
                    except McpError as e:
                        if "Method not found" in str(e):
                            logger.debug(f"{self.name} does not support resources")
                            self._resources = []
                        else:
                            raise
                    except ValidationError as e:
                        # 某些MCP服务器可能返回不符合协议的响应格式
                        logger.debug(f"{self.name} resources response validation failed: {e}")
                        self._resources = []
                    except Exception as e:
                        # 捕获其他异常，某些MCP服务器可能不完全兼容协议
                        logger.debug(f"{self.name} resources listing failed: {e}")
                        self._resources = []

                    # 获取提示词
                    try:
                        prompts_result = await session.list_prompts()
                        self._prompts = prompts_result.prompts or []
                    except McpError as e:
                        if "Method not found" in str(e):
                            logger.debug(f"{self.name} does not support prompts")
                            self._prompts = []
                        else:
                            raise
                    except ValidationError as e:
                        # 某些MCP服务器可能返回不符合协议的响应格式
                        logger.debug(f"{self.name} prompts response validation failed: {e}")
                        self._prompts = []
                    except Exception as e:
                        # 捕获其他异常，某些MCP服务器可能不完全兼容协议
                        logger.debug(f"{self.name} prompts listing failed: {e}")
                        self._prompts = []

                    logger.info(
                        f"Connected to {self.name}: "
                        f"{len(self._tools)} tools, "
                        f"{len(self._resources)} resources, "
                        f"{len(self._prompts)} prompts"
                    )

                    # 标记就绪
                    self._ready_event.set()

                    # 保持连接活跃，直到收到停止信号
                    await self._stop_event.wait()

        except asyncio.CancelledError:
            logger.info(f"Connection task for {self.name} cancelled")
        except BaseExceptionGroup as e:
            # 处理来自 TaskGroup 的异常组（包含 ValidationError 等）
            logger.error(f"Error in connection task for {self.name}: {e}")
            for exc in e.exceptions:
                logger.error(f"  Sub-exception: {exc}")
                import traceback
                traceback.print_exception(type(exc), exc, exc.__traceback__)
        except Exception as e:
            logger.error(f"Error in connection task for {self.name}: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self.session = None
            self._ready_event.clear()

    async def disconnect(self) -> None:
        """断开与MCP服务器的连接"""
        logger.info(f"Disconnecting from {self.name}")

        # 发送停止信号
        self._stop_event.set()

        # 取消并等待后台任务完成
        if self._connection_task and not self._connection_task.done():
            self._connection_task.cancel()
            try:
                await asyncio.wait_for(self._connection_task, timeout=5.0)
            except asyncio.TimeoutError:
                logger.warning(f"Timeout closing connection for {self.name}")
            except asyncio.CancelledError:
                pass  # 正常取消

        # 重置状态
        self.session = None
        self._connection_task = None
        self._stop_event.clear()
        self._ready_event.clear()

    async def wait_until_ready(self, timeout: float = 30.0) -> bool:
        """
        等待客户端就绪

        Args:
            timeout: 超时时间（秒）

        Returns:
            是否成功就绪
        """
        try:
            await asyncio.wait_for(self._ready_event.wait(), timeout=timeout)
            return self.session is not None
        except asyncio.TimeoutError:
            return False

    @property
    def is_connected(self) -> bool:
        """检查是否已连接"""
        return self.session is not None

    @property
    def tools(self) -> List[Tool]:
        """获取可用工具列表"""
        return self._tools

    @property
    def resources(self) -> List[Resource]:
        """获取可用资源列表"""
        return self._resources

    @property
    def prompts(self) -> List[Prompt]:
        """获取可用提示词列表"""
        return self._prompts

    def has_tool(self, tool_name: str) -> bool:
        """检查是否有指定工具"""
        return any(t.name == tool_name for t in self._tools)

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """
        调用工具

        Args:
            tool_name: 工具名称
            arguments: 工具参数

        Returns:
            工具调用结果
        """
        if not self.session:
            raise ValueError(f"MCP server '{self.name}' is not connected")

        if not self.has_tool(tool_name):
            available = [t.name for t in self._tools]
            raise ValueError(
                f"Tool '{tool_name}' not found in server '{self.name}'. "
                f"Available tools: {available}"
            )

        logger.debug(f"Calling tool {self.name}.{tool_name} with args: {arguments}")

        # 使用锁保护并发调用（stdio连接不支持并发）
        async with self._lock:
            try:
                result = await self.session.call_tool(tool_name, arguments)
                return result
            except Exception as e:
                logger.error(f"Error calling tool {self.name}.{tool_name}: {e}")
                raise

    async def read_resource(self, uri: str) -> Any:
        """
        读取资源

        Args:
            uri: 资源URI

        Returns:
            资源内容
        """
        if not self.session:
            raise ValueError(f"MCP server '{self.name}' is not connected")

        logger.debug(f"Reading resource {self.name}:{uri}")

        # 使用锁保护并发调用
        async with self._lock:
            try:
                from mcp.types import AnyUrl
                result = await self.session.read_resource(AnyUrl(uri))
                return result
            except Exception as e:
                logger.error(f"Error reading resource {self.name}:{uri}: {e}")
                raise

    async def get_prompt(
        self, prompt_name: str, arguments: Dict[str, Any] = None
    ) -> Any:
        """
        获取提示词

        Args:
            prompt_name: 提示词名称
            arguments: 提示词参数

        Returns:
            提示词内容
        """
        if not self.session:
            raise ValueError(f"MCP server '{self.name}' is not connected")

        logger.debug(f"Getting prompt {self.name}:{prompt_name}")

        # 使用锁保护并发调用
        async with self._lock:
            try:
                result = await self.session.get_prompt(prompt_name, arguments or {})
                return result
            except Exception as e:
                logger.error(f"Error getting prompt {self.name}:{prompt_name}: {e}")
                raise
