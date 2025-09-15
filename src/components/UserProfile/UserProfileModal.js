import React, { useEffect, useState, useCallback } from 'react';
import UserProfile from './UserProfile';
import './UserProfileModal.css';

const UserProfileModal = ({ userId, username, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Handle closing animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match the animation duration
  }, [onClose]);

  // Trigger entrance animation
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Add event listener for ESC key to close the modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle clicks on the backdrop (outside the profile panel)
  const handleBackdropClick = (e) => {
    if (e.target.className.includes('user-profile-modal-backdrop')) {
      handleClose();
    }
  };

  return (
    <div 
      className={`user-profile-modal-backdrop ${isVisible ? 'visible' : ''} ${isClosing ? 'closing' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className="modal-glass-effect">
        <UserProfile 
          userId={userId} 
          username={username} 
          onClose={handleClose}
          isVisible={isVisible}
          isClosing={isClosing}
        />
      </div>
    </div>
  );
};

export default UserProfileModal;