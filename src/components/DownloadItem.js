import React from 'react';
import styles from './DownloadModal.module.css';

const DownloadItem = ({ chainId, displayName, status, progress, type, details }) => {
  const getStatusText = () => {
    if (type === 'ibd') {
      return 'syncing';
    }
    return status;
  };

  const getProgressText = () => {
    if (type === 'ibd' && details) {
      return details;
    }
    return `${progress.toFixed(2)}%`;
  };

  return (
    <div className={styles.downloadItem}>
      <div className={styles.downloadHeader}>
        <span className={styles.displayName}>{displayName}</span>
        <span className={styles.status}>{getStatusText()}</span>
      </div>
      <div className={styles.progressBarContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className={styles.progressText}>
        {getProgressText()}
      </div>
    </div>
  );
};

export default DownloadItem;
