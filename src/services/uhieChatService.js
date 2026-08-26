import axios from 'axios';
import { UHIE_CHAT_URL, getApiErrorMessage } from '../config/api';
import { authService } from './authService';

const STUB_REPLY =
  "Hi, I'm Uhie. My Azure / Foundry connection isn't configured yet. Set VITE_UHIE_CHAT_URL when your agent endpoint is ready—I can help with HR questions, care inquiries, and finding carers for a schedule.";

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
 * Send a chat message to the Uhie backend (Foundry / Azure OpenAI later).
 * When UHIE_CHAT_URL is empty, returns a local stub so the UI stays usable.
 *
 * Expected remote contract (adjust later to match Foundry):
 * POST {UHIE_CHAT_URL}
 * Authorization: Bearer <user JWT>
 * Body: { message, history, user }
 * Response: { reply: string } or { message: string }
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

  if (!UHIE_CHAT_URL) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      reply: STUB_REPLY,
      stub: true
    };
  }

  const token = authService.getToken();
  const payload = {
    message: trimmed,
    history,
    user
  };

  try {
    const response = await axios.post(UHIE_CHAT_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const data = response.data || {};
    const reply =
      data.reply ||
      data.message ||
      data.answer ||
      data.output ||
      (typeof data === 'string' ? data : null);

    if (!reply) {
      throw new Error('Uhie returned an empty response.');
    }

    return { reply: String(reply), stub: false };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Uhie could not respond right now.'));
  }
}

export const uhieChatService = {
  sendMessage: sendUhieMessage,
  isConfigured: () => Boolean(UHIE_CHAT_URL)
};
