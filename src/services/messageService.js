/**
 * Message Service for Quibish
 * Handles messages and real-time updates
 */

import axios from 'axios';
import websocketService from './websocketService';

// Create an axios instance for messages API
const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

class MessageService {
  constructor() {
    this.messageListeners = [];
    this.typingListeners = [];
    this.connectionStateListeners = [];
    this._typingCallbacks = []; // Legacy support
    
    // Initialize connection state from websocket service
    this._isConnected = websocketService.isConnected;
    
    // Set up WebSocket event listeners
    this.setupWebSocketHandlers();
  }
  
  /**
   * Set up WebSocket event handlers
   */
  setupWebSocketHandlers() {
    // Listen for new messages
    websocketService.addEventListener('message', this.handleIncomingMessage.bind(this));
    
    // Listen for typing updates
    websocketService.addEventListener('typing', this.handleTypingUpdate.bind(this));
    
    // Listen for status updates
    websocketService.addEventListener('status', this.handleStatusUpdate.bind(this));
    
    // Listen for connection state changes
    websocketService.addConnectionListener(this.handleConnectionStateChange.bind(this));
  }
  
  /**
   * Handle incoming message from WebSocket
   * @param {Object} message - Incoming message
   */
  handleIncomingMessage(message) {
    // Notify all message listeners
    this.messageListeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }
  
  /**
   * Handle typing status update from WebSocket
   * @param {Object} update - Typing update
   */
  handleTypingUpdate(update) {
    // Support for legacy typing callbacks
    this._typingCallbacks.forEach(callback => {
      try {
        callback(update.username, update.isTyping);
      } catch (error) {
        console.error('Error in typing callback:', error);
      }
    });
    
    // Notify all typing listeners
    this.typingListeners.forEach(listener => {
      try {
        listener(update);
      } catch (error) {
        console.error('Error in typing listener:', error);
      }
    });
  }
  
  /**
   * Handle status update from WebSocket
   * @param {Object} update - Status update
   */
  handleStatusUpdate(update) {
    // TODO: Implement status update handling
  }
  
  /**
   * Handle connection state change from WebSocket
   * @param {boolean} connected - Whether connected
   * @param {Object} details - Connection details
   */
  handleConnectionStateChange(connected, details) {
    this._isConnected = connected;
    
    // Notify all connection state listeners
    this.connectionStateListeners.forEach(listener => {
      try {
        listener(connected, details);
      } catch (error) {
        console.error('Error in connection state listener:', error);
      }
    });
  }
  
