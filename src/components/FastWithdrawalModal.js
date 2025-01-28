import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideFastWithdrawalModal } from '../store/fastWithdrawalModalSlice';
import styles from './FastWithdrawalModal.module.css';

const FastWithdrawalModal = () => {
  const dispatch = useDispatch();
  const isVisible = useSelector((state) => state.fastWithdrawalModal.isVisible);

  if (!isVisible) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Fast Withdrawal</h2>
        <button onClick={() => dispatch(hideFastWithdrawalModal())}>Close</button>
      </div>
    </div>
  );
};

/* File I/O Implementation Guide

1. Text Input Setup:
   - Create a state variable for the input:
     const [inputValue, setInputValue] = useState('');
   - Add an input element:
     <input
       type="text"
       value={inputValue}
       onChange={(e) => setInputValue(e.target.value)}
       placeholder="Enter withdrawal amount"
     />

2. Input Validation:
   - Create a validation function:
     const validateInput = (value) => {
       const number = parseFloat(value);
       return !isNaN(number) && number > 0;
     }
   - Add error state:
     const [error, setError] = useState('');
   - Validate on change:
     const handleInputChange = (e) => {
       setInputValue(e.target.value);
       setError(validateInput(e.target.value) ? '' : 'Please enter a valid amount');
     }

3. File Writing:
   - Import the electron window interface from preload.js:
     const { electron } = window;
   - Create a write function:
     const writeToFile = async () => {
       try {
         // Assuming electron.writeFile is exposed in preload.js
         await electron.writeFile('withdrawal-data.json', JSON.stringify({
           amount: inputValue,
           timestamp: new Date().toISOString()
         }));
       } catch (error) {
         console.error('Failed to write file:', error);
       }
     }

4. File Reading:
   - Create a read function:
     const readFromFile = async () => {
       try {
         // Assuming electron.readFile is exposed in preload.js
         const data = await electron.readFile('withdrawal-data.json');
         return JSON.parse(data);
       } catch (error) {
         console.error('Failed to read file:', error);
         return null;
       }
     }

5. Required Files/Changes:

   a. public/preload.js:
      - Add IPC handlers for file operations:
        contextBridge.exposeInMainWorld('electron', {
          writeFile: (filename, data) => ipcRenderer.invoke('write-file', filename, data),
          readFile: (filename) => ipcRenderer.invoke('read-file', filename)
        });

   b. public/electron.js:
      - Add IPC handlers for file operations:
        ipcMain.handle('write-file', async (event, filename, data) => {
          const filePath = path.join(app.getPath('userData'), filename);
          await fs.writeFile(filePath, data);
        });
        
        ipcMain.handle('read-file', async (event, filename) => {
          const filePath = path.join(app.getPath('userData'), filename);
          return await fs.readFile(filePath, 'utf8');
        });

6. Usage Example:
   const handleSubmit = async () => {
     if (!validateInput(inputValue)) {
       setError('Invalid input');
       return;
     }
     
     await writeToFile();
     const data = await readFromFile();
     console.log('Saved data:', data);
   }

Note: This implementation uses Electron's IPC (Inter-Process Communication) system
to safely handle file operations between the renderer process (React) and the main process.
The actual file operations occur in the main process for security reasons.
*/

export default FastWithdrawalModal;
