import React, { useState, useEffect, useRef } from 'react';

class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
    this.listeners = new Set();
  }

  // Add message to queue
  enqueue(message) {
    const queuedMessage = {
      ...message,
      id: `queued_${Date.now()}_${Math.random()}`,
      status: 'queued',
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    
    this.queue.push(queuedMessage);
    this.notifyListeners('messageQueued', queuedMessage);
    return queuedMessage;
  }

  // Process queue when connection is restored
  async processQueue(sendFunction) {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    this.notifyListeners('queueProcessingStarted');
    
    const processedMessages = [];
    
    while (this.queue.length > 0) {
      const message = this.queue[0];
      
      try {
        message.status = 'sending';
        this.notifyListeners('messageStatusChanged', message);
        
        // Simulate sending message
        await sendFunction(message);
        
        message.status = 'sent';
        message.timestamp = new Date().toISOString();
        processedMessages.push(message);
        
        this.queue.shift();
        this.retryAttempts.delete(message.id);
        this.notifyListeners('messageStatusChanged', message);
        
        // Small delay between messages to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('Failed to send queued message:', error);
        
        const retryCount = (this.retryAttempts.get(message.id) || 0) + 1;
        this.retryAttempts.set(message.id, retryCount);
        
        if (retryCount < this.maxRetries) {
          message.status = 'retry';
          message.retryCount = retryCount;
          this.notifyListeners('messageStatusChanged', message);
          
          // Move to end of queue for retry with exponential backoff
          this.queue.shift();
          
          setTimeout(() => {
            this.queue.push(message);
          }, this.retryDelay * Math.pow(2, retryCount - 1));
          
        } else {
          message.status = 'failed';
          this.queue.shift();
          this.retryAttempts.delete(message.id);
          this.notifyListeners('messageStatusChanged', message);
        }
      }
    }
    
    this.processing = false;
    this.notifyListeners('queueProcessingCompleted', { processedCount: processedMessages.length });
  }

  // Get queue status
  getQueueStatus() {
    return {
      total: this.queue.length,
      queued: this.queue.filter(m => m.status === 'queued').length,
      sending: this.queue.filter(m => m.status === 'sending').length,
      retrying: this.queue.filter(m => m.status === 'retry').length,
      processing: this.processing
    };
  }

  // Clear queue
  clearQueue() {
    const clearedCount = this.queue.length;
    this.queue = [];
    this.retryAttempts.clear();
    this.processing = false;
    this.notifyListeners('queueCleared', { clearedCount });
  }

  // Add listener for queue events
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in message queue listener:', error);
      }
    });
  }
}

// Hook for using message queue
export const useMessageQueue = () => {
  const queueRef = useRef(new MessageQueue());
  const [queueStatus, setQueueStatus] = useState(queueRef.current.getQueueStatus());
  
  useEffect(() => {
    const queue = queueRef.current;
    
    const updateStatus = () => {
      setQueueStatus(queue.getQueueStatus());
    };
    
    const removeListener = queue.addListener((event, data) => {
      updateStatus();
      
      // You can handle specific events here
      switch (event) {
        case 'messageQueued':
          console.log('Message queued:', data);
          break;
        case 'messageStatusChanged':
          console.log('Message status changed:', data.status, data);
          break;
        case 'queueProcessingStarted':
          console.log('Queue processing started');
          break;
        case 'queueProcessingCompleted':
          console.log('Queue processing completed:', data);
          break;
        case 'queueCleared':
          console.log('Queue cleared:', data);
          break;
      }
    });
    
    return removeListener;
  }, []);
  
  return {
    queue: queueRef.current,
    queueStatus,
    enqueueMessage: (message) => queueRef.current.enqueue(message),
    processQueue: (sendFunction) => queueRef.current.processQueue(sendFunction),
    clearQueue: () => queueRef.current.clearQueue()
  };
};

// Connection-aware message sending hook
export const useConnectionAwareMessaging = (isConnected, sendMessage) => {
  const { queue, queueStatus, enqueueMessage, processQueue, clearQueue } = useMessageQueue();
  const [lastConnectionState, setLastConnectionState] = useState(isConnected);
  
  // Process queue when connection is restored
  useEffect(() => {
    if (isConnected && !lastConnectionState) {
      console.log('Connection restored - processing message queue');
      processQueue(sendMessage);
    }
    setLastConnectionState(isConnected);
  }, [isConnected, lastConnectionState, processQueue, sendMessage]);
  
  const sendMessageSmart = async (message) => {
    if (isConnected) {
      try {
        await sendMessage(message);
        return { success: true, queued: false };
      } catch (error) {
        console.error('Failed to send message while online:', error);
        // Queue the message for retry
        const queuedMessage = enqueueMessage(message);
        return { success: false, queued: true, queuedMessage };
      }
    } else {
      // Offline - queue the message
      const queuedMessage = enqueueMessage(message);
      return { success: false, queued: true, queuedMessage };
    }
  };
  
  return {
    sendMessage: sendMessageSmart,
    queueStatus,
    clearQueue,
    isProcessing: queueStatus.processing
  };
};

export default MessageQueue;
