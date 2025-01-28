const { fetchGithubReleases } = require("../../src/utils/githubReleaseParser");

class UpdateManager {
  constructor(config) {
    this.config = config;
  }

  async checkForUpdates() {
    try {
      const updates = {};
      const result = await fetchGithubReleases(this.config);
      
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
