import { createSlice } from '@reduxjs/toolkit';

const downloadSlice = createSlice({
  name: 'downloads',
  initialState: {},
  reducers: {
    updateDownloads: (state, action) => {
      action.payload.forEach(download => {
        state[download.chainId] = {
          ...download,
          type: 'download'
        };
      });
      // Remove completed downloads but keep IBD
      Object.keys(state).forEach(chainId => {
        if (
          state[chainId].type === 'download' && 
          !action.payload.find(d => d.chainId === chainId)
        ) {
          delete state[chainId];
        }
      });
    },
    updateIBDStatus: (state, action) => {
      const { chainId, status } = action.payload;
      if (status.inProgress) {
        state[chainId] = {
          chainId,
          type: 'ibd',
          status: 'syncing',
          progress: status.percent,
          displayName: 'Bitcoin Core',
          details: `${status.currentBlock.toLocaleString()} / ${status.totalBlocks.toLocaleString()} blocks`
        };
      } else {
        // Remove IBD entry when sync is complete
        if (state[chainId]?.type === 'ibd') {
          delete state[chainId];
        }
      }
    },
  },
});

export const { updateDownloads, updateIBDStatus } = downloadSlice.actions;
export default downloadSlice.reducer;
