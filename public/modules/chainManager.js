const { app, shell } = require("electron");
const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");
const BitcoinMonitor = require("./bitcoinMonitor");
const BitWindowClient = require("./bitWindowClient");

class ChainManager {
  constructor(mainWindow, config) {
    this.mainWindow = mainWindow;
    this.config = config;
    this.runningProcesses = {};
    this.chainStatuses = new Map(); // Tracks detailed chain statuses
    this.bitcoinMonitor = new BitcoinMonitor(mainWindow);
    this.readyStates = new Map(); // Tracks when chains are fully ready
    this.bitWindowClient = new BitWindowClient();
    this.logProcesses = new Map(); // Track log streaming processes
    this.processCheckers = new Map(); // Track process check intervals
  }

  async isChainReady(chainId) {
    const status = this.chainStatuses.get(chainId);
    if (status !== 'running') return false;
    
    if (chainId === 'bitcoin') {
      try {
        await this.bitcoinMonitor.makeRpcCall('getblockchaininfo');
        return true;
      } catch (error) {
        return false;
      }
    }
    
    return true;
  }

  async waitForChainReady(chainId, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.isChainReady(chainId)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Timeout waiting for ${chainId} to be ready`);
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
    if (chainId === 'enforcer') {
      return [
        '--node-rpc-pass=password',
        '--node-rpc-user=user',
        '--node-rpc-addr=127.0.0.1:38332',
        '--node-zmq-addr-sequence=tcp://127.0.0.1:29000',
        '--enable-wallet',
        '--wallet-auto-create'
      ];
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

    // Special handling for BitWindow
    if (chainId === 'bitwindow') {
      try {
        if (platform === 'darwin') {
          // On macOS, launch the .app bundle
          const appBundlePath = path.join(downloadsDir, extractDir, 'BitWindow.app');
          await fs.promises.access(appBundlePath, fs.constants.F_OK);
          console.log(`Starting BitWindow app bundle at: ${appBundlePath}`);
          
          // Get the actual binary path inside the .app bundle
          const binaryPath = path.join(appBundlePath, 'Contents/MacOS/BitWindow');
          
          // Launch BitWindow directly for better process control
          const childProcess = spawn(binaryPath, [], {
            cwd: path.dirname(appBundlePath),
            env: {
              ...process.env,
              ELECTRON_RUN_AS_NODE: '0',
              ELECTRON_NO_ATTACH_CONSOLE: '1'
            }
          });
          
          this.runningProcesses[chainId] = childProcess;
          
          // Set up process monitoring
          childProcess.on('exit', (code, signal) => {
            console.log(`BitWindow process exited with code ${code} (signal: ${signal})`);
            
            // Clean up
            delete this.runningProcesses[chainId];
            this.chainStatuses.set(chainId, 'stopped');
            this.mainWindow.webContents.send("chain-status-update", {
              chainId,
              status: "stopped",
              exitCode: code,
              exitSignal: signal
            });
          });
          
          // Set up log streaming
          const logProcess = spawn('log', ['stream', '--predicate', 'process == "BitWindow"']);
          this.logProcesses.set(chainId, logProcess);
          
          logProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[${chainId}] log: ${output}`);
            this.mainWindow.webContents.send("chain-log", chainId, output);
          });
          
          logProcess.stderr.on('data', (data) => {
            const output = data.toString();
            console.error(`[${chainId}] log error: ${output}`);
            this.mainWindow.webContents.send("chain-log", chainId, output);
          });
        } else {
          // For other platforms, launch binary directly
          const binaryPath = chain.binary[platform];
          if (!binaryPath) throw new Error(`No binary configured for platform ${platform}`);
          
          const fullBinaryPath = path.join(basePath, binaryPath);
          await fs.promises.access(fullBinaryPath, fs.constants.F_OK);
          
          if (process.platform !== "win32") {
            await fs.promises.chmod(fullBinaryPath, "755");
          }
          
          const childProcess = spawn(fullBinaryPath, [], { cwd: basePath });
          this.runningProcesses[chainId] = childProcess;
          this.setupProcessListeners(childProcess, chainId, basePath);
        }

        // Give BitWindow a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

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
      
      if (chainId !== 'bitcoin') {
        this.chainStatuses.set(chainId, 'running');
        this.mainWindow.webContents.send("chain-status-update", {
          chainId,
          status: "running"
        });
      } else {
        this.chainStatuses.set(chainId, 'starting');
        this.mainWindow.webContents.send("chain-status-update", {
          chainId,
          status: "starting"
        });
      }

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
    let rpcCheckInterval = null;

    const checkBitcoinRPC = async () => {
      if (!readyDetected && chainId === 'bitcoin') {
        try {
          await this.bitcoinMonitor.makeRpcCall('getblockchaininfo');
          readyDetected = true;
          this.chainStatuses.set(chainId, 'running');
          this.mainWindow.webContents.send("chain-status-update", {
            chainId,
            status: "running"
          });
          this.bitcoinMonitor.startMonitoring().catch(error => {
            console.error('Failed to start IBD monitoring:', error);
          });
          if (rpcCheckInterval) {
            clearInterval(rpcCheckInterval);
            rpcCheckInterval = null;
          }
        } catch (error) {
          // Ignore errors - we'll try again
        }
      }
    };

    if (chainId === 'bitcoin') {
      rpcCheckInterval = setInterval(checkBitcoinRPC, 1000);
    }

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      buffer += output;
      console.log(`[${chainId}] stdout: ${output}`);
      
      if (chainId === 'bitcoin' && !readyDetected) {
        if (buffer.includes('Bound to')) {
          readyDetected = true;
          this.chainStatuses.set(chainId, 'running');
          this.mainWindow.webContents.send("chain-status-update", {
            chainId,
            status: "running"
          });
          this.bitcoinMonitor.startMonitoring().catch(error => {
            console.error('Failed to start IBD monitoring:', error);
          });
          if (rpcCheckInterval) {
            clearInterval(rpcCheckInterval);
            rpcCheckInterval = null;
          }
        }
      }
      
      if (chainId !== 'bitcoin' && !readyDetected) {
        readyDetected = true;
        this.chainStatuses.set(chainId, 'running');
        this.mainWindow.webContents.send("chain-status-update", {
          chainId,
          status: "running"
        });
      }

      this.mainWindow.webContents.send("chain-output", {
        chainId,
        type: 'stdout',
        data: output
      });
      
      this.mainWindow.webContents.send("chain-log", chainId, output);
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
      
      this.mainWindow.webContents.send("chain-log", chainId, output);
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
      if (rpcCheckInterval) {
        clearInterval(rpcCheckInterval);
        rpcCheckInterval = null;
      }
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
      // Special handling for BitWindow
      if (chainId === 'bitwindow') {
        try {
          // Stop log streaming if it exists
          const logProcess = this.logProcesses.get(chainId);
          if (logProcess) {
            logProcess.kill();
            this.logProcesses.delete(chainId);
          }

          // Update UI to show stopping state
          this.chainStatuses.set(chainId, 'stopping');
          this.mainWindow.webContents.send("chain-status-update", {
            chainId,
            status: "stopping"
          });

          // Kill BitWindow process
          if (childProcess) {
            childProcess.kill();
            await new Promise(resolve => setTimeout(resolve, 500)); // Give it a moment to close
          }

          delete this.runningProcesses[chainId];
          this.chainStatuses.set(chainId, 'stopped');
          return { success: true };
        } catch (error) {
          console.error('Failed to stop BitWindow gracefully:', error);
          // Just in case process is still in our tracking
          delete this.runningProcesses[chainId];
          this.chainStatuses.set(chainId, 'stopped');
          return { success: true };
        }
      }

      // For Bitcoin Core, try graceful shutdown first
      if (chainId === 'bitcoin') {
        this.bitcoinMonitor.stopMonitoring();

        const platform = process.platform;
        const chain = this.getChainConfig(chainId);
        if (!chain) throw new Error("Chain not found");
        
        const extractDir = chain.extract_dir?.[platform];
        if (!extractDir) throw new Error(`No extract directory configured for platform ${platform}`);
        
        const downloadsDir = app.getPath("downloads");
        const basePath = path.join(downloadsDir, extractDir);
        const binaryDir = path.dirname(path.join(basePath, chain.binary[platform]));
        const bitcoinCliPath = path.join(binaryDir, platform === 'win32' ? 'bitcoin-cli.exe' : 'bitcoin-cli');
        
        try {
          if (process.platform !== "win32") {
            await fs.promises.chmod(bitcoinCliPath, "755");
          }

          console.log('Attempting graceful shutdown with:', bitcoinCliPath);
          const stopProcess = spawn(bitcoinCliPath, [
            '-signet',
            '-rpcuser=user',
            '-rpcpassword=password',
            '-rpcport=38332',
            'stop'
          ], {
            shell: true
          });

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
      const appBundlePath = path.join(downloadsDir, extractDir, 'BitWindow.app');
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

      this.chainStatuses.set(chainId, 'resetting');
      this.mainWindow.webContents.send("chain-status-update", {
        chainId,
        status: "resetting",
      });

      if (this.runningProcesses[chainId]) {
        await this.stopChain(chainId);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const homeDir = app.getPath("home");
      const fullPath = path.join(homeDir, baseDir);
      await fs.remove(fullPath);
      console.log(`Reset chain ${chainId}: removed data directory ${fullPath}`);

      const extractDir = chain.extract_dir?.[platform];
      if (extractDir) {
        const downloadsDir = app.getPath("downloads");
        const binariesPath = path.join(downloadsDir, extractDir);
        await fs.remove(binariesPath);
        console.log(`Reset chain ${chainId}: removed binaries directory ${binariesPath}`);
      }

      await fs.ensureDir(fullPath);
      console.log(`Recreated empty data directory for chain ${chainId}: ${fullPath}`);

      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.chainStatuses.set(chainId, 'not_downloaded');
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

  async openBinaryDir(chainId) {
    try {
      const binaryDir = this.getBinaryDir(chainId);
      await shell.openPath(binaryDir);
      return { success: true };
    } catch (error) {
      console.error("Failed to open binary directory:", error);
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

  getBinaryDir(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const extractDir = chain.extract_dir?.[platform];
    if (!extractDir) throw new Error(`No extract directory configured for platform ${platform}`);

    const binaryPath = chain.binary[platform];
    if (!binaryPath) throw new Error(`No binary configured for platform ${platform}`);

    const downloadsDir = app.getPath("downloads");
    const basePath = path.join(downloadsDir, extractDir);
    return path.join(basePath, path.dirname(binaryPath));
  }
}

module.exports = ChainManager;
