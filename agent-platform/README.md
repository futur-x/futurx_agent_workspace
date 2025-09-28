# FuturX Agent Workspace

## Overview
A comprehensive platform for managing AI agents and generating content using Dify API integration. Production-ready with Docker support and multi-architecture builds.

## 🚀 Latest Version: v0.058

### What's New in v0.058
- **User Permission Management**: Fine-grained control over agent and task access per user
- **SSE Connection Improvements**: Heartbeat mechanism prevents timeouts during long generations
- **Bug Fixes**: Resolved validation errors when updating agents and task templates
- **Docker Enhancements**: Multi-architecture support (AMD64/ARM64)

## Features
- 🔐 Role-based authentication (Admin/User)
- 👥 User permission management system
- 🤖 Multiple agent configuration management
- 📝 Task template creation with dynamic placeholders
- 📄 File upload support (txt, markdown)
- ⚡ Real-time content generation with SSE streaming
- 📊 Generation history tracking
- 💾 Export functionality for generated content
- 🐳 Production-ready Docker deployment

## Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma, SQLite
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Authentication**: JWT
- **API Integration**: Dify AI Platform

## Prerequisites
- Node.js 18+
- npm or yarn

## Quick Start with Docker 🐳

### Docker Hub Images
```bash
# Pull the latest images
docker pull elttilz/futurx-agent-backend:v0.058
docker pull elttilz/futurx-agent-frontend:v0.058

# Or use docker-compose
wget https://raw.githubusercontent.com/futur-x/futurx_agent_workspace/main/docker_deploy/docker-compose.production.yml
docker-compose -f docker-compose.production.yml up -d
```

### Environment Variables for Docker
Create a `.env` file:
```env
JWT_SECRET=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

## Local Development Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cd backend
cp .env.example .env
# Edit .env file with your configuration
```

4. Initialize database:
```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed  # Creates admin user
```

## Running the Application

### Development Mode

Start both backend and frontend:
```bash
npm run dev
```

Or start them separately:

Backend (runs on port 7860):
```bash
npm run dev:backend
```

Frontend (runs on port 5173):
```bash
npm run dev:frontend
```

### Production Mode

Build the application:
```bash
npm run build
```

Start the server:
```bash
npm start
```

## Default Configuration

- **Backend URL**: http://localhost:6173
- **Frontend URL**: http://localhost:5173
- **Default Admin**: Username: `admin`, Password: `admin123` (change via environment variables)
- **Default User Role**: No permissions (must be granted by admin)

## API Documentation

The platform follows the OpenAPI specification defined in `.futurxlab/agent-platform-api-spec.yaml`

### Key Endpoints:
- `POST /api/auth/login` - Authentication
- `GET/POST /api/users` - User management (admin only)
- `GET/PUT /api/users/:id/permissions` - User permission management (admin only)
- `GET/POST /api/agents` - Agent management
- `GET/POST /api/tasks` - Task template management
- `POST /api/generation/start` - Start content generation (SSE)
- `GET /api/generation/:id` - Get generation details
- `GET /api/history` - View generation history

## Usage

### For Administrators:
1. **Login**: Use admin credentials to access the system
2. **Manage Users**: Create users and configure their permissions
3. **Configure Agents**: Add Dify agent configurations with API URLs and tokens
4. **Create Tasks**: Define prompt templates with placeholders
5. **Assign Permissions**: Control which agents and tasks each user can access

### For Regular Users:
1. **Login**: Use provided credentials
2. **Generate Content**: Select from available agents and tasks (based on permissions)
3. **Upload Files**: Attach context files for generation
4. **View History**: Review and export your past generations

## Project Structure

```
agent-platform/
├── backend/              # Express API server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Express middleware
│   │   └── validators/  # Input validation
│   ├── prisma/          # Database schema
│   └── package.json
├── frontend/            # React application
│   ├── src/
│   │   ├── pages/       # Route components
│   │   ├── components/  # Reusable components
│   │   ├── contexts/    # React contexts
│   │   └── utils/       # Utilities
│   └── package.json
└── package.json         # Root package file
```

## Development

### Database Management
```bash
# View database
cd backend
npx prisma studio

# Create migration
npx prisma migrate dev --name your_migration_name

# Reset database
npx prisma migrate reset
```

### Testing
```bash
# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change ports in backend `.env` and frontend `vite.config.ts`
2. **Database errors**: Run `npx prisma migrate reset` to reset the database
3. **Authentication issues**: Check JWT_SECRET in .env file
4. **CORS errors**: Verify CORS_ORIGIN in backend .env matches frontend URL
5. **Docker image not found**: Use correct image names:
   - Backend: `elttilz/futurx-agent-backend:v0.058`
   - Frontend: `elttilz/futurx-agent-frontend:v0.058`
6. **SSE connection timeout**: v0.058 includes heartbeat mechanism to prevent timeouts

## Security Considerations

- Change default admin credentials in production
- Use strong JWT_SECRET (minimum 32 characters)
- Configure proper CORS origins
- Use HTTPS in production
- Regularly update dependencies
- New users have no permissions by default (principle of least privilege)
- Admin accounts bypass permission checks - use with caution

## Version History

- **v0.058** - User permission management, SSE improvements, bug fixes
- **v0.057** - Docker deployment enhancements
- **v0.056** - Initial Docker support
- **v0.055** - Core platform features

## Contributing

Please submit issues and pull requests to the [GitHub repository](https://github.com/futur-x/futurx_agent_workspace).

## License
MIT License - See LICENSE file for details