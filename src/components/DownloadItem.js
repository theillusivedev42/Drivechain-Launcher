import React, { useMemo, memo } from 'react';
import styles from './DownloadModal.module.css';

const DownloadItem = memo(({ chainId, displayName, status, progress, type, details }) => {
  const statusText = useMemo(() => {
    if (type === 'ibd') {
      return 'syncing';
    }
    return status;
  }, [type, status]);

  const progressText = useMemo(() => {
    if (type === 'ibd' && details) {
      return details;
    }
    return `${progress.toFixed(2)}%`;
  }, [type, details, progress]);

  return (
    <div className={styles.downloadItem}>
      <div className={styles.downloadHeader}>
        <span className={styles.displayName}>{displayName}</span>
        <span className={styles.status}>{statusText}</span>
      </div>
      <div className={styles.progressBarContainer}>
        <div
          className={styles.progressBar}
          style={{ transform: `scaleX(${progress / 100})`, transformOrigin: 'left' }}
        ></div>
      </div>
      <div className={styles.progressText}>
        {progressText}
      </div>
    </div>
  );
});

export default DownloadItem;
