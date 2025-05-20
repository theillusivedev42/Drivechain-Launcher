import { configureStore } from '@reduxjs/toolkit';
import downloadReducer from './downloadSlice';
import chainsReducer from './chainsSlice';
import downloadModalReducer from './downloadModalSlice';
import quotesModalReducer from './quotesModalSlice';
import faucetReducer from './faucetSlice';
import walletModalReducer from './walletModalSlice';
import fastWithdrawalModalReducer from './fastWithdrawalModalSlice';
import settingsModalReducer from './settingsModalSlice';
import settingsReducer from './settingsSlice';

export const store = configureStore({
  reducer: {
    downloads: downloadReducer,
    chains: chainsReducer,
    downloadModal: downloadModalReducer,
    faucet: faucetReducer,
    walletModal: walletModalReducer,
    fastWithdrawalModal: fastWithdrawalModalReducer,
    settingsModal: settingsModalReducer,
    quotesModal: quotesModalReducer,
    settings: settingsReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
