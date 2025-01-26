import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ChainSettingsModal from './ChainSettingsModal';
import ForceStopModal from './ForceStopModal';
import SettingsIcon from './SettingsIcon';

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
  const [showForceStop, setShowForceStop] = useState(false);
  const [isStopAttempted, setIsStopAttempted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [fullChainData, setFullChainData] = useState(chain);
  const [lastActionTime, setLastActionTime] = useState(0);

  const handleAction = async () => {
    // Add cooldown period of 2 seconds between actions
    const now = Date.now();
    if (now - lastActionTime < 2000) {
      console.log('Action blocked: cooldown period');
      return;
    }
    setLastActionTime(now);

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
          setIsStopAttempted(false); // Reset stop attempt state on start
        } catch (error) {
          console.error('Start failed:', error);
        }
        break;
      case 'running':
      case 'starting':
      case 'ready':
        try {
          if (isStopAttempted) {
            setShowForceStop(true);
          } else {
            console.log(`Stopping chain ${chain.id}`);
            setIsStopAttempted(true);  // Set before stop
            await onStop(chain.id);
          }
        } catch (error) {
          console.error('Stop failed:', error);
          setIsStopAttempted(false);  // Reset on error
        }
        break;
    }
  };

  const handleForceStop = async () => {
    try {
      console.log(`Force stopping chain ${chain.id}`);
      await onStop(chain.id);
    } catch (error) {
      console.error('Force stop failed:', error);
    } finally {
      setShowForceStop(false);
      setIsStopAttempted(false);
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
      case 'starting':
      case 'ready':
        return 'stop';
      default:
        return '';
    }
  };

  // Reset stop attempt when status changes
  useEffect(() => {
    if (chain.status === 'stopped') {
      setIsStopAttempted(false);
    }
  }, [chain.status]);

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
      case 'starting':
      case 'ready':
        if (isStopAttempted) return 'Stopping...';
        if (!isHovered) return 'Running';
        return 'Stop';
      default:
        return '';
    }
  };

  return (
    <div className={`card ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="card-header">
        <h2>{chain.display_name}</h2>
      </div>
      <div className="card-content">
        <p>{chain.description}</p>
      </div>
      <div className="card-actions">
        <button
          className={`btn ${getButtonClass()}`}
          onClick={handleAction}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          disabled={
            chain.status === 'downloading' || 
            chain.status === 'extracting' ||
            isStopAttempted
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
      {showForceStop && (
        <ForceStopModal
          chainName={chain.display_name}
          onConfirm={handleForceStop}
          onClose={() => setShowForceStop(false)}
        />
      )}
    </div>
  );
};

export default Card;
