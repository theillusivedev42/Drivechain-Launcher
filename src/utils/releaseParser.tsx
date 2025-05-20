export {};
import axios, { AxiosError } from 'axios';

/**
 * Utility functions for parsing releases.drivechain.info directory listing
 */

// Cache the last fetch time and result to avoid hammering the server
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
// cachedResult stores updates with possible null per platform
let cachedResult: Record<string, Record<string, UpdateInfo | null>> | null = null;

/**
 * Fetches and parses the releases directory
 * @param {Object} chainConfig The chain configuration object
 * @param {boolean} [force=false] Force fetch even if cache is valid
 * @returns {Promise<Object>} Update information for each chain/platform
 * @throws {Error} If the fetch fails or the response is invalid
 */
export async function fetchReleases(chainConfig: any, force = false): Promise<Record<string, Record<string, UpdateInfo | null>>> {
    try {
        // Check cache unless force refresh is requested
        const now = Date.now();
        if (!force && cachedResult && now - lastFetchTime < CACHE_DURATION) {
            return cachedResult;
        }

        // Fetch the directory listing
        const response = await axios.get<string>('https://releases.drivechain.info/', {
            timeout: 10000, // 10 second timeout
            headers: {
                'Accept': 'text/html',
                'User-Agent': 'Drivechain-Launcher'
            }
        });

        if (response.status !== 200) throw new Error(`HTTP error! status: ${response.status}`);

        // Parse the HTML and check for updates
        const updates = checkForUpdates(response.data, chainConfig);

        // Update cache
        lastFetchTime = now;
        cachedResult = updates;

        return updates;
    } catch (error) {
        const err = error as AxiosError;
        if (err.code === 'ECONNABORTED') {
            throw new Error('Connection timed out while fetching releases');
        }
        if (err.response) {
            throw new Error(`Failed to fetch releases: ${err.response.status} ${err.response.statusText}`);
        }
        throw new Error(`Failed to fetch releases: ${(err.message)}`);
    }
}

/** Parses HTML directory listing into Map of filename to timestamp/size */
export function parseDirectoryListing(html: string): Map<string, FileInfo> {
    const fileInfoMap = new Map<string, FileInfo>();
    
    const rows = html.match(/<tr>.*?<\/tr>/gs) || [];
    
    for (const row of rows) {
        if (row.includes('compressed.gif')) {
            const fileMatch = row.match(/<a href="([^"]+)">/);
            if (!fileMatch) continue;
            const cells = row.match(/align="right">([^<]+)</g);
            if (!cells || cells.length < 2) continue;
            const tsMatch = cells[0].match(/align="right">([^<]+)</);
            if (!tsMatch) continue;
            const timestamp = tsMatch[1].trim();
            const szMatch = cells[1].match(/align="right">([^<]+)</);
            if (!szMatch) continue;
            const size = szMatch[1].trim();
            
            const filename = fileMatch[1];
            fileInfoMap.set(filename, { timestamp, size });
        }
    }
    
    return fileInfoMap;
}

/** Gets expected filenames per chain/platform */
export function getExpectedFiles(chainConfig: any): Map<string, ExpectedFileInfo> {
    const expectedFiles = new Map<string, ExpectedFileInfo>();
    
    for (const chain of chainConfig.chains as any[]) {
        if (chain.id === 'grpcurl') continue;
        if (chain.download.base_url === 'https://releases.drivechain.info/') {
            for (const [platform, filename] of Object.entries(chain.download.files)) {
                expectedFiles.set(filename as string, { chainId: chain.id, platform });
            }
        }
    }
    
    return expectedFiles;
}

/** Checks for updates given HTML and config */
export function checkForUpdates(html: string, chainConfig: any): Record<string, Record<string, UpdateInfo | null>> {
    const fileInfo = parseDirectoryListing(html);
    const expectedFiles = getExpectedFiles(chainConfig);
    const updates: Record<string, Record<string, UpdateInfo | null>> = {};
    
    for (const chain of chainConfig.chains) {
        if (chain.id !== 'grpcurl') {
            updates[chain.id] = { linux: null, darwin: null, win32: null };
        }
    }
    
    for (const [filename, info] of expectedFiles) {
        const fileData = fileInfo.get(filename);
        if (fileData) {
            updates[info.chainId][info.platform] = { filename, timestamp: fileData.timestamp, size: fileData.size, found: true };
        } else {
            updates[info.chainId][info.platform] = { filename, found: false, error: 'File not found in directory listing' };
        }
    }
    
    return updates;
}

// Type definitions
export interface FileInfo { timestamp: string; size: string; }
export interface ExpectedFileInfo { chainId: string; platform: string; }
export interface UpdateInfo { filename: string; timestamp?: string; size?: string; found: boolean; error?: string; }