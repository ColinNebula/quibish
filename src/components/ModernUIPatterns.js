import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ModernUIPatterns.css';

// Floating Action Button Component
export const FloatingActionButton = ({ 
  icon = '+',
  onClick,
  position = 'bottom-right',
  color = 'primary',
  size = 'large',
  tooltip,
  children,
  className = '',
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const fabRef = useRef(null);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (children) {
      setIsExpanded(!isExpanded);
    } else if (onClick) {
      onClick(e);
    }
  }, [isExpanded, children, onClick]);

  // Close expanded FAB when clicking outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleOutsideClick = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isExpanded]);

  return (
    <div 
      ref={fabRef}
      className={`floating-action-button ${position} ${color} ${size} ${isExpanded ? 'expanded' : ''} ${className}`}
      {...props}
    >
      {/* Sub-actions (if children provided) */}
      {children && isExpanded && (
        <div className="fab-submenu">
          {React.Children.map(children, (child, index) => (
            <div 
              key={index}
              className="fab-subaction"
              style={{ '--delay': `${index * 0.1}s` }}
            >
              {child}
            </div>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        className="fab-main"
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={tooltip}
      >
        <span className={`fab-icon ${isExpanded ? 'rotated' : ''}`}>
          {icon}
        </span>
        
        {/* Ripple Effect */}
        <span className="fab-ripple"></span>
      </button>

      {/* Tooltip */}
      {tooltip && showTooltip && !isExpanded && (
        <div className="fab-tooltip">
          {tooltip}
        </div>
      )}
    </div>
  );
};

// Contextual Menu Component
export const ContextualMenu = ({ 
  trigger,
  items = [],
  isOpen = false,
  onClose,
  position = 'auto',
  className = ''
}) => {
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [calculatedPosition, setCalculatedPosition] = useState('bottom-right');
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  // Calculate menu position
  useEffect(() => {
    if (isOpen && triggerRef.current && menuRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      let x = triggerRect.left;
      let y = triggerRect.bottom + 8;
      let calculatedPos = 'bottom-left';

      // Adjust horizontal position
      if (x + menuRect.width > viewport.width - 16) {
        x = triggerRect.right - menuRect.width;
        calculatedPos = calculatedPos.replace('left', 'right');
      }

      // Adjust vertical position
      if (y + menuRect.height > viewport.height - 16) {
        y = triggerRect.top - menuRect.height - 8;
        calculatedPos = calculatedPos.replace('bottom', 'top');
      }

      setMenuPosition({ x, y });
      setCalculatedPosition(calculatedPos);
    }
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleItemClick = useCallback((item, e) => {
    e.stopPropagation();
    if (item.onClick) {
      item.onClick(e);
    }
    if (!item.keepOpen) {
      onClose?.();
    }
  }, [onClose]);

  return (
    <>
      {/* Trigger Element */}
      <div ref={triggerRef} className="contextual-menu-trigger">
        {trigger}
      </div>

      {/* Menu Portal */}
      {isOpen && (
        <div 
          ref={menuRef}
          className={`contextual-menu ${calculatedPosition} ${className}`}
          style={{
            position: 'fixed',
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            zIndex: 9999
          }}
        >
          <div className="menu-items">
            {items.map((item, index) => {
              if (item.type === 'divider') {
                return <div key={index} className="menu-divider" />;
              }

              return (
                <button
                  key={index}
                  className={`menu-item ${item.disabled ? 'disabled' : ''} ${item.className || ''}`}
                  onClick={(e) => handleItemClick(item, e)}
                  disabled={item.disabled}
                  style={{ '--delay': `${index * 0.05}s` }}
                >
                  {item.icon && <span className="menu-item-icon">{item.icon}</span>}
                  <span className="menu-item-text">{item.text}</span>
                  {item.shortcut && <span className="menu-item-shortcut">{item.shortcut}</span>}
                  {item.submenu && <span className="menu-item-arrow">›</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

// Swipe Gesture Hook
export const useSwipeGestures = (options = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScroll = false
  } = options;

  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  const onTouchStart = useCallback((e) => {
    touchEnd.current = null;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  }, []);

  const onTouchMove = useCallback((e) => {
    if (preventScroll) {
      e.preventDefault();
    }
  }, [preventScroll]);

  const onTouchEnd = useCallback((e) => {
    if (!touchStart.current) return;

    touchEnd.current = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const deltaX = touchStart.current.x - touchEnd.current.x;
    const deltaY = touchStart.current.y - touchEnd.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > threshold || absDeltaY > threshold) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipeLeft?.(e);
        } else {
          onSwipeRight?.(e);
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipeUp?.(e);
        } else {
          onSwipeDown?.(e);
        }
      }
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};

// Pull to Refresh Component
export const PullToRefresh = ({ 
  onRefresh,
  threshold = 60,
  resistance = 2.5,
  children,
  className = ''
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;

    if (deltaY > 0) {
      e.preventDefault();
      setPullDistance(Math.min(deltaY / resistance, threshold * 1.5));
    }
  }, [isPulling, isRefreshing, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  const getRefreshStatus = () => {
    if (isRefreshing) return 'Refreshing...';
    if (pullDistance >= threshold) return 'Release to refresh';
    if (pullDistance > 0) return 'Pull to refresh';
    return '';
  };

  return (
    <div 
      ref={containerRef}
      className={`pull-to-refresh ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className={`pull-indicator ${isPulling || isRefreshing ? 'visible' : ''}`}
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          opacity: Math.min(pullDistance / threshold, 1)
        }}
      >
        <div className={`refresh-spinner ${isRefreshing ? 'spinning' : ''}`}>
          ↻
        </div>
        <span className="refresh-text">{getRefreshStatus()}</span>
      </div>

      {/* Content */}
      <div 
        className="refresh-content"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease'
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Infinite Scroll Hook
export const useInfiniteScroll = (callback, hasMore = true, threshold = 100) => {
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef(null);

  const lastElementRef = useCallback((node) => {
    if (isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setIsLoading(true);
        callback().finally(() => setIsLoading(false));
      }
    }, { rootMargin: `${threshold}px` });

    if (node) observerRef.current.observe(node);
  }, [isLoading, hasMore, callback, threshold]);

  return { lastElementRef, isLoading };
};

// Keyboard Shortcuts Hook
export const useKeyboardShortcuts = (shortcuts = {}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const modifiers = {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
      };

      for (const [shortcut, callback] of Object.entries(shortcuts)) {
        const parts = shortcut.toLowerCase().split('+');
        const shortcutKey = parts.pop();
        const requiredModifiers = parts;

        const modifierMatch = requiredModifiers.every(mod => modifiers[mod]) &&
                              Object.keys(modifiers).filter(mod => modifiers[mod]).length === requiredModifiers.length;

        if (key === shortcutKey && modifierMatch) {
          e.preventDefault();
          callback(e);
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Accessibility Helper Component
export const AccessibilityHelper = ({ 
  announcements = [],
  focusTrap = false,
  skipLinks = [],
  className = ''
}) => {
  const [currentAnnouncement, setCurrentAnnouncement] = useState('');
  const trapRef = useRef(null);

  // Handle announcements
  useEffect(() => {
    if (announcements.length > 0) {
      const latest = announcements[announcements.length - 1];
      setCurrentAnnouncement(latest);
      
      // Clear announcement after a delay
      const timer = setTimeout(() => {
        setCurrentAnnouncement('');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [announcements]);

  // Focus trap
  useEffect(() => {
    if (!focusTrap || !trapRef.current) return;

    const focusableElements = trapRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleTabKey);
  }, [focusTrap]);

  return (
    <div ref={trapRef} className={`accessibility-helper ${className}`}>
      {/* Screen Reader Announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {currentAnnouncement}
      </div>

      {/* Skip Links */}
      {skipLinks.length > 0 && (
        <div className="skip-links">
          {skipLinks.map((link, index) => (
            <a 
              key={index}
              href={link.href}
              className="skip-link"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector(link.href)?.focus();
              }}
            >
              {link.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};