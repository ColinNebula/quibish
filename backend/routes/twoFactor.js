const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// Helper function to find user (supports both MongoDB and in-memory)
const findUserById = async (userId) => {
  if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
    return global.inMemoryStorage.users.find(user => user.id === userId);
  }
  return await User.findOne({ id: userId });
};

// Helper function to save user (supports both MongoDB and in-memory)
const saveUser = async (user) => {
  if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
    const userIndex = global.inMemoryStorage.users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      global.inMemoryStorage.users[userIndex] = { ...user };
    }
    return user;
  }
  return await user.save();
};

// Helper function to generate backup codes
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push({
      code: code,
      used: false,
      createdAt: new Date()
    });
  }
  return codes;
};

// POST /api/auth/2fa/setup - Initialize 2FA setup
router.post('/setup', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await findUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if 2FA is already enabled
    if (user.twoFactorAuth && user.twoFactorAuth.enabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is already enabled for this account'
      });
    }

    // Generate a new secret
    const secret = speakeasy.generateSecret({
      name: `Quibish (${user.username})`,
      issuer: 'Quibish',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store the secret temporarily (not enabled yet)
    if (!user.twoFactorAuth) {
      user.twoFactorAuth = {};
    }
    user.twoFactorAuth.secret = secret.base32;
    user.twoFactorAuth.enabled = false;
    
    await saveUser(user);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
      message: 'Scan the QR code with your authenticator app'
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/2fa/verify-setup - Verify and enable 2FA
router.post('/verify-setup', verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    const user = await findUserById(userId);
    
    if (!user || !user.twoFactorAuth || !user.twoFactorAuth.secret) {
      return res.status(400).json({
        success: false,
        error: '2FA setup not initiated'
      });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorAuth.secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds) of variance
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }

    // Enable 2FA and generate backup codes
    const backupCodes = generateBackupCodes();
    
    user.twoFactorAuth.enabled = true;
    user.twoFactorAuth.backupCodes = backupCodes;
    user.twoFactorAuth.setupAt = new Date();
    user.twoFactorAuth.method = 'totp';
    
    await saveUser(user);

    res.json({
      success: true,
      backupCodes: backupCodes.map(bc => bc.code),
      message: '2FA has been successfully enabled'
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/2fa/verify - Verify 2FA during login
router.post('/verify', async (req, res) => {
  try {
    const { userId, token, isBackupCode = false } = req.body;
    
    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        error: 'User ID and token are required'
      });
    }

    const user = await findUserById(userId);
    
    if (!user || !user.twoFactorAuth || !user.twoFactorAuth.enabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is not enabled for this user'
      });
    }

    let verified = false;

    if (isBackupCode) {
      // Verify backup code
      const backupCode = user.twoFactorAuth.backupCodes.find(
        bc => bc.code === token.toUpperCase() && !bc.used
      );
      
      if (backupCode) {
        backupCode.used = true;
        verified = true;
        await saveUser(user);
      }
    } else {
      // Verify TOTP token
      verified = speakeasy.totp.verify({
        secret: user.twoFactorAuth.secret,
        encoding: 'base32',
        token: token,
        window: 2
      });
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }

    // Update last used timestamp
    user.twoFactorAuth.lastUsed = new Date();
    await saveUser(user);

    res.json({
      success: true,
      message: '2FA verification successful'
    });

  } catch (error) {
    console.error('2FA login verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/2fa/disable - Disable 2FA
router.post('/disable', verifyToken, async (req, res) => {
  try {
    const { password, token } = req.body;
    const userId = req.user.id;
    
    if (!password || !token) {
      return res.status(400).json({
        success: false,
        error: 'Password and 2FA token are required'
      });
    }

    const user = await findUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Verify 2FA token
    if (!user.twoFactorAuth || !user.twoFactorAuth.enabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is not enabled'
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorAuth.secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid 2FA token'
      });
    }

    // Disable 2FA
    user.twoFactorAuth.enabled = false;
    user.twoFactorAuth.secret = null;
    user.twoFactorAuth.backupCodes = [];
    
    await saveUser(user);

    res.json({
      success: true,
      message: '2FA has been disabled'
    });

  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/auth/2fa/backup-codes - Generate new backup codes
router.get('/backup-codes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await findUserById(userId);
    
    if (!user || !user.twoFactorAuth || !user.twoFactorAuth.enabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is not enabled'
      });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes();
    user.twoFactorAuth.backupCodes = backupCodes;
    
    await saveUser(user);

    res.json({
      success: true,
      backupCodes: backupCodes.map(bc => bc.code),
      message: 'New backup codes generated'
    });

  } catch (error) {
    console.error('Backup codes generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/auth/2fa/status - Get 2FA status
router.get('/status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await findUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const twoFactorAuth = user.twoFactorAuth || {};
    const unusedBackupCodes = twoFactorAuth.backupCodes 
      ? twoFactorAuth.backupCodes.filter(bc => !bc.used).length 
      : 0;

    res.json({
      success: true,
      enabled: twoFactorAuth.enabled || false,
      method: twoFactorAuth.method || 'totp',
      setupAt: twoFactorAuth.setupAt,
      lastUsed: twoFactorAuth.lastUsed,
      unusedBackupCodes
    });

  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;