/**
 * Backend WebSocket Signaling Enhancement for P2P
 * Add this to your backend WebSocket handler to support P2P signaling
 * 
 * File: backend/stable-server.js or backend/websocket-handler.js
 */

// Add these P2P signaling handlers to your WebSocket message handler

function handleP2PSignaling(ws, data, userSockets) {
  const { type, targetUserId, ...payload } = data;

  switch (type) {
    case 'p2p-offer':
      // Forward WebRTC offer to target user
      sendToUser(targetUserId, {
        type: 'p2p-offer',
        fromUserId: data.userId || ws.userId,
        offer: payload.offer
      }, userSockets);
      console.log(`📡 Forwarded P2P offer from ${ws.userId} to ${targetUserId}`);
      break;

    case 'p2p-answer':
      // Forward WebRTC answer to target user
      sendToUser(targetUserId, {
        type: 'p2p-answer',
        fromUserId: data.userId || ws.userId,
        answer: payload.answer
      }, userSockets);
      console.log(`📡 Forwarded P2P answer from ${ws.userId} to ${targetUserId}`);
      break;

    case 'p2p-ice':
      // Forward ICE candidate to target user
      sendToUser(targetUserId, {
        type: 'p2p-ice',
        fromUserId: data.userId || ws.userId,
        candidate: payload.candidate
      }, userSockets);
      console.log(`📡 Forwarded ICE candidate from ${ws.userId} to ${targetUserId}`);
      break;

    default:
      console.warn(`⚠️ Unknown P2P signaling type: ${type}`);
  }
}

// Helper function to send message to specific user
function sendToUser(userId, message, userSockets) {
  const userWs = userSockets.get(String(userId));
  if (userWs && userWs.readyState === 1) { // WebSocket.OPEN = 1
    userWs.send(JSON.stringify(message));
    return true;
  }
  console.warn(`⚠️ User ${userId} not connected or not ready`);
  return false;
}

// ───────────────────────────────────────────────────────────────────────────
// Integration Example - Add to your WebSocket message handler
// ───────────────────────────────────────────────────────────────────────────

/*
ws.on('message', (rawData) => {
  try {
    const data = JSON.parse(rawData);
    
    // Handle P2P signaling
    if (data.type.startsWith('p2p-')) {
      handleP2PSignaling(ws, data, userSockets);
      return;
    }
    
    // ... rest of your message handling
    
  } catch (error) {
    console.error('Error handling WebSocket message:', error);
  }
});
*/

// ───────────────────────────────────────────────────────────────────────────
// Complete WebSocket Handler Example with P2P Support
// ───────────────────────────────────────────────────────────────────────────

