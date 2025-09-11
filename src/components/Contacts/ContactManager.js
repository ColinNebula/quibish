import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ContactCard from './ContactCard';
import ContactModal from './ContactModal';
import ContactGroups from './ContactGroups';
import { contactService } from '../../services/contactService';
import { deviceUtils } from '../../services/nativeDeviceFeaturesService';
import { mobileUtils } from '../../services/mobileInteractionService';
import './ContactManager.css';

const ContactManager = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  darkMode = false,
  onStartChat = null,
  onStartCall = null 
}) => {
  // State management
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Analytics and stats
  const [contactStats, setContactStats] = useState({
    total: 0,
    favorites: 0,
    recentlyAdded: 0,
    frequentlyContacted: 0
  });

  // Load contacts on component mount
  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  // Filter and search contacts
  useEffect(() => {
    let filtered = [...contacts];

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(contact => {
        switch (selectedCategory) {
          case 'favorites':
            return contact.isFavorite;
          case 'recent':
            return isRecentContact(contact);
          case 'work':
            return contact.category === 'work' || contact.company;
          case 'family':
            return contact.category === 'family';
          case 'friends':
            return contact.category === 'friends';
          default:
            return contact.category === selectedCategory;
        }
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.name?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.phone?.includes(query) ||
        contact.company?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'recent':
          return new Date(b.lastContacted || b.createdAt) - new Date(a.lastContacted || a.createdAt);
        case 'frequent':
          return (b.contactCount || 0) - (a.contactCount || 0);
        case 'company':
          return (a.company || '').localeCompare(b.company || '');
        default:
          return 0;
      }
    });

    setFilteredContacts(filtered);
  }, [contacts, searchQuery, selectedCategory, sortBy]);

  // Load contacts from service
  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const contactData = await contactService.getAllContacts();
      setContacts(contactData.contacts || []);
      setContactStats(contactData.stats || {});
      
      console.log('📇 Loaded contacts:', contactData.contacts?.length);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setError('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if contact is recent (within last 7 days)
  const isRecentContact = (contact) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return new Date(contact.createdAt) > sevenDaysAgo;
  };

  // Handle contact actions
  const handleAddContact = useCallback(() => {
    setEditingContact(null);
    setShowContactModal(true);
    mobileUtils?.haptic?.('light');
  }, []);

  const handleEditContact = useCallback((contact) => {
    setEditingContact(contact);
    setShowContactModal(true);
    mobileUtils?.haptic?.('light');
  }, []);

  const handleDeleteContact = useCallback(async (contactId) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await contactService.deleteContact(contactId);
        await loadContacts();
        mobileUtils?.haptic?.('medium');
      } catch (err) {
        console.error('Failed to delete contact:', err);
        setError('Failed to delete contact.');
      }
    }
  }, [loadContacts]);

  const handleToggleFavorite = useCallback(async (contactId) => {
    try {
      await contactService.toggleFavorite(contactId);
      await loadContacts();
      mobileUtils?.haptic?.('light');
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }, [loadContacts]);

  const handleContactSave = useCallback(async (contactData) => {
    try {
      if (editingContact) {
        await contactService.updateContact(editingContact.id, contactData);
      } else {
        await contactService.createContact(contactData);
      }
      
      setShowContactModal(false);
      setEditingContact(null);
      await loadContacts();
      mobileUtils?.haptic?.('success');
    } catch (err) {
      console.error('Failed to save contact:', err);
      setError('Failed to save contact.');
    }
  }, [editingContact, loadContacts]);

  // Import contacts from device
  const handleImportContacts = useCallback(async () => {
    try {
      setLoading(true);
      
      const deviceContacts = await deviceUtils.pickContacts({
        multiple: true,
        properties: ['name', 'email', 'tel']
      });

      if (deviceContacts && deviceContacts.length > 0) {
        const imported = await contactService.importContacts(deviceContacts);
        await loadContacts();
        
        alert(`✅ Successfully imported ${imported.count} contacts`);
        mobileUtils?.haptic?.('success');
      }
    } catch (err) {
      console.error('Failed to import contacts:', err);
      if (err.message.includes('not supported')) {
        setError('Contact import not supported on this device.');
      } else {
        setError('Failed to import contacts. Please check permissions.');
      }
    } finally {
      setLoading(false);
    }
  }, [loadContacts]);

  // Export contacts
  const handleExportContacts = useCallback(async () => {
    try {
      const exportData = await contactService.exportContacts();
      
      // Create and download CSV file
      const blob = new Blob([exportData.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quibish_contacts_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      mobileUtils?.haptic?.('success');
      alert(`✅ Exported ${exportData.count} contacts`);
    } catch (err) {
      console.error('Failed to export contacts:', err);
      setError('Failed to export contacts.');
    }
  }, []);

  // Handle contact selection for bulk actions
  const handleContactSelect = useCallback((contactId) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      setShowBulkActions(newSet.size > 0);
      return newSet;
    });
  }, []);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedContacts(new Set());
    setShowBulkActions(false);
  }, []);

  // Categories for filtering
  const categories = useMemo(() => [
    { id: 'all', label: 'All Contacts', icon: '👥', count: contacts.length },
    { id: 'favorites', label: 'Favorites', icon: '⭐', count: contactStats.favorites },
    { id: 'recent', label: 'Recent', icon: '🕒', count: contactStats.recentlyAdded },
    { id: 'work', label: 'Work', icon: '💼', count: contacts.filter(c => c.category === 'work' || c.company).length },
    { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', count: contacts.filter(c => c.category === 'family').length },
    { id: 'friends', label: 'Friends', icon: '👫', count: contacts.filter(c => c.category === 'friends').length }
  ], [contacts, contactStats]);

  if (!isOpen) return null;

  return (
    <div className={`contact-manager-overlay ${darkMode ? 'dark' : ''}`}>
      <div className="contact-manager">
        {/* Header */}
        <div className="contact-manager-header">
          <div className="header-left">
            <h2>📇 Contacts</h2>
            <div className="contact-count">
              {filteredContacts.length} of {contacts.length} contacts
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="action-btn import-btn"
              onClick={handleImportContacts}
              disabled={loading}
              title="Import from device"
            >
              📱
            </button>
            <button 
              className="action-btn export-btn"
              onClick={handleExportContacts}
              disabled={loading || contacts.length === 0}
              title="Export contacts"
            >
              📤
            </button>
            <button 
              className="action-btn add-btn"
              onClick={handleAddContact}
              title="Add new contact"
            >
              ➕
            </button>
            <button 
              className="close-btn"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="contact-manager-controls">
          <div className="search-section">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>

          <div className="filter-section">
            <ContactGroups 
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          <div className="view-controls">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="name">Sort by Name</option>
              <option value="recent">Sort by Recent</option>
              <option value="frequent">Sort by Frequent</option>
              <option value="company">Sort by Company</option>
            </select>

            <div className="view-mode-toggle">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                ⚏
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bulk-actions">
            <div className="bulk-info">
              {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
            </div>
            <div className="bulk-buttons">
              <button className="bulk-btn" onClick={() => console.log('Bulk message')}>
                💬 Message
              </button>
              <button className="bulk-btn" onClick={() => console.log('Bulk export')}>
                📤 Export
              </button>
              <button className="bulk-btn danger" onClick={() => console.log('Bulk delete')}>
                🗑️ Delete
              </button>
              <button className="bulk-btn cancel" onClick={handleClearSelection}>
                ✕ Cancel
              </button>
            </div>
          </div>
        )}

        {/* Contact List */}
        <div className="contact-manager-content">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading contacts...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <button className="retry-btn" onClick={loadContacts}>
                🔄 Retry
              </button>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>
                {searchQuery || selectedCategory !== 'all' 
                  ? 'No contacts found' 
                  : 'No contacts yet'
                }
              </h3>
              <p>
                {searchQuery 
                  ? 'Try adjusting your search or filters'
                  : 'Add your first contact to get started'
                }
              </p>
              {!searchQuery && selectedCategory === 'all' && (
                <div className="empty-actions">
                  <button className="primary-btn" onClick={handleAddContact}>
                    ➕ Add Contact
                  </button>
                  <button className="secondary-btn" onClick={handleImportContacts}>
                    📱 Import from Device
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={`contact-grid ${viewMode}`}>
              {filteredContacts.map(contact => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  viewMode={viewMode}
                  isSelected={selectedContacts.has(contact.id)}
                  onSelect={handleContactSelect}
                  onEdit={handleEditContact}
                  onDelete={handleDeleteContact}
                  onToggleFavorite={handleToggleFavorite}
                  onStartChat={onStartChat}
                  onStartCall={onStartCall}
                  darkMode={darkMode}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contact Modal */}
        {showContactModal && (
          <ContactModal
            isOpen={showContactModal}
            contact={editingContact}
            allContacts={filteredContacts}
            onClose={() => {
              setShowContactModal(false);
              setEditingContact(null);
            }}
            onSave={handleContactSave}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
};

export default ContactManager;