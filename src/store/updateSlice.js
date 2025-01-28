import { createSlice } from '@reduxjs/toolkit';

const updateSlice = createSlice({
  name: 'updates',
  initialState: {
    available: {},
    isChecking: false,
    lastChecked: null,
    error: null,
    showNotification: false
  },
  reducers: {
    setAvailableUpdates: (state, action) => {
      state.available = action.payload;
      state.showNotification = Object.keys(action.payload).length > 0;
    },
    setIsChecking: (state, action) => {
      state.isChecking = action.payload;
    },
    setLastChecked: (state, action) => {
      state.lastChecked = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    dismissNotification: (state) => {
      state.showNotification = false;
    },
    clearUpdate: (state, action) => {
      const chainId = action.payload;
      delete state.available[chainId];
      state.showNotification = Object.keys(state.available).length > 0;
    }
  }
});

export const {
  setAvailableUpdates,
  setIsChecking,
  setLastChecked,
  setError,
  dismissNotification,
  clearUpdate
} = updateSlice.actions;

export default updateSlice.reducer;
