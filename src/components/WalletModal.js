import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideWalletModal, setWalletStatus } from '../store/walletModalSlice';
import styles from './FaucetModal.module.css';
import { X } from 'lucide-react';

const WalletModal = () => {
  const dispatch = useDispatch();
  const { isVisible, isLoading, error } = useSelector(state => state.walletModal);
  const [masterWallet, setMasterWallet] = useState(null);
  const [mnemonic, setMnemonic] = useState('');
  const [passphrase, setPassphrase] = useState('');

  useEffect(() => {
    if (isVisible) {
      loadMasterWallet();
    } else {
      resetState();
    }
  }, [isVisible]);

  const resetState = () => {
    setMnemonic('');
    setPassphrase('');
    dispatch(setWalletStatus({ error: null, success: null }));
  };

  const loadMasterWallet = async () => {
    try {
      dispatch(setWalletStatus({ isLoading: true }));
      const result = await window.electronAPI.getMasterWallet();
      if (result.success) {
        setMasterWallet(result.data);
        dispatch(setWalletStatus({ error: null }));
      }
    } catch (err) {
      dispatch(setWalletStatus({ error: err.message }));
    } finally {
      dispatch(setWalletStatus({ isLoading: false }));
    }
  };

  const createNewWallet = async () => {
    try {
      dispatch(setWalletStatus({ isLoading: true }));
      const result = await window.electronAPI.createMasterWallet();
      if (result.success) {
        setMasterWallet(result.data);
        dispatch(setWalletStatus({ error: null }));
      }
    } catch (err) {
      dispatch(setWalletStatus({ error: err.message }));
    } finally {
      dispatch(setWalletStatus({ isLoading: false }));
    }
  };

  const importWallet = async () => {
    if (!mnemonic) {
      dispatch(setWalletStatus({ error: 'Please enter a mnemonic phrase' }));
      return;
    }
    try {
      dispatch(setWalletStatus({ isLoading: true }));
      const result = await window.electronAPI.importMasterWallet(mnemonic, passphrase);
      if (result.success) {
        setMasterWallet(result.data);
        setMnemonic('');
        setPassphrase('');
        dispatch(setWalletStatus({ error: null }));
      }
    } catch (err) {
      dispatch(setWalletStatus({ error: err.message }));
    } finally {
      dispatch(setWalletStatus({ isLoading: false }));
    }
  };

  const deleteWallet = async () => {
    if (!window.confirm('Are you sure you want to delete this wallet? This action cannot be undone.')) {
      return;
    }
    try {
      dispatch(setWalletStatus({ isLoading: true }));
      const result = await window.electronAPI.deleteMasterWallet();
      if (result.success) {
        setMasterWallet(null);
        dispatch(setWalletStatus({ error: null }));
      }
    } catch (err) {
      dispatch(setWalletStatus({ error: err.message }));
    } finally {
      dispatch(setWalletStatus({ isLoading: false }));
    }
  };

  const deriveChainWallet = async (chainId) => {
    try {
      dispatch(setWalletStatus({ isLoading: true }));
      const result = await window.electronAPI.deriveChainWallet(chainId);
      if (result.success) {
        await loadMasterWallet();
        dispatch(setWalletStatus({ error: null }));
      }
    } catch (err) {
      dispatch(setWalletStatus({ error: err.message }));
    } finally {
      dispatch(setWalletStatus({ isLoading: false }));
    }
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
          <h2 className={styles.modalTitle}>Wallet Management</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : !masterWallet ? (
          <div>
            <div className={styles.section}>
              <h3>Create New Wallet</h3>
              <div className={styles.buttonContainer}>
                <button 
                  className={styles.submitButton}
                  onClick={createNewWallet}
                >
                  Create New Wallet
                </button>
              </div>
            </div>

            <div className={styles.section}>
              <h3>Import Existing Wallet</h3>
              <div className={styles.inputGroup}>
                <label>Mnemonic Phrase:</label>
                <input
                  type="text"
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Enter your 12-word mnemonic phrase"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Passphrase (optional):</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter passphrase if you have one"
                />
              </div>
              <div className={styles.buttonContainer}>
                <button 
                  className={styles.submitButton}
                  onClick={importWallet}
                >
                  Import Wallet
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className={styles.section}>
              <h3>Master Wallet</h3>
              <div className={styles.walletInfo}>
                <div>
                  <strong>Mnemonic:</strong> {masterWallet.mnemonic}
                </div>
                {masterWallet.bip39_csum && (
                  <div>
                    <strong>Checksum:</strong> {masterWallet.bip39_csum}
                  </div>
                )}
              </div>
              <div className={styles.buttonContainer}>
                <button 
                  className={styles.deleteButton}
                  onClick={deleteWallet}
                >
                  Delete Wallet
                </button>
              </div>
            </div>

            <div className={styles.section}>
              <h3>Chain Wallets</h3>
              <div className={styles.buttonContainer}>
                <button 
                  className={styles.submitButton}
                  onClick={() => deriveChainWallet('bitcoin')}
                >
                  Derive Bitcoin Core Wallet
                </button>
                <button 
                  className={styles.submitButton}
                  onClick={() => deriveChainWallet('testchain')}
                >
                  Derive Testchain Wallet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletModal;
