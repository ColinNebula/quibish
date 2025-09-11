/**
 * WebRTC Signaling Route
 * Handles WebSocket connections for global voice call signaling
 */

const express = require('express');
const WebSocket = require('ws');
const router = express.Router();

class SignalingServer {
  constructor() {
    this.clients = new Map(); // userId -> { ws, userData }
    this.activeCalls = new Map(); // callId -> { caller, callee, status }
    this.wss = null;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/signaling'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('New signaling connection established');
      
      ws.userId = null;
      ws.isAlive = true;

      // Setup ping/pong for connection monitoring
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Invalid signaling message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });
    });

    // Setup connection monitoring
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          this.handleDisconnection(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    console.log('Voice call signaling server initialized');
  }

  /**
   * Handle incoming signaling messages
   */
  handleMessage(ws, message) {
    switch (message.type) {
      case 'register':
        this.handleUserRegistration(ws, message);
        break;
      
      case 'call-offer':
        this.handleCallOffer(ws, message);
        break;
      
      case 'call-answer':
        this.handleCallAnswer(ws, message);
        break;
      
      case 'call-reject':
        this.handleCallReject(ws, message);
        break;
      
      case 'ice-candidate':
        this.handleIceCandidate(ws, message);
        break;
      
      case 'call-end':
        this.handleCallEnd(ws, message);
        break;
      
      case 'get-users':
        this.sendUserList(ws);
        break;
      
      default:
        console.log('Unknown signaling message type:', message.type);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }

  /**
   * Handle user registration
   */
  handleUserRegistration(ws, message) {
    const userId = message.userId || `user_${Date.now()}`;
    const userData = {
      id: userId,
      name: message.userData?.name || 'Anonymous User',
      avatar: message.userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.userData?.name || 'User')}&background=4f46e5&color=fff`,
      status: 'online',
      location: message.userData?.location || 'Unknown',
      connectedAt: new Date().toISOString()
    };

    // Remove existing connection for this user
    if (this.clients.has(userId)) {
      const existingClient = this.clients.get(userId);
      if (existingClient.ws.readyState === WebSocket.OPEN) {
        existingClient.ws.close();
      }
    }

    // Register new connection
    ws.userId = userId;
    this.clients.set(userId, {
      ws: ws,
      userData: userData
    });

    console.log(`User registered: ${userData.name} (${userId})`);

    // Send confirmation to user
    ws.send(JSON.stringify({
      type: 'registered',
      userId: userId,
      userData: userData
    }));

    // Broadcast user joined to all clients
    this.broadcastToAll({
      type: 'user-joined',
      userId: userId,
      userData: userData
    }, userId);

    // Send current user list to new user
    this.sendUserList(ws);
  }

  /**
   * Handle call offer
   */
  handleCallOffer(ws, message) {
    const callerId = ws.userId;
    const targetUserId = message.targetUserId;
    const callId = message.callId || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!callerId) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Not registered'
      }));
    }

    const targetClient = this.clients.get(targetUserId);
    if (!targetClient || targetClient.ws.readyState !== WebSocket.OPEN) {
      return ws.send(JSON.stringify({
        type: 'call-failed',
        reason: 'User not available',
        callId: callId
      }));
    }

    const callerData = this.clients.get(callerId)?.userData;

    // Store active call
    this.activeCalls.set(callId, {
      callId: callId,
      caller: callerId,
      callee: targetUserId,
      status: 'offering',
      startTime: Date.now()
    });

    // Forward offer to target user
    targetClient.ws.send(JSON.stringify({
      type: 'call-offer',
      callId: callId,
      offer: message.offer,
      callerId: callerId,
      callerName: callerData?.name,
      callerData: callerData
    }));

    console.log(`Call offer: ${callerData?.name} -> ${targetClient.userData?.name}`);
  }

  /**
   * Handle call answer
   */
  handleCallAnswer(ws, message) {
    const callId = message.callId;
    const call = this.activeCalls.get(callId);

    if (!call) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Call not found'
      }));
    }

    const callerClient = this.clients.get(call.caller);
    if (!callerClient || callerClient.ws.readyState !== WebSocket.OPEN) {
      this.activeCalls.delete(callId);
      return ws.send(JSON.stringify({
        type: 'call-failed',
        reason: 'Caller disconnected',
        callId: callId
      }));
    }

    // Update call status
    call.status = 'connected';
    call.connectedTime = Date.now();

    // Forward answer to caller
    callerClient.ws.send(JSON.stringify({
      type: 'call-answer',
      callId: callId,
      answer: message.answer
    }));

    console.log(`Call answered: ${callId}`);
  }

  /**
   * Handle call rejection
   */
  handleCallReject(ws, message) {
    const callId = message.callId;
    const call = this.activeCalls.get(callId);

    if (call) {
      const callerClient = this.clients.get(call.caller);
      if (callerClient && callerClient.ws.readyState === WebSocket.OPEN) {
        callerClient.ws.send(JSON.stringify({
          type: 'call-rejected',
          callId: callId
        }));
      }

      this.activeCalls.delete(callId);
      console.log(`Call rejected: ${callId}`);
    }
  }

  /**
   * Handle ICE candidate exchange
   */
  handleIceCandidate(ws, message) {
    const callId = message.callId;
    const call = this.activeCalls.get(callId);

    if (!call) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Call not found for ICE candidate'
      }));
    }

    const senderId = ws.userId;
    const targetUserId = senderId === call.caller ? call.callee : call.caller;
    const targetClient = this.clients.get(targetUserId);

    if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
      targetClient.ws.send(JSON.stringify({
        type: 'ice-candidate',
        callId: callId,
        candidate: message.candidate
      }));
    }
  }

  /**
   * Handle call end
   */
  handleCallEnd(ws, message) {
    const callId = message.callId;
    const call = this.activeCalls.get(callId);

    if (call) {
      const senderId = ws.userId;
      const targetUserId = senderId === call.caller ? call.callee : call.caller;
      const targetClient = this.clients.get(targetUserId);

      if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
        targetClient.ws.send(JSON.stringify({
          type: 'call-end',
          callId: callId
        }));
      }

      this.activeCalls.delete(callId);
      console.log(`Call ended: ${callId}`);
    }
  }

  /**
   * Send user list to client
   */
  sendUserList(ws) {
    const userList = Array.from(this.clients.values())
      .map(client => client.userData)
      .filter(userData => userData.id !== ws.userId);

    ws.send(JSON.stringify({
      type: 'user-list',
      users: userList
    }));
  }

  /**
   * Handle user disconnection
   */
  handleDisconnection(ws) {
    if (ws.userId) {
      console.log(`User disconnected: ${ws.userId}`);
      
      // End any active calls
      const userCalls = Array.from(this.activeCalls.entries())
        .filter(([_, call]) => call.caller === ws.userId || call.callee === ws.userId);

      userCalls.forEach(([callId, call]) => {
        const otherUserId = call.caller === ws.userId ? call.callee : call.caller;
        const otherClient = this.clients.get(otherUserId);
        
        if (otherClient && otherClient.ws.readyState === WebSocket.OPEN) {
          otherClient.ws.send(JSON.stringify({
            type: 'call-end',
            callId: callId,
            reason: 'User disconnected'
          }));
        }
        
        this.activeCalls.delete(callId);
      });

      // Remove user from clients
      this.clients.delete(ws.userId);

      // Broadcast user left
      this.broadcastToAll({
        type: 'user-left',
        userId: ws.userId
      });
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(message, excludeUserId = null) {
    this.clients.forEach((client, userId) => {
      if (userId !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      connectedUsers: this.clients.size,
      activeCalls: this.activeCalls.size,
      users: Array.from(this.clients.values()).map(c => ({
        id: c.userData.id,
        name: c.userData.name,
        connectedAt: c.userData.connectedAt
      })),
      calls: Array.from(this.activeCalls.values())
    };
  }
}

// Create singleton instance
const signalingServer = new SignalingServer();

// REST API endpoints for signaling server stats
router.get('/stats', (req, res) => {
  res.json(signalingServer.getStats());
});

router.get('/users', (req, res) => {
  const users = Array.from(signalingServer.clients.values())
    .map(client => client.userData);
  res.json({ users });
});

module.exports = { router, signalingServer };