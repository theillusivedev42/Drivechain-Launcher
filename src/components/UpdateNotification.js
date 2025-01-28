import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import styles from './UpdateNotification.module.css';

const UpdateNotification = ({ updates, onDownload, onDismiss }) => {
  const { isDarkMode } = useTheme();

  if (!updates || Object.keys(updates).length === 0) return null;

  return (
    <div className={`${styles.updateNotification} ${isDarkMode ? styles.dark : styles.light}`}>
      <div className={styles.content}>
        <h3>Updates Available</h3>
        {Object.entries(updates).map(([chainId, update]) => (
          <div key={chainId} className={styles.updateItem}>
            <span>{update.displayName}: v{update.current_version} → v{update.latest_version}</span>
            <button 
              onClick={() => onDownload(chainId)}
              className={styles.downloadButton}
            >
              Download
            </button>
          </div>
        ))}
      </div>
      <button 
        onClick={onDismiss} 
        className={styles.dismissButton}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

export default UpdateNotification;
