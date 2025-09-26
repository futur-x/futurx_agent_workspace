# FuturX Agent Workspace - 快速部署指南

## 🚀 一键部署（推荐）

### 前置要求
- Docker 20.10+
- Docker Compose 2.0+
- 2GB可用内存
- 开放端口：5173（前端）、6173（后端API）

### 快速部署步骤

```bash
# 1. 创建项目目录
mkdir -p futurx-agent-workspace && cd futurx-agent-workspace

# 2. 下载docker-compose文件
wget https://raw.githubusercontent.com/elttilz/futurx_agent_workspace/main/docker-compose.production.yml -O docker-compose.yml

# 3. 下载环境变量模板
wget https://raw.githubusercontent.com/elttilz/futurx_agent_workspace/main/.env.example -O .env

# 4. 生成JWT密钥并配置
JWT_SECRET=$(openssl rand -base64 32)
sed -i "s/your-secret-key-change-in-production/$JWT_SECRET/g" .env

# 5. 启动服务
docker-compose up -d

# 6. 查看日志
docker-compose logs -f
```

## 📋 手动部署步骤

### 1. 创建docker-compose.yml

创建文件 `docker-compose.yml`：

```yaml
services:
  backend:
    image: elttilz/futurx_agent_workspace:v0.05-backend
    container_name: faw-backend
    ports:
      - "6173:6173"
    environment:
      - NODE_ENV=production
      - PORT=6173
      - DATABASE_URL=file:/app/data/faw.db
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_EXPIRY=30m
      - CORS_ORIGIN=http://localhost:5173
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    networks:
      - faw-network
    restart: unless-stopped

  frontend:
    image: elttilz/futurx_agent_workspace:v0.05-frontend
    container_name: faw-frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    networks:
      - faw-network
    restart: unless-stopped

networks:
  faw-network:
    driver: bridge
```

### 2. 创建.env文件

```bash
# 创建.env文件
cat > .env << EOF
JWT_SECRET=$(openssl rand -base64 32)
SESSION_EXPIRY=30m
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:5173
EOF
```

### 3. 启动服务

```bash
# 拉取镜像
docker-compose pull

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps
```

## 🔐 默认账户

- **管理员**: admin / admin123
- **测试用户**: testuser / user123

⚠️ **重要**：请在首次登录后立即修改默认密码！

## 🌐 访问地址

- 前端界面：http://服务器IP:5173
- 后端API：http://服务器IP:6173/api
- 健康检查：http://服务器IP:6173/api/health

## 🔧 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并删除数据
docker-compose down -v

# 更新镜像
docker-compose pull
docker-compose up -d

# 备份数据
tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/
```

## 🔒 生产环境配置

### 1. 使用HTTPS（Nginx反向代理）

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 前端
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端API
    location /api {
        proxy_pass http://localhost:6173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. 使用外部数据库（PostgreSQL）

修改.env文件：
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/faw_db
```

### 3. 配置防火墙

```bash
# 只允许特定IP访问
ufw allow from YOUR_IP to any port 5173
ufw allow from YOUR_IP to any port 6173
```

## 🐳 Docker Hub镜像

- 仓库地址：https://hub.docker.com/r/elttilz/futurx_agent_workspace
- 可用标签：
  - `v0.05` - 当前稳定版本
  - `v0.05-backend` - 后端镜像
  - `v0.05-frontend` - 前端镜像
  - `latest` - 最新版本

## ❓ 故障排除

### 容器启动失败
```bash
# 查看详细日志
docker-compose logs backend
docker-compose logs frontend
```

### 端口被占用
```bash
# 检查端口
lsof -i :5173
lsof -i :6173

# 修改docker-compose.yml中的端口映射
# 例如：改为 "8080:5173" 和 "8081:6173"
```

### 数据库连接失败
```bash
# 检查数据目录权限
chmod -R 755 data/

# 重新创建数据目录
docker-compose down -v
docker-compose up -d
```

## 📞 技术支持

- GitHub: https://github.com/elttilz/futurx_agent_workspace
- Docker Hub: https://hub.docker.com/r/elttilz/futurx_agent_workspace

---
© 2025 FuturX | Agent内容任务平台 v0.05