import React from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

const Tooltip = ({ text, visible, position }) => {
  if (!visible) return null;
  
  return createPortal(
    <div 
      className="tooltip" 
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px` 
      }}
    >
      {text}
    </div>,
    document.body
  );
};

export default Tooltip;
