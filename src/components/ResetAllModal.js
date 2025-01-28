import React from 'react';
import { X } from 'lucide-react';
import styles from './SettingsModal.module.css'; // Reuse settings modal styles

const ResetAllModal = ({ onConfirm, onClose }) => {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Reset All Chains</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.settingGroup}>
          <p style={{ marginBottom: '20px', color: 'var(--text-color)' }}>
            Warning: This will reset all chains to their default state and delete ALL data, including:
          </p>
          <ul style={{ marginBottom: '20px', color: 'var(--text-color)', listStyle: 'disc', paddingLeft: '40px' }}>
            <li>All blockchain data</li>
            <li>All wallet data and private keys</li>
            <li>All transaction history</li>
            <li>All custom chain configurations</li>
          </ul>
          <p style={{ marginBottom: '20px', color: '#dc3545', fontWeight: 'bold' }}>
            This action cannot be undone. Make sure you have backed up any important data.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                background: 'rgba(128, 128, 128, 0.2)',
                color: 'var(--text-color)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                background: '#dc3545',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Reset All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetAllModal;
