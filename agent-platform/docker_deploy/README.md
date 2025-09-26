# FuturX Agent Workspace - Docker部署指南

## 系统信息
- **版本**: v0.05
- **描述**: Agent内容任务平台
- **端口配置**:
  - 前端: 5173
  - 后端: 6173

## 快速开始

### 1. 前置要求
- Docker 20.10+
- Docker Compose 2.0+
- 至少2GB可用内存
- 10GB可用磁盘空间

### 2. 部署步骤

#### 克隆项目
```bash
git clone https://github.com/futur-x/futurx_agent_workspace.git
cd futurx_agent_workspace/docker_deploy
```

#### 配置环境变量
```bash
cp .env.production .env
# 编辑 .env 文件，更新以下配置：
# - JWT_SECRET: 设置一个安全的密钥
# - CORS_ORIGIN: 更新为您的前端地址
# - VITE_API_BASE_URL: 更新为您的后端API地址
```

#### 构建镜像
```bash
chmod +x build.sh
./build.sh
```

#### 启动服务
```bash
chmod +x deploy.sh
./deploy.sh start
```

### 3. 访问应用
- 前端界面: http://服务器IP:5173
- 后端API: http://服务器IP:6173/api

### 4. 默认账户
- 管理员账户:
  - 用户名: admin
  - 密码: admin123
- 测试用户:
  - 用户名: testuser
  - 密码: user123

## 部署脚本使用

### build.sh - 构建脚本
```bash
./build.sh  # 构建Docker镜像
```

### deploy.sh - 部署脚本
```bash
./deploy.sh start    # 启动服务
./deploy.sh stop     # 停止服务
./deploy.sh restart  # 重启服务
./deploy.sh logs     # 查看日志
./deploy.sh status   # 查看状态
./deploy.sh clean    # 清理所有容器和数据
./deploy.sh update   # 更新服务
```

## 配置说明

### 环境变量 (.env)
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NODE_ENV | 运行环境 | production |
| PORT | 后端端口 | 6173 |
| DATABASE_URL | 数据库路径 | file:/app/data/faw.db |
| JWT_SECRET | JWT密钥 | 需要修改 |
| SESSION_EXPIRY | 会话过期时间 | 30m |
| CORS_ORIGIN | 允许的前端地址 | http://localhost:5173 |
| MAX_FILE_SIZE | 最大文件大小 | 10485760 (10MB) |

### 数据持久化
- 数据库: `./data/faw.db`
- 上传文件: `./uploads/`

## 生产环境部署建议

### 1. 安全配置
- **必须**修改JWT_SECRET为强密钥
- 修改默认管理员密码
- 配置防火墙规则

### 2. 性能优化
- 使用外部PostgreSQL替代SQLite
- 配置Redis缓存
- 使用CDN加速静态资源

### 3. HTTPS配置（后续）
建议使用Nginx反向代理配置SSL：
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5173;
    }

    location /api {
        proxy_pass http://localhost:6173;
    }
}
```

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口占用
   lsof -i :5173
   lsof -i :6173
   ```

2. **容器启动失败**
   ```bash
   # 查看详细日志
   docker-compose logs backend
   docker-compose logs frontend
   ```

3. **数据库连接失败**
   ```bash
   # 检查数据目录权限
   chmod -R 755 data/
   ```

4. **前端无法连接后端**
   - 检查CORS_ORIGIN配置
   - 确认防火墙规则
   - 验证后端服务状态

## 备份与恢复

### 备份
```bash
# 备份数据库
cp data/faw.db data/faw_backup_$(date +%Y%m%d).db

# 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

### 恢复
```bash
# 恢复数据库
cp data/faw_backup_20250926.db data/faw.db

# 恢复上传文件
tar -xzf uploads_backup_20250926.tar.gz
```

## 监控建议
- 使用Prometheus + Grafana监控系统性能
- 配置日志收集（ELK Stack）
- 设置健康检查和告警

## 技术支持
- 项目地址: https://github.com/futur-x/futurx_agent_workspace
- 问题反馈: 请在GitHub Issues中提交

---
© 2025 FuturX 版权所有 | Agent内容任务平台 v0.05