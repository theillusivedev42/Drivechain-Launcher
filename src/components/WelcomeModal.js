import React from 'react';
import styles from './WelcomeModal.module.css';

const WelcomeModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Welcome to DC Launcher! 👋</h2>
        <div className={styles.modalBody}>
          <p>Thank you for using DC Launcher. Here are some key features:</p>
          <ul>
            <li>Easy chain management</li>
            <li>Built-in wallet integration</li>
            <li>Automated downloads and updates</li>
            <li>Quick start/stop functionality</li>
          </ul>
          <p>Get started by exploring the different sections in the navigation bar above!</p>
        </div>
        <button className={styles.closeButton} onClick={onClose}>
          Got it!
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;
