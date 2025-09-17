// Contact Service - Complete Implementation
class ContactService {
  constructor() {
    this.contacts = [];
    this.contactGroups = [];
    this.storageKey = 'quibish_contacts';
    this.groupStorageKey = 'quibish_contact_groups';
  }

  // Initialize contact service
  initialize() {
    this.loadContactsFromStorage();
    this.loadGroupsFromStorage();
    
    return {
      success: true,
      contactCount: this.contacts.length,
      groupCount: this.contactGroups.length
    };
  }

  // Get all contacts
  async getContacts(options = {}) {
    const { search, group, limit = 100, offset = 0 } = options;
    
    try {
      // Try to fetch from API first
      const response = await fetch(`/api/contacts?limit=${limit}&offset=${offset}${search ? `&search=${encodeURIComponent(search)}` : ''}${group ? `&group=${encodeURIComponent(group)}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const apiData = await response.json();
        if (apiData.success) {
          this.contacts = apiData.contacts;
          this.saveContactsToStorage();
          return this.contacts;
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
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(contact)
        });

        if (response.ok) {
          const apiData = await response.json();
          if (apiData.success) {
            this.contacts.push(apiData.contact);
            this.saveContactsToStorage();
            
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
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(updatedContact)
        });

        if (response.ok) {
          const apiData = await response.json();
          if (apiData.success) {
            this.contacts[contactIndex] = apiData.contact;
            this.saveContactsToStorage();
            
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
        console.warn('API unavailable, updating locally:', apiError);
      }

      // Fallback to local update
      this.contacts[contactIndex] = updatedContact;
      this.saveContactsToStorage();

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
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const apiData = await response.json();
          if (apiData.success) {
            this.contacts.splice(contactIndex, 1);
            this.saveContactsToStorage();
            
            return { success: true };
          }
        } else {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.error || 'Unknown error'
          };
        }
      } catch (apiError) {
        console.warn('API unavailable, deleting locally:', apiError);
      }

      // Fallback to local deletion
      this.contacts.splice(contactIndex, 1);
      this.saveContactsToStorage();

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

  // Save contacts to local storage
  saveContactsToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.contacts));
    } catch (error) {
      console.error('Failed to save contacts to storage:', error);
    }
  }

  // Load contacts from local storage
  loadContactsFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.contacts = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load contacts from storage:', error);
      this.contacts = [];
    }
  }

  // Save groups to local storage
  saveGroupsToStorage() {
    try {
      localStorage.setItem(this.groupStorageKey, JSON.stringify(this.contactGroups));
    } catch (error) {
      console.error('Failed to save groups to storage:', error);
    }
  }

  // Load groups from local storage
  loadGroupsFromStorage() {
    try {
      const stored = localStorage.getItem(this.groupStorageKey);
      if (stored) {
        this.contactGroups = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load groups from storage:', error);
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