/**
 * UserDataService - Enhanced version with backend API integration
 * Manages user data storage both locally (IndexedDB/localStorage) and remotely (backend API)
 * Handles persistent storage for:
 * - User profiles
 * - Media (photos, videos, GIFs)  
 * - User preferences and settings
 * - Email and contact information
 */

// IndexedDB database name and version
const DB_NAME = 'quibishUserData';
const DB_VERSION = 2; // Incremented for new features

// Object store names
const STORES = {
  PROFILE: 'userProfile',
  PHOTOS: 'userPhotos',
  VIDEOS: 'userVideos',
  GIFS: 'userGifs',
  AUDIO: 'userAudio',
  FILES: 'userFiles',
  FAVORITES: 'userFavorites',
  MEDIA_CACHE: 'mediaCache'
};

// API configuration
const API_CONFIG = {
  baseURL: 'http://localhost:5001/api',
  timeout: 30000,
  retries: 3
};

// Initialize IndexedDB database
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = event => {
      console.error('Error opening IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = event => {
      const db = event.target.result;
      resolve(db);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.PROFILE)) {
        db.createObjectStore(STORES.PROFILE, { keyPath: 'username' });
      }
      
      if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
        db.createObjectStore(STORES.PHOTOS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.VIDEOS)) {
        db.createObjectStore(STORES.VIDEOS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.GIFS)) {
        db.createObjectStore(STORES.GIFS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.AUDIO)) {
        db.createObjectStore(STORES.AUDIO, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.FILES)) {
        db.createObjectStore(STORES.FILES, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
        db.createObjectStore(STORES.FAVORITES, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.MEDIA_CACHE)) {
        db.createObjectStore(STORES.MEDIA_CACHE, { keyPath: 'id' });
      }
    };
  });
};

// API utility functions
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  console.log('🔑 Auth token for API call:', token ? 'Present' : 'Missing');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

const getFileUploadHeaders = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`
    // Note: Don't set Content-Type for file uploads, let browser set it with boundary
  };
};

// Backend API functions
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const defaultOptions = {
    timeout: API_CONFIG.timeout,
    ...options
  };

  console.log('🌐 Making API call to:', url, 'with options:', defaultOptions);

  try {
    const response = await fetch(url, defaultOptions);
    
    console.log('📡 API response status:', response.status, 'for', endpoint);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API call failed with error data:', errorData);
      throw new Error(errorData.error || `API call failed: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log('✅ API call successful for', endpoint, ':', responseData);
    return responseData;
  } catch (error) {
    console.error(`❌ API call to ${endpoint} failed:`, error);
    throw error;
  }
};

/**
 * Backend API Integration Functions
 */

// Get user profile from backend
const getUserProfileFromAPI = async () => {
  return await apiCall('/users/profile', {
    method: 'GET',
    headers: getAuthHeaders()
  });
};

// Update user profile via backend
const updateUserProfileAPI = async (profileData) => {
  console.log('🌐 Making API call to update profile with data:', profileData);
  
  return await apiCall('/users/profile', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData)
  });
};

// Update user email via backend
const updateUserEmailAPI = async (email) => {
  return await apiCall('/users/email', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email })
  });
};

// Upload avatar via backend
const uploadAvatarAPI = async (file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  return await apiCall('/users/avatar', {
    method: 'POST',
    headers: getFileUploadHeaders(),
    body: formData
  });
};

// Upload user media via backend
const uploadMediaAPI = async (files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('media', file));
  
  return await apiCall('/upload/media', {
    method: 'POST',
    headers: getFileUploadHeaders(),
    body: formData
  });
};

// Get user media from backend
const getUserMediaAPI = async () => {
  return await apiCall('/upload/media', {
    method: 'GET',
    headers: getAuthHeaders()
  });
};

