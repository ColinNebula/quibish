// Contact Persistence Status Component
import React, { useState, useEffect } from 'react';
import { contactPersistenceManager } from '../services/contactPersistenceManager';
import './ContactPersistenceStatus.css';

const ContactPersistenceStatus = () => {
  const [status, setStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [backupInProgress, setBackupInProgress] = useState(false);

  useEffect(() => {
    // Update status periodically
    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    // Listen for data recovery events
    const handleDataRecovery = (event) => {
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 10000); // Auto-hide after 10 seconds
    };

    window.addEventListener('contactDataRecovered', handleDataRecovery);
    window.addEventListener('contactDataRecoveryIssue', handleDataRecovery);

    return () => {
      clearInterval(interval);
      window.removeEventListener('contactDataRecovered', handleDataRecovery);
      window.removeEventListener('contactDataRecoveryIssue', handleDataRecovery);
    };
  }, []);

  const updateStatus = () => {
    const persistenceStatus = contactPersistenceManager.getPersistenceStatus();
    setStatus(persistenceStatus);
    
    if (persistenceStatus.lastCriticalSave) {
      setLastBackup(new Date(persistenceStatus.lastCriticalSave));
    }
  };

  const handleManualBackup = async () => {
    setBackupInProgress(true);
    try {
      const result = await contactPersistenceManager.manualBackup();
      if (result.success) {
        setLastBackup(new Date());
        console.log('✅ Manual backup successful');
      } else {
        console.error('❌ Manual backup failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Manual backup error:', error);
    } finally {
      setBackupInProgress(false);
    }
  };

  const formatLastBackup = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getBackupStatusIcon = () => {
    if (!lastBackup) return '❌';
    
    const now = new Date();
    const diffMs = now.getTime() - lastBackup.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 5) return '✅';
    if (diffMins < 30) return '⚠️';
    return '❌';
  };

  if (!status) return null;

  return (
    <div className={`persistence-status ${isVisible ? 'visible' : ''}`}>
      <div className="status-header">
        <span className="status-icon">{getBackupStatusIcon()}</span>
        <span className="status-title">Data Protection</span>
        <button 
          className="toggle-btn" 
          onClick={() => setIsVisible(!isVisible)}
          title="Toggle persistence status"
        >
          {isVisible ? '▼' : '▲'}
        </button>
      </div>
      
      {isVisible && (
        <div className="status-details">
          <div className="status-row">
            <span className="label">Last Backup:</span>
            <span className="value">{formatLastBackup(lastBackup)}</span>
          </div>
          
          {status.lastSaveTrigger && (
            <div className="status-row">
              <span className="label">Trigger:</span>
              <span className="value">{status.lastSaveTrigger}</span>
            </div>
          )}
          
          <div className="storage-indicators">
            <div className="storage-item">
              <span className="storage-icon">
                {status.storageAvailable.localStorage ? '✅' : '❌'}
              </span>
              <span>localStorage</span>
            </div>
            <div className="storage-item">
              <span className="storage-icon">
                {status.storageAvailable.indexedDB ? '✅' : '❌'}
              </span>
              <span>IndexedDB</span>
            </div>
          </div>
          
          <div className="backup-controls">
            <button 
              className={`backup-btn ${backupInProgress ? 'loading' : ''}`}
              onClick={handleManualBackup}
              disabled={backupInProgress}
            >
              {backupInProgress ? (
                <>
                  <span className="spinner">⟳</span>
                  Backing up...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Manual Backup
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactPersistenceStatus;