import { createSlice } from '@reduxjs/toolkit';

const settingsModalSlice = createSlice({
  name: 'settingsModal',
  initialState: {
    isVisible: false,
  },
  reducers: {
    showSettingsModal: (state) => {
      state.isVisible = true;
    },
    hideSettingsModal: (state) => {
      state.isVisible = false;
    },
  },
});

export const { showSettingsModal, hideSettingsModal } = settingsModalSlice.actions;
export default settingsModalSlice.reducer;
