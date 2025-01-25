const { app, shell } = require("electron");
const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");

class ChainManager {
  constructor(mainWindow, config) {
    this.mainWindow = mainWindow;
    this.config = config;
    this.runningProcesses = {};
  }

  getChainConfig(chainId) {
    return this.config.chains.find((c) => c.id === chainId);
  }

  async startChain(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const baseDir = chain.directories.base[platform];
    if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);

    const binaryPath = chain.binary[platform];
    if (!binaryPath) throw new Error(`No binary configured for platform ${platform}`);

    const homeDir = app.getPath("home");
    const basePath = path.join(homeDir, baseDir);
    const fullBinaryPath = path.join(basePath, binaryPath);

    try {
      await fs.promises.access(fullBinaryPath, fs.constants.F_OK);

      if (process.platform !== "win32") {
        await fs.promises.chmod(fullBinaryPath, "755");
      }

      const childProcess = spawn(fullBinaryPath, [], { cwd: basePath });
      this.runningProcesses[chainId] = childProcess;

      this.setupProcessListeners(childProcess, chainId, basePath);

      return { success: true };
    } catch (error) {
      console.error("Failed to start chain:", error);
      return { success: false, error: error.message };
    }
  }

  setupProcessListeners(childProcess, chainId, basePath) {
    childProcess.stdout.on('data', (data) => {
      console.log(`[${chainId}] stdout: ${data}`);
      this.mainWindow.webContents.send("chain-output", {
        chainId,
        type: 'stdout',
        data: data.toString()
      });
    });

    childProcess.stderr.on('data', (data) => {
      console.error(`[${chainId}] stderr: ${data}`);
      this.mainWindow.webContents.send("chain-output", {
        chainId,
        type: 'stderr',
        data: data.toString()
      });
    });

    childProcess.on("error", (error) => {
      console.error(`Process for ${chainId} encountered an error:`, error);
      this.mainWindow.webContents.send("chain-status-update", {
        chainId,
        status: "error",
        error: error.message,
      });
    });

    childProcess.on("exit", (code, signal) => {
      console.log(`Process for ${chainId} exited with code ${code} (signal: ${signal})`);
      delete this.runningProcesses[chainId];
      this.mainWindow.webContents.send("chain-status-update", {
        chainId,
        status: "stopped",
        exitCode: code,
        exitSignal: signal
      });
    });
  }

  async stopChain(chainId) {
    const process = this.runningProcesses[chainId];
    if (!process) {
      return { success: false, error: "Process not found" };
    }

    try {
      process.kill();
      delete this.runningProcesses[chainId];
      return { success: true };
    } catch (error) {
      console.error("Failed to stop chain:", error);
      return { success: false, error: error.message };
    }
  }

  async getChainStatus(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const baseDir = chain.directories.base[platform];
    if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);

    const binaryPath = chain.binary[platform];
    if (!binaryPath) throw new Error(`No binary configured for platform ${platform}`);

    const homeDir = app.getPath("home");
    const basePath = path.join(homeDir, baseDir);
    const fullBinaryPath = path.join(basePath, binaryPath);

    try {
      await fs.promises.access(fullBinaryPath);
      return this.runningProcesses[chainId] ? "running" : "stopped";
    } catch (error) {
      return "not_downloaded";
    }
  }

  async resetChain(chainId) {
    try {
      const chain = this.getChainConfig(chainId);
      if (!chain) throw new Error("Chain not found");

      const platform = process.platform;
      const baseDir = chain.directories.base[platform];
      if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);

      if (this.runningProcesses[chainId]) {
        await this.stopChain(chainId);
      }

      const homeDir = app.getPath("home");
      const fullPath = path.join(homeDir, baseDir);

      await fs.remove(fullPath);
      console.log(`Reset chain ${chainId}: removed directory ${fullPath}`);

      await fs.ensureDir(fullPath);
      console.log(`Recreated empty directory for chain ${chainId}: ${fullPath}`);

      this.mainWindow.webContents.send("chain-status-update", {
        chainId,
        status: "not_downloaded",
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to reset chain:", error);
      return { success: false, error: error.message };
    }
  }

  async openDataDir(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const baseDir = chain.directories.base[platform];
    if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);

    const homeDir = app.getPath("home");
    const fullPath = path.join(homeDir, baseDir);

    try {
      await shell.openPath(fullPath);
      return { success: true };
    } catch (error) {
      console.error("Failed to open data directory:", error);
      return { success: false, error: error.message };
    }
  }

  getFullDataDir(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");
    
    const platform = process.platform;
    const baseDir = chain.directories.base[platform];
    if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);
    
    return path.join(app.getPath("home"), baseDir);
  }
}

module.exports = ChainManager;
