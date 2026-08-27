import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import {
  MAX_UHIE_HISTORY_TURNS,
  MAX_UHIE_MESSAGE_LENGTH,
  uhieChatService
} from '../../services/uhieChatService';
import {
  clearAllUhieChat,
  loadUhieChat,
  saveUhieChat
} from '../../services/uhieChatPersistence';
import '../../styles/uhieChat.css';

const WELCOME =
  "Hi, I'm Uhie—your United Healthcare IE assistant. Ask about HR, care questions, or finding a carer for a time slot.";

const WELCOME_MESSAGE = { id: 'welcome', role: 'assistant', text: WELCOME };

const PUBLIC_ROUTES = new Set([
  '/',
  '/admin/login',
  '/admin/register',
  '/caregiver/login',
  '/caregiver/register'
]);

function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.has(pathname);
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizePersistedMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [WELCOME_MESSAGE];
  }

  const cleaned = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .map((m) => ({
      id: m.id || createId(),
      role: m.role,
      text: m.text,
      ...(Array.isArray(m.references) ? { references: m.references } : {})
    }));

  if (cleaned.length === 0) return [WELCOME_MESSAGE];

  // Ensure a welcome bubble exists at the start when restoring an empty-looking thread
  if (cleaned[0].id !== 'welcome' && cleaned.every((m) => m.role === 'user')) {
    return [WELCOME_MESSAGE, ...cleaned];
  }

  return cleaned;
}

function buildPriorHistory(messages) {
  return messages
    .filter((m) => m.id !== 'welcome')
    .map((m) => ({ role: m.role, content: m.text }))
    .slice(-MAX_UHIE_HISTORY_TURNS);
}

