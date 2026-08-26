import axios from 'axios';
import { API_URL, UHIE_CHAT_URL, getApiErrorMessage } from '../config/api';
import { authService } from './authService';

/**
 * Prefer dedicated Uhie URL, otherwise the HomeCare API `/api/uhie/chat` route.
 */
function getChatEndpoint() {
  if (UHIE_CHAT_URL) return UHIE_CHAT_URL;
  return `${API_URL}/api/uhie/chat`;
}

/**
 * Build the identity payload to send with every Uhie chat request.
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

/**
 * Send a chat message to the HomeCare backend Uhie route (Foundry stays server-side).
 *
 * POST /api/uhie/chat
 * Authorization: Bearer <user JWT>
 * Body: { message, history?, user }
 * Response: { success, reply|response, references? }
 */
export async function sendUhieMessage({ message, history = [] }) {
  const trimmed = (message || '').trim();
  if (!trimmed) {
    throw new Error('Message cannot be empty.');
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
    history,
    user
  };

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
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
    const serverMessage =
      error?.response?.data?.message || error?.response?.data?.error;
    throw new Error(
      serverMessage || getApiErrorMessage(error, 'Uhie could not respond right now.')
    );
  }
}

export const uhieChatService = {
  sendMessage: sendUhieMessage,
  isConfigured: () => true,
  getEndpoint: getChatEndpoint
};
