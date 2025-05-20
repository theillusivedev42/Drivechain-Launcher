import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import './App.css';
import './scrollbar.css';
import NavBar from './components/NavBar';
import cardData from './CardData.json';
import Nodes from './components/Nodes';
import Settings from './components/Settings';
import Other from './components/Other';
import FaucetModal from './components/FaucetModal';
import WalletModal from './components/WalletModal';
import FastWithdrawalModal from './components/FastWithdrawalModal';
import SettingsModal from './components/SettingsModal';
import WelcomeModal from './components/WelcomeModal';
import QuoteWidget from './components/QuoteWidget';
import ShutdownModal from './components/ShutdownModal';
import DownloadInProgressModal from './components/DownloadInProgressModal';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import type { DownloadEntry } from './store/downloadSlice';

// AppContent can return null before initialization
function AppContent(): JSX.Element | null {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
  const [activeDownloads, setActiveDownloads] = useState<DownloadEntry[]>([]);
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Make cardData globally available
  useEffect(() => {
    (window as any).cardData = cardData;
  }, []);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  // Listen for downloads-in-progress event
  useEffect(() => {
    const unsubscribe = (window as any).electronAPI.onDownloadsInProgress((downloads: DownloadEntry[]) => {
      setActiveDownloads(downloads);
      setShowDownloadModal(true);
    });
    return () => unsubscribe();
  }, []);

  const handleForceQuit = (): void => {
    (window as any).electronAPI.forceQuitWithDownloads();
  };

  // Check for updates and master wallet on startup
  useEffect(() => {
    const initializeApp = async (): Promise<void> => {
      try {
        const result = await (window as any).electronAPI.getMasterWallet();
        if (!result.success || !result.data) {
          setShowWelcomeModal(true);
        }
      } catch (error) {
        console.error('Error checking master wallet:', error);
        setShowWelcomeModal(true);
      } finally {
        setIsInitialized(true);
        // Signal that app is fully initialized
        (window as any).electronAPI.notifyReady();
      }
    };

    initializeApp();
  }, [dispatch]);

  if (!isInitialized) {
    return null; // nothing until initialized
  }

  return (
    <Router>
      <div className="App">
        <NavBar />
        <Routes>
          <Route path="/" element={<Navigate to="/chains" replace />} />
          <Route path="/chains" element={<Nodes />} />
          <Route path="/wallet" element={<WalletModal />} />
          <Route path="/fast-withdrawal" element={<FastWithdrawalModal />} />
        </Routes>
        <FaucetModal />
        <SettingsModal onResetComplete={() => setShowWelcomeModal(true)} />
        <WelcomeModal 
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
        />
        <QuoteWidget />
        <ShutdownModal />
        <DownloadInProgressModal
          downloads={activeDownloads}
          onClose={() => setShowDownloadModal(false)}
          onForceQuit={handleForceQuit}
          isOpen={showDownloadModal}
        />
      </div>
    </Router>
  );
}

// Main App component
function App(): JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
