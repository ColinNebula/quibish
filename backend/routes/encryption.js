const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const { JWT_SECRET } = require('../config/jwt');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * In-memory public-key registry.
 * Maps userId (string) → JWK ECDH public key object.
 *
 * Keys are re-uploaded by each client at app initialisation, so a server
 * restart just means clients re-upload on next page load — safe in practice.
 */
const publicKeyRegistry = new Map();

// ── POST /api/encryption/public-key ──────────────────────────────────────────
// Store or refresh the authenticated user's ECDH P-256 public key.
router.post('/public-key', authenticateToken, (req, res) => {
  const { publicKey } = req.body;

  if (
    !publicKey ||
    typeof publicKey !== 'object' ||
    publicKey.kty !== 'EC' ||
    publicKey.crv !== 'P-256'
  ) {
    return res.status(400).json({
      success: false,
      error: 'publicKey must be a valid ECDH P-256 JWK object (kty:"EC", crv:"P-256")'
    });
  }

  // Only store the public components — private key never leaves the client
  const safeKey = {
    kty: publicKey.kty,
    crv: publicKey.crv,
    x:   publicKey.x,
    y:   publicKey.y,
    key_ops: [],
    ext: true
  };

  const userId = String(req.user.id || req.user.userId);
  publicKeyRegistry.set(userId, safeKey);

  res.json({ success: true, message: 'Public key stored' });
});

// ── GET /api/encryption/public-key ───────────────────────────────────────────
// Return the authenticated user's own stored public key.
router.get('/public-key', authenticateToken, (req, res) => {
  const userId = String(req.user.id || req.user.userId);
  const key    = publicKeyRegistry.get(userId);

  if (!key) {
    return res.status(404).json({
      success: false,
      error: 'No public key found. Initialise encryption on the client first.'
    });
  }

  res.json({ success: true, publicKey: key });
});

// ── GET /api/encryption/public-key/:userId ────────────────────────────────────
// Return another user's public key so the requester can derive the shared ECDH secret.
// Only authenticated users may fetch peer keys.
router.get('/public-key/:userId', authenticateToken, (req, res) => {
  const peerId = String(req.params.userId);
  const key    = publicKeyRegistry.get(peerId);

  if (!key) {
    return res.status(404).json({
      success: false,
      error: `User ${peerId} has not yet set up encryption. Ask them to open the app.`
    });
  }

  res.json({ success: true, publicKey: key });
});

module.exports = router;

