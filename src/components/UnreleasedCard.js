import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import styles from './UnreleasedCard.module.css';

const UnreleasedCard = ({ chain }) => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`${styles.card} ${isDarkMode ? 'dark' : 'light'}`}>
      <div className={styles.cardHeader}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>{chain.display_name}</h2>
        </div>
      </div>
      <div className={styles.cardContent}>
        <p className={styles.description}>In development, contribute here:</p>
        <a
          href={chain.repo_url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          {chain.repo_url}
        </a>
      </div>
    </div>
  );
};

export default UnreleasedCard;
