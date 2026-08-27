/**
 * Persist Uhie chat transcripts in sessionStorage, keyed by signed-in user.
 * Cleared on logout; not cleared merely because the widget is hidden on a public route.
 */

const STORAGE_PREFIX = 'uhie-chat:';
const OPEN_PREFIX = 'uhie-chat-open:';

function identityKey(user) {
  if (!user?.employeeCode || !user?.role) return null;
  return `${String(user.employeeCode).trim()}:${String(user.role).trim()}`;
}

export function getUhieChatStorageKey(user) {
  const id = identityKey(user);
  return id ? `${STORAGE_PREFIX}${id}` : null;
}

function getOpenStorageKey(user) {
  const id = identityKey(user);
  return id ? `${OPEN_PREFIX}${id}` : null;
}

/**
 * @returns {{ messages: Array, isOpen?: boolean } | null}
 */
export function loadUhieChat(user) {
  const key = getUhieChatStorageKey(user);
  if (!key) return null;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.messages)) return null;

    let isOpen = false;
    const openKey = getOpenStorageKey(user);
    if (openKey) {
      isOpen = sessionStorage.getItem(openKey) === '1';
    } else if (typeof parsed.isOpen === 'boolean') {
      isOpen = parsed.isOpen;
    }

    return { messages: parsed.messages, isOpen };
  } catch {
    return null;
  }
}

/**
 * @param {object} user
 * @param {{ messages: Array, isOpen?: boolean }} data
 */
export function saveUhieChat(user, { messages, isOpen }) {
  const key = getUhieChatStorageKey(user);
  if (!key || !Array.isArray(messages)) return;

  try {
    sessionStorage.setItem(key, JSON.stringify({ messages }));
    const openKey = getOpenStorageKey(user);
    if (openKey && typeof isOpen === 'boolean') {
      sessionStorage.setItem(openKey, isOpen ? '1' : '0');
    }
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

/** Clear persisted chat for one user. */
export function clearUhieChat(user) {
  const key = getUhieChatStorageKey(user);
  const openKey = getOpenStorageKey(user);
  try {
    if (key) sessionStorage.removeItem(key);
    if (openKey) sessionStorage.removeItem(openKey);
  } catch {
    // ignore
  }
}

/** Clear all Uhie chat keys (used on logout). */
export function clearAllUhieChat() {
  try {
    const toRemove = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (
        k &&
        (k.startsWith(STORAGE_PREFIX) || k.startsWith(OPEN_PREFIX))
      ) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
