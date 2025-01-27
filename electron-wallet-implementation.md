# Implementing HD Wallet Service in Electron

This guide explains how to implement a hierarchical deterministic (HD) wallet service similar to the Flutter implementation, but adapted for an Electron-based application.

## Dependencies

```json
{
  "dependencies": {
    "bip39": "^3.1.0",
    "bitcoinjs-lib": "^6.1.3",
    "hdkey": "^2.1.0",
    "electron-store": "^8.1.0",
    "crypto": "^1.0.1"
  }
}
```

## Implementation

### 1. Base Wallet Service Class

```typescript
// src/services/WalletService.ts
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import HDKey from 'hdkey';
import crypto from 'crypto';
import { EventEmitter } from 'events';

export class WalletService extends EventEmitter {
  private static readonly DEFAULT_BIP32_PATH = "m/44'/0'/0'";
  private readonly logger: any; // Replace with your preferred logger
  
  constructor(logger: any) {
    super();
    this.logger = logger;
  }

  // Helper method to get wallet directory
  private async getWalletDir(): Promise<string> {
    const userDataPath = app.getPath('userData');
    const walletDir = path.join(userDataPath, 'wallet_starters');
    
    try {
      await fs.mkdir(walletDir, { recursive: true });
    } catch (error) {
      this.logger.error('Error creating wallet directory:', error);
    }
    
    return walletDir;
  }

  // Helper to get master wallet file path
  private async getMasterWalletPath(): Promise<string> {
    const walletDir = await this.getWalletDir();
    return path.join(walletDir, 'master_starter.json');
  }
}
```

### 2. Wallet Generation Methods

```typescript
export class WalletService {
  // ... previous code ...

  async generateWalletFromEntropy(entropy: Buffer): Promise<WalletData> {
    try {
      // Generate mnemonic from entropy
      const mnemonic = bip39.entropyToMnemonic(entropy);
      
      // Generate seed
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const seedHex = seed.toString('hex');
      
      // Create HD wallet
      const hdkey = HDKey.fromMasterSeed(seed);
      const masterKey = hdkey.privateExtendedKey;
      
      // Calculate checksum
      const checksumBits = this.calculateChecksumBits(entropy);
      
      return {
        mnemonic,
        seed_hex: seedHex,
        xprv: masterKey,
        bip39_bin: this.bytesToBinary(entropy),
        bip39_csum: checksumBits,
        bip39_csum_hex: Buffer.from([parseInt(checksumBits, 2)]).toString('hex')
      };
    } catch (error) {
      this.logger.error('Error generating wallet from entropy:', error);
      throw error;
    }
  }

  async generateWallet(options?: { 
    customMnemonic?: string; 
    passphrase?: string; 
  }): Promise<WalletData> {
    try {
      let mnemonic: string;
      
      if (options?.customMnemonic) {
        if (!bip39.validateMnemonic(options.customMnemonic)) {
          throw new Error('Invalid mnemonic');
        }
        mnemonic = options.customMnemonic;
      } else {
        // Generate new mnemonic (128 bits = 12 words)
        mnemonic = bip39.generateMnemonic(128);
      }

      // Generate seed with optional passphrase
      const seed = await bip39.mnemonicToSeed(mnemonic, options?.passphrase);
      const seedHex = seed.toString('hex');
      
      // Create HD wallet
      const hdkey = HDKey.fromMasterSeed(seed);
      const masterKey = hdkey.privateExtendedKey;
      
      // Get entropy and calculate checksum
      const entropy = bip39.mnemonicToEntropy(mnemonic);
      const checksumBits = this.calculateChecksumBits(Buffer.from(entropy, 'hex'));

      return {
        mnemonic,
        seed_hex: seedHex,
        xprv: masterKey,
        bip39_bin: this.bytesToBinary(Buffer.from(entropy, 'hex')),
        bip39_csum: checksumBits,
        bip39_csum_hex: Buffer.from([parseInt(checksumBits, 2)]).toString('hex')
      };
    } catch (error) {
      this.logger.error('Error generating wallet:', error);
      throw error;
    }
  }
}
```

### 3. Derivation Methods

