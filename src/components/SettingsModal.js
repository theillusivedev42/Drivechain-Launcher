import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideSettingsModal } from '../store/settingsModalSlice';
import { toggleShowQuotes } from '../store/settingsSlice';
import { useTheme } from '../contexts/ThemeContext';
import styles from './SettingsModal.module.css';
import { X } from 'lucide-react';
import ResetAllModal from './ResetAllModal';

const SettingsModal = () => {
  const [showResetModal, setShowResetModal] = useState(false);
  const dispatch = useDispatch();
  const { isVisible } = useSelector((state) => state.settingsModal);
  const { showQuotes } = useSelector((state) => state.settings);
  const { isDarkMode, toggleTheme } = useTheme();

  const handleClose = () => {
    dispatch(hideSettingsModal());
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleReset = async () => {
    setShowResetModal(true);
  };

  const handleConfirmReset = async () => {
    try {
      const chains = await window.electronAPI.getConfig();
      for (const chain of chains.chains) {
        if (chain.enabled) {
          // First stop the chain if it's running
          const status = await window.electronAPI.getChainStatus(chain.id);
          if (status === 'running' || status === 'ready') {
            await window.electronAPI.stopChain(chain.id);
          }
          // Then reset it
          await window.electronAPI.resetChain(chain.id);
        }
      }
      setShowResetModal(false);
      handleClose(); // Close the settings modal after reset
    } catch (error) {
      console.error('Failed to reset all chains:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Settings</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.settingGroup}>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Show Quotes</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={showQuotes}
                onChange={() => dispatch(toggleShowQuotes())}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Show Logs</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                onChange={() => console.log('Show logs toggled')}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Dark Mode</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={toggleTheme}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>

        <button className={styles.resetButton} onClick={handleReset}>
          Reset Everything
        </button>
      </div>
      {showResetModal && (
        <ResetAllModal
          onConfirm={handleConfirmReset}
          onClose={() => setShowResetModal(false)}
        />
      )}
    </div>
  );
};

export default SettingsModal;
