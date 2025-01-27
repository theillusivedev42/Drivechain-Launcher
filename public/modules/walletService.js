const { app } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');
const HDKey = require('hdkey');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class WalletService extends EventEmitter {
  static DEFAULT_BIP32_PATH = "m/44'/0'/0'";

  constructor() {
    super();
    this.walletDir = path.join(app.getPath('userData'), 'wallet_starters');
    fs.ensureDirSync(this.walletDir);
  }

  async generateWallet(options = {}) {
    try {
      let mnemonic;
      
      if (options.customMnemonic) {
        if (!bip39.validateMnemonic(options.customMnemonic)) {
          throw new Error('Invalid mnemonic');
        }
        mnemonic = options.customMnemonic;
      } else {
        // Generate new mnemonic (128 bits = 12 words)
        mnemonic = bip39.generateMnemonic(128);
      }

      // Generate seed with optional passphrase
      const seed = await bip39.mnemonicToSeed(mnemonic, options.passphrase);
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
      console.error('Error generating wallet:', error);
      throw error;
    }
  }

  async deriveL1Starter() {
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
      console.error('Error deriving L1 starter:', error);
      throw error;
    }
  }

  async deriveSidechainStarter(sidechainSlot) {
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
      console.error('Error deriving sidechain starter:', error);
      throw error;
    }
  }

  async saveWallet(walletData) {
    try {
      const walletPath = path.join(this.walletDir, 'master_starter.json');
      
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
      await fs.writeJson(walletPath, walletData, { spaces: 2 });
      
      this.emit('wallet-updated');
      return true;
    } catch (error) {
      console.error('Error saving wallet:', error);
      return false;
    }
  }

  async saveL1Starter(walletData) {
    const l1Path = path.join(this.walletDir, 'l1_starter.json');
    await fs.writeJson(l1Path, walletData, { spaces: 2 });
    this.emit('wallet-updated');
  }

  async saveSidechainStarter(slot, walletData) {
    const sidechainPath = path.join(this.walletDir, `sidechain_${slot}_starter.json`);
    await fs.writeJson(sidechainPath, walletData, { spaces: 2 });
    this.emit('wallet-updated');
  }

  async loadWallet() {
    try {
      const walletPath = path.join(this.walletDir, 'master_starter.json');
      
      if (await fs.pathExists(walletPath)) {
        const walletData = await fs.readJson(walletPath);
        if (!walletData.mnemonic || !walletData.xprv) {
          throw new Error('Invalid wallet data format');
        }
        return walletData;
      }
      return null;
    } catch (error) {
      console.error('Error loading wallet:', error);
      return null;
    }
  }

  async deleteWallet() {
    try {
      const walletPath = path.join(this.walletDir, 'master_starter.json');
      await fs.remove(walletPath);
      this.emit('wallet-updated');
      return true;
    } catch (error) {
      console.error('Error deleting wallet:', error);
      return false;
    }
  }

  bytesToBinary(bytes) {
    return Array.from(bytes)
      .map(byte => byte.toString(2).padStart(8, '0'))
      .join('');
  }

  calculateChecksumBits(entropy) {
    const ENT = entropy.length * 8;
    const CS = ENT / 32;
    
    const hash = crypto.createHash('sha256').update(entropy).digest();
    const hashBits = this.bytesToBinary(hash);
    return hashBits.slice(0, CS);
  }
}

module.exports = WalletService;
