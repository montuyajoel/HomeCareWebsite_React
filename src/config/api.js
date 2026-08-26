const PRODUCTION_API_URL = 'https://backend-home-care-scheduler-api.vercel.app';

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? PRODUCTION_API_URL : 'http://localhost:5001');

/**
 * Optional override for the Uhie chat endpoint.
 * Default: `${API_URL}/api/uhie/chat` (HomeCare backend).
 * Set VITE_UHIE_CHAT_URL to empty string only if you intentionally clear the override;
 * the service still falls back to `${API_URL}/api/uhie/chat`.
 */
export const UHIE_CHAT_URL = import.meta.env.VITE_UHIE_CHAT_URL || '';

export function getApiErrorMessage(error, fallback = 'Request failed.') {
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return `Cannot reach the API at ${API_URL}. Start the backend locally or set VITE_API_URL in Vercel.`;
  }

  return error?.response?.data?.message || error?.message || fallback;
}
