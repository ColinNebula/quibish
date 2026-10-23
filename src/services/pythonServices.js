// Client for the optional Python companion service (services/python).
// Opt-in: set REACT_APP_PY_SERVICES_URL (e.g. http://localhost:8000). When unset, unreachable,
// or failing, every call quietly returns null/[] and the app keeps using its local behaviour.
import secureTokenManager from './secureTokenManager';

const BASE = (process.env.REACT_APP_PY_SERVICES_URL || '').replace(/\/$/, '');
const TIMEOUT_MS = 2500;
const COOLDOWN_MS = 60000;

let downUntil = 0;

const enabled = () => Boolean(BASE) && Date.now() >= downUntil;

async function request(path, { method = 'GET', json, form, timeout = TIMEOUT_MS, raw = false } = {}) {
  if (!enabled()) return null;
  const token = await secureTokenManager.getToken();
  if (!token) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const headers = { Authorization: `Bearer ${token}` };
    if (json !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : form,
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    if (res.status === 204) return {};
    return raw ? await res.blob() : await res.json();
  } catch (_) {
    downUntil = Date.now() + COOLDOWN_MS; // back off while the service is unreachable
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const pythonServices = {
  isConfigured: () => Boolean(BASE),

  // Only plain (non end-to-end encrypted) text may be sent here.
  indexMessage(message) {
    if (!BASE || !message?.text || message.isEncrypted || message.encrypted || message.id == null) return;
    request('/search/index', {
      method: 'POST',
      json: {
        id: String(message.id),
        text: String(message.text).slice(0, 4000),
        conversationId: message.conversationId != null ? String(message.conversationId) : null,
        timestamp: message.timestamp || null
      }
    });
  },

  async search(query, { conversationId, limit = 20 } = {}) {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (conversationId) params.set('conversationId', String(conversationId));
    const data = await request(`/search?${params}`);
    return data?.results || [];
  },

  // Returns an optimized Blob (EXIF/GPS stripped) or null so callers fall back to local processing.
  optimizeImage(file) {
    const form = new FormData();
    form.append('file', file, file.name);
    return request('/media/image/optimize?max_side=1920&quality=85&fmt=webp', {
      method: 'POST', form, timeout: 15000, raw: true
    });
  }
};

export default pythonServices;