const fs = require('fs');
const path = require('path');

function listFilesRecursively(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      console.log(`Directory: ${fullPath}`);
      listFilesRecursively(fullPath);
    } else {
      console.log(`File: ${fullPath}`);
    }
  });
}

const downloadsPath = path.join(process.env.USERPROFILE, 'Downloads', 'Drivechain Launcher Downloads');
console.log(`Listing contents of: ${downloadsPath}\n`);
listFilesRecursively(downloadsPath);
