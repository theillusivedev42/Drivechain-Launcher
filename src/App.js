import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import './App.css';
import './scrollbar.css';
import NavBar from './components/NavBar';
import Nodes from './components/Nodes';
// import Tools from './components/Tools';
import Settings from './components/Settings';
import Other from './components/Other';
import FaucetModal from './components/FaucetModal';
import WalletModal from './components/WalletModal';
import FastWithdrawalModal from './components/FastWithdrawalModal';
import SettingsModal from './components/SettingsModal';
import WelcomeModal from './components/WelcomeModal';
import QuoteWidget from './components/QuoteWidget';
import ShutdownModal from './components/ShutdownModal';
import UpdateNotification from './components/UpdateNotification';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { setAvailableUpdates, setIsChecking, setLastChecked, setError, dismissNotification, clearUpdate } from './store/updateSlice';

function AppContent() {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const { available: updates, showNotification } = useSelector(state => state.updates);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  // Check for updates on startup
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        dispatch(setIsChecking(true));
        const result = await window.electronAPI.checkForUpdates();
        if (result.success) {
          dispatch(setAvailableUpdates(result.updates));
          dispatch(setLastChecked(Date.now()));
        } else {
          dispatch(setError(result.error));
        }
      } catch (error) {
        dispatch(setError(error.message));
      } finally {
        dispatch(setIsChecking(false));
      }
    };

    checkForUpdates();
  }, [dispatch]);

  const handleDownloadUpdate = async (chainId) => {
    try {
      await window.electronAPI.downloadChain(chainId);
      dispatch(clearUpdate(chainId));
    } catch (error) {
      console.error('Failed to start download:', error);
    }
  };

  return (
    <Router>
      <div className="App">
        <NavBar />
        <Routes>
          <Route path="/" element={<Nodes />} />
          {/* <Route path="/tools" element={<Tools />} /> */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/other" element={<Other />} />
        </Routes>
        <FaucetModal />
        <WalletModal />
        <FastWithdrawalModal />
        <SettingsModal />
        <WelcomeModal 
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
        />
        <QuoteWidget />
        <ShutdownModal />
        {showNotification && (
          <UpdateNotification
            updates={updates}
            onDownload={handleDownloadUpdate}
            onDismiss={() => dispatch(dismissNotification())}
          />
        )}
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
