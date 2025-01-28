import React, { useRef, useEffect, memo } from 'react';
import { Trash2 } from 'lucide-react';
import styles from './LogWindow.module.css';

const LogWindow = memo(({ logs, title, onClear }) => {
  const logContentRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContentRef.current) {
      logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={styles.logWindow}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title} Logs</h3>
        <button className={styles.clearButton} onClick={onClear} title="Clear logs">
          <Trash2 size={14} />
        </button>
      </div>
      <div className={styles.logContent} ref={logContentRef}>
        {logs.map((log, index) => (
          <div key={index} className={styles.logMessage}>
            <span className={styles.timestamp}>{log.timestamp}</span>
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
});

export default LogWindow;
