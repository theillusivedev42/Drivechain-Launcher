import { createSlice } from '@reduxjs/toolkit';

// Define Chain interface for typing chains state
export interface Chain {
  id: string;
  name?: string;
  dependencies?: string[];
  status: string;
  progress: number;
  released: string;
  chain_type?: number;
  enabled?: boolean;
  [key: string]: any;
}

const chainsSlice = createSlice({
  name: 'chains',
  initialState: [] as Chain[],
  reducers: {
    setChains: (state, action) => {
      return action.payload;
    },
    updateChainStatus: (state, action) => {
      const { chainId, status, progress } = action.payload;
      const chain = state.find(c => c.id === chainId);
      if (chain) {
        chain.status = status;
        if (progress !== undefined) {
          chain.progress = progress;
        }
      }
    },
  }
});

export const { setChains, updateChainStatus } = chainsSlice.actions;
export default chainsSlice.reducer;