// Contact Service - Complete Implementation
import { secureTokenManager } from './secureTokenManager';
import { contactPersistenceManager } from './contactPersistenceManager';

class ContactService {
  constructor() {
    this.contacts = [];
    this.contactGroups = [];
    this.storageKey = 'quibish_contacts';
    this.groupStorageKey = 'quibish_contact_groups';
    this.backupKey = 'quibish_contacts_backup';
    this.groupBackupKey = 'quibish_contact_groups_backup';
    this.lastSyncKey = 'quibish_contacts_last_sync';
    
    // Auto-save interval (5 seconds)
    this.autoSaveInterval = null;
    this.isModified = false;
    this.lastModified = null;
    
    // Initialize persistence layers
    this.initializePersistence();
  }

  // Initialize contact service with enhanced persistence
  async initialize() {
    // Load existing data
    await this.loadContactsFromStorage();
    await this.loadGroupsFromStorage();
    
    // Initialize persistence manager
    await contactPersistenceManager.initialize(this);
    
    console.log(`📱 Contact Service initialized: ${this.contacts.length} contacts, ${this.contactGroups.length} groups`);
    
    return {
      success: true,
      contactCount: this.contacts.length,
      groupCount: this.contactGroups.length,
      persistenceEnabled: true
    };
  }

  // Initialize persistence mechanisms
  initializePersistence() {
    // Setup IndexedDB
    this.setupIndexedDB();
    
    // Start auto-save mechanism
    this.startAutoSave();
    
    // Set up lifecycle event handlers
    this.setupLifecycleHandlers();
    
    // Mark as modified when contacts change
    this.markAsModified = () => {
      this.isModified = true;
      this.lastModified = new Date().toISOString();
      console.log('🔄 Contacts marked as modified');
    };
  }

