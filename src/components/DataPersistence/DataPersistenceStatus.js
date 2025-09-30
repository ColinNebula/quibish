import React, { useState, useEffect } from 'react';
import persistentStorageService from '../../services/persistentStorageService';
import dataMigrationManager from '../../services/dataMigrationManager';
import './DataPersistenceStatus.css';

const DataPersistenceStatus = ({ 
  onClose, 
  className = '' 
}) => {
  const [storageStats, setStorageStats] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      // Get storage statistics
      const stats = persistentStorageService.getStorageStats();
      setStorageStats(stats);

      // Get health status
      const health = persistentStorageService.healthCheck();
      setHealthStatus(health);

      // Get available backups
      const availableBackups = dataMigrationManager.getAvailableBackups();
      setBackups(availableBackups);

    } catch (error) {
      console.error('❌ Failed to load storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const createBackup = async () => {
    try {
      const backupKey = dataMigrationManager.createBackup();
      if (backupKey) {
        await loadStorageData(); // Refresh the backup list
        alert('✅ Backup created successfully!');
      } else {
        alert('❌ Failed to create backup');
      }
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      alert('❌ Failed to create backup: ' + error.message);
    }
  };

  const restoreBackup = async (backupKey) => {
    if (!window.confirm('⚠️ Are you sure you want to restore from this backup? This will overwrite current data.')) {
      return;
    }

    try {
      const restored = dataMigrationManager.restoreFromBackup(backupKey);
      if (restored) {
        alert('✅ Data restored successfully! Please refresh the page.');
        window.location.reload();
      } else {
        alert('❌ Failed to restore backup');
      }
    } catch (error) {
      console.error('❌ Restore failed:', error);
      alert('❌ Failed to restore backup: ' + error.message);
    }
  };

  const exportData = () => {
    try {
      const data = persistentStorageService.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quibish-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('✅ Data exported successfully!');
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert('❌ Failed to export data: ' + error.message);
    }
  };

  const clearAllData = () => {
    if (!window.confirm('⚠️ Are you absolutely sure you want to clear ALL data? This action cannot be undone!')) {
      return;
    }

    if (!window.confirm('🚨 FINAL WARNING: This will delete all your messages, profile data, and settings. Continue?')) {
      return;
    }

    try {
      persistentStorageService.clearAllData();
      alert('✅ All data cleared successfully! The page will now reload.');
      window.location.reload();
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
      alert('❌ Failed to clear data: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className={`data-persistence-status ${className}`}>
        <div className="status-header">
          <h3>💾 Data Storage Status</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Loading storage information...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`data-persistence-status ${className}`}>
      <div className="status-header">
        <h3>💾 Data Storage Status</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Health Status */}
      <div className="status-section">
        <h4>🏥 Storage Health</h4>
        <div className={`health-indicator ${healthStatus?.healthy ? 'healthy' : 'unhealthy'}`}>
          <span className="health-icon">{healthStatus?.healthy ? '✅' : '❌'}</span>
          <span className="health-text">
            {healthStatus?.healthy ? 'Storage is working properly' : 'Storage has issues'}
          </span>
        </div>
        
        <div className="health-details">
          <div className="health-item">
            <span>localStorage:</span>
            <span className={healthStatus?.localStorage ? 'success' : 'error'}>
              {healthStatus?.localStorage ? '✅ Available' : '❌ Not Available'}
            </span>
          </div>
          <div className="health-item">
            <span>sessionStorage:</span>
            <span className={healthStatus?.sessionStorage ? 'success' : 'error'}>
              {healthStatus?.sessionStorage ? '✅ Available' : '❌ Not Available'}
            </span>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="status-section">
        <h4>📊 Storage Usage</h4>
        <div className="storage-stats">
          <div className="storage-category">
            <h5>Persistent Storage (localStorage)</h5>
            {storageStats?.localStorage && Object.keys(storageStats.localStorage).length > 0 ? (
              <>
                {Object.entries(storageStats.localStorage).map(([key, size]) => (
                  <div key={key} className="storage-item">
                    <span className="storage-key">{key}:</span>
                    <span className="storage-size">{formatBytes(size)}</span>
                  </div>
                ))}
                <div className="storage-total">
                  <strong>Total: {formatBytes(storageStats.total.localStorage)}</strong>
                </div>
              </>
            ) : (
              <div className="no-data">No persistent data stored</div>
            )}
          </div>

          <div className="storage-category">
            <h5>Session Storage</h5>
            {storageStats?.sessionStorage && Object.keys(storageStats.sessionStorage).length > 0 ? (
              <>
                {Object.entries(storageStats.sessionStorage).map(([key, size]) => (
                  <div key={key} className="storage-item">
                    <span className="storage-key">{key}:</span>
                    <span className="storage-size">{formatBytes(size)}</span>
                  </div>
                ))}
                <div className="storage-total">
                  <strong>Total: {formatBytes(storageStats.total.sessionStorage)}</strong>
                </div>
              </>
            ) : (
              <div className="no-data">No session data stored</div>
            )}
          </div>
        </div>
      </div>

      {/* Backups */}
      <div className="status-section">
        <h4>💾 Data Backups</h4>
        <div className="backup-controls">
          <button className="backup-btn create" onClick={createBackup}>
            📦 Create Backup
          </button>
          <button className="backup-btn export" onClick={exportData}>
            📤 Export Data
          </button>
        </div>
        
        <div className="backup-list">
          {backups.length > 0 ? (
            backups.map((backup) => (
              <div key={backup.key} className="backup-item">
                <div className="backup-info">
                  <span className="backup-date">{backup.date}</span>
                  <span className="backup-key">{backup.key}</span>
                </div>
                <button 
                  className="backup-btn restore"
                  onClick={() => restoreBackup(backup.key)}
                >
                  🔄 Restore
                </button>
              </div>
            ))
          ) : (
            <div className="no-data">No backups available</div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="status-section danger-zone">
        <h4>⚠️ Danger Zone</h4>
        <div className="danger-controls">
          <button className="danger-btn clear" onClick={clearAllData}>
            🗑️ Clear All Data
          </button>
          <div className="danger-warning">
            This will permanently delete all your messages, profile data, and settings.
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="status-section info-section">
        <h4>ℹ️ Information</h4>
        <div className="info-text">
          <p>Your data is automatically saved to your browser's storage. This includes:</p>
          <ul>
            <li>✉️ Messages and conversations</li>
            <li>👤 Profile information and settings</li>
            <li>🔑 Authentication tokens (securely stored)</li>
            <li>⚙️ App preferences and configurations</li>
          </ul>
          <p>Data persists across browser sessions when "Remember Me" is enabled.</p>
        </div>
      </div>
    </div>
  );
};

export default DataPersistenceStatus;