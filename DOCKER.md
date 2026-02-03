# Docker 部署指南

本文档介绍如何使用Docker部署Code2MCP项目。

## 目录

- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [服务说明](#服务说明)
- [常用命令](#常用命令)
- [生产部署](#生产部署)
- [故障排除](#故障排除)

## 前置要求

确保已安装以下软件：

- Docker (20.10+)
- Docker Compose (2.0+)

验证安装：

```bash
docker --version
docker compose version
```

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd code2mcp
```

### 2. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，设置必要的配置
# 至少需要配置:
# - SECRET_KEY (生产环境必须修改)
# - OPENAI_API_KEY
```

生成安全的 SECRET_KEY：

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. 启动服务

```bash
# 构建并启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 4. 访问应用

- **前端**: http://localhost （通过 Nginx）
- **后端API**: http://localhost:8000 （直接访问）或 http://localhost/api （通过 Nginx 代理）
- **API文档**: http://localhost:8000/docs
- **健康检查**: http://localhost/health

## 架构说明

Code2MCP 采用以下三层架构：

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (Port 80)                       │
│  - 反向代理 /api/* 请求到 Backend                        │
│  - 静态服务前端文件                                      │
└─────────────────────────────────────────────────────────┘
         │                                    │
         │ /api/*                             │ / (其他)
         ▼                                    ▼
┌─────────────────────┐         ┌─────────────────────────┐
│  Backend (Port 8000) │         │  Frontend (Static Files) │
│  - FastAPI          │         │  - React + Vite 构建     │
│  - SQLite Database  │         └─────────────────────────┘
└─────────────────────┘
```

**服务说明：**

- **Nginx**: 统一入口，处理静态文件服务和 API 反向代理
- **Backend**: FastAPI 应用，提供 RESTful API
- **Frontend**: 静态文件容器，生成 React 构建产物

## 环境配置

### 必需配置

| 变量 | 说明 | 示例 |
|------|------|------|
| `SECRET_KEY` | JWT密钥（生产环境必须修改） | `your-secret-key-here` |
| `OPENAI_API_KEY` | OpenAI API密钥 | `sk-...` |

### 可选配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENAI_BASE_URL` | OpenAI API基础URL | `https://api.openai.com/v1` |
| `DEFAULT_MODEL` | 默认AI模型 | `gpt-4o-mini` |
| `FRONTEND_URL` | 前端URL（用于CORS） | `http://localhost` |
| `ALLOWED_ORIGINS` | 允许的CORS源 | `http://localhost,http://localhost:80` |
| `DATABASE_URL` | 数据库连接URL | `sqlite:///./data/app.db` |
| `LOG_LEVEL` | 日志级别 | `INFO` |

完整配置选项请参考 [`.env.example`](.env.example) 文件。

## 服务说明

### Backend (code2mcp-backend)

FastAPI后端服务，提供：

- RESTful API
- WebSocket支持
- MCP服务集成
- JWT认证
- 数据库持久化

**端口**: 8000

**健康检查**: 每30秒检查一次

### Frontend (code2mcp-frontend)

React前端静态文件，提供：

- 用户界面
- 实时聊天
- 管理面板

**说明**: 使用多阶段构建生成静态文件，由 Nginx 服务

### Nginx (code2mcp-nginx)

Nginx反向代理和静态文件服务，提供：

- 统一入口（端口80）
- 静态文件服务（前端）
- API反向代理（/api/* → Backend）
- Gzip压缩
- 缓存控制

**端口**: 80

**健康检查**: 每30秒检查一次

## 常用命令

### 启动和停止

```bash
# 启动所有服务（后台运行）
docker compose up -d

# 启动所有服务（前台运行，查看日志）
docker compose up

# 停止所有服务
docker compose down

# 停止并删除数据卷
docker compose down -v

# 重启服务
docker compose restart

# 重启特定服务
docker compose restart backend
```

### 查看日志

```bash
# 查看所有服务日志
docker compose logs

# 实时跟踪日志
docker compose logs -f

# 查看特定服务日志
docker compose logs backend
docker compose logs nginx
docker compose logs frontend

# 查看最近100行日志
docker compose logs --tail=100
```

### 构建和更新

```bash
# 重新构建镜像
docker compose build

# 重新构建并启动
docker compose up -d --build

# 强制重新构建（不使用缓存）
docker compose build --no-cache
```

### 进入容器

```bash
# 进入后端容器
docker compose exec backend sh

# 进入前端容器
docker compose exec frontend sh
```

### 查看状态

```bash
# 查看服务状态
docker compose ps

# 查看资源使用情况
docker stats
```

## 生产部署

### 1. 使用PostgreSQL数据库

更新 `docker-compose.yml` 和 `.env`：

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: code2mcp
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: code2mcp
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - code2mcp-network

  backend:
    # ...
    depends_on:
      - db
```

```bash
# .env
DATABASE_URL=postgresql://code2mcp:password@db:5432/code2mcp
```

### 2. 配置反向代理

使用Nginx作为反向代理：

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - code2mcp-network
```

### 3. 安全建议

- **修改SECRET_KEY**: 生成并使用强随机密钥
- **限制CORS**: 只允许可信任的域名
- **使用HTTPS**: 在生产环境启用SSL/TLS
- **定期更新**: 保持Docker镜像和依赖项最新
- **备份**: 定期备份数据库和数据卷

### 4. 数据备份

```bash
# 备份SQLite数据库
docker compose exec backend cp /app/data/app.db /app/data/backup.db

# 备份数据卷
docker run --rm -v code2mcp_backend-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data
```

## 故障排除

### 容器无法启动

```bash
# 查看容器日志
docker compose logs backend
docker compose logs frontend

# 检查容器状态
docker compose ps -a
```

### 端口已被占用

如果端口冲突，修改 `docker-compose.yml` 中的端口映射：

```yaml
services:
  backend:
    ports:
      - "8001:8000"  # 使用8001端口
  nginx:
    ports:
      - "8080:80"  # 使用8080端口
```

### 数据库连接问题

```bash
# 检查数据库文件权限
docker compose exec backend ls -la /app/data/

# 重新创建数据库
docker compose down -v
docker compose up -d
```

### 前端无法连接后端

1. 检查 `VITE_API_URL` 环境变量（构建时设置）
2. 检查后端的 `ALLOWED_ORIGINS` 配置
3. 确认后端服务健康状态

```bash
curl http://localhost:8000/health
curl http://localhost/health
```

### Nginx 无法访问前端静态文件

1. 检查 nginx 容器状态：
   ```bash
   docker compose logs nginx
   ```

2. 确认静态文件卷已正确挂载：
   ```bash
   docker exec code2mcp-nginx ls -la /usr/share/nginx/html
   ```

3. 重新构建前端：
   ```bash
   docker compose up -d --build frontend
   ```

### MCP服务器连接问题

```bash
# 查看后端日志中的MCP初始化信息
docker compose logs backend | grep MCP

# 检查MCP服务器配置
docker compose exec backend ls -la /app/mcp_servers/config/
```

### 清理和重建

```bash
# 完全清理（包括数据）
docker compose down -v
docker system prune -a

# 重新构建和启动
docker compose up -d --build
```

## 性能优化

### 1. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 2. 使用多阶段构建

已使用多阶段构建来减小镜像大小：
- Frontend: deps → builder → runner
- Backend: builder → runtime

### 3. 启用缓存

Docker会缓存构建层，修改代码后重新构建时会更快。

## 开发模式

如需热重载开发，可以使用卷挂载：

```yaml
services:
  backend:
    volumes:
      - ./backend/app:/app/app:ro  # 代码热重载
  frontend:
    volumes:
      - ./frontend/src:/app/src:ro  # 代码热重载
```

注意：生产环境不建议使用卷挂载。

## 更多信息

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [项目README](README.md)
- [API文档](API.md)
