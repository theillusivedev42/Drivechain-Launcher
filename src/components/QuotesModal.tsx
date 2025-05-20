import React, { useState, useEffect, type FC, type MouseEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { X } from 'lucide-react';
import styles from './QuotesModal.module.css';
import quotes from '../data/quotes.json';
import { hideQuotesModal } from '../store/quotesModalSlice';

// Quote type from data
interface Quote { quote: string; author: string; }

const QuotesModal: FC = () => {
  const dispatch = useDispatch();
  const { isVisible } = useSelector((state: RootState) => state.quotesModal);
  const { showQuotes } = useSelector((state: RootState) => state.settings);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (isVisible) {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setCurrentQuote(quotes[randomIndex] as Quote);
    }
  }, [isVisible]);

  if (!showQuotes || !isVisible || !currentQuote) return null;

  const handleClose = (): void => {
    dispatch(hideQuotesModal());
  };

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Quote of the Day</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.quoteContainer}>
          <blockquote className={styles.quote}>
            {currentQuote.quote}
          </blockquote>
          <div className={styles.author}>
            — {currentQuote.author}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotesModal;
