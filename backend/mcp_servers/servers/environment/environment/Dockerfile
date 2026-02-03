FROM python:3.12-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY server.py .

# 设置环境变量
ENV PYTHONUNBUFFERED=1

# 暴露端口（如果使用SSE传输）
# EXPOSE 8000

# 运行MCP服务器
CMD ["python", "server.py"]
