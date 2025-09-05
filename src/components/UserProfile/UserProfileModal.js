import React, { useEffect } from 'react';
import UserProfile from './UserProfile';
import './UserProfileModal.css';

const UserProfileModal = ({ userId, username, onClose }) => {
  // Add event listener for ESC key to close the modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  // Handle clicks on the backdrop (outside the profile panel)
  const handleBackdropClick = (e) => {
    if (e.target.className === 'user-profile-modal-backdrop') {
      onClose();
    }
  };

  return (
    <div className="user-profile-modal-backdrop" onClick={handleBackdropClick}>
      <UserProfile 
        userId={userId} 
        username={username} 
        onClose={onClose} 
      />
    </div>
  );
};

export default UserProfileModal;