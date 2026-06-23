// RealtimeService — WebSocket client for live messaging and call signaling
// Handles connect/reconnect, event subscription, and message dispatch.

// Determine WebSocket URL dynamically (mobile-friendly)
const getWsUrl = () => {
  const raw = process.env.REACT_APP_WEBSOCKET_URL;
  if (raw) {
    const url = raw.replace(/^http/, 'ws') + '/ws';
    console.log('📡 Using explicit WS_URL from env:', url);
    return url;
  }
  
  // Derive from API base URL
  let api = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
  
  // On mobile, if pointing to localhost, try to use the actual server
  if (api.includes('localhost') && window.location.hostname !== 'localhost') {
    console.warn('⚠️ Mobile detected - API URL points to localhost. Using current host instead.');
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    api = `${protocol}://${host}/api`;
  }
  
  const wsUrl = api.replace('/api', '').replace(/^http/, 'ws') + '/ws';
  console.log('📡 Computed WebSocket URL:', wsUrl);
  return wsUrl;
};

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
      const wsUrl = getWsUrl();
      console.log(`🔗 Attempting WebSocket connection to: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectDelay = 2000; // reset backoff
        console.log('✅ RealtimeService connected successfully');
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
        console.warn('🔌 WebSocket closed');
        if (this.shouldReconnect) {
          console.log(`🔄 Reconnecting in ${this.reconnectDelay / 1000}s…`);
          this.reconnectTimer = setTimeout(() => {
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
            this._open();
          }, this.reconnectDelay);
        }
      };

      this.ws.onerror = (err) => {
        console.error('❌ RealtimeService WS error:', {
          message: err.message || err,
          type: err.type,
          code: err.code
        });
      };

      this.ws.onmessage = (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        this._emit(data.type, data);
      };
    } catch (e) {
      console.error('❌ Could not open WebSocket:', {
        message: e.message,
        stack: e.stack
      });
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
  sendMessage({ text, conversationId, recipientId, encrypted = false }) {
    const clientId = Date.now().toString();
    const payload = { type: 'message', text, conversationId, recipientId, encrypted, clientId };
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

  // Diagnostic method for troubleshooting connection issues
  getDiagnostics() {
    return {
      connected: this.connected,
      wsState: this.ws?.readyState,
      wsStateLabel: {
        0: 'CONNECTING',
        1: 'OPEN',
        2: 'CLOSING',
        3: 'CLOSED'
      }[this.ws?.readyState] || 'UNKNOWN',
      wsUrl: getWsUrl(),
      userId: this.userId,
      username: this.username,
      shouldReconnect: this.shouldReconnect,
      reconnectDelay: this.reconnectDelay,
      pendingMessages: this.pendingMessages.length,
      listeners: Array.from(this.listeners.keys()),
      internetOnline: navigator.onLine,
      hostname: window.location.hostname,
      protocol: window.location.protocol
    };
  }

  // Log diagnostics to console
  logDiagnostics() {
    const diag = this.getDiagnostics();
    console.table(diag);
    return diag;
  }
}

const realtimeService = new RealtimeService();

export default realtimeService;
