























































































































































































import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Card from './Card';
















































































































































































































import DownloadModal from './DownloadModal';
import WalletMessageModal from './WalletMessageModal';
import { updateDownloads, updateIBDStatus } from '../store/downloadSlice';
import { showDownloadModal } from '../store/downloadModalSlice';

function Nodes() {
  const [chains, setChains] = useState([]);
  const [walletMessage, setWalletMessage] = useState(null);
  const [bitcoinSync, setBitcoinSync] = useState(null);
  const [runningNodes, setRunningNodes] = useState([]);
  const dispatch = useDispatch();

  const fetchChains = useCallback(async () => {
    try {
      const config = await window.electronAPI.getConfig();
      const dependencyData = await import('../CardData.json');
      
      const chainsWithStatus = await Promise.all(
        config.chains
          .filter(chain => chain.enabled)
          .map(async chain => {
            const dependencyInfo = dependencyData.default.find(d => d.id === chain.id);
            return {
              ...chain,
              dependencies: dependencyInfo?.dependencies || [],
              status: await window.electronAPI.getChainStatus(chain.id),
              progress: 0,
            };
          })
      );
      setChains(chainsWithStatus);
      
      // Initialize running nodes based on initial status
      const initialRunning = chainsWithStatus
        .filter(chain => chain.status === 'running' || chain.status === 'ready')
        .map(chain => chain.id);
      setRunningNodes(initialRunning);
    } catch (error) {
      console.error('Failed to fetch chain config:', error);
    }
  }, []);

  const downloadsUpdateHandler = useCallback(
    downloads => {
      console.log('Received downloads update:', downloads);
      dispatch(updateDownloads(downloads));
      setChains(prevChains =>
        prevChains.map(chain => {
          const download = downloads.find(d => d.chainId === chain.id);
          return download
            ? { ...chain, status: download.status, progress: download.progress }
            : chain;
        })
      );
    },
    [dispatch]
  );

  const chainStatusUpdateHandler = useCallback(({ chainId, status }) => {
    setChains(prevChains =>
      prevChains.map(chain =>
        chain.id === chainId ? { ...chain, status } : chain
      )
    );
    
    // Update running nodes list
    if (status === 'running' || status === 'ready') {
      setRunningNodes(prev => [...new Set([...prev, chainId])]);
    } else if (status === 'stopped' || status === 'not_downloaded') {
      setRunningNodes(prev => prev.filter(id => id !== chainId));
    }
  }, []);

  const downloadCompleteHandler = useCallback(({ chainId }) => {
    setChains(prevChains =>
      prevChains.map(chain =>
        chain.id === chainId
          ? { ...chain, status: 'downloaded', progress: 100 }
          : chain
      )
    );
  }, []);

  useEffect(() => {
    fetchChains();

    const unsubscribeDownloadsUpdate = window.electronAPI.onDownloadsUpdate(
      downloadsUpdateHandler
    );
    const unsubscribeStatus = window.electronAPI.onChainStatusUpdate(
      chainStatusUpdateHandler
    );
    const unsubscribeDownloadComplete = window.electronAPI.onDownloadComplete(
      downloadCompleteHandler
    );
    const unsubscribeBitcoinSync = window.electronAPI.onBitcoinSyncStatus(
      (status) => {
        setBitcoinSync(status);
        // Update IBD status in downloads slice
        dispatch(updateIBDStatus({ chainId: 'bitcoin', status }));
      }
    );

    window.electronAPI.getDownloads().then(downloadsUpdateHandler);

    return () => {
      if (typeof unsubscribeDownloadsUpdate === 'function')
        unsubscribeDownloadsUpdate();
      if (typeof unsubscribeStatus === 'function') unsubscribeStatus();
      if (typeof unsubscribeDownloadComplete === 'function')
        unsubscribeDownloadComplete();
      if (typeof unsubscribeBitcoinSync === 'function')
        unsubscribeBitcoinSync();
    };
  }, [
    fetchChains,
    downloadsUpdateHandler,
    chainStatusUpdateHandler,
    downloadCompleteHandler,
  ]);

  const handleOpenWalletDir = useCallback(async chainId => {
    try {
      const result = await window.electronAPI.openWalletDir(chainId);
      if (!result.success) {
        setWalletMessage({
          error: result.error,
          path: result.path,
          chainName: result.chainName,
        });
      }
    } catch (error) {
      console.error(
        `Failed to open wallet directory for chain ${chainId}:`,
        error
      );
      setWalletMessage({
        error: error.message,
        path: '',
        chainName: '',
      });
    }
  }, []);

  const handleUpdateChain = useCallback((chainId, updates) => {
    setChains(prevChains =>
      prevChains.map(chain =>
        chain.id === chainId ? { ...chain, ...updates } : chain
      )
    );
  }, []);

  const handleDownloadChain = useCallback(
    async chainId => {
      try {
        console.log(`Attempting to download chain ${chainId}`);
        await window.electronAPI.downloadChain(chainId);
        console.log(`Download initiated for chain ${chainId}`);
        dispatch(showDownloadModal());
      } catch (error) {
        console.error(`Failed to start download for chain ${chainId}:`, error);
      }
    },
    [dispatch]
  );

  const handleStartChain = useCallback(async chainId => {
    try {
      // Find the chain and check its dependencies
      const chain = chains.find(c => c.id === chainId);
      if (!chain) {
        console.error(`Chain ${chainId} not found`);
        return;
      }

      // Check if all dependencies are running
      if (chain.dependencies && chain.dependencies.length > 0) {
        const missingDeps = chain.dependencies.filter(dep => !runningNodes.includes(dep));
        if (missingDeps.length > 0) {
          console.error(`Cannot start ${chainId}: missing dependencies: ${missingDeps.join(', ')}`);
          return;
        }
      }

      await window.electronAPI.startChain(chainId);
      setChains(prevChains =>
        prevChains.map(chain =>
          chain.id === chainId ? { ...chain, status: 'running' } : chain
        )
      );
    } catch (error) {
      console.error(`Failed to start chain ${chainId}:`, error);
    }
  }, [chains, runningNodes]);

  const handleStopChain = useCallback(async chainId => {
    try {
      await window.electronAPI.stopChain(chainId);
      setChains(prevChains =>
        prevChains.map(chain =>
          chain.id === chainId ? { ...chain, status: 'stopped' } : chain
        )
      );
    } catch (error) {
      console.error(`Failed to stop chain ${chainId}:`, error);
    }
  }, []);

  const handleResetChain = useCallback(
    async chainId => {
      const chain = chains.find(c => c.id === chainId);
      if (chain.status === 'running') {
        try {
          await handleStopChain(chainId);
        } catch (error) {
          console.error(`Failed to stop chain ${chainId} before reset:`, error);
          return;
        }
      }

      try {
        await window.electronAPI.resetChain(chainId);
      } catch (error) {
        console.error(`Failed to reset chain ${chainId}:`, error);
      }
    },
    [chains, handleStopChain]
  );

  const waitForChainRunning = useCallback((chainId) => {
    return new Promise((resolve) => {
      const checkRunning = () => {
        if (runningNodes.includes(chainId)) {
          resolve();
        } else {
          setTimeout(checkRunning, 500); // Check every 500ms
        }
      };
      checkRunning();
    });
  }, [runningNodes]);

  const isBitcoinStopped = useCallback(() => {
    const bitcoinChain = chains.find(c => c.id === 'bitcoin');
    return bitcoinChain?.status === 'stopped';
  }, [chains]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isStoppingSequence, setIsStoppingSequence] = useState(false);

  const areAllChainsRunning = useCallback(() => {
    return ['bitcoin', 'enforcer', 'bitwindow'].every(chain =>
      runningNodes.includes(chain)
    );
  }, [runningNodes]);

  const handleStartSequence = useCallback(async () => {
    try {
      setIsProcessing(true);
      setIsStoppingSequence(false);
      
      // Only start chains that aren't already running
      if (!runningNodes.includes('bitcoin')) {
        await window.electronAPI.startChain('bitcoin');
        await window.electronAPI.waitForChain('bitcoin');
      }
      
      if (!runningNodes.includes('enforcer')) {
        await window.electronAPI.startChain('enforcer');
        await window.electronAPI.waitForChain('enforcer');
      }
      
      if (!runningNodes.includes('bitwindow')) {
        await window.electronAPI.startChain('bitwindow');
        await window.electronAPI.waitForChain('bitwindow');
      }
    } catch (error) {
      console.error('Start sequence failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [runningNodes]);

  // Reset processing state when bitcoin status changes to stopped
  useEffect(() => {
    const bitcoinChain = chains.find(c => c.id === 'bitcoin');
    if (bitcoinChain?.status === 'stopped' && isStoppingSequence) {
      setIsProcessing(false);
      setIsStoppingSequence(false);
    }
  }, [chains]);

  const handleStopSequence = useCallback(async () => {
    try {
      setIsProcessing(true);
      setIsStoppingSequence(true);
      
      // Stop in reverse order
      if (runningNodes.includes('bitwindow')) {
        await window.electronAPI.stopChain('bitwindow');
      }
      if (runningNodes.includes('enforcer')) {
        await window.electronAPI.stopChain('enforcer');
      }
      if (runningNodes.includes('bitcoin')) {
        await window.electronAPI.stopChain('bitcoin');
      }
    } catch (error) {
      console.error('Stop sequence failed:', error);
      setIsProcessing(false);
      setIsStoppingSequence(false);
    }
  }, [runningNodes]);

  const handleQuickStartStop = useCallback(async () => {
    try {
      if (!areAllChainsRunning()) {
        await handleStartSequence();
      } else {
        await handleStopSequence();
      }
    } catch (error) {
      console.error('Quick start/stop failed:', error);
    }
  }, [areAllChainsRunning, handleStartSequence, handleStopSequence]);

  return (
    <div className="Nodes">
      <h1>Drivechain Launcher</h1>
      <button
        onClick={handleQuickStartStop}
        disabled={isProcessing}
        style={{
          margin: '10px',
          padding: '8px 16px',
          backgroundColor: isProcessing
            ? '#FFA726'  // Orange for processing
            : areAllChainsRunning()
              ? '#f44336'  // Red for stop
              : '#4CAF50', // Green for start
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isProcessing ? 'wait' : 'pointer',
          opacity: isProcessing ? 0.8 : 1
        }}
      >
        {isProcessing
          ? (isStoppingSequence ? 'Stopping...' : 'Starting...')
          : (!areAllChainsRunning() ? 'Quick Start' : 'Safe Stop')}
      </button>
      <div className="chain-list">
        <div className="chain-section">
          <h2 className="chain-heading">Layer 1</h2>
          <div className="l1-chains">
            {chains
              .filter(chain => chain.chain_type === 0)
              .map(chain => (
                <Card
                  key={chain.id}
                  chain={chain}
                  onUpdateChain={handleUpdateChain}
                  onDownload={handleDownloadChain}
                  onStart={handleStartChain}
                  onStop={handleStopChain}
                  onReset={handleResetChain}
                  onOpenWalletDir={handleOpenWalletDir}
                  runningNodes={runningNodes}
                />
              ))}
          </div>
        </div>
        <div className="chain-section">
          <h2 className="chain-heading">Layer 2</h2>
          <div className="l2-chains">
            {chains
              .filter(chain => chain.chain_type === 2)
              .map(chain => (
                <Card
                  key={chain.id}
                  chain={chain}
                  onUpdateChain={handleUpdateChain}
                  onDownload={handleDownloadChain}
                  onStart={handleStartChain}
                  onStop={handleStopChain}
                  onReset={handleResetChain}
                  onOpenWalletDir={handleOpenWalletDir}
                  runningNodes={runningNodes}
                />
              ))}
          </div>
        </div>
      </div>
      <DownloadModal />
      {walletMessage && (
        <WalletMessageModal
          error={walletMessage.error}
          path={walletMessage.path}
          onClose={() => setWalletMessage(null)}
        />
      )}
    </div>
  );
}

export default Nodes;
