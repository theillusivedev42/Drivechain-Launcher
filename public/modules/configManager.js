const { app } = require("electron");
const fs = require("fs-extra");
const path = require("path");

class ConfigManager {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = null;
  }

  async loadConfig() {
    try {
      const configData = await fs.promises.readFile(this.configPath, "utf8");
      this.config = JSON.parse(configData);
      return this.config;
    } catch (error) {
      console.error("Failed to load config:", error);
      throw error;
    }
  }

  getConfig() {
    return this.config;
  }

  async createDirectory(dirPath) {
    try {
      await fs.promises.access(dirPath, fs.constants.F_OK);
      return false;
    } catch (error) {
      if (error.code === "ENOENT") {
        await fs.promises.mkdir(dirPath, { recursive: true });
        return true;
      } else {
        throw error;
      }
    }
  }

  async setupChainDirectories() {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }

    console.log("Checking chain base directories...");
    const platform = process.platform;
    const homeDir = app.getPath("home");
    let directoriesCreated = 0;

    for (const chain of this.config.chains) {
      if (!chain.directories?.base) {
        console.warn(`No directories configuration found for chain ${chain.id}`);
        continue;
      }

      const baseDir = chain.directories.base[platform];
      if (!baseDir) {
        console.warn(`No base directory configured for chain ${chain.id} on platform ${platform}`);
        continue;
      }

      if (typeof baseDir !== "string") {
        console.warn(`Invalid base directory for chain ${chain.id}: expected string, got ${typeof baseDir}`);
        continue;
      }

      try {
        const fullPath = path.join(homeDir, baseDir);
        const created = await this.createDirectory(fullPath);
        if (created) {
          directoriesCreated++;
          console.log(`Created base directory for ${chain.id}: ${fullPath}`);
        }
      } catch (error) {
        console.error(`Failed to create directory for chain ${chain.id}:`, error);
      }
    }

    if (directoriesCreated === 0) {
      console.log("All chain directories already exist. No new directories were created.");
    } else {
      console.log(`Created ${directoriesCreated} new chain directories.`);
    }

    return directoriesCreated;
  }

  getChainBasePath(chainId) {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }

    const chain = this.config.chains.find(c => c.id === chainId);
    if (!chain) {
      throw new Error(`Chain not found: ${chainId}`);
    }

    const platform = process.platform;
    const baseDir = chain.directories?.base?.[platform];
    if (!baseDir) {
      throw new Error(`No base directory configured for chain ${chainId} on platform ${platform}`);
    }

    return path.join(app.getPath("home"), baseDir);
  }
}

module.exports = ConfigManager;
