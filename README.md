# FuturX Agent Workspace

An intelligent Agent Content Generation Platform that integrates with Dify AI for automated content creation and management.

## 🚀 Features

- **Multi-Agent Support**: Configure and manage multiple Dify AI agents with different capabilities
- **Task Template System**: Create reusable prompt templates with dynamic placeholders
- **File Processing**: Support for .txt and .md file uploads with content extraction
- **Real-time Generation**: Stream content generation with SSE (Server-Sent Events)
- **History Management**: Track, view, and export all generation history
- **Secure Access**: Password-protected authentication system

## 📁 Project Structure

```
agent_workspace/
├── .futurxlab/              # Architecture documentation
│   ├── agent-platform-user-journey.md
│   ├── agent-platform-sequence-diagram.md
│   ├── agent-platform-state-diagram.md
│   ├── agent-platform-api-spec.yaml
│   └── agent-platform-mapping-matrix.md
├── agent-platform/          # Main application
│   ├── backend/            # Node.js/Express backend
│   └── frontend/           # React frontend
└── dev_requirements.md     # Development requirements document
```

## 🛠 Technology Stack

### Backend
- Node.js with TypeScript
- Express.js framework
- Prisma ORM with SQLite
- JWT authentication
- SSE for real-time streaming

### Frontend
- React 18 with TypeScript
- Vite build tool
- React Query for data fetching
- React Router for navigation
- TailwindCSS for styling

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/futur-x/futurx_agent_workspace.git
cd futurx_agent_workspace
```

2. Install backend dependencies:
```bash
cd agent-platform/backend
npm install
```

3. Set up the database:
```bash
npm run db:migrate
npm run db:seed  # Optional: seed with sample data
```

4. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

5. Start the development servers:

Backend (in one terminal):
```bash
cd agent-platform/backend
npm run dev
```

Frontend (in another terminal):
```bash
cd agent-platform/frontend
npm run dev
```

## 🚀 Usage

1. Open your browser and navigate to http://localhost:5173
2. Login with the default password: `admin123`
3. Configure your first Dify agent with API credentials
4. Create task templates with prompt patterns
5. Generate content by selecting agent + task and providing input

## 🔧 Configuration

### Environment Variables

Backend (.env):
```env
NODE_ENV=development
PORT=7861
JWT_SECRET=your-secret-key
DATABASE_URL="file:./dev.db"
```

Frontend (.env):
```env
VITE_API_URL=http://localhost:7861/api
```

## 📝 API Documentation

The complete OpenAPI specification is available at:
`.futurxlab/agent-platform-api-spec.yaml`

Key endpoints:
- `POST /api/auth/login` - User authentication
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create new agent
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task
- `POST /api/generation/start` - Start content generation
- `GET /api/generation/stream` - SSE stream for generation results

## 🏗 Architecture

The system follows the Business Logic Conservation principle with perfect bidirectional mapping between:
- User Journey (Business View)
- Sequence Diagram (Temporal View)
- State Diagram (State View)
- OpenAPI Specification (Implementation View)

See `.futurxlab/` directory for complete architectural documentation.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- FuturX Development Team

## 🙏 Acknowledgments

- Built with Claude AI assistance
- Powered by Dify AI platform

---

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>