import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideFastWithdrawalModal } from '../store/fastWithdrawalModalSlice';
import styles from './FastWithdrawalModal.module.css';

const FastWithdrawalModal = () => {
  const dispatch = useDispatch();
  const isVisible = useSelector((state) => state.fastWithdrawalModal.isVisible);
  
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [selectedServer, setSelectedServer] = useState('localhost');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const balance = await window.electronAPI.getBalanceBTC();
    console.debug('Balance:', balance);
    console.debug('Withdrawal submitted:', { amount, address, selectedServer });
  };

  if (!isVisible) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Fast Withdrawal</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter withdrawal amount"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter withdrawal address"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className={styles.input}
            >
              <option value="localhost">Localhost</option>
              <option value="192.168.1.100">192.168.1.100</option>
              <option value="192.168.1.101">192.168.1.101</option>
            </select>
          </div>
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitButton}>
              Submit Withdrawal
            </button>
            <button
              type="button"
              onClick={() => dispatch(hideFastWithdrawalModal())}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FastWithdrawalModal;
