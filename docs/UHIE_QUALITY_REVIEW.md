# Uhie Quality Review (post-Coder)

**Repo:** HomeCareWebsite_React (`/workspace`)  
**Reviewer:** Efficiency and Quality Agent  
**Date:** 2026-08-27  
**Branch:** `cursor/uhie-quality-session-c7ff`  
**Baseline audit:** `docs/UHIE_QUALITY_AUDIT.md` (64%)  
**Coder summary:** `docs/UHIE_CODER_SUMMARY.md`  
**Commit reviewed:** `617986c` — *Fix Uhie session UX: landing CTAs, chat persistence, and chat hygiene.*

---

## Updated quality score: **82%** (was 64%)

**Justification:** Mandatory product items **A** and **B** are correctly implemented on the frontend. History windowing, AbortController, 401→logout on chat, message length limits, and a real health probe close most of the prior P1 Uhie gaps. Score is held below the high 80s by remaining auth hygiene (JWT presence-only `isAuthenticated`, client-echoed body `user` still sent — server must own identity), duplicated auth-sync listeners instead of shared context, and unbounded transcript size in `sessionStorage`.

| Area | Before | After | Notes |
|------|-------:|------:|-------|
| Architecture / Foundry ownership | 82% | 84% | Still HomeCare-only Foundry; health probe + abort added |
| Auth & security hygiene | 52% | 60% | Chat 401 logs out; JWT expiry / body-user trust still open |
| Session / landing UX | 48% | 92% | Dashboard CTA + login redirects + reactive Navbar |
| Uhie chat product completeness | 58% | 90% | Persist + logout clear; public hide no longer wipes storage |
| Efficiency / React patterns | 66% | 80% | Cap 12 prior turns; abort; focus→re-persist churn remains |
| Code clarity | 74% | 78% | Clear persistence module; duplicated `useAuthUser`-style hooks |

---

## Mandatory items — Pass / Fail

### A. Landing session UX — **PASS**

| Requirement | Evidence |
|-------------|----------|
| Welcome page must not show Caregiver/Admin login CTAs while session active | `LandingPage.jsx`: when `authService.isAuthenticated()` and `getCurrentUser()` resolve, hero actions render a single **Go to Dashboard** link (role → `/admin/dashboard` or `/caregiver/dashboard`); guest CTAs only in the `else` branch. |
| Auth-aware nav | `Navbar.jsx`: stateful user + `auth:logout` / `storage` / `focus` sync; authed menu is Dashboard + Logout (no login links). |
| Login pages while already signed in | `CaregiverLogin.jsx` / `AdminLogin.jsx`: early `<Navigate to={authService.getDashboardPath()} replace />`. |
| Shared dashboard helper | `authService.getDashboardPath()` used by login redirects. |

**Notes (non-blocking):** Landing duplicates role→path logic instead of calling `getDashboardPath()`; behavior matches. Token present with corrupt/missing `user` JSON would still show guest CTAs (edge case; same class of issue as prior JWT/localStorage model).

### B. Chat persist + logout clear — **PASS**

| Requirement | Evidence |
|-------------|----------|
| Persist across refresh | `uhieChatPersistence.js` writes `sessionStorage` keys `uhie-chat:{employeeCode}:{role}` (+ open flag). `UhieChatWidget` restores via `loadUhieChat` on protected-route mount when authenticated. |
| Clear on logout (incl. storage) | `authService.logout()` calls `clearAllUhieChat()` before `auth:logout`; widget handler also aborts in-flight work, clears storage again, and resets UI. |
| Do not wipe storage merely because widget is hidden on a public route | Public-route branch sets panel closed / `persistReadyRef=false` but does **not** call clear; returning to a dashboard reuses in-memory thread or reloads storage via identity key. |
| Prior turns only + cap | `buildPriorHistory` excludes welcome and current turn; `capUhieHistory` enforces last **12** turns in `sendUhieMessage`. |

**Notes (non-blocking):** Persist effect depends on `user` object identity; `focus` re-sync creates a new object and re-saves storage (harmless churn). Transcript length in storage is not capped (only request history is).

---

## What looks good

