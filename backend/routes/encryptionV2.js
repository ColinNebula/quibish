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
 * Enhanced Encryption V2 API
 * 
 * Features:
 * - Identity keys (long-term)
 * - Signed prekeys (medium-term)
 * - One-time prekeys (ephemeral, for PFS)
 * - Key bundles for X3DH
 * - Key verification endpoints
 */

// In-memory storage for demonstration
// In production, use a proper database (PostgreSQL, MongoDB, etc.)
const identityKeys = new Map();      // userId → JWK
const signedPreKeys = new Map();     // userId → { id, key, signature, timestamp }
const oneTimePreKeys = new Map();    // userId → [{ id, key, used }]

// ══════════════════════════════════════════════════════════════════════════
// V2 KEY UPLOAD - Upload full key bundle (identity, signed prekey, OTPs)
// ══════════════════════════════════════════════════════════════════════════

router.post('/v2/keys', authenticateToken, (req, res) => {
  const { identityKey, signedPreKey, oneTimePreKeys } = req.body;
  const userId = String(req.user.id || req.user.userId);

  // Validate identity key
  if (!identityKey || identityKey.kty !== 'EC' || identityKey.crv !== 'P-256') {
    return res.status(400).json({
      success: false,
      error: 'Invalid identity key format'
    });
  }

  // Validate signed prekey
  if (!signedPreKey || !signedPreKey.key || !signedPreKey.signature) {
    return res.status(400).json({
      success: false,
      error: 'Invalid signed prekey format'
    });
  }

  // Store identity key
  identityKeys.set(userId, {
    key: identityKey,
    timestamp: Date.now()
  });

  // Store signed prekey
  signedPreKeys.set(userId, {
    id: signedPreKey.id,
    key: signedPreKey.key,
    signature: signedPreKey.signature,
    timestamp: Date.now()
  });

  // Store one-time prekeys
  if (oneTimePreKeys && Array.isArray(oneTimePreKeys)) {
    const existingKeys = oneTimePreKeys.get(userId) || [];
    const newKeys = oneTimePreKeys.map(otk => ({
      id: otk.id,
      key: otk.key,
      used: false
    }));
    oneTimePreKeys.set(userId, [...existingKeys, ...newKeys]);
  }

  console.log(`✅ [E2E V2] User ${userId} uploaded keys:`, {
    identityKey: true,
    signedPreKey: true,
    oneTimePreKeys: oneTimePreKeys?.length || 0
  });

  res.json({
    success: true,
    message: 'Enhanced encryption keys uploaded',
    keysStored: {
      identityKey: true,
      signedPreKey: true,
      oneTimePreKeys: oneTimePreKeys?.length || 0
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// V2 KEY BUNDLE - Fetch peer's key bundle for session initialization
// ══════════════════════════════════════════════════════════════════════════

router.get('/v2/keys/:userId', authenticateToken, (req, res) => {
  const peerId = String(req.params.userId);

  // Get identity key
  const identityData = identityKeys.get(peerId);
  if (!identityData) {
    return res.status(404).json({
      success: false,
      error: `User ${peerId} has not initialized encryption yet`
    });
  }

  // Get signed prekey
  const signedPreKeyData = signedPreKeys.get(peerId);
  if (!signedPreKeyData) {
    return res.status(404).json({
      success: false,
      error: `User ${peerId} has no signed prekey available`
    });
  }

  // Get and mark one unused one-time prekey
  const peerOTKs = oneTimePreKeys.get(peerId) || [];
  const unusedOTK = peerOTKs.find(otk => !otk.used);
  
  let oneTimePreKey = null;
  if (unusedOTK) {
    unusedOTK.used = true; // Mark as used
    oneTimePreKey = {
      id: unusedOTK.id,
      key: unusedOTK.key
    };
    
    console.log(`🔑 [E2E V2] Consumed one-time prekey ${unusedOTK.id} for ${peerId}`);
    
    // If running low on OTPs, log a warning
    const remainingOTKs = peerOTKs.filter(otk => !otk.used).length;
    if (remainingOTKs < 10) {
      console.warn(`⚠️ [E2E V2] User ${peerId} has only ${remainingOTKs} OTPs remaining`);
    }
  } else {
    console.warn(`⚠️ [E2E V2] No one-time prekeys available for ${peerId} - falling back to signed prekey only`);
  }

  res.json({
    success: true,
    identityKey: identityData.key,
    signedPreKey: {
      id: signedPreKeyData.id,
      key: signedPreKeyData.key,
      signature: signedPreKeyData.signature
    },
    oneTimePreKey
  });
});

// ══════════════════════════════════════════════════════════════════════════
// IDENTITY KEY FETCH - For key verification (safety numbers)
// ══════════════════════════════════════════════════════════════════════════

router.get('/v2/identity/:userId', authenticateToken, (req, res) => {
  const peerId = String(req.params.userId);

  const identityData = identityKeys.get(peerId);
  if (!identityData) {
    return res.status(404).json({
      success: false,
      error: `User ${peerId} has not initialized encryption`
    });
  }

  res.json({
    success: true,
    identityKey: identityData.key,
    timestamp: identityData.timestamp
  });
});

// ══════════════════════════════════════════════════════════════════════════
// KEY STATISTICS - Admin/debug endpoint
// ══════════════════════════════════════════════════════════════════════════

router.get('/v2/stats', authenticateToken, (req, res) => {
  const userId = String(req.user.id || req.user.userId);

  const hasIdentityKey = identityKeys.has(userId);
  const hasSignedPreKey = signedPreKeys.has(userId);
  const otks = oneTimePreKeys.get(userId) || [];
  const unusedOTKs = otks.filter(otk => !otk.used).length;

  res.json({
    success: true,
    userId,
    keys: {
      identityKey: hasIdentityKey,
      signedPreKey: hasSignedPreKey,
      oneTimePreKeys: {
        total: otks.length,
        unused: unusedOTKs,
        used: otks.length - unusedOTKs
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// REPLENISH ONE-TIME PREKEYS - Client uploads more when running low
// ══════════════════════════════════════════════════════════════════════════

router.post('/v2/keys/replenish', authenticateToken, (req, res) => {
  const { oneTimePreKeys: newKeys } = req.body;
  const userId = String(req.user.id || req.user.userId);

  if (!newKeys || !Array.isArray(newKeys) || newKeys.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No one-time prekeys provided'
    });
  }

  const existingKeys = oneTimePreKeys.get(userId) || [];
  const formattedKeys = newKeys.map(otk => ({
    id: otk.id,
    key: otk.key,
    used: false
  }));

  oneTimePreKeys.set(userId, [...existingKeys, ...formattedKeys]);

  console.log(`✅ [E2E V2] User ${userId} replenished ${newKeys.length} one-time prekeys`);

  res.json({
    success: true,
    message: `Added ${newKeys.length} one-time prekeys`,
    totalUnused: oneTimePreKeys.get(userId).filter(otk => !otk.used).length
  });
});

// ══════════════════════════════════════════════════════════════════════════
// KEY VERIFICATION - Generate and verify safety numbers
// ══════════════════════════════════════════════════════════════════════════

router.post('/v2/verify/safety-number', authenticateToken, (req, res) => {
  const { peerId } = req.body;
  const userId = String(req.user.id || req.user.userId);

  // Get both identity keys
  const myIdentity = identityKeys.get(userId);
  const peerIdentity = identityKeys.get(peerId);

  if (!myIdentity || !peerIdentity) {
    return res.status(404).json({
      success: false,
      error: 'One or both users have not initialized encryption'
    });
  }

  // Generate safety number (simplified server-side version)
  // In production, this should be done client-side only
  const combined = JSON.stringify(myIdentity.key) + JSON.stringify(peerIdentity.key);
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  
  // Convert hash to 60-digit number
  const safetyNumber = hash
    .match(/.{1,2}/g)
    .slice(0, 30)
    .map(hex => parseInt(hex, 16).toString().padStart(3, '0'))
    .join('')
    .slice(0, 60)
    .match(/.{1,5}/g)
    .join(' ');

  res.json({
    success: true,
    safetyNumber,
    userId,
    peerId,
    timestamp: Date.now()
  });
});

// ══════════════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY - Support legacy V1 endpoints
// ══════════════════════════════════════════════════════════════════════════

router.post('/public-key', authenticateToken, (req, res) => {
  // Legacy V1 endpoint - redirect to upload identity key only
  const { publicKey } = req.body;
  const userId = String(req.user.id || req.user.userId);

  if (!publicKey || publicKey.kty !== 'EC' || publicKey.crv !== 'P-256') {
    return res.status(400).json({
      success: false,
      error: 'Invalid public key format'
    });
  }

  identityKeys.set(userId, {
    key: publicKey,
    timestamp: Date.now()
  });

  res.json({
    success: true,
    message: 'Legacy public key stored (consider upgrading to V2)'
  });
});

router.get('/public-key/:userId', authenticateToken, (req, res) => {
  // Legacy V1 endpoint
  const peerId = String(req.params.userId);
  const identityData = identityKeys.get(peerId);

  if (!identityData) {
    return res.status(404).json({
      success: false,
      error: `User ${peerId} has not initialized encryption`
    });
  }

  res.json({
    success: true,
    publicKey: identityData.key
  });
});

module.exports = router;
