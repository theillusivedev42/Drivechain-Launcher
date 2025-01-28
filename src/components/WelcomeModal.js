import React, { useState, useEffect } from 'react';
import styles from './WelcomeModal.module.css';

const WelcomeModal = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState('default'); // 'default', 'restore', or 'advanced'
  const [mnemonic, setMnemonic] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  
  // Advanced mode states
  const [isHexMode, setIsHexMode] = useState(false);
  const [entropyInput, setEntropyInput] = useState('');
  const [preview, setPreview] = useState(null);

  // Validate hex input
  const isValidHexInput = (value) => {
    return /^[0-9a-fA-F]*$/.test(value) && // Valid hex chars
           value.length <= 64 &&            // Max length
           (value.length === 0 || value.length % 8 === 0); // Multiple of 8 if not empty
  };

  // Update preview when entropy input changes
  useEffect(() => {
    const updatePreview = async () => {
      if (!entropyInput) {
        setPreview(null);
        return;
      }

      try {
        const result = await window.electronAPI.previewWallet({
          input: entropyInput,
          isHexMode
        });

        if (result.success) {
          setPreview(result.data);
          setError('');
        } else {
          setError(result.error);
          setPreview(null);
        }
      } catch (error) {
        console.error('Error previewing wallet:', error);
        setError(error.message || 'Failed to preview wallet');
        setPreview(null);
      }
    };

    updatePreview();
  }, [entropyInput, isHexMode]);

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
                <li>Real-time BIP39 preview</li>
                <li>Technical details display</li>
              </ul>
              <p className={styles.warningText}>
                ⚠️ Only use this if you understand HD wallets and BIP39
              </p>
            </div>

            <div className={styles.modeToggle}>
              <label>
                <input
                  type="radio"
                  checked={!isHexMode}
                  onChange={() => {
                    setIsHexMode(false);
                    setEntropyInput('');
                    setPreview(null);
                  }}
                />
                Text Mode
              </label>
              <label>
                <input
                  type="radio"
                  checked={isHexMode}
                  onChange={() => {
                    setIsHexMode(true);
                    setEntropyInput('');
                    setPreview(null);
                  }}
                />
                Hex Mode
              </label>
            </div>

            <div className={styles.inputGroup}>
              <textarea
                value={entropyInput}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isHexMode && !isValidHexInput(value)) return;
                  setEntropyInput(value);
                }}
                placeholder={isHexMode 
                  ? "Enter hex (up to 64 characters, multiples of 8)"
                  : "Enter text to be hashed into entropy"
                }
                className={styles.entropyInput}
              />
              {isHexMode && (
                <button
                  className={styles.randomButton}
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI.generateRandomEntropy();
                      if (result.success) {
                        setEntropyInput(result.data);
                      } else {
                        setError(result.error);
                      }
                    } catch (error) {
                      console.error('Error generating random entropy:', error);
                      setError(error.message || 'Failed to generate random entropy');
                    }
                  }}
                >
                  Generate Random
                </button>
              )}
            </div>

            {preview && (
              <div className={styles.previewSection}>
                <div className={styles.previewGrid}>
                  {preview.words.map((word, i) => (
                    <div key={i} className={styles.wordCell}>
                      <div className={styles.word}>{word}</div>
                      <div className={styles.binary}>
                        {i === preview.words.length - 1 ? (
                          <>
                            <span>{preview.lastWordBinary.slice(0, -4)}</span>
                            <span className={styles.checksum}>
                              {preview.lastWordBinary.slice(-4)}
                            </span>
                          </>
                        ) : (
                          preview.binaryStrings[i]
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.technicalInfo}>
                  <div>
                    <strong>BIP39 Binary:</strong>
                    <code>{preview.bip39Bin}</code>
                  </div>
                  <div>
                    <strong>Checksum:</strong>
                    <code>{preview.checksumBits}</code>
                  </div>
                  <div>
                    <strong>Master Key:</strong>
                    <code>{preview.masterKey}</code>
                  </div>
                </div>
              </div>
            )}

            <button 
              className={styles.advancedButton}
              onClick={async () => {
                try {
                  setIsGenerating(true);
                  setError('');
                  
                  const result = await window.electronAPI.createAdvancedWallet({
                    input: entropyInput,
                    isHexMode
                  });

                  if (result.success) {
                    onClose();
                  } else {
                    throw new Error(result.error);
                  }
                } catch (error) {
                  console.error('Error creating wallet:', error);
                  setError(error.message || 'Failed to create wallet');
                } finally {
                  setIsGenerating(false);
                }
              }}
              disabled={isGenerating || !entropyInput || !preview}
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
