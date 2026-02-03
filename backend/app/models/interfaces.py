from datetime import datetime
from typing import Any, Generic, TypeVar, List
from sqlmodel import Field, SQLModel
from pydantic import validator

T = TypeVar('T')

# --- 用户相关 ---
class UserCreate(SQLModel):
    email: str
    password: str
    verification_code: str

class UserLoginPassword(SQLModel):
    email: str
    password: str

class UserLoginCode(SQLModel):
    email: str
    verification_code: str

class UserResetPassword(SQLModel):
    email: str
    verification_code: str
    new_password: str

class UserLoginResponse(SQLModel):
    id: str
    email: str

class UserResponse(SQLModel):
    access_token: str
    user: UserLoginResponse

class UserUpdate(SQLModel):
    password: str | None = None


# --- 邮件验证相关 ---
class AuthEmail(SQLModel):
    email: str

class AuthEmailVerification(SQLModel):
    email: str
    verification_code: str


# --- 对话相关 ---
class MessageCreate(SQLModel):
    role: str
    content: str | None = None


class MessageResponse(SQLModel):
    id: str
    created_at: datetime
    role: str
    content: str | None
    message_type: str = "message"
    tool_call_id: str | None = None
    tool_name: str | None = None
    tool_arguments: str | None = None
    tool_error: bool = False


class ConversationCreate(SQLModel):
    title: str
    model: str = "gpt-4o-mini"


class ConversationResponse(SQLModel):
    id: str
    created_at: datetime
    updated_at: datetime
    title: str
    model: str
    messages: list[MessageResponse] = []


class ConversationUpdate(SQLModel):
    title: str | None = None


# --- Chat流式请求 ---
class ChatStreamRequest(SQLModel):
    conversation_id: str | None = None  # None表示创建新对话
    message: str
    agent: str = "chat"  # Agent名称
    mcp_services: list[str] = []  # 额外启用的MCP服务列表


# --- Assistant Chat请求 ---
class AssistantChatRequest(SQLModel):
    """AI助手聊天请求（仅管理员可用）"""
    message: str  # 用户消息
    conversation_id: str | None = None  # 对话ID，None表示创建新对话


# --- Agent相关 ---
class AgentInfo(SQLModel):
    name: str
    description: str
    model: str
    mcp_services: list[str]


class AgentsListResponse(SQLModel):
    agents: dict[str, AgentInfo]


# --- MCP相关 ---
class MCPToolInfo(SQLModel):
    """MCP工具信息"""
    tool_id: str
    server_name: str
    name: str
    description: str | None = None


class MCPServer(SQLModel):
    """MCP服务器信息"""
    name: str
    description: str = ""
    running: bool = False
    tools: list[MCPToolInfo] = []
    command: str = ""
    args: list[str] = []


# --- Pagination ---
class PaginatedResponse(SQLModel, Generic[T]):
    """Generic paginated response"""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginationParams(SQLModel):
    """Pagination query parameters"""
    page: int = 1
    page_size: int = 20

    @validator('page')
    def validate_page(cls, v):
        if v < 1:
            raise ValueError('Page must be >= 1')
        return v

    @validator('page_size')
    def validate_page_size(cls, v):
        if v < 1:
            raise ValueError('Page size must be >= 1')
        if v > 100:
            raise ValueError('Page size must be <= 100')
        return v


# --- Token ---
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(SQLModel):
    sub: str | None = None
    role: str = "user"
