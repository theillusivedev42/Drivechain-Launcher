import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Add type definitions for download entries and actions
export interface DownloadEntry {
  chainId: string;
  status: string;
  progress: number;
  type: 'download' | 'ibd';
  displayName?: string;
  details?: string;
}

export interface IBDStatusPayload {
  chainId: string;
  status: {
    inProgress: boolean;
    percent: number;
    currentBlock: number;
    totalBlocks: number;
  };
}

export interface DownloadPayload {
  chainId: string;
  status: string;
  progress: number;
}

const downloadSlice = createSlice({
  name: 'downloads',
  // typed initial state as mapping from chainId to DownloadEntry
  initialState: {} as Record<string, DownloadEntry>,
  reducers: {
    updateDownloads: (state, action: PayloadAction<DownloadPayload[]>) => {
      // First check what needs to be updated
      const updates = action.payload.filter(download => {
        const current = state[download.chainId];
        return !current || 
          current.status !== download.status || 
          current.progress !== download.progress;
      });

      // Only update changed downloads
      updates.forEach(download => {
        state[download.chainId] = {
          ...download,
          type: 'download'
        };
      });

      // Remove completed downloads but keep IBD
      const activeChainIds = new Set(action.payload.map(d => d.chainId));
      Object.keys(state).forEach(chainId => {
        if (
          state[chainId].type === 'download' && 
          !activeChainIds.has(chainId)
        ) {
          delete state[chainId];
        }
      });
    },
    updateIBDStatus: (state, action: PayloadAction<IBDStatusPayload>) => {
      const { chainId, status } = action.payload;
      const current = state[chainId];
      
      if (status.inProgress) {
        const newState: DownloadEntry = {
          chainId,
          type: 'ibd',
          status: 'syncing',
          progress: status.percent,
          displayName: 'Bitcoin Core',
          details: `${status.currentBlock.toLocaleString()} / ${status.totalBlocks.toLocaleString()} blocks`
        };

        // Only update if something changed
        if (!current || 
            current.progress !== newState.progress || 
            current.details !== newState.details) {
          state[chainId] = newState;
        }
      } else if (current?.type === 'ibd') {
        delete state[chainId];
      }
    },
  },
});

export const { updateDownloads, updateIBDStatus } = downloadSlice.actions;
export default downloadSlice.reducer;
