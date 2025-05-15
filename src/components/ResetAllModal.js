import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import styles from './ChainSettingsModal.module.css';

const ResetAllModal = ({ onConfirm, onClose }) => {
  const { isDarkMode } = useTheme();
  const [deleteWallet, setDeleteWallet] = useState(false);
  
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm(deleteWallet);
  };

  return (
    <div 
      className={`${styles.modalOverlay} ${styles.dangerOverlay} ${isDarkMode ? styles.dark : styles.light}`} 
      onClick={handleOverlayClick}
    >
      <div className={`${styles.modalContent} ${styles.compactModal}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Reset All Chains</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p>Warning: This will reset all chains to their default state and delete ALL data, including:</p>
          <p className={styles.dataList}>
            Cancel and clean up any active downloads -- All blockchain data  All custom chain configurations -- All downloaded binaries
          </p>
          <div className={styles.checkboxContainer}>
            <input
              type="checkbox"
              id="deleteWallet"
              checked={deleteWallet}
              onChange={() => setDeleteWallet(!deleteWallet)}
            />
            <label htmlFor="deleteWallet"> Also delete my wallet</label>
          </div>
          <p className={styles.warningText}>
            This action cannot be undone.
          </p>
        </div>
        <div className={styles.buttonContainer}>
          <button onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button onClick={handleConfirm} className={styles.resetBtn}>
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetAllModal;
