import axios from 'axios';
import { API_URL, UHIE_CHAT_URL, getApiErrorMessage } from '../config/api';
import { authService } from './authService';

/** Client-side message length limit (backend should still enforce). */
export const MAX_UHIE_MESSAGE_LENGTH = 2000;

/** Max prior turns sent with each chat request. */
export const MAX_UHIE_HISTORY_TURNS = 12;

/**
 * Prefer dedicated Uhie URL, otherwise the HomeCare API `/api/uhie/chat` route.
 */
function getChatEndpoint() {
  if (UHIE_CHAT_URL) return UHIE_CHAT_URL;
  return `${API_URL}/api/uhie/chat`;
}

function getHealthEndpoint() {
  return `${API_URL}/api/uhie/health`;
}

/**
 * Build the identity payload to send with every Uhie chat request.
 * Server should treat JWT as source of truth; body user is a display hint only.
 */
function getUserContext() {
  const user = authService.getCurrentUser();
  if (!user) return null;

  return {
    fullName: user.fullName,
    employeeCode: user.employeeCode,
    role: user.role
  };
}

/**
 * Normalize API references object into [{ id, label }] for UI capsules.
 * Accepts { "1": "Source.docx" } or [{ id, label }] / string[].
 */
export function normalizeReferences(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item, index) => {
        if (typeof item === 'string') {
          return { id: String(index + 1), label: formatReferenceLabel(item) };
        }
        if (item && typeof item === 'object') {
          const id = String(item.id ?? item.key ?? index + 1);
          const label = formatReferenceLabel(
            item.label || item.title || item.name || item.source || String(item)
          );
          return { id, label };
        }
        return null;
      })
      .filter(Boolean);
  }

  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([id, value]) => ({
        id: String(id),
        label: formatReferenceLabel(
          typeof value === 'string'
            ? value
            : value?.label || value?.title || value?.name || value?.source || String(value)
        )
      }))
      .sort((a, b) => Number(a.id) - Number(b.id) || a.id.localeCompare(b.id));
  }

  return [];
}

function formatReferenceLabel(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'Source';

  const withoutExt = trimmed.replace(/\.(docx?|pdf|txt|md)$/i, '');
  const spaced = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) return 'Source';

  // Soft title-case for snake/camel-ish keys like "answersynthesis"
  if (!/\s/.test(spaced) && /^[a-z0-9]+$/i.test(spaced)) {
    return spaced.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
  }

  return spaced;
}

function isAbortError(error) {
  return (
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError' ||
    axios.isCancel?.(error)
  );
}

/**
 * Cap history to the last N prior turns. Caller must exclude the current message.
 */
export function capUhieHistory(history, limit = MAX_UHIE_HISTORY_TURNS) {
  if (!Array.isArray(history) || history.length === 0) return [];
  return history.slice(-limit);
}

/**
 * Shallow Uhie health probe (Foundry config flag; no deep Foundry call).
 * @returns {Promise<{ ok: boolean, foundryConfigured: boolean }>}
 */
export async function checkUhieHealth({ signal } = {}) {
  try {
    const response = await axios.get(getHealthEndpoint(), {
      timeout: 8000,
      signal
    });
    const data = response.data || {};
    const foundryConfigured = data.foundryConfigured !== false && response.status === 200;
    return {
      ok: response.status === 200 && data.status !== 'degraded',
      foundryConfigured: Boolean(data.foundryConfigured ?? foundryConfigured)
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { ok: false, foundryConfigured: false };
  }
}

/**
 * Send a chat message to the HomeCare backend Uhie route (Foundry stays server-side).
 *
 * POST /api/uhie/chat
 * Authorization: Bearer <user JWT>
 * Body: { message, history?, user }
 * Response: { success, reply|response, references? }
 *
 * @param {{ message: string, history?: Array, signal?: AbortSignal }} args
 */
export async function sendUhieMessage({ message, history = [], signal } = {}) {
  const trimmed = (message || '').trim();
  if (!trimmed) {
    throw new Error('Message cannot be empty.');
  }
  if (trimmed.length > MAX_UHIE_MESSAGE_LENGTH) {
    throw new Error(`Message must be ${MAX_UHIE_MESSAGE_LENGTH} characters or fewer.`);
  }

  const user = getUserContext();
  if (!user) {
    throw new Error('Sign in to chat with Uhie.');
  }

  const token = authService.getToken();
  if (!token) {
    throw new Error('Sign in to chat with Uhie.');
  }

  const endpoint = getChatEndpoint();
  const payload = {
    message: trimmed,
    history: capUhieHistory(history),
    user
  };

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000,
      signal
    });

    const data = response.data || {};
    const reply =
      data.reply ||
      data.response ||
      data.message ||
      data.answer ||
      data.output ||
      (typeof data === 'string' ? data : null);

    if (!reply) {
      throw new Error('Uhie returned an empty response.');
    }

    return {
      reply: String(reply),
      references: normalizeReferences(data.references || data.sources || data.citations),
      stub: false
    };
  } catch (error) {
    if (isAbortError(error)) {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      abortError.isAbort = true;
      throw abortError;
    }

    if (error?.response?.status === 401) {
      authService.logout();
      throw new Error('Your session has expired. Please sign in again.');
    }

    const serverMessage =
      error?.response?.data?.message || error?.response?.data?.error;
    throw new Error(
      serverMessage || getApiErrorMessage(error, 'Uhie could not respond right now.')
    );
  }
}

export const uhieChatService = {
  sendMessage: sendUhieMessage,
  checkHealth: checkUhieHealth,
  /** @deprecated Prefer checkHealth(); kept for callers that need a sync stub. */
  isConfigured: () => true,
  getEndpoint: getChatEndpoint,
  MAX_MESSAGE_LENGTH: MAX_UHIE_MESSAGE_LENGTH,
  MAX_HISTORY_TURNS: MAX_UHIE_HISTORY_TURNS
};
