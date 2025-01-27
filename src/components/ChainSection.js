import React from 'react';
import Card from './Card';

const ChainSection = ({ title, chains, onUpdateChain, onDownload, onStart, onStop, onReset, onOpenWalletDir, runningNodes }) => {
  return (
    <div className="chain-section">
      <h2 className="chain-heading">{title}</h2>
      <div className={title === "Layer 1" ? "l1-chains" : "l2-chains"}>
        {chains.map(chain => (
          <Card
            key={chain.id}
            chain={chain}
            onUpdateChain={onUpdateChain}
            onDownload={onDownload}
            onStart={onStart}
            onStop={onStop}
            onReset={onReset}
            onOpenWalletDir={onOpenWalletDir}
            runningNodes={runningNodes}
          />
        ))}
      </div>
    </div>
  );
};

export default ChainSection;