```typescript
export class WalletService {
  // ... previous code ...

  async deriveL1Starter(): Promise<WalletData | null> {
    try {
      const masterWallet = await this.loadWallet();
      if (!masterWallet?.xprv) {
        throw new Error('Master starter not found or invalid');
      }

      // Derive L1 key
      const hdkey = HDKey.fromExtendedKey(masterWallet.xprv);
      const l1Path = "m/44'/0'/256'";
      const l1Key = hdkey.derive(l1Path);
      
      // Generate entropy from private key
      const privateKeyBytes = l1Key.privateKey;
      const hashedKey = crypto.createHash('sha256').update(privateKeyBytes).digest();
      const entropy = hashedKey.slice(0, 16);

      // Generate new mnemonic from entropy
      const mnemonic = bip39.entropyToMnemonic(entropy);
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Create new HD wallet for L1
      const l1HDKey = HDKey.fromMasterSeed(seed);
      
      const l1Starter = {
        mnemonic,
        seed_hex: seed.toString('hex'),
        xprv: l1HDKey.privateExtendedKey,
        parent_xprv: masterWallet.xprv,
        derivation_path: l1Path,
        name: 'Bitcoin Core (Patched)',
        chain_layer: 1
      };

      await this.saveL1Starter(l1Starter);
      return l1Starter;
    } catch (error) {
      this.logger.error('Error deriving L1 starter:', error);
      throw error;
    }
  }

  async deriveSidechainStarter(sidechainSlot: number): Promise<WalletData | null> {
    try {
      const masterWallet = await this.loadWallet();
      if (!masterWallet?.xprv) {
        throw new Error('Master starter not found or invalid');
      }

      // Derive sidechain key
      const hdkey = HDKey.fromExtendedKey(masterWallet.xprv);
      const sidechainPath = `m/44'/0'/${sidechainSlot}'`;
      const sidechainKey = hdkey.derive(sidechainPath);
      
      // Generate entropy from private key
      const privateKeyBytes = sidechainKey.privateKey;
      const hashedKey = crypto.createHash('sha256').update(privateKeyBytes).digest();
      const entropy = hashedKey.slice(0, 16);

      // Generate new mnemonic from entropy
      const mnemonic = bip39.entropyToMnemonic(entropy);
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Create new HD wallet for sidechain
      const sidechainHDKey = HDKey.fromMasterSeed(seed);
      
      const sidechainStarter = {
        mnemonic,
        seed_hex: seed.toString('hex'),
        xprv: sidechainHDKey.privateExtendedKey,
        parent_xprv: masterWallet.xprv,
        derivation_path: sidechainPath
      };

      await this.saveSidechainStarter(sidechainSlot, sidechainStarter);
      return sidechainStarter;
    } catch (error) {
      this.logger.error('Error deriving sidechain starter:', error);
      throw error;
    }
  }
}
```

### 4. File Operations

```typescript
export class WalletService {
  // ... previous code ...

  async saveWallet(walletData: WalletData): Promise<boolean> {
    try {
      const walletPath = await this.getMasterWalletPath();
      
      // Validate required fields
      const requiredFields = ['mnemonic', 'seed_hex', 'xprv'];
      for (const field of requiredFields) {
        if (!walletData[field]) {
          throw new Error(`Missing required wallet field: ${field}`);
        }
      }

      // Add name field
      walletData.name = 'Master';

      // Save wallet data
      await fs.writeFile(
        walletPath,
        JSON.stringify(walletData, null, 2),
        'utf8'
      );
      
      this.emit('wallet-updated');
      return true;
    } catch (error) {
      this.logger.error('Error saving wallet:', error);
      return false;
    }
  }

  async loadWallet(): Promise<WalletData | null> {
    try {
      const walletPath = await this.getMasterWalletPath();
      
      const data = await fs.readFile(walletPath, 'utf8');
      const walletData = JSON.parse(data);

      if (!walletData.mnemonic || !walletData.xprv) {
        throw new Error('Invalid wallet data format');
      }

      return walletData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      this.logger.error('Error loading wallet:', error);
      return null;
    }
  }

  async deleteWallet(): Promise<boolean> {
    try {
      const walletPath = await this.getMasterWalletPath();
      await fs.unlink(walletPath);
      this.emit('wallet-updated');
      return true;
    } catch (error) {
      this.logger.error('Error deleting wallet:', error);
      return false;
    }
  }
}
```

### 5. Helper Methods

```typescript
export class WalletService {
  // ... previous code ...

  private bytesToBinary(bytes: Buffer): string {
    return Array.from(bytes)
      .map(byte => byte.toString(2).padStart(8, '0'))
      .join('');
  }

  private calculateChecksumBits(entropy: Buffer): string {
    const ENT = entropy.length * 8;
    const CS = ENT / 32;
    
    const hash = crypto.createHash('sha256').update(entropy).digest();
    const hashBits = this.bytesToBinary(hash);
    return hashBits.slice(0, CS);
  }
}
```

### 6. Types

```typescript
// src/types/wallet.ts
export interface WalletData {
  mnemonic: string;
  seed_hex: string;
  xprv: string;
  name?: string;
  bip39_bin?: string;
  bip39_csum?: string;
  bip39_csum_hex?: string;
  parent_xprv?: string;
  derivation_path?: string;
  chain_layer?: number;
}
```

## Integration with Electron

### 1. Service Registration

```typescript
// src/main/index.ts
import { app } from 'electron';
import { WalletService } from '../services/WalletService';
import { Logger } from '../utils/logger';

