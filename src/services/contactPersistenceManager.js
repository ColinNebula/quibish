// Contact Persistence Manager - Enhanced Data Protection
// This utility ensures contacts are never lost through multiple backup layers

class ContactPersistenceManager {
  constructor() {
    this.isInitialized = false;
    this.backupTypes = ['localStorage', 'indexedDB', 'periodicBackup', 'emergencyBackup'];
  }

  // Initialize the persistence manager
  async initialize(contactService) {
    this.contactService = contactService;
    
    try {
      // Setup persistence mechanisms
      await this.setupPersistenceLayers();
      
      // Perform data integrity check
      await this.performIntegrityCheck();
      
      // Setup monitoring
      this.setupMonitoring();
      
      this.isInitialized = true;
      console.log('🛡️ Contact Persistence Manager initialized successfully');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to initialize Contact Persistence Manager:', error);
      return { success: false, error: error.message };
    }
  }

  // Setup all persistence layers
  async setupPersistenceLayers() {
    // Initialize IndexedDB
    await this.contactService.setupIndexedDB();
    
    // Setup automatic backup systems
    this.setupAutomaticBackups();
    
    // Setup lifecycle handlers for critical save moments
    this.setupCriticalSaveHandlers();
  }

  // Setup automatic backup systems
  setupAutomaticBackups() {
    // Backup every 30 seconds if there are changes
    this.rapidBackupInterval = setInterval(() => {
      if (this.contactService.isModified) {
        this.performRapidBackup();
      }
    }, 30000);

    // Full backup every 5 minutes
    this.fullBackupInterval = setInterval(() => {
      this.performFullBackup();
    }, 300000);

    // Cleanup old backups every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldBackups();
    }, 3600000);

    console.log('⏰ Automatic backup systems activated');
  }

  // Setup critical save handlers for moments when data could be lost
  setupCriticalSaveHandlers() {
    // Before page unload (most critical)
    window.addEventListener('beforeunload', (event) => {
      this.criticalSave('beforeunload');
      // Note: We can't use async operations here due to browser limitations
    });

    // When page visibility changes (tab switching, minimizing)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.criticalSave('visibilitychange');
      }
    });

    // When window loses focus
    window.addEventListener('blur', () => {
      this.criticalSave('blur');
    });

    // When browser tab becomes inactive
    document.addEventListener('freeze', () => {
      this.criticalSave('freeze');
    });

    // Page Cache events (back/forward navigation)
    window.addEventListener('pagehide', () => {
      this.criticalSave('pagehide');
    });

    // Network connection changes
    window.addEventListener('online', () => {
      this.handleConnectionRestored();
    });

    window.addEventListener('offline', () => {
      this.criticalSave('offline');
    });

    console.log('🚨 Critical save handlers activated');
  }

  // Perform critical save (synchronous for immediate persistence)
  criticalSave(trigger) {
    try {
      const timestamp = new Date().toISOString();
      const contacts = this.contactService.contacts;
      const groups = this.contactService.contactGroups;

      // Multiple synchronous saves with different keys for redundancy
      localStorage.setItem('quibish_contacts', JSON.stringify(contacts));
      localStorage.setItem('quibish_contacts_backup', JSON.stringify(contacts));
      localStorage.setItem(`quibish_critical_${trigger}_${Date.now()}`, JSON.stringify({
        contacts,
        groups,
        timestamp,
        trigger
      }));

      localStorage.setItem('quibish_contact_groups', JSON.stringify(groups));
      localStorage.setItem('quibish_contact_groups_backup', JSON.stringify(groups));

      // Update last save timestamp
      localStorage.setItem('quibish_last_critical_save', timestamp);
      localStorage.setItem('quibish_last_save_trigger', trigger);

      console.log(`🚨 Critical save completed (trigger: ${trigger}) - ${contacts.length} contacts protected`);
      
      return true;
    } catch (error) {
      console.error(`❌ Critical save failed (trigger: ${trigger}):`, error);
      
      // Try alternative storage keys as last resort
      try {
        localStorage.setItem(`emergency_contacts_${Date.now()}`, JSON.stringify(this.contactService.contacts));
        console.log('🆘 Emergency backup created');
      } catch (emergencyError) {
        console.error('🆘 Even emergency backup failed:', emergencyError);
      }
      
      return false;
    }
  }

  // Perform rapid backup (for frequent changes)
  async performRapidBackup() {
    try {
      const contacts = this.contactService.contacts;
      const groups = this.contactService.contactGroups;
      
      // Save to IndexedDB
      await this.contactService.saveToIndexedDB('contacts', contacts);
      await this.contactService.saveToIndexedDB('groups', groups);
      
      // Create timestamped localStorage backup
      const timestamp = new Date().toISOString();
      localStorage.setItem(`quibish_rapid_${timestamp.split('T')[0]}`, JSON.stringify({
        contacts,
        groups,
        timestamp,
        type: 'rapid'
      }));
      
      console.log('⚡ Rapid backup completed');
    } catch (error) {
      console.error('❌ Rapid backup failed:', error);
    }
  }

  // Perform full backup (comprehensive)
  async performFullBackup() {
    try {
      const contacts = this.contactService.contacts;
      const groups = this.contactService.contactGroups;
      const timestamp = new Date().toISOString();
      
      const fullBackupData = {
        contacts,
        groups,
        timestamp,
        type: 'full',
        version: '1.0',
        metadata: {
          contactCount: contacts.length,
          groupCount: groups.length,
          lastModified: this.contactService.lastModified || timestamp
        }
      };
      
      // Save to multiple locations
      localStorage.setItem(`quibish_full_backup_${timestamp.split('T')[0]}`, JSON.stringify(fullBackupData));
      await this.contactService.saveToIndexedDB('fullBackup', [fullBackupData]);
      
      // Try to sync with backend if available
      try {
        await this.contactService.syncWithBackend();
      } catch (syncError) {
        console.warn('⚠️ Backend sync failed during full backup:', syncError);
      }
      
      console.log('📦 Full backup completed');
    } catch (error) {
      console.error('❌ Full backup failed:', error);
    }
  }

  // Handle connection restored (try to sync)
  async handleConnectionRestored() {
    console.log('🌐 Connection restored - attempting sync...');
    try {
      await this.contactService.syncWithBackend();
      console.log('✅ Data synced with backend after connection restore');
    } catch (error) {
      console.error('❌ Sync failed after connection restore:', error);
    }
  }

  // Perform data integrity check
  async performIntegrityCheck() {
    try {
      const report = await this.contactService.performDataIntegrityCheck();
      
      if (report) {
        console.log('📊 Data Integrity Check:', report);
        
        // If there's a significant discrepancy, try to recover
        if (this.detectDataDiscrepancy(report)) {
          await this.attemptDataRecovery();
        }
      }
      
      return report;
    } catch (error) {
      console.error('❌ Integrity check failed:', error);
      return null;
    }
  }

  // Detect if there's a data discrepancy
  detectDataDiscrepancy(report) {
    const counts = [report.localStorage, report.backup, report.indexedDB, report.current];
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    
    // If difference is more than 10% or more than 5 contacts, investigate
    return (max - min) > Math.max(max * 0.1, 5);
  }

  // Attempt to recover from data discrepancy
  async attemptDataRecovery() {
    console.log('🔧 Attempting data recovery...');
    
    try {
      // Get data from all sources
      const sources = await this.gatherDataFromAllSources();
      
      // Find the most complete dataset
      const bestSource = this.findBestDataSource(sources);
      
      if (bestSource) {
        // Restore from best source
        this.contactService.contacts = bestSource.contacts;
        this.contactService.contactGroups = bestSource.groups || [];
        
        // Save to all locations
        this.contactService.saveContactsToStorage();
        this.contactService.saveGroupsToStorage();
        
        console.log(`✅ Data recovered from ${bestSource.source} (${bestSource.contacts.length} contacts)`);
        
        // Dispatch recovery event for UI notification
        window.dispatchEvent(new CustomEvent('contactDataRecovered', {
          detail: {
            source: bestSource.source,
            contactCount: bestSource.contacts.length,
            groupCount: bestSource.groups?.length || 0
          }
        }));
        
        return true;
      }
    } catch (error) {
      console.error('❌ Data recovery failed:', error);
    }
    
    return false;
  }

  // Gather data from all available sources
  async gatherDataFromAllSources() {
    const sources = {};
    
    // localStorage primary
    try {
      const stored = localStorage.getItem('quibish_contacts');
      if (stored) {
        sources.localStorage = {
          contacts: JSON.parse(stored),
          source: 'localStorage'
        };
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
    }
    
    // localStorage backup
    try {
      const backup = localStorage.getItem('quibish_contacts_backup');
      if (backup) {
        sources.backup = {
          contacts: JSON.parse(backup),
          source: 'backup'
        };
      }
    } catch (error) {
      console.warn('Failed to load from backup:', error);
    }
    
    // IndexedDB
    try {
      const indexedContacts = await this.contactService.loadFromIndexedDB('contacts');
      if (indexedContacts.length > 0) {
        sources.indexedDB = {
          contacts: indexedContacts,
          source: 'indexedDB'
        };
      }
    } catch (error) {
      console.warn('Failed to load from IndexedDB:', error);
    }
    
    // Emergency backups
    try {
      const keys = Object.keys(localStorage);
      const emergencyKeys = keys.filter(key => key.startsWith('quibish_critical_') || key.startsWith('emergency_contacts_'));
      
      emergencyKeys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.contacts || Array.isArray(data)) {
            sources[key] = {
              contacts: data.contacts || data,
              source: `emergency-${key}`,
              timestamp: data.timestamp
            };
          }
        } catch (parseError) {
          console.warn(`Failed to parse emergency backup ${key}:`, parseError);
        }
      });
    } catch (error) {
      console.warn('Failed to load emergency backups:', error);
    }
    
    return sources;
  }

  // Find the best data source (most complete and recent)
  findBestDataSource(sources) {
    const sourceArray = Object.values(sources);
    
    if (sourceArray.length === 0) {
      return null;
    }
    
    // Score each source based on contact count and recency
    const scored = sourceArray.map(source => ({
      ...source,
      score: this.calculateSourceScore(source)
    }));
    
    // Return the highest scored source
    return scored.sort((a, b) => b.score - a.score)[0];
  }

  // Calculate score for a data source
  calculateSourceScore(source) {
    let score = 0;
    
    // Contact count (primary factor)
    score += source.contacts.length * 10;
    
    // Recency bonus (if timestamp available)
    if (source.timestamp) {
      const age = Date.now() - new Date(source.timestamp).getTime();
      const ageHours = age / (1000 * 60 * 60);
      score += Math.max(0, 100 - ageHours); // Bonus for recent data
    }
    
    // Source reliability bonus
    const reliabilityBonus = {
      'localStorage': 100,
      'backup': 90,
      'indexedDB': 85
    };
    score += reliabilityBonus[source.source] || 50;
    
    return score;
  }

  // Cleanup old backups to prevent storage bloat
  cleanupOldBackups() {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      keys.forEach(key => {
        // Clean up old dated backups
        if (key.startsWith('quibish_backup_') || 
            key.startsWith('quibish_critical_') || 
            key.startsWith('quibish_rapid_') ||
            key.startsWith('quibish_full_backup_')) {
          
          try {
            // Extract date from key or check stored timestamp
            const stored = localStorage.getItem(key);
            const data = JSON.parse(stored);
            
            if (data.timestamp) {
              const backupTime = new Date(data.timestamp).getTime();
              if (backupTime < sevenDaysAgo) {
                localStorage.removeItem(key);
                console.log(`🧹 Cleaned up old backup: ${key}`);
              }
            }
          } catch (cleanupError) {
            // If we can't parse it, it's probably corrupt - remove it
            localStorage.removeItem(key);
            console.log(`🧹 Removed corrupt backup: ${key}`);
          }
        }
      });
      
      console.log('🧹 Backup cleanup completed');
    } catch (error) {
      console.error('❌ Backup cleanup failed:', error);
    }
  }

  // Get persistence status
  getPersistenceStatus() {
    const status = {
      initialized: this.isInitialized,
      backupTypes: this.backupTypes,
      lastCriticalSave: localStorage.getItem('quibish_last_critical_save'),
      lastSaveTrigger: localStorage.getItem('quibish_last_save_trigger'),
      storageAvailable: {
        localStorage: typeof Storage !== 'undefined',
        indexedDB: 'indexedDB' in window,
        sessionStorage: typeof sessionStorage !== 'undefined'
      }
    };
    
    return status;
  }

  // Manual backup trigger (for UI button)
  async manualBackup() {
    console.log('🔘 Manual backup triggered...');
    
    try {
      await this.performFullBackup();
      this.criticalSave('manual');
      
      return {
        success: true,
        message: `Backup completed - ${this.contactService.contacts.length} contacts saved`
      };
    } catch (error) {
      console.error('❌ Manual backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Destroy (cleanup) - call when component unmounts
  destroy() {
    if (this.rapidBackupInterval) clearInterval(this.rapidBackupInterval);
    if (this.fullBackupInterval) clearInterval(this.fullBackupInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    
    // Perform final critical save
    this.criticalSave('destroy');
    
    console.log('🛡️ Contact Persistence Manager destroyed - final backup completed');
  }
}

// Export singleton instance
export const contactPersistenceManager = new ContactPersistenceManager();
export default contactPersistenceManager;