/**
 * Data Migration and Persistence Manager
 * Ensures seamless transition to persistent storage and prevents data loss
 */

import persistentStorageService from './persistentStorageService';

class DataMigrationManager {
  constructor() {
    this.migrationVersion = '1.0.0';
    this.migrationKey = 'quibish_migration_status';
  }

  // Check if migration is needed
  needsMigration() {
    try {
      const migrationStatus = localStorage.getItem(this.migrationKey);
      return !migrationStatus || migrationStatus !== this.migrationVersion;
    } catch (error) {
      console.warn('⚠️ Could not check migration status:', error);
      return true; // Assume migration needed if we can't check
    }
  }

  // Perform complete data migration
  async performMigration() {
    console.log('🔄 Starting data migration to persistent storage...');
    
    try {
      // Check what data needs to be migrated
      const migrationResults = {
        userMigrated: false,
        messagesMigrated: false,
        tokenMigrated: false,
        settingsMigrated: false,
        conversationsMigrated: false
      };

      // 1. Migrate user data
      migrationResults.userMigrated = this.migrateUserData();
      
      // 2. Migrate messages
      migrationResults.messagesMigrated = this.migrateMessages();
      
      // 3. Migrate auth tokens
      migrationResults.tokenMigrated = this.migrateAuthTokens();
      
      // 4. Migrate settings
      migrationResults.settingsMigrated = this.migrateSettings();
      
      // 5. Migrate conversations
      migrationResults.conversationsMigrated = this.migrateConversations();

      // 6. Set migration status
      localStorage.setItem(this.migrationKey, this.migrationVersion);
      
      console.log('✅ Data migration completed:', migrationResults);
      
      // Clean up old data after successful migration
      this.cleanupOldData();
      
      return migrationResults;
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      throw error;
    }
  }