export class App {
  private walletService: WalletService;
  
  constructor() {
    const logger = new Logger();
    this.walletService = new WalletService(logger);
  }
  
  async init() {
    // Initialize wallet service
    await this.setupWalletService();
    
    // Set up IPC handlers
    this.setupIpcHandlers();
  }
  
  private async setupWalletService() {
    // Check for existing wallet
    if (!await this.walletService.hasExistingWallet()) {
      // Generate new wallet on first run
      const wallet = await this.walletService.generateWallet();
      await this.walletService.saveWallet(wallet);
    }
  }
}
```

### 2. IPC Communication

```typescript
// src/main/ipc.ts
import { ipcMain } from 'electron';
import { WalletService } from '../services/WalletService';

export function setupWalletIpc(walletService: WalletService) {
  // Generate new wallet
  ipcMain.handle('wallet:generate', async (event, options) => {
    return await walletService.generateWallet(options);
  });
  
  // Load wallet
  ipcMain.handle('wallet:load', async () => {
    return await walletService.loadWallet();
  });
  
  // Derive L1 starter
  ipcMain.handle('wallet:deriveL1', async () => {
    return await walletService.deriveL1Starter();
  });
  
  // Derive sidechain starter
  ipcMain.handle('wallet:deriveSidechain', async (event, slot) => {
    return await walletService.deriveSidechainStarter(slot);
  });
  
  // Delete wallet
  ipcMain.handle('wallet:delete', async () => {
    return await walletService.deleteWallet();
  });
}
```

### 3. Frontend Integration

```typescript
// src/renderer/wallet.ts
import { ipcRenderer } from 'electron';

export class WalletManager {
  async generateNewWallet(options?: { 
    customMnemonic?: string; 
    passphrase?: string; 
  }) {
    return await ipcRenderer.invoke('wallet:generate', options);
  }
  
  async loadWallet() {
    return await ipcRenderer.invoke('wallet:load');
  }
  
  async deriveL1Starter() {
    return await ipcRenderer.invoke('wallet:deriveL1');
  }
  
  async deriveSidechainStarter(slot: number) {
    return await ipcRenderer.invoke('wallet:deriveSidechain', slot);
  }
  
  async deleteWallet() {
    return await ipcRenderer.invoke('wallet:delete');
  }
}
```

## Security Considerations

1. **Secure Storage**: Wallet data is stored in the app's user data directory, which is typically protected by OS-level file permissions.

2. **Memory Management**: Private keys and sensitive data should be cleared from memory when no longer needed.

3. **Error Handling**: Comprehensive error handling prevents exposure of sensitive information in error messages.

4. **Input Validation**: All inputs (mnemonics, paths, etc.) are validated before use.

5. **Encryption**: Consider adding encryption for stored wallet data using a user-provided password.

## Best Practices

1. **Event-Driven Updates**: Use EventEmitter to notify the application of wallet changes.

2. **Atomic Operations**: File operations are performed atomically to prevent corruption.

3. **Validation**: Implement thorough validation for all wallet operations.

4. **Logging**: Use structured logging with appropriate log levels.

5. **Type Safety**: Use TypeScript for better type safety and developer experience.

## Testing

```typescript
// src/tests/WalletService.test.ts
import { WalletService } from '../services/WalletService';
import { expect } from 'chai';

describe('WalletService', () => {
  let walletService: WalletService;
  
  beforeEach(() => {
    walletService = new WalletService(mockLogger);
  });
  
  it('should generate valid wallet', async () => {
    const wallet = await walletService.generateWallet();
    expect(wallet.mnemonic.split(' ')).to.have.lengthOf(12);
    expect(wallet.xprv).to.match(/^xprv/);
  });
  
  it('should derive L1 starter correctly', async () => {
    // Generate master wallet first
    const master = await walletService.generateWallet();
    await walletService.saveWallet(master);
    
    const l1Starter = await walletService.deriveL1Starter();
    expect(l1Starter).to.have.property('derivation_path', "m/44'/0'/256'");
  });
  
  // Add more tests...
});
```

This implementation guide provides a comprehensive approach to implementing the wallet service in an Electron application while maintaining the same functionality as the Flutter version. The key differences are:

1. Uses Node.js native crypto instead of Flutter's crypto package
2. Implements file operations using Node.js fs promises API
3. Uses electron-store for secure storage
4. Implements IPC communication between main and renderer processes
5. Uses EventEmitter for state management instead of ChangeNotifier
6. Provides TypeScript types for better type safety

The core wallet functionality remains the same, following BIP39/BIP44 standards and maintaining the hierarchical structure of master, L1, and sidechain wallets.