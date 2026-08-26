# Uhie Foundry chat backend

Express proxy for the Uhie frontend chat bubble. Azure Foundry credentials stay on the server.

## Setup

```bash
cd backend
cp env.example .env
npm install
npm run dev
```

## Environment

| Variable | Description |
|----------|-------------|
| `PORT` | Listen port (default `5001`) |
| `FOUNDRY_ENDPOINT` | Azure AI Foundry project endpoint |
| `FOUNDRY_AGENT_NAME` | Agent name (e.g. `uhie`) |

Auth uses `DefaultAzureCredential` (`az login`, managed identity, or service principal).

## Endpoints

### `GET /api/health`
Liveness + config flag.

### `GET /api/health?deep=1`
Also calls Foundry `agents.get` to verify the agent is reachable.

### `POST /api/chat`
Body:
```json
{
  "message": "Who is available Thursday 9-11?",
  "history": [{ "role": "user", "content": "..." }],
  "user": {
    "fullName": "Jane Smith",
    "employeeCode": "EMP001",
    "role": "admin"
  }
}
```

Response:
```json
{
  "reply": "...",
  "response": "..."
}
```

Send `Authorization: Bearer <app JWT>` from the React app; Foundry auth is handled by Azure identity on this server.
