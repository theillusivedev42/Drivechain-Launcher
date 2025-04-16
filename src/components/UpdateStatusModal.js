import React from 'react';
import styles from './SettingsModal.module.css';
import { X } from 'lucide-react';

const UpdateStatusModal = ({ status, isVisible, onClose, updates = [], onConfirm, isUpdating, downloadProgress = {} }) => {
  if (!isVisible) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Update Status</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.updateConfirmContent}>
          {updates.length > 0 && !isUpdating ? (
            <>
              <p>Updates are available for: {updates.join(', ')}</p>
              <p>This will:</p>
              <ul>
                <li>Stop the chains if they are running</li>
                <li>Delete existing binaries</li>
                <li>Download and install updates</li>
              </ul>
              <p>Do you want to proceed?</p>
            </>
          ) : (
            <>
              <p>
                {isUpdating && Object.values(downloadProgress).every(progress => progress === 100)
                  ? "All updates completed. You can close this window now."
                  : status
                }
              </p>
              {isUpdating && updates.map(update => (
                <div 
                  key={update} 
                  className={styles.downloadItem} 
                  data-complete={downloadProgress[update] === 100}
                >
                  <div>
                    <div>{update}</div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill} 
                        style={{ width: `${Math.round(downloadProgress[update] || 0)}%` }}
                      />
                    </div>
                  </div>
                  <div className={styles.progressText}>
                    {Math.round(downloadProgress[update] || 0)}%
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className={styles.updateConfirmButtons}>
          {!isUpdating && (
            <>
              <button className={styles.cancelButton} onClick={onClose}>
                {updates.length > 0 ? 'Cancel' : 'Close'}
              </button>
              {updates.length > 0 && (
                <button className={styles.confirmButton} onClick={onConfirm}>
                  Update
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateStatusModal;
