import React from 'react';
import styles from './SettingsModal.module.css';
import { X } from 'lucide-react';

const UpdateStatusModal = ({ status, isVisible, onClose }) => {
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
          <p>{status}</p>
        </div>

        <div className={styles.updateConfirmButtons}>
          <button className={styles.cancelButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateStatusModal;
