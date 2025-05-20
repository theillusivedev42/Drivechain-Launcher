import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import styles from './ShutdownModal.module.css';

const ShutdownModal = () => {
  const { isDarkMode } = useTheme();
  const [timeLeft, setTimeLeft] = useState(30);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Listen for shutdown start
    const cleanup = window.electronAPI.receive("shutdown-started", () => {
      setShowModal(true);
      
      // Start countdown
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
        cleanup();
      };
    });
  }, []);

  const handleForceKill = () => {
    window.electronAPI.invoke('force-kill');
  };

  if (!showModal) return null;

  return (
    <div className={`${styles.modal} ${isDarkMode ? styles.dark : ''}`}>
      <div className={styles.modalContent}>
        <h2>Shutting Down</h2>
        <p>
          Safely stopping all running processes...
          {timeLeft > 0 && (
            <>
              <br />
              Auto force-kill in {timeLeft} seconds
            </>
          )}
        </p>
        <div className={styles.buttonContainer}>
          <button 
            className={styles.forceButton}
            onClick={handleForceKill}
          >
            Force Kill Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShutdownModal;
