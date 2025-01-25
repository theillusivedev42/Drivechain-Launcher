import React, { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ChainSettingsModal from './ChainSettingsModal';
import SettingsIcon from './SettingsIcon';
import styles from './Card.module.css';

const Card = ({
  chain,
  onUpdateChain,
  onDownload,
  onStart,
  onStop,
  onOpenWalletDir,
  onReset,
}) => {
  const { isDarkMode } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [fullChainData, setFullChainData] = useState(chain);
  const handleAction = async () => {
    switch (chain.status) {
      case 'not_downloaded':
        try {
          console.log(`Initiating download for chain ${chain.id}`);
          await onDownload(chain.id);
        } catch (error) {
          console.error('Download failed:', error);
          onUpdateChain(chain.id, { status: 'not_downloaded', progress: 0 });
        }
        break;
      case 'downloaded':
      case 'stopped':
        try {
          console.log(`Starting chain ${chain.id}`);
          await onStart(chain.id);
        } catch (error) {
          console.error('Start failed:', error);
        }
        break;
      case 'running':
        try {
          console.log(`Stopping chain ${chain.id}`);
          await onStop(chain.id);
        } catch (error) {
          console.error('Stop failed:', error);
        }
        break;
    }
  };

  const handleOpenSettings = useCallback(async () => {
    try {
      const fullDataDir = await window.electronAPI.getFullDataDir(chain.id);
      const walletDir = await window.electronAPI.getWalletDir(chain.id);
      setFullChainData({
        ...chain,
        dataDir: fullDataDir,
        walletDir: walletDir,
      });
      setShowSettings(true);
    } catch (error) {
      console.error('Failed to fetch directories:', error);
    }
  }, [chain]);

  const handleOpenDataDir = async chainId => {
    try {
      await window.electronAPI.openDataDir(chainId);
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
      case 'running':
        return 'stop';
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
      case 'running':
        return 'Stop';
      default:
        return '';
    }
  };

  const renderSyncStatus = () => {
    if (chain.id === 'bitcoin' && chain.syncStatus) {
      const { percent, currentBlock, totalBlocks } = chain.syncStatus;
      return (
        <div className={styles['sync-status']}>
          <div className={styles['sync-progress-bar']}>
            <div 
              className={styles['sync-progress-fill']}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className={styles['sync-details']}>
            {currentBlock.toLocaleString()} / {totalBlocks.toLocaleString()} blocks
            ({percent.toFixed(2)}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`card ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="card-header">
        <h2>{chain.display_name}</h2>
      </div>
      <div className="card-content">
        <p>{chain.description}</p>
        {renderSyncStatus()}
      </div>
      <div className="card-actions">
        <button
          className={`btn ${getButtonClass()}`}
          onClick={handleAction}
          disabled={
            chain.status === 'downloading' || chain.status === 'extracting'
          }
          id={`download-button-${chain.id}`}
        >
          {getButtonText()}
        </button>
        <button className="settings-icon-button" onClick={handleOpenSettings} aria-label="Settings">
          <SettingsIcon />
        </button>
      </div>
      {showSettings && (
        <ChainSettingsModal
          chain={fullChainData}
          onClose={() => setShowSettings(false)}
          onOpenDataDir={handleOpenDataDir}
          onOpenWalletDir={onOpenWalletDir}
          onReset={onReset}
        />
      )}
    </div>
  );
};

export default Card;
