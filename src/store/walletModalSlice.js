import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isVisible: false,
  isLoading: false,
  error: null,
  success: null
};

const walletModalSlice = createSlice({
  name: 'walletModal',
  initialState,
  reducers: {
    showWalletModal: (state) => {
      state.isVisible = true;
    },
    hideWalletModal: (state) => {
      state.isVisible = false;
      state.error = null;
      state.success = null;
    },
    setWalletStatus: (state, action) => {
      const { isLoading, error, success } = action.payload;
      state.isLoading = isLoading ?? state.isLoading;
      state.error = error ?? state.error;
      state.success = success ?? state.success;
    }
  }
});

export const { showWalletModal, hideWalletModal, setWalletStatus } = walletModalSlice.actions;
export default walletModalSlice.reducer;
