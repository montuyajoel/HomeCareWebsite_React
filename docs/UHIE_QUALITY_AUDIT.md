# Uhie / Session Quality Audit

**Repo:** HomeCareWebsite_React (`/workspace`)  
**Auditor:** Efficiency and Quality Agent  
**Date:** 2026-08-27  
**Scope:** Analysis only — no application source changes in this pass.

---

## Overall quality score: **64%**

**Justification:** Uhie is correctly gated to authenticated, non-public routes; logout clears chat via `auth:logout`; Foundry stays server-side through `/api/uhie/chat`; and the chat UI/CSS are coherent. Score is held down by missing mandatory product UX (welcome page still offers caregiver/admin login while a session is active; chat context does not survive refresh), client-trusted identity in the chat payload, unbounded history resent on every turn, and JWT “session” checks that only test localStorage presence (no expiry / server validation).

| Area | Score | Notes |
|------|------:|-------|
| Architecture / Foundry ownership | 82% | Backend owns Foundry; frontend is a thin client |
| Auth & security hygiene | 52% | JWT in localStorage; body `user` spoofable; no token expiry check |
| Session / landing UX | 48% | Navbar handles authed state; Landing CTAs and login pages do not |
| Uhie chat product completeness | 58% | Logout clear works; refresh persistence missing |
| Efficiency / React patterns | 66% | Full history replay; auth sync via multiple effects; dead `isConfigured` |
| Code clarity | 74% | Services are readable; some duplicated auth header patterns elsewhere |

---

## Guardrails (for Agent 2)

- **Preserve existing functionality.** Do not change Foundry ownership, chat API path contract, or unrelated portal behavior.
- **Work on a feature branch only** (template `cursor/<descriptive-name>-c6d8` or the assigned cloud branch). **Do not push to `main`.**
- Prefer minimal, targeted diffs for the checklist below.

---

## Areas to improve (prioritized)

### P0 — Must fix (product + security)

1. **Welcome / landing session UX (mandatory product item A)**  
   `LandingPage.jsx` always renders Caregiver Login and Admin Login CTAs. When `authService.isAuthenticated()` is true, the page must **not** offer those login options — redirect to the role dashboard **or** replace CTAs with a Dashboard CTA (Navbar already shows Dashboard/Logout when `user` exists).  
   Also consider the same guard on `/caregiver/login` and `/admin/login` (currently always show forms even if already signed in).

2. **Uhie conversation persistence + logout clear (mandatory product item B)**  
   - **Persist across page refresh:** `UhieChatWidget` keeps `messages` only in React state → refresh resets to the welcome bubble. Persist transcript (and optionally panel open state) in `sessionStorage` keyed by user identity (e.g. `employeeCode` + `role`), restore on mount when still authenticated.  
   - **Clear on logout:** `auth:logout` already calls `resetChat()` — keep that. Also clear the persisted storage key in the same logout path so a later login cannot see another user’s transcript.

3. **Do not trust client-supplied `user` as security identity**  
   `uhieChatService` sends `{ fullName, employeeCode, role }` from localStorage. An attacker with a valid JWT can alter localStorage and spoof context in the body. Backend must derive identity from the verified JWT; treat body `user` as optional display hint only (or stop accepting it).

4. **JWT session validity**  
   `isAuthenticated()` is `!!localStorage.getItem('token')` with no expiry decode / `/api/auth/me`-style check. Expired tokens still unlock protected UI until the first 401. Add client-side expiry handling and/or a shared axios interceptor that logs out on 401.

### P1 — Should fix (efficiency + robustness)

5. **Unbounded chat history payload**  
   Every send rebuilds `history` from the full in-memory transcript (including the current user turn, which is also sent as `message`). This grows request size and latency. Cap to last N turns (e.g. 12, matching prior server behavior) and omit the current message from `history`.

6. **History / message duplication**  
   Current turn is present in both `message` and `history`. Align with backend contract: `message` = current turn; `history` = prior turns only.

7. **Landing / Navbar auth reactivity**  
   `Navbar` reads `getCurrentUser()` once per render with no `auth:logout` / storage listener. After logout on some pages this remounts via navigate; still fragile. Prefer a small auth subscription or shared context so landing CTAs and nav stay consistent.

8. **Public-route `resetChat` wipes in-memory context**  
   Navigating to `/` or login routes while still authenticated clears messages (`UhieChatWidget` effect). Combined with no persistence, this loses context even without a full refresh. Persistence (P0) should restore when returning to protected routes; avoid clearing storage on public-route hide alone.

### P2 — Nice to have

9. **`uhieChatService.isConfigured()` always returns `true`** — dead UI path (`· offline`). Either wire a real health probe (`GET /api/uhie/health`) or remove the branch.

10. **Optional health gate before first chat** — soft-fail UX if Foundry is degraded (`foundryConfigured: false` / deep health 503).

11. **Escape / focus trap** for the dialog panel (a11y).

12. **Centralize Bearer headers** — many pages build `Authorization` inline; reuse a shared axios instance with interceptors (efficiency + consistent 401 handling).

13. **Sanitize / length-limit** user messages client-side before POST (defense in depth; backend must still enforce).

---

## Security concerns

