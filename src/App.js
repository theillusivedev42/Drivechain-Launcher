import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import './scrollbar.css';
import NavBar from './components/NavBar';
import Nodes from './components/Nodes';
// import Tools from './components/Tools';
import Settings from './components/Settings';
import Other from './components/Other';
import FaucetModal from './components/FaucetModal';
import WalletModal from './components/WalletModal';
import WelcomeModal from './components/WelcomeModal';
import QuoteWidget from './components/QuoteWidget';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

function AppContent() {
  const { isDarkMode } = useTheme();
  // TODO: Implement file checking logic to determine when to show the welcome modal
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

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
        <WelcomeModal 
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
        />
        <QuoteWidget />
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
