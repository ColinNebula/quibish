const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// In-memory storage for contacts (since we're using fallback mode)
// In production, this would use the same database service as users
let contacts = [];

// Helper function to generate contact ID
const generateContactId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Helper function to validate contact data
const validateContact = (contact) => {
  const errors = [];

  if (!contact.name || contact.name.trim().length < 1) {
    errors.push('Name is required');
  }

  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.push('Invalid email format');
  }

  if (contact.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(contact.phone.replace(/[\s\-\(\)]/g, ''))) {
    errors.push('Invalid phone format');
  }

  if (contact.name && contact.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// GET /api/contacts - get all contacts for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0, search, group } = req.query;
    const userId = req.user.id;

    // Filter contacts by user ID
    let userContacts = contacts.filter(contact => contact.userId === userId);

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      userContacts = userContacts.filter(contact => 
        contact.name?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.phone?.includes(search) ||
        contact.company?.toLowerCase().includes(searchLower)
      );
    }

    // Apply group filter
    if (group) {
      userContacts = userContacts.filter(contact => 
        contact.groups?.includes(group)
      );
    }

    // Sort by name
    userContacts.sort((a, b) => a.name.localeCompare(b.name));

    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedContacts = userContacts.slice(startIndex, endIndex);

    res.json({
      success: true,
      contacts: paginatedContacts,
      total: userContacts.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: endIndex < userContacts.length
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/contacts - create new contact
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const contact = {
      id: generateContactId(),
      userId: userId,
      name: req.body.name?.trim(),
      email: req.body.email?.trim(),
      phone: req.body.phone?.trim(),
      company: req.body.company?.trim(),
      notes: req.body.notes?.trim(),
      groups: req.body.groups || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate contact data
    const validation = validateContact(contact);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Check for duplicate contacts (same name and email/phone)
    const existingContact = contacts.find(c => 
      c.userId === userId && 
      c.name.toLowerCase() === contact.name.toLowerCase() &&
      (
        (contact.email && c.email === contact.email) ||
        (contact.phone && c.phone === contact.phone)
      )
    );

    if (existingContact) {
      return res.status(400).json({
        success: false,
        error: 'Contact with same name and email/phone already exists'
      });
    }

    // Add contact to storage
    contacts.push(contact);

    res.status(201).json({
      success: true,
      contact,
      message: 'Contact created successfully'
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/contacts/:id - get specific contact
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;

    const contact = contacts.find(c => c.id === contactId && c.userId === userId);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      contact
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/contacts/:id - update contact
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;

    const contactIndex = contacts.findIndex(c => c.id === contactId && c.userId === userId);

    if (contactIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    const existingContact = contacts[contactIndex];
    
    const updatedContact = {
      ...existingContact,
      name: req.body.name?.trim() || existingContact.name,
      email: req.body.email?.trim() || existingContact.email,
      phone: req.body.phone?.trim() || existingContact.phone,
      company: req.body.company?.trim() || existingContact.company,
      notes: req.body.notes?.trim() || existingContact.notes,
      groups: req.body.groups || existingContact.groups,
      updatedAt: new Date().toISOString()
    };

    // Validate updated contact
    const validation = validateContact(updatedContact);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Check for duplicate contacts (excluding current contact)
    const duplicateContact = contacts.find(c => 
      c.userId === userId && 
      c.id !== contactId &&
      c.name.toLowerCase() === updatedContact.name.toLowerCase() &&
      (
        (updatedContact.email && c.email === updatedContact.email) ||
        (updatedContact.phone && c.phone === updatedContact.phone)
      )
    );

    if (duplicateContact) {
      return res.status(400).json({
        success: false,
        error: 'Contact with same name and email/phone already exists'
      });
    }

    // Update contact
    contacts[contactIndex] = updatedContact;

    res.json({
      success: true,
      contact: updatedContact,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// DELETE /api/contacts/:id - delete contact
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;

    const contactIndex = contacts.findIndex(c => c.id === contactId && c.userId === userId);

    if (contactIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Remove contact
    contacts.splice(contactIndex, 1);

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/contacts/batch - batch operations (import multiple contacts)
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { contacts: contactsToImport } = req.body;

    if (!Array.isArray(contactsToImport)) {
      return res.status(400).json({
        success: false,
        error: 'Contacts must be an array'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < contactsToImport.length; i++) {
      const contactData = contactsToImport[i];
      
      const contact = {
        id: generateContactId(),
        userId: userId,
        name: contactData.name?.trim(),
        email: contactData.email?.trim(),
        phone: contactData.phone?.trim(),
        company: contactData.company?.trim(),
        notes: contactData.notes?.trim(),
        groups: contactData.groups || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Validate contact data
      const validation = validateContact(contact);
      if (!validation.valid) {
        errors.push({
          index: i,
          contact: contactData,
          errors: validation.errors
        });
        continue;
      }

      // Check for duplicates
      const existingContact = contacts.find(c => 
        c.userId === userId && 
        c.name.toLowerCase() === contact.name.toLowerCase() &&
        (
          (contact.email && c.email === contact.email) ||
          (contact.phone && c.phone === contact.phone)
        )
      );

      if (existingContact) {
        errors.push({
          index: i,
          contact: contactData,
          errors: ['Contact with same name and email/phone already exists']
        });
        continue;
      }

      contacts.push(contact);
      results.push(contact);
    }

    res.json({
      success: true,
      imported: results.length,
      contacts: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${results.length} contacts${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });
  } catch (error) {
    console.error('Error batch importing contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/contacts/stats - get contact statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userContacts = contacts.filter(contact => contact.userId === userId);

    const stats = {
      total: userContacts.length,
      withEmail: userContacts.filter(c => c.email).length,
      withPhone: userContacts.filter(c => c.phone).length,
      withCompany: userContacts.filter(c => c.company).length,
      groups: [...new Set(userContacts.flatMap(c => c.groups || []))].length,
      recentlyAdded: userContacts.filter(c => {
        const createdDate = new Date(c.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdDate > weekAgo;
      }).length
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;