import React, { useMemo, memo, useRef, useEffect, useState } from 'react';
import styles from './DownloadModal.module.css';

// Props for DownloadItem
interface DownloadItemProps {
  chainId: string;
  displayName: string;
  status: string;
  progress: number;
  type: 'download' | 'ibd';
  details?: string;
  downloadedLength: number;
  totalLength: number;
}

// Raw component with typed props
const DownloadItemRaw: React.FC<DownloadItemProps> = ({
  chainId,
  displayName,
  status,
  progress,
  type,
  details,
  downloadedLength,
  totalLength,
}) => {
  const [displayProgress, setDisplayProgress] = useState(progress);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(Date.now());
  const targetProgressRef = useRef(progress);

  // Handle progress updates and extraction state
  useEffect(() => {
    // Immediately set to 100% for extraction, otherwise use smooth interpolation
    if (status === 'extracting') {
      setDisplayProgress(100);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    targetProgressRef.current = progress;
    
    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastUpdateRef.current;
      lastUpdateRef.current = now;
      
      // Interpolate towards target progress
      // Adjust the speed factor (0.1) to control smoothness
      const diff = targetProgressRef.current - displayProgress;
      if (Math.abs(diff) > 0.1) {
        setDisplayProgress(prev => prev + (diff * 0.1));
        animationFrameRef.current = requestAnimationFrame(animate);
      } else if (diff !== 0) {
        setDisplayProgress(targetProgressRef.current);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [progress, displayProgress, status]);

  const statusText = useMemo(() => {
    if (type === 'ibd') {
      return 'syncing';
    }
    if (status === 'extracting') {
      return 'extracting';
    }
    return status;
  }, [type, status]);


  // Memoize the progress bar style to prevent object recreation
  const progressStyle = useMemo(() => ({
    transform: `scaleX(${displayProgress / 100})`,
    transformOrigin: 'left',
    // Add subtle pulse animation during extraction
    animation: status === 'extracting' ? 'pulse 2s ease-in-out infinite' : 'none'
  }), [displayProgress, status]);

  // Format file size with consistent units
  const formatFileSize = (bytes: number, targetUnit: string | null = null): string => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;

    if (targetUnit) {
      const targetIndex = units.indexOf(targetUnit);
      for (let i = 0; i < targetIndex; i++) {
        size /= 1024;
      }
      return `${Math.round(size * 10) / 10} ${targetUnit}`;
    } else {
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      return `${Math.round(size * 10) / 10} ${units[unitIndex]}`;
    }
  };

  // Get the appropriate unit for both sizes
  const getDisplayUnit = () => {
    if (!totalLength) return null;
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = totalLength;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return units[unitIndex];
  };

  // Memoize the progress text with simpler calculation
  const progressText = useMemo(() => {
    if (type === 'ibd' && details) {
      // Just use the details directly to avoid regex overhead
      return details.replace(' blocks', '');
    }
    // Only show percentage for normal downloads
    return `${Math.round(displayProgress)}%`;
  }, [type, details, displayProgress]);

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
      <div className={styles.progressFooter}>
        <span 
          className={styles.fileSize}
          data-loading={status === 'downloading' && !totalLength ? 'true' : undefined}
        >
          {status === 'downloading' && !totalLength ? (
            // Show loading state until we have size info
            'Getting file size...'
          ) : totalLength ? (
            // If we have total size, show both in same unit
            `${formatFileSize(downloadedLength, getDisplayUnit())} / ${formatFileSize(totalLength)}`
          ) : (
            // Otherwise just show current size
            formatFileSize(downloadedLength)
          )}
        </span>
        <span className={styles.progressText}>
          {status === 'downloading' && !totalLength ? '' : progressText}
        </span>
      </div>
    </div>
  );
};

// Memoized export
const DownloadItem = memo(DownloadItemRaw);

export default DownloadItem;
