# API Configuration Fix - SSL Protocol Error Resolution

## Issue
The app was trying to connect to `https://localhost:5001/quibish/api/` instead of `http://localhost:5001/api/`, causing `ERR_SSL_PROTOCOL_ERROR`.

## Root Cause
The `package.json` had:
```json
"homepage": "https://colinnebula.github.io/quibish"
```

This GitHub Pages URL was forcing:
1. **HTTPS protocol** (SSL) for all API calls
2. **/quibish/** base path in URLs
3. Mismatch with local HTTP backend

## Fixes Applied

### 1. Updated `.env` file
Added `PUBLIC_URL` override for local development:
```env
PUBLIC_URL=http://localhost:3000
REACT_APP_API_BASE_URL=http://localhost:5001/api
REACT_APP_WEBSOCKET_URL=ws://localhost:5001
```

### 2. Updated `package.json`
Changed homepage to relative path for local dev:
```json
"homepage": "."
```

## Deployment Instructions

### For GitHub Pages Deployment
Before deploying to GitHub Pages, temporarily update `package.json`:

```json
"homepage": "https://colinnebula.github.io/quibish"
```

Then run:
```bash
npm run deploy
```

After deployment, revert back to:
```json
"homepage": "."
```

### For Production with Custom Domain
Update `.env.production` (create if doesn't exist):
```env
PUBLIC_URL=https://yourdomain.com
REACT_APP_API_BASE_URL=https://api.yourdomain.com
REACT_APP_WEBSOCKET_URL=wss://api.yourdomain.com
```

## Backend Server Requirements

### Start Backend Server
The encryption service requires the backend API to be running:

```bash
# Start both frontend and backend
npm run dev

# OR start backend only
npm run backend:start

# OR use PM2 for production
npm run pm2:start
```

### Backend Health Check
Verify backend is running:
```bash
curl http://localhost:5001/api/health
```

## Testing the Fix

1. **Stop the dev server** if running (Ctrl+C)
2. **Clear browser cache** and localStorage:
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```
3. **Restart the dev server**:
   ```bash
   npm start
   ```

## Expected API URLs (after fix)

- ❌ Before: `https://localhost:5001/quibish/api/encryption/public-key`
- ✅ After: `http://localhost:5001/api/encryption/public-key`

## Alternative: Disable Encryption (Temporary)

If you want to run the app without the backend encryption service, you can disable E2E encryption in the component:

**In `src/components/Home/ProChat.js`**, comment out the encryption initialization:
```javascript
// Comment this line (around line 489):
// await encryptedMessageService.initializeEncryption(currentUser.uid);
```

## Notes

- Local development uses **HTTP** (no SSL)
- Production deployment should use **HTTPS** with proper SSL certificates
- The `.env` file overrides `package.json` homepage for local dev
- GitHub Pages deployment requires the full homepage URL
