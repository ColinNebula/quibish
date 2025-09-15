/**
 * User Profile Service
 * 
 * Handles user profile storage and retrieval
 */

const LOCAL_STORAGE_KEY = 'quibish_user_profile';

/**
 * Save user profile to local storage
 * @param {Object} profile - User profile object
 */
export const saveUserProfile = (profile) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (error) {
    console.error('Failed to save user profile:', error);
    return false;
  }
};

/**
 * Load user profile from local storage
 * @returns {Object|null} User profile or null if not found
 */
export const loadUserProfile = () => {
  try {
    const storedProfile = localStorage.getItem(LOCAL_STORAGE_KEY);
    return storedProfile ? JSON.parse(storedProfile) : null;
  } catch (error) {
    console.error('Failed to load user profile:', error);
    return null;
  }
};

/**
 * Update specific fields in the user profile
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated user profile or null on failure
 */
export const updateUserProfile = (updates) => {
  try {
    const currentProfile = loadUserProfile() || {};
    const updatedProfile = { ...currentProfile, ...updates };
    saveUserProfile(updatedProfile);
    return updatedProfile;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return null;
  }
};

/**
 * Delete user profile from local storage
 * @returns {boolean} Success indicator
 */
export const deleteUserProfile = () => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to delete user profile:', error);
    return false;
  }
};
