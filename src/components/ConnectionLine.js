import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ConnectionLine.css';

const ConnectionLine = ({ startX, startY, endX, endY, isAnimated }) => {
  const { isDarkMode } = useTheme();
  
  // Calculate line length and angle
  const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
  
  return (
    <div
      className={`connection-line ${isAnimated ? 'animated' : ''} ${isDarkMode ? 'dark' : ''}`}
      style={{
        width: `${length}px`,
        left: `${startX}px`,
        top: `${startY}px`,
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
};

export default ConnectionLine;
