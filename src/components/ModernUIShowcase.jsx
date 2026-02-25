import React, { useState } from 'react';
import './styles/modern-design-system.css';
import './styles/modern-components.css';
import './styles/modern-animations.css';
import './styles/modern-mobile.css';

/**
 * ModernUIShowcase - Component demonstrating the Modern UI Design System 2026
 * 
 * This component showcases all the modern UI features including:
 * - Modern cards with glassmorphism and neumorphism
 * - Animated components with smooth micro-interactions
 * - Mobile-optimized bottom navigation and FAB
 * - Responsive design with modern animations
 */

const ModernUIShowcase = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-theme');
  };

  return (
    <div className="min-h-screen" style={{ background: isDarkMode ? '#0f172a' : 'var(--gradient-mesh)', padding: '24px' }}>
      {/* Header */}
      <div className="card card-glass animate-fade-in-down" style={{ marginBottom: '24px' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', marginBottom: '8px' }}>
              Modern UI 2026
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
              Next-generation design system
            </p>
          </div>
          <button 
            className="btn btn-primary btn-icon hover-scale tap-scale"
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="mobile-tabs animate-fade-in" style={{ marginBottom: '24px' }}>
        <button 
          className={`mobile-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button 
          className={`mobile-tab ${activeTab === 'cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          Cards
        </button>
        <button 
          className={`mobile-tab ${activeTab === 'buttons' ? 'active' : ''}`}
          onClick={() => setActiveTab('buttons')}
        >
          Buttons
        </button>
        <button 
          className={`mobile-tab ${activeTab === 'animations' ? 'active' : ''}`}
          onClick={() => setActiveTab('animations')}
        >
          Animations
        </button>
      </div>

      {/* Card Showcase */}
      {(activeTab === 'all' || activeTab === 'cards') && (
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: '16px' }}>
            Modern Cards
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {/* Glass Card */}
            <div className="card card-glass hover-lift animate-fade-in-up">
              <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
                <div className="avatar avatar-online">
                  <img src="https://i.pravatar.cc/150?img=1" alt="User" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'var(--font-semibold)' }}>Glassmorphism</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Frosted glass effect</div>
                </div>
                <span className="badge badge-primary">New</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Modern glassmorphism design with backdrop blur and transparency effects.
              </p>
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm">Action</button>
                <button className="btn btn-ghost btn-sm">Details</button>
              </div>
            </div>

            {/* Neumorphism Card */}
            <div className="card card-neu hover-lift animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
                <div className="avatar" style={{ background: 'var(--gradient-ocean)' }}>
                  JS
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'var(--font-semibold)' }}>Neumorphism</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Soft UI design</div>
                </div>
                <span className="badge badge-success">Active</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Soft, 3D embossed effect with subtle shadows for a modern tactile feel.
              </p>
              <div className="flex gap-2">
                <button className="btn btn-neu btn-sm">Touch Me</button>
                <button className="btn btn-ghost btn-sm">Learn More</button>
              </div>
            </div>

            {/* Gradient Card */}
            <div className="card card-gradient hover-scale animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
                <div className="avatar" style={{ background: 'white', color: 'var(--primary-500)' }}>
                  ⭐
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'var(--font-semibold)' }}>Premium</div>
                  <div style={{ fontSize: 'var(--text-sm)', opacity: 0.9 }}>Upgrade now</div>
                </div>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.3)', color: 'white' }}>
                  Pro
                </span>
              </div>
              <p style={{ opacity: 0.95, marginBottom: '16px' }}>
                Vibrant gradient backgrounds with smooth color transitions and modern appeal.
              </p>
              <button className="btn" style={{ background: 'white', color: 'var(--primary-500)' }}>
                Upgrade Now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Button Showcase */}
      {(activeTab === 'all' || activeTab === 'buttons') && (
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: '16px' }}>
            Modern Buttons
          </h2>
          
          <div className="card animate-fade-in-up" style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: '16px' }}>
              Button Variants
            </h3>
            <div className="flex flex-wrap gap-3" style={{ marginBottom: '24px' }}>
              <button className="btn btn-primary hover-lift tap-scale">Primary</button>
              <button className="btn btn-secondary hover-lift tap-scale">Secondary</button>
              <button className="btn btn-outline hover-lift tap-scale">Outline</button>
              <button className="btn btn-ghost hover-lift tap-scale">Ghost</button>
              <button className="btn btn-glass hover-lift tap-scale">Glass</button>
              <button className="btn btn-neu hover-lift tap-scale">Neumorphic</button>
            </div>

            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: '16px' }}>
              Button Sizes
            </h3>
            <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: '24px' }}>
              <button className="btn btn-primary btn-sm">Small</button>
              <button className="btn btn-primary">Default</button>
              <button className="btn btn-primary btn-lg">Large</button>
            </div>

            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: '16px' }}>
              Icon Buttons
            </h3>
            <div className="flex gap-3">
              <button className="btn btn-primary btn-icon hover-scale tap-scale">
                ❤️
              </button>
              <button className="btn btn-secondary btn-icon hover-scale tap-scale">
                💬
              </button>
              <button className="btn btn-outline btn-icon hover-scale tap-scale">
                🔔
              </button>
              <button className="btn btn-ghost btn-icon hover-scale tap-scale">
                ⚙️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation Showcase */}
      {(activeTab === 'all' || activeTab === 'animations') && (
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: '16px' }}>
            Smooth Animations
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div className="card hover-lift animate-bounce">
              <div className="text-center">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎾</div>
                <h4 style={{ fontWeight: 'var(--font-semibold)', marginBottom: '8px' }}>Bounce</h4>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 0 }}>
                  Playful bounce animation
                </p>
              </div>
            </div>

            <div className="card hover-lift animate-pulse">
              <div className="text-center">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💫</div>
                <h4 style={{ fontWeight: 'var(--font-semibold)', marginBottom: '8px' }}>Pulse</h4>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 0 }}>
                  Gentle pulse effect
                </p>
              </div>
            </div>

            <div className="card hover-scale animate-glow">
              <div className="text-center">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
                <h4 style={{ fontWeight: 'var(--font-semibold)', marginBottom: '8px' }}>Glow</h4>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 0 }}>
                  Glowing shimmer effect
                </p>
              </div>
            </div>

            <div className="card hover-lift">
              <div className="text-center">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
                <h4 style={{ fontWeight: 'var(--font-semibold)', marginBottom: '8px' }}>Hover Lift</h4>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 0 }}>
                  Hover to lift up
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading States */}
      {(activeTab === 'all' || activeTab === 'animations') && (
        <div className="card animate-fade-in-up" style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: '16px' }}>
            Loading States
          </h3>
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '8px' }}>Spinner</p>
              <div className="spinner"></div>
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '8px' }}>Dots</p>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '8px' }}>Progress Bar</p>
              <div className="loading-bar"></div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile List Example */}
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: '16px' }}>
          Modern Lists
        </h2>
        
        <ul className="mobile-list animate-fade-in-up">
          <li className="mobile-list-item tap-scale">
            <div className="mobile-list-icon">🏠</div>
            <div className="mobile-list-content">
              <div className="mobile-list-title">Home</div>
              <div className="mobile-list-description">Your main feed and updates</div>
            </div>
            <div className="mobile-list-meta">→</div>
          </li>
          <li className="mobile-list-item tap-scale">
            <div className="mobile-list-icon">🔔</div>
            <div className="mobile-list-content">
              <div className="mobile-list-title">Notifications</div>
              <div className="mobile-list-description">Recent activity and alerts</div>
            </div>
            <div className="mobile-list-meta">
              <span className="badge badge-error">12</span>
            </div>
          </li>
          <li className="mobile-list-item tap-scale">
            <div className="mobile-list-icon">💬</div>
            <div className="mobile-list-content">
              <div className="mobile-list-title">Messages</div>
              <div className="mobile-list-description">Chat with your friends</div>
            </div>
            <div className="mobile-list-meta">
              <span className="badge badge-success">5</span>
            </div>
          </li>
          <li className="mobile-list-item tap-scale">
            <div className="mobile-list-icon">⚙️</div>
            <div className="mobile-list-content">
              <div className="mobile-list-title">Settings</div>
              <div className="mobile-list-description">Manage your preferences</div>
            </div>
            <div className="mobile-list-meta">→</div>
          </li>
        </ul>
      </div>

      {/* Floating Action Button */}
      <button 
        className="fab hover-scale tap-scale"
        onClick={() => setIsSheetOpen(true)}
        title="Create new"
      >
        <span className="fab-icon">+</span>
      </button>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <a href="#home" className="bottom-nav-item active tap-scale">
          <span className="bottom-nav-icon">🏠</span>
          <span className="bottom-nav-label">Home</span>
        </a>
        <a href="#search" className="bottom-nav-item tap-scale">
          <span className="bottom-nav-icon">🔍</span>
          <span className="bottom-nav-label">Search</span>
        </a>
        <a href="#notifications" className="bottom-nav-item tap-scale">
          <span className="bottom-nav-icon">🔔</span>
          <span className="bottom-nav-label">Alerts</span>
          <span className="bottom-nav-badge">5</span>
        </a>
        <a href="#profile" className="bottom-nav-item tap-scale">
          <span className="bottom-nav-icon">👤</span>
          <span className="bottom-nav-label">Profile</span>
        </a>
      </nav>

      {/* Mobile Sheet (Bottom Drawer) */}
      {isSheetOpen && (
        <div className="mobile-modal" onClick={() => setIsSheetOpen(false)}>
          <div className="mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" onClick={() => setIsSheetOpen(false)}></div>
            <div className="mobile-sheet-header">
              <h2 className="mobile-sheet-title">Create New</h2>
            </div>
            <div className="mobile-sheet-body">
              <div className="mobile-list">
                <div className="mobile-list-item tap-scale">
                  <div className="mobile-list-icon">📝</div>
                  <div className="mobile-list-content">
                    <div className="mobile-list-title">New Post</div>
                    <div className="mobile-list-description">Share your thoughts</div>
                  </div>
                </div>
                <div className="mobile-list-item tap-scale">
                  <div className="mobile-list-icon">📷</div>
                  <div className="mobile-list-content">
                    <div className="mobile-list-title">Photo</div>
                    <div className="mobile-list-description">Upload a photo</div>
                  </div>
                </div>
                <div className="mobile-list-item tap-scale">
                  <div className="mobile-list-icon">📹</div>
                  <div className="mobile-list-content">
                    <div className="mobile-list-title">Video</div>
                    <div className="mobile-list-description">Record or upload video</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mobile-sheet-footer">
              <button 
                className="btn btn-ghost btn-full"
                onClick={() => setIsSheetOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernUIShowcase;
