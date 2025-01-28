import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideSettingsModal } from '../store/settingsModalSlice';
import { toggleShowQuotes } from '../store/settingsSlice';
import { setAvailableUpdates, setIsChecking, setLastChecked, setError } from '../store/updateSlice';
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
  const { isChecking, lastChecked } = useSelector((state) => state.updates);

  const handleClose = () => {
    dispatch(hideSettingsModal());
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleCheckUpdates = async () => {
    try {
      dispatch(setIsChecking(true));
      const result = await window.electronAPI.checkForUpdates();
      if (result.success) {
        dispatch(setAvailableUpdates(result.updates));
        dispatch(setLastChecked(Date.now()));
      } else {
        dispatch(setError(result.error));
      }
    } catch (error) {
      dispatch(setError(error.message));
    } finally {
      dispatch(setIsChecking(false));
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

        <div className={styles.updateSection}>
          <button 
            className={styles.updateButton} 
            onClick={handleCheckUpdates}
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : 'Check for Updates'}
          </button>
          {lastChecked && (
            <span className={styles.lastChecked}>
              Last checked: {new Date(lastChecked).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className={styles.settingGroup}>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Master Wallet Directory</span>
            <button 
              className={styles.updateButton}
              onClick={async () => {
                try {
                  const result = await window.electronAPI.invoke('open-wallet-starters-dir');
                  if (!result.success) {
                    throw new Error(result.error);
                  }
                } catch (error) {
                  console.error('Error opening master wallet directory:', error);
                }
              }}
            >
              Open
            </button>
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
