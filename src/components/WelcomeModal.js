import React, { useState } from 'react';
import styles from './WelcomeModal.module.css';

const WelcomeModal = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState('default'); // 'default', 'restore', or 'advanced'
  const [mnemonic, setMnemonic] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const isValidMnemonic = (mnemonic) => {
    const words = mnemonic.trim().split(' ');
    return words.length === 12 || words.length === 24;
  };

  if (!isOpen) return null;

  const handleGenerateWallet = async () => {
    try {
      setIsGenerating(true);
      setError('');
      
      // Generate master wallet (which automatically generates all chain wallets)
      const result = await window.electronAPI.createMasterWallet();
      if (!result.success) {
        throw new Error(result.error);
      }
      onClose();
    } catch (error) {
      console.error('Error generating wallet:', error);
      setError(error.message || 'Failed to generate wallet');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestoreWallet = async () => {
    try {
      setIsGenerating(true);
      setError('');

      if (!mnemonic) {
        throw new Error('Please enter a mnemonic phrase');
      }

      // Import master wallet (which automatically generates all chain wallets)
      const result = await window.electronAPI.importMasterWallet(mnemonic, passphrase);
      if (!result.success) {
        throw new Error(result.error);
      }
      onClose();
    } catch (error) {
      console.error('Error restoring wallet:', error);
      setError(error.message || 'Failed to restore wallet');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Welcome to DC Launcher! 🚀</h2>
        <div className={styles.modalBody}>
          <p>
            DC Launcher is your all-in-one tool for managing Drivechain nodes. Start and stop nodes, 
            manage wallets, and interact with both mainchain and sidechains through a simple interface. 
            Let's begin by setting up your wallet!
          </p>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <button 
          className={styles.generateButton} 
          onClick={handleGenerateWallet}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Wallet'}
        </button>

        <div className={styles.optionsContainer}>
          <div 
            className={styles.optionToggle}
            onClick={() => setActiveSection(activeSection === 'restore' ? 'default' : 'restore')}
          >
            <span className={styles.optionText}>
              {activeSection === 'restore' ? 'Hide restore options' : 'Restore wallet'}
            </span>
            <span className={`${styles.chevron} ${activeSection === 'restore' ? styles.up : ''}`}>▼</span>
          </div>

          <div 
            className={styles.optionToggle}
            onClick={() => setActiveSection(activeSection === 'advanced' ? 'default' : 'advanced')}
          >
            <span className={styles.optionText}>
              {activeSection === 'advanced' ? 'Hide advanced options' : 'Advanced mode'}
            </span>
            <span className={`${styles.chevron} ${activeSection === 'advanced' ? styles.up : ''}`}>▼</span>
          </div>
        </div>

        {activeSection === 'restore' && (
          <div className={styles.advancedSection}>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={mnemonic}
                onChange={(e) => {
                  const value = e.target.value;
                  setMnemonic(value);
                  // Clear error if input becomes valid
                  if (isValidMnemonic(value)) {
                    setError('');
                  }
                }}
                placeholder="Enter BIP39 Mnemonic (12 or 24 words)"
                className={styles.input}
              />
            </div>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter optional passphrase"
                className={styles.input}
              />
            </div>
            <div className={styles.restoreButtonContainer}>
              <button 
                className={styles.restoreButton} 
                onClick={handleRestoreWallet}
                disabled={isGenerating || !isValidMnemonic(mnemonic)}
              >
                {isGenerating ? 'Restoring...' : 'Restore Wallet'}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'advanced' && (
          <div className={styles.advancedSection}>
            <div className={styles.warningBox}>
              <p>Advanced mode provides more control over wallet generation:</p>
              <ul>
                <li>Custom entropy source</li>
                <li>Manual derivation paths</li>
                <li>Chain-specific settings</li>
              </ul>
              <p className={styles.warningText}>
                ⚠️ Only use this if you understand HD wallets and BIP39
              </p>
            </div>
            <button 
              className={styles.advancedButton}
              onClick={() => {/* TODO: Implement advanced wallet creation */}}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Create Advanced Wallet'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeModal;
