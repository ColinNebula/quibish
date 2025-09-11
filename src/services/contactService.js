/**
 * Contact Service
 * Manages contact data storage, retrieval, and synchronization
 * Handles both local storage (IndexedDB) and remote API integration
 */

// IndexedDB configuration
const DB_NAME = 'quibishContacts';
const DB_VERSION = 1;
const STORE_NAME = 'contacts';

// API configuration
const API_BASE_URL = 'http://localhost:5005/api';

class ContactService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initPromise = this.init();
  }

  // Initialize IndexedDB
  async init() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open contacts database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('📇 Contact database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create contacts store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('email', 'email', { unique: false });
          store.createIndex('phone', 'phone', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
          store.createIndex('lastContacted', 'lastContacted', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // Ensure database is ready
  async ensureReady() {
    if (!this.isInitialized) {
      await this.initPromise;
    }
  }

  // Get all contacts with stats
  async getAllContacts() {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const contacts = request.result || [];
        
        // Calculate stats
        const stats = this.calculateContactStats(contacts);
        
        // If no contacts exist, add some demo data
        if (contacts.length === 0) {
          this.seedDemoContacts().then(() => {
            // Recursively call to get the demo data
            this.getAllContacts().then(resolve).catch(reject);
          });
          return;
        }

        resolve({
          contacts: contacts.sort((a, b) => a.name.localeCompare(b.name)),
          stats
        });
      };

      request.onerror = () => {
        console.error('Failed to get contacts');
        reject(request.error);
      };
    });
  }

  // Calculate contact statistics
  calculateContactStats(contacts) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      total: contacts.length,
      favorites: contacts.filter(c => c.isFavorite).length,
      recentlyAdded: contacts.filter(c => new Date(c.createdAt) > sevenDaysAgo).length,
      frequentlyContacted: contacts.filter(c => (c.contactCount || 0) > 5).length,
      categories: {
        work: contacts.filter(c => c.category === 'work' || c.company).length,
        family: contacts.filter(c => c.category === 'family').length,
        friends: contacts.filter(c => c.category === 'friends').length,
        business: contacts.filter(c => c.category === 'business').length,
        other: contacts.filter(c => c.category === 'other' || !c.category).length
      }
    };
  }

  // Create new contact
  async createContact(contactData) {
    await this.ensureReady();

    const contact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...contactData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contactCount: 0,
      isFavorite: contactData.isFavorite || false,
      lastContacted: null
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(contact);

      request.onsuccess = () => {
        console.log('✅ Contact created:', contact.name);
        resolve(contact);
      };

      request.onerror = () => {
        console.error('Failed to create contact');
        reject(request.error);
      };
    });
  }

  // Update existing contact
  async updateContact(contactId, updateData) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(contactId);

      getRequest.onsuccess = () => {
        const existingContact = getRequest.result;
        if (!existingContact) {
          reject(new Error('Contact not found'));
          return;
        }

        const updatedContact = {
          ...existingContact,
          ...updateData,
          updatedAt: new Date().toISOString()
        };

        const putRequest = store.put(updatedContact);
        
        putRequest.onsuccess = () => {
          console.log('✅ Contact updated:', updatedContact.name);
          resolve(updatedContact);
        };

        putRequest.onerror = () => {
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  // Delete contact
  async deleteContact(contactId) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(contactId);

      request.onsuccess = () => {
        console.log('🗑️ Contact deleted:', contactId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete contact');
        reject(request.error);
      };
    });
  }

  // Toggle favorite status
  async toggleFavorite(contactId) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(contactId);

      getRequest.onsuccess = () => {
        const contact = getRequest.result;
        if (!contact) {
          reject(new Error('Contact not found'));
          return;
        }

        contact.isFavorite = !contact.isFavorite;
        contact.updatedAt = new Date().toISOString();

        const putRequest = store.put(contact);
        
        putRequest.onsuccess = () => {
          console.log('⭐ Favorite toggled:', contact.name, contact.isFavorite);
          resolve(contact);
        };

        putRequest.onerror = () => {
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  // Import contacts from device
  async importContacts(deviceContacts) {
    await this.ensureReady();

    let importedCount = 0;
    const errors = [];

    for (const deviceContact of deviceContacts) {
      try {
        const contact = this.parseDeviceContact(deviceContact);
        await this.createContact(contact);
        importedCount++;
      } catch (error) {
        console.error('Failed to import contact:', error);
        errors.push(error.message);
      }
    }

    return {
      count: importedCount,
      errors: errors,
      total: deviceContacts.length
    };
  }

  // Parse device contact format
  parseDeviceContact(deviceContact) {
    return {
      name: deviceContact.name?.[0] || 'Unknown Contact',
      email: deviceContact.email?.[0] || '',
      phone: deviceContact.tel?.[0] || '',
      category: 'other',
      tags: ['imported'],
      notes: 'Imported from device contacts'
    };
  }

  // Export contacts to CSV
  async exportContacts() {
    const { contacts } = await this.getAllContacts();

    const csvHeaders = [
      'Name', 'Email', 'Phone', 'Company', 'Job Title', 
      'Category', 'Location', 'Website', 'Notes', 'Tags'
    ];

    const csvRows = contacts.map(contact => [
      contact.name || '',
      contact.email || '',
      contact.phone || '',
      contact.company || '',
      contact.jobTitle || '',
      contact.category || '',
      contact.location || '',
      contact.website || '',
      contact.notes || '',
      (contact.tags || []).join('; ')
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    return {
      csv: csvContent,
      count: contacts.length,
      filename: `contacts_${new Date().toISOString().split('T')[0]}.csv`
    };
  }

  // Update contact interaction count
  async recordContactInteraction(contactId, interactionType = 'message') {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(contactId);

      getRequest.onsuccess = () => {
        const contact = getRequest.result;
        if (!contact) {
          reject(new Error('Contact not found'));
          return;
        }

        contact.contactCount = (contact.contactCount || 0) + 1;
        contact.lastContacted = new Date().toISOString();
        contact.lastInteractionType = interactionType;
        contact.updatedAt = new Date().toISOString();

        const putRequest = store.put(contact);
        
        putRequest.onsuccess = () => {
          console.log('📊 Contact interaction recorded:', contact.name);
          resolve(contact);
        };

        putRequest.onerror = () => {
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  // Search contacts
  async searchContacts(query, limit = 10) {
    const { contacts } = await this.getAllContacts();
    const searchTerm = query.toLowerCase();

    const results = contacts
      .filter(contact => 
        contact.name?.toLowerCase().includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchTerm) ||
        contact.phone?.includes(searchTerm) ||
        contact.company?.toLowerCase().includes(searchTerm) ||
        (contact.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
      )
      .slice(0, limit);

    return results;
  }

  // Get recent contacts
  async getRecentContacts(limit = 5) {
    const { contacts } = await this.getAllContacts();
    
    return contacts
      .filter(contact => contact.lastContacted)
      .sort((a, b) => new Date(b.lastContacted) - new Date(a.lastContacted))
      .slice(0, limit);
  }

  // Get frequent contacts
  async getFrequentContacts(limit = 5) {
    const { contacts } = await this.getAllContacts();
    
    return contacts
      .filter(contact => (contact.contactCount || 0) > 0)
      .sort((a, b) => (b.contactCount || 0) - (a.contactCount || 0))
      .slice(0, limit);
  }

  // Update contact interaction analytics
  async updateContactInteraction(contactId, interactionType) {
    try {
      const db = await this.getDatabase();
      const tx = db.transaction(['contacts'], 'readwrite');
      const store = tx.objectStore('contacts');
      
      const contact = await new Promise((resolve, reject) => {
        const req = store.get(contactId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      
      if (contact) {
        // Initialize analytics if not exists
        if (!contact.analytics) {
          contact.analytics = {
            totalInteractions: 0,
            lastInteraction: null,
            interactions: [],
            frequencyScore: 0,
            chatCount: 0,
            callCount: 0,
            lastChatDate: null,
            lastCallDate: null
          };
        }
        
        const now = new Date();
        
        // Update interaction counts
        contact.analytics.totalInteractions++;
        contact.analytics.lastInteraction = now.toISOString();
        
        // Track specific interaction types
        if (interactionType === 'chat_started') {
          contact.analytics.chatCount++;
          contact.analytics.lastChatDate = now.toISOString();
        } else if (interactionType === 'call_made') {
          contact.analytics.callCount++;
          contact.analytics.lastCallDate = now.toISOString();
        }
        
        // Add to interactions history (keep last 50)
        contact.analytics.interactions.unshift({
          type: interactionType,
          timestamp: now.toISOString(),
          id: Date.now()
        });
        
        if (contact.analytics.interactions.length > 50) {
          contact.analytics.interactions = contact.analytics.interactions.slice(0, 50);
        }
        
        // Calculate frequency score (interactions in last 30 days)
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const recentInteractions = contact.analytics.interactions.filter(
          interaction => new Date(interaction.timestamp) >= thirtyDaysAgo
        );
        contact.analytics.frequencyScore = recentInteractions.length;
        
        // Update last modified
        contact.lastModified = now.toISOString();
        
        // Save updated contact
        await new Promise((resolve, reject) => {
          const updateReq = store.put(contact);
          updateReq.onsuccess = () => resolve();
          updateReq.onerror = () => reject(updateReq.error);
        });
        
        await tx.complete;
        console.log(`Updated analytics for contact ${contactId}:`, contact.analytics);
      }
    } catch (error) {
      console.error('Error updating contact interaction:', error);
    }
  }

  // Get contact analytics summary
  async getContactAnalytics() {
    try {
      const contacts = await this.getAllContacts();
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      // Calculate analytics
      const analytics = {
        totalContacts: contacts.length,
        recentlyAdded: contacts.filter(c => new Date(c.dateAdded) >= sevenDaysAgo).length,
        frequentlyContacted: contacts
          .filter(c => c.analytics?.frequencyScore > 3)
          .sort((a, b) => (b.analytics?.frequencyScore || 0) - (a.analytics?.frequencyScore || 0))
          .slice(0, 10),
        recentlyContacted: contacts
          .filter(c => c.analytics?.lastInteraction && new Date(c.analytics.lastInteraction) >= sevenDaysAgo)
          .sort((a, b) => new Date(b.analytics?.lastInteraction || 0) - new Date(a.analytics?.lastInteraction || 0))
          .slice(0, 10),
        mostCalled: contacts
          .filter(c => c.analytics?.callCount > 0)
          .sort((a, b) => (b.analytics?.callCount || 0) - (a.analytics?.callCount || 0))
          .slice(0, 5),
        mostChatted: contacts
          .filter(c => c.analytics?.chatCount > 0)
          .sort((a, b) => (b.analytics?.chatCount || 0) - (a.analytics?.chatCount || 0))
          .slice(0, 5),
        interactionStats: {
          totalChats: contacts.reduce((sum, c) => sum + (c.analytics?.chatCount || 0), 0),
          totalCalls: contacts.reduce((sum, c) => sum + (c.analytics?.callCount || 0), 0),
          totalInteractions: contacts.reduce((sum, c) => sum + (c.analytics?.totalInteractions || 0), 0),
          activeInLastWeek: contacts.filter(c => 
            c.analytics?.lastInteraction && new Date(c.analytics.lastInteraction) >= sevenDaysAgo
          ).length,
          activeInLastMonth: contacts.filter(c => 
            c.analytics?.lastInteraction && new Date(c.analytics.lastInteraction) >= thirtyDaysAgo
          ).length
        },
        categoryBreakdown: {
          work: contacts.filter(c => c.category === 'work' || c.company).length,
          family: contacts.filter(c => c.category === 'family').length,
          friends: contacts.filter(c => c.category === 'friends').length,
          other: contacts.filter(c => !c.category || (c.category !== 'work' && c.category !== 'family' && c.category !== 'friends')).length
        }
      };
      
      return analytics;
    } catch (error) {
      console.error('Error getting contact analytics:', error);
      return null;
    }
  }

  // Seed minimal demo contacts for testing (memory optimized)
  async seedDemoContacts() {
    const demoContacts = [
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '+1 (555) 123-4567',
        category: 'work',
        isFavorite: true,
        tags: ['work']
      },
      {
        name: 'Bob Smith', 
        email: 'bob@example.com',
        phone: '+1 (555) 234-5678',
        category: 'friends',
        isFavorite: false,
        contactCount: 8,
        tags: ['designer', 'creative'],
        socialLinks: {
          instagram: '@bobsmith_design'
        }
      },
      {
        name: 'Charlie Brown',
        email: 'charlie@personal.com',
        phone: '+1 (555) 345-6789',
        category: 'friends',
        location: 'Los Angeles, CA',
        isFavorite: true,
        contactCount: 22,
        lastContacted: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        tags: ['college', 'close friend'],
        notes: 'Met in college, great friend!'
      },
      {
        name: 'Diana Prince',
        email: 'diana.prince@law.com',
        phone: '+1 (555) 456-7890',
        company: 'Prince & Associates',
        jobTitle: 'Attorney',
        category: 'business',
        location: 'Washington, DC',
        website: 'https://princelaw.com',
        isFavorite: false,
        contactCount: 3,
        tags: ['lawyer', 'professional']
      },
      {
        name: 'Emma Wilson',
        email: 'emma@family.com',
        phone: '+1 (555) 567-8901',
        category: 'family',
        location: 'Chicago, IL',
        isFavorite: true,
        contactCount: 45,
        lastContacted: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        tags: ['sister', 'family'],
        notes: 'My amazing sister!'
      }
    ];

    // Clear existing demo data to save memory
    try {
      const existingContacts = await this.getAllContacts();
      if (existingContacts.length > 0) {
        console.log('⚡ Skipping demo data - contacts already exist');
        return;
      }
    } catch (error) {
      console.log('⚡ Proceeding with demo data seeding');
    }

    for (const contact of demoContacts) {
      await this.createContact(contact);
    }

    console.log(`🌱 ${demoContacts.length} minimal demo contacts seeded`);
  }

  // Sync with backend API (future feature)
  async syncWithBackend() {
    try {
      // This would sync local contacts with the backend
      // Implementation depends on backend API structure
      console.log('🔄 Backend sync not implemented yet');
    } catch (error) {
      console.error('Failed to sync with backend:', error);
    }
  }

  // Clear all contacts (for testing)
  async clearAllContacts() {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ All contacts cleared');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// Create global instance
const contactService = new ContactService();

export { contactService };