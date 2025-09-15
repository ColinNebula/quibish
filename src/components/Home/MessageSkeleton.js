import React from 'react';
import './MessageInteractions.css';

const MessageSkeleton = ({ count = 3, position = 'left' }) => {
  const skeletons = Array(count).fill(0);
  
  return (
    <div className="pro-skeletons-container">
      {skeletons.map((_, index) => (
        <div 
          key={index} 
          className={`pro-message-skeleton ${position === 'right' ? 'right' : 'left'}`}
        >
          {position === 'left' && (
            <div className="pro-avatar-skeleton"></div>
          )}
          <div className="pro-content-skeleton">
            <div className="pro-text-line"></div>
            {index % 2 === 0 && <div className="pro-text-line short"></div>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageSkeleton;
