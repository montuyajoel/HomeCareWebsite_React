# HomeCare Backend — Uhie API Contracts

**Base URL (production):** `https://backend-home-care-scheduler-api.vercel.app`  
**Base URL (local default):** `http://localhost:5001` (via `VITE_API_URL` / `API_URL`)  
**Frontend client:** `src/services/uhieChatService.js`  
**Ownership:** Azure Foundry credentials and agent calls stay **server-side**. The React app only talks to HomeCare `/api/uhie/*`.

Contracts below combine:

1. Live probes against production (2026-08-27)  
2. Frontend request/response handling in `uhieChatService.js` / `UhieChatWidget.jsx`  
3. Historical Uhie Express proxy shapes (later merged into HomeCare under `/api/uhie/...`)

---

## Common headers

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | **Yes** for `POST /api/uhie/chat` | `Bearer <user JWT>` from `authService.getToken()` after login |
| `Content-Type` | Yes for JSON POST | `application/json` |
| `Authorization` | No for health | Health endpoints are unauthenticated (public liveness) |

CORS (observed on OPTIONS for chat): `Access-Control-Allow-Origin: *`, methods include `GET`, `POST`, etc.

---

## `GET /api/uhie/health`

Shallow liveness + Foundry config flag. Does **not** call Foundry when `deep` is absent.

### Request

```
GET /api/uhie/health
```

No body. No `Authorization` required.

### Success response — `200`

```json
{
  "success": true,
  "status": "ok",
  "service": "uhie-chat",
  "foundryConfigured": true,
  "agentName": "Uhie-Chatbot-Deligator",
  "timestamp": "2026-08-27T12:04:11.971Z"
}
```

| Field | Type | Meaning |
|-------|------|---------|
| `success` | boolean | Envelope flag |
| `status` | string | `"ok"` when process is up |
| `service` | string | `"uhie-chat"` |
| `foundryConfigured` | boolean | Server has Foundry endpoint + agent name wired |
| `agentName` | string \| null | Configured agent name |
| `timestamp` | ISO-8601 string | Server time |

### Error / degraded

Shallow health typically still returns `200` with `foundryConfigured: false` if env is missing (historical behavior). Prefer deep health for reachability failures.

---

## `GET /api/uhie/health?deep=1`

Same as shallow health, plus a live Foundry `agents.get` (or equivalent) to verify the agent is reachable.

### Request

```
GET /api/uhie/health?deep=1
```

Also accepted historically: `deep=true`.

No body. No `Authorization` required.

### Success response — `200`

```json
{
  "success": true,
  "status": "ok",
  "service": "uhie-chat",
  "foundryConfigured": true,
  "agentName": "Uhie-Chatbot-Deligator",
  "timestamp": "2026-08-27T12:04:12.128Z",
  "agent": {
    "name": "Uhie-Chatbot-Deligator",
    "version": "14"
  }
}
```

| Field | Type | Meaning |
|-------|------|---------|
| `agent` | object | Present on successful deep check |
| `agent.name` | string | Foundry agent name |
| `agent.version` | string \| null | Latest agent version when available |

### Degraded / error — `503` (expected when Foundry unreachable or misconfigured)

```json
{
  "success": false,
  "status": "degraded",
  "service": "uhie-chat",
  "foundryConfigured": false,
  "agentName": null,
  "timestamp": "2026-08-27T12:00:00.000Z",
  "error": "FOUNDRY_ENDPOINT and FOUNDRY_AGENT_NAME are required"
}
```

Or with config present but Foundry call failing:

```json
{
  "success": false,
  "status": "degraded",
  "service": "uhie-chat",
  "foundryConfigured": true,
  "agentName": "Uhie-Chatbot-Deligator",
  "timestamp": "2026-08-27T12:00:00.000Z",
  "error": "<Foundry error message>"
}
```

*(Exact `success` boolean on 503 may vary by backend revision; clients should key off HTTP status + `status: "degraded"` / `error`.)*

---

## `POST /api/uhie/chat`

Authenticated chat turn. Backend verifies JWT, builds Foundry input (user context + history + message), invokes the Uhie agent, returns reply text and optional references.

### Request

```
POST /api/uhie/chat
Authorization: Bearer <JWT>
Content-Type: application/json
```

### JSON body (current frontend)

```json
{
  "message": "Who is available Thursday 9-11?",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi, how can I help?" }
  ],
  "user": {
    "fullName": "Jane Smith",
    "employeeCode": "EMP001",
    "role": "admin"
  }
}
```

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `message` | **Yes** | string | Current user utterance (trimmed). Empty → client throws; server should `400` |
| `history` | No | array | Prior turns as `{ role, content }`. Roles: `"user"` \| `"assistant"`. Frontend currently may also include the current turn — **should not** (see improvements) |
| `user` | Sent by FE | object | `{ fullName, employeeCode, role }` from localStorage. **Must not be the sole source of truth** — server should prefer JWT claims |

