/**
 * Service to manage application version information and updates
 */

// Current version details
export const APP_VERSION = {
  version: '1.3.0',
  codename: 'Professional',
  releaseDate: 'August 26, 2025',
  minSupportedVersion: '1.0.0'
};

/**
 * Check if the current app version is newer than the stored version
 * 
 * @returns {boolean} True if this is a new version
 */
export const isNewVersion = () => {
  const lastVersion = localStorage.getItem('lastAppVersion');
  return lastVersion !== APP_VERSION.version;
};

/**
 * Save the current version to localStorage
 */
export const saveCurrentVersion = () => {
  localStorage.setItem('lastAppVersion', APP_VERSION.version);
};

/**
 * Get release notes for the current version
 * 
 * @returns {Array} Array of release notes
 */
export const getReleaseNotes = () => {
  // These would typically come from an API in a real app
  const releaseNotes = {
    '1.3.0': [
      {
        title: 'Professional UI Redesign',
        description: 'Complete redesign of the user interface for a more professional look and feel.',
        type: 'enhancement'
      },
      {
        title: 'Dark Mode Improvements',
        description: 'Enhanced dark mode with better contrast and consistent styling across the entire app.',
        type: 'enhancement'
      },
      {
        title: 'Notification Center',
        description: 'New notification center for displaying important system announcements and updates.',
        type: 'feature'
      },
      {
        title: 'Enhanced User Profiles',
        description: 'More comprehensive user profile options and customization.',
        type: 'feature'
      },
      {
        title: 'Performance Improvements',
        description: 'Multiple optimizations for faster load times and smoother transitions.',
        type: 'performance'
      }
    ],
    '1.2.0': [
      {
        title: 'User Activity Tracking',
        description: 'Added user activity tracking to monitor login/logout events and message activity.',
        type: 'feature'
      },
      {
        title: 'Profile Completion Meter',
        description: 'Visual indicator showing how complete your profile is.',
        type: 'feature'
      },
      {
        title: 'Bug Fixes',
        description: 'Multiple bug fixes and stability improvements.',
        type: 'bugfix'
      }
    ],
    '1.1.0': [
      {
        title: 'User Profiles',
        description: 'Added user profiles with customizable settings.',
        type: 'feature'
      },
      {
        title: 'Conversation History',
        description: 'Persistent conversation history between sessions.',
        type: 'enhancement'
      }
    ],
    '1.0.0': [
      {
        title: 'Initial Release',
        description: 'First public release of QuibiChat.',
        type: 'release'
      }
    ]
  };

  return releaseNotes[APP_VERSION.version] || [];
};

/**
 * Check if the app requires an update
 * 
 * @param {string} currentVersion The current version to check
 * @returns {boolean} True if an update is required
 */
export const isUpdateRequired = (currentVersion) => {
  // Simple version comparison, in reality you might want to use semver
  return currentVersion < APP_VERSION.minSupportedVersion;
};

const VersionService = {
  APP_VERSION,
  isNewVersion,
  saveCurrentVersion,
  getReleaseNotes,
  isUpdateRequired
};

export default VersionService;
