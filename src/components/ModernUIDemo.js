import React, { useState, useCallback } from 'react';
import { 
  FloatingActionButton, 
  ContextualMenu, 
  useSwipeGestures, 
  PullToRefresh, 
  useInfiniteScroll,
  useKeyboardShortcuts,
  AccessibilityHelper 
} from './ModernUIPatterns';
import './ModernUIDemo.css';

const ModernUIDemo = () => {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Welcome to the Modern UI Demo!", sender: "System", time: "10:00 AM" },
    { id: 2, text: "Try the floating action button!", sender: "Guide", time: "10:01 AM" },
    { id: 3, text: "Right-click for context menu", sender: "Guide", time: "10:02 AM" },
    { id: 4, text: "Swipe gestures work on mobile", sender: "Guide", time: "10:03 AM" },
    { id: 5, text: "Pull down to refresh", sender: "Guide", time: "10:04 AM" },
  ]);
  const [hasMore, setHasMore] = useState(true);
  const [announcements, setAnnouncements] = useState([]);

  // Swipe gestures
  const swipeHandlers = useSwipeGestures({
    onSwipeLeft: () => announce("Swiped left - next message"),
    onSwipeRight: () => announce("Swiped right - previous message"),
    onSwipeUp: () => announce("Swiped up - scroll to top"),
    onSwipeDown: () => announce("Swiped down - refresh"),
    threshold: 50
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+n': () => {
      addNewMessage("New message via Ctrl+N");
      announce("New message added via keyboard shortcut");
    },
    'ctrl+r': (e) => {
      e.preventDefault();
      handleRefresh();
      announce("Refreshed via Ctrl+R");
    },
    'escape': () => {
      setContextMenuOpen(false);
      announce("Context menu closed");
    },
    '/': () => {
      announce("Search shortcut activated");
    }
  });

  // Infinite scroll
  const { lastElementRef, isLoading } = useInfiniteScroll(
    useCallback(async () => {
      // Simulate loading more messages
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newMessages = Array.from({ length: 5 }, (_, i) => ({
        id: messages.length + i + 1,
        text: `Loaded message ${messages.length + i + 1}`,
        sender: "Auto",
        time: new Date().toLocaleTimeString()
      }));

      setMessages(prev => [...prev, ...newMessages]);
      
      // Stop loading after 50 messages
      if (messages.length > 45) {
        setHasMore(false);
      }
    }, [messages.length]),
    hasMore
  );

  const announce = useCallback((message) => {
    setAnnouncements(prev => [...prev, message]);
  }, []);

  const addNewMessage = useCallback((text) => {
    const newMessage = {
      id: Date.now(),
      text,
      sender: "User",
      time: new Date().toLocaleTimeString()
    };
    setMessages(prev => [newMessage, ...prev]);
  }, []);

  const handleRefresh = useCallback(async () => {
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const refreshMessage = {
      id: Date.now(),
      text: "Content refreshed! 🔄",
      sender: "System",
      time: new Date().toLocaleTimeString()
    };
    setMessages(prev => [refreshMessage, ...prev]);
    announce("Content refreshed successfully");
  }, [announce]);

  const contextMenuItems = [
    {
      icon: "📝",
      text: "New Message",
      shortcut: "Ctrl+N",
      onClick: () => addNewMessage("New message from context menu")
    },
    {
      icon: "🔄",
      text: "Refresh",
      shortcut: "Ctrl+R",
      onClick: handleRefresh
    },
    { type: 'divider' },
    {
      icon: "⚙️",
      text: "Settings",
      onClick: () => announce("Settings opened")
    },
    {
      icon: "❓",
      text: "Help",
      shortcut: "F1",
      onClick: () => announce("Help opened")
    },
    { type: 'divider' },
    {
      icon: "🌙",
      text: "Toggle Theme",
      onClick: () => {
        document.documentElement.setAttribute(
          'data-theme',
          document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
        );
        announce("Theme toggled");
      }
    }
  ];

  return (
    <div className="modern-ui-demo" {...swipeHandlers}>
      <AccessibilityHelper
        announcements={announcements}
        skipLinks={[
          { href: "#main-content", text: "Skip to main content" },
          { href: "#fab-actions", text: "Skip to actions" }
        ]}
      />

      {/* Header */}
      <header className="demo-header">
        <h1>Modern UI Patterns Demo</h1>
        <div className="header-info">
          <span className="message-count">{messages.length} messages</span>
          <div className="keyboard-hints">
            <span>Ctrl+N: New</span>
            <span>Ctrl+R: Refresh</span>
            <span>/: Search</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="demo-content">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="messages-container">
            {messages.map((message, index) => (
              <ContextualMenu
                key={message.id}
                trigger={
                  <div 
                    className="message-item"
                    ref={index === messages.length - 1 ? lastElementRef : null}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuOpen(true);
                    }}
                  >
                    <div className="message-header">
                      <span className="message-sender">{message.sender}</span>
                      <span className="message-time">{message.time}</span>
                    </div>
                    <div className="message-text">{message.text}</div>
                  </div>
                }
                items={contextMenuItems}
                isOpen={contextMenuOpen}
                onClose={() => setContextMenuOpen(false)}
              />
            ))}

            {/* Infinite scroll loading indicator */}
            {isLoading && (
              <div className="loading-indicator">
                <div className="loading-spinner"></div>
                <span>Loading more messages...</span>
              </div>
            )}

            {!hasMore && (
              <div className="end-indicator">
                <span>🎉 You've reached the end!</span>
              </div>
            )}
          </div>
        </PullToRefresh>
      </main>

      {/* Floating Action Button */}
      <div id="fab-actions">
        <FloatingActionButton
          icon="💬"
          position="bottom-right"
          color="primary"
          size="large"
          tooltip="Quick Actions"
        >
          <button onClick={() => addNewMessage("Quick message!")}>
            ➕
          </button>
          <button onClick={() => announce("Camera opened")}>
            📷
          </button>
          <button onClick={() => announce("Voice recorder opened")}>
            🎤
          </button>
          <button onClick={() => announce("File picker opened")}>
            📁
          </button>
        </FloatingActionButton>
      </div>

      {/* Feature Showcase Panel */}
      <div className="features-panel">
        <h3>🚀 Features Demonstrated</h3>
        <ul className="features-list">
          <li>
            <strong>Floating Action Button:</strong> 
            Expandable FAB with sub-actions (bottom-right corner)
          </li>
          <li>
            <strong>Contextual Menu:</strong> 
            Right-click any message for context options
          </li>
          <li>
            <strong>Swipe Gestures:</strong> 
            Swipe left/right/up/down on mobile devices
          </li>
          <li>
            <strong>Pull to Refresh:</strong> 
            Pull down from the top to refresh content
          </li>
          <li>
            <strong>Infinite Scroll:</strong> 
            Automatically loads more messages as you scroll
          </li>
          <li>
            <strong>Keyboard Shortcuts:</strong> 
            Ctrl+N (new), Ctrl+R (refresh), / (search), Esc (close)
          </li>
          <li>
            <strong>Accessibility:</strong> 
            Screen reader announcements, focus management, skip links
          </li>
        </ul>
      </div>

      {/* Mobile Gesture Guide */}
      <div className="mobile-guide">
        <h4>📱 Mobile Gestures</h4>
        <div className="gesture-list">
          <div className="gesture-item">
            <span className="gesture-icon">👈</span>
            <span>Swipe left: Next</span>
          </div>
          <div className="gesture-item">
            <span className="gesture-icon">👉</span>
            <span>Swipe right: Previous</span>
          </div>
          <div className="gesture-item">
            <span className="gesture-icon">👆</span>
            <span>Swipe up: Scroll to top</span>
          </div>
          <div className="gesture-item">
            <span className="gesture-icon">👇</span>
            <span>Pull down: Refresh</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernUIDemo;