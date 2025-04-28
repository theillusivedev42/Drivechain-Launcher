import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import styles from './WalletModal.module.css';
import { Eye, EyeOff } from 'lucide-react';

const WalletModal = () => {
  const { isLoading, error } = useSelector(state => state.walletModal);
  const [revealedMnemonics, setRevealedMnemonics] = useState({
    master: false,
    layer1: false,
    layer2_thunder: false,
    layer2_bitnames: false,
    layer2_zside: false
  });
  const [mnemonics, setMnemonics] = useState({
    master: '••••••••••••',
    layer1: '••••••••••••',
    layer2_thunder: '••••••••••••',
    layer2_bitnames: '••••••••••••',
    layer2_zside: '••••••••••••'
  });

  const toggleMnemonic = async (key) => {
    // If we're hiding the current one, just hide it
    if (revealedMnemonics[key]) {
      setRevealedMnemonics(prev => ({
        master: false,
        layer1: false,
        layer2_thunder: false,
        layer2_bitnames: false,
        layer2_zside: false
      }));
      return;
    }

    // If we're revealing a new one, hide all others first
    if (!revealedMnemonics[key] && mnemonics[key] === '••••••••••••') {
      try {
        let type;
        switch (key) {
          case 'master':
            type = 'master';
            break;
          case 'layer1':
            type = 'layer1';
            break;
          case 'layer2_thunder':
            type = 'thunder';
            break;
          case 'layer2_bitnames':
            type = 'bitnames';
            break;
          case 'layer2_zside':
            type = 'zside';
            break;
        }
        const result = await window.electronAPI.getWalletStarter(type);
        if (result.success) {
          setMnemonics(prev => ({
            ...prev,
            [key]: result.data
          }));
        }
      } catch (error) {
        console.error('Error fetching mnemonic:', error);
      }
    }
    
    // Set only the current one to visible
    setRevealedMnemonics({
      master: false,
      layer1: false,
      layer2_thunder: false,
      layer2_bitnames: false,
      layer2_zside: false,
      [key]: true
    });
  };
  return (
    <div className={styles.pageContainer}>
      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}
        {isLoading && <div className={styles.loading}>Loading...</div>}

        <div className={styles.starterTable} style={{ marginTop: '20px' }}>
          {/* Starter section */}
          <div className={styles.sectionHeader}>
            <div className={styles.typeCol}></div>
            <div className={styles.starterCol}>Starter</div>
            <div className={styles.mnemonicCol}>Mnemonic</div>
            <div className={styles.actionsCol}></div>
          </div>
          <div className={styles.tableRow}>
            <div className={styles.typeCol}>
              <div className={`${styles.chainTypeBadge} ${styles.l1Badge}`}>L1</div>
            </div>
            <div className={styles.starterCol}>Master</div>
            <div className={styles.mnemonicCol}>
              {revealedMnemonics.master ? mnemonics.master : '••••••••••••'}
            </div>
            <div className={styles.actionsCol}>
              <button 
                className={styles.iconButton} 
                title={revealedMnemonics.master ? "Hide" : "Reveal"}
                onClick={() => toggleMnemonic('master')}
              >
                {revealedMnemonics.master ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {/* Delete functionality not yet implemented
              <button className={styles.deleteIconButton} title="Delete Starter">
                <Trash2 size={18} />
              </button>
              */}
            </div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.typeCol}>
              <div className={`${styles.chainTypeBadge} ${styles.l1Badge}`}>L1</div>
            </div>
            <div className={styles.starterCol}>Bitcoin Core</div>
            <div className={styles.mnemonicCol}>
              {revealedMnemonics.layer1 ? mnemonics.layer1 : '••••••••••••'}
            </div>
            <div className={styles.actionsCol}>
              <button 
                className={styles.iconButton} 
                title={revealedMnemonics.layer1 ? "Hide" : "Reveal"}
                onClick={() => toggleMnemonic('layer1')}
              >
                {revealedMnemonics.layer1 ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {/* Delete functionality not yet implemented
              <button className={styles.deleteIconButton} title="Delete Starter">
                <Trash2 size={18} />
              </button>
              */}
            </div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.typeCol}>
              <div className={`${styles.chainTypeBadge} ${styles.l2Badge}`}>L2</div>
            </div>
            <div className={styles.starterCol}>Thunder</div>
            <div className={styles.mnemonicCol}>
              {revealedMnemonics.layer2_thunder ? mnemonics.layer2_thunder : '••••••••••••'}
            </div>
            <div className={styles.actionsCol}>
              <button 
                className={styles.iconButton} 
                title={revealedMnemonics.layer2_thunder ? "Hide" : "Reveal"}
                onClick={() => toggleMnemonic('layer2_thunder')}
              >
                {revealedMnemonics.layer2_thunder ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {/* Delete functionality not yet implemented
              <button className={styles.deleteIconButton} title="Delete Starter">
                <Trash2 size={18} />
              </button>
              */}
            </div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.typeCol}>
              <div className={`${styles.chainTypeBadge} ${styles.l2Badge}`}>L2</div>
            </div>
            <div className={styles.starterCol}>Bitnames</div>
            <div className={styles.mnemonicCol}>
              {revealedMnemonics.layer2_bitnames ? mnemonics.layer2_bitnames : '••••••••••••'}
            </div>
            <div className={styles.actionsCol}>
              <button 
                className={styles.iconButton} 
                title={revealedMnemonics.layer2_bitnames ? "Hide" : "Reveal"}
                onClick={() => toggleMnemonic('layer2_bitnames')}
              >
                {revealedMnemonics.layer2_bitnames ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {/* Delete functionality not yet implemented
              <button className={styles.deleteIconButton} title="Delete Starter">
                <Trash2 size={18} />
              </button>
              */}
            </div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.typeCol}>
              <div className={`${styles.chainTypeBadge} ${styles.l2Badge}`}>L2</div>
            </div>
            <div className={styles.starterCol}>zSide</div>
            <div className={styles.mnemonicCol}>
              {revealedMnemonics.layer2_zside ? mnemonics.layer2_zside : '••••••••••••'}
            </div>
            <div className={styles.actionsCol}>
              <button 
                className={styles.iconButton} 
                title={revealedMnemonics.layer2_zside ? "Hide" : "Reveal"}
                onClick={() => toggleMnemonic('layer2_zside')}
              >
                {revealedMnemonics.layer2_zside ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {/* Delete functionality not yet implemented
              <button className={styles.deleteIconButton} title="Delete Starter">
                <Trash2 size={18} />
              </button>
              */}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WalletModal;
