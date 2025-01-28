import { createSlice } from '@reduxjs/toolkit';

const fastWithdrawalModalSlice = createSlice({
  name: 'fastWithdrawalModal',
  initialState: {
    isVisible: false,
  },
  reducers: {
    showFastWithdrawalModal: (state) => {
      state.isVisible = true;
    },
    hideFastWithdrawalModal: (state) => {
      state.isVisible = false;
    },
  },
});

export const { showFastWithdrawalModal, hideFastWithdrawalModal } = fastWithdrawalModalSlice.actions;
export default fastWithdrawalModalSlice.reducer;
