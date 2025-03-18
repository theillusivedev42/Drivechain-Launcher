import React, { useState, useCallback } from 'react';

const QuickStartStop = ({ chains, onStart, onStop }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStoppingSequence, setIsStoppingSequence] = useState(false);

  const areAllChainsRunning = useCallback(() => {
    return ['bitcoin', 'enforcer', 'bitwindow'].every(chainId =>
      chains.some(chain => chain.id === chainId && 
        (chain.status === 'running' || chain.status === 'ready'))
    );
  }, [chains]);

  const waitForIBD = async () => {
    while (true) {
      try {
        const info = await window.electronAPI.getBitcoinInfo();
        if (!info.initialblockdownload) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
      } catch (error) {
        console.error('Failed to check IBD status:', error);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Retry after error
      }
    }
  };

  const handleStartSequence = useCallback(async () => {
    try {
      setIsProcessing(true);
      setIsStoppingSequence(false);
      
      // Start bitcoin and wait for IBD
      await onStart('bitcoin');
      await waitForIBD();
      
      // Start enforcer once IBD is complete
      await onStart('enforcer');
      
      // Wait 3s before starting bitwindow
      await new Promise(resolve => setTimeout(resolve, 3000));
      await onStart('bitwindow');
    } finally {
      setIsProcessing(false);
    }
  }, [onStart]);

  const handleStopSequence = useCallback(async () => {
    try {
      setIsProcessing(true);
      setIsStoppingSequence(true);
      
      await onStop('bitwindow');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await onStop('enforcer');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await onStop('bitcoin');
    } finally {
      setIsProcessing(false);
      setIsStoppingSequence(false);
    }
  }, [onStop]);

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
    <button
      onClick={handleQuickStartStop}
      disabled={isProcessing}
      className="quick-start-button"
      style={{
        backgroundColor: isProcessing
          ? '#FFA726'  // Orange for processing
          : areAllChainsRunning()
            ? '#f44336'  // Red for stop
            : '#4CAF50', // Green for start
        opacity: isProcessing ? 0.8 : 1,
        cursor: isProcessing ? 'wait' : 'pointer'
      }}
    >
      {isProcessing
        ? (isStoppingSequence ? 'Stopping...' : 'Starting...')
        : (!areAllChainsRunning() ? 'Quick Start' : 'Safe Stop')}
    </button>
  );
};

export default QuickStartStop;