// Delete media via backend
const deleteMediaAPI = async (mediaId) => {
  return await apiCall(`/upload/media/${mediaId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
};

/**
 * Save user profile data
 * @param {Object} profile - User profile object
 * @returns {Promise<Object>} - Saved profile
 */
const saveUserProfile = async (profile) => {
  try {
    // Save basic profile info to localStorage for quick access
    localStorage.setItem('userProfile', JSON.stringify({
      username: profile.username,
      displayName: profile.displayName,
      avatar: profile.avatarUrl,
      lastUpdated: new Date().toISOString()
    }));
    
    // Save full profile to IndexedDB
    const db = await initDB();
    const transaction = db.transaction([STORES.PROFILE], 'readwrite');
    const store = transaction.objectStore(STORES.PROFILE);
    
    // Add timestamp before saving
    const profileWithTimestamp = {
      ...profile,
      lastUpdated: new Date().toISOString()
    };
    
    const request = store.put(profileWithTimestamp);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(profileWithTimestamp);
      request.onerror = event => reject(event.target.error);
    });
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

/**
 * Get user profile data
 * @param {string} username - Username to retrieve profile for
 * @returns {Promise<Object|null>} - User profile or null if not found
 */
const getUserProfile = async (username) => {
  try {
    // Try to get from localStorage first for performance
    const cachedProfile = localStorage.getItem('userProfile');
    
    if (cachedProfile) {
      const parsedProfile = JSON.parse(cachedProfile);
      // If requesting the same user that's cached, return it
      if (parsedProfile.username === username) {
        return parsedProfile;
      }
    }
    
    // Otherwise, get from IndexedDB
    const db = await initDB();
    const transaction = db.transaction([STORES.PROFILE], 'readonly');
    const store = transaction.objectStore(STORES.PROFILE);
    const request = store.get(username);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = event => {
        const profile = event.target.result;
        if (profile) {
          // Update localStorage cache with this profile
          localStorage.setItem('userProfile', JSON.stringify({
            username: profile.username,
            displayName: profile.displayName,
            avatar: profile.avatarUrl,
            lastUpdated: profile.lastUpdated
          }));
        }
        resolve(profile || null);
      };
      request.onerror = event => reject(event.target.error);
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Save a media item (photo, video, audio) to storage
 * @param {string} type - Type of media ('photo', 'video', 'audio', 'file')
 * @param {Object} mediaItem - Media item object with blob/data
 * @returns {Promise<Object>} - Saved media item with ID
 */
const saveMediaItem = async (type, mediaItem) => {
  try {
    // Determine which store to use
    let storeName;
    switch (type.toLowerCase()) {
      case 'photo':
        storeName = STORES.PHOTOS;
        break;
      case 'video':
        storeName = STORES.VIDEOS;
        break;
      case 'audio':
      case 'voice':
        storeName = STORES.AUDIO;
        break;
      case 'file':
      default:
        storeName = STORES.FILES;
        break;
    }
    
    // Generate ID if not present
    const itemToSave = {
      ...mediaItem,
      id: mediaItem.id || `${type}_${Date.now()}`,
      timestamp: mediaItem.timestamp || new Date().toISOString(),
      type: type.toLowerCase()
    };
    
    // Save to IndexedDB
    const db = await initDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(itemToSave);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // Update the mediaItemsCount in localStorage
        updateMediaItemsCount(type);
        resolve(itemToSave);
      };
      request.onerror = event => reject(event.target.error);
    });
  } catch (error) {
    console.error(`Error saving ${type}:`, error);
    throw error;
  }
};

/**
 * Get all media items of a specific type
 * @param {string} type - Type of media ('photo', 'video', 'audio', 'file')
 * @param {Object} options - Query options (limit, offset, sortBy)
 * @returns {Promise<Array>} - Array of media items
 */
const getMediaItems = async (type, options = {}) => {
  try {
    // Determine which store to use
    let storeName;
    switch (type.toLowerCase()) {
      case 'photo':
        storeName = STORES.PHOTOS;
        break;
      case 'video':
        storeName = STORES.VIDEOS;
        break;
      case 'audio':
      case 'voice':
        storeName = STORES.AUDIO;
        break;
      case 'file':
      default:
        storeName = STORES.FILES;
        break;
    }
    
    const db = await initDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = event => {
        let items = event.target.result || [];
        
        // Apply sorting
        if (options.sortBy) {
          items = items.sort((a, b) => {
            if (options.sortDirection === 'asc') {
              return a[options.sortBy] > b[options.sortBy] ? 1 : -1;
            } else {
              return a[options.sortBy] < b[options.sortBy] ? 1 : -1;
            }
          });
        } else {
          // Default sort by timestamp, newest first
          items = items.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          );
        }
        
        // Apply pagination
        if (options.offset || options.limit) {
          const offset = options.offset || 0;
          const limit = options.limit || items.length;
          items = items.slice(offset, offset + limit);
        }
        
        resolve(items);
      };
      request.onerror = event => reject(event.target.error);
    });
  } catch (error) {
    console.error(`Error getting ${type} items:`, error);
    throw error;
  }
};

/**
 * Delete a media item
 * @param {string} type - Type of media ('photo', 'video', 'audio', 'file')
 * @param {string} id - ID of the item to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteMediaItem = async (type, id) => {
  try {
    // Determine which store to use
    let storeName;
    switch (type.toLowerCase()) {
      case 'photo':
        storeName = STORES.PHOTOS;
        break;
      case 'video':
        storeName = STORES.VIDEOS;
        break;
      case 'audio':
      case 'voice':
        storeName = STORES.AUDIO;
        break;
      case 'file':
      default:
        storeName = STORES.FILES;
        break;
    }
    
    const db = await initDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        updateMediaItemsCount(type);
        resolve(true);
      };
      request.onerror = event => reject(event.target.error);
    });
  } catch (error) {
    console.error(`Error deleting ${type} item:`, error);
    throw error;
  }
};

/**
 * Toggle favorite status for a media item
 * @param {Object} item - Media item to favorite/unfavorite
 * @returns {Promise<Object>} - Updated item with favorite status
 */
const toggleFavorite = async (item) => {
  try {
    // First, check if item is already in favorites
    const db = await initDB();
    const transaction = db.transaction([STORES.FAVORITES], 'readwrite');
    const store = transaction.objectStore(STORES.FAVORITES);
    const request = store.get(item.id);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = async (event) => {
        const existingFavorite = event.target.result;
        
        if (existingFavorite) {
          // Remove from favorites
          const deleteRequest = store.delete(item.id);
          deleteRequest.onsuccess = () => {
            resolve({ ...item, isFavorite: false });
          };
          deleteRequest.onerror = event => reject(event.target.error);
        } else {
          // Add to favorites
          const favoriteItem = { 
            ...item, 
            isFavorite: true, 
            favoritedAt: new Date().toISOString()
          };
          const putRequest = store.put(favoriteItem);
          putRequest.onsuccess = () => {
            resolve(favoriteItem);
          };
          putRequest.onerror = event => reject(event.target.error);
        }
      };
      request.onerror = event => reject(event.target.error);
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
};

/**
 * Get user favorite items
 * @param {Object} options - Query options (limit, offset, sortBy)
 * @returns {Promise<Array>} - Array of favorite items
 */
const getFavorites = async (options = {}) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORES.FAVORITES], 'readonly');
    const store = transaction.objectStore(STORES.FAVORITES);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = event => {
        let items = event.target.result || [];
        
        // Apply sorting
        if (options.sortBy) {
          items = items.sort((a, b) => {
            if (options.sortDirection === 'asc') {
              return a[options.sortBy] > b[options.sortBy] ? 1 : -1;
            } else {
              return a[options.sortBy] < b[options.sortBy] ? 1 : -1;
            }
          });
        } else {
          // Default sort by favoritedAt, newest first
          items = items.sort((a, b) => 
            new Date(b.favoritedAt) - new Date(a.favoritedAt)
          );
        }
        
        // Apply pagination
        if (options.offset || options.limit) {
          const offset = options.offset || 0;
          const limit = options.limit || items.length;
          items = items.slice(offset, offset + limit);
        }
        
        resolve(items);
      };
      request.onerror = event => reject(event.target.error);
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    throw error;
  }
};

/**
 * Check if an item is favorited
 * @param {string} itemId - Item ID to check
 * @returns {Promise<boolean>} - Whether the item is favorited
 */
const isFavorited = async (itemId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORES.FAVORITES], 'readonly');
    const store = transaction.objectStore(STORES.FAVORITES);
    const request = store.get(itemId);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = event => {
        resolve(!!event.target.result);
      };
      request.onerror = event => reject(event.target.error);
    });
  } catch (error) {
    console.error('Error checking if item is favorited:', error);
    throw error;
  }
};

/**
 * Helper function to update media items count in localStorage
 * @param {string} type - Type of media
 */
const updateMediaItemsCount = async (type) => {
  try {
    let storeName;
    switch (type.toLowerCase()) {
      case 'photo':
        storeName = STORES.PHOTOS;
        break;
      case 'video':
        storeName = STORES.VIDEOS;
        break;
      case 'audio':
      case 'voice':
        storeName = STORES.AUDIO;
        break;
      case 'file':
      default:
        storeName = STORES.FILES;
        break;
    }
    
    const db = await initDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const countRequest = store.count();
    
    countRequest.onsuccess = () => {
      const count = countRequest.result;
      const countsJson = localStorage.getItem('mediaItemCounts') || '{}';
      const counts = JSON.parse(countsJson);
      counts[type.toLowerCase()] = count;
      localStorage.setItem('mediaItemCounts', JSON.stringify(counts));
    };
  } catch (error) {
    console.error('Error updating media item count:', error);
  }
};

/**
 * Get the storage usage statistics
 * @returns {Promise<Object>} - Storage usage info
 */
const getStorageUsage = async () => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota, // Maximum storage space available (in bytes)
        usage: estimate.usage, // Current storage usage (in bytes)
        percentUsed: (estimate.usage / estimate.quota) * 100,
        usageDetails: estimate.usageDetails // Detailed breakdown by storage type (if available)
      };
    } else {
      // Fallback for browsers that don't support the Storage API
      await initDB(); // Initialize DB but we don't need the reference here
      const usage = {
        photos: 0,
        videos: 0,
        audio: 0,
        files: 0
      };
      
      // Get counts from localStorage
      const countsJson = localStorage.getItem('mediaItemCounts') || '{}';
      const counts = JSON.parse(countsJson);
      
      return {
        counts: counts,
        usage: usage,
        estimatedSize: 'Not available', // We can't accurately estimate size without the Storage API
        lastUpdated: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('Error getting storage usage:', error);
    throw error;
  }
};

/**
 * Clear all user data
 * @returns {Promise<boolean>} - Success status
 */
const clearAllUserData = async () => {
  try {
    // Clear IndexedDB stores
    const db = await initDB();
    const storeNames = Object.values(STORES);
    const transaction = db.transaction(storeNames, 'readwrite');
    
    // Clear each store
    const clearPromises = storeNames.map(storeName => {
      return new Promise((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = event => reject(event.target.error);
      });
    });
    
    // Wait for all stores to be cleared
    await Promise.all(clearPromises);
    
    // Clear related localStorage items
    localStorage.removeItem('userProfile');
    localStorage.removeItem('mediaItemCounts');
    
    return true;
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
};

/**
 * Fetch a user profile by user ID
 * @param {string} userId - The ID of the user to fetch
 * @returns {Promise<Object>} - User profile data
 */
const fetchUserProfile = async (userId) => {
  try {
    // Try to get real user data from API first (for the current user)
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    
    // If this is the current user and we have a token, try to get real data from API
    if (token && (userId === currentUser.id || userId === currentUser.username)) {
      try {
        console.log('🔍 Fetching real user profile from API for current user...');
        const realProfile = await getUserProfileFromAPI();
        if (realProfile && realProfile.user) {
          const userData = {
            ...realProfile.user,
            userId: realProfile.user.id,
            username: realProfile.user.username,
            displayName: realProfile.user.displayName || realProfile.user.name,
            bio: realProfile.user.bio || '',
            avatarUrl: realProfile.user.avatar,
            uploadCount: 0, // Could be enhanced to get real count
            connectionCount: 0, // Could be enhanced to get real count
            activityScore: 0, // Could be enhanced to get real score
            joinDate: realProfile.user.createdAt,
            isOnline: true, // Current user is always online
            status: realProfile.user.status || 'online'
          };
          console.log('✅ Real user profile fetched successfully:', userData);
          return userData;
        }
      } catch (apiError) {
        console.warn('⚠️ Failed to fetch real profile from API, falling back to mock data:', apiError);
      }
    }
    
    // Fallback to mock data for other users or if API fails
    console.log('📋 Using mock data for user profile...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    
    // For the current user, set online status to true
    const isCurrentUser = userId === currentUser.id || userId === currentUser.username;
    
    return {
      userId,
      username: isCurrentUser ? (currentUser.username || `user${userId}`) : `user${userId}`,
      displayName: isCurrentUser ? (currentUser.displayName || currentUser.name || `User ${userId}`) : `User ${userId}`,
      bio: isCurrentUser ? (currentUser.bio || `This is the bio for ${currentUser.name || 'the user'}.`) : `This is the bio for user ${userId}. They are a valued member of our community.`,
      avatarUrl: isCurrentUser ? currentUser.avatar : `https://randomuser.me/api/portraits/${userId % 2 === 0 ? 'men' : 'women'}/${userId % 10}.jpg`,
      uploadCount: Math.floor(Math.random() * 50),
      connectionCount: Math.floor(Math.random() * 100),
      activityScore: Math.floor(Math.random() * 1000),
      joinDate: isCurrentUser ? currentUser.createdAt : new Date(Date.now() - (Math.random() * 10000000000)).toISOString(),
      isOnline: isCurrentUser ? true : Math.random() > 0.3, // Current user is always online, others are randomly online
      status: isCurrentUser ? 'online' : (Math.random() > 0.3 ? 'online' : 'offline')
    };
  } catch (error) {
    console.error(`Error fetching user profile for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Fetch user uploads by user ID
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} - Array of user uploads
 */
const fetchUserUploads = async (userId) => {
  try {
    // In a real application, this would call the API
    // For now, returning mock data with proper URLs
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
    
    const types = ['image', 'video', 'document', 'gif'];
    const count = 10 + Math.floor(Math.random() * 10);
    const uploads = [];
    
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const date = new Date(Date.now() - (Math.random() * 5000000000)).toISOString();
      
      let url = null;
      let thumbnailUrl = null;
      
      // Generate appropriate URLs for each type
      switch (type) {
        case 'image':
          url = `https://picsum.photos/seed/${userId}_${i}/800/600`;
          break;
        case 'video':
          // Using sample video URLs from the internet
          const videoSamples = [
            'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4'
          ];
          url = videoSamples[i % videoSamples.length];
          thumbnailUrl = `https://picsum.photos/seed/${userId}_${i}_thumb/400/300`;
          break;
        case 'gif':
          // Using placeholder GIF URLs
          url = `https://picsum.photos/seed/${userId}_${i}/400/300.gif`;
          break;
        case 'document':
          // For documents, we'll use a sample PDF
          url = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
          break;
      }
      
      uploads.push({
        id: `upload_${userId}_${i}`,
        name: `${type}_file_${i}.${type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : type === 'gif' ? 'gif' : 'pdf'}`,
        type,
        size: Math.floor(Math.random() * 10000000),
        date,
        uploadedAt: date,
        url,
        thumbnailUrl,
        mimeType: type === 'video' ? 'video/mp4' : type === 'image' ? 'image/jpeg' : type === 'gif' ? 'image/gif' : 'application/pdf',
        dimensions: type === 'image' || type === 'video' ? `${400 + Math.floor(Math.random() * 800)}x${300 + Math.floor(Math.random() * 600)}` : null,
        duration: type === 'video' ? Math.floor(Math.random() * 300) + 30 : null // 30-330 seconds
      });
    }
    
    return uploads.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error(`Error fetching uploads for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Fetch user view history by user ID
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} - Array of user view history
 */
const fetchUserViewHistory = async (userId) => {
  try {
    // In a real application, this would call the API
    // For now, returning mock data
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API delay
    
    const contentTypes = ['image', 'video', 'document', 'gif', 'article', 'profile'];
    const count = 8 + Math.floor(Math.random() * 12);
    const history = [];
    
    for (let i = 0; i < count; i++) {
      const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      const viewedAt = new Date(Date.now() - (Math.random() * 3000000000)).toISOString();
      
      history.push({
        id: `history_${userId}_${i}`,
        title: contentType === 'profile' 
          ? `User Profile: user${Math.floor(Math.random() * 100)}`
          : `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} ${Math.floor(Math.random() * 1000)}`,
        contentType,
        contentId: `content_${Math.floor(Math.random() * 10000)}`,
        viewedAt
      });
    }
    
    return history.sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));
  } catch (error) {
    console.error(`Error fetching view history for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Fetch user analytics by user ID
 * @param {string} userId - The ID of the user
 * @param {string} timeframe - The timeframe for analytics ('week', 'month', 'quarter', 'year')
 * @returns {Promise<Object>} - User analytics data
 */
