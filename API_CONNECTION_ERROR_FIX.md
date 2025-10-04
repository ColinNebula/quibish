# API Connection Error Fix

## Error Analysis
**Error:** `POST http://localhost:5000/api/notifications/presence net::ERR_FAILED`  
**Location:** ProChat.js:321

## Root Cause
Port mismatch between frontend expectation and backend configuration:
- **Frontend was expecting:** `http://localhost:5000/api`
- **Backend actually runs on:** `http://localhost:5001/api`

## Fixed Issues

### 1. Corrected API Configuration
**File:** `src/services/apiClient.js`
```javascript
// BEFORE (hardcoded port 5000)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// AFTER (uses centralized config)
import { API_CONFIG } from '../config/api';
const API_BASE_URL = API_CONFIG.BASE_URL; // Points to localhost:5001
```

### 2. Backend Configuration
**File:** `backend/server.js`
```javascript
const PORT = process.env.PORT || 5001; // Backend runs on 5001
```

**File:** `src/config/api.js`
```javascript
BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api' // Matches backend
```

## Solutions to Try

### Option 1: Start Backend Server
```bash
# In new terminal
cd backend
npm install  # Install missing dependencies
node server.js
```

### Option 2: Use Development Script
```bash
# From main directory
npm run dev  # Starts both frontend and backend
```

### Option 3: Backend Manual Start (Alternative)
```bash
# From main directory
npm run backend:start
```

## Missing Backend Route Issue

The backend might be missing the `/api/notifications/presence` route. To add it:

**File:** `backend/routes/notifications.js` (create if missing)
```javascript
const express = require('express');
const router = express.Router();

// POST /api/notifications/presence
router.post('/presence', async (req, res) => {
  try {
    const { userId, isOnline, lastSeen } = req.body;
    
    // Update user presence in database/memory
    // This is a basic implementation
    console.log(`User ${userId} presence updated: ${isOnline ? 'online' : 'offline'}`);
    
    res.json({
      success: true,
      message: 'Presence updated successfully'
    });
  } catch (error) {
    console.error('Presence update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update presence'
    });
  }
});

module.exports = router;
```

**Add to** `backend/server.js`:
```javascript
// Add after other route imports
const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes);
```

## Quick Fix for Development

### Environment Variable Override
Create `.env` file in root:
```env
REACT_APP_API_BASE_URL=http://localhost:5001/api
```

Or temporarily update `src/config/api.js`:
```javascript
BASE_URL: 'http://localhost:5001/api', // Force correct port
```

## Testing the Fix

1. **Start backend:** `npm run backend:start`
2. **Verify backend is running:** Visit `http://localhost:5001/api/health`
3. **Start frontend:** `npm start`
4. **Check browser console:** Error should be resolved

## Status
✅ **API configuration corrected**  
⚠️ **Backend server needs to be started**  
⚠️ **Backend route might need to be implemented**

The error should be resolved once the backend server is running on the correct port (5001) and the missing notification routes are implemented.