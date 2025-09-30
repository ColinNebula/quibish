# SSL Protocol Error Fix - Documentation

## Problem Description
The application was experiencing `ERR_SSL_PROTOCOL_ERROR` when trying to access API endpoints like `/api/notifications/presence`. This occurred because:

1. The React development server runs on `http://localhost:3000`
2. The backend API is configured to run on `http://localhost:5000`
3. The frontend was making relative API calls to `/api/notifications/presence`, which resolved to `http://localhost:3000/api/notifications/presence` (non-existent endpoint)
4. The browser attempted to use HTTPS for these calls, causing the SSL protocol error

## Solution Implemented

### 1. Created API Configuration (`src/config/api.js`)
- Centralized API configuration with environment variable support
- `buildApiUrl()` utility function for consistent URL building
- Enhanced `apiFetch()` wrapper with error handling

### 2. Updated Environment Configuration (`.env`)
- Set `REACT_APP_API_BASE_URL=http://localhost:5000/api`
- Configured proper WebSocket URL
- Ensured HTTP protocol for local development

### 3. Fixed API Calls in ProChat.js
- Updated presence API calls to use `buildApiUrl('/notifications/presence')`
- Imported the API configuration
- Removed hardcoded API URLs

### 4. Restored CSS Styling
- Removed temporary debug styling from dropdown menu
- Maintained proper visibility and positioning

## Environment Variables
```bash
NODE_ENV=development
REACT_APP_ENV=dev
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_WEBSOCKET_URL=ws://localhost:5000
```

## Usage Example
```javascript
import { buildApiUrl, apiFetch } from '../../config/api';

// Instead of:
fetch('/api/notifications/presence', options)

// Use:
fetch(buildApiUrl('/notifications/presence'), options)

// Or better yet:
apiFetch('/notifications/presence', options)
```

## Testing
1. Start the React development server: `npm start`
2. Open http://localhost:3000/quibish
3. Check DevTools Console - no more SSL protocol errors
4. API calls now properly target http://localhost:5000/api/

## Next Steps
- Consider updating other services to use the new API configuration
- Implement proper error handling for offline scenarios
- Add retry logic for failed API calls

## Files Modified
- `src/config/api.js` (new)
- `src/components/Home/ProChat.js`
- `src/components/Home/ProChat.css`
- `.env` (new)

The SSL protocol error should now be resolved, and API calls will be properly routed to the correct backend server.