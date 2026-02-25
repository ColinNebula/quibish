// RealtimeService — WebSocket client for live messaging and call signaling
// Handles connect/reconnect, event subscription, and message dispatch.

const WS_URL = (() => {
  const raw = process.env.REACT_APP_WEBSOCKET_URL;
  if (raw) return raw.replace(/^http/, 'ws') + '/ws';
  // Derive from API base URL
  const api = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
  return api.replace('/api', '').replace(/^http/, 'ws') + '/ws';
})();

class RealtimeService {
  constructor() {
    this.ws = null;
    this.userId = null;
    this.username = null;
    this.connected = false;
    this.reconnectDelay = 2000;
    this.maxReconnectDelay = 30000;
    this.reconnectTimer = null;
    this.shouldReconnect = false;
    this.listeners = new Map(); // eventType -> Set<handler>
    this.pendingMessages = []; // messages queued while disconnected
  }

  // ── Connect ──────────────────────────────────────────
  connect(userId, username) {
    this.userId = String(userId);
    this.username = username || 'User';
    this.shouldReconnect = true;
    this._open();
  }

  _open() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectDelay = 2000; // reset backoff
        console.log('🔌 RealtimeService connected');
        // Authenticate this socket
        this._send({ type: 'join', userId: this.userId, username: this.username });
        // Flush queued messages
        while (this.pendingMessages.length > 0) {
          this._send(this.pendingMessages.shift());
        }
        this._emit('connect', {});
      };

      this.ws.onclose = () => {
        this.connected = false;
        this._emit('disconnect', {});
        if (this.shouldReconnect) {
          console.log(`🔄 Reconnecting in ${this.reconnectDelay / 1000}s…`);
          this.reconnectTimer = setTimeout(() => {
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
            this._open();
          }, this.reconnectDelay);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('⚠️ RealtimeService WS error:', err.message || err);
      };

      this.ws.onmessage = (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        this._emit(data.type, data);
      };
    } catch (e) {
      console.warn('⚠️ Could not open WebSocket:', e.message);
      // Retry via backoff even if constructor threw
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this._open(), this.reconnectDelay);
      }
    }
  }

  // ── Disconnect ───────────────────────────────────────
  disconnect() {
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  // ── Send ─────────────────────────────────────────────
  _send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  // ── Public helpers ───────────────────────────────────

  /** Send a chat message. Returns a clientId you can match against 'message-sent'. */
  sendMessage({ text, conversationId, recipientId }) {
    const clientId = Date.now().toString();
    const payload = { type: 'message', text, conversationId, recipientId, clientId };
    if (!this._send(payload)) {
      this.pendingMessages.push(payload); // queue for when connected
    }
    return clientId;
  }

  /** Emit a typing indicator. */
  sendTyping({ conversationId, recipientId }) {
    this._send({ type: 'typing', conversationId, recipientId });
  }

  /** Send WebRTC call signaling. */
  sendSignal(type, targetUserId, payload = {}) {
    this._send({ type, targetUserId, ...payload });
  }

  // ── Event subscription ───────────────────────────────
  on(eventType, handler) {
    if (!this.listeners.has(eventType)) this.listeners.set(eventType, new Set());
    this.listeners.get(eventType).add(handler);
    return () => this.off(eventType, handler); // returns unsubscribe fn
  }

  off(eventType, handler) {
    this.listeners.get(eventType)?.delete(handler);
  }

  _emit(eventType, data) {
    this.listeners.get(eventType)?.forEach(h => {
      try { h(data); } catch (e) { console.error('RealtimeService handler error:', e); }
    });
  }

  isConnected() {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }
}

export default new RealtimeService();
