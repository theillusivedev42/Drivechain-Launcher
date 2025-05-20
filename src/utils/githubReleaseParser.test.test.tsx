// Make this a module and add types
export {};
import type { AxiosResponse } from 'axios';

// Mock axios
const mockAxiosGet = jest.fn<Promise<any>, any[]>();
jest.mock('axios', () => ({
    get: (...args: any[]) => mockAxiosGet(...args)
}));

// Reset and re-require before each test to get fresh module state
let fetchGithubReleases: (config: any, force?: boolean) => Promise<any>;
let compareVersions: (v1: string, v2: string) => number;

beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockAxiosGet.mockReset();
    // Re-require to get fresh module with reset cache state
    const parser = require('./githubReleaseParser');
    fetchGithubReleases = parser.fetchGithubReleases;
    compareVersions = parser.compareVersions;
});

describe('githubReleaseParser', () => {
    const mockChainConfig = {
        chains: [{
            id: 'grpcurl',
            repo_url: 'https://github.com/fullstorydev/grpcurl',
            download: {
                base_url: 'https://github.com/fullstorydev/grpcurl/releases/download/v1.9.1/',
                files: {
                    linux: 'grpcurl_1.9.1_linux_x86_64.tar.gz',
                    darwin: 'grpcurl_1.9.1_osx_x86_64.tar.gz',
                    win32: 'grpcurl_1.9.1_windows_x86_64.zip'
                },
                sizes: {
                    linux: '12345',
                    darwin: '12345',
                    win32: '12345'
                }
            }
        }]
    };

    const mockGithubResponse = {
        status: 200,
        data: [
            {
                tag_name: 'v2.0.0',
                assets: [
                    {
                        name: 'grpcurl_2.0.0_linux_x86_64.tar.gz',
                        browser_download_url: 'https://example.com/linux',
                        size: 54321
                    },
                    {
                        name: 'grpcurl_2.0.0_osx_x86_64.tar.gz',
                        browser_download_url: 'https://example.com/darwin',
                        size: 54321
                    },
                    {
                        name: 'grpcurl_2.0.0_windows_x86_64.zip',
                        browser_download_url: 'https://example.com/windows',
                        size: 54321
                    }
                ]
            },
            {
                tag_name: 'v1.9.1',
                assets: [
                    {
                        name: 'grpcurl_1.9.1_linux_x86_64.tar.gz',
                        browser_download_url: 'https://example.com/linux-old',
                        size: 12345
                    },
                    {
                        name: 'grpcurl_1.9.1_osx_x86_64.tar.gz',
                        browser_download_url: 'https://example.com/darwin-old',
                        size: 12345
                    },
                    {
                        name: 'grpcurl_1.9.1_windows_x86_64.zip',
                        browser_download_url: 'https://example.com/windows-old',
                        size: 12345
                    }
                ]
            }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('compareVersions', () => {
        it('should compare version numbers correctly', () => {
            expect(compareVersions('v1.9.1', 'v1.9.2')).toBe(-1);
            expect(compareVersions('v1.9.2', 'v1.9.1')).toBe(1);
            expect(compareVersions('v1.9.1', 'v1.9.1')).toBe(0);
            expect(compareVersions('v2.0.0', 'v1.9.9')).toBe(1);
            expect(compareVersions('v1.9.0', 'v1.10.0')).toBe(-1);
            expect(compareVersions('1.9.1', 'v1.9.1')).toBe(0);
        });

        it('should handle versions with different number of segments', () => {
            expect(compareVersions('v1.9', 'v1.9.1')).toBe(-1);
            expect(compareVersions('v1.9.1.0', 'v1.9.1')).toBe(0);
            expect(compareVersions('v2', 'v1.9.9')).toBe(1);
        });
    });

    describe('fetchGithubReleases', () => {
        it('should detect available updates', async () => {
            mockAxiosGet.mockResolvedValue(mockGithubResponse as any);

            const result = await fetchGithubReleases(mockChainConfig, true);

            expect(mockAxiosGet).toHaveBeenCalledWith(
                'https://api.github.com/repos/fullstorydev/grpcurl/releases',
                expect.any(Object)
            );

            expect(result.grpcurl).toEqual({
                current_version: '1.9.1',
                latest_version: 'v2.0.0',
                has_update: true,
                platforms: {
                    linux: {
                        filename: 'grpcurl_2.0.0_linux_x86_64.tar.gz',
                        download_url: 'https://example.com/linux',
                        size: 54321,
                        found: true
                    },
                    darwin: {
                        filename: 'grpcurl_2.0.0_osx_x86_64.tar.gz',
                        download_url: 'https://example.com/darwin',
                        size: 54321,
                        found: true
                    },
                    win32: {
                        filename: 'grpcurl_2.0.0_windows_x86_64.zip',
                        download_url: 'https://example.com/windows',
                        size: 54321,
                        found: true
                    }
                }
            });
        });

        it('should handle no updates available', async () => {
            mockAxiosGet.mockResolvedValue({ status: 200, data: [mockGithubResponse.data[1]] } as any);

            const result = await fetchGithubReleases(mockChainConfig, true);

            expect(result.grpcurl.has_update).toBe(false);
            expect(result.grpcurl.current_version).toBe('1.9.1');
            expect(result.grpcurl.latest_version).toBe('1.9.1');
        });

        it('should use cache when available', async () => {
            mockAxiosGet.mockResolvedValue(mockGithubResponse as any);

            // First call
            await fetchGithubReleases(mockChainConfig);
            
            // Second call should use cache
            await fetchGithubReleases(mockChainConfig);

            expect(mockAxiosGet).toHaveBeenCalledTimes(1);
        });

        it('should handle missing grpcurl config', async () => {
            const invalidConfig = { chains: [] };

            await expect(fetchGithubReleases(invalidConfig))
                .rejects
                .toThrow('grpcurl configuration not found');
        });

        it('should handle invalid GitHub URL', async () => {
            const invalidConfig = {
                chains: [{
                    id: 'grpcurl',
                    repo_url: 'https://invalid-url',
                    download: mockChainConfig.chains[0].download
                }]
            };

            await expect(fetchGithubReleases(invalidConfig))
                .rejects
                .toThrow('Invalid GitHub repository URL');
        });

        it('should handle API errors', async () => {
            mockAxiosGet.mockRejectedValue({
                response: {
                    status: 403,
                    statusText: 'Rate limit exceeded'
                }
            });

            await expect(fetchGithubReleases(mockChainConfig))
                .rejects
                .toThrow('Failed to fetch GitHub releases: 403 Rate limit exceeded');
        });

        it('should handle network errors', async () => {
            mockAxiosGet.mockRejectedValue(new Error('Network error'));

            await expect(fetchGithubReleases(mockChainConfig))
                .rejects
                .toThrow('Failed to fetch GitHub releases: Network error');
        });

        it('should handle timeout errors', async () => {
            mockAxiosGet.mockRejectedValue({
                code: 'ECONNABORTED'
            });

            await expect(fetchGithubReleases(mockChainConfig))
                .rejects
                .toThrow('Connection timed out while fetching GitHub releases');
        });
    });
});
