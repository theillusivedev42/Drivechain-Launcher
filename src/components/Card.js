import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ChainSettingsModal from './ChainSettingsModal';
import ForceStopModal from './ForceStopModal';
import SettingsIcon from './SettingsIcon';
import Tooltip from './Tooltip';
// import LogWindow from './LogWindow';

const Card = ({
  chain,
  onUpdateChain,
  onDownload,
  onStart,
  onStop,
  onOpenWalletDir,
  onReset,
  runningNodes,
}) => {
  const { isDarkMode } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showForceStop, setShowForceStop] = useState(false);
  const [isStopAttempted, setIsStopAttempted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [fullChainData, setFullChainData] = useState(chain);
  const [lastActionTime, setLastActionTime] = useState(0);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  /* Log-related state - temporarily disabled
  const [logs, setLogs] = useState([]);
  const logBatchRef = useRef([]);
  const logUpdateTimeoutRef = useRef(null);
  */
  const buttonRef = useRef(null);

  /* Log-related effects and handlers - temporarily disabled
  const batchLogUpdate = useCallback((newLog) => {
    logBatchRef.current.push(newLog);
    
    if (logUpdateTimeoutRef.current) {
      return;
    }

    logUpdateTimeoutRef.current = setTimeout(() => {
      setLogs(prevLogs => {
        const updatedLogs = [...prevLogs, ...logBatchRef.current];
        // Keep only the last 1000 logs
        return updatedLogs.slice(-1000);
      });
      logBatchRef.current = [];
      logUpdateTimeoutRef.current = null;
    }, 100); // Update every 100ms
  }, []);

  useEffect(() => {
    if (chain.status === 'running' || chain.status === 'starting' || chain.status === 'ready') {
      const unsubscribe = window.electronAPI.onChainLog(chain.id, (log) => {
        batchLogUpdate({
          timestamp: new Date().toLocaleTimeString(),
          message: log
        });
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
        // Clear any pending updates
        if (logUpdateTimeoutRef.current) {
          clearTimeout(logUpdateTimeoutRef.current);
          logUpdateTimeoutRef.current = null;
        }
      };
    } else {
      // Clear logs when chain stops
      setLogs([]);
      logBatchRef.current = [];
      if (logUpdateTimeoutRef.current) {
        clearTimeout(logUpdateTimeoutRef.current);
        logUpdateTimeoutRef.current = null;
      }
    }
  }, [chain.status, chain.id, batchLogUpdate]);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);
  */
  const checkDependencies = () => {
    if (!chain.dependencies || chain.dependencies.length === 0) return true;
    return chain.dependencies.every(dep => runningNodes.includes(dep));
  };

  const getMissingDependencies = () => {
    if (!chain.dependencies) return [];
    return chain.dependencies.filter(dep => !runningNodes.includes(dep));
  };

  const getTooltipText = () => {
    const missing = getMissingDependencies();
    if (missing.length === 0) return '';
    
    const missingNames = missing.map(id => {
      const depName = id.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      return depName;
    });

    return `Required dependencies not running:\n${missingNames.join('\n')}`;
  };

  const handleAction = async (event) => {
    // Add cooldown period of 2 seconds between actions
    const now = Date.now();
    if (now - lastActionTime < 2000) {
      console.log('Action blocked: cooldown period');
      return;
    }
    setLastActionTime(now);

    // Check dependencies before starting
    if ((chain.status === 'downloaded' || chain.status === 'stopped') && !checkDependencies()) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      setTooltipVisible(true);
      return;
    }

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
          setIsStopAttempted(false);
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
            setIsStopAttempted(true);
            await onStop(chain.id);
          }
        } catch (error) {
          console.error('Stop failed:', error);
          setIsStopAttempted(false);
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
      const binaryDir = await window.electronAPI.getBinaryDir(chain.id);
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
        return isHovered ? 'stop' : 'running';
      default:
        return '';
    }
  };

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

  // Hide tooltip when mouse leaves button
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTooltipVisible(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '300px' }}>
      <div className={`card ${isDarkMode ? 'dark' : 'light'}`}>
        <div className="card-header">
          <h2>{chain.display_name}</h2>
        </div>
        <div className="card-content">
          <p>{chain.description}</p>
        </div>
        <div className="card-actions">
          <button
            ref={buttonRef}
            className={`btn ${getButtonClass()}`}
            onClick={handleAction}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
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
        <Tooltip 
          text={getTooltipText()}
          visible={tooltipVisible}
          position={tooltipPosition}
        />
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
      {/* Log window temporarily disabled
      {(chain.status === 'running' || chain.status === 'starting' || chain.status === 'ready') && (
        <LogWindow
          logs={logs}
          title={chain.display_name}
          onClear={handleClearLogs}
        />
      )} */}
    </div>
  );
};

export default Card;