1. **Minimal, on-checklist diffs** — Foundry ownership, `/api/uhie/chat` contract, and portal pages beyond login/nav untouched.
2. **Persistence design** — User-keyed `sessionStorage`, sanitize-on-load, `clearAll` prefix scan on logout, public-route hide without wipe.
3. **Request hygiene** — Prior-history-only payload, 12-turn cap, 2000-char limit, AbortController on send/unmount, aborted replies ignored.
4. **Session UX coherence** — Landing CTA swap + login redirects + Navbar reactivity address the audit’s “Navbar OK / landing not” gap.
5. **Soft health subtitle** — Replaces the dead always-true `isConfigured` offline path with `GET /api/uhie/health` (deprecated stub retained but unused by the widget).
6. **401 on Uhie chat → logout** — Partial client session hygiene aligned with the optional audit item.

---

## Remaining issues

### P0 (still open — mostly auth/backend)

1. **Do not trust client-supplied chat `user` as security identity**  
   Frontend still sends `{ fullName, employeeCode, role }` from localStorage. Correct as a display hint only; **backend must derive identity from verified JWT** (documented in `UHIE_BACKEND_API.md`). Not fixable fully in this FE-only pass.

2. **JWT “session” = token presence**  
   `isAuthenticated()` remains `!!localStorage.getItem('token')` with no expiry decode / `/api/auth/me`. Uhie 401 now logs out; **other API calls still lack a shared interceptor**. Expired tokens can still unlock protected UI until the first failing request.

### P1

3. **Duplicated auth sync** — Landing and Navbar each register `auth:logout` / `storage` / `focus` listeners; Uhie widget has a third sync path. Prefer one shared hook/context to cut redundant `setUser` churn.

4. **Health probe on every protected pathname change** — Effect deps include `location.pathname`, so navigating dashboard → leave-requests re-hits `/api/uhie/health`. Cache or probe once per session.

5. **Unbounded persisted transcript** — Request history is capped at 12; `sessionStorage` message array can grow without limit (quota / PII surface). Cap stored turns or trim oldest.

6. **Account switch without logout** — `login()` overwrites token/user but does not clear Uhie keys; isolation by key helps, but `clearAllUhieChat()` (or clear-other-users) on successful login would be safer.

### P2

7. Deprecated `uhieChatService.isConfigured()` still returns `true`.  
8. No Escape / focus trap on the dialog panel (a11y).  
9. Landing should call `getDashboardPath()` instead of inlining role checks.  
10. Centralize Bearer headers / axios instance (broader than Uhie).  
11. `sanitizePersistedMessages` only prepends welcome when every message is `role: 'user'`; mixed threads missing a welcome id stay as-is (cosmetic).

---

## Functionality preserved?

**Yes.**

- Chat still posts to HomeCare `POST /api/uhie/chat` (or `VITE_UHIE_CHAT_URL`); no browser→Foundry.
- Widget still gated to authenticated, non-`PUBLIC_ROUTES` paths.
- Reference capsules, welcome copy, and Bearer JWT send path retained.
- Logout still navigates home; now also clears persisted Uhie keys (additive, required by B).
- Login forms unchanged aside from authenticated redirect; dashboards / schedules / directories not modified.
- Intentional product change (not a regression): authed users no longer see landing/login CTAs or login forms — matches mandatory item A.

---

## Checklist vs original audit

| Item | Status |
|------|--------|
| A. Landing session UX | **Done** |
| B. Persist + logout clear | **Done** |
| Persist keyed by user; restore on mount | **Done** |
| Clear storage on logout | **Done** |
| No clear on public-route hide alone | **Done** |
| Cap history; exclude current message | **Done** |
| Foundry stays on backend | **Preserved** |
| Login redirect if already authed | **Done** |
| 401 → logout (Uhie) | **Done** (Uhie only) |
| Health probe for online/offline | **Done** |
| JWT expiry / global 401 interceptor | **Open (P0)** |
| Server JWT as identity source of truth | **Open (backend P0)** |

---

## Verdict

Coder delivery meets both mandatory product items with sound persistence and session UX. Re-score **64% → 82%**. Next highest-value work is server-side JWT identity for chat and client-wide token expiry / 401 handling—not further landing/chat UI churn.
