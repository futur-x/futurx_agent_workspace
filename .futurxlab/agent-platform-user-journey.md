# User Journey - Agent Content Generation Platform

## Journey Overview
This user journey captures the complete flow of using the Agent Content Generation Platform from authentication to content generation and history management.

```mermaid
journey
    title Agent Content Generation Platform - User Journey
    section Authentication
      Access System: 5: User
      Enter Password: 3: User
      Verify Credentials {API: POST /api/auth/login}: 5: System
      Grant Access: 5: System
      Redirect to Dashboard: 5: System

    section Agent Configuration
      Navigate to Agent Management: 5: User
      Click Add Agent {API: GET /api/agents}: 4: User
      Fill Agent Details: 3: User
      Submit Configuration {API: POST /api/agents}: 4: System
      Validate API Token {API: POST /api/agents/validate}: 5: System
      Save Agent Config: 5: System

    section Task Template Setup
      Navigate to Task Templates: 5: User
      Click Add Task {API: GET /api/tasks}: 4: User
      Enter Task Name: 3: User
      Write Prompt Template: 2: User
      Validate Placeholders: 5: System
      Save Task Template {API: POST /api/tasks}: 5: System

    section Content Generation
      Navigate to Generation Page: 5: User
      Select Agent {API: GET /api/agents}: 5: User
      Select Task {API: GET /api/tasks}: 5: User
      Input Text Content: 3: User
      Upload File (Optional) {API: POST /api/upload}: 4: User
      Click Generate {API: POST /api/generation/start}: 5: User
      View Streaming Results {API: GET /api/generation/stream}: 5: System
      Download Result {API: GET /api/generation/download}: 5: User

    section History Management
      Navigate to History: 5: User
      View History List {API: GET /api/history}: 5: System
      Click History Item {API: GET /api/history/{id}}: 4: User
      View Full Content: 5: System
      Export History {API: GET /api/history/{id}/export}: 4: User
```

## Key Decision Points

1. **Authentication Gate** (#REF-AUTH-01)
   - Decision: Valid password?
   - Success → Dashboard
   - Failure → Error message + retry

2. **Agent Validation** (#REF-AGENT-01)
   - Decision: Valid API token?
   - Success → Save configuration
   - Failure → Show validation error

3. **Template Validation** (#REF-TASK-01)
   - Decision: Valid placeholder syntax?
   - Success → Save template
   - Failure → Show syntax error

4. **Content Generation** (#REF-GEN-01)
   - Decision: All required inputs provided?
   - Success → Start generation
   - Failure → Show missing input error

5. **File Upload** (#REF-UPLOAD-01)
   - Decision: Supported file format?
   - Success → Parse and display content
   - Failure → Show format error

## Business Logic Mapping

| Journey Step | API Endpoint | State Transition | Sequence Actor |
|-------------|--------------|------------------|----------------|
| Enter Password | POST /api/auth/login | Unauthenticated → Authenticated | User → System |
| Add Agent | POST /api/agents | NoAgents → AgentsConfigured | Admin → System |
| Add Task | POST /api/tasks | NoTasks → TasksConfigured | User → System |
| Generate Content | POST /api/generation/start | Ready → Generating | User → Dify |
| View History | GET /api/history | Idle → ViewingHistory | User → System |

## Success Metrics Alignment
- Authentication success rate > 99%
- Agent configuration success > 95%
- Content generation success > 95%
- User completes flow in < 5 minutes