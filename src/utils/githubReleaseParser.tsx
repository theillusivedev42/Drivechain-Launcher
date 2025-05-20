export {};
import axios, { AxiosError } from 'axios';
import path from 'path';

// Cache the last fetch time and result to avoid hitting rate limits
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cachedResult: Record<string, any> | null = null;

/**
 * Compares version strings (e.g., v1.9.1 vs v1.9.2)
 * @param {string} version1 First version string
 * @param {string} version2 Second version string
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
function compareVersions(version1: string, version2: string): number {
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
 * Gets the latest version from releases.drivechain.info
 * @param {string} url The download URL
 * @returns {Promise<string|null>} The latest version or null if not found
 */
async function getLatestVersion(url: string): Promise<string | null> {
    try {
        const response = await axios.head(url);
        
        const version = response.headers['x-latest-version'];
        if (version) {
            return version;
        }

        const versionMatch = url.match(/v?(\d+\.\d+\.\d+)/);
        if (versionMatch) {
            return versionMatch[1];
        }

        return null;
    } catch (error) {
        console.error(`Failed to get latest version from ${url}:`, error);
        return null;
    }
}

/**
 * Fetches update information for all components
 * @param {Object} chainConfig The chain configuration object
 * @param {boolean} [force=false] Force fetch even if cache is valid
 * @returns {Promise<Object>} Update information for all components
 * @throws {Error} If the fetch fails
 */
async function fetchGithubReleases(chainConfig: any, force = false): Promise<Record<string, any>> {
    try {
        // Check cache unless force refresh is requested
        const now = Date.now();
        if (!force && cachedResult && (now - lastFetchTime) < CACHE_DURATION) {
            return cachedResult;
        }

        const updates: Record<string, any> = {};

        // Get status of all chains
        const chainStatuses: Record<string, any> = {};
        const electronAPI = (window as any).electronAPI;
        for (const chain of chainConfig.chains as any[]) {
            try {
                const status = await electronAPI.getChainStatus(chain.id);
                chainStatuses[chain.id] = status;
            } catch (error) {
                console.error(`Failed to get status for ${chain.id}:`, error);
                chainStatuses[chain.id] = 'error';
            }
        }

        // Only check enabled chains that are downloaded
        const downloadedChains = (chainConfig.chains as any[]).filter((chain: any) => 
            chain.enabled && 
            chainStatuses[chain.id] && 
            chainStatuses[chain.id] !== 'not_downloaded'
        );

        // Check each downloaded chain for updates
        for (const chain of downloadedChains) {
            try {
                // Get current version from binary path if available
                let currentVersion = chain.version;
                if (!currentVersion && chain.binary[process.platform]) {
                    const binaryPath = chain.binary[process.platform];
                    const versionMatch = binaryPath.match(/\d+\.\d+\.\d+/);
                    if (versionMatch) {
                        currentVersion = versionMatch[0];
                    }
                }

                // If we can't determine current version, skip this chain
                if (!currentVersion) {
                    continue;
                }

                // Get latest version from the release server
                const latestVersion = await getLatestVersion(chain.download.urls[process.platform]);
                
                // If we can't determine latest version, skip this chain
                if (!latestVersion) {
                    continue;
                }

                // Compare versions to check for update
                const hasUpdate = compareVersions(currentVersion, latestVersion) < 0;

                updates[chain.id] = {
                    displayName: chain.display_name,
                    current_version: currentVersion,
                    latest_version: latestVersion,
                    has_update: hasUpdate,
                    platforms: {
                        linux: {
                            filename: path.basename(chain.download.urls.linux),
                            download_url: chain.download.urls.linux,
                            size: chain.download.sizes.linux || null,
                            found: true
                        },
                        darwin: {
                            filename: path.basename(chain.download.urls.darwin),
                            download_url: chain.download.urls.darwin,
                            size: chain.download.sizes.darwin || null,
                            found: true
                        },
                        win32: {
                            filename: path.basename(chain.download.urls.win32),
                            download_url: chain.download.urls.win32,
                            size: chain.download.sizes.win32 || null,
                            found: true
                        }
                    }
                };
            } catch (error) {
                console.error(`Failed to check updates for ${chain.id}:`, error);
                // Skip this chain if there's an error
                continue;
            }
        }

        // Update cache
        lastFetchTime = now;
        cachedResult = updates;

        return updates;
    } catch (error: unknown) {
        const err = error as AxiosError;
        if (err.code === 'ECONNABORTED') {
            throw new Error('Connection timed out while checking for updates');
        }
        if (err.response) {
            throw new Error(`Failed to check for updates: ${err.response.status} ${err.response.statusText}`);
        }
        throw new Error(`Failed to check for updates: ${err.message}`);
    }
}

export { fetchGithubReleases, compareVersions };
