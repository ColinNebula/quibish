/**
 * End-to-End Encryption Service
 *
 * Algorithm: ECDH P-256 key exchange + AES-256-GCM message encryption
 *
 * Flow:
 *  1. Each user generates an EC P-256 key pair on first initialisation.
 *  2. The public key (JWK) is uploaded to the server so peers can fetch it.
 *  3. When messaging peer B:
 *       sharedKey = ECDH(myPrivateKey, peerPublicKey)   ← both sides get same key
 *  4. Messages are encrypted with AES-GCM (random 96-bit IV per message).
 *  5. Wire format: base64( iv[12 bytes] ‖ ciphertext )
 *  6. The server never sees plaintext — only routes ciphertext.
 */

import { buildApiUrl } from '../config/api';

const PRIV_KEY_LS = uid => `e2e_privkey_${uid}`;
const PUB_KEY_LS  = uid => `e2e_pubkey_${uid}`;

// Retrieve auth token from any key the app may use
const getAuthToken = () =>
  localStorage.getItem('quibish_auth_token') ||
  localStorage.getItem('auth_token') ||
  null;

class EncryptedMessageService {
  constructor() {
    this.privateKey       = null; // CryptoKey (ECDH private)
    this.publicKey        = null; // CryptoKey (ECDH public)
    this.publicKeyJwk     = null; // JWK — sent to server
    this.sharedKeys       = new Map(); // peerId → AES-GCM CryptoKey
    this.userId           = null;
    this.isInitialized    = false;
    this.encryptionEnabled = false;
  }

  // ── Initialise ─────────────────────────────────────────────────────────────
  async initializeEncryption(userId) {
    try {
      this.userId = String(userId);

      const savedPriv = localStorage.getItem(PRIV_KEY_LS(this.userId));
      const savedPub  = localStorage.getItem(PUB_KEY_LS(this.userId));

      if (savedPriv && savedPub) {
        // Restore persisted key pair
        const privJwk = JSON.parse(savedPriv);
        const pubJwk  = JSON.parse(savedPub);
        this.publicKeyJwk = pubJwk;

        [this.privateKey, this.publicKey] = await Promise.all([
          crypto.subtle.importKey(
            'jwk', privJwk,
            { name: 'ECDH', namedCurve: 'P-256' },
            false,        // not re-extractable after import — already saved
            ['deriveKey']
          ),
          crypto.subtle.importKey(
            'jwk', pubJwk,
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            []
          )
        ]);
      } else {
        // Generate fresh ECDH P-256 key pair
        const kp = await crypto.subtle.generateKey(
          { name: 'ECDH', namedCurve: 'P-256' },
          true, // must be extractable so we can save to localStorage
          ['deriveKey']
        );
        this.privateKey   = kp.privateKey;
        this.publicKey    = kp.publicKey;
        this.publicKeyJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
        const privJwk     = await crypto.subtle.exportKey('jwk', kp.privateKey);

        localStorage.setItem(PRIV_KEY_LS(this.userId), JSON.stringify(privJwk));
        localStorage.setItem(PUB_KEY_LS(this.userId),  JSON.stringify(this.publicKeyJwk));
      }

      // Upload public key so peers can derive the shared secret
      await this._uploadPublicKey();

      this.isInitialized     = true;
      this.encryptionEnabled = true;

      return { success: true, message: 'E2E encryption ready', keyGenerated: !savedPriv };
    } catch (err) {
      console.error('[E2E] Initialisation failed:', err);
      return { success: false, message: 'Failed to initialise encryption', error: err.message };
    }
  }

  // ── Upload own public key to server ────────────────────────────────────────
  async _uploadPublicKey() {
    try {
      const token = getAuthToken();
      const res = await fetch(buildApiUrl('encryption/public-key'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ publicKey: this.publicKeyJwk })
      });
      if (!res.ok) console.warn('[E2E] Public key upload returned', res.status);
    } catch (err) {
      // Non-fatal — will retry on next init
      console.warn('[E2E] Public key upload failed:', err.message);
    }
  }

  // ── Derive shared AES-GCM key for a peer (cached in memory) ───────────────
  async _getSharedKey(peerId) {
    const id = String(peerId);
    if (this.sharedKeys.has(id)) return this.sharedKeys.get(id);

    const token = getAuthToken();
    const res = await fetch(buildApiUrl(`encryption/public-key/${id}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (!res.ok) {
      throw new Error(
        `Peer ${id} has no public key on the server — they need to open the app first.`
      );
    }

    const { publicKey: peerJwk } = await res.json();

    const peerPublicKey = await crypto.subtle.importKey(
      'jwk', peerJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // Both sides independently compute the same shared key via ECDH math
    const sharedKey = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: peerPublicKey },
      this.privateKey,
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );

    this.sharedKeys.set(id, sharedKey);
    return sharedKey;
  }

  // ── Encrypt a plaintext message for a specific peer ────────────────────────
  // Returns base64( iv[12] ‖ ciphertext )
  async encryptFor(plaintext, peerId) {
    if (!this.isInitialized) throw new Error('E2E not initialised');

    const sharedKey = await this._getSharedKey(peerId);
    const iv        = crypto.getRandomValues(new Uint8Array(12)); // 96-bit random IV
    const encoded   = new TextEncoder().encode(plaintext);
    const cipherBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      encoded
    );

    // Pack iv + ciphertext into a single base64 string
    const combined = new Uint8Array(12 + cipherBuf.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuf), 12);
    return btoa(String.fromCharCode(...combined));
  }

  // ── Decrypt a message received from a specific peer ────────────────────────
  async decryptFrom(b64, peerId) {
    if (!this.isInitialized) throw new Error('E2E not initialised');

    const sharedKey = await this._getSharedKey(peerId);
    const combined  = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv        = combined.slice(0, 12);
    const cipher    = combined.slice(12);
    const plain     = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      cipher
    );
    return new TextDecoder().decode(plain);
  }

  // ── Status ─────────────────────────────────────────────────────────────────
  getEncryptionStatus() {
    return {
      initialized: this.isInitialized,
      enabled:     this.encryptionEnabled,
      hasKey:      !!this.privateKey
    };
  }

  // ── Legacy compatibility stubs (kept so existing callers don't break) ──────
  encryptMessage(msg) { return msg; }
  decryptMessage(msg) { return msg; }
  async sendMessage(messageData) {
    return { ...messageData, id: Date.now().toString(), timestamp: new Date().toISOString() };
  }
  async getMessages() { return []; }
}

export default new EncryptedMessageService();