export default function UhieChatWidget() {
  const location = useLocation();
  const [isAuthed, setIsAuthed] = useState(() => authService.isAuthenticated());
  const [user, setUser] = useState(() =>
    authService.isAuthenticated() ? authService.getCurrentUser() : null
  );
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [foundryOnline, setFoundryOnline] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const restoredKeyRef = useRef(null);
  const persistReadyRef = useRef(false);

  const syncAuthState = useCallback(() => {
    const authenticated = authService.isAuthenticated();
    setIsAuthed(authenticated);
    setUser(authenticated ? authService.getCurrentUser() : null);
  }, []);

  const resetChatUi = useCallback(() => {
    setIsOpen(false);
    setDraft('');
    setIsSending(false);
    setMessages([WELCOME_MESSAGE]);
    persistReadyRef.current = false;
    restoredKeyRef.current = null;
  }, []);

  // Abort in-flight request on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    syncAuthState();
  }, [location.pathname, syncAuthState]);

  useEffect(() => {
    window.addEventListener('storage', syncAuthState);
    window.addEventListener('focus', syncAuthState);
    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('focus', syncAuthState);
    };
  }, [syncAuthState]);

  useEffect(() => {
    const onLogout = () => {
      abortRef.current?.abort();
      clearAllUhieChat();
      resetChatUi();
      setIsAuthed(false);
      setUser(null);
      setFoundryOnline(null);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [resetChatUi]);

  // Restore persisted chat when authenticated on a protected route.
  // Do NOT clear sessionStorage when merely hidden on a public route.
  useEffect(() => {
    if (!isAuthed || !user) {
      return;
    }

    if (isPublicRoute(location.pathname)) {
      // Keep panel closed while hidden; leave storage intact for restore later.
      setIsOpen(false);
      persistReadyRef.current = false;
      return;
    }

    const identity = `${user.employeeCode}:${user.role}`;
    if (restoredKeyRef.current === identity) {
      persistReadyRef.current = true;
      return;
    }

    const stored = loadUhieChat(user);
    if (stored?.messages?.length) {
      setMessages(sanitizePersistedMessages(stored.messages));
      setIsOpen(Boolean(stored.isOpen));
    } else {
      setMessages([WELCOME_MESSAGE]);
      setIsOpen(false);
    }
    restoredKeyRef.current = identity;
    persistReadyRef.current = true;
  }, [isAuthed, user, location.pathname]);

  // Persist messages + open state while signed in (including while on public routes
  // if we still hold in-memory state — but we only write after a successful restore).
  useEffect(() => {
    if (!isAuthed || !user || !persistReadyRef.current) return;
    if (isPublicRoute(location.pathname)) return;
    saveUhieChat(user, { messages, isOpen });
  }, [messages, isOpen, isAuthed, user, location.pathname]);

  // Soft health probe for subtitle (replaces always-true isConfigured offline path)
  useEffect(() => {
    if (!isAuthed || isPublicRoute(location.pathname)) return undefined;

    const controller = new AbortController();
    let cancelled = false;

    uhieChatService
      .checkHealth({ signal: controller.signal })
      .then((result) => {
        if (!cancelled) setFoundryOnline(result.foundryConfigured && result.ok);
      })
      .catch((error) => {
        if (!cancelled && error?.name !== 'AbortError' && !error?.isAbort) {
          setFoundryOnline(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isAuthed, location.pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
    inputRef.current?.focus();
  }, [isOpen, messages, isSending]);

  if (!isAuthed || isPublicRoute(location.pathname)) {
    return null;
  }

  const handleToggle = () => {
    setIsOpen((open) => !open);
  };

  const handleSend = async (event) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    if (text.length > MAX_UHIE_MESSAGE_LENGTH) {
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'assistant',
          text: `Please keep messages to ${MAX_UHIE_MESSAGE_LENGTH} characters or fewer.`
        }
      ]);
      return;
    }

    const userMessage = { id: createId(), role: 'user', text };
    // Prior turns only — current message is sent separately as `message`
    const history = buildPriorHistory(messages);

    setMessages((prev) => [...prev, userMessage]);
    setDraft('');
    setIsSending(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await uhieChatService.sendMessage({
        message: text,
        history,
        signal: controller.signal
      });
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'assistant',
          text: result.reply,
          references: result.references || []
        }
      ]);
    } catch (error) {
      if (error?.isAbort || error?.name === 'AbortError') {
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'assistant',
          text: error.message || 'Something went wrong talking to Uhie.'
        }
      ]);
    } finally {
      if (abortRef.current === controller) {
        setIsSending(false);
      }
    }
  };

  const subtitleStatus =
    foundryOnline === false ? ' · offline' : foundryOnline === true ? '' : '';

  return (
    <div className="uhie-root" aria-live="polite">
      {isOpen && (
        <section
          className="uhie-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="uhie-title"
        >
          <header className="uhie-header">
            <div className="uhie-header-copy">
              <p className="uhie-kicker">Assistant</p>
              <h2 id="uhie-title" className="uhie-title">
                Uhie
              </h2>
              <p className="uhie-subtitle">
                {user?.fullName
                  ? `Chatting as ${user.fullName}${user.role ? ` (${user.role})` : ''}`
                  : 'Signed in'}
                {subtitleStatus}
              </p>
            </div>
            <button
              type="button"
              className="uhie-icon-btn"
              onClick={handleToggle}
              aria-label="Close Uhie chat"
            >
              &times;
            </button>
          </header>

          <div className="uhie-messages" ref={listRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`uhie-bubble uhie-bubble--${message.role}`}
              >
                <div className="uhie-bubble-text">{message.text}</div>
                {message.role === 'assistant' &&
                  Array.isArray(message.references) &&
                  message.references.length > 0 && (
                    <ul className="uhie-refs" aria-label="Sources">
                      {message.references.map((ref) => (
                        <li key={`${message.id}-${ref.id}`} className="uhie-ref-capsule">
                          <span className="uhie-ref-num">{ref.id}</span>
                          <span className="uhie-ref-label">{ref.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
              </div>
            ))}
            {isSending && (
              <div className="uhie-bubble uhie-bubble--assistant uhie-bubble--typing">
                Uhie is typing…
              </div>
            )}
          </div>

          <form className="uhie-composer" onSubmit={handleSend}>
            <label className="uhie-sr-only" htmlFor="uhie-input">
              Message Uhie
            </label>
            <input
              id="uhie-input"
              ref={inputRef}
              className="uhie-input"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_UHIE_MESSAGE_LENGTH))}
              placeholder="Ask Uhie about HR, care, or schedules…"
              disabled={isSending}
              autoComplete="off"
              maxLength={MAX_UHIE_MESSAGE_LENGTH}
            />
            <button
              type="submit"
              className="uhie-send"
              disabled={isSending || !draft.trim()}
            >
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`uhie-fab ${isOpen ? 'is-open' : ''}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'uhie-title' : undefined}
        aria-label={isOpen ? 'Close Uhie chat' : 'Open Uhie chat'}
      >
        <span className="uhie-fab-label">{isOpen ? 'Close' : 'Uhie'}</span>
      </button>
    </div>
  );
}