function setupP2PWebSocketServer(wss) {
  const userSockets = new Map(); // userId -> WebSocket

  wss.on('connection', (ws, req) => {
    const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const userId = urlParams.get('userId');
    const username = urlParams.get('username');

    ws.userId = userId;
    ws.username = username;
    
    // Store user socket
    if (userId) {
      userSockets.set(userId, ws);
      console.log(`✅ User ${username} (${userId}) connected via WebSocket`);
    }

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connect',
      message: 'Connected to WebSocket server',
      userId: userId,
      p2pSupport: true // Indicate P2P support
    }));

    // Handle messages
    ws.on('message', (rawData) => {
      try {
        const data = JSON.parse(rawData);
        
        // Add user ID to data if not present
        if (!data.userId && userId) {
          data.userId = userId;
        }

        // Route based on message type
        switch (data.type) {
          // P2P Signaling Messages
          case 'p2p-offer':
          case 'p2p-answer':
          case 'p2p-ice':
            handleP2PSignaling(ws, data, userSockets);
            break;

          // Regular chat messages
          case 'message':
            handleChatMessage(ws, data, userSockets);
            break;

          // Typing indicators
          case 'typing':
            handleTypingIndicator(ws, data, userSockets);
            break;

          // Presence updates
          case 'presence':
            handlePresenceUpdate(ws, data, userSockets);
            break;

          // Call signaling (for backward compatibility)
          case 'call-offer':
          case 'call-answer':
          case 'ice-candidate':
          case 'call-end':
          case 'call-reject':
            handleCallSignaling(ws, data, userSockets);
            break;

          default:
            console.warn(`⚠️ Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('❌ Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message'
        }));
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      if (userId) {
        userSockets.delete(userId);
        console.log(`👋 User ${username} (${userId}) disconnected`);
        
        // Notify others about offline status
        broadcast(ws, {
          type: 'presence',
          userId: userId,
          online: false
        }, userSockets);
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for user ${userId}:`, error);
    });

    // Notify others about online status
    if (userId) {
      broadcast(ws, {
        type: 'presence',
        userId: userId,
        username: username,
        online: true
      }, userSockets);
    }
  });

  // Broadcast to all except sender
  function broadcast(senderWs, message, userSockets) {
    const messageStr = JSON.stringify(message);
    userSockets.forEach((ws) => {
      if (ws !== senderWs && ws.readyState === 1) {
        ws.send(messageStr);
      }
    });
  }

  // Handle chat messages
  function handleChatMessage(ws, data, userSockets) {
    const { recipientId, conversationId, text } = data;
    
    // Send to specific recipient
    if (recipientId) {
      sendToUser(recipientId, {
        type: 'message',
        id: Date.now().toString(),
        text: text,
        senderId: ws.userId,
        senderName: ws.username,
        conversationId: conversationId,
        timestamp: new Date().toISOString(),
        encrypted: data.encrypted || false
      }, userSockets);
    } else {
      // Broadcast to all in conversation
      broadcast(ws, {
        type: 'message',
        id: Date.now().toString(),
        text: text,
        senderId: ws.userId,
        senderName: ws.username,
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      }, userSockets);
    }

    // Confirm to sender
    ws.send(JSON.stringify({
      type: 'message-sent',
      clientId: data.clientId,
      success: true
    }));
  }

  // Handle typing indicators
  function handleTypingIndicator(ws, data, userSockets) {
    const { recipientId, conversationId } = data;
    
    if (recipientId) {
      sendToUser(recipientId, {
        type: 'typing',
        fromUserId: ws.userId,
        fromUsername: ws.username,
        conversationId: conversationId
      }, userSockets);
    }
  }

  // Handle presence updates
  function handlePresenceUpdate(ws, data, userSockets) {
    broadcast(ws, {
      type: 'presence',
      userId: ws.userId,
      online: data.online !== false
    }, userSockets);
  }

  // Handle call signaling (for backward compatibility)
  function handleCallSignaling(ws, data, userSockets) {
    const { targetUserId } = data;
    
    sendToUser(targetUserId, {
      ...data,
      fromUserId: ws.userId,
      fromUsername: ws.username
    }, userSockets);
  }

  console.log('✅ WebSocket server with P2P support initialized');
  
  return { userSockets, broadcast, sendToUser };
}

// ───────────────────────────────────────────────────────────────────────────
// Export for use in your server
// ───────────────────────────────────────────────────────────────────────────

module.exports = {
  handleP2PSignaling,
  setupP2PWebSocketServer,
  sendToUser
};

// ───────────────────────────────────────────────────────────────────────────
// Usage in your server file (e.g., backend/stable-server.js)
// ───────────────────────────────────────────────────────────────────────────

/*
const { setupP2PWebSocketServer } = require('./p2p-signaling-handler');

// After creating your WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Set up P2P signaling
const { userSockets, broadcast, sendToUser } = setupP2PWebSocketServer(wss);

// Export for use in other parts of your app
global.sendToUser = sendToUser;
global.broadcast = broadcast;
global.userSockets = userSockets;
*/

// ───────────────────────────────────────────────────────────────────────────
// Testing P2P Signaling
// ───────────────────────────────────────────────────────────────────────────

/*
To test P2P signaling:

1. Start your backend server
2. Open browser console on Client A
3. Open browser console on Client B
4. Check console logs for:
   - "📡 Forwarded P2P offer..."
   - "📡 Forwarded P2P answer..."
   - "📡 Forwarded ICE candidate..."

5. In Client A console, you should see:
   - "🔗 Connecting to peer..."
   - "✅ Data channel with [peerId] is open"
   - "📤 Sent P2P message..."

This confirms P2P connection is working!
*/
