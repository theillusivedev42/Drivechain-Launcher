import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const UnreleasedCard = ({ chain }) => {
  const { isDarkMode } = useTheme();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%' }}>
      <div className={`card ${isDarkMode ? 'dark' : 'light'}`}>
        <div className="card-header" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, lineHeight: 1.2, textAlign: 'left' }}>{chain.display_name}</h2>
          </div>
        </div>
        <div className="card-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px 0' }}>In development, contribute here:</p>
          <a
            href={chain.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--text-color)',
              fontSize: '0.9rem',
              wordBreak: 'break-all'
            }}
          >
            {chain.repo_url}
          </a>
        </div>
      </div>
    </div>
  );
};

export default UnreleasedCard;