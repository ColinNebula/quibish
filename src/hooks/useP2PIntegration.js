/**
 * Free Text & Calls Integration Helper
 * Quick integration component for P2P messaging and calls
 */

import { useEffect, useCallback, useState } from 'react';
import p2pMessagingService from '../services/p2pMessagingService';
import realtimeService from '../services/realtimeService';

/**
 * Custom hook for P2P messaging
 */
export const useP2PMessaging = (userId, recipientId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');

  useEffect(() => {
    if (!recipientId) return;

    // Connect to peer
    const connect = async () => {
      await p2pMessagingService.connectToPeer(recipientId, true);
    };
    connect();

    // Listen for connection status
    const unsubPeerConnected = p2pMessagingService.on('peer-connected', ({ peerId }) => {
      if (peerId === recipientId) {
        setIsConnected(true);
        setConnectionState('connected');
      }
    });

    const unsubPeerDisconnected = p2pMessagingService.on('peer-disconnected', ({ peerId }) => {
      if (peerId === recipientId) {
        setIsConnected(false);
        setConnectionState('disconnected');
      }
    });

    const unsubChannelReady = p2pMessagingService.on('channel-ready', ({ peerId }) => {
      if (peerId === recipientId) {
        setConnectionState('ready');
      }
    });

    return () => {
      unsubPeerConnected();
      unsubPeerDisconnected();
      unsubChannelReady();
    };
  }, [recipientId]);

  const sendMessage = useCallback(async (messageData) => {
    if (!recipientId) return { success: false, error: 'No recipient' };

    // Try P2P first
    const result = await p2pMessagingService.sendMessage(recipientId, messageData);

    // Fallback to WebSocket if P2P fails
    if (!result.success && !result.queued) {
      console.log('📡 Falling back to WebSocket');
      realtimeService.sendMessage({
        text: messageData.text,
        recipientId,
        ...messageData
      });
      return { success: true, method: 'websocket' };
    }

    return { ...result, method: result.queued ? 'queued' : 'p2p' };
  }, [recipientId]);

  return {
    isConnected,
    connectionState,
    sendMessage
  };
};

/**
 * Custom hook for receiving P2P messages
 */
export const useP2PMessageListener = (onMessage) => {
  useEffect(() => {
    const unsubscribe = p2pMessagingService.on('message', (data) => {
      if (onMessage) {
        onMessage({
          id: data.id,
          text: data.text,
          timestamp: data.timestamp,
          type: data.type || 'text',
          senderId: data.peerId,
          p2p: true,
          ...data
        });
      }
    });

    return unsubscribe;
  }, [onMessage]);
};

/**
 * Custom hook for WebRTC signaling integration
 */
export const useP2PSignaling = (userId) => {
  useEffect(() => {
    // Handle incoming offers
    const unsubOffer = p2pMessagingService.on('offer', ({ peerId, offer }) => {
      // Send offer via signaling server
      realtimeService.sendSignal('p2p-offer', peerId, { offer });
    });

    // Handle incoming answers
    const unsubAnswer = p2pMessagingService.on('answer', ({ peerId, answer }) => {
      // Send answer via signaling server
      realtimeService.sendSignal('p2p-answer', peerId, { answer });
    });

    // Handle ICE candidates
    const unsubIce = p2pMessagingService.on('ice-candidate', ({ peerId, candidate }) => {
      // Send ICE candidate via signaling server
      realtimeService.sendSignal('p2p-ice', peerId, { candidate });
    });

    // Listen for signaling from server
    const unsubServerOffer = realtimeService.on('p2p-offer', async ({ fromUserId, offer }) => {
      await p2pMessagingService.handleOffer(fromUserId, offer);
    });

    const unsubServerAnswer = realtimeService.on('p2p-answer', async ({ fromUserId, answer }) => {
      await p2pMessagingService.handleAnswer(fromUserId, answer);
    });

    const unsubServerIce = realtimeService.on('p2p-ice', async ({ fromUserId, candidate }) => {
      await p2pMessagingService.handleIceCandidate(fromUserId, candidate);
    });

    return () => {
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubServerOffer();
      unsubServerAnswer();
      unsubServerIce();
    };
  }, [userId]);
};