  // Setup IndexedDB for enhanced persistence
  async setupIndexedDB() {
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('quibishContacts', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
          this.db = request.result;
          console.log('✅ IndexedDB initialized successfully');
          resolve(this.db);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Create contacts store
          if (!db.objectStoreNames.contains('contacts')) {
            const contactsStore = db.createObjectStore('contacts', { keyPath: 'id', autoIncrement: true });
            contactsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
          
          // Create groups store
          if (!db.objectStoreNames.contains('groups')) {
            const groupsStore = db.createObjectStore('groups', { keyPath: 'id', autoIncrement: true });
            groupsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
          
          // Create metadata store
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'key' });
          }
        };
      });
    } catch (error) {
      console.error('❌ Failed to setup IndexedDB:', error);
    }
  }

  // Save to IndexedDB
  async saveToIndexedDB(type, data) {
    if (!this.db) {
      await this.setupIndexedDB();
    }
    
    try {
      const transaction = this.db.transaction([type], 'readwrite');
      const store = transaction.objectStore(type);
      
      // Clear existing data
      await new Promise((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });
      
      // Save new data
      for (const item of data) {
        await new Promise((resolve, reject) => {
          const putRequest = store.put({
            ...item,
            timestamp: new Date().toISOString()
          });
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        });
      }
      
      console.log(`📦 Saved ${data.length} items to IndexedDB (${type})`);
    } catch (error) {
      console.error(`❌ Failed to save to IndexedDB (${type}):`, error);
    }
  }

  // Load from IndexedDB
  async loadFromIndexedDB(type) {
    if (!this.db) {
      await this.setupIndexedDB();
    }
    
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([type], 'readonly');
        const store = transaction.objectStore(type);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const items = request.result.map(item => {
            const { timestamp, ...itemData } = item;
            return itemData;
          });
          console.log(`📦 Loaded ${items.length} items from IndexedDB (${type})`);
          resolve(items);
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`❌ Failed to load from IndexedDB (${type}):`, error);
      return [];
    }
  }

  // Start auto-save mechanism
  startAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.autoSaveInterval = setInterval(() => {
      if (this.isModified) {
        console.log('🔄 Auto-saving contacts...');
        this.saveContactsToStorage();
        this.saveGroupsToStorage();
      }
    }, 5000); // Auto-save every 5 seconds
    
    console.log('⏰ Auto-save mechanism started');
  }

  // Setup lifecycle event handlers
  setupLifecycleHandlers() {
    // Save before page unload
    window.addEventListener('beforeunload', () => {
      this.emergencySave();
    });
    
    // Save when page becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.emergencySave();
      }
    });
    
    // Save when window loses focus
    window.addEventListener('blur', () => {
      this.emergencySave();
    });
    
    // Periodic backup
    setInterval(() => {
      this.createPeriodicBackup();
    }, 60000); // Every minute
    
    console.log('🛡️ Lifecycle handlers setup for data protection');
  }

  // Emergency save for critical moments
  emergencySave() {
    try {
      // Synchronous save for immediate persistence
      localStorage.setItem(this.storageKey, JSON.stringify(this.contacts));
      localStorage.setItem(this.groupStorageKey, JSON.stringify(this.contactGroups));
      localStorage.setItem(`${this.storageKey}_emergency_${Date.now()}`, JSON.stringify(this.contacts));
      
      // Save timestamp
      localStorage.setItem('quibish_last_emergency_save', new Date().toISOString());
      
      console.log('🚨 Emergency save completed');
    } catch (error) {
      console.error('❌ Emergency save failed:', error);
    }
  }

  // Create periodic backup
  async createPeriodicBackup() {
    try {
      const timestamp = new Date().toISOString();
      const backupData = {
        contacts: this.contacts,
        groups: this.contactGroups,
        timestamp: timestamp
      };
      
      // Save timestamped backup
      localStorage.setItem(`quibish_backup_${timestamp.split('T')[0]}`, JSON.stringify(backupData));
      
      // Clean old backups (keep only last 7 days)
      this.cleanOldBackups();
      
      console.log('📅 Periodic backup created');
    } catch (error) {
      console.error('❌ Periodic backup failed:', error);
    }
  }

  // Clean old backups
  cleanOldBackups() {
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter(key => key.startsWith('quibish_backup_'));
      
      // Sort by date and keep only last 7
      backupKeys.sort().slice(0, -7).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('❌ Backup cleanup failed:', error);
    }
  }

  // Notify user about data recovery issues
  notifyDataRecoveryIssue() {
    const message = 'Warning: Contact data could not be fully recovered. Some contacts may be missing.';
    console.warn('⚠️', message);
    
    // You can dispatch a custom event here for UI notification
    window.dispatchEvent(new CustomEvent('contactDataRecoveryIssue', {
      detail: { message }
    }));
  }

  // Data integrity check
  async performDataIntegrityCheck() {
    try {
      // Check localStorage
      const localStorageContacts = localStorage.getItem(this.storageKey);
      const backupContacts = localStorage.getItem(this.backupKey);
      
      // Check IndexedDB
      const indexedDBContacts = await this.loadFromIndexedDB('contacts');
      
      const report = {
        localStorage: localStorageContacts ? JSON.parse(localStorageContacts).length : 0,
        backup: backupContacts ? JSON.parse(backupContacts).length : 0,
        indexedDB: indexedDBContacts.length,
        current: this.contacts.length
      };
      
      console.log('📊 Data integrity report:', report);
      return report;
    } catch (error) {
      console.error('❌ Data integrity check failed:', error);
      return null;
    }
  }

  // Get all contacts
  async getContacts(options = {}) {
    const { search, group, limit = 100, offset = 0 } = options;

    // Lazy-initialize: load from storage on first call so contacts survive page refresh
    if (!this._storageLoaded) {
      await this.loadContactsFromStorage();
      await this.loadGroupsFromStorage();
      this._storageLoaded = true;
    }
    
    try {
      // Try to fetch from API first
      const response = await fetch(`/api/contacts?limit=${limit}&offset=${offset}${search ? `&search=${encodeURIComponent(search)}` : ''}${group ? `&group=${encodeURIComponent(group)}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
        }
      });
      
      if (response.ok) {
        const apiData = await response.json();
        if (apiData.success) {
          // Only replace local contacts with API data if the API actually has contacts,
          // or if local storage is also empty. This prevents wiping locally-added contacts
          // when the server has no record of them (offline-first adds, no sync yet).
          if (apiData.contacts.length > 0 || this.contacts.length === 0) {
            this.contacts = apiData.contacts;
            this.saveContactsToStorage();
          }
          return this.filterContacts(this.contacts, { search, group });
        }
      }
    } catch (error) {
      console.warn('API unavailable, using local contacts:', error);
    }

    // Fallback to local storage
    return this.filterContacts(this.contacts, { search, group });
  }

  // Filter contacts based on criteria
  filterContacts(contacts, { search, group }) {
    let filtered = [...contacts];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.name?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.phone?.includes(search)
      );
    }

    if (group) {
      filtered = filtered.filter(contact => 
        contact.groups?.includes(group)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Add a new contact
  async addContact(contactData) {
    try {
      const contact = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...contactData
      };

      // Validate contact data
      const validation = this.validateContact(contact);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Try to add via API
      try {
        const response = await fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
          },
          body: JSON.stringify(contact)
        });

        if (response.ok) {
          const apiData = await response.json();
          if (apiData.success) {
            this.contacts.push(apiData.contact);
            this.saveContactsToStorage();
            this.markAsModified(); // Mark as modified
            
            return {
              success: true,
              contact: apiData.contact
            };
          }
        } else {
          const errorData = await response.json();
          return {
            success: false,
            errors: errorData.errors || [errorData.error || 'Unknown error']
          };
        }
      } catch (apiError) {
        console.warn('API unavailable, saving locally:', apiError);
      }

      // Fallback to local storage
      this.contacts.push(contact);
      this.saveContactsToStorage();
      this.markAsModified(); // Mark as modified

      return {
        success: true,
        contact,
        offline: true
      };
    } catch (error) {
      console.error('Failed to add contact:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update an existing contact
  async updateContact(contactId, updates) {
    try {
      const contactIndex = this.contacts.findIndex(c => c.id === contactId);
      
      if (contactIndex === -1) {
        return { success: false, error: 'Contact not found' };
      }

      const updatedContact = {
        ...this.contacts[contactIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Validate updated contact
      const validation = this.validateContact(updatedContact);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Try to update via API
      try {
        const response = await fetch(`/api/contacts/${contactId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
          },
          body: JSON.stringify(updatedContact)
        });

        if (response.ok) {
          const apiData = await response.json();
          if (apiData.success) {
            this.contacts[contactIndex] = apiData.contact;
            this.saveContactsToStorage();
            this.markAsModified(); // Mark as modified
            
            return {
              success: true,
              contact: apiData.contact
            };
          }
        }
        // Non-OK response: fall through to local update
        console.warn('API update failed, saving locally');
      } catch (apiError) {
        console.warn('API unavailable, updating locally:', apiError);
      }

      // Fallback to local update
      this.contacts[contactIndex] = updatedContact;
      this.saveContactsToStorage();
      this.markAsModified(); // Mark as modified

      return {
        success: true,
        contact: updatedContact,
        offline: true
      };
    } catch (error) {
      console.error('Failed to update contact:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete a contact
  async deleteContact(contactId) {
    try {
      const contactIndex = this.contacts.findIndex(c => c.id === contactId);
      
      if (contactIndex === -1) {
        return { success: false, error: 'Contact not found' };
      }

      // Try to delete via API
      try {
        const response = await fetch(`/api/contacts/${contactId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
          }
        });

        if (response.ok) {
          const apiData = await response.json();
          if (apiData.success) {
            this.contacts.splice(contactIndex, 1);
            this.saveContactsToStorage();
            this.markAsModified(); // Mark as modified
            
            return { success: true };
          }
        }
        // Non-OK response: fall through to local deletion
        console.warn('API delete failed, deleting locally');
      } catch (apiError) {
        console.warn('API unavailable, deleting locally:', apiError);
      }

      // Fallback to local deletion
      this.contacts.splice(contactIndex, 1);
      this.saveContactsToStorage();
      this.markAsModified(); // Mark as modified

      return {
        success: true,
        offline: true
      };
    } catch (error) {
      console.error('Failed to delete contact:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Toggle favorite status for a contact
  async toggleFavorite(contactId) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return { success: false, error: 'Contact not found' };
    return this.updateContact(contactId, { favorite: !contact.favorite });
  }

  // Toggle blocked status for a contact
  async toggleBlock(contactId) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return { success: false, error: 'Contact not found' };
    return this.updateContact(contactId, { blocked: !contact.blocked });
  }

  // Validate contact data
  validateContact(contact) {
    const errors = [];

    if (!contact.name || contact.name.trim().length < 1) {
      errors.push('Name is required');
    }

    if (contact.email && !this.isValidEmail(contact.email)) {
      errors.push('Invalid email format');
    }

    if (contact.phone && !this.isValidPhone(contact.phone)) {
      errors.push('Invalid phone format');
    }

    if (contact.name && contact.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate phone format
  isValidPhone(phone) {
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
  }

  // Create contact group
  createGroup(groupData) {
    const group = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...groupData
    };

    this.contactGroups.push(group);
    this.saveGroupsToStorage();

    return {
      success: true,
      group
    };
  }

  // Get contact groups
  getGroups() {
    return this.contactGroups;
  }

  // Add contact to group
  addContactToGroup(contactId, groupId) {
    const contact = this.contacts.find(c => c.id === contactId);
    
    if (!contact) {
      return { success: false, error: 'Contact not found' };
    }

    if (!contact.groups) {
      contact.groups = [];
    }

    if (!contact.groups.includes(groupId)) {
      contact.groups.push(groupId);
      this.saveContactsToStorage();
    }

    return { success: true };
  }

  // Remove contact from group
  removeContactFromGroup(contactId, groupId) {
    const contact = this.contacts.find(c => c.id === contactId);
    
    if (!contact || !contact.groups) {
      return { success: false, error: 'Contact or group not found' };
    }

    contact.groups = contact.groups.filter(g => g !== groupId);
    this.saveContactsToStorage();

    return { success: true };
  }

  // Import contacts from device
  async importFromDevice() {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'email', 'tel'];
        const opts = { multiple: true };
        
        const contacts = await navigator.contacts.select(props, opts);
        
        const importedContacts = [];
        
        for (const contact of contacts) {
          const contactData = {
            name: contact.name?.[0] || 'Unknown',
            email: contact.email?.[0],
            phone: contact.tel?.[0]
          };
          
          const result = await this.addContact(contactData);
          if (result.success) {
            importedContacts.push(result.contact);
          }
        }
        
        return {
          success: true,
          imported: importedContacts.length,
          contacts: importedContacts
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    } else {
      return {
        success: false,
        error: 'Contact API not supported'
      };
    }
  }

  // Export contacts
  exportContacts(format = 'json') {
    try {
      let exportData;
      let filename;
      let mimeType;

      switch (format) {
        case 'csv':
          exportData = this.contactsToCSV();
          filename = 'contacts.csv';
          mimeType = 'text/csv';
          break;
        case 'json':
        default:
          exportData = JSON.stringify(this.contacts, null, 2);
          filename = 'contacts.json';
          mimeType = 'application/json';
          break;
      }

      // Create download link
      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Failed to export contacts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Convert contacts to CSV format
  contactsToCSV() {
    const headers = ['Name', 'Email', 'Phone', 'Created At'];
    const rows = this.contacts.map(contact => [
      contact.name || '',
      contact.email || '',
      contact.phone || '',
      contact.createdAt || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  // Enhanced save contacts with multiple backup layers
  saveContactsToStorage() {
    try {
      const contactsData = JSON.stringify(this.contacts);
      
      // Primary storage
      localStorage.setItem(this.storageKey, contactsData);
      
      // Create backup
      localStorage.setItem(this.backupKey, contactsData);
      
      // Save to IndexedDB as additional backup
      this.saveToIndexedDB('contacts', this.contacts);
      
      // Update last sync timestamp
      localStorage.setItem(this.lastSyncKey, new Date().toISOString());
      
      // Reset modification flag
      this.isModified = false;
      
      console.log('✅ Contacts saved successfully to multiple storage layers');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save contacts to storage:', error);
      
      // Try emergency backup to different key
      try {
        localStorage.setItem(`${this.storageKey}_emergency`, JSON.stringify(this.contacts));
        console.log('💾 Emergency backup created');
      } catch (emergencyError) {
        console.error('❌ Emergency backup failed:', emergencyError);
      }
      
      return false;
    }
  }

  // Enhanced load contacts with multiple fallback recovery
  async loadContactsFromStorage() {
    try {
      // Try primary storage first
      let stored = localStorage.getItem(this.storageKey);
      let source = 'primary';
      
      // Fallback to backup if primary fails
      if (!stored) {
        stored = localStorage.getItem(this.backupKey);
        source = 'backup';
        console.log('📁 Loading contacts from backup storage');
      }
      
      // Fallback to IndexedDB if localStorage fails
      if (!stored) {
        try {
          const indexedDBContacts = await this.loadFromIndexedDB('contacts');
          if (indexedDBContacts && indexedDBContacts.length > 0) {
            this.contacts = indexedDBContacts;
            source = 'indexeddb';
            console.log('🗄️ Contacts recovered from IndexedDB');
            
            // Restore to localStorage
            this.saveContactsToStorage();
            return;
          }
        } catch (indexedError) {
          console.warn('⚠️ IndexedDB recovery failed:', indexedError);
        }
      }
      
      // Fallback to emergency backup
      if (!stored) {
        stored = localStorage.getItem(`${this.storageKey}_emergency`);
        source = 'emergency';
        console.log('🚨 Loading contacts from emergency backup');
      }
      
      if (stored) {
        const parsedContacts = JSON.parse(stored);
        this.contacts = Array.isArray(parsedContacts) ? parsedContacts : [];
        
        console.log(`✅ Loaded ${this.contacts.length} contacts from ${source} storage`);
        
        // If loaded from fallback, restore to primary storage
        if (source !== 'primary') {
          this.saveContactsToStorage();
          console.log('🔄 Contacts restored to primary storage');
        }
      } else {
        console.log('📝 No contacts found, starting with empty list');
        this.contacts = [];
      }
    } catch (error) {
      console.error('❌ Failed to load contacts from any storage:', error);
      this.contacts = [];
      
      // Try to notify user about data loss
      this.notifyDataRecoveryIssue();
    }
  }

  // Enhanced save groups with backup mechanisms
  saveGroupsToStorage() {
    try {
      const groupsData = JSON.stringify(this.contactGroups);
      
      // Primary storage
      localStorage.setItem(this.groupStorageKey, groupsData);
      
      // Create backup
      localStorage.setItem(this.groupBackupKey, groupsData);
      
      // Save to IndexedDB
      this.saveToIndexedDB('groups', this.contactGroups);
      
      console.log('✅ Contact groups saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save groups to storage:', error);
      
      // Emergency backup
      try {
        localStorage.setItem(`${this.groupStorageKey}_emergency`, JSON.stringify(this.contactGroups));
      } catch (emergencyError) {
        console.error('❌ Emergency group backup failed:', emergencyError);
      }
      
      return false;
    }
  }

  // Enhanced load groups with fallback recovery
  async loadGroupsFromStorage() {
    try {
      // Try primary storage first
      let stored = localStorage.getItem(this.groupStorageKey);
      let source = 'primary';
      
      // Fallback to backup
      if (!stored) {
        stored = localStorage.getItem(this.groupBackupKey);
        source = 'backup';
      }
      
      // Fallback to IndexedDB
      if (!stored) {
        try {
          const indexedDBGroups = await this.loadFromIndexedDB('groups');
          if (indexedDBGroups && indexedDBGroups.length > 0) {
            this.contactGroups = indexedDBGroups;
            this.saveGroupsToStorage(); // Restore to localStorage
            return;
          }
        } catch (indexedError) {
          console.warn('⚠️ IndexedDB group recovery failed:', indexedError);
        }
      }
      
      // Emergency backup
      if (!stored) {
        stored = localStorage.getItem(`${this.groupStorageKey}_emergency`);
        source = 'emergency';
      }
      
      if (stored) {
        const parsedGroups = JSON.parse(stored);
        this.contactGroups = Array.isArray(parsedGroups) ? parsedGroups : [];
        
        console.log(`✅ Loaded ${this.contactGroups.length} contact groups from ${source} storage`);
        
        // Restore to primary if loaded from fallback
        if (source !== 'primary') {
          this.saveGroupsToStorage();
        }
      } else {
        this.contactGroups = [];
      }
    } catch (error) {
      console.error('❌ Failed to load groups from storage:', error);
      this.contactGroups = [];
    }
  }

  // Get contact statistics
  getStatistics() {
    const total = this.contacts.length;
    const withEmail = this.contacts.filter(c => c.email).length;
    const withPhone = this.contacts.filter(c => c.phone).length;
    const groups = this.contactGroups.length;

    return {
      total,
      withEmail,
      withPhone,
      groups,
      emailPercentage: total > 0 ? Math.round((withEmail / total) * 100) : 0,
      phonePercentage: total > 0 ? Math.round((withPhone / total) * 100) : 0
    };
  }
}

export const contactService = new ContactService();
export default contactService;