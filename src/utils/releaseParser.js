/**
 * Utility functions for parsing releases.drivechain.info directory listing
 */

/**
 * Parses the HTML directory listing and extracts file information
 * @param {string} html The HTML content from releases.drivechain.info
 * @returns {Map<string, {timestamp: string, size: string}>} Map of filename to file info
 */
function parseDirectoryListing(html) {
    const fileInfoMap = new Map();
    
    // Extract the table rows containing file information
    const rows = html.match(/<tr>.*?<\/tr>/gs) || [];
    
    for (const row of rows) {
        // Look for rows with compressed.gif (files) and extract info
        if (row.includes('compressed.gif')) {
            // Extract filename
            const fileMatch = row.match(/<a href="([^"]+)">/);
            if (!fileMatch) continue;
            
            // Extract timestamp and size using more precise patterns
            const cells = row.match(/align="right">([^<]+)</g);
            if (!cells || cells.length < 2) continue;
            
            // First "align=right" cell is timestamp, second is size
            const timestamp = cells[0].match(/align="right">([^<]+)</)[1].trim();
            const size = cells[1].match(/align="right">([^<]+)</)[1].trim();
            
            const filename = fileMatch[1];
            fileInfoMap.set(filename, {
                timestamp,
                size
            });
        }
    }
    
    return fileInfoMap;
}

/**
 * Gets the expected filenames from chain_config.json
 * @param {Object} chainConfig The chain configuration object
 * @returns {Map<string, {chainId: string, platform: string}>} Map of filename to chain info
 */
function getExpectedFiles(chainConfig) {
    const expectedFiles = new Map();
    
    for (const chain of chainConfig.chains) {
        // Skip grpcurl as it uses GitHub releases
        if (chain.id === 'grpcurl') continue;
        
        // Only process chains using releases.drivechain.info
        if (chain.download.base_url === 'https://releases.drivechain.info/') {
            for (const [platform, filename] of Object.entries(chain.download.files)) {
                expectedFiles.set(filename, {
                    chainId: chain.id,
                    platform
                });
            }
        }
    }
    
    return expectedFiles;
}

/**
 * Checks the releases directory and returns update information
 * @param {string} html The HTML content from releases.drivechain.info
 * @param {Object} chainConfig The chain configuration object
 * @returns {Object} Update information for each chain/platform
 */
function checkForUpdates(html, chainConfig) {
    const fileInfo = parseDirectoryListing(html);
    const expectedFiles = getExpectedFiles(chainConfig);
    const updates = {};
    
    // Initialize updates object structure
    for (const chain of chainConfig.chains) {
        if (chain.id !== 'grpcurl') {
            updates[chain.id] = {
                linux: null,
                darwin: null,
                win32: null
            };
        }
    }
    
    // Check each expected file
    for (const [filename, info] of expectedFiles) {
        const fileData = fileInfo.get(filename);
        if (fileData) {
            updates[info.chainId][info.platform] = {
                filename,
                timestamp: fileData.timestamp,
                size: fileData.size,
                found: true
            };
        } else {
            updates[info.chainId][info.platform] = {
                filename,
                found: false,
                error: 'File not found in directory listing'
            };
        }
    }
    
    return updates;
}

export { parseDirectoryListing, getExpectedFiles, checkForUpdates };