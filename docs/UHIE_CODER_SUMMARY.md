# Uhie Quality — Coder Summary

**Branch:** `cursor/uhie-quality-session-c7ff`  
**Date:** 2026-08-27  
**Scope:** Frontend-only fixes from `UHIE_QUALITY_AUDIT.md`. Foundry remains on HomeCare backend; chat still uses `POST /api/uhie/chat`.

---

## Mandatory product items

### A. Welcome page session UX

- **`LandingPage.jsx`** — When `authService.isAuthenticated()` and a current user exist, Caregiver/Admin Login CTAs are replaced with a single **Go to Dashboard** link (role-aware). Auth state syncs via `auth:logout` / `storage` / `focus` so CTAs stay consistent with Navbar.
- **`CaregiverLogin.jsx` / `AdminLogin.jsx`** — If already authenticated, `<Navigate>` to `authService.getDashboardPath()` (admin → `/admin/dashboard`, caregiver → `/caregiver/dashboard`).
- **`Navbar.jsx`** — Subscribes to the same auth events so guest vs Dashboard/Logout actions update without a full remount.
- **`authService.getDashboardPath()`** — Shared helper for role dashboard routing.

### B. Uhie chat persistence

- **New `uhieChatPersistence.js`** — `sessionStorage` keys `uhie-chat:{employeeCode}:{role}` (messages) and `uhie-chat-open:…` (panel open). `load` / `save` / `clear` / `clearAll`.
- **`UhieChatWidget.jsx`** — Restores transcript + open state on mount when still authenticated on a protected route. Persists on message/open changes.
- **Public routes** — Widget still hidden (`PUBLIC_ROUTES`); **does not** clear `sessionStorage` when hidden while logged in. Returning to a dashboard restores context.
- **Logout** — `authService.logout()` calls `clearAllUhieChat()` before `auth:logout`; widget also resets UI and aborts in-flight requests.

---

## Supporting P0/P1 (frontend-safe)

| Item | Implementation |
|------|----------------|
| History cap / no duplicate current turn | Prior turns only via `buildPriorHistory`; `capUhieHistory` → last **12** turns in `uhieChatService` |
| 401 → clean logout | `sendUhieMessage` calls `authService.logout()` on HTTP 401 |
| Abort in-flight | `AbortController` on send + unmount; aborted replies ignored |
| Max message length | **2000** chars client-side (`maxLength` + service guard) |
| Dead `isConfigured()` offline path | Replaced with `GET /api/uhie/health` probe; subtitle shows `· offline` only when health says degraded/unreachable |
| Navbar/Landing auth reactivity | Event listeners on `auth:logout`, `storage`, `focus` |

---

## Files changed

| File | Change |
|------|--------|
| `src/services/uhieChatPersistence.js` | **New** — sessionStorage persist/clear |
| `src/services/authService.js` | Logout clears Uhie storage; `getDashboardPath()` |
| `src/services/uhieChatService.js` | History cap, max length, AbortSignal, 401 logout, health check |
| `src/components/uhie/UhieChatWidget.jsx` | Persist/restore, abort, health subtitle, no public-route storage wipe |
| `src/pages/LandingPage.jsx` | Dashboard CTA when session active |
| `src/pages/CaregiverLogin.jsx` | Redirect if authenticated |
| `src/pages/AdminLogin.jsx` | Redirect if authenticated |
| `src/components/Navbar.jsx` | Reactive auth user state |
| `docs/UHIE_CODER_SUMMARY.md` | This summary |

---

## Intentionally not changed (guardrails)

- No Foundry credentials or browser→Foundry calls
- Chat path remains `/api/uhie/chat` (or `VITE_UHIE_CHAT_URL` HomeCare override)
- Admin/caregiver portal pages beyond login redirect / Navbar
- Body `user` still sent as display hint (server JWT trust is a backend item)

---

## Suggested Quality Agent re-review checks

1. Logged-in visit to `/` → no Caregiver/Admin login CTAs; Dashboard CTA + Navbar Dashboard/Logout.
2. Visit `/caregiver/login` or `/admin/login` while authed → redirect to correct role dashboard.
3. Chat on dashboard → refresh → transcript (and optional open state) restored.
4. Navigate to `/` while still logged in → bubble hidden; return to dashboard → conversation restored (storage not wiped).
5. Logout → chat storage keys gone; re-login → welcome-only thread.
6. Rapid Send / navigate away → no stale bubble from aborted request.
7. Message over 2000 chars blocked; history payload ≤ 12 prior turns without duplicating current `message`.
