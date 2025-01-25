const { app, shell } = require("electron");
const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");
const BitcoinMonitor = require("./bitcoinMonitor");

class ChainManager {
  constructor(mainWindow, config) {
    this.mainWindow = mainWindow;
    this.config = config;
    this.runningProcesses = {};
    this.chainStatuses = new Map(); // Tracks detailed chain statuses
    this.bitcoinMonitor = new BitcoinMonitor(mainWindow);
  }

  getChainConfig(chainId) {
    return this.config.chains.find((c) => c.id === chainId);
  }

  getBitcoinArgs() {
    return [
      '-signet',
      '-server',
      '-addnode=172.105.148.135:38333',
      '-signetblocktime=60',
      '-signetchallenge=00141551188e5153533b4fdd555449e640d9cc129456',
      '-acceptnonstdtxn',
      '-listen',
      '-rpcbind=0.0.0.0',
      '-rpcallowip=0.0.0.0/0',
      '-txindex',
      '-fallbackfee=0.00021',
      '-zmqpubsequence=tcp://0.0.0.0:29000',
      '-rpcuser=user',
      '-rpcpassword=password',
      '-rpcport=38332'
    ];
  }

  getChainArgs(chainId) {
    if (chainId === 'bitcoin') {
      return this.getBitcoinArgs();
    }
    return [];
  }

