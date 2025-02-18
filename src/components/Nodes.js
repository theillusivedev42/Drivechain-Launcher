import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Card from './Card';
import styles from './Nodes.module.css';
import buttonStyles from './Button.module.css';
import UnreleasedCard from './UnreleasedCard';
import DownloadModal from './DownloadModal';
import WalletMessageModal from './WalletMessageModal';
import { updateDownloads, updateIBDStatus } from '../store/downloadSlice';
import { showDownloadModal } from '../store/downloadModalSlice';
import { setChains, updateChainStatus } from '../store/chainsSlice';

function Nodes() {
  const chains = useSelector(state => state.chains);
  const [walletMessage, setWalletMessage] = useState(null);
  const [bitcoinSync, setBitcoinSync] = useState(null);
  const [runningNodes, setRunningNodes] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();

  const fetchChains = useCallback(async () => {
    try {
      setIsLoading(true);
      const config = await window.electronAPI.getConfig();
      const dependencyData = await import('../CardData.json');
      
      const chainsWithStatus = await Promise.all(
        config.chains
          .filter(chain => chain.enabled)
          .map(async chain => {
            const dependencyInfo = dependencyData.default.find(d => d.id === chain.id);
            console.log('Loading chain:', chain.id, 'Released status:', chain.released);
            return {
              ...chain,
              dependencies: dependencyInfo?.dependencies || [],
              status: await window.electronAPI.getChainStatus(chain.id),
              progress: 0,
              released: chain.released,
            };
          })
      );
      dispatch(setChains(chainsWithStatus));
      
      const initialRunning = chainsWithStatus
        .filter(chain => chain.status === 'running' || chain.status === 'ready')
        .map(chain => chain.id);
      setRunningNodes(initialRunning);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to fetch chain config:', error);
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const downloadsUpdateHandler = useCallback(
    downloads => {
      console.log('Received downloads update:', downloads);
      dispatch(updateDownloads(downloads));
      downloads.forEach(download => {
        dispatch(updateChainStatus({
          chainId: download.chainId,
          status: download.status,
          progress: download.progress
        }));
      });
    },
    [dispatch]
  );

  const chainStatusUpdateHandler = useCallback(({ chainId, status }) => {
    dispatch(updateChainStatus({ chainId, status }));
    
    if (status === 'running' || status === 'ready') {
      setRunningNodes(prev => [...new Set([...prev, chainId])]);
    } else if (status === 'stopped' || status === 'not_downloaded') {
      setRunningNodes(prev => prev.filter(id => id !== chainId));
    }
  }, [dispatch]);

  const downloadCompleteHandler = useCallback(({ chainId }) => {
    dispatch(updateChainStatus({ 
      chainId, 
      status: 'downloaded', 
      progress: 100 
    }));
  }, [dispatch]);

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
    dispatch(updateChainStatus({ chainId, ...updates }));
  }, [dispatch]);

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
      const chain = chains.find(c => c.id === chainId);
      if (!chain) {
        console.error(`Chain ${chainId} not found`);
        return;
      }

      if (chain.dependencies && chain.dependencies.length > 0) {
        const missingDeps = chain.dependencies.filter(dep => !runningNodes.includes(dep));
        if (missingDeps.length > 0) {
          console.error(`Cannot start ${chainId}: missing dependencies: ${missingDeps.join(', ')}`);
          return;
        }
      }

      await window.electronAPI.startChain(chainId);
      dispatch(updateChainStatus({ chainId, status: 'running' }));
    } catch (error) {
      console.error(`Failed to start chain ${chainId}:`, error);
    }
  }, [chains, runningNodes, dispatch]);

  const handleStopChain = useCallback(async chainId => {
    try {
      await window.electronAPI.stopChain(chainId);
      dispatch(updateChainStatus({ chainId, status: 'stopped' }));
    } catch (error) {
      console.error(`Failed to stop chain ${chainId}:`, error);
    }
  }, [dispatch]);

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

  const [isProcessing, setIsProcessing] = useState(false);
  const [isStoppingSequence, setIsStoppingSequence] = useState(false);

  const L1_CHAINS = ['bitcoin', 'enforcer', 'bitwindow'];
  const L2_CHAINS = ['thunder', 'bitnames'];

  const areAllChainsRunning = useCallback(() => {
    return L1_CHAINS.every(chain =>
      runningNodes.includes(chain)
    );
  }, [runningNodes]);

  const isAnyL1ChainDownloading = useCallback(() => {
    return L1_CHAINS.some(chainId => {
      const chain = chains.find(c => c.id === chainId);
      return chain && (chain.status === 'downloading' || chain.status === 'extracting');
    });
  }, [chains]);

  const areAllL1ChainsDownloaded = useCallback(() => {
    return L1_CHAINS.every(chainId => {
      const chain = chains.find(c => c.id === chainId);
      return chain && chain.status !== 'not_downloaded';
    });
  }, [chains]);

  const downloadMissingL1Chains = useCallback(async () => {
    try {
      for (const chainId of L1_CHAINS) {
        const chain = chains.find(c => c.id === chainId);
        if (chain && chain.status === 'not_downloaded') {
          await handleDownloadChain(chainId);
        }
      }
    } catch (error) {
      console.error('Failed to download L1 chains:', error);
    }
  }, [chains, handleDownloadChain]);

  const handleStartSequence = useCallback(async () => {
    try {
      setIsProcessing(true);
      setIsStoppingSequence(false);
      
      if (!runningNodes.includes('bitcoin')) {
        await window.electronAPI.startChain('bitcoin');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (!runningNodes.includes('enforcer')) {
        await window.electronAPI.startChain('enforcer');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (!runningNodes.includes('bitwindow')) {
        await window.electronAPI.startChain('bitwindow');
      }
    } catch (error) {
      console.error('Start sequence failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [runningNodes]);

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
      
      for (const chainId of L2_CHAINS) {
        if (runningNodes.includes(chainId)) {
          await window.electronAPI.stopChain(chainId);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      if (runningNodes.includes('bitwindow')) {
        await window.electronAPI.stopChain('bitwindow');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      if (runningNodes.includes('enforcer')) {
        await window.electronAPI.stopChain('enforcer');
        await new Promise(resolve => setTimeout(resolve, 3000));
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
      if (!areAllL1ChainsDownloaded()) {
        await downloadMissingL1Chains();
      } else if (!areAllChainsRunning()) {
        await handleStartSequence();
      } else {
        await handleStopSequence();
      }
    } catch (error) {
      console.error('Quick start/stop failed:', error);
    }
  }, [areAllL1ChainsDownloaded, areAllChainsRunning, downloadMissingL1Chains, handleStartSequence, handleStopSequence]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <h2>Loading Drivechain Launcher...</h2>
          <div className={styles.loadingSpinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.chainSection}>
        <div className={styles.l1ChainHeading}>
          <h2>Layer 1</h2>
          {isInitialized && (
            <button
              onClick={handleQuickStartStop}
              disabled={isProcessing || isAnyL1ChainDownloading()}
              className={`${buttonStyles.quickStartBtn} ${
                !isProcessing && !isAnyL1ChainDownloading() && 
                (!areAllL1ChainsDownloaded() || (!areAllChainsRunning() && areAllL1ChainsDownloaded())) 
                  ? buttonStyles.shimmer 
                  : ''
              } ${
                isProcessing || isAnyL1ChainDownloading()
                  ? buttonStyles.downloading
                  : !areAllL1ChainsDownloaded()
                    ? buttonStyles.download
                    : areAllChainsRunning()
                      ? buttonStyles.stop
                      : buttonStyles.run
              }`}
              data-state={!isProcessing && !isAnyL1ChainDownloading() && (!areAllL1ChainsDownloaded() ? 'download' : !areAllChainsRunning() ? 'start' : '')}
            >
              {isProcessing
                ? (isStoppingSequence ? 'Stopping...' : 'Starting...')
                : isAnyL1ChainDownloading()
                  ? 'Downloading...'
                  : !areAllL1ChainsDownloaded() 
                    ? 'Download L1' 
                    : !areAllChainsRunning() 
                      ? 'Quick Start' 
                      : 'Safe Stop'}
            </button>
          )}
        </div>
        <div className={styles.l1Chains}>
          {chains
            .filter(chain => chain.chain_type === 0)
            .map(chain => (
              chain.released === "no" ? (
                <UnreleasedCard
                  key={chain.id}
                  chain={chain}
                />
              ) : (
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
              )
            ))}
        </div>
      </div>
      <div className={styles.chainSection}>
        <div className={styles.l2ChainHeading}>
          <h2>Layer 2</h2>
        </div>
        <div className={styles.l2Chains}>
          {chains
            .filter(chain => chain.chain_type === 2)
            .map(chain => (
              <div key={chain.id}>
                {chain.released === "no" ? (
                  <UnreleasedCard chain={chain} />
                ) : (
                  <Card
                    chain={chain}
                    onUpdateChain={handleUpdateChain}
                    onDownload={handleDownloadChain}
                    onStart={handleStartChain}
                    onStop={handleStopChain}
                    onReset={handleResetChain}
                    onOpenWalletDir={handleOpenWalletDir}
                    runningNodes={runningNodes}
                  />
                )}
              </div>
            ))}
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
