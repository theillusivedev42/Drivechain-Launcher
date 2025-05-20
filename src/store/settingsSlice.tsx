import { createSlice } from '@reduxjs/toolkit';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    showQuotes: true, // Default to showing quotes
  },
  reducers: {
    toggleShowQuotes: (state) => {
      state.showQuotes = !state.showQuotes;
    },
  },
});

export const { toggleShowQuotes } = settingsSlice.actions;
export default settingsSlice.reducer;