const fetchUserAnalytics = async (userId, timeframe = 'month') => {
  try {
    // In a real application, this would call the API
    // For now, returning mock data based on timeframe
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay
    
    const baseMultiplier = timeframe === 'week' ? 0.3 : timeframe === 'month' ? 1 : timeframe === 'quarter' ? 3 : 12;
    
    return {
      profileViews: Math.floor((200 + Math.random() * 800) * baseMultiplier),
      monthlyViews: Math.floor((50 + Math.random() * 200) * baseMultiplier),
      topViewers: Array.from({ length: 5 }, (_, i) => ({
        id: `viewer_${i}`,
        name: `Viewer ${i + 1}`,
        avatar: `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'men' : 'women'}/${i + 5}.jpg`,
        viewCount: Math.floor((5 + Math.random() * 20) * baseMultiplier)
      })).sort((a, b) => b.viewCount - a.viewCount),
      uploadStats: {
        totalUploads: Math.floor((10 + Math.random() * 40) * baseMultiplier),
        totalViews: Math.floor((500 + Math.random() * 2000) * baseMultiplier),
        totalLikes: Math.floor((100 + Math.random() * 500) * baseMultiplier),
        mostViewedContent: {
          name: 'summer_vacation_2024.jpg',
          views: Math.floor((50 + Math.random() * 200) * baseMultiplier),
          thumbnail: `https://picsum.photos/seed/${userId}_popular/300/300`
        }
      },
      activityStats: {
        messagesCount: Math.floor((100 + Math.random() * 400) * baseMultiplier),
        reactionsGiven: Math.floor((50 + Math.random() * 200) * baseMultiplier),
        connectionsCount: Math.floor(20 + Math.random() * 80),
        joinDate: new Date(Date.now() - (Math.random() * 31536000000)).toISOString() // Random date within last year
      }
    };
  } catch (error) {
    console.error(`Error fetching analytics for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Update user profile via API or local storage
 * @param {string} userId - The ID of the user
 * @param {Object} profileData - The profile data to update
 * @returns {Promise<Object>} - Updated profile data
 */
const updateUserProfile = async (userId, profileData) => {
  console.log('🔄 Starting profile update for user:', userId, 'with data:', profileData);
  
  try {
    // Try to update via API first
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    console.log('🔑 Token check:', token ? 'Found' : 'Not found');
    
    if (token) {
      try {
        console.log('🌐 Attempting API update...');
        const result = await updateUserProfileAPI(profileData);
        console.log('✅ API update successful:', result);
        
        // Also update local storage with the result
        await saveUserProfile({ ...result, userId });
        return result;
      } catch (apiError) {
        console.warn('⚠️ API update failed, falling back to local storage:', apiError);
      }
    } else {
      console.log('📴 No token found, using local storage only');
    }
    
    // Fallback to local storage update
    const currentProfile = await getUserProfile(profileData.username || userId);
    const updatedProfile = {
      ...currentProfile,
      ...profileData,
      userId,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('💾 Saving to local storage:', updatedProfile);
    await saveUserProfile(updatedProfile);
    return updatedProfile;
  } catch (error) {
    console.error(`Error updating profile for user ${userId}:`, error);
    throw error;
  }
};

// Export the service functions
const userDataService = {
  // Profile management (local storage)
  saveUserProfile,
  getUserProfile,
  
  // Media management (local storage)
  saveMediaItem,
  getMediaItems,
  deleteMediaItem,
  
  // Favorites management
  toggleFavorite,
  getFavorites,
  isFavorited,
  
  // Storage management
  getStorageUsage,
  clearAllUserData,
  
  // User profile data fetching
  fetchUserProfile,
  fetchUserUploads,
  fetchUserViewHistory,
  fetchUserAnalytics,
  updateUserProfile,
  
  // Backend API integration
  api: {
    getUserProfile: getUserProfileFromAPI,
    updateUserProfile: updateUserProfileAPI,
    updateUserEmail: updateUserEmailAPI,
    uploadAvatar: uploadAvatarAPI,
    uploadMedia: uploadMediaAPI,
    getUserMedia: getUserMediaAPI,
    deleteMedia: deleteMediaAPI,
    
    // Two-Factor Authentication API methods
    setupTwoFactor: async () => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(`${API_CONFIG.baseURL}/auth/2fa/setup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to setup 2FA');
        return data;
      } catch (error) {
        console.error('Setup 2FA error:', error);
        throw error;
      }
    },
    
    verifyTwoFactorSetup: async (verificationToken) => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(`${API_CONFIG.baseURL}/auth/2fa/verify-setup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ token: verificationToken })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to verify 2FA setup');
        return data;
      } catch (error) {
        console.error('Verify 2FA setup error:', error);
        throw error;
      }
    },
    
    verifyTwoFactor: async (userId, verificationToken, isBackupCode = false) => {
      try {
        const response = await fetch(`${API_CONFIG.baseURL}/auth/2fa/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            userId, 
            token: verificationToken, 
            isBackupCode 
          })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to verify 2FA');
        return data;
      } catch (error) {
        console.error('Verify 2FA error:', error);
        throw error;
      }
    },
    
    completeTwoFactorLogin: async (userId) => {
      try {
        const response = await fetch(`${API_CONFIG.baseURL}/auth/complete-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to complete login');
        return data;
      } catch (error) {
        console.error('Complete 2FA login error:', error);
        throw error;
      }
    },
    
    disableTwoFactor: async (password, twoFactorToken) => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(`${API_CONFIG.baseURL}/auth/2fa/disable`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ password, token: twoFactorToken })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to disable 2FA');
        return data;
      } catch (error) {
        console.error('Disable 2FA error:', error);
        throw error;
      }
    },
    
    getTwoFactorStatus: async () => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(`${API_CONFIG.baseURL}/auth/2fa/status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get 2FA status');
        return data;
      } catch (error) {
        console.error('Get 2FA status error:', error);
        throw error;
      }
    },
    
    generateBackupCodes: async () => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(`${API_CONFIG.baseURL}/auth/2fa/backup-codes`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to generate backup codes');
        return data;
      } catch (error) {
        console.error('Generate backup codes error:', error);
        throw error;
      }
    }
  },
  
  // Utility functions
  utils: {
    formatFileSize: (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    validateFile: (file) => {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
      const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
      
      if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Only images and videos are allowed.' };
      }
      
      const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxSizeStr = file.type.startsWith('video/') ? '50MB' : '10MB';
        return { valid: false, error: `File too large. Maximum size is ${maxSizeStr}.` };
      }
      
      return { valid: true };
    },
    
    createThumbnail: (file) => {
      return new Promise((resolve) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
          const video = document.createElement('video');
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          video.onloadedmetadata = () => {
            canvas.width = 200; // Thumbnail width
            canvas.height = (video.videoHeight / video.videoWidth) * 200;
            video.currentTime = 1; // Seek to 1 second
          };

          video.onseeked = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL());
            URL.revokeObjectURL(video.src);
          };

          video.src = URL.createObjectURL(file);
        } else {
          resolve(null);
        }
      });
    }
  }
};

export default userDataService;
