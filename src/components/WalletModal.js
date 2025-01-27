import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideWalletModal, setWalletStatus } from '../store/walletModalSlice';
import styles from './WalletModal.module.css';
import { X, Eye, EyeOff, Trash2 } from 'lucide-react';

const WalletModal = () => {
  const dispatch = useDispatch();
  const { isVisible, isLoading, error } = useSelector(state => state.walletModal);
  const [revealedMnemonics, setRevealedMnemonics] = useState({
    master: false,
    layer1: false,
    layer2: false
  });

  const toggleMnemonic = (key) => {
    setRevealedMnemonics(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  const handleClose = () => {
    dispatch(hideWalletModal());
  };

  const handleOverlayClick = e => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Starters</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <p className={styles.description}>View and manage your wallet starters</p>

        {error && <div className={styles.error}>{error}</div>}
        {isLoading && <div className={styles.loading}>Loading...</div>}

        <div className={styles.starterTable}>
          {/* Starter section */}
          <div className={styles.sectionHeader}>
            <div className={styles.starterCol}>Starter</div>
            <div className={styles.mnemonicCol}>Mnemonic</div>
            <div className={styles.actionsCol}></div>
          </div>
          <div className={styles.tableRow}>
            <div className={styles.starterCol}>Master</div>
            <div className={styles.mnemonicCol}>
              {revealedMnemonics.master ? 'abandon ability able about above absent absorb abstract absurd abuse access accident' : '••••••••••••'}
            </div>
            <div className={styles.actionsCol}>
              <button 
                className={styles.iconButton} 
                title={revealedMnemonics.master ? "Hide" : "Reveal"}
                onClick={() => toggleMnemonic('master')}
              >
                {revealedMnemonics.master ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button className={styles.deleteIconButton} title="Delete Starter">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Layer 1 section */}
          <div className={styles.sectionHeader}>
            <div className={styles.starterCol}>Layer 1</div>
            <div className={styles.mnemonicCol}>Mnemonic</div>
            <div className={styles.actionsCol}></div>
          </div>
          <div className={styles.tableRow}>
            <div className={styles.starterCol}>Bitcoin Core (Patched)</div>
            <div className={styles.mnemonicCol}>
              {revealedMnemonics.layer1 ? 'abandon ability able about above absent absorb abstract absurd abuse access accident account acid acquire across act action actor adapt add addict address adjust advance' : '••••••••••••'}
            </div>
            <div className={styles.actionsCol}>
              <button 
                className={styles.iconButton} 
                title={revealedMnemonics.layer1 ? "Hide" : "Reveal"}
                onClick={() => toggleMnemonic('layer1')}
              >
                {revealedMnemonics.layer1 ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button className={styles.deleteIconButton} title="Delete Starter">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Layer 2 section */}
          <div className={styles.sectionHeader}>
            <div className={styles.starterCol}>Layer 2</div>
            <div className={styles.mnemonicCol}>Mnemonic</div>
            <div className={styles.actionsCol}></div>
          </div>
          <div className={styles.tableRow}>
            <div className={styles.starterCol}>Lightning</div>
            <div className={styles.mnemonicCol}>
              {revealedMnemonics.layer2 ? 'abandon ability able about above absent absorb abstract absurd abuse access accident' : '••••••••••••'}
            </div>
            <div className={styles.actionsCol}>
              <button 
                className={styles.iconButton} 
                title={revealedMnemonics.layer2 ? "Hide" : "Reveal"}
                onClick={() => toggleMnemonic('layer2')}
              >
                {revealedMnemonics.layer2 ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button className={styles.deleteIconButton} title="Delete Starter">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WalletModal;
