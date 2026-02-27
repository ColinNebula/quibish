import React, { useState, useEffect, useRef } from 'react';
import { contactService } from '../../services/contactService';
import './ContactManager.css';

// ── Deterministic avatar gradient from name hash ──────────────────────────────
const AVATAR_COLORS = [
  ['#667eea', '#764ba2'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#fd7043', '#ff8a65'],
  ['#26c6da', '#00acc1'],
  ['#66bb6a', '#43a047'],
  ['#ab47bc', '#7b1fa2'],
  ['#ef5350', '#c62828'],
];

function getAvatarGradient(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const [a, b] = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function ContactAvatar({ name = '', size = 48 }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
  return (
    <div
      className="contact-avatar-circle"
      style={{ width: size, height: size, minWidth: size, background: getAvatarGradient(name), fontSize: Math.round(size * 0.36) }}
    >
      {initials || '?'}
    </div>
  );
}

// ── Contact card sub-component ────────────────────────────────────────────────
function ContactCard({ contact, viewMode, isSelected, onToggleSelect, onToggleFavorite, onToggleBlock, onDelete, onEdit, onOpenProfile, onStartChat, onStartCall }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const secondary = contact.company || contact.email || contact.phone || '';

  return (
    <div className={`contact-card${viewMode === 'grid' ? ' card-grid' : ' card-list'}${isSelected ? ' selected' : ''}${contact.blocked ? ' blocked-card' : ''}`}>
      <label className="card-checkbox" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(contact.id)} />
      </label>

      <div className="card-main" onClick={() => onOpenProfile(contact)}>
        <div className="avatar-wrapper">
          <ContactAvatar name={contact.name} size={viewMode === 'grid' ? 52 : 44} />
          {contact.favorite && <span className="fav-badge" title="Favorite">★</span>}
          {contact.blocked && <span className="blocked-badge" title="Blocked">⛔</span>}
        </div>
        <div className="card-info">
          <div className="card-name">{contact.name}</div>
          {secondary && <div className="card-secondary">{secondary}</div>}
        </div>
      </div>

      <div className="card-actions" onClick={e => e.stopPropagation()}>
        <button className={`card-btn fav-btn${contact.favorite ? ' active' : ''}`} onClick={e => onToggleFavorite(contact, e)} title={contact.favorite ? 'Remove from favorites' : 'Add to favorites'}>
          {contact.favorite ? '★' : '☆'}
        </button>
        <button className="card-btn msg-btn" onClick={() => onStartChat(contact)} title="Send message">💬</button>
        {contact.phone && (
          <button className="card-btn call-btn" onClick={() => onStartCall(contact)} title="Call">📞</button>
        )}
        <div className="menu-wrapper" ref={menuRef}>
          <button className="card-btn more-btn" onClick={() => setMenuOpen(p => !p)} title="More options">···</button>
          {menuOpen && (
            <div className="card-dropdown">
              <button onClick={() => { onEdit({ ...contact }); setMenuOpen(false); }}>✏️ Edit</button>
              <button onClick={e => { onToggleFavorite(contact, e); setMenuOpen(false); }}>
                {contact.favorite ? '☆ Remove favorite' : '★ Add to favorites'}
              </button>
              <button onClick={e => { onToggleBlock(contact, e); setMenuOpen(false); }}>
                {contact.blocked ? '✅ Unblock' : '🚫 Block'}
              </button>
              <button className="dropdown-delete" onClick={() => { onDelete(contact.id); setMenuOpen(false); }}>🗑️ Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ContactManager component ─────────────────────────────────────────────
const ContactManager = ({ isOpen, onClose, onStartChat, onStartCall, darkMode }) => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('list');
  const [activeTab, setActiveTab] = useState('all');
  const [profileContact, setProfileContact] = useState(null);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', company: '', notes: '' });

  useEffect(() => { if (isOpen) loadContacts(); }, [isOpen]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const loaded = await contactService.getContacts();
      setContacts(Array.isArray(loaded) ? loaded : (loaded?.contacts || []));
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = contacts;
    if (activeTab === 'favorites') filtered = filtered.filter(c => c.favorite);
    else if (activeTab === 'blocked') filtered = filtered.filter(c => c.blocked);
    else filtered = filtered.filter(c => !c.blocked);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.includes(searchTerm) ||
        c.company?.toLowerCase().includes(term)
      );
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'email':   return (a.email || '').localeCompare(b.email || '');
        case 'company': return (a.company || '').localeCompare(b.company || '');
        case 'recent':  return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        default:        return a.name.localeCompare(b.name);
      }
    });
    setFilteredContacts(filtered);
  }, [contacts, searchTerm, sortBy, activeTab]);

  const handleAddContact = async () => {
    if (!newContact.name.trim()) { alert('Please enter a contact name'); return; }
    const result = await contactService.addContact({ ...newContact, favorite: false, blocked: false });
    if (result.success) {
      setContacts(prev => [...prev, result.contact]);
      setNewContact({ name: '', email: '', phone: '', company: '', notes: '' });
      setShowAddForm(false);
    } else {
      alert(`Failed to add contact: ${result.errors?.join(', ') || result.error}`);
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact?.name?.trim()) { alert('Please enter a contact name'); return; }
    const { id, ...updates } = editingContact;
    const result = await contactService.updateContact(id, updates);
    if (result.success) {
      setContacts(prev => prev.map(c => c.id === result.contact.id ? result.contact : c));
      if (profileContact?.id === id) setProfileContact(result.contact);
      setEditingContact(null);
    } else {
      alert(`Failed to update contact: ${result.errors?.join(', ') || result.error}`);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Delete this contact?')) return;
    const result = await contactService.deleteContact(contactId);
    if (result.success) {
      setContacts(prev => prev.filter(c => c.id !== contactId));
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
      if (profileContact?.id === contactId) setProfileContact(null);
    } else {
      alert(`Failed to delete: ${result.error}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedContacts.length === 0) return;
    if (!window.confirm(`Delete ${selectedContacts.length} contact(s)?`)) return;
    const results = await Promise.all(selectedContacts.map(id => contactService.deleteContact(id)));
    const successIds = selectedContacts.filter((_, i) => results[i].success);
    setContacts(prev => prev.filter(c => !successIds.includes(c.id)));
    setSelectedContacts([]);
  };

  const handleToggleFavorite = async (contact, e) => {
    e?.stopPropagation();
    const result = await contactService.toggleFavorite(contact.id);
    if (result.success) {
      const updated = result.contact || { ...contact, favorite: !contact.favorite };
      setContacts(prev => prev.map(c => c.id === contact.id ? updated : c));
      if (profileContact?.id === contact.id) setProfileContact(updated);
    }
  };

  const handleToggleBlock = async (contact, e) => {
    e?.stopPropagation();
    const result = await contactService.toggleBlock(contact.id);
    if (result.success) {
      const updated = { ...contact, blocked: !contact.blocked };
      setContacts(prev => prev.map(c => c.id === contact.id ? updated : c));
      if (profileContact?.id === contact.id) setProfileContact(updated);
    }
  };

  const handleToggleSelect = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
    );
  };

  const handleSelectAll = () => {
    setSelectedContacts(prev =>
      prev.length === filteredContacts.length ? [] : filteredContacts.map(c => c.id)
    );
  };

  const handleExportContacts = () => {
    const result = contactService.exportContacts('json');
    if (!result.success) alert(`Export failed: ${result.error}`);
  };

  const handleImportContacts = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      let importData;
      if (file.name.endsWith('.json')) {
        importData = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n');
        importData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          return { name: values[0] || 'Unknown', email: values[1] || '', phone: values[2] || '', company: values[3] || '' };
        }).filter(c => c.name && c.name !== 'Unknown');
      }
      if (Array.isArray(importData)) {
        const results = await Promise.all(importData.map(c => contactService.addContact(c)));
        const added = results.filter(r => r.success);
        if (added.length > 0) {
          setContacts(prev => [...prev, ...added.map(r => r.contact)]);
          alert(`Imported ${added.length} contact(s)`);
        } else {
          alert('No contacts were imported');
        }
      } else {
        alert('Invalid file format');
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('Failed to import contacts');
    }
    event.target.value = '';
  };

  const tabCounts = {
    all: contacts.filter(c => !c.blocked).length,
    favorites: contacts.filter(c => c.favorite && !c.blocked).length,
    blocked: contacts.filter(c => c.blocked).length,
  };

  if (!isOpen) return null;

  const emptyMsg = activeTab === 'favorites'
    ? { icon: '⭐', title: 'No favorites yet', sub: 'Star contacts to find them quickly' }
    : activeTab === 'blocked'
    ? { icon: '🚫', title: 'No blocked contacts', sub: '' }
    : searchTerm
    ? { icon: '🔍', title: `No results for "${searchTerm}"`, sub: '' }
    : { icon: '👥', title: 'No contacts yet', sub: 'Add your first contact to get started' };

  return (
    <div className="cm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`cm-modal${darkMode ? ' cm-dark' : ''}`}>

        {/* Header */}
        <div className="cm-header">
          <div className="cm-header-left">
            <span className="cm-header-icon">👥</span>
            <h3>Contacts</h3>
            <span className="cm-total-badge">{tabCounts[activeTab]}</span>
          </div>
          <div className="cm-header-right">
            <button className="cm-add-btn" onClick={() => setShowAddForm(true)}>+ Add</button>
            <button className="cm-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="cm-tabs">
          {[
            { id: 'all', label: 'All', icon: '👥' },
            { id: 'favorites', label: 'Favorites', icon: '⭐' },
            { id: 'blocked', label: 'Blocked', icon: '🚫' },
          ].map(tab => (
            <button key={tab.id} className={`cm-tab${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <span>{tab.icon}</span>
              <span className="cm-tab-label">{tab.label}</span>
              {tabCounts[tab.id] > 0 && <span className="cm-tab-count">{tabCounts[tab.id]}</span>}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="cm-toolbar">
          <div className="cm-search-wrap">
            <span className="cm-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search contacts…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="cm-search-input"
            />
            {searchTerm && <button className="cm-search-clear" onClick={() => setSearchTerm('')}>✕</button>}
          </div>
          <div className="cm-toolbar-right">
            {selectedContacts.length > 0 && (
              <>
                <button className="cm-toolbar-btn" onClick={handleSelectAll}>
                  {selectedContacts.length === filteredContacts.length ? 'Deselect all' : 'Select all'}
                </button>
                <button className="cm-toolbar-btn cm-delete-sel-btn" onClick={handleDeleteSelected}>
                  🗑 ({selectedContacts.length})
                </button>
              </>
            )}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="cm-sort-select">
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="company">Company</option>
              <option value="recent">Recent</option>
            </select>
            <div className="cm-view-toggle">
              <button className={`cm-view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="Grid">⊞</button>
              <button className={`cm-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="List">≡</button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className={`cm-body${profileContact ? ' panel-open' : ''}`}>
          <div className={`cm-contacts-area${viewMode === 'grid' ? ' grid-mode' : ' list-mode'}`}>
            {isLoading ? (
              <div className="cm-loading">
                <div className="cm-spinner" />
                <p>Loading contacts…</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="cm-empty">
                <div className="cm-empty-icon">{emptyMsg.icon}</div>
                <p className="cm-empty-title">{emptyMsg.title}</p>
                {emptyMsg.sub && <p className="cm-empty-sub">{emptyMsg.sub}</p>}
                {activeTab === 'all' && !searchTerm && (
                  <button className="cm-empty-add-btn" onClick={() => setShowAddForm(true)}>Add Contact</button>
                )}
              </div>
            ) : (
              filteredContacts.map(contact => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  viewMode={viewMode}
                  isSelected={selectedContacts.includes(contact.id)}
                  onToggleSelect={handleToggleSelect}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleBlock={handleToggleBlock}
                  onDelete={handleDeleteContact}
                  onEdit={c => setEditingContact(c)}
                  onOpenProfile={c => setProfileContact(c)}
                  onStartChat={c => { if (onStartChat) onStartChat(c); }}
                  onStartCall={c => { if (onStartCall) onStartCall(c); }}
                />
              ))
            )}
          </div>

          {/* Profile panel */}
          {profileContact && (
            <div className="cm-profile-panel">
              <button className="profile-close-btn" onClick={() => setProfileContact(null)}>✕</button>
              <div className="profile-avatar-wrap">
                <ContactAvatar name={profileContact.name} size={80} />
                {profileContact.favorite && <span className="profile-fav-star">★</span>}
              </div>
              <h2 className="profile-name">{profileContact.name}</h2>
              {profileContact.company && <p className="profile-company">{profileContact.company}</p>}
              <div className="profile-quick-btns">
                <button className="pq-btn pq-msg" onClick={() => { if (onStartChat) onStartChat(profileContact); }}>
                  <span>💬</span><span>Message</span>
                </button>
                {profileContact.phone && (
                  <button className="pq-btn pq-call" onClick={() => { if (onStartCall) onStartCall(profileContact); }}>
                    <span>📞</span><span>Call</span>
                  </button>
                )}
                <button className={`pq-btn pq-fav${profileContact.favorite ? ' active' : ''}`} onClick={e => handleToggleFavorite(profileContact, e)}>
                  <span>{profileContact.favorite ? '★' : '☆'}</span>
                  <span>{profileContact.favorite ? 'Unfav' : 'Favorite'}</span>
                </button>
              </div>
              <div className="profile-fields">
                {profileContact.email && (
                  <div className="profile-field">
                    <span className="pf-icon">📧</span>
                    <div><div className="pf-label">Email</div><div className="pf-value">{profileContact.email}</div></div>
                  </div>
                )}
                {profileContact.phone && (
                  <div className="profile-field">
                    <span className="pf-icon">📱</span>
                    <div><div className="pf-label">Phone</div><div className="pf-value">{profileContact.phone}</div></div>
                  </div>
                )}
                {profileContact.notes && (
                  <div className="profile-field">
                    <span className="pf-icon">📝</span>
                    <div><div className="pf-label">Notes</div><div className="pf-value">{profileContact.notes}</div></div>
                  </div>
                )}
                <div className="profile-field">
                  <span className="pf-icon">🗓</span>
                  <div><div className="pf-label">Added</div><div className="pf-value">{new Date(profileContact.createdAt).toLocaleDateString()}</div></div>
                </div>
              </div>
              <div className="profile-footer-btns">
                <button className="profile-edit-btn" onClick={() => { setEditingContact({ ...profileContact }); setProfileContact(null); }}>✏️ Edit</button>
                <button className={`profile-block-btn${profileContact.blocked ? ' unblock' : ''}`} onClick={e => handleToggleBlock(profileContact, e)}>
                  {profileContact.blocked ? '✅ Unblock' : '🚫 Block'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cm-footer">
          <span className="cm-footer-total">{contacts.filter(c => !c.blocked).length} contact{contacts.filter(c => !c.blocked).length !== 1 ? 's' : ''}</span>
          <div className="cm-footer-actions">
            <input type="file" accept=".json,.csv" onChange={handleImportContacts} style={{ display: 'none' }} id="cm-import-input" />
            <label htmlFor="cm-import-input" className="cm-footer-btn">⬆ Import</label>
            <button className="cm-footer-btn" onClick={handleExportContacts}>⬇ Export</button>
          </div>
        </div>

        {/* Add contact modal */}
        {showAddForm && (
          <div className="cm-form-overlay">
            <div className="cm-form-modal">
              <div className="cm-form-header">
                <h4>Add New Contact</h4>
                <button onClick={() => setShowAddForm(false)}>✕</button>
              </div>
              <div className="cm-form-body">
                <input type="text" placeholder="Full Name *" value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} autoFocus />
                <input type="email" placeholder="Email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} />
                <input type="tel" placeholder="Phone" value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} />
                <input type="text" placeholder="Company" value={newContact.company} onChange={e => setNewContact(p => ({ ...p, company: e.target.value }))} />
                <textarea placeholder="Notes" value={newContact.notes} onChange={e => setNewContact(p => ({ ...p, notes: e.target.value }))} rows={3} />
                <div className="cm-form-actions">
                  <button className="cm-cancel-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
                  <button className="cm-save-btn" onClick={handleAddContact}>Add Contact</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit contact modal */}
        {editingContact && (
          <div className="cm-form-overlay">
            <div className="cm-form-modal">
              <div className="cm-form-header">
                <h4>Edit Contact</h4>
                <button onClick={() => setEditingContact(null)}>✕</button>
              </div>
              <div className="cm-form-body">
                <input type="text" placeholder="Full Name *" value={editingContact.name} onChange={e => setEditingContact(p => ({ ...p, name: e.target.value }))} autoFocus />
                <input type="email" placeholder="Email" value={editingContact.email || ''} onChange={e => setEditingContact(p => ({ ...p, email: e.target.value }))} />
                <input type="tel" placeholder="Phone" value={editingContact.phone || ''} onChange={e => setEditingContact(p => ({ ...p, phone: e.target.value }))} />
                <input type="text" placeholder="Company" value={editingContact.company || ''} onChange={e => setEditingContact(p => ({ ...p, company: e.target.value }))} />
                <textarea placeholder="Notes" value={editingContact.notes || ''} onChange={e => setEditingContact(p => ({ ...p, notes: e.target.value }))} rows={3} />
                <div className="cm-form-actions">
                  <button className="cm-cancel-btn" onClick={() => setEditingContact(null)}>Cancel</button>
                  <button className="cm-save-btn" onClick={handleUpdateContact}>Save Changes</button>
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