| Risk | Severity | Detail |
|------|----------|--------|
| Client-trusted chat `user` object | High | Identity for Foundry context should come from JWT claims on the server, not localStorage-echoed body fields |
| JWT in `localStorage` | Medium | XSS can exfiltrate token; prefer httpOnly cookie session if backend can support it later; until then harden CSP and avoid `dangerouslySetInnerHTML` |
| No client token expiry check | Medium | Stale sessions appear logged in; API calls fail later |
| Unbounded history to LLM proxy | Medium | Cost, latency, and possible prompt-injection surface growth |
| `VITE_UHIE_CHAT_URL` override | Low–Med | Misconfiguration could point the browser at a non-HomeCare host; keep defaulting to `${API_URL}/api/uhie/chat` |
| CORS `Access-Control-Allow-Origin: *` on API | Backend | Observed on OPTIONS; ensure JWT still required and sensitive cookies never used with `*` |
| Chat content may include care/HR PII | Medium | Transcripts in `sessionStorage` must clear on logout; avoid logging message bodies in production clients |

**Stay on backend (do not move to frontend):**

- Azure Foundry credentials, agent invocation, agent version resolution  
- JWT verification and authorization  
- Any schedule / caregiver / client data enrichment for answers  
- Rate limiting, abuse controls, audit logging  
- Deep health checks against Foundry  

**Reasonable on frontend:**

- Chat UI state, welcome copy, reference capsule display / `normalizeReferences`  
- Conversation persistence across refresh (sessionStorage) and clear on logout  
- Landing/login session UX (redirect or Dashboard CTA)  
- Client-side history windowing before POST  
- Optimistic typing indicators and local validation (non-empty message)

---

## Efficiency concerns

1. **Full transcript resent every turn** — O(n) payload growth; trim history.  
2. **Current message duplicated** in `message` + `history` — wasted tokens / bytes.  
3. **Multiple auth sync effects** in `UhieChatWidget` (pathname, storage, focus, logout) — workable but noisy; a single auth event bus / context would reduce redundant `setIsAuthed` / `resetChat` churn.  
4. **`resetChat` on public routes** forces remount-like state loss when toggling visibility — pair with persistence so protected-route returns are cheap restores, not empty chats.  
5. **No request cancellation** — rapid Send / unmount can leave stale responses applying to a cleared thread; use `AbortController` with axios.  
6. **Dashboard pages** (out of Uhie scope but related) often refetch without shared cache — not blocking Uhie, but same interceptor/auth patterns would help.

---

## Uhie integration notes (current behavior)

| Behavior | Status |
|----------|--------|
| Widget only when authenticated | Yes |
| Hidden on `/`, login, register | Yes (`PUBLIC_ROUTES`) |
| Clears on `auth:logout` | Yes |
| Persists across refresh | **No** (mandatory gap) |
| Landing hides login CTAs when session active | **No** (mandatory gap; Navbar OK) |
| Sends Bearer JWT | Yes |
| Sends `user` from localStorage | Yes (prefer JWT-derived server-side) |
| Shows reference capsules | Yes (`normalizeReferences`) |

---

## Checklist for Agent 2 (implement)

### Mandatory product items

- [ ] **A.** Welcome page must **not** show caregiver/admin login options while a user session is still active — redirect to the correct dashboard **or** show a Dashboard CTA instead of login links.  
- [ ] **B.** Uhie chatbot conversation context must **persist across page refresh**, and **clear when the user clicks logout** (including any persisted storage).

### Supporting implementation items

- [ ] Persist Uhie `messages` (and optionally `isOpen`) in `sessionStorage`, keyed by signed-in user; restore on mount if authenticated.  
- [ ] On `authService.logout` / `auth:logout`, clear React state **and** persisted chat keys.  
- [ ] Do not clear persisted chat merely because the widget is hidden on a public route while the same user remains logged in (restore when returning to a protected route).  
- [ ] Cap `history` to last N prior turns; exclude the current `message` from `history`.  
- [ ] Keep Foundry calls on the HomeCare backend only (`POST /api/uhie/chat`); no browser→Foundry.  
- [ ] Optionally: redirect already-authenticated users away from `/caregiver/login` and `/admin/login`.  
- [ ] Optionally: treat 401 from Uhie/chat as logout + session clear.  
- [ ] Optionally: probe `GET /api/uhie/health` for real online/offline subtitle instead of hard-coded `isConfigured: true`.

### Guardrail reminder

- Preserve existing functionality outside this checklist.  
- Branch-only work; **do not push to `main`**.  
- Analysis docs live under `/workspace/docs/`; see also `UHIE_BACKEND_API.md` for contracts.

---

## Files inspected (minimum scope)

- `src/App.jsx`
- `src/pages/LandingPage.jsx`
- `src/components/Navbar.jsx`
- `src/components/uhie/UhieChatWidget.jsx`
- `src/services/uhieChatService.js`
- `src/services/authService.js`
- `src/config/api.js`
- `src/components/ProtectedRoute.jsx`
- `src/styles/uhieChat.css` (and landing rules in `global.css`)
- Live probes: `GET /api/uhie/health`, `GET /api/uhie/health?deep=1`, unauthenticated `POST /api/uhie/chat`
