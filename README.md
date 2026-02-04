# CityLive

CityLive 是一个 **FastAPI + React** 的多 Agent / 对话平台，并原生集成 MCP（Model Context Protocol）服务，用于扩展外部工具能力。

## 快速开始（Docker，一键启动）

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

验证：

```bash
docker --version
docker compose version
```

### 启动

1) 配置环境变量（仓库根目录）

- **Windows PowerShell**：

```powershell
Copy-Item .\env.example .\.env
```

- **macOS/Linux**：

```bash
cp env.example .env
```

至少需要配置：

- `SECRET_KEY`（必填，生产环境必须改）
- `OPENAI_API_KEY`（需要大模型能力时填写）

生成安全的 `SECRET_KEY`：

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

2) 构建并启动

```bash
docker compose up -d --build
```

3) 访问

- **前端（Nginx）**：`http://localhost`
- **后端 API（直连）**：`http://localhost:8000`
- **后端 API（经 Nginx 代理）**：`http://localhost/api`
- **API 文档**：`http://localhost:8000/docs`
- **健康检查**：`http://localhost/health`

## 本地开发（不走 Docker）

### 后端（FastAPI）

在 `backend/` 下：

```powershell
Copy-Item .\env.example .\.env
pip install -r .\requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> 说明：后端配置从 `backend/.env` 读取（见 `backend/app/core/config.py`）。

### 前端（用户端 UI）

在 `frontend/` 下：

```bash
npm install
npm run dev
```

默认后端地址为 `http://localhost:8000`（可用 `VITE_API_BASE_URL` 覆盖）。

### 管理控制台（MCP/Agent 配置界面）

管理控制台在 `backend/admin_web/`，用于管理 MCP 服务与 Agent 配置：

```bash
cd backend/admin_web
npm install
npm run dev
```

访问：`http://localhost:3000`

> 该控制台开发模式下通过 `vite.config.ts` 提供的 `/local-api/*` 直接读写配置文件（例如 `backend/mcp_servers/config/servers.json`）。

## 架构概览（Docker Compose）

根目录 `docker-compose.yml` 默认启动三层结构：

- **nginx**：端口 80，静态前端 + `/api/*` 反向代理到后端
- **backend**：端口 8000，FastAPI + SQLite（持久化在数据卷）
- **frontend**：构建静态文件，通过 volume 提供给 nginx

## 常用 Docker 命令

```bash
# 启动（后台）
docker compose up -d

# 停止
docker compose down

# 重新构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f

# 查看服务状态
docker compose ps
```

## 故障排除

- **端口占用**：修改根目录 `docker-compose.yml` 的端口映射，例如 `8080:80`、`8001:8000`
- **后端健康检查**：

```bash
curl http://localhost:8000/health
curl http://localhost/health
```

- **清理并重建（会删除数据卷）**：

```bash
docker compose down -v
docker compose up -d --build
```

## 更多文档

- 后端说明：`backend/README.md`
- 后端 API 文档：`backend/API.md`
- MCP 服务目录：`backend/mcp_servers/README.md`


