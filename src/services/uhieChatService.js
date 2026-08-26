import axios from 'axios';
import { API_URL, UHIE_CHAT_URL, getApiErrorMessage } from '../config/api';
import { authService } from './authService';

/**
 * Prefer dedicated Uhie URL, otherwise the shared API host `/api/chat` backend route.
 */
function getChatEndpoint() {
  if (UHIE_CHAT_URL) return UHIE_CHAT_URL;
  return `${API_URL}/api/chat`;
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
 * Send a chat message to the Uhie backend (Azure Foundry via Express).
 *
 * POST /api/chat
 * Authorization: Bearer <user JWT>
 * Body: { message, history, user }
 * Response: { reply } or { response }
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

    return { reply: String(reply), stub: false };
  } catch (error) {
    const serverMessage = error?.response?.data?.error;
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
