const { app } = require('electron');
const path = require('path');

// Set app name before getting paths
app.name = 'drivechain-launcher';

// Need to wait for app to be ready to access app.getPath
app.whenReady().then(() => {
  const walletDir = path.join(app.getPath('userData'), 'wallet_starters');
  
  console.log('Wallet files are stored at:');
  console.log(`\nOn this system (${process.platform}):`);
  console.log(walletDir);
  
  console.log('\nPaths on different operating systems:');
  // On Windows, app.getPath('userData') resolves to %APPDATA%/drivechain-launcher
  const windowsPath = process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'drivechain-launcher', 'wallet_starters')
    : 'C:\\Users\\<USERNAME>\\AppData\\Roaming\\drivechain-launcher\\wallet_starters';
  console.log('Windows:', windowsPath);
  console.log('macOS:', path.join(process.env.HOME, 'Library/Application Support/drivechain-launcher/wallet_starters'));
  console.log('Linux:', path.join(process.env.HOME, '.config/drivechain-launcher/wallet_starters'));
  
  console.log('\nFiles created in wallet_starters/:');
  console.log('- master_starter.json (Master wallet)');
  console.log('- l1_starter.json (L1/Bitcoin Core wallet)');
  console.log('- sidechain_1_starter.json (First sidechain wallet)');
  console.log('- sidechain_2_starter.json (Second sidechain wallet)');
  console.log('etc...');

  app.quit();
});
