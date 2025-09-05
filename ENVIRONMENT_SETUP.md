# Environment Configuration Guide

## Overview

This project uses environment variables to configure different aspects of the application for different environments (development, production, testing).

## File Structure

```
📁 quibish/
├── 📄 .env                    # Default configuration (committed)
├── 📄 .env.development        # Development overrides (committed)
├── 📄 .env.production         # Production overrides (committed)
├── 📄 .env.example            # Template file (committed)
├── 📄 .env.local              # Local overrides (gitignored)
├── 📄 .env.development.local  # Local dev overrides (gitignored)
└── 📄 .env.production.local   # Local prod overrides (gitignored)
```

## Environment Loading Order

React loads environment files in this order (later files override earlier ones):

1. `.env`
2. `.env.local` (loaded for all environments except test)
3. `.env.development`, `.env.test`, `.env.production` (based on NODE_ENV)
4. `.env.development.local`, `.env.test.local`, `.env.production.local`

## Important Notes

- ⚠️ **Only variables prefixed with `REACT_APP_` are accessible in React**
- 🔒 **Sensitive values** should go in `.env.local` files (gitignored)
- 📝 **Default/template values** are in committed `.env` files
- 🌍 **Environment-specific configs** override defaults

## Quick Setup

### For Development
```bash
# Files are already configured, just run:
npm start
```

### For Production
```bash
# Build with production environment
npm run build

# Or specify custom environment
REACT_APP_API_BASE_URL=https://api.yourdomain.com npm run build
```

### For Custom Configuration
```bash
# Create local override file
cp .env.example .env.local

# Edit with your specific values
# These won't be committed to git
```

## Configuration Categories

### 🔗 API Configuration
- `REACT_APP_API_BASE_URL` - Backend API endpoint
- `REACT_APP_WS_URL` - WebSocket server
- `REACT_APP_GRAPHQL_URL` - GraphQL endpoint
- `REACT_APP_API_TIMEOUT` - Request timeout

### 🔐 Authentication
- `REACT_APP_TOKEN_STORAGE_KEY` - JWT storage key
- `REACT_APP_SESSION_TIMEOUT` - Session duration

### 🚀 Feature Flags
- `REACT_APP_ENABLE_DEV_TOOLS` - Development tools
- `REACT_APP_ENABLE_EXPERIMENTAL` - Beta features
- `REACT_APP_ENABLE_DEMO_MODE` - Offline mode
- `REACT_APP_ENABLE_LOGGING` - Console logging

### 🎨 UI Configuration
- `REACT_APP_DEFAULT_THEME` - light/dark/auto
- `REACT_APP_ENABLE_ANIMATIONS` - UI animations
- `REACT_APP_DEFAULT_LANGUAGE` - Localization

### 📁 File Upload
- `REACT_APP_MAX_FILE_SIZE` - Size limit (MB)
- `REACT_APP_ALLOWED_FILE_TYPES` - Accepted formats

## Usage in Code

### Using the Config Utility
```javascript
import { API_CONFIG, FEATURES, logger } from '../config/environment';

// API configuration
const apiUrl = API_CONFIG.BASE_URL;

// Feature flags
if (FEATURES.EXPERIMENTAL) {
  // Enable experimental feature
}

// Logging with environment awareness
logger.log('This respects REACT_APP_ENABLE_LOGGING');
```

### Direct Environment Access
```javascript
// This works but prefer the config utility
const apiUrl = process.env.REACT_APP_API_BASE_URL;
```

## Environment Examples

### Development
```env
REACT_APP_API_BASE_URL=http://localhost:5001/api
REACT_APP_ENABLE_DEV_TOOLS=true
REACT_APP_ENABLE_LOGGING=true
```

### Production
```env
REACT_APP_API_BASE_URL=https://api.quibish.com/api
REACT_APP_ENABLE_DEV_TOOLS=false
REACT_APP_ENABLE_LOGGING=false
```

### Local Override
```env
# .env.local - for your personal development setup
REACT_APP_API_BASE_URL=http://192.168.1.100:5001/api
REACT_APP_ENABLE_EXPERIMENTAL=true
```

## Validation

The configuration is automatically validated on startup in development mode. Check the console for any issues.

## Troubleshooting

### Variables Not Loading
- ✅ Ensure variables start with `REACT_APP_`
- ✅ Restart development server after changes
- ✅ Check file naming and location

### Environment Issues
- 🔍 Use `getConfigInfo()` to debug current config
- 🔍 Check browser console for validation messages
- 🔍 Verify NODE_ENV is set correctly

## Security Best Practices

- 🔒 **Never commit sensitive data** (API keys, passwords)
- 🔒 **Use .env.local for secrets** (gitignored)
- 🔒 **Validate environment in CI/CD**
- 🔒 **Use different keys for different environments**

## Need Help?

- 📖 Check the `.env.example` file for all available options
- 🛠️ Use the config utility at `src/config/environment.js`
- 🔍 Run `validateConfig()` to check your setup
- � Run `node tools/check-env-security.js` to verify security
- 🔧 Run `node tools/validate-env.js` for full environment analysis
- �📝 See the React documentation on environment variables

## Security Verification Tools

We provide two helpful scripts to ensure your environment is properly configured:

### Environment Security Check
```bash
node tools/check-env-security.js
```
This script verifies:
- ✅ .env files are properly gitignored
- ✅ Only template files are committed
- ✅ No sensitive data in git staging
- ✅ Proper .gitignore configuration

### Environment Validation
```bash
node tools/validate-env.js
```
This script provides:
- 📊 Complete environment file analysis
- 🔧 Configuration validation
- 💡 Optimization recommendations
- 🔍 Security audit results