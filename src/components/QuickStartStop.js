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

  const handleStartSequence = useCallback(async () => {
    try {
      setIsProcessing(true);
      setIsStoppingSequence(false);
      
      // Do one thing, wait 3s, do next thing
      await onStart('bitcoin');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await onStart('enforcer');
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
      
      // Do one thing, wait 3s, do next thing
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
