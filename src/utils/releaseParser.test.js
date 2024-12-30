import { parseDirectoryListing, getExpectedFiles, checkForUpdates } from './releaseParser';

// Sample HTML from releases.drivechain.info
const sampleHtml = `
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">
<html>
 <head>
  <title>Index of /</title>
 </head>
 <body>
<h1>Index of /</h1>
  <table>
   <tr><th valign="top"><img src="/icons/blank.gif" alt="[ICO]"></th><th><a href="?C=N;O=D">Name</a></th><th><a href="?C=M;O=A">Last modified</a></th><th><a href="?C=S;O=A">Size</a></th><th><a href="?C=D;O=A">Description</a></th></tr>
   <tr><th colspan="5"><hr></th></tr>
<tr><td valign="top"><img src="/icons/compressed.gif" alt="[   ]"></td><td><a href="bip300301-enforcer-latest-x86_64-apple-darwin.zip">bip300301-enforcer-latest-x86_64-apple-darwin.zip</a></td><td align="right">2024-12-30 16:41  </td><td align="right"> 11M</td><td>&nbsp;</td></tr>
<tr><td valign="top"><img src="/icons/compressed.gif" alt="[   ]"></td><td><a href="bip300301-enforcer-latest-x86_64-pc-windows-gnu.zip">bip300301-enforcer-latest-x86_64-pc-windows-gnu.zip</a></td><td align="right">2024-12-30 16:41  </td><td align="right"> 15M</td><td>&nbsp;</td></tr>
<tr><td valign="top"><img src="/icons/compressed.gif" alt="[   ]"></td><td><a href="bip300301-enforcer-latest-x86_64-unknown-linux-gnu.zip">bip300301-enforcer-latest-x86_64-unknown-linux-gnu.zip</a></td><td align="right">2024-12-30 16:41  </td><td align="right"> 11M</td><td>&nbsp;</td></tr>
   <tr><th colspan="5"><hr></th></tr>
</table>
</body></html>
`;

// Sample chain config (just enforcer for testing)
const sampleConfig = {
    schema_version: "1.0",
    chains: [
        {
            id: "enforcer",
            enabled: true,
            version: "",
            download: {
                base_url: "https://releases.drivechain.info/",
                files: {
                    linux: "bip300301-enforcer-latest-x86_64-unknown-linux-gnu.zip",
                    darwin: "bip300301-enforcer-latest-x86_64-apple-darwin.zip",
                    win32: "bip300301-enforcer-latest-x86_64-pc-windows-gnu.zip"
                },
                sizes: {
                    linux: "",
                    darwin: "",
                    win32: ""
                },
                hashes: {
                    linux: "",
                    darwin: "",
                    win32: ""
                }
            }
        }
    ]
};

describe('releaseParser', () => {
    test('parseDirectoryListing extracts file information correctly', () => {
        const fileInfo = parseDirectoryListing(sampleHtml);
        
        // Check enforcer darwin file info
        const darwinInfo = fileInfo.get('bip300301-enforcer-latest-x86_64-apple-darwin.zip');
        expect(darwinInfo).toBeDefined();
        expect(darwinInfo.timestamp).toBe('2024-12-30 16:41');
        expect(darwinInfo.size).toBe('11M');
    });

    test('getExpectedFiles returns correct mapping', () => {
        const expectedFiles = getExpectedFiles(sampleConfig);
        
        // Check enforcer darwin file mapping
        const darwinFile = 'bip300301-enforcer-latest-x86_64-apple-darwin.zip';
        const darwinInfo = expectedFiles.get(darwinFile);
        expect(darwinInfo).toBeDefined();
        expect(darwinInfo.chainId).toBe('enforcer');
        expect(darwinInfo.platform).toBe('darwin');
    });

    test('checkForUpdates returns correct update information', () => {
        const updates = checkForUpdates(sampleHtml, sampleConfig);
        
        // Check enforcer updates
        expect(updates.enforcer).toBeDefined();
        expect(updates.enforcer.darwin.found).toBe(true);
        expect(updates.enforcer.darwin.timestamp).toBe('2024-12-30 16:41');
        expect(updates.enforcer.darwin.size).toBe('11M');
    });
});