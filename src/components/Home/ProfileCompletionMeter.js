import React from 'react';
import './ProfileCompletionMeter.css';

/**
 * Calculate profile completion percentage
 * @param {Object} profile - User profile object
 * @returns {number} Completion percentage (0-100)
 */
const calculateCompletion = (profile) => {
  if (!profile) return 0;
  
  const fields = [
    'name',
    'email',
    'avatar',
    'bio',
    'phone',
    'location',
    'company',
    'website'
  ];
  
  let completedFields = 0;
  let totalFields = fields.length;
  
  fields.forEach(field => {
    if (profile[field]) {
      // Check if the field is not empty
      if (typeof profile[field] === 'string' && profile[field].trim() !== '') {
        completedFields++;
      } else if (typeof profile[field] !== 'string') {
        completedFields++;
      }
    }
  });
  
  return Math.round((completedFields / totalFields) * 100);
};

/**
 * Get completion level based on percentage
 * @param {number} percentage - Completion percentage
 * @returns {string} Completion level (low, medium, high, complete)
 */
const getCompletionLevel = (percentage) => {
  if (percentage >= 100) return 'complete';
  if (percentage >= 75) return 'high';
  if (percentage >= 40) return 'medium';
  return 'low';
};

/**
 * Component that shows a visual meter of profile completion
 */
const ProfileCompletionMeter = ({ 
  user, 
  onEditProfile 
}) => {
  const completionPercentage = calculateCompletion(user);
  const completionLevel = getCompletionLevel(completionPercentage);
  
  // Get suggestion for next field to complete
  const getSuggestion = () => {
    if (!user) return 'Complete your profile';
    
    if (!user.avatar) return 'Add a profile photo';
    if (!user.bio || user.bio.trim() === '') return 'Add a short bio';
    if (!user.location || user.location.trim() === '') return 'Add your location';
    if (!user.company || user.company.trim() === '') return 'Add your company';
    if (!user.website || user.website.trim() === '') return 'Add your website';
    
    return completionPercentage < 100 
      ? 'Your profile is almost complete!' 
      : 'Your profile is complete!';
  };
  
  return (
    <div className={`profile-completion-meter ${completionLevel}`}>
      <div className="completion-header">
        <h3>Profile Completion</h3>
        <span className="completion-percentage">{completionPercentage}%</span>
      </div>
      
      <div className="completion-bar-container">
        <div 
          className="completion-bar" 
          style={{ width: `${completionPercentage}%` }}
        ></div>
      </div>
      
      <p className="completion-suggestion">{getSuggestion()}</p>
      
      <button 
        className="completion-action-button"
        onClick={onEditProfile}
      >
        {completionPercentage < 100 ? 'Complete Profile' : 'Edit Profile'}
      </button>
    </div>
  );
};

export default ProfileCompletionMeter;
