import React from 'react';
import './Tooltip.css';

const Tooltip = ({ text, visible, position }) => {
  if (!visible) return null;
  
  return (
    <div 
      className="tooltip" 
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px` 
      }}
    >
      {text}
    </div>
  );
};

export default Tooltip;
