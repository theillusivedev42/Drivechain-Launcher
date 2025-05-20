import React from 'react';
import Card from './Card';

// Props for ChainSection component
interface ChainSectionProps {
  title: string;
  chains: any[];
  onUpdateChain: (chainId: string, update: { status: string; progress?: number }) => void;
  onDownload: (chainId: string) => Promise<void>;
  onStart: (chainId: string) => Promise<void>;
  onStop: (chainId: string) => Promise<void>;
  onReset: (chainId: string) => Promise<void>;
  onOpenWalletDir: (chainId: string) => Promise<void>;
  runningNodes: string[];
}

const ChainSection: React.FC<ChainSectionProps> = ({ title, chains, onUpdateChain, onDownload, onStart, onStop, onReset, onOpenWalletDir, runningNodes }) => {
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
