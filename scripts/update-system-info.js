/**
 * Pre-build script to update system-info.json with dynamic values
 * - Version: pulled from package.json
 * - Last Updated: current build date
 * 
 * Run this as part of the build process
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const systemInfoPath = path.join(__dirname, '..', 'config', 'system-info.json');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Read existing system-info.json
const systemInfo = JSON.parse(fs.readFileSync(systemInfoPath, 'utf8'));

// Format current date
const now = new Date();
const options = { year: 'numeric', month: 'long', day: 'numeric' };
const formattedDate = now.toLocaleDateString('en-US', options);

// Update values
systemInfo.version = packageJson.version;
systemInfo.lastUpdated = formattedDate;

// Write back
fs.writeFileSync(systemInfoPath, JSON.stringify(systemInfo, null, 4));

console.log(`✅ Updated system-info.json`);
console.log(`   Version: ${systemInfo.version}`);
console.log(`   Last Updated: ${systemInfo.lastUpdated}`);
