# Guide: Porting Drivechain Wallet System to Electron

## Overview
This guide explains how to port the Drivechain wallet system from Flutter to Electron. The system manages wallets for Layer 1 (Bitcoin Core) and Layer 2 chains (Thunder, Bitnames) using hierarchical deterministic (HD) wallet derivation.

## Core Functionality
1. Generate/store master wallet
2. Derive chain-specific wallets (L1 and L2)
3. Manage binary launches with starter wallets
4. Handle wallet UI and interactions

## Required Dependencies
```json
{
  "dependencies": {
    "bip39": "^3.1.0",        // Mnemonic generation/handling
    "bip32": "^4.0.0",        // HD wallet derivation
    "crypto": "^1.0.1",       // Node's crypto utilities
    "electron-store": "^8.1.0" // Secure storage
  }
}
```

## Project Structure
```
src/
├── main/
│   ├── wallet-service.js     # Core wallet functionality
│   ├── binary-manager.js     # Binary process management
│   └── ipc-handlers.js       # IPC communication
├── renderer/
│   ├── components/
│   │   ├── WalletView.js     # Wallet UI components
│   │   └── ChainControl.js   # Chain control UI
│   └── ipc-client.js         # Renderer IPC wrappers
└── shared/
    └── constants.js          # Shared constants/types
```

## Implementation Guide

### 1. Wallet Service (main/wallet-service.js)
Core class handling wallet operations:

```javascript
const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bip32 = BIP32Factory(ecc);
const crypto = require('crypto');
const Store = require('electron-store');
const path = require('path');
const fs = require('fs');

class WalletService {
  constructor() {
    this.store = new Store({
      name: 'wallet-data',
      encryptionKey: 'your-encryption-key' // Use proper key management
    });
    
    this.walletDir = path.join(app.getPath('userData'), 'wallet_starters');
    fs.mkdirSync(this.walletDir, { recursive: true });
  }

  // Generate or import master wallet
  async generateMasterWallet(customMnemonic = null) {
    const mnemonic = customMnemonic || bip39.generateMnemonic(128);
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const masterKey = bip32.fromSeed(seed);

    const masterData = {
      mnemonic,
      xprv: masterKey.toBase58(),
      name: 'Master'
    };

    this.store.set('master_starter', masterData);
    return masterData;
  }

  // Derive chain-specific starter wallet
  async deriveStarter(derivationPath, name) {
    const masterData = this.store.get('master_starter');
    if (!masterData) throw new Error('Master starter not found');

    const masterKey = bip32.fromBase58(masterData.xprv);
    const derivedKey = masterKey.derivePath(derivationPath);
    
    // Generate new mnemonic from derived key
    const privateKeyBytes = derivedKey.privateKey;
    const hash = crypto.createHash('sha256').update(privateKeyBytes).digest();
    const entropy = hash.slice(0, 16);
    const mnemonic = bip39.entropyToMnemonic(entropy);

    return {
      mnemonic,
      xprv: derivedKey.toBase58(),
      name
    };
  }

  // Derive L2 sidechain starter
  async deriveSidechainStarter(slot) {
    const derivationPath = `m/44'/0'/${slot}'`;
    const starterData = await this.deriveStarter(derivationPath);
    
    const filePath = path.join(this.walletDir, `sidechain_${slot}_starter.txt`);
    fs.writeFileSync(filePath, starterData.mnemonic);
    
    return starterData;
  }

  // Derive L1 starter
  async deriveL1Starter() {
    const derivationPath = `m/44'/0'/256'`;
    const starterData = await this.deriveStarter(derivationPath, 'Bitcoin Core (Patched)');
    
    const filePath = path.join(this.walletDir, 'l1_starter.txt');
    fs.writeFileSync(filePath, starterData.mnemonic);
    
    return starterData;
  }

  // Load existing starter
  loadStarter(slot) {
    const filePath = path.join(
      this.walletDir, 
      slot === 'l1' ? 'l1_starter.txt' : `sidechain_${slot}_starter.txt`
    );
    
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  }

  // Delete starter
  deleteStarter(slot) {
    const filePath = path.join(
      this.walletDir, 
      slot === 'l1' ? 'l1_starter.txt' : `sidechain_${slot}_starter.txt`
    );
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
```

### 2. Binary Manager (main/binary-manager.js)
Handles binary process management:

```javascript
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class BinaryManager {
  constructor() {
    this.binaries = new Map();
    this.walletDir = path.join(app.getPath('userData'), 'wallet_starters');
  }

  async startBinary(binary, useStarter = false) {
    const args = [];
    
    if (useStarter && binary.chainLayer === 2) {
      const starterPath = path.join(
        this.walletDir,
        `sidechain_${binary.slot}_starter.txt`
      );
      
      if (fs.existsSync(starterPath)) {
        args.push('--mnemonic-seed-phrase-path', starterPath);
      }
    }

    const proc = spawn(binary.path, args);
    this.binaries.set(binary.name, proc);
    
    return new Promise((resolve, reject) => {
      proc.once('spawn', () => resolve());
      proc.once('error', reject);
    });
  }

  async stopBinary(binaryName) {
    const proc = this.binaries.get(binaryName);
    if (proc) {
      proc.kill();
      this.binaries.delete(binaryName);
    }
  }

  isRunning(binaryName) {
    return this.binaries.has(binaryName);
  }
}
```

### 3. IPC Communication (main/ipc-handlers.js)
Set up IPC handlers in main process:

```javascript
const { ipcMain } = require('electron');

function setupIpcHandlers(walletService, binaryManager) {
  // Wallet operations
  ipcMain.handle('generate-master-wallet', async (event, customMnemonic) => {
    return await walletService.generateMasterWallet(customMnemonic);
  });

  ipcMain.handle('derive-sidechain-starter', async (event, slot) => {
    return await walletService.deriveSidechainStarter(slot);
  });

  ipcMain.handle('derive-l1-starter', async (event) => {
    return await walletService.deriveL1Starter();
  });

  // Binary operations
  ipcMain.handle('start-binary', async (event, binary, useStarter) => {
    return await binaryManager.startBinary(binary, useStarter);
  });

  ipcMain.handle('stop-binary', async (event, binaryName) => {
    return await binaryManager.stopBinary(binaryName);
  });
}
```

### 4. Renderer IPC Client (renderer/ipc-client.js)
Wrapper for IPC calls in renderer process:

```javascript
const { ipcRenderer } = require('electron');

export const WalletClient = {
  generateMasterWallet: (customMnemonic) => 
    ipcRenderer.invoke('generate-master-wallet', customMnemonic),

  deriveSidechainStarter: (slot) =>
    ipcRenderer.invoke('derive-sidechain-starter', slot),

  deriveL1Starter: () =>
    ipcRenderer.invoke('derive-l1-starter'),
};

export const BinaryClient = {
  startBinary: (binary, useStarter) =>
    ipcRenderer.invoke('start-binary', binary, useStarter),

  stopBinary: (binaryName) =>
    ipcRenderer.invoke('stop-binary', binaryName),
};
```

### 5. Chain Configuration
Define chain configurations:

```javascript
// shared/constants.js
const CHAIN_CONFIGS = {
  l1: {
    name: 'Bitcoin Core (Patched)',
    chainLayer: 1,
    binary: 'bitcoind',
    derivationPath: "m/44'/0'/256'"
  },
  thunder: {
    name: 'Thunder',
    chainLayer: 2,
    binary: 'thunderd',
    slot: 1,
    derivationPath: "m/44'/0'/1'"
  },
  bitnames: {
    name: 'Bitnames',
    chainLayer: 2,
    binary: 'bitnamesd',
    slot: 2,
    derivationPath: "m/44'/0'/2'"
  }
};
```

## Key Differences from Flutter Implementation

1. **Storage**
   - Uses electron-store instead of plain files
   - Encrypted storage for sensitive data
   - Node.js file system operations

2. **Process Management**
   - Node's child_process.spawn instead of Dart Process
   - Different binary path handling for Windows/Mac/Linux

3. **IPC Communication**
   - Electron IPC between main/renderer
   - Async communication patterns
   - Event-based updates

4. **UI Implementation**
   - React/HTML/CSS instead of Flutter widgets
   - Different state management patterns
   - Web-based rendering

## Security Considerations

1. **Storage Security**
   - Use proper encryption for electron-store
   - Secure key management
   - Clear sensitive data from memory

2. **IPC Security**
   - Validate all IPC inputs
   - Use secure channels
   - Prevent unauthorized access

3. **File Security**
   - Proper file permissions
   - Secure path handling
   - Sanitize all inputs

4. **Process Security**
   - Validate binary paths
   - Sanitize command arguments
   - Handle process errors

## Testing Guide

1. **Unit Tests**
   - Test wallet derivation
   - Test binary management
   - Test IPC handlers

2. **Integration Tests**
   - Test full wallet workflow
   - Test binary start/stop
   - Test UI interactions

3. **Security Tests**
   - Test encryption
   - Test input validation
   - Test error handling

## Deployment Considerations

1. **Packaging**
   - Use electron-builder
   - Handle native dependencies
   - Platform-specific builds

2. **Updates**
   - Implement auto-updates
   - Handle migration
   - Version management

3. **Distribution**
   - Code signing
   - Platform stores
   - Update servers

This guide provides the foundation for porting the Drivechain wallet system to Electron. Adapt the implementation details based on your specific needs and security requirements.
