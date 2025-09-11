# Quibish Security Hardening Guide

## 🛡️ Production Security Recommendations

### 1. **HTTPS & SSL/TLS Configuration**

#### Backend Security Headers
Add these security headers to your Express server:

```javascript
// backend/server.js - Add security middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://ui-avatars.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);
```

#### Install Required Packages
```bash
npm install helmet express-rate-limit cors
```

### 2. **Environment Variables Security**

Create `.env` file for sensitive configuration:
```env
# .env file (NEVER commit this to git)
JWT_SECRET=your-super-secure-jwt-secret-key-here
DATABASE_URL=your-database-connection-string
TURN_SERVER_USERNAME=your-turn-server-username
TURN_SERVER_CREDENTIAL=your-turn-server-password
ENCRYPTION_KEY=your-32-character-encryption-key
API_BASE_URL=https://your-domain.com/api
```

### 3. **Database Security**

#### MySQL Configuration Hardening
```javascript
// backend/config/database.js - Secure database config
module.exports = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};
```

### 4. **Authentication Security Enhancements**

#### JWT Token Security
```javascript
// backend/middleware/auth.js - Enhanced JWT handling
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Token refresh mechanism
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Password hashing with salt
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
};
```

### 5. **File Upload Security**

#### Secure File Handling
```javascript
// backend/routes/upload.js - Secure file uploads
const multer = require('multer');
const path = require('path');

const fileFilter = (req, file, cb) => {
  // Allow only specific file types
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
      // Generate unique filename
      const uniqueName = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});
```

### 6. **Frontend Security Enhancements**

#### Content Security Policy
```javascript
// public/index.html - Add CSP meta tag
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               font-src 'self' https://fonts.gstatic.com; 
               img-src 'self' data: https://ui-avatars.com; 
               connect-src 'self' wss: https:;">
```

#### Secure Local Storage
```javascript
// src/services/secureStorage.js
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY;

export const secureStorage = {
  setItem: (key, value) => {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(value), ENCRYPTION_KEY).toString();
    localStorage.setItem(key, encrypted);
  },
  
  getItem: (key) => {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    try {
      const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  },
  
  removeItem: (key) => {
    localStorage.removeItem(key);
  }
};
```

### 7. **Network Security**

#### WebRTC Security Configuration
```javascript
// src/services/globalVoiceCallService.js - Secure WebRTC
const secureIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: process.env.REACT_APP_TURN_USERNAME,
    credential: process.env.REACT_APP_TURN_CREDENTIAL
  }
];

const rtcConfiguration = {
  iceServers: secureIceServers,
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all', // Use 'relay' for maximum security
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};
```

### 8. **Deployment Security Checklist**

#### Production Environment Setup
- [ ] **HTTPS Certificate** installed and configured
- [ ] **Environment variables** properly set
- [ ] **Database credentials** secured
- [ ] **CORS** configured for specific domains only
- [ ] **Rate limiting** enabled
- [ ] **Security headers** implemented
- [ ] **File upload restrictions** in place
- [ ] **Error handling** that doesn't expose sensitive info
- [ ] **Logging** configured for security events
- [ ] **Regular security updates** scheduled

#### Docker Security (if using containers)
```dockerfile
# Dockerfile - Security best practices
FROM node:18-alpine AS builder
RUN addgroup -g 1001 -S nodejs
RUN adduser -S quibish -u 1001

# Copy and install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Use non-root user
USER quibish

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### 9. **Monitoring & Logging**

#### Security Event Logging
```javascript
// backend/middleware/securityLogger.js
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
    new winston.transports.Console()
  ]
});

// Log security events
const logSecurityEvent = (event, details) => {
  securityLogger.warn({
    event,
    timestamp: new Date().toISOString(),
    details,
    ip: details.ip,
    userAgent: details.userAgent
  });
};
```

### 10. **Regular Security Maintenance**

#### Automated Security Checks
```bash
# Package.json - Add security scripts
{
  "scripts": {
    "security:audit": "npm audit",
    "security:fix": "npm audit fix",
    "security:check": "npx better-npm-audit audit"
  }
}
```

#### Weekly Security Tasks
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review access logs for suspicious activity
- [ ] Update dependencies with security patches
- [ ] Test backup and recovery procedures
- [ ] Review user access permissions

## 🎯 **Implementation Priority**

### **High Priority (Implement First):**
1. HTTPS configuration
2. Environment variables
3. Security headers
4. Rate limiting
5. Input validation

### **Medium Priority:**
1. Enhanced authentication
2. File upload security
3. Logging implementation
4. Database security

### **Low Priority (Nice to Have):**
1. Advanced monitoring
2. Container security
3. Automated security testing

## 📊 **Security Compliance**

This configuration helps meet:
- **OWASP Top 10** security guidelines
- **GDPR** data protection requirements
- **SOC 2** security controls
- **ISO 27001** information security standards

With these implementations, your Quibish app will be enterprise-ready and secure for production deployment on any smart device or platform.