import React from 'react';
import type { DownloadEntry } from '../store/downloadSlice';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import styles from './ChainSettingsModal.module.css';

// Props for DownloadInProgressModal
interface DownloadInProgressModalProps {
  downloads: DownloadEntry[];
  onClose: () => void;
  onForceQuit: () => void;
  isOpen: boolean;
}

const DownloadInProgressModal: React.FC<DownloadInProgressModalProps> = ({ downloads, onClose, onForceQuit, isOpen }) => {
  const { isDarkMode } = useTheme();
  
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className={`${styles.modalOverlay} ${styles.dangerOverlay} ${isDarkMode ? styles.dark : styles.light}`}
      onClick={handleOverlayClick}
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Downloads in Progress</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.warningText}>
            Quitting now will cancel all active downloads. Are you sure you want to proceed?
          </p>
        </div>
        <div className={styles.buttonContainer}>
          <button onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button onClick={onForceQuit} className={styles.resetBtn}>
            Force Quit
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadInProgressModal;
