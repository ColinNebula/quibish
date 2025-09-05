import React from 'react';
import './DemoMenu.css';

/**
 * Demo menu component to showcase different application demos
 * 
 * @component DemoMenu
 */
const DemoMenu = () => {
  const handleDemoClick = (demoType) => {
    const url = new URL(window.location);
    url.searchParams.set('demo', demoType);
    window.location.href = url.toString();
  };

  const handleMainApp = () => {
    const url = new URL(window.location);
    url.searchParams.delete('demo');
    window.location.href = url.toString();
  };

  return (
    <div className="demo-menu">
      <div className="demo-menu-content">
        <h1 className="demo-menu-title">QuibiChat Demos</h1>
        <p className="demo-menu-subtitle">Explore our application features</p>
        
        <div className="demo-cards">
          <div className="demo-card" onClick={() => handleDemoClick('splash')}>
            <div className="demo-card-icon">🚀</div>
            <h3>Dynamic Splash Screen</h3>
            <p>Experience our beautiful animated splash screen with particles, gradient backgrounds, and smooth animations.</p>
            <div className="demo-card-features">
              <span>Particle System</span>
              <span>Gradient Animation</span>
              <span>Progress Loading</span>
            </div>
          </div>
          
          <div className="demo-card" onClick={() => handleDemoClick('search')}>
            <div className="demo-card-icon">🔍</div>
            <h3>Enhanced Search</h3>
            <p>Comprehensive search functionality across conversations, users, messages, and media files.</p>
            <div className="demo-card-features">
              <span>Multi-Type Search</span>
              <span>Real-time Results</span>
              <span>Smart Filters</span>
            </div>
          </div>
          
          <div className="demo-card" onClick={handleMainApp}>
            <div className="demo-card-icon">💬</div>
            <h3>Main Application</h3>
            <p>Access the full QuibiChat application with all features and functionality.</p>
            <div className="demo-card-features">
              <span>Full Featured</span>
              <span>Authentication</span>
              <span>Real Chat</span>
            </div>
          </div>
        </div>
        
        <div className="demo-menu-footer">
          <p>Built with React, modern CSS, and attention to detail</p>
        </div>
      </div>
    </div>
  );
};

export default DemoMenu;