  /**
   * Get messages from server
   * @param {Object} options - Options for fetching messages
   * @returns {Promise<Array>} - Array of messages
   */
  async getMessages(options = {}) {
    try {
      // Build query params
      const params = {};
      
      // Add since parameter if provided
      if (options.since) {
        params.since = options.since;
      }
      
      // Add limit parameter if provided
      if (options.limit) {
        params.limit = options.limit;
      }
      
      const response = await API.get('/messages', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      
      // Return cached messages if available
      const cachedMessages = localStorage.getItem('cachedMessages');
      if (cachedMessages) {
        return JSON.parse(cachedMessages);
      }
      
      // Return empty array if no cached messages
      return [];
    }
  }
  
  /**
   * Send a message
   * @param {string} text - Message text
   * @param {string} sender - Message sender
   * @param {Object} replyTo - Message being replied to (optional)
   * @returns {Promise<Object>} - Sent message
   */
  async sendMessage(text, sender, replyTo = null) {
    const messageData = {
      text,
      sender,
      type: 'text',
      timestamp: new Date().toISOString(),
      replyTo
    };
    
    try {
      // Try to send via WebSocket first for better real-time experience
      const wsSuccess = websocketService.send('newMessage', messageData);
      
      // If WebSocket send failed or we're not connected, fall back to HTTP
      if (!wsSuccess) {
        const response = await API.post('/messages', messageData);
        return response.data;
      }
      
      return {
        ...messageData,
        id: Date.now(), // Temporary ID until server confirms
        status: 'sent'
      };
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Create pending message for offline handling
      const pendingMessage = {
        ...messageData,
        id: Date.now(),
        status: 'pending'
      };
      
      // Store in pending messages
      this.storePendingMessage(pendingMessage);
      
      return pendingMessage;
    }
  }
  
  /**
   * Store a pending message in localStorage
   * @param {Object} message - Message to store
   */
  storePendingMessage(message) {
    try {
      // Get existing pending messages
      const pendingMessagesJson = localStorage.getItem('pendingMessages');
      const pendingMessages = pendingMessagesJson ? JSON.parse(pendingMessagesJson) : [];
      
      // Add new pending message
      pendingMessages.push(message);
      
      // Store updated pending messages
      localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
      
      console.log('Stored pending message:', message.id);
    } catch (error) {
      console.error('Error storing pending message:', error);
    }
  }
  
  /**
   * Get status updates
   * @param {Object} options - Options for fetching status updates
   * @returns {Promise<Array>} - Array of status updates
   */
  async getStatusUpdates(options = {}) {
    try {
      // Build query params
      const params = {};
      
      // Add since parameter if provided
      if (options.since) {
        params.since = options.since;
      }
      
      const response = await API.get('/status-updates', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching status updates:', error);
      
      // Return cached updates if available
      const cachedUpdates = localStorage.getItem('statusUpdates');
      if (cachedUpdates) {
        return JSON.parse(cachedUpdates);
      }
      
      return [];
    }
  }
  
  /**
   * Mark a message as read
   * @param {string|number} messageId - Message ID
   * @param {string} username - Username of reader
   * @returns {Promise<Object>} - Updated message
   */
  async markAsRead(messageId, username) {
    try {
      const response = await API.post(`/messages/${messageId}/read`, { username });
      return response.data;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }
  
  /**
   * Send a voice message
   * @param {File} audioFile - Audio file
   * @param {string} sender - Message sender
   * @returns {Promise<Object>} - Sent message
   */
  async sendVoiceMessage(audioFile, sender) {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('sender', sender);
      
      const response = await API.post('/messages/voice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending voice message:', error);
      throw error;
    }
  }
  
  /**
   * Upload a file
   * @param {File} file - File to upload
   * @param {string} sender - Message sender
   * @returns {Promise<Object>} - Uploaded file message
   */
  async uploadFile(file, sender) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sender', sender);
      
      const response = await API.post('/messages/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
  
  /**
   * Send typing status
   * @param {string} username - Username of typer
   * @param {boolean} isTyping - Whether user is typing
   */
  sendTypingStatus(username, isTyping) {
    websocketService.send('typing', { username, isTyping });
  }
  
  /**
   * Subscribe to typing updates
   * @param {Function} callback - Callback function
   */
  subscribeToTyping(callback) {
    // Support for legacy typing callbacks
    if (!this._typingCallbacks.includes(callback)) {
      this._typingCallbacks.push(callback);
    }
  }
  
  /**
   * Unsubscribe from typing updates
   * @param {Function} callback - Callback function to remove (optional)
   */
  unsubscribeFromTyping(callback = null) {
    if (callback) {
      // Remove specific callback
      this._typingCallbacks = this._typingCallbacks.filter(cb => cb !== callback);
    } else {
      // Clear all callbacks
      this._typingCallbacks = [];
    }
  }
  
  /**
   * Add message listener
   * @param {Function} listener - Listener function
   * @returns {Function} - Function to remove listener
   */
  addMessageListener(listener) {
    this.messageListeners.push(listener);
    return () => this.removeMessageListener(listener);
  }
  
  /**
   * Remove message listener
   * @param {Function} listener - Listener function
   */
  removeMessageListener(listener) {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }
  
  /**
   * Add connection state listener
   * @param {Function} listener - Listener function
   * @returns {Function} - Function to remove listener
   */
  addConnectionStateListener(listener) {
    this.connectionStateListeners.push(listener);
    return () => this.removeConnectionStateListener(listener);
  }
  
  /**
   * Remove connection state listener
   * @param {Function} listener - Listener function
   */
  removeConnectionStateListener(listener) {
    this.connectionStateListeners = this.connectionStateListeners.filter(l => l !== listener);
  }
  
  /**
   * Check if connected to server
   * @returns {boolean} - Whether connected
   */
  isConnected() {
    return this._isConnected;
  }
  
  /**
   * Get connection quality
   * @returns {string} - Connection quality
   */
  getConnectionQuality() {
    return websocketService.getConnectionQuality();
  }
  
  /**
   * Get connection metrics
   * @returns {Object} - Connection metrics
   */
  getConnectionMetrics() {
    return websocketService.getConnectionMetrics();
  }
  
  /**
   * Reconnect to server
   * @returns {Promise<boolean>} - Whether reconnection was successful
   */
  async reconnect() {
    try {
      return await websocketService.reconnect();
    } catch (error) {
      console.error('Reconnection failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const messageService = new MessageService();

// Initialize WebSocket connection (TEMPORARILY DISABLED)
// TODO: Add WebSocket support to backend or configure proper URL
console.log('⚠️ WebSocket connection temporarily disabled - using REST API only');
// websocketService.connect();

export default messageService;
