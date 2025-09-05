import React, { useEffect, useRef, useState } from 'react';
import './ProContextMenu.css';

const ProContextMenu = ({ 
  x, 
  y, 
  conversationId, 
  onClose,
  onPin,
  onArchive,
  onMarkAsRead,
  onMute,
  onDelete,
  onForward,
  onCategoryChange,
  isPinned,
  isUnread,
  isMuted
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [focusedItem, setFocusedItem] = useState(0);
  const menuRef = useRef(null);
  
  // Calculate position to ensure menu stays within viewport
  const calculatePosition = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let posX = x;
    let posY = y;

    // If we have the actual menu element, measure it for more accurate placement
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const menuWidth = rect.width || 240;
      const menuHeight = rect.height || 250;

      if (x + menuWidth > viewportWidth) {
        posX = Math.max(8, viewportWidth - menuWidth - 10);
      }

      if (y + menuHeight > viewportHeight) {
        posY = Math.max(8, viewportHeight - menuHeight - 10);
      }
    } else {
      // Fallback estimates
      const menuWidth = 240;
      const menuHeight = 250;
      if (x + menuWidth > viewportWidth) {
        posX = Math.max(8, viewportWidth - menuWidth - 10);
      }
      if (y + menuHeight > viewportHeight) {
        posY = Math.max(8, viewportHeight - menuHeight - 10);
      }
    }

    return {
      position: 'fixed',
      top: `${posY}px`,
      left: `${posX}px`,
      zIndex: 2000
    };
  };
  
  // Position the menu and handle clicks; we'll recalc after mount for accurate menu size
  const [style, setStyle] = useState(calculatePosition());
  
  const handleClick = (action, category = null) => {
    // Call the appropriate action handler
    switch (action) {
      case 'pin':
        onPin && onPin(conversationId);
        break;
      case 'archive':
        onArchive && onArchive(conversationId);
        break;
      case 'mark-read':
        onMarkAsRead && onMarkAsRead(conversationId);
        break;
      case 'mute':
        onMute && onMute(conversationId);
        break;
      case 'category':
        if (category && onCategoryChange) {
          onCategoryChange(conversationId, category);
        }
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this conversation?')) {
          onDelete && onDelete(conversationId);
        }
        break;
      case 'forward':
        onForward && onForward(conversationId);
        break;
      default:
        break;
    }
    
    // Close the menu
    onClose();
  };
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      e.stopPropagation();
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedItem((prev) => 
            prev < menuItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedItem((prev) => 
            prev > 0 ? prev - 1 : menuItems.length - 1
          );
          break;
        case 'Enter':
          if (focusedItem === 0) handleClick('pin');
          else if (focusedItem === 1 && isUnread) handleClick('mark-read');
          else if (focusedItem === (isUnread ? 2 : 1)) handleClick('mute');
          else if (focusedItem === (isUnread ? 3 : 2)) handleClick('archive');
          break;
        default:
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedItem]);

  // Recalculate position once mounted to account for menu size
  useEffect(() => {
    const recalculated = calculatePosition();
    setStyle(recalculated);
    // focus first item on open
    setTimeout(() => {
      const first = menuRef.current?.querySelector('.pro-context-menu-item');
      first && first.focus && first.setAttribute('tabindex', 0);
    }, 0);
  }, []);
  
  useEffect(() => {
    // Click outside to close
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Define menu sections and items
  const menuItems = [
    {
      id: 'organization',
      title: 'Organization',
      items: [
        {
          id: 'pin',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          ),
          label: isPinned ? 'Unpin conversation' : 'Pin conversation',
          action: () => handleClick('pin'),
          shortcut: 'P',
          show: true
        },
        {
          id: 'mark-read',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          ),
          label: 'Mark as read',
          action: () => handleClick('mark-read'),
          shortcut: 'R',
          show: isUnread
        },
        {
          id: 'mute',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isMuted ? (
                <path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </>
              )}
            </svg>
          ),
          label: isMuted ? 'Unmute notifications' : 'Mute notifications',
          action: () => handleClick('mute'),
          shortcut: 'M',
          show: true
        }
      ]
    },
    {
      id: 'manage',
      title: 'Manage',
      items: [
        {
          id: 'categories',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          ),
          label: 'Categorize',
          action: () => setActiveSubmenu(activeSubmenu === 'categories' ? null : 'categories'),
          hasSubmenu: true,
          show: true
        },
        {
          id: 'archive',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8"></polyline>
              <rect x="1" y="3" width="22" height="5"></rect>
              <line x1="10" y1="12" x2="14" y2="12"></line>
            </svg>
          ),
          label: 'Archive conversation',
          action: () => handleClick('archive'),
          shortcut: 'A',
          show: true
        }
      ]
    },
    {
      id: 'actions',
      title: 'Actions',
      items: [
        {
          id: 'forward',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
          ),
          label: 'Forward conversation',
          action: () => handleClick('forward'),
          show: true
        },
        {
          id: 'delete',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          ),
          label: 'Delete conversation',
          action: () => handleClick('delete'),
          className: 'pro-context-menu-danger',
          show: true
        }
      ]
    }
  ];

  const categories = [
    { id: 'work', label: 'Work', color: '#3b82f6' },
    { id: 'personal', label: 'Personal', color: '#10b981' },
    { id: 'other', label: 'Other', color: '#8b5cf6' },
    { id: 'none', label: 'Remove category', color: '#6b7280' }
  ];

  return (
    <div 
      className="pro-context-menu pro-context-menu-animate" 
      role="menu"
      aria-label="Conversation menu"
      style={style} 
      onClick={(e) => e.stopPropagation()}
      ref={menuRef}
    >
      <div className="pro-context-menu-container" role="presentation">
        {menuItems.map((section, sectionIndex) => (
          <div key={section.id} className="pro-context-menu-section">
            <div className="pro-context-menu-section-header">
              <span>{section.title}</span>
            </div>
            <ul className="pro-context-menu-list">
              {section.items
                .filter(item => item.show)
                .map((item, itemIndex) => {
                  const index = sectionIndex * 10 + itemIndex;
                  return (
                    <li 
                      key={item.id}
                      role="menuitem"
                      tabIndex={-1}
                      className={`pro-context-menu-item ${item.className || ''} ${focusedItem === index ? 'focused' : ''}`}
                      onClick={item.action}
                      onMouseEnter={() => setFocusedItem(index)}
                    >
                      {item.icon}
                      <div className="pro-context-menu-item-content">
                        <span>{item.label}</span>
                        {item.hasSubmenu && (
                          <svg className="pro-context-submenu-arrow" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        )}
                      </div>
                      {item.shortcut && <span className="pro-context-menu-shortcut">{item.shortcut}</span>}
                    </li>
                  );
                })
              }
            </ul>
            {sectionIndex < menuItems.length - 1 && <div className="pro-context-menu-divider"></div>}
          </div>
        ))}
        
        {/* Submenu for categories */}
        {activeSubmenu === 'categories' && (
          <div className="pro-context-submenu">
            <div className="pro-context-menu-section-header">
              <span>Choose category</span>
            </div>
            <ul className="pro-context-menu-list">
              {categories.map(category => (
                <li 
                  key={category.id}
                  className="pro-context-menu-item"
                  onClick={() => handleClick('category', category.id)}
                >
                  <div className="pro-category-color" style={{ backgroundColor: category.color }}></div>
                  <span>{category.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Set default props for optional handlers
ProContextMenu.defaultProps = {
  onDelete: () => {},
  onForward: () => {},
  onCategoryChange: () => {},
};

export default ProContextMenu;
