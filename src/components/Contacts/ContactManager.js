import React, { useState, useEffect } from 'react';
import { contactService } from '../../services/contactService';
import './ContactManager.css';

const ContactManager = ({ isOpen, onClose }) => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: ''
  });

  // Load contacts on component mount
  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  // Filter and sort contacts
  useEffect(() => {
    let filtered = contacts;
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.phone && contact.phone.includes(searchTerm)) ||
        (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'email':
          return (a.email || '').localeCompare(b.email || '');
        case 'company':
          return (a.company || '').localeCompare(b.company || '');
        case 'recent':
          return new Date(b.lastContacted || 0) - new Date(a.lastContacted || 0);
        default:
          return 0;
      }
    });
    
    setFilteredContacts(filtered);
  }, [contacts, searchTerm, sortBy]);

  // Load contacts from service
  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const loadedContacts = await contactService.getAllContacts();
      setContacts(loadedContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new contact
  const handleAddContact = async () => {
    if (!newContact.name.trim()) {
      alert('Please enter a contact name');
      return;
    }

    try {
      const addedContact = await contactService.addContact(newContact);
      setContacts(prev => [...prev, addedContact]);
      setNewContact({ name: '', email: '', phone: '', company: '', notes: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Failed to add contact');
    }
  };

  // Update contact
  const handleUpdateContact = async () => {
    if (!editingContact.name.trim()) {
      alert('Please enter a contact name');
      return;
    }

    try {
      const updatedContact = await contactService.updateContact(editingContact.id, editingContact);
      setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
      setEditingContact(null);
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact');
    }
  };

  // Delete contact
  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      await contactService.deleteContact(contactId);
      setContacts(prev => prev.filter(c => c.id !== contactId));
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    }
  };

  // Select/deselect contact
  const handleContactSelect = (contactId) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  // Select all contacts
  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  // Delete selected contacts
  const handleDeleteSelected = async () => {
    if (selectedContacts.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedContacts.length} contact(s)?`)) {
      return;
    }

    try {
      await Promise.all(selectedContacts.map(id => contactService.deleteContact(id)));
      setContacts(prev => prev.filter(c => !selectedContacts.includes(c.id)));
      setSelectedContacts([]);
    } catch (error) {
      console.error('Error deleting contacts:', error);
      alert('Failed to delete some contacts');
    }
  };

  // Export contacts
  const handleExportContacts = async () => {
    try {
      await contactService.exportContacts(contacts);
    } catch (error) {
      console.error('Error exporting contacts:', error);
      alert('Failed to export contacts');
    }
  };

  // Import contacts
  const handleImportContacts = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const importedContacts = await contactService.importContacts(file);
      setContacts(prev => [...prev, ...importedContacts]);
      alert(`Successfully imported ${importedContacts.length} contacts`);
    } catch (error) {
      console.error('Error importing contacts:', error);
      alert('Failed to import contacts');
    }
    
    // Clear file input
    event.target.value = '';
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="contact-manager-overlay" onClick={handleOverlayClick}>
      <div className="contact-manager-modal">
        <div className="contact-manager-header">
          <h3>📞 Contact Manager</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="contact-manager-toolbar">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="toolbar-actions">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="company">Sort by Company</option>
              <option value="recent">Sort by Recent</option>
            </select>
            
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                ⁙
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                ☰
              </button>
            </div>
            
            <button 
              className="add-btn"
              onClick={() => setShowAddForm(true)}
            >
              ➕ Add
            </button>
          </div>
        </div>

        {selectedContacts.length > 0 && (
          <div className="selection-bar">
            <span>{selectedContacts.length} selected</span>
            <div className="selection-actions">
              <button onClick={handleSelectAll}>
                {selectedContacts.length === filteredContacts.length ? 'Deselect All' : 'Select All'}
              </button>
              <button onClick={handleDeleteSelected} className="delete-btn">
                Delete Selected
              </button>
            </div>
          </div>
        )}

        <div className="contact-manager-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading contacts...</p>
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className={`contacts-container ${viewMode}`}>
              {filteredContacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className={`contact-card ${selectedContacts.includes(contact.id) ? 'selected' : ''}`}
                >
                  <div className="contact-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => handleContactSelect(contact.id)}
                    />
                  </div>
                  
                  <div className="contact-avatar">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="contact-details">
                    <div className="contact-name">{contact.name}</div>
                    {contact.email && (
                      <div className="contact-email">{contact.email}</div>
                    )}
                    {contact.phone && (
                      <div className="contact-phone">{contact.phone}</div>
                    )}
                    {contact.company && (
                      <div className="contact-company">{contact.company}</div>
                    )}
                  </div>
                  
                  <div className="contact-actions">
                    <button 
                      onClick={() => setEditingContact(contact)}
                      className="edit-btn"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDeleteContact(contact.id)}
                      className="delete-btn"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📞</div>
              <h4>No contacts found</h4>
              <p>
                {searchTerm 
                  ? `No contacts match "${searchTerm}"`
                  : 'Start by adding your first contact'}
              </p>
              <button 
                className="add-first-btn"
                onClick={() => setShowAddForm(true)}
              >
                Add Contact
              </button>
            </div>
          )}
        </div>

        <div className="contact-manager-footer">
          <div className="footer-info">
            {contacts.length} total contact{contacts.length !== 1 ? 's' : ''}
          </div>
          <div className="footer-actions">
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleImportContacts}
              style={{ display: 'none' }}
              id="import-input"
            />
            <label htmlFor="import-input" className="import-btn">
              📁 Import
            </label>
            <button onClick={handleExportContacts} className="export-btn">
              📄 Export
            </button>
          </div>
        </div>

        {/* Add Contact Modal */}
        {showAddForm && (
          <div className="add-contact-overlay">
            <div className="add-contact-modal">
              <div className="add-contact-header">
                <h4>Add New Contact</h4>
                <button onClick={() => setShowAddForm(false)}>×</button>
              </div>
              <div className="add-contact-form">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newContact.email}
                  onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={newContact.company}
                  onChange={(e) => setNewContact(prev => ({ ...prev, company: e.target.value }))}
                />
                <textarea
                  placeholder="Notes"
                  value={newContact.notes}
                  onChange={(e) => setNewContact(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                />
                <div className="form-actions">
                  <button onClick={() => setShowAddForm(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button onClick={handleAddContact} className="save-btn">
                    Add Contact
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Contact Modal */}
        {editingContact && (
          <div className="add-contact-overlay">
            <div className="add-contact-modal">
              <div className="add-contact-header">
                <h4>Edit Contact</h4>
                <button onClick={() => setEditingContact(null)}>×</button>
              </div>
              <div className="add-contact-form">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={editingContact.name}
                  onChange={(e) => setEditingContact(prev => ({ ...prev, name: e.target.value }))}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={editingContact.email || ''}
                  onChange={(e) => setEditingContact(prev => ({ ...prev, email: e.target.value }))}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={editingContact.phone || ''}
                  onChange={(e) => setEditingContact(prev => ({ ...prev, phone: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={editingContact.company || ''}
                  onChange={(e) => setEditingContact(prev => ({ ...prev, company: e.target.value }))}
                />
                <textarea
                  placeholder="Notes"
                  value={editingContact.notes || ''}
                  onChange={(e) => setEditingContact(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                />
                <div className="form-actions">
                  <button onClick={() => setEditingContact(null)} className="cancel-btn">
                    Cancel
                  </button>
                  <button onClick={handleUpdateContact} className="save-btn">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactManager;