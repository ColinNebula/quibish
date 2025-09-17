import React, { Suspense, lazy } from 'react';

// Lazy load major components for code splitting
export const LazyProChat = lazy(() => import('./Home/ProChat'));
export const LazyUserProfile = lazy(() => import('./UserProfile/UserProfile'));
export const LazyGifPicker = lazy(() => import('./GifPicker/GifPicker'));
export const LazyUserSearchModal = lazy(() => import('./Search/UserSearchModal'));
export const LazyNewChatModal = lazy(() => import('./NewChat/NewChatModal'));
export const LazySecurityDashboard = lazy(() => import('./Security/SecurityDashboard'));

// Loading component with mobile-optimized spinner
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div 
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.3)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <span style={{ fontSize: '14px', opacity: 0.9 }}>Loading Quibish...</span>
    </div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// HOC for wrapping lazy components with Suspense
export const withSuspense = (Component, fallback = <LoadingSpinner />) => {
  return (props) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

// Pre-configured lazy components with Suspense
export const SuspendedProChat = withSuspense(LazyProChat);
export const SuspendedUserProfile = withSuspense(LazyUserProfile);
export const SuspendedGifPicker = withSuspense(LazyGifPicker);
export const SuspendedUserSearchModal = withSuspense(LazyUserSearchModal);
export const SuspendedNewChatModal = withSuspense(LazyNewChatModal);
export const SuspendedSecurityDashboard = withSuspense(LazySecurityDashboard);

// Preload functions for critical components
export const preloadComponents = {
  proChat: () => import('./Home/ProChat'),
  userProfile: () => import('./UserProfile/UserProfile'),
  gifPicker: () => import('./GifPicker/GifPicker'),
  userSearchModal: () => import('./Search/UserSearchModal'),
  newChatModal: () => import('./NewChat/NewChatModal'),
  securityDashboard: () => import('./Security/SecurityDashboard')
};

// Smart preloading based on user interaction
export const smartPreload = {
  onUserInteraction: () => {
    // Preload likely next components on first user interaction
    preloadComponents.userProfile();
    preloadComponents.newChatModal();
  },
  
  onAuthentication: () => {
    // Preload chat components after authentication
    preloadComponents.proChat();
    preloadComponents.gifPicker();
    preloadComponents.userSearchModal();
  },
  
  onChatStart: () => {
    // Preload chat-related components when chat starts
    preloadComponents.newChatModal();
    preloadComponents.userSearchModal();
  }
};