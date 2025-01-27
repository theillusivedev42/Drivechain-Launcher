import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isVisible: false
};

const quotesModalSlice = createSlice({
  name: 'quotesModal',
  initialState,
  reducers: {
    showQuotesModal: (state) => {
      state.isVisible = true;
    },
    hideQuotesModal: (state) => {
      state.isVisible = false;
    }
  }
});

export const { showQuotesModal, hideQuotesModal } = quotesModalSlice.actions;
export default quotesModalSlice.reducer;