  // Migrate user data from old storage
  migrateUserData() {
    try {
      const sources = [
        localStorage.getItem('user'),
        sessionStorage.getItem('user'),
        localStorage.getItem('currentUser'),
        sessionStorage.getItem('currentUser')
      ];

      for (const source of sources) {
        if (source) {
          try {
            const userData = JSON.parse(source);
            if (userData && userData.id) {
              // Check if we already have this user in persistent storage
              const existingUser = persistentStorageService.getUserData();
              if (!existingUser || existingUser.id !== userData.id) {
                persistentStorageService.setUserData(userData);
                console.log('👤 Migrated user data:', userData.username || userData.name);
                return true;
              }
            }
          } catch (parseError) {
            console.warn('⚠️ Could not parse user data from source:', parseError);
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ User data migration failed:', error);
      return false;
    }
  }

  // Migrate messages from old storage
  migrateMessages() {
    try {
      const messageSources = [
        localStorage.getItem('quibish_messages'),
        localStorage.getItem('messages'),
        sessionStorage.getItem('quibish_messages'),
        sessionStorage.getItem('messages')
      ];

      for (const source of messageSources) {
        if (source) {
          try {
            const messages = JSON.parse(source);
            if (Array.isArray(messages) && messages.length > 0) {
              // Check if we already have messages in persistent storage
              const existingMessages = persistentStorageService.getMessages();
              if (existingMessages.length === 0) {
                persistentStorageService.setMessages(messages);
                console.log('💬 Migrated messages:', messages.length);
                return true;
              }
            }
          } catch (parseError) {
            console.warn('⚠️ Could not parse messages from source:', parseError);
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Messages migration failed:', error);
      return false;
    }
  }

  // Migrate auth tokens
  migrateAuthTokens() {
    try {
      const tokenSources = [
        localStorage.getItem('authToken'),
        localStorage.getItem('token'),
        sessionStorage.getItem('authToken'),
        sessionStorage.getItem('token')
      ];

      for (const source of tokenSources) {
        if (source) {
          // Check if we already have a token in persistent storage
          const existingToken = persistentStorageService.getAuthToken();
          if (!existingToken) {
            persistentStorageService.setAuthToken(source);
            console.log('🔑 Migrated auth token');
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Auth token migration failed:', error);
      return false;
    }
  }

  // Migrate settings and preferences
  migrateSettings() {
    try {
      const settingsSources = [
        localStorage.getItem('settings'),
        localStorage.getItem('userSettings'),
        localStorage.getItem('preferences'),
        sessionStorage.getItem('settings')
      ];

      for (const source of settingsSources) {
        if (source) {
          try {
            const settings = JSON.parse(source);
            if (settings && typeof settings === 'object') {
              // Check if we already have settings in persistent storage
              const existingSettings = persistentStorageService.getSettings();
              if (Object.keys(existingSettings).length === 0) {
                persistentStorageService.setSettings(settings);
                console.log('⚙️ Migrated settings:', Object.keys(settings));
                return true;
              }
            }
          } catch (parseError) {
            console.warn('⚠️ Could not parse settings from source:', parseError);
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Settings migration failed:', error);
      return false;
    }
  }

  // Migrate conversations
  migrateConversations() {
    try {
      const conversationSources = [
        localStorage.getItem('conversations'),
        localStorage.getItem('chats'),
        sessionStorage.getItem('conversations')
      ];

      for (const source of conversationSources) {
        if (source) {
          try {
            const conversations = JSON.parse(source);
            if (Array.isArray(conversations) && conversations.length > 0) {
              // Check if we already have conversations in persistent storage
              const existingConversations = persistentStorageService.getConversations();
              if (existingConversations.length === 0) {
                persistentStorageService.setConversations(conversations);
                console.log('💬 Migrated conversations:', conversations.length);
                return true;
              }
            }
          } catch (parseError) {
            console.warn('⚠️ Could not parse conversations from source:', parseError);
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Conversations migration failed:', error);
      return false;
    }
  }

  // Clean up old data after successful migration
  cleanupOldData() {
    try {
      const oldKeys = [
        'user', 'currentUser', 'authToken', 'token',
        'quibish_messages', 'messages', 'settings',
        'userSettings', 'preferences', 'conversations', 'chats'
      ];

      let cleanedCount = 0;
      
      oldKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
        if (sessionStorage.getItem(key)) {
          sessionStorage.removeItem(key);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old storage entries`);
      }
    } catch (error) {
      console.warn('⚠️ Error during cleanup:', error);
    }
  }

  // Create backup of current data
  createBackup() {
    try {
      const backup = persistentStorageService.exportAllData();
      const backupKey = `quibish_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      
      console.log('💾 Created data backup:', backupKey);
      
      // Keep only the last 3 backups
      this.cleanupOldBackups();
      
      return backupKey;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      return null;
    }
  }

  // Clean up old backups (keep only last 3)
  cleanupOldBackups() {
    try {
      const backupKeys = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('quibish_backup_')) {
          backupKeys.push(key);
        }
      }
      
      // Sort by timestamp (newest first)
      backupKeys.sort((a, b) => {
        const timeA = parseInt(a.split('_')[2]);
        const timeB = parseInt(b.split('_')[2]);
        return timeB - timeA;
      });
      
      // Remove old backups (keep only 3 most recent)
      if (backupKeys.length > 3) {
        backupKeys.slice(3).forEach(key => {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed old backup: ${key}`);
        });
      }
    } catch (error) {
      console.warn('⚠️ Error during backup cleanup:', error);
    }
  }

  // Restore from backup
  restoreFromBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error('Backup not found');
      }
      
      const backup = JSON.parse(backupData);
      const restored = persistentStorageService.importAllData(backup);
      
      if (restored) {
        console.log('✅ Data restored from backup:', backupKey);
        return true;
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      return false;
    }
  }

  // Get available backups
  getAvailableBackups() {
    try {
      const backups = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('quibish_backup_')) {
          const timestamp = parseInt(key.split('_')[2]);
          backups.push({
            key,
            timestamp,
            date: new Date(timestamp).toLocaleString()
          });
        }
      }
      
      // Sort by timestamp (newest first)
      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('❌ Failed to get backups:', error);
      return [];
    }
  }

  // Initialize persistence for the app
  async initializePersistence() {
    try {
      console.log('🚀 Initializing data persistence...');
      
      // Create backup before migration
      this.createBackup();
      
      // Perform migration if needed
      if (this.needsMigration()) {
        await this.performMigration();
      }
      
      // Verify storage health
      const healthCheck = persistentStorageService.healthCheck();
      if (!healthCheck.healthy) {
        console.warn('⚠️ Storage health check failed:', healthCheck);
      }
      
      console.log('✅ Data persistence initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize persistence:', error);
      return false;
    }
  }
}

// Create singleton instance
const dataMigrationManager = new DataMigrationManager();

export default dataMigrationManager;