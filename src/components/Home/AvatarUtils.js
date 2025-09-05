/**
 * Avatar Utility Functions
 */

/**
 * Generates initials from a name.
 * 
 * @param {string} name - The full name to generate initials from
 * @param {number} maxChars - Maximum number of characters to return
 * @returns {string} Initials based on the name
 */
export const getInitials = (name, maxChars = 2) => {
  if (!name || typeof name !== 'string') return '?';
  
  return name
    .split(' ')
    .filter(part => part.length > 0)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, maxChars);
};

/**
 * Gets a CSS class for avatar background color based on the first letter of the name.
 * 
 * @param {string} name - The name to derive color from
 * @returns {string} CSS class name for the avatar color
 */
export const getAvatarColorClass = (name) => {
  if (!name || typeof name !== 'string') return 'avatar-color-default';
  
  const firstChar = name.trim()[0].toLowerCase();
  if (!firstChar.match(/[a-z]/i)) return 'avatar-color-default';
  
  return `avatar-color-${firstChar}`;
};

/**
 * Gets a hex color based on the name's first letter.
 * 
 * @param {string} name - The name to derive color from
 * @returns {string} Hex color code
 */
export const getAvatarColor = (name) => {
  if (!name || typeof name !== 'string') return '#6b7280';
  
  const colors = [
    '#6366f1', // Indigo
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f43f5e', // Rose
    '#84cc16', // Lime
    '#06b6d4', // Cyan
    '#a855f7'  // Purple
  ];
  
  // Get a deterministic index based on the name
  const firstChar = name.trim()[0].toLowerCase();
  const charCode = firstChar.charCodeAt(0);
  const index = charCode % colors.length;
  
  return colors[index];
};

/**
 * Maps user status to the corresponding CSS class.
 * 
 * @param {string} status - User status
 * @returns {string} CSS class name for the status indicator
 */
export const getStatusClass = (status) => {
  switch (status) {
    case 'online': return 'status-online';
    case 'busy': return 'status-busy';
    case 'away': return 'status-away';
    case 'offline': return 'status-offline';
    default: return 'status-offline';
  }
};
