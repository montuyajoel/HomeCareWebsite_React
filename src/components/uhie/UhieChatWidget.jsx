import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { uhieChatService } from '../../services/uhieChatService';
import '../../styles/uhieChat.css';

const WELCOME =
  "Hi, I'm Uhie—your United Healthcare IE assistant. Ask about HR, care questions, or finding a carer for a time slot.";

const WELCOME_MESSAGE = { id: 'welcome', role: 'assistant', text: WELCOME };

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function UhieChatWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isAuthed, setIsAuthed] = useState(() => authService.isAuthenticated());
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const resetChat = useCallback(() => {
    setIsOpen(false);
    setDraft('');
    setIsSending(false);
    setMessages([WELCOME_MESSAGE]);
  }, []);

  useEffect(() => {
    setIsAuthed(authService.isAuthenticated());
  }, [location.pathname]);

  useEffect(() => {
    const syncAuth = () => setIsAuthed(authService.isAuthenticated());
    window.addEventListener('storage', syncAuth);
    window.addEventListener('focus', syncAuth);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('focus', syncAuth);
    };
  }, []);

  useEffect(() => {
    const onLogout = () => {
      resetChat();
      setIsAuthed(false);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [resetChat]);

  useEffect(() => {
    if (!isAuthed) {
      resetChat();
    }
  }, [isAuthed, resetChat]);

  useEffect(() => {
    if (!isOpen) return;
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
    inputRef.current?.focus();
  }, [isOpen, messages, isSending]);

  if (!isAuthed) {
    return null;
  }

  const user = authService.getCurrentUser();

  const handleToggle = () => {
    setIsOpen((open) => !open);
  };

  const handleSend = async (event) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    const userMessage = { id: createId(), role: 'user', text };
    const nextHistory = [...messages, userMessage]
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [...prev, userMessage]);
    setDraft('');
    setIsSending(true);

    try {
      const result = await uhieChatService.sendMessage({
        message: text,
        history: nextHistory
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
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'assistant',
          text: error.message || 'Something went wrong talking to Uhie.'
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

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
                {!uhieChatService.isConfigured() ? ' · offline' : ''}
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
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask Uhie about HR, care, or schedules…"
              disabled={isSending}
              autoComplete="off"
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
