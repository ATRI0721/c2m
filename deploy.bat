@echo off
REM Code2MCP Production Deployment Script for Windows
REM Server: 114.66.57.227

setlocal enabledelayedexpansion

REM Configuration
set SERVER_USER=root
set SERVER_HOST=114.66.57.227
set PROJECT_DIR=/opt/code2mcp
set REPO_URL=https://github.com/ATRI0721/c2m.git

echo ==========================================
echo Code2MCP Production Deployment
echo Server: %SERVER_HOST%
echo ==========================================
echo.

echo Step 1: Checking SSH connection...
ssh %SERVER_USER%@%SERVER_HOST% "echo 'Connection successful'" >nul 2>&1
if errorlevel 1 (
    echo ❌ Failed to connect to server. Please check:
    echo    - Server is accessible
    echo    - SSH key is configured
    echo    - User '%SERVER_USER%' has SSH access
    pause
    exit /b 1
)
echo ✅ Server connection successful
echo.

echo Step 2: Installing Docker...
ssh %SERVER_USER%@%SERVER_HOST% "command -v docker ^|^| (curl -fsSL https://get.docker.com ^| sh && systemctl start docker && systemctl enable docker)"
echo ✅ Docker check complete
echo.

echo Step 3: Creating project directory...
ssh %SERVER_USER%@%SERVER_HOST% "mkdir -p %PROJECT_DIR%"
echo ✅ Project directory created
echo.

echo Step 4: Cloning repository...
ssh %SERVER_USER%@%SERVER_HOST% "test -d %PROJECT_DIR%/.git ^&^& (cd %PROJECT_DIR% ^&^& git fetch ^&^& git reset --hard origin/main) ^|^| git clone %REPO_URL% %PROJECT_DIR%"
echo ✅ Repository updated
echo.

echo Step 5: Setting up environment file...
ssh %SERVER_USER%@%SERVER_HOST% "test ! -f %PROJECT_DIR%/.env ^&^& cp %PROJECT_DIR%/.env.production %PROJECT_DIR%/.env"
echo ⚠️  Make sure to edit .env file with your SECRET_KEY and OPENAI_API_KEY
echo    ssh %SERVER_USER%@%SERVER_HOST% "nano %PROJECT_DIR%/.env"
echo.

echo Step 6: Opening firewall...
ssh %SERVER_USER%@%SERVER_HOST% "(command -v ufw ^&^& (ufw allow 80/tcp ^&^& ufw allow 443/tcp)) ^|^| (command -v firewall-cmd ^&^& (firewall-cmd --permanent --add-port=80/tcp ^&^& firewall-cmd --permanent --add-port=443/tcp ^&^& firewall-cmd --reload)) ^|^| echo 'Please manually open ports 80 and 443'"
echo ✅ Firewall configured
echo.

echo Step 7: Stopping existing services...
ssh %SERVER_USER}@%SERVER_HOST% "cd %PROJECT_DIR% ^&^& docker compose down" 2>nul
echo ✅ Existing services stopped
echo.

echo Step 8: Building and starting services...
ssh %SERVER_USER%@%SERVER_HOST% "cd %PROJECT_DIR% ^&^& docker compose up -d --build"
echo ✅ Services started
echo.

echo Step 9: Waiting for services to start...
timeout /t 15 /nobreak >nul
ssh %SERVER_USER%@%SERVER_HOST% "cd %PROJECT_DIR% ^&^& docker compose ps"
echo.

echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo Access your application at:
echo   Frontend: http://%SERVER_HOST%/
echo   API: http://%SERVER_HOST%/api/
echo   API Docs: http://%SERVER_HOST%:8000/docs
echo.
echo Useful commands:
echo   View logs:     ssh %SERVER_USER%@%SERVER_HOST% "cd %PROJECT_DIR% ^&^& docker compose logs -f"
echo   Restart:       ssh %SERVER_USER%@%SERVER_HOST% "cd %PROJECT_DIR% ^&^& docker compose restart"
echo   Stop:          ssh %SERVER_USER%@%SERVER_HOST% "cd %PROJECT_DIR% ^&^& docker compose down"
echo   Edit config:   ssh %SERVER_USER%@%SERVER_HOST% "nano %PROJECT_DIR%/.env"
echo.

pause
