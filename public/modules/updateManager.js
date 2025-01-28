const { fetchGithubReleases } = require('./githubReleaseParser');

class UpdateManager {
  constructor(config, chainManager) {
    this.config = config;
    this.chainManager = chainManager;
  }

  async checkForUpdates() {
    try {
      const updates = {};
      const result = await fetchGithubReleases(this.config, this.chainManager);
      
      if (result.grpcurl?.has_update) {
        updates.grpcurl = {
          displayName: "gRPCurl",
          current_version: result.grpcurl.current_version,
          latest_version: result.grpcurl.latest_version,
          download_url: result.grpcurl.platforms[process.platform]?.download_url
        };
      }

      return {
        success: true,
        updates
      };
    } catch (error) {
      console.error("Failed to check for updates:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = UpdateManager;
