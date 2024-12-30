const axios = require('axios');

/**
 * Utility functions for checking GitHub releases via the GitHub API
 */

// Cache the last fetch time and result to avoid hitting rate limits
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cachedResult = null;

/**
 * Compares version strings (e.g., v1.9.1 vs v1.9.2)
 * @param {string} version1 First version string
 * @param {string} version2 Second version string
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
function compareVersions(version1, version2) {
    // Remove 'v' prefix if present
    const v1 = version1.replace(/^v/, '').split('.').map(Number);
    const v2 = version2.replace(/^v/, '').split('.').map(Number);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
        const num1 = v1[i] || 0;
        const num2 = v2[i] || 0;
        if (num1 < num2) return -1;
        if (num1 > num2) return 1;
    }
    return 0;
}

/**
 * Fetches GitHub release information
 * @param {Object} chainConfig The chain configuration object
 * @param {boolean} [force=false] Force fetch even if cache is valid
 * @returns {Promise<Object>} Update information for grpcurl
 * @throws {Error} If the fetch fails
 */
async function fetchGithubReleases(chainConfig, force = false) {
    try {
        // Check cache unless force refresh is requested
        const now = Date.now();
        if (!force && cachedResult && (now - lastFetchTime) < CACHE_DURATION) {
            return cachedResult;
        }

        // Get grpcurl configuration
        const grpcurlConfig = chainConfig?.chains?.find(chain => chain.id === 'grpcurl');
        if (!grpcurlConfig) {
            throw new Error('grpcurl configuration not found');
        }

        // Extract owner and repo from repo_url
        // Expected format: https://github.com/fullstorydev/grpcurl
        const repoUrlMatch = grpcurlConfig.repo_url?.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!repoUrlMatch) {
            throw new Error('Invalid GitHub repository URL');
        }
        const [, owner, repo] = repoUrlMatch;

        // Get current version from config
        const currentVersion = grpcurlConfig.download?.base_url?.match(/\/v([^/]+)\//)?.[1];
        if (!currentVersion) {
            throw new Error('Could not determine current version from base_url');
        }

        let response;
        try {
            // Fetch releases from GitHub API
            response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/releases`, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Drivechain-Launcher'
                }
            });

            if (response.status !== 200) {
                throw new Error(`GitHub API error! status: ${response.status}`);
            }
        } catch (error) {
            // Re-throw with proper error message
            if (error.code === 'ECONNABORTED') {
                throw new Error('Connection timed out while fetching GitHub releases');
            }
            if (error.response) {
                throw new Error(`Failed to fetch GitHub releases: ${error.response.status} ${error.response.statusText}`);
            }
            throw new Error(`Failed to fetch GitHub releases: ${error.message}`);
        }

        const releases = response.data;
        if (!releases.length) {
            throw new Error('No releases found');
        }

        // Find latest release with required assets
        const platformExtensions = {
            linux: '_linux_x86_64.tar.gz',
            darwin: '_osx_x86_64.tar.gz',
            win32: '_windows_x86_64.zip'
        };

        const updates = {
            grpcurl: {
                current_version: currentVersion,
                latest_version: null,
                has_update: false,
                platforms: {
                    linux: null,
                    darwin: null,
                    win32: null
                }
            }
        };

        // Find the latest release that has all required platform assets
        for (const release of releases) {
            const version = release.tag_name;
            const versionComparison = compareVersions(version, currentVersion);
            
            // Skip if this release is older or same as current
            if (versionComparison <= 0) continue;

            // Check if this release has all required platform assets
            const platformAssets = {};
            let hasAllAssets = true;

            for (const [platform, extension] of Object.entries(platformExtensions)) {
                const asset = release.assets.find(a => a.name.endsWith(extension));
                if (!asset) {
                    hasAllAssets = false;
                    break;
                }
                platformAssets[platform] = asset;
            }

            if (hasAllAssets) {
                updates.grpcurl.latest_version = version;
                updates.grpcurl.has_update = true;

                // Add platform-specific information
                for (const [platform, asset] of Object.entries(platformAssets)) {
                    updates.grpcurl.platforms[platform] = {
                        filename: asset.name,
                        download_url: asset.browser_download_url,
                        size: asset.size,
                        found: true
                    };
                }
                break;
            }
        }

        // If no update found, set platform info for current version
        if (!updates.grpcurl.has_update) {
            updates.grpcurl.latest_version = currentVersion;
            for (const platform of Object.keys(platformExtensions)) {
                updates.grpcurl.platforms[platform] = {
                    filename: grpcurlConfig.download.files[platform],
                    download_url: `${grpcurlConfig.download.base_url}${grpcurlConfig.download.files[platform]}`,
                    size: grpcurlConfig.download.sizes[platform] || null,
                    found: true
                };
            }
        }

        // Update cache
        lastFetchTime = now;
        cachedResult = updates;

        return updates;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error('Connection timed out while fetching GitHub releases');
        }
        if (error.response) {
            throw new Error(`Failed to fetch GitHub releases: ${error.response.status} ${error.response.statusText}`);
        }
        throw new Error(`Failed to fetch GitHub releases: ${error.message}`);
    }
}

module.exports = {
    fetchGithubReleases,
    compareVersions
};
