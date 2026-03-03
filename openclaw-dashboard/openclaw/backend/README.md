# OpenClaw Dashboard Channel: Backend (Express)

## API Endpoints (stubs)
- `/api/chat` — Agent chat/messages
- `/api/agents` — List/manage agents
- `/api/skills` — List/manage skills
- `/api/cron` — List/manage cron jobs
- `/api/sessions` — List/review sessions

## Getting Started
1. `cd backend`
2. `npm install`
3. Populate `.env` (or export environment variables) with your Postgres credentials, `OPENAI_API_KEY`, and optionally `MEMORY_AGENT_ID` to tag stored memories.
4. `npm start`

The server automatically ensures three persistence tables on boot:
- `conversations`/`conversation_messages` store the raw thread.
- `agent_memories` keeps a vector-ready history for retrieval-augmented workflows.
