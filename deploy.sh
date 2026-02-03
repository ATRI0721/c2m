#!/bin/bash

# Code2MCP Production Deployment Script
# Server: 114.66.57.227

set -e  # Exit on error

# Configuration
SERVER_USER="root"  # Change if needed
SERVER_HOST="114.66.57.227"
PROJECT_DIR="/opt/code2mcp"
REPO_URL="https://github.com/ATRI0721/c2m.git"

echo "=========================================="
echo "Code2MCP Production Deployment"
echo "Server: ${SERVER_HOST}"
echo "=========================================="

# Function to execute command on remote server
remote_exec() {
    ssh "${SERVER_USER}@${SERVER_HOST}" "$@"
}

# Function to copy file to remote server
remote_copy() {
    scp "$1" "${SERVER_USER}@${SERVER_HOST}:$2"
}

echo ""
echo "Step 1: Checking server connection..."
if ! remote_exec "echo 'Connection successful'"; then
    echo "❌ Failed to connect to server. Please check:"
    echo "   - Server is accessible"
    echo "   - SSH key is configured"
    echo "   - User '${SERVER_USER}' has SSH access"
    exit 1
fi
echo "✅ Server connection successful"

echo ""
echo "Step 2: Installing Docker and Docker Compose..."
remote_exec "
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo 'Installing Docker...'
        curl -fsSL https://get.docker.com | sh
        systemctl start docker
        systemctl enable docker
    else
        echo '✅ Docker already installed'
    fi

    # Check if Docker Compose is installed
    if ! command -v docker compose &> /dev/null; then
        echo 'Installing Docker Compose...'
        # Docker Compose v2 is included with Docker
        echo 'Docker Compose should be available with latest Docker'
    else
        echo '✅ Docker Compose already installed'
    fi
"

echo ""
echo "Step 3: Creating project directory..."
remote_exec "mkdir -p ${PROJECT_DIR}"
echo "✅ Project directory created"

echo ""
echo "Step 4: Cloning repository..."
if remote_exec "[ -d ${PROJECT_DIR}/.git ]"; then
    echo "Repository exists, pulling latest changes..."
    remote_exec "cd ${PROJECT_DIR} && git fetch && git reset --hard origin/main"
else
    echo "Cloning repository..."
    remote_exec "git clone ${REPO_URL} ${PROJECT_DIR}"
fi
echo "✅ Repository updated"

echo ""
echo "Step 5: Setting up environment file..."
if remote_exec "[ ! -f ${PROJECT_DIR}/.env ]"; then
    echo "Creating .env from template..."
    remote_exec "cp ${PROJECT_DIR}/.env.production ${PROJECT_DIR}/.env"
    echo "⚠️  Please edit ${PROJECT_DIR}/.env and set:"
    echo "   - SECRET_KEY"
    echo "   - OPENAI_API_KEY"
    echo ""
    read -p "Press Enter after editing .env file..."
else
    echo "✅ .env file exists"
fi

echo ""
echo "Step 6: Setting up firewall..."
remote_exec "
    if command -v ufw &> /dev/null; then
        echo 'Configuring UFW firewall...'
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 22/tcp
        echo '✅ Firewall configured'
    elif command -v firewall-cmd &> /dev/null; then
        echo 'Configuring firewalld...'
        firewall-cmd --permanent --add-port=80/tcp
        firewall-cmd --permanent --add-port=443/tcp
        firewall-cmd --reload
        echo '✅ Firewall configured'
    else
        echo '⚠️  No firewall detected, please manually open ports 80 and 443'
    fi
"

echo ""
echo "Step 7: Stopping existing services..."
remote_exec "cd ${PROJECT_DIR} && docker compose down || true"
echo "✅ Existing services stopped"

echo ""
echo "Step 8: Building and starting services..."
remote_exec "cd ${PROJECT_DIR} && docker compose up -d --build"
echo "✅ Services started"

echo ""
echo "Step 9: Waiting for services to be healthy..."
sleep 10
remote_exec "cd ${PROJECT_DIR} && docker compose ps"

echo ""
echo "Step 10: Checking service health..."
if remote_exec "curl -f http://localhost/health"; then
    echo "✅ Services are healthy"
else
    echo "⚠️  Health check failed, check logs with:"
    echo "   ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${PROJECT_DIR} && docker compose logs -f'"
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Access your application at:"
echo "  Frontend: http://${SERVER_HOST}/"
echo "  API: http://${SERVER_HOST}/api/"
echo "  API Docs: http://${SERVER_HOST}:8000/docs"
echo ""
echo "Useful commands:"
echo "  View logs: ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${PROJECT_DIR} && docker compose logs -f'"
echo "  Restart: ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${PROJECT_DIR} && docker compose restart'"
echo "  Stop: ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${PROJECT_DIR} && docker compose down'"
echo ""