/**
 * Get P2P connection statistics
 */
export const useP2PStats = () => {
  const [stats, setStats] = useState(null);

  const updateStats = useCallback(() => {
    const currentStats = p2pMessagingService.getStats();
    setStats(currentStats);
  }, []);

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateStats]);

  return stats;
};

/**
 * Check if P2P is available in current browser
 */
export const useP2PAvailability = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const available = p2pMessagingService.isAvailable();
    setIsAvailable(available);

    if (!available) {
      if (!window.RTCPeerConnection) {
        setReason('WebRTC not supported in this browser');
      } else if (!window.RTCDataChannel) {
        setReason('Data channels not supported');
      } else {
        setReason('Unknown compatibility issue');
      }
    }
  }, []);

  return { isAvailable, reason };
};

/**
 * Utility function to format connection state for display
 */
export const formatConnectionState = (state) => {
  const states = {
    disconnected: { text: 'Disconnected', color: '#ff3b30', icon: '⚠️' },
    connecting: { text: 'Connecting...', color: '#ff9500', icon: '🔄' },
    connected: { text: 'Connected', color: '#4cd964', icon: '✓' },
    ready: { text: 'Ready (P2P)', color: '#00a884', icon: '⚡' },
    failed: { text: 'Connection Failed', color: '#ff3b30', icon: '❌' }
  };

  return states[state] || states.disconnected;
};

/**
 * Component to display P2P connection status
 */
export const P2PConnectionStatus = ({ recipientId, className = '' }) => {
  const [state, setState] = useState('disconnected');

  useEffect(() => {
    if (!recipientId) return;

    const status = p2pMessagingService.getConnectionStatus(recipientId);
    setState(status);

    const unsubConnected = p2pMessagingService.on('peer-connected', ({ peerId }) => {
      if (peerId === recipientId) setState('connected');
    });

    const unsubDisconnected = p2pMessagingService.on('peer-disconnected', ({ peerId }) => {
      if (peerId === recipientId) setState('disconnected');
    });

    const unsubReady = p2pMessagingService.on('channel-ready', ({ peerId }) => {
      if (peerId === recipientId) setState('ready');
    });

    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubReady();
    };
  }, [recipientId]);

  const statusInfo = formatConnectionState(state);

  if (state === 'disconnected') return null;

  return (
    <div className={`connection-status-badge ${className}`}>
      <span className={`status-dot ${state}`} style={{ background: statusInfo.color }}></span>
      <span>{statusInfo.text}</span>
    </div>
  );
};

/**
 * Debug panel for P2P connections
 */
export const P2PDebugPanel = () => {
  const stats = useP2PStats();
  const { isAvailable, reason } = useP2PAvailability();

  if (!stats) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999
    }}>
      <h4 style={{ margin: '0 0 8px 0' }}>P2P Debug Info</h4>
      <div>Available: {isAvailable ? '✓ Yes' : `✗ No (${reason})`}</div>
      <div>Active Connections: {stats.totalConnections}</div>
      <div>Data Channels: {stats.activeChannels}</div>
      <div>Queued Messages: {stats.queuedMessages}</div>
      <div style={{ marginTop: '8px', fontSize: '11px' }}>
        {stats.connections.map((conn, i) => (
          <div key={i}>
            Peer {conn.peerId}: {conn.state} {conn.hasDataChannel ? '📡' : ''}
          </div>
        ))}
      </div>
    </div>
  );
};

export default {
  useP2PMessaging,
  useP2PMessageListener,
  useP2PSignaling,
  useP2PStats,
  useP2PAvailability,
  formatConnectionState,
  P2PConnectionStatus,
  P2PDebugPanel
};
