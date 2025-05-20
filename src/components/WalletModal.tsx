import React, { useState, useEffect, type FC, type MouseEvent, type WheelEvent } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import styles from './WalletModal.module.css';
import { Eye, EyeOff, Info, X } from 'lucide-react';

// Type for configuration chain info
interface ConfigChain { id: string; chain_layer?: number; slot?: number; [key: string]: any; }

const WalletModal: FC = () => {
  const { isLoading, error } = useSelector((state: RootState) => state.walletModal);
  const [copiedStates, setCopiedStates] = useState<Record<string, {copied: boolean; x: number; y: number}>>({});
  const [revealedPaths, setRevealedPaths] = useState<Record<string, boolean>>({ master: false });
  const [, setConfig] = useState<any>(null);
  const [derivationPaths, setDerivationPaths] = useState<Record<string, string>>({});
  const [mnemonics, setMnemonics] = useState<Record<string, string>>({ master: '••••••••••••' });
  const [chainsList, setChainsList] = useState<any[]>([]);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Load config on component mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const result = await (window as any).electronAPI.getConfig() as { chains: ConfigChain[] };
        setConfig(result);
        
        if (result && result.chains) {
          // Find the L1 chain (enforcer)
          const enforcerChain = result.chains.find((chain: ConfigChain) => chain.id === 'enforcer');
          
          // Setup initial paths object with L1 (hardcoded path as specified)
          const paths: Record<string, string> = {};
          if (enforcerChain) {
            paths[enforcerChain.id] = "m/44'/0'/256'";
          }
          
          // Find all L2 chains and compute their paths based on slot
          const l2Chains = result.chains.filter((chain: ConfigChain) => chain.chain_layer === 2 && chain.slot);
          
          // Process L2 chains
          l2Chains.forEach((chain: ConfigChain) => {
            paths[chain.id] = `m/44'/0'/${chain.slot}'`;
          });
          
          setDerivationPaths(paths);
          
          // Initialize revealed state for all chains
          const initialRevealState: Record<string, boolean> = { master: false };
          if (enforcerChain) {
            initialRevealState[enforcerChain.id] = false;
          }
          
          l2Chains.forEach((chain: ConfigChain) => {
            initialRevealState[chain.id] = false;
          });
          
          setRevealedPaths(initialRevealState);
          
          // Setup the chains list for rendering
          const chains = [] as any[];
          
          // Add L1 chain
          if (enforcerChain) {
            chains.push({
              ...enforcerChain,
              type: 'L1',
              display_name: 'Bitcoin Core (Patched)'
            });
          }
          
          // Add L2 chains
          l2Chains.forEach((chain: ConfigChain) => {
            chains.push({
              ...chain,
              type: 'L2'
            });
          });
          
          setChainsList(chains);
        }
      } catch (error) {
        console.error("Error fetching chain config:", error);
      }
    };
    fetchConfig();
  }, []);

  const handleCopy = async (text: string, type: string, event: MouseEvent<HTMLSpanElement>) => {
    try {
      await navigator.clipboard.writeText(text);
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const tooltipX = rect.left + (rect.width / 2);
      const tooltipY = rect.top;
      setCopiedStates(prev => ({ 
        ...prev, 
        [type]: { 
          copied: true,
          x: tooltipX,
          y: tooltipY
        }
      }));
      setTimeout(() => {
        setCopiedStates(prev => { const { [type]: _, ...rest } = prev; return rest; });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleWheel = (event: WheelEvent<HTMLSpanElement>) => {
    // Get the parent mnemonicCol div
    const mnemonicCol = (event.target as Element).closest(`.${styles.mnemonicCol}`);
    if (mnemonicCol) {
      // Prevent the default vertical scroll
      event.preventDefault();
      // Scroll horizontally instead
      mnemonicCol.scrollLeft += event.deltaY;
    }
  };
  
  const toggleReveal = async (key: string) => {
    // Toggle the current path's reveal state
    setRevealedPaths(prev => ({
      ...prev,
      [key]: !prev[key]
    }));

    // For master key, we need to fetch the actual mnemonic
    if (key === 'master' && !revealedPaths[key] && mnemonics[key] === '••••••••••••') {
      try {
        const result = await (window as any).electronAPI.getWalletStarter('master');
        if (result.success) {
          setMnemonics(prev => ({
            ...prev,
            master: result.data
          }));
        }
      } catch (error) {
        console.error('Error fetching mnemonic:', error);
      }
    }
    
    // For chain wallets, we don't need to fetch actual mnemonics, just reveal their paths
  };

  const getChainType = (chain: any) => {
    if (chain.type === 'L1') {
      return styles.l1Badge;
    } else if (chain.type === 'L2') {
      return styles.l2Badge;
    } else {
      return '';
    }
  };

  const getChainTypeText = (chain: any) => {
    return chain.type;
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}
        {isLoading && <div className={styles.loading}>Loading...</div>}

        <div className={styles.starterTable} style={{ marginTop: '20px' }}>
          {/* Starter section */}
          <div className={styles.sectionHeader}>
            <div className={styles.typeCol}>
              <button 
                className={styles.infoButton} 
                onClick={() => setShowInfoModal(true)}
                title="About Wallet Starters"
              >
                <Info size={16} />
              </button>
            </div>
            <div className={styles.starterCol}>Starter</div>
            <div className={styles.mnemonicCol}>Mnemonic / Derivation Path</div>
            <div className={styles.actionsCol}></div>
          </div>
          
          {/* Master seed row */}
          <div className={styles.tableRow}>
            <div className={styles.typeCol}>
              <div className={`${styles.chainTypeBadge} ${styles.masterBadge}`}>M</div>
            </div>
            <div className={styles.starterCol}>Master</div>
            <div className={styles.mnemonicCol}>
              <span 
                className={`${revealedPaths.master ? styles.copyableText : ''} ${copiedStates.master?.copied ? styles.copied : ''}`}
                onClick={(e) => revealedPaths.master && handleCopy(mnemonics.master, 'master', e)}
                onWheel={handleWheel}
              >
                {revealedPaths.master ? mnemonics.master : '••••••••••••'}
                {copiedStates.master?.copied && (
                  <div 
                    className={styles.copyTooltip} 
                    style={{
                      left: copiedStates.master.x + 'px',
                      top: copiedStates.master.y + 'px'
                    }}
                  >
                    Copied!
                  </div>
                )}
              </span>
            </div>
            <div className={styles.actionsCol}>
              <button 
                className={styles.iconButton} 
                title={revealedPaths.master ? "Hide" : "Reveal"}
                onClick={() => toggleReveal('master')}
              >
                {revealedPaths.master ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Chain rows - dynamically generated based on config */}
          {chainsList.map(chain => (
            <div key={chain.id} className={styles.tableRow}>
              <div className={styles.typeCol}>
                <div className={`${styles.chainTypeBadge} ${getChainType(chain)}`}>
                  {getChainTypeText(chain)}
                </div>
              </div>
              <div className={styles.starterCol}>{chain.display_name}</div>
              <div className={styles.mnemonicCol}>
                <span 
                  className={`${revealedPaths[chain.id] ? styles.copyableText : ''} ${copiedStates[chain.id]?.copied ? styles.copied : ''}`}
                  onClick={(e) => revealedPaths[chain.id] && handleCopy(`derived from Master at ${derivationPaths[chain.id]}`, chain.id, e)}
                  onWheel={handleWheel}
                >
                  {revealedPaths[chain.id]
                    ? `derived from Master at ${derivationPaths[chain.id]}`
                    : '••••••••••••'}
                  {copiedStates[chain.id]?.copied && (
                    <div 
                      className={styles.copyTooltip} 
                      style={{
                        left: copiedStates[chain.id].x + 'px',
                        top: copiedStates[chain.id].y + 'px'
                      }}
                    >
                      Copied!
                    </div>
                  )}
                </span>
              </div>
              <div className={styles.actionsCol}>
                <button 
                  className={styles.iconButton} 
                  title={revealedPaths[chain.id] ? "Hide" : "Reveal"}
                  onClick={() => toggleReveal(chain.id)}
                >
                  {revealedPaths[chain.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Information Modal */}
      {showInfoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowInfoModal(false)}>
          <div className={styles.infoModalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closeModalButton} 
              onClick={() => setShowInfoModal(false)}
            >
              <X size={20} />
            </button>
            <h2>Wallet Information</h2>
            <div className={styles.infoContent}>
              <div className={styles.alertBox}>
                <strong>Important:</strong> You must back up your Master Seed if you want to restore your drivechain wallets.
              </div>
              
              <p className={styles.securityNote}>
                Your wallet seeds are stored locally and are never transmitted over the internet.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletModal;