### User context forwarded to Foundry (server-side)

Historical proxy behavior prepended a context line, e.g.:

```text
Signed-in user context: name=Jane Smith; employeeCode=EMP001; role=admin.
Recent conversation:
user: ...
assistant: ...
User message: Who is available Thursday 9-11?
```

**Recommended ownership:**

| Data | Source of truth |
|------|-----------------|
| `fullName`, `employeeCode`, `role` | Verified JWT claims / DB lookup on backend |
| Body `user` | Optional hint only; ignore or overwrite if mismatch with JWT |
| Schedule / care facts | Backend tools / APIs — never browser→Foundry secrets |

### Success response — `200`

Frontend accepts multiple reply field names; prefer `reply`:

```json
{
  "success": true,
  "reply": "For Thursday 9–11 I can look at caregiver availability…",
  "response": "For Thursday 9–11 I can look at caregiver availability…",
  "references": {
    "1": "HR_Leave_Policy.docx",
    "2": "answersynthesis"
  }
}
```

Alternate reference shapes also normalized by the frontend:

```json
{
  "reply": "…",
  "references": [
    { "id": "1", "label": "HR Leave Policy" }
  ]
}
```

```json
{
  "reply": "…",
  "sources": ["HR_Leave_Policy.docx"]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `reply` | string | Preferred assistant text |
| `response` | string | Alias; FE falls back through `message` / `answer` / `output` |
| `references` / `sources` / `citations` | object \| array | Optional; FE → `[{ id, label }]` capsules |
| `success` | boolean | Optional envelope |

### Error responses

#### Missing token — `401` (live)

```json
{
  "success": false,
  "message": "No token provided. Access denied."
}
```

#### Invalid / expired token — `401` (live)

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

#### Validation — `400` (expected)

```json
{
  "success": false,
  "message": "Message is required"
}
```

or historical `{ "error": "Message is required" }`.

#### Foundry / server failure — `503` / `500` (expected)

```json
{
  "success": false,
  "message": "Foundry is not configured. Set FOUNDRY_ENDPOINT and FOUNDRY_AGENT_NAME on the server.",
  "error": "Foundry is not configured. Set FOUNDRY_ENDPOINT and FOUNDRY_AGENT_NAME on the server."
}
```

Frontend maps `response.data.message` or `response.data.error` into a thrown `Error` for the chat bubble.

### Frontend timeout

Axios timeout: **60_000 ms** for chat POST.

---

## Auth bootstrap (related, not Uhie-specific)

Login used to obtain the JWT Uhie requires:

```
POST /api/auth/login
Content-Type: application/json

{
  "fullName": "Jane Smith",
  "employeeCode": "EMP001",
  "role": "admin"
}
```

Success (as consumed by `authService`): `{ success: true, token, role, message? }` → stored in `localStorage` as `token` + `user`.

---

## Frontend → backend payload improvements (Foundry stays server-side)

These are **contract / client hygiene** recommendations for Agent 2 or backend owners. They do **not** move Foundry into the browser.

1. **Derive `user` from JWT on the server**  
   Stop trusting body `user` for authorization or Foundry identity. Optionally drop `user` from the client payload once JWT claims are complete.

2. **History windowing**  
   Client (and/or server) should send only the last **N** prior turns (e.g. 12). Server should re-enforce the cap.

3. **No duplicate current turn**  
   `history` = prior turns only; `message` = current utterance.

4. **Stable success envelope**  
   Prefer always `{ success, reply, references }` on `200` so the client can drop multi-alias fallbacks over time.

5. **Optional `conversationId`**  
   If HomeCare later stores threads server-side, accept `conversationId` so refresh persistence can be server-backed; until then, FE `sessionStorage` is fine for product item B.

6. **Structured error codes**  
   e.g. `{ success: false, code: "UHIE_UNAUTHENTICATED" | "UHIE_VALIDATION" | "UHIE_FOUNDRY_DOWN", message }` for cleaner FE handling / logout-on-401.

7. **Rate-limit headers** (optional)  
   Expose `Retry-After` when throttled so the widget can show a calm wait state.

8. **Do not add** browser-direct Foundry URLs, API keys, or agent secrets to the React app — keep using `${API_URL}/api/uhie/chat` (or `VITE_UHIE_CHAT_URL` only as a HomeCare-compatible override).

---

## Quick reference for Agent 2

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/uhie/health` | None | Liveness + config flag |
| `GET /api/uhie/health?deep=1` | None | Liveness + Foundry agent reachability |
| `POST /api/uhie/chat` | Bearer JWT | Chat turn; Foundry invoked server-side |

See `docs/UHIE_QUALITY_AUDIT.md` for product checklist items (landing session UX + chat persistence / logout clear).
