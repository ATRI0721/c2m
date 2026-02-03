# 服务器部署指南

**服务器信息**: 114.66.57.227

## 前置要求

1. **SSH 访问权限** - 需要服务器的 SSH 访问权限
2. **域名（可选）** - 如果要使用域名，需要先配置 DNS
3. **OpenAI API Key** - 必需，用于 AI 功能

## 快速部署（Windows）

### 方法 1: 使用自动化脚本（推荐）

1. **配置 SSH 密钥**（首次使用）

   在本地 Windows 机器上生成 SSH 密钥：
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

   将公钥复制到服务器：
   ```bash
   type %USERPROFILE%\.ssh\id_ed25519.pub | ssh root@114.66.57.227 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
   ```

2. **运行部署脚本**

   双击运行 `deploy.bat` 或在命令行中：
   ```bash
   deploy.bat
   ```

3. **配置环境变量**

   部署完成后，SSH 到服务器编辑配置：
   ```bash
   ssh root@114.66.57.227
   nano /opt/code2mcp/.env
   ```

   **必须修改的配置**:
   - `SECRET_KEY`: 生成安全的密钥
     ```bash
     python3 -c "import secrets; print(secrets.token_urlsafe(32))"
     ```
   - `OPENAI_API_KEY`: 你的 OpenAI API 密钥

4. **重启服务**

   ```bash
   cd /opt/code2mcp
   docker compose restart
   ```

### 方法 2: 手动部署

#### 步骤 1: 连接到服务器

```bash
ssh root@114.66.57.227
```

#### 步骤 2: 安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker compose version
```

#### 步骤 3: 克隆代码

```bash
# 创建项目目录
mkdir -p /opt/code2mcp
cd /opt/code2mcp

# 克隆仓库
git clone https://github.com/ATRI0721/c2m.git .

# 或者如果已有仓库，拉取最新代码
git pull origin main
```

#### 步骤 4: 配置环境变量

```bash
# 复制环境变量模板
cp .env.production .env

# 编辑环境变量
nano .env
```

**必须配置**:
```bash
SECRET_KEY=your-secure-random-key-here
OPENAI_API_KEY=sk-your-openai-api-key-here
```

生成 SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### 步骤 5: 配置防火墙

```bash
# 如果使用 UFW (Ubuntu)
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw reload

# 如果使用 firewalld (CentOS)
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

#### 步骤 6: 启动服务

```bash
# 构建并启动所有服务
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

#### 步骤 7: 设置开机自启

```bash
# 复制 systemd 服务文件
cp code2mcp.service /etc/systemd/system/

# 启用服务
systemctl daemon-reload
systemctl enable code2mcp
systemctl start code2mcp

# 检查状态
systemctl status code2mcp
```

## 验证部署

部署完成后，访问：

- **前端**: http://114.66.57.227/
- **API**: http://114.66.57.227/api/
- **API 文档**: http://114.66.57.227:8000/docs
- **健康检查**: http://114.66.57.227/health

## 常用管理命令

### 查看日志

```bash
# 所有服务
ssh root@114.66.57.227 "cd /opt/code2mcp && docker compose logs -f"

# 特定服务
ssh root@114.66.57.227 "cd /opt/code2mcp && docker compose logs -f backend"
ssh root@114.66.57.227 "cd /opt/code2mcp && docker compose logs -f nginx"
```

### 重启服务

```bash
# 重启所有服务
ssh root@114.66.57.227 "cd /opt/code2mcp && docker compose restart"

# 重启特定服务
ssh root@114.66.57.227 "cd /opt/code2mcp && docker compose restart backend"
```

### 更新代码

```bash
# 拉取最新代码
ssh root@114.66.57.227 "cd /opt/code2mcp && git pull"

# 重新构建并启动
ssh root@114.66.57.227 "cd /opt/code2mcp && docker compose up -d --build"
```

### 停止服务

```bash
ssh root@114.66.57.227 "cd /opt/code2mcp && docker compose down"
```

### 备份数据

```bash
# 备份 SQLite 数据库
ssh root@114.66.57.227 "cd /opt/code2mcp && docker cp code2mcp-backend:/app/data/app.db ./backup-$(date +%Y%m%d).db"

# 下载到本地
scp root@114.66.57.227:/opt/code2mcp/backup-*.db ./
```

## 故障排查

### 问题 1: 端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep :80

# 如果被占用，停止占用端口的服务
systemctl stop nginx  # 如果有其他 nginx
```

### 问题 2: 容器无法启动

```bash
# 查看详细日志
docker compose logs backend
docker compose logs nginx

# 检查容器状态
docker compose ps -a

# 重新构建
docker compose down
docker compose up -d --build
```

### 问题 3: 网络连接问题

```bash
# 检查防火墙状态
ufw status
# 或
firewall-cmd --list-all

# 检查 Docker 网络
docker network ls
docker network inspect code2mcp-code2mcp-network
```

### 问题 4: 数据库权限问题

```bash
# 修复数据库文件权限
docker compose exec backend chown -R appuser:appuser /app/data
```

### 问题 5: API 无法访问

```bash
# 检查后端健康状态
curl http://localhost:8000/health

# 检查 Nginx 配置
docker compose exec nginx nginx -t

# 查看 Nginx 日志
docker compose logs nginx
```

## 生产环境建议

### 1. 使用 HTTPS（推荐）

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
apt update
apt install certbot python3-certbot-nginx -y

# 获取证书
certbot --nginx -d your-domain.com

# 自动续期
certbot renew --dry-run
```

### 2. 配置域名

修改 `nginx/nginx.conf`:
```nginx
server_name your-domain.com www.your-domain.com;
```

### 3. 使用 PostgreSQL

对于生产环境，建议使用 PostgreSQL：

修改 `.env`:
```bash
DATABASE_URL=postgresql://code2mcp:password@db:5432/code2mcp
```

修改 `docker-compose.yml` 添加数据库服务。

### 4. 定期备份

设置定时任务：

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点备份数据库
0 2 * * * cd /opt/code2mcp && docker exec code2mcp-backend cp /app/data/app.db /app/data/backup-$(date +\%Y\%m\%d).db
```

### 5. 监控

安装监控工具：

```bash
# 安装 htop
apt install htop -y

# 监控 Docker 资源
docker stats
```

## 安全建议

1. **修改默认端口** - 不要使用默认的 22 端口
2. **配置防火墙** - 只开放必要的端口
3. **使用强密码** - 所有密码都使用强密码
4. **定期更新** - 定期更新系统和 Docker 镜像
5. **配置 Fail2Ban** - 防止暴力破解
6. **禁用 root 登录** - 创建普通用户并使用 sudo

## 性能优化

### 1. 限制容器资源

修改 `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### 2. 使用 Docker 缓存

Docker 会自动缓存构建层，无需额外配置。

### 3. 日志轮转

创建 `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

重启 Docker:
```bash
systemctl restart docker
```

## 联系方式

如有问题，请查看：
- [Docker 部署文档](DOCKER.md)
- [项目 README](README.md)
- [API 文档](API.md)
