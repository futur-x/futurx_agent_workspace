# Agent Content Generation Platform

## Overview
A comprehensive platform for managing AI agents and generating content using Dify API integration.

## Features
- 🔐 Password-based authentication
- 🤖 Multiple agent configuration management
- 📝 Task template creation and management
- 📄 File upload support (txt, markdown)
- ⚡ Real-time content generation with streaming
- 📊 Generation history tracking
- 💾 Export functionality for generated content

## Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma, SQLite
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Authentication**: JWT
- **API Integration**: Dify AI Platform

## Prerequisites
- Node.js 18+
- npm or yarn

## Installation

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

- **Backend URL**: http://localhost:7860
- **Frontend URL**: http://localhost:5173
- **Default Password**: admin123 (change in .env file)

## API Documentation

The platform follows the OpenAPI specification defined in `.futurxlab/agent-platform-api-spec.yaml`

### Key Endpoints:
- `POST /api/auth/login` - Authentication
- `GET/POST /api/agents` - Agent management
- `GET/POST /api/tasks` - Task template management
- `POST /api/generation/start` - Start content generation
- `GET /api/generation/stream` - Stream generation results
- `GET /api/history` - View generation history

## Usage

1. **Login**: Use the configured password to access the system
2. **Configure Agents**: Add Dify agent configurations with API URLs and tokens
3. **Create Tasks**: Define prompt templates with placeholders
4. **Generate Content**: Select agent and task, provide input, and generate
5. **View History**: Review and export past generations

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

## Security Considerations

- Change default password in production
- Use strong JWT_SECRET
- Configure proper CORS origins
- Use HTTPS in production
- Regularly update dependencies

## License
Internal use only