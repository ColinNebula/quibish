/**
 * Public Key Management Routes
 * Handles sharing and discovery of user public keys for E2E encryption
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// In-memory storage for demonstration (use database in production)
let userPublicKeys = new Map();
let keyFingerprints = new Map();

/**
 * Share/update user's public key
 * POST /api/encryption/public-key
 */
router.post('/public-key', auth, async (req, res) => {
  try {
    const { publicKeyBase64, fingerprint } = req.body;
    const userId = req.user.id;

    if (!publicKeyBase64) {
      return res.status(400).json({ 
        error: 'Public key is required' 
      });
    }

    // Validate base64 format
    try {
      atob(publicKeyBase64);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid base64 public key format' 
      });
    }

    // Store the public key
    userPublicKeys.set(userId, {
      publicKey: publicKeyBase64,
      fingerprint: fingerprint || null,
      updatedAt: new Date().toISOString(),
      userId: userId
    });

    if (fingerprint) {
      keyFingerprints.set(userId, fingerprint);
    }

    console.log(`🔑 Public key stored for user: ${userId}`);

    res.json({
      success: true,
      message: 'Public key stored successfully',
      fingerprint: fingerprint
    });

  } catch (error) {
    console.error('❌ Error storing public key:', error);
    res.status(500).json({ 
      error: 'Failed to store public key' 
    });
  }
});

/**
 * Get a user's public key
 * GET /api/encryption/public-key/:userId
 */
router.get('/public-key/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;

    // Check if the public key exists
    const keyData = userPublicKeys.get(userId);
    
    if (!keyData) {
      return res.status(404).json({ 
        error: 'Public key not found for this user' 
      });
    }

    // Return the public key (remove sensitive data)
    res.json({
      success: true,
      userId: userId,
      publicKey: keyData.publicKey,
      fingerprint: keyData.fingerprint,
      updatedAt: keyData.updatedAt
    });

    console.log(`🔍 Public key requested by ${requestingUserId} for user: ${userId}`);

  } catch (error) {
    console.error('❌ Error retrieving public key:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve public key' 
    });
  }
});

/**
 * Get multiple users' public keys
 * POST /api/encryption/public-keys
 */
router.post('/public-keys', auth, async (req, res) => {
  try {
    const { userIds } = req.body;
    const requestingUserId = req.user.id;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ 
        error: 'userIds must be an array' 
      });
    }

    const publicKeys = {};
    const notFound = [];

    userIds.forEach(userId => {
      const keyData = userPublicKeys.get(userId);
      if (keyData) {
        publicKeys[userId] = {
          publicKey: keyData.publicKey,
          fingerprint: keyData.fingerprint,
          updatedAt: keyData.updatedAt
        };
      } else {
        notFound.push(userId);
      }
    });

    res.json({
      success: true,
      publicKeys: publicKeys,
      notFound: notFound,
      requestedBy: requestingUserId
    });

    console.log(`🔍 Bulk public keys requested by ${requestingUserId} for users:`, userIds);

  } catch (error) {
    console.error('❌ Error retrieving public keys:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve public keys' 
    });
  }
});

/**
 * Get user's own public key
 * GET /api/encryption/my-public-key
 */
router.get('/my-public-key', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const keyData = userPublicKeys.get(userId);
    
    if (!keyData) {
      return res.status(404).json({ 
        error: 'No public key found for your account' 
      });
    }

    res.json({
      success: true,
      userId: userId,
      publicKey: keyData.publicKey,
      fingerprint: keyData.fingerprint,
      updatedAt: keyData.updatedAt
    });

  } catch (error) {
    console.error('❌ Error retrieving own public key:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve your public key' 
    });
  }
});

/**
 * Delete user's public key
 * DELETE /api/encryption/public-key
 */
router.delete('/public-key', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const existed = userPublicKeys.has(userId);
    userPublicKeys.delete(userId);
    keyFingerprints.delete(userId);

    res.json({
      success: true,
      message: existed ? 'Public key deleted successfully' : 'No public key was found to delete'
    });

    console.log(`🗑️ Public key deleted for user: ${userId}`);

  } catch (error) {
    console.error('❌ Error deleting public key:', error);
    res.status(500).json({ 
      error: 'Failed to delete public key' 
    });
  }
});

/**
 * Verify key fingerprint
 * POST /api/encryption/verify-fingerprint
 */
router.post('/verify-fingerprint', auth, async (req, res) => {
  try {
    const { userId, fingerprint } = req.body;
    const requestingUserId = req.user.id;

    if (!userId || !fingerprint) {
      return res.status(400).json({ 
        error: 'userId and fingerprint are required' 
      });
    }

    const storedFingerprint = keyFingerprints.get(userId);
    const isMatch = storedFingerprint === fingerprint;

    res.json({
      success: true,
      userId: userId,
      fingerprintMatch: isMatch,
      verifiedBy: requestingUserId,
      verifiedAt: new Date().toISOString()
    });

    console.log(`🔐 Fingerprint verification by ${requestingUserId} for user ${userId}: ${isMatch ? 'MATCH' : 'MISMATCH'}`);

  } catch (error) {
    console.error('❌ Error verifying fingerprint:', error);
    res.status(500).json({ 
      error: 'Failed to verify fingerprint' 
    });
  }
});

/**
 * Get encryption status and statistics
 * GET /api/encryption/status
 */
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const hasPublicKey = userPublicKeys.has(userId);
    
    res.json({
      success: true,
      encryptionEnabled: hasPublicKey,
      totalUsers: userPublicKeys.size,
      yourKeyExists: hasPublicKey,
      lastUpdated: hasPublicKey ? userPublicKeys.get(userId).updatedAt : null
    });

  } catch (error) {
    console.error('❌ Error getting encryption status:', error);
    res.status(500).json({ 
      error: 'Failed to get encryption status' 
    });
  }
});

/**
 * Health check for encryption service
 * GET /api/encryption/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'encryption',
    status: 'operational',
    timestamp: new Date().toISOString(),
    features: {
      publicKeyStorage: true,
      fingerprintVerification: true,
      bulkKeyRetrieval: true
    }
  });
});

module.exports = router;