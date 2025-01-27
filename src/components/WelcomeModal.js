import React, { useState } from 'react';
import styles from './WelcomeModal.module.css';

const WelcomeModal = ({ isOpen, onClose }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');

  if (!isOpen) return null;

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
        
        <button className={styles.generateButton} onClick={onClose}>
          Generate Wallet
        </button>

        <div 
          className={styles.advancedToggle}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span className={styles.advancedText}>{showAdvanced ? 'Hide advanced' : 'Show advanced'}</span>
          <span className={`${styles.chevron} ${showAdvanced ? styles.up : ''}`}>▼</span>
        </div>

        {showAdvanced && (
          <div className={styles.advancedSection}>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={input1}
                onChange={(e) => setInput1(e.target.value)}
                placeholder="Option 1"
                className={styles.input}
              />
            </div>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={input2}
                onChange={(e) => setInput2(e.target.value)}
                placeholder="Option 2"
                className={styles.input}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeModal;
