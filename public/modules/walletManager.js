const { app, shell } = require("electron");
const fs = require("fs-extra");
const path = require("path");

class WalletManager {
  constructor(config) {
    this.config = config;
  }

  getChainConfig(chainId) {
    return this.config.chains.find((c) => c.id === chainId);
  }

  getWalletDir(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const baseDir = chain.directories.base[platform];
    if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);

    const walletPath = chain.directories.wallet;
    if (!walletPath) return null;

    return path.join(app.getPath("home"), baseDir, walletPath);
  }

  async analyzeWalletPath(fullPath) {
    try {
      const stats = await fs.promises.stat(fullPath);
      return {
        exists: true,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
      };
    } catch (error) {
      return { exists: false, isDirectory: false, isFile: false };
    }
  }

  async getOpenablePath(fullPath) {
    const analysis = await this.analyzeWalletPath(fullPath);
    if (analysis.exists && analysis.isDirectory) {
      return fullPath;
    } else if (analysis.exists && analysis.isFile) {
      return path.dirname(fullPath);
    } else {
      // If path doesn't exist, return the nearest existing parent directory
      let currentPath = fullPath;
      while (currentPath !== path.parse(currentPath).root) {
        currentPath = path.dirname(currentPath);
        const parentAnalysis = await this.analyzeWalletPath(currentPath);
        if (parentAnalysis.exists && parentAnalysis.isDirectory) {
          return currentPath;
        }
      }
      throw new Error("No valid parent directory found");
    }
  }

  async openWalletLocation(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const baseDir = chain.directories.base[platform];
    if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);

    const walletPath = chain.directories.wallet;
    const fullPath = walletPath ? 
      path.join(app.getPath("home"), baseDir, walletPath) :
      path.join(app.getPath("home"), baseDir);

    const analysis = await this.analyzeWalletPath(fullPath);

    if (analysis.exists) {
      if (analysis.isDirectory) {
        await shell.openPath(fullPath);
        return {
          success: true,
          openedPath: fullPath,
        };
      } else {
        // If it's a file, open its containing directory
        const dirPath = path.dirname(fullPath);
        await shell.openPath(dirPath);
        return {
          success: true,
          openedPath: dirPath,
        };
      }
    } else {
      // If the exact path doesn't exist, don't open anything
      return {
        success: false,
        error: "Wallet directory not found",
        path: fullPath,
        chainName: chain.display_name,
      };
    }
  }
}

module.exports = WalletManager;
