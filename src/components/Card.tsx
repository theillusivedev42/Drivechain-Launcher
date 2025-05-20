// @ts-nocheck
import React, { useState, useCallback, useEffect, useRef, ReactNode, MouseEvent } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSelector } from 'react-redux';
import ChainSettingsModal from './ChainSettingsModal';
import ForceStopModal from './ForceStopModal';
import ResetConfirmModal from './ResetConfirmModal';
import SettingsIcon from './SettingsIcon';
import GitHubIcon from './GitHubIcon';
import TrashIcon from './TrashIcon';
import Tooltip from './Tooltip';
import './StatusLight.css';
import styles from './Card.module.css';
import buttonStyles from './Button.module.css';
import type { DownloadEntry } from '../store/downloadSlice';

// Props for Card component
interface CardProps {
  chain: any;
  onUpdateChain: (chainId: string, update: { status: string; progress?: number }) => void;
  onDownload: (chainId: string) => Promise<void>;
  onStart: (chainId: string) => Promise<void>;
  onStop: (chainId: string) => Promise<void>;
  onOpenWalletDir: (chainId: string) => Promise<void>;
  onReset: (chainId: string) => Promise<void>;
  runningNodes: string[];
}

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${Math.round(size * 10) / 10} ${units[unitIndex]}`;
};

const Card: React.FC<any> = (props: any) => {
  const {
    chain,
    onUpdateChain,
    onDownload,
    onStart,
    onStop,
    onOpenWalletDir,
    onReset,
    runningNodes,
  } = props;
   
  const downloadInfo = useSelector((state: any) => (state.downloads as Record<string, DownloadEntry>)[chain.id]);

  const { isDarkMode } = useTheme();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showForceStop, setShowForceStop] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [fullChainData, setFullChainData] = useState<any>(chain);
  const [lastActionTime, setLastActionTime] = useState<number>(0);
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const [tooltipPosition, setTooltipPosition] = useState<{x:number,y:number}>({ x: 0, y: 0 });
  const [tooltipText, setTooltipText] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [processHealth, setProcessHealth] = useState<string>('offline');
  const [blockCount, setBlockCount] = useState<number>(-1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (chain.status === 'running' && startTime === null) {
      setStartTime(Date.now());
    } else if (chain.status !== 'running') {
      setStartTime(null);
    }

    // Listen for openChainSettings event
    const handleOpenChainSettings = (event: any) => {
      if (event.detail && event.detail.chainId === chain.id) {
        handleOpenSettings();
      }
    };
    
    (window as any).addEventListener('openChainSettings', handleOpenChainSettings as EventListener);

    const fetchBlockCount = async () => {
      try {
        const count = await (window as any).electronAPI.getChainBlockCount(chain.id);
        setBlockCount(count);
      } catch (error) {
        setBlockCount(-1);
        console.error('Failed to fetch block count:', error);
      }
    };

    if (chain.status === 'stopping' && chain.id === 'bitcoin') {
      setProcessHealth('warning');
    } else if (chain.status === 'not_downloaded' || 
        chain.status === 'downloaded' || 
        chain.status === 'stopped' ||
        chain.status === 'stopping' ||
        chain.status === 'downloading' ||
        chain.status === 'extracting') {
      setProcessHealth('offline');
    } else if (chain.status === 'running' || 
               chain.status === 'starting' || 
               chain.status === 'ready') {
      setProcessHealth('healthy');
    } else {
      setProcessHealth('warning');
    }

    const runningTime = startTime ? Date.now() - startTime : 0;
    const intervalTime = runningTime > 5000 ? 500 : 5000;

    const interval = setInterval(() => {
      if (chain.status === 'running' || 
          chain.status === 'starting' || 
          chain.status === 'ready') {
        
        if (chain.id !== 'bitwindow') {
          fetchBlockCount();
          if (blockCount === 0) {
            setProcessHealth('warning');
            return;
          }
        }
      }
    }, intervalTime);

    return () => {
      clearInterval(interval);
      (window as any).removeEventListener('openChainSettings', handleOpenChainSettings as EventListener);
    };
  }, [chain.id, chain.status, blockCount, startTime]);

  const checkDependencies = async () => {
    // For enforcer, check Bitcoin's IBD status - commented out as enforcer no longer depends on bitcoin
    /*
    if (chain.id === 'enforcer' && runningNodes.includes('bitcoin')) {
      try {
        const info = await window.electronAPI.getBitcoinInfo();
        if (info.initialblockdownload) {
          setTooltipText('Wait for Bitcoin IBD to complete before starting Enforcer');
          return false;
        }
      } catch (error) {
        console.error('Failed to check Bitcoin IBD status:', error);
      }
    }
    */
    
    // Check other dependencies
    if (!chain.dependencies || chain.dependencies.length === 0) return true;
    
    const missing = (chain.dependencies as string[]).filter((dep: string) => !runningNodes.includes(dep));
    if (missing.length > 0) {
      const missingNames = missing.map((id: string) => {
        const depName = id.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        return depName;
      });
      setTooltipText(`Required dependencies not running:\n${missingNames.join('\n')}`);
      return false;
    }
    
    return true;
  };

  const checkReverseDependencies = () => {
    const dependentChains = getRunningDependents();
    if (dependentChains.length > 0) {
      const dependentNames = dependentChains.map(id => {
        const depName = id.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        return depName;
      });
      setTooltipText(`Cannot stop: Following chains depend on this:\n${dependentNames.join('\n')}`);
      return false;
    }
    return true;
  };

  const getRunningDependents = (): string[] => {
    return runningNodes.filter((nodeId: string) => {
      const chainData = (window as any).cardData.find((c: any) => c.id === nodeId);
      return chainData && Array.isArray(chainData.dependencies) && chainData.dependencies.includes(chain.id);
    });
  };

  const handleAction = async (event: MouseEvent<HTMLButtonElement>): Promise<void> => {
    const now = Date.now();
    if (now - lastActionTime < 2000) {
      console.log('Action blocked: cooldown period');
      return;
    }
    setLastActionTime(now);

    if (chain.status === 'downloaded' || chain.status === 'stopped') {
      const depsOk = await checkDependencies();
      if (!depsOk) {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltipPosition({
          x: rect.right,
          y: rect.top + rect.height / 2
        });
        setTooltipVisible(true);
        return;
      }
    }

    switch (chain.status) {
      case 'not_downloaded':
        try {
          await onDownload(chain.id);
        } catch (error) {
          console.error('Download failed:', error);
          onUpdateChain(chain.id, { status: 'not_downloaded', progress: 0 });
        }
        break;
      case 'downloaded':
      case 'stopped':
        try {
          await onStart(chain.id);
        } catch (error) {
          console.error('Start failed:', error);
        }
        break;
      case 'running':
      case 'starting':
      case 'ready':
        try {
          if (!checkReverseDependencies()) {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (!rect) return;
            setTooltipPosition({
              x: rect.right,
              y: rect.top + rect.height / 2
            });
            setTooltipVisible(true);
            return;
          }
          
          setProcessHealth('offline');
          onUpdateChain(chain.id, { status: 'stopping' });

          // If this is bitwindow, stop all three chains
          if (chain.id === 'bitwindow') {
            const chainsToStop = ['bitwindow', 'bitcoin', 'enforcer'];
            for (const chainId of chainsToStop) {
              onUpdateChain(chainId, { status: 'stopping' });
              await onStop(chainId);
            }
          } else {
            await onStop(chain.id);
          }
        } catch (error) {
          console.error('Stop failed:', error);
          onUpdateChain(chain.id, { status: 'running' });
        }
        break;
    }
  };

  const handleForceStop = async () => {
    try {
      onUpdateChain(chain.id, { status: 'stopping' });
      await onStop(chain.id);
    } catch (error) {
      console.error('Force stop failed:', error);
      onUpdateChain(chain.id, { status: 'running' });
    } finally {
      setShowForceStop(false);
    }
  };

  const handleOpenSettings = useCallback(async () => {
    try {
      const fullDataDir = await (window as any).electronAPI.getFullDataDir(chain.id);
      const walletDir = await (window as any).electronAPI.getWalletDir(chain.id);
      const binaryDir = await (window as any).electronAPI.getBinaryDir(chain.id);
      setFullChainData({
        ...chain,
        dataDir: fullDataDir,
        walletDir: walletDir,
        binaryDir: binaryDir,
      });
      setShowSettings(true);
    } catch (error) {
      console.error('Failed to fetch directories:', error);
    }
  }, [chain]);

  const handleOpenDataDir = async (chainId: string): Promise<void> => {
    try {
      await (window as any).electronAPI.openDataDir(chainId);
    } catch (error) {
      console.error('Failed to open data directory:', error);
    }
  };

  const getButtonClass = () => {
    switch (chain.status) {
      case 'not_downloaded':
        return 'download';
      case 'downloading':
      case 'extracting':
        return 'downloading';
      case 'downloaded':
      case 'stopped':
        return 'run';
      case 'stopping':
        return 'stopping';
      case 'running':
      case 'starting':
      case 'ready':
        return isHovered ? 'stop' : 'running';
      default:
        return '';
    }
  };

  const getButtonText = () => {
    switch (chain.status) {
      case 'not_downloaded':
        return 'Download';
      case 'downloading':
        return 'Downloading';
      case 'extracting':
        return 'Extracting';
      case 'downloaded':
      case 'stopped':
        return 'Start';
      case 'stopping':
        return 'Stopping...';
      case 'running':
      case 'starting':
      case 'ready':
        if (!isHovered) return 'Running';
        return 'Stop';
      default:
        return '';
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTooltipVisible(false);
  };

  return (
    <>
      <div className={`card ${styles.card} ${isDarkMode ? 'dark' : 'light'}`}>
        <div className={styles.actionSection}>
          <button
            ref={buttonRef}
            className={`${buttonStyles.btn} ${buttonStyles[getButtonClass()]}`}
            onClick={handleAction}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            disabled={
              chain.status === 'downloading' ||
              chain.status === 'extracting' ||
              chain.status === 'stopping'
            }
            id={`download-button-${chain.id}`}
          >
            {downloadInfo && (chain.status === 'downloading' || chain.status === 'extracting') && (
              <div 
                className={buttonStyles.progressBar}
                style={{ transform: `scaleX(${downloadInfo.progress / 100})` }}
              />
            )}
            <span>{getButtonText()}</span>
          </button>
        </div>

        <div className={styles.chainTypeSection}>
          <div className={`${styles.chainTypeBadge} ${chain.chain_type === 0 ? styles.l1Badge : styles.l2Badge}`}>
            {chain.chain_type === 0 ? 'L1' : 'L2'}
          </div>
        </div>

        <div className={styles.titleSection}>
          <h2 className={styles.title}>{chain.display_name}</h2>
          <div className={styles.statusGroup}>
            <div className={`status-light ${processHealth} ${styles.statusLight}`} title={`Process Status: ${processHealth}`} />
            <div className={styles.statusText}>
              {chain.status === 'running' || chain.status === 'starting' || chain.status === 'ready' ? 
                (chain.id === 'bitwindow' ? 'Running' :
                 blockCount >= 0 ? `Block Height: ${blockCount}` : 'Running') :
                (chain.status === 'stopping' && chain.id === 'bitcoin' ? 'Stopping...' : 'Offline')}
            </div>
          </div>
        </div>

        <div className={styles.descriptionSection}>
          <p className={styles.description}>{chain.description}</p>
        </div>

        <div className={styles.iconSection}>
          <div className={styles.iconGroup}>
            <button className={buttonStyles.iconButton} onClick={handleOpenSettings} aria-label="Chain Settings">
              <SettingsIcon />
            </button>
            <button 
              className={buttonStyles.iconButton} 
              onClick={() => setShowResetConfirm(true)} 
              aria-label="Reset Chain"
              disabled={
                chain.status === 'not_downloaded' ||
                chain.status === 'downloading' ||
                chain.status === 'extracting' ||
                chain.status === 'stopping'
              }
              style={{
                cursor: chain.status === 'not_downloaded' ||
                        chain.status === 'downloading' ||
                        chain.status === 'extracting' ||
                        chain.status === 'stopping' 
                  ? 'not-allowed' 
                  : 'pointer'
              }}
            >
              <TrashIcon />
            </button>
            <a 
              href={chain.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles.iconButton}
              aria-label="View GitHub Repository"
            >
              <GitHubIcon />
            </a>
          </div>
        </div>
      </div>

      <Tooltip 
        text={tooltipText}
        visible={tooltipVisible}
        position={tooltipPosition}
      />

      {showSettings && (
        <ChainSettingsModal
          chain={fullChainData}
          onClose={() => setShowSettings(false)}
          onOpenDataDir={handleOpenDataDir}
          onOpenWalletDir={onOpenWalletDir}
          onReset={chain.status === 'not_downloaded' ||
                  chain.status === 'downloading' ||
                  chain.status === 'extracting' ||
                  chain.status === 'stopping'
            ? undefined 
            : onReset}
        />
      )}

      {showForceStop && (
        <ForceStopModal
          chainName={chain.display_name}
          onConfirm={handleForceStop}
          onClose={() => setShowForceStop(false)}
          dependentChains={getRunningDependents().map(id => {
            const chainData = (window as any).cardData.find((c: any) => c.id === id);
            return chainData?.display_name || id;
          })}
        />
      )}

      {showResetConfirm && (
        <ResetConfirmModal
          chainName={chain.display_name}
          chainId={chain.id}
          onConfirm={() => {
            onReset(chain.id);
            setShowResetConfirm(false);
          }}
          onClose={() => setShowResetConfirm(false)}
        />
      )}
    </>
  );
};

export default Card;
