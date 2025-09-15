import React, { useEffect } from 'react';

/**
 * Component that directly modifies DOM elements for the sidebar styling
 * This approach uses direct DOM manipulation to guarantee changes take effect
 */
const SidebarStyleInjector = () => {
  useEffect(() => {
    // Direct DOM manipulation function to apply our changes
    const applyStyles = () => {
      // Find all conversation items
      const conversationItems = document.querySelectorAll('.pro-conversation-item');
      
      if (conversationItems.length === 0) {
        // If elements aren't loaded yet, retry after a short delay
        setTimeout(applyStyles, 500);
        return;
      }
      
      console.log('SidebarStyleInjector: Found', conversationItems.length, 'conversation items');
      
      // Apply styles to each conversation item
      conversationItems.forEach(item => {
        // Target the avatar
        const avatar = item.querySelector('.pro-conversation-avatar');
        if (!avatar) return;
        
        avatar.style.transition = 'transform 0.3s ease';
        avatar.style.position = 'relative';
        
        // Find and style avatar image
        const img = avatar.querySelector('img');
        if (img) {
          img.style.border = '2px solid #e4e9f0';
          img.style.borderRadius = '50%';
          img.style.transition = 'border-color 0.3s ease';
        }
        
        // Target the name
        const nameEl = item.querySelector('.pro-conversation-name');
        if (!nameEl) return;
        
        // Store the original text
        const nameText = nameEl.textContent || 'User';
        
        // Hide the name in its original location
        nameEl.style.opacity = '0';
        nameEl.style.position = 'absolute';
        nameEl.style.pointerEvents = 'none';
        
        // Remove any existing tooltips before adding a new one
        const existingTooltip = avatar.querySelector('.name-tooltip');
        if (existingTooltip) {
          avatar.removeChild(existingTooltip);
        }
        
        // Create a tooltip element for the name
        const tooltip = document.createElement('div');
        tooltip.className = 'name-tooltip';
        tooltip.textContent = nameText;
        tooltip.style.cssText = `
          position: absolute;
          top: 50%;
          left: 100%;
          transform: translate(10px, -50%);
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s;
          z-index: 9999;
          pointer-events: none;
        `;
        
        // Add tooltip to avatar
        avatar.appendChild(tooltip);
        
        // Add hover event listeners
        item.addEventListener('mouseenter', () => {
          avatar.style.transform = 'scale(1.05)';
          if (img) img.style.borderColor = '#3b82f6';
          tooltip.style.opacity = '1';
        });
        
        item.addEventListener('mouseleave', () => {
          avatar.style.transform = 'scale(1)';
          if (img) img.style.borderColor = '#e4e9f0';
          tooltip.style.opacity = '0';
        });
      });
      
      console.log('SidebarStyleInjector: Styling applied successfully');
    };
    
    // Call the function initially
    applyStyles();
    
    // Set up a MutationObserver to apply styles to newly added elements
    const observer = new MutationObserver(() => {
      applyStyles();
    });
    
    // Start observing the sidebar for changes
    const sidebar = document.querySelector('.pro-sidebar');
    if (sidebar) {
      observer.observe(sidebar, { childList: true, subtree: true });
    }
    
    // Clean up observer on unmount
    return () => {
      if (observer) observer.disconnect();
    };
  }, []);
  
  return null; // This component doesn't render anything
};

export default SidebarStyleInjector;