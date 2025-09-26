# State Diagram - Agent Content Generation Platform

## System State Machine

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated: System Start

    %% Authentication States (#REF-AUTH-01)
    state "Authentication Context" as AuthContext {
        Unauthenticated --> Authenticating: [API: POST /api/auth/login]
        Authenticating --> Authenticated: Valid Password
        Authenticating --> Unauthenticated: Invalid Password
        Authenticated --> SessionActive: Create Session
        SessionActive --> SessionExpired: Timeout > 30min
        SessionExpired --> Unauthenticated: [Auto Logout]
    }

    %% System Configuration States
    state "System Configuration" as ConfigContext {
        state ConfigCheck <<choice>>
        Authenticated --> ConfigCheck
        ConfigCheck --> NoAgents: No Agents Configured
        ConfigCheck --> NoTasks: No Tasks Configured
        ConfigCheck --> SystemReady: All Configured

        NoAgents --> ConfiguringAgent: [API: POST /api/agents]
        ConfiguringAgent --> ValidatingAgent: [API: POST /api/agents/validate]
        ValidatingAgent --> AgentsConfigured: Validation Success
        ValidatingAgent --> NoAgents: Validation Failed

        NoTasks --> ConfiguringTask: [API: POST /api/tasks]
        ConfiguringTask --> ValidatingTemplate: Parse Placeholders
        ValidatingTemplate --> TasksConfigured: Valid Template
        ValidatingTemplate --> NoTasks: Invalid Syntax

        AgentsConfigured --> SystemReady: Tasks Exist
        TasksConfigured --> SystemReady: Agents Exist
    }

    %% Content Generation States (#REF-GEN-01)
    state "Generation Context" as GenContext {
        SystemReady --> GenerationIdle: User on Dashboard
        GenerationIdle --> SelectingInputs: Navigate to Generate

        state "Input Selection" as InputState {
            SelectingInputs --> AgentSelected: [API: GET /api/agents]
            SelectingInputs --> TaskSelected: [API: GET /api/tasks]
            SelectingInputs --> TextEntered: User Input
            SelectingInputs --> FileUploaded: [API: POST /api/upload]

            AgentSelected --> InputsReady: All Required
            TaskSelected --> InputsReady: All Required
            TextEntered --> InputsReady: All Required
            FileUploaded --> FileValidated: [Check Format]
            FileValidated --> InputsReady: Supported Format
            FileValidated --> SelectingInputs: Unsupported Format
        }

        InputsReady --> Generating: [API: POST /api/generation/start]

        state "Generation Process" as GenProcess {
            Generating --> StreamingContent: [API: GET /api/generation/stream]
            StreamingContent --> StreamingContent: Receive Chunk
            StreamingContent --> GenerationComplete: Stream End
            Generating --> GenerationFailed: API Error
            GenerationFailed --> GenerationIdle: Retry/Cancel
        }

        GenerationComplete --> SavingHistory: [Auto Save]
        SavingHistory --> ResultAvailable: [Saved to DB]
        ResultAvailable --> Downloading: [API: GET /api/generation/download]
        Downloading --> GenerationIdle: Complete
        ResultAvailable --> GenerationIdle: User Continue
    }

    %% History Management States (#REF-HISTORY-01)
    state "History Context" as HistoryContext {
        SystemReady --> HistoryIdle: Navigate to History
        HistoryIdle --> LoadingHistory: [API: GET /api/history]
        LoadingHistory --> HistoryLoaded: Success
        LoadingHistory --> HistoryError: Failed
        HistoryError --> HistoryIdle: Retry

        HistoryLoaded --> ViewingDetail: [API: GET /api/history/{id}]
        ViewingDetail --> ExportingHistory: [API: GET /api/history/{id}/export]
        ExportingHistory --> HistoryLoaded: Export Complete
        ViewingDetail --> HistoryLoaded: Back to List
    }

    %% Agent Management States
    state "Agent Management" as AgentMgmtContext {
        SystemReady --> AgentListView: Navigate to Agents
        AgentListView --> EditingAgent: Select Agent
        EditingAgent --> UpdatingAgent: [API: PUT /api/agents/{id}]
        UpdatingAgent --> AgentListView: Update Success
        EditingAgent --> DeletingAgent: Delete Action
        DeletingAgent --> ConfirmDelete: Confirm Dialog
        ConfirmDelete --> AgentListView: [API: DELETE /api/agents/{id}]
        ConfirmDelete --> EditingAgent: Cancel
    }

    %% Task Management States
    state "Task Management" as TaskMgmtContext {
        SystemReady --> TaskListView: Navigate to Tasks
        TaskListView --> EditingTask: Select Task
        EditingTask --> UpdatingTask: [API: PUT /api/tasks/{id}]
        UpdatingTask --> TaskListView: Update Success
        EditingTask --> DeletingTask: Delete Action
        DeletingTask --> ConfirmTaskDelete: Confirm Dialog
        ConfirmTaskDelete --> TaskListView: [API: DELETE /api/tasks/{id}]
        ConfirmTaskDelete --> EditingTask: Cancel
    }

    %% Terminal State
    Unauthenticated --> [*]: System Shutdown
```

## State Transition Rules

### Authentication State Transitions
| Current State | Trigger | API Call | Next State | Condition |
|--------------|---------|----------|------------|-----------|
| Unauthenticated | User Access | - | Authenticating | Always |
| Authenticating | Password Submit | POST /api/auth/login | Authenticated | Valid Password |
| Authenticating | Password Submit | POST /api/auth/login | Unauthenticated | Invalid Password |
| SessionActive | Inactivity | - | SessionExpired | > 30 minutes |
| SessionExpired | Auto Action | - | Unauthenticated | Always |

### Configuration State Transitions
| Current State | Trigger | API Call | Next State | Condition |
|--------------|---------|----------|------------|-----------|
| NoAgents | Add Agent | POST /api/agents | ConfiguringAgent | User Action |
| ConfiguringAgent | Validate | POST /api/agents/validate | AgentsConfigured | Valid Token |
| NoTasks | Add Task | POST /api/tasks | ConfiguringTask | User Action |
| ConfiguringTask | Validate | - | TasksConfigured | Valid Template |

### Generation State Transitions
| Current State | Trigger | API Call | Next State | Condition |
|--------------|---------|----------|------------|-----------|
| GenerationIdle | Navigate | - | SelectingInputs | User Action |
| SelectingInputs | Select Agent | GET /api/agents | AgentSelected | Valid Selection |
| SelectingInputs | Select Task | GET /api/tasks | TaskSelected | Valid Selection |
| SelectingInputs | Input Text | - | TextEntered | Text Present |
| SelectingInputs | Upload File | POST /api/upload | FileUploaded | File Valid |
| InputsReady | Generate | POST /api/generation/start | Generating | All Required |
| Generating | Stream | GET /api/generation/stream | StreamingContent | API Success |
| StreamingContent | Complete | - | GenerationComplete | Stream End |
| GenerationComplete | Auto Save | - | SavingHistory | Always |
| ResultAvailable | Download | GET /api/generation/download | Downloading | User Action |

### History State Transitions
| Current State | Trigger | API Call | Next State | Condition |
|--------------|---------|----------|------------|-----------|
| HistoryIdle | Load | GET /api/history | LoadingHistory | User Navigate |
| LoadingHistory | Success | - | HistoryLoaded | Data Retrieved |
| HistoryLoaded | View Item | GET /api/history/{id} | ViewingDetail | Item Selected |
| ViewingDetail | Export | GET /api/history/{id}/export | ExportingHistory | User Action |

## State Invariants

1. **Authentication Invariant**: No state outside AuthContext is accessible without being Authenticated
2. **Configuration Invariant**: SystemReady requires at least one Agent AND one Task
3. **Generation Invariant**: Generating state requires valid Agent, Task, and Input
4. **History Invariant**: History operations require existing generation records

## State Persistence

States that persist across sessions:
- Agent configurations
- Task templates
- Generation history

States that are session-specific:
- Authentication status
- Current generation progress
- UI navigation state