  async startChain(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const extractDir = chain.extract_dir?.[platform];
    if (!extractDir) throw new Error(`No extract directory configured for platform ${platform}`);

    const downloadsDir = app.getPath("downloads");
    const basePath = path.join(downloadsDir, extractDir);

    // Special handling for BitWindow on macOS
    if (chainId === 'bitwindow' && platform === 'darwin') {
      const appBundlePath = path.join(downloadsDir, extractDir, 'bitwindow.app');
      try {
        await fs.promises.access(appBundlePath, fs.constants.F_OK);
        console.log(`Starting BitWindow app bundle at: ${appBundlePath}`);
        
        // Launch the app using 'open' command
        const childProcess = spawn('open', ['-a', appBundlePath], { cwd: path.dirname(appBundlePath) });
        
        // Wait for the app to actually start
        await new Promise((resolve, reject) => {
          childProcess.on('exit', async (code) => {
            if (code === 0) {
              // Check if BitWindow is actually running
              const checkProcess = spawn('osascript', ['-e', 'tell application "System Events" to count processes whose name is "BitWindow"']);
              const isRunning = await new Promise((resolve) => {
                checkProcess.stdout.on('data', (data) => {
                  resolve(parseInt(data.toString().trim()) > 0);
                });
                checkProcess.on('error', () => resolve(false));
              });
              
              if (isRunning) {
                // Store a placeholder in runningProcesses so the UI knows BitWindow is running
                this.runningProcesses[chainId] = {
                  // Minimal process-like interface
                  kill: () => {
                    const quitProcess = spawn('osascript', ['-e', 'tell application "BitWindow" to quit']);
                    return new Promise((resolve, reject) => {
                      quitProcess.on('exit', (code) => {
                        if (code === 0) resolve();
                        else reject(new Error(`Failed to quit BitWindow, exit code: ${code}`));
                      });
                    });
                  }
                };
                resolve();
              } else {
                reject(new Error('BitWindow failed to start'));
              }
            } else {
              reject(new Error(`Failed to start BitWindow, exit code: ${code}`));
            }
          });
        });

        this.chainStatuses.set(chainId, 'running');
        this.mainWindow.webContents.send("chain-status-update", {
          chainId,
          status: "running"
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to start BitWindow:", error);
        this.chainStatuses.set(chainId, 'error');
        return { success: false, error: error.message };
      }
    }

    // Standard handling for other chains
    const binaryPath = chain.binary[platform];
    if (!binaryPath) throw new Error(`No binary configured for platform ${platform}`);

    const fullBinaryPath = path.join(basePath, binaryPath);

    try {
      await fs.promises.access(fullBinaryPath, fs.constants.F_OK);

      if (process.platform !== "win32") {
        await fs.promises.chmod(fullBinaryPath, "755");
      }

      const args = this.getChainArgs(chainId);
      console.log(`Starting ${chainId} with args:`, args);
      
      const childProcess = spawn(fullBinaryPath, args, { cwd: basePath });
      this.runningProcesses[chainId] = childProcess;
      this.chainStatuses.set(chainId, 'starting');
      
      this.mainWindow.webContents.send("chain-status-update", {
        chainId,
        status: "starting"
      });

      this.setupProcessListeners(childProcess, chainId, basePath);

      return { success: true };
    } catch (error) {
      console.error("Failed to start chain:", error);
      this.chainStatuses.set(chainId, 'error');
      return { success: false, error: error.message };
    }
  }

  setupProcessListeners(childProcess, chainId, basePath) {
    let buffer = '';
    let readyDetected = false;

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      buffer += output;
      console.log(`[${chainId}] stdout: ${output}`);
      
      // Bitcoin Core specific ready detection
      if (chainId === 'bitcoin' && !readyDetected) {
        // Look for key initialization messages
        if (buffer.includes('Bound to')) {
          readyDetected = true;
          this.chainStatuses.set(chainId, 'running');
          this.mainWindow.webContents.send("chain-status-update", {
            chainId,
            status: "running"
          });
          // Start IBD monitoring
          this.bitcoinMonitor.startMonitoring().catch(error => {
            console.error('Failed to start IBD monitoring:', error);
          });
        }
      }

      this.mainWindow.webContents.send("chain-output", {
        chainId,
        type: 'stdout',
        data: output
      });
    });

    childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      buffer += output;
      console.error(`[${chainId}] stderr: ${output}`);
      
      this.mainWindow.webContents.send("chain-output", {
        chainId,
        type: 'stderr',
        data: output
      });
    });

    childProcess.on("error", (error) => {
      console.error(`Process for ${chainId} encountered an error:`, error);
      this.chainStatuses.set(chainId, 'error');
      this.mainWindow.webContents.send("chain-status-update", {
        chainId,
        status: "error",
        error: error.message,
      });
    });

    childProcess.on("exit", (code, signal) => {
      console.log(`Process for ${chainId} exited with code ${code} (signal: ${signal})`);
      delete this.runningProcesses[chainId];
      this.chainStatuses.set(chainId, 'stopped');
      this.mainWindow.webContents.send("chain-status-update", {
        chainId,
        status: "stopped",
        exitCode: code,
        exitSignal: signal
      });
    });
  }

  async stopChain(chainId) {
    const childProcess = this.runningProcesses[chainId];
    if (!childProcess) {
      return { success: false, error: "Process not found" };
    }

    try {
      // For Bitcoin Core, try graceful shutdown first
      if (chainId === 'bitcoin') {
        // Stop IBD monitoring first
        this.bitcoinMonitor.stopMonitoring();

        const platform = process.platform; // Global Node.js process
        const chain = this.getChainConfig(chainId);
        if (!chain) throw new Error("Chain not found");
        
        const extractDir = chain.extract_dir?.[platform];
        if (!extractDir) throw new Error(`No extract directory configured for platform ${platform}`);
        
        const downloadsDir = app.getPath("downloads");
        const basePath = path.join(downloadsDir, extractDir);
        const bitcoinCliPath = path.join(basePath, platform === 'win32' ? 'bitcoin-cli.exe' : 'bitcoin-cli');
        
        try {
          // Try graceful shutdown first
          console.log('Attempting graceful shutdown with:', bitcoinCliPath);
          const stopProcess = spawn(bitcoinCliPath, [
            '-signet',
            '-rpcuser=user',
            '-rpcpassword=password',
            '-rpcport=38332',
            'stop'
          ], {
            shell: true // Handle paths with spaces
          });

          // Capture any error output
          stopProcess.stderr.on('data', (data) => {
            console.error('bitcoin-cli error:', data.toString());
          });
          stopProcess.stdout.on('data', (data) => {
            console.log('bitcoin-cli output:', data.toString());
          });
          stopProcess.on('error', (error) => {
            console.error('bitcoin-cli spawn error:', error);
          });

          await new Promise((resolve) => stopProcess.on('close', resolve));
          
          // Wait for the process to actually stop
          await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              if (!this.runningProcesses[chainId]) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          });
          
          return { success: true };
        } catch (error) {
          console.warn('Graceful shutdown failed, forcing process termination:', error);
        }
      }
      
      // Fallback to force kill if graceful shutdown fails or for other chains
      childProcess.kill();
      delete this.runningProcesses[chainId];
      this.chainStatuses.set(chainId, 'stopped');
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
    const extractDir = chain.extract_dir?.[platform];
    if (!extractDir) throw new Error(`No extract directory configured for platform ${platform}`);

    const downloadsDir = app.getPath("downloads");

    // Special handling for BitWindow on macOS
    if (chainId === 'bitwindow' && platform === 'darwin') {
      const appBundlePath = path.join(downloadsDir, extractDir, 'bitwindow.app');
      try {
        await fs.promises.access(appBundlePath);
        if (this.runningProcesses[chainId]) {
          return this.chainStatuses.get(chainId) || "running";
        }
        return "stopped";
      } catch (error) {
        return "not_downloaded";
      }
    }

    // Standard handling for other chains
    const binaryPath = chain.binary[platform];
    if (!binaryPath) throw new Error(`No binary configured for platform ${platform}`);

    const basePath = path.join(downloadsDir, extractDir);
    const fullBinaryPath = path.join(basePath, binaryPath);

    try {
      await fs.promises.access(fullBinaryPath);
      if (this.runningProcesses[chainId]) {
        return this.chainStatuses.get(chainId) || "running";
      }
      return "stopped";
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
