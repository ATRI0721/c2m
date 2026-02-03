from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # ------------------ 可选项 ------------------
    API_V1_STR: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: str = "http://localhost,http://localhost:80,http://localhost:5173,http://localhost:5174"

    DATABASE_URL: str = "sqlite:///./data/app.db"

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 3 * 24 * 60  # 3 days

    # ------------------ 必填项（必须传入环境变量） ------------------
    SECRET_KEY: str = Field(..., description="JWT secret key")

    # ------------------ 大模型配置 ------------------
    DEFAULT_MODEL: str = Field(default="gpt-4o-mini", description="Default chat model")
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key")
    OPENAI_BASE_URL: str = Field(default="https://api.openai.com/v1", description="OpenAI base URL")

    # ------------------ MCP配置 ------------------
    MCP_SERVERS_CONFIG: str = Field(default="{}", description="MCP servers config JSON")
    # 启动时跳过的MCP服务器列表
    MCP_SKIP_SERVERS: list[str] = Field(
        default=[],
        description="启动时跳过的MCP服务器列表（例如有问题的服务器）"
    )

    # ------------------ 管理员配置 ------------------
    # 管理员邮箱列表（具有完整权限的用户）
    ADMIN_EMAILS: list[str] = Field(
        default=["Admin@localhost"],
        description="管理员邮箱列表，这些用户可以访问所有Agent和MCP服务"
    )

    # ------------------ 白名单配置 ------------------
    # 公开可见的Agent列表（不包含敏感配置管理的agent）
    PUBLIC_AGENTS: list[str] = Field(
        default=["chat", "city", "weather", "code"],
        description="前端可以访问的Agent白名单"
    )
    # 公开可见的MCP服务器列表（不包含config-admin等敏感服务）
    PUBLIC_MCP_SERVERS: list[str] = Field(
        default=[
            "environment", "usgs-quakes", "geocoding", "osm",
            "overpass", "opentripmap", "wikidata", "population",
            "opengov", "exchange-rate"
        ],
        description="前端可以访问的MCP服务器白名单"
    )
    # 具有完整权限的Agent（可以访问所有配置）
    ADMIN_AGENTS: list[str] = Field(
        default=["assistant"],
        description="具有管理员权限的Agent，可以访问所有配置和敏感MCP服务"
    )

    # ------------------ 日志配置 ------------------
    LOG_LEVEL: str = "INFO"

    # ------------------ 配置 ------------------
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
