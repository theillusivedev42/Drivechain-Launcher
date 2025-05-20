import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import styles from './ChainSettingsModal.module.css';
import { X, ExternalLink, FolderOpen } from 'lucide-react';
import ResetConfirmModal from './ResetConfirmModal';

// Props for ChainSettingsModal
interface ChainSettingsModalProps {
  chain: any;
  onClose: () => void;
  onOpenDataDir: (chainId: string) => Promise<void> | void;
  onOpenWalletDir: (chainId: string) => Promise<void> | void;
  onReset: (chainId: string) => Promise<void> | void;
}

const ChainSettingsModal: React.FC<ChainSettingsModalProps> = ({
  chain,
  onClose,
  onOpenDataDir,
  onOpenWalletDir,
  onReset,
}) => {
  const { isDarkMode } = useTheme();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [originalChain] = useState(chain); // Keep track of the original chain
  const [currentChain, setCurrentChain] = useState(chain);
  
  // Reset currentChain when the chain prop changes
  useEffect(() => {
    setCurrentChain(chain);
  }, [chain]);

  // Debug function to log chain data
  const logChainData = (chainData: any, label: string): void => {
    console.log(`${label} Chain Data:`, chainData);
  };

  const handleResetConfirm = (): void => {
    onReset(currentChain.id);
    setShowResetConfirm(false);
    onClose();
  };

  const handleResetChain = () => {
    setShowResetConfirm(true);
  };

  const handleOpenRepo = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    e.preventDefault();
    window.open(currentChain.repo_url, '_blank', 'noopener,noreferrer');
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div
        className={`${styles.modalOverlay} ${isDarkMode ? styles.dark : styles.light}`}
        onClick={handleOverlayClick}
      >
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
              <h2 className={styles.modalTitle}>
                {currentChain.display_name} Settings
              </h2>
              {originalChain.id === 'bitwindow' && (
                <div style={{ 
                  fontSize: '1em',
                  color: '#888888',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '20px'
                }}>
                  <button 
                    onClick={async () => {
                      if (currentChain.id === 'bitcoin') {
                        // Return to BitWindow settings
                        setCurrentChain(originalChain);
                      } else {
                        // Get Bitcoin chain data using Electron API
                        try {
                          let bitcoinChain = null;
                          if ((window as any).cardData) {
                            bitcoinChain = (window as any).cardData.find((c: any) => c.id === 'bitcoin');
                          }
                          
                          if (bitcoinChain) {
                            const fullDataDir = await (window as any).electronAPI.getFullDataDir('bitcoin');
                            const walletDir = await (window as any).electronAPI.getWalletDir('bitcoin');
                            const binaryDir = await (window as any).electronAPI.getBinaryDir('bitcoin');
                            
                            const formattedChain = {
                              ...bitcoinChain,
                              dataDir: fullDataDir,
                              walletDir: walletDir,
                              binaryDir: binaryDir,
                              status: 'running',
                              repo_url: 'https://github.com/bitcoin/bitcoin'
                            };
                            
                            logChainData(formattedChain, 'Bitcoin');
                            setCurrentChain(formattedChain);
                          }
                        } catch (error) {
                          console.error('Failed to fetch Bitcoin directories:', error);
                        }
                      }
                    }}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#888888', 
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '0 5px',
                      fontFamily: 'inherit'
                    }}
                  >
                    {currentChain.id === 'bitcoin' ? 'BitWindow' : 'Bitcoin Core'}
                  </button>
                  <span style={{ margin: '0 5px' }}>|</span>
                  <button 
                    onClick={async () => {
                      if (currentChain.id === 'enforcer') {
                        // Return to BitWindow settings
                        setCurrentChain(originalChain);
                      } else {
                        // Get Enforcer chain data using Electron API
                        try {
                          let enforcerChain = null;
                          if ((window as any).cardData) {
                            enforcerChain = (window as any).cardData.find((c: any) => c.id === 'enforcer');
                          }
                          
                          if (enforcerChain) {
                            const fullDataDir = await (window as any).electronAPI.getFullDataDir('enforcer');
                            const walletDir = await (window as any).electronAPI.getWalletDir('enforcer');
                            const binaryDir = await (window as any).electronAPI.getBinaryDir('enforcer');
                            
                            const formattedChain = {
                              ...enforcerChain,
                              dataDir: fullDataDir,
                              walletDir: walletDir,
                              binaryDir: binaryDir,
                              status: 'running',
                              repo_url: 'https://github.com/LayerTwo-Labs/bip300301_enforcer'
                            };
                            
                            logChainData(formattedChain, 'Enforcer');
                            setCurrentChain(formattedChain);
                          }
                        } catch (error) {
                          console.error('Failed to fetch Enforcer directories:', error);
                        }
                      }
                    }}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#888888', 
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '0 5px',
                      fontFamily: 'inherit'
                    }}
                  >
                    {currentChain.id === 'enforcer' ? 'BitWindow' : 'Enforcer'}
                  </button>
                </div>
              )}
            </div>
            <button className={styles.closeButton} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Repository:</span>
              <a
                href={currentChain.repo_url}
                onClick={handleOpenRepo}
                className={styles.link}
                title={currentChain.repo_url}
              >
                <span className={styles.linkText}>{currentChain.repo_url}</span>
                <ExternalLink size={14} className={styles.externalIcon} />
              </a>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Wallet Directory:</span>
              <span className={styles.dataDir} title={currentChain.walletDir}>
                <span className={styles.pathText}>{currentChain.walletDir}</span>
                <button
                  className={styles.dirButton}
                  onClick={() => onOpenWalletDir(currentChain.id)}
                  title="Open wallet directory"
                >
                  <FolderOpen size={14} />
                </button>
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Data Directory:</span>
              <span className={styles.dataDir} title={currentChain.dataDir}>
                <span className={styles.pathText}>{currentChain.dataDir}</span>
                <button
                  className={styles.dirButton}
                  onClick={() => onOpenDataDir(currentChain.id)}
                  title="Open data directory"
                >
                  <FolderOpen size={14} />
                </button>
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Binary Directory:</span>
              <span className={styles.dataDir} title={currentChain.binaryDir}>
                <span className={styles.pathText}>{currentChain.binaryDir}</span>
                <button
                  className={styles.dirButton}
                  onClick={() => (window as any).electronAPI.openBinaryDir(currentChain.id)}
                  title="Open binary directory"
                >
                  <FolderOpen size={14} />
                </button>
              </span>
            </div>
          </div>
          {currentChain.id !== 'bitcoin' && currentChain.id !== 'enforcer' && (
            <div className={styles.buttonContainer}>
              <button
                onClick={handleResetChain}
                className={`btn ${styles.resetBtn}`}
                disabled={
                  currentChain.status === 'not_downloaded' ||
                  currentChain.status === 'downloading' ||
                  currentChain.status === 'extracting' ||
                  currentChain.status === 'stopping'
                }
                style={{
                  cursor: currentChain.status === 'not_downloaded' ||
                          currentChain.status === 'downloading' ||
                          currentChain.status === 'extracting' ||
                          currentChain.status === 'stopping' 
                    ? 'not-allowed' 
                    : 'pointer'
                }}
              >
                {currentChain.id === 'bitwindow' ? 'Reset Chains' : 'Reset Chain'}
              </button>
            </div>
          )}
        </div>
      </div>
      {showResetConfirm && (
        <ResetConfirmModal
          chainName={currentChain.display_name}
          chainId={currentChain.id}
          onConfirm={handleResetConfirm}
          onClose={() => setShowResetConfirm(false)}
        />
      )}
    </>
  );
};

export default ChainSettingsModal;
