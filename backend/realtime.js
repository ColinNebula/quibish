// Real-time layer: chat messages, offline queue, presence and call signaling over /ws
const WebSocket = require('ws');

function attachRealtime(server, app, verifyToken) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  // userId -> WebSocket instance
  const userSockets = new Map();

  // userId -> messages waiting for that user to come online (in memory; cleared on restart)
  const offlineQueue = new Map();
  const MAX_QUEUED_PER_USER = 500;

  function broadcast(senderWs, payload) {
    const raw = JSON.stringify(payload);
    wss.clients.forEach(client => {
      if (client !== senderWs && client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    });
  }

  function sendToUser(targetUserId, payload) {
    const ws = userSockets.get(String(targetUserId));
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }
  global.sendToUser = sendToUser;

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.userId = null;
    ws.username = null;

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      let data;
      try { data = JSON.parse(raw); } catch { return; }

      switch (data.type) {

        // Ã¢â€â‚¬Ã¢â€â‚¬ Auth / presence Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
        case 'join': {
          // Identity comes from the signed login token, never from the client's claim
          let claims;
          try { claims = verifyToken(String(data.token || '')); } catch (_) { claims = null; }
          if (!claims || claims.id === undefined || claims.id === null) {
            ws.send(JSON.stringify({ type: 'join-error', reason: 'invalid-token' }));
            ws.close(4401, 'unauthorized');
            break;
          }
          if (ws.userId) break; // already joined
          ws.userId = String(claims.id);
          ws.username = claims.username || 'User';
          const previous = userSockets.get(ws.userId);
          if (previous && previous !== ws && previous.readyState === WebSocket.OPEN) previous.close(4000, 'replaced');
          userSockets.set(ws.userId, ws);
          ws.send(JSON.stringify({ type: 'joined', userId: ws.userId }));
          // Tell others this user is online
          broadcast(ws, { type: 'presence', userId: ws.userId, online: true });
          // Send this user the list of currently online users
          const online = [];
          userSockets.forEach((_, uid) => { if (uid !== ws.userId) online.push(uid); });
          ws.send(JSON.stringify({ type: 'online-users', users: online }));

          // Replay messages that arrived while this user was offline
          const queued = offlineQueue.get(ws.userId);
          if (queued && queued.length) {
            offlineQueue.delete(ws.userId);
            queued.forEach(({ msg, notification }) => {
              ws.send(JSON.stringify(msg));
              if (notification) ws.send(JSON.stringify(notification));
              sendToUser(msg.senderId, { type: 'message-delivered', id: msg.id, clientId: msg.clientId, recipientId: ws.userId });
            });
          }
          break;
        }

        // Ã¢â€â‚¬Ã¢â€â‚¬ Chat messages Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
        case 'message': {
          if (!ws.userId) break;
          if (typeof data.text !== 'string' || !data.text.length || data.text.length > 20000 || !data.recipientId) {
            ws.send(JSON.stringify({ type: 'message-failed', clientId: data.clientId, reason: 'invalid' }));
            break;
          }
          const msg = {
            type: 'message',
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            text: data.text,
            encrypted: data.encrypted === true, // pass flag so recipient knows to decrypt
            senderId: ws.userId,
            senderName: ws.username,
            conversationId: data.conversationId || null,
            recipientId: data.recipientId || null,
            clientId: data.clientId || null,
            timestamp: new Date().toISOString(),
            reactions: {}
          };

          // Direct delivery only; never fan a private message out to other users
          const delivered = sendToUser(data.recipientId, msg);

          // Push a notification to the recipient so they see it in the notification centre
          if (data.recipientId) {
            const notifPayload = {
              type: 'notification',
              notification: {
                id: `notif_msg_${msg.id}`,
                type: 'message',
                title: `New message from ${ws.username}`,
                // Never include ciphertext in notification previews
                message: data.encrypted
                  ? 'Ã°Å¸â€â€™ Encrypted message'
                  : (data.text ? (data.text.length > 80 ? data.text.slice(0, 77) + '...' : data.text) : 'Ã°Å¸â€œÅ½ Attachment'),
                read: false,
                createdAt: msg.timestamp,
                data: {
                  senderId: ws.userId,
                  senderName: ws.username,
                  conversationId: data.conversationId || null,
                  messageId: msg.id
                }
              }
            };
            if (delivered) {
              sendToUser(data.recipientId, notifPayload);
            } else {
              const key = String(data.recipientId);
              const q = offlineQueue.get(key) || [];
              q.push({ msg, notification: notifPayload });
              if (q.length > MAX_QUEUED_PER_USER) q.shift();
              offlineQueue.set(key, q);
            }
          }

          // Confirm delivery to sender with server-assigned ID
          ws.send(JSON.stringify({ type: 'message-sent', id: msg.id, clientId: data.clientId, delivered }));
          break;
        }

        // Ã¢â€â‚¬Ã¢â€â‚¬ Typing indicators Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
        case 'typing': {
          const target = { type: 'typing', userId: ws.userId, username: ws.username, fromUsername: ws.username, conversationId: data.conversationId };
          if (data.recipientId) {
            sendToUser(data.recipientId, target);
          }
          break;
        }

        // Ã¢â€â‚¬Ã¢â€â‚¬ WebRTC call signaling Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
        case 'call-offer':
        case 'call-answer':
        case 'ice-candidate':
        case 'call-end':
        case 'call-busy':
        case 'call-reject': {
          if (!ws.userId || !data.targetUserId) break;
          // Sender identity always comes from the server, never from the client payload
          const relay = { ...data, fromUserId: ws.userId, fromUsername: ws.username };
          if (data.type === 'call-offer') {
            relay.fromUser = { id: ws.userId, name: ws.username };
          } else {
            delete relay.fromUser;
          }
          const delivered = sendToUser(data.targetUserId, relay);
          if (!delivered && data.type === 'call-offer') {
            ws.send(JSON.stringify({
              type: 'call-unavailable',
              callId: data.callId || null,
              targetUserId: data.targetUserId
            }));
          }
          break;
        }

        // Ã¢â€â‚¬Ã¢â€â‚¬ Post created Ã¢â‚¬â€ notify contacts who are online Ã¢â€â‚¬
        case 'post-created': {
          const { postId, postContent, contactIds } = data;
          if (!Array.isArray(contactIds) || contactIds.length === 0) break;

          const preview = postContent
            ? (postContent.length > 100 ? postContent.slice(0, 97) + '...' : postContent)
            : 'Shared a new post';

          const postNotif = {
            type: 'notification',
            notification: {
              id: `notif_post_${postId || Date.now()}`,
              type: 'post',
              title: `${ws.username} made a new post`,
              message: preview,
              read: false,
              createdAt: new Date().toISOString(),
              data: {
                authorId: ws.userId,
                authorName: ws.username,
                postId: postId || null
              }
            }
          };

          contactIds.forEach(uid => {
            if (String(uid) !== ws.userId) {
              sendToUser(String(uid), postNotif);
            }
          });
          break;
        }

        default: break;
      }
    });

    ws.on('close', () => {
      if (ws.userId && userSockets.get(ws.userId) === ws) {
        userSockets.delete(ws.userId);
        broadcast(ws, { type: 'presence', userId: ws.userId, online: false });
      }
    });
  });

  // Heartbeat to detect broken connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  wss.on('close', () => clearInterval(heartbeat));

  // Online users count endpoint
  app.get('/api/users/online-count', (req, res) => {
    res.json({ count: userSockets.size, userIds: [...userSockets.keys()] });

  });

  return wss;
}

module.exports = { attachRealtime };
