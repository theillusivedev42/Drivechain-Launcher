// Global type declarations for window.electronAPI and JSON modules

declare module '*.module.css';
declare module '*.module.scss';
declare module '*.module.sass';
declare module '*.module.less';
declare module '*.module.styl';

declare global {
  interface Window {
    electronAPI: {
      onDownloadsInProgress(callback: (downloads: DownloadEntry[]) => void): () => void;
      forceQuitWithDownloads(): void;
      getMasterWallet(): Promise<{ success: boolean; data?: any }>;
      getChainStatus(chainId: string): Promise<any>;
      notifyReady(): void;
      requestWithdrawal(address: string, amount: number, chain: string): Promise<{ server_l2_address?: { info: string }; server_fee_sats: number; hash: string; error?: string }>;
      notifyPaymentComplete(hash: string | null, paymentTxid: string): Promise<{ message: { info: string } }>;
      setFastWithdrawalServer(server: string): void;
      getConfig(): Promise<any>;
      onDownloadsUpdate(callback: (downloads: DownloadEntry[]) => void): () => void;
      onChainStatusUpdate(callback: (update: { chainId: string; status: string }) => void): () => void;
      onDownloadComplete(callback: (info: { chainId: string }) => void): () => void;
      onBitcoinSyncStatus(callback: (status: string) => void): () => void;
      getDownloads(): Promise<DownloadEntry[]>;
      openWalletDir(chainId: string): Promise<{ error?: string; path?: string }>;
      downloadChain(chainId: string): Promise<any>;
      startChain(chainId: string): Promise<any>;
      stopChain(chainId: string): Promise<any>;
      resetChain(chainId: string): Promise<any>;
      getChainBlockCount(chainId: string): Promise<number>;
      getWalletStarter(key: string): Promise<{ success: boolean; data: string }>;
    };
    // Card data JSON imported globally
    cardData: typeof import("./CardData.json");
  }

  /** Download entry interface matching redux store */
  interface DownloadEntry {
    chainId: string;
    status: string;
    progress: number;
    type?: 'download' | 'ibd';
    displayName?: string;
    details?: string;
  }
}

// No exports — this file is purely ambient
