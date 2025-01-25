import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import styles from './ForceStopModal.module.css';

const ForceStopModal = ({ chainName, onConfirm, onClose }) => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`${styles.modal} ${isDarkMode ? styles.dark : ''}`}>
      <div className={styles.modalContent}>
        <h2>Warning: Force Stop {chainName}</h2>
        <p>
          Force stopping {chainName} may result in data corruption or loss.
          Only use this if the normal stop operation is not responding.
        </p>
        <div className={styles.buttonContainer}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className={styles.forceButton}
            onClick={onConfirm}
          >
            Force Stop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForceStopModal;
