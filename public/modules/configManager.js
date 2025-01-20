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
    console.log("Checking chain base directories...");
    const platform = process.platform;
    const homeDir = app.getPath("home");
    let directoriesCreated = 0;

    for (const chain of this.config.chains) {
      const baseDir = chain.directories.base[platform];
      if (baseDir && typeof baseDir === "string") {
        const fullBasePath = path.join(homeDir, baseDir);
        const created = await this.createDirectory(fullBasePath);
        if (created) {
          directoriesCreated++;
          console.log(`Created base directory for ${chain.id}: ${fullBasePath}`);
        }
      } else {
        console.warn(
          `No valid base directory specified for ${chain.id} on ${platform}`
        );
      }
    }

    if (directoriesCreated === 0) {
      console.log(
        "All chain directories already exist. No new directories were created."
      );
    }

    return directoriesCreated;
  }
}

module.exports = ConfigManager;