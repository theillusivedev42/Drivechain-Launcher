import React, { useMemo, memo } from 'react';
import styles from './DownloadModal.module.css';

const DownloadItem = memo(({ chainId, displayName, status, progress, type, details }) => {
  const statusText = useMemo(() => {
    if (type === 'ibd') {
      return 'syncing';
    }
    return status;
  }, [type, status]);

  // Memoize the progress bar style to prevent object recreation
  const progressStyle = useMemo(() => ({
    transform: `scaleX(${progress / 100})`,
    transformOrigin: 'left'
  }), [progress]);

  // Memoize the progress text with simpler calculation
  const progressText = useMemo(() => {
    if (type === 'ibd' && details) {
      // Just use the details directly to avoid regex overhead
      return details.replace(' blocks', '');
    }
    // Round to whole number for less frequent updates
    return `${Math.round(progress)}%`;
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
          style={progressStyle}
        ></div>
      </div>
      <div className={styles.progressText}>
        {progressText}
      </div>
    </div>
  );
});

export default DownloadItem;
