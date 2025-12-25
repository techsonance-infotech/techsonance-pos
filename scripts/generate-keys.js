const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Copied from lib/licensing.ts to avoid TS compilation issues
function generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
}

console.log('Generating RSA Key Pair...');
const { publicKey, privateKey } = generateKeyPair();

console.log('\n--- PUBLIC KEY (Put this in NEXT_PUBLIC_LICENSE_KEY) ---');
console.log(publicKey);
console.log('--------------------------------------------------------');

console.log('\n--- PRIVATE KEY (Put this in LICENSE_PRIVATE_KEY) ---');
console.log(privateKey);
console.log('--------------------------------------------------------');

// Optional: Write to a file for convenience
try {
    const envPath = path.join(__dirname, '..', '.env');
    // Check if .env exists, if so append, else create
    let content = '';
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
    }

    // Simple check to avoid duplicates if running multiple times
    if (!content.includes('LICENSE_PRIVATE_KEY=')) {
        const append = `\n# Licensing Keys\nLICENSE_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"\nNEXT_PUBLIC_LICENSE_KEY="${publicKey.replace(/\n/g, '\\n')}"\n`;
        fs.appendFileSync(envPath, append);
        console.log('\nKeys appended to .env file automatically.');
    } else {
        console.log('\nKeys already present in .env, skipping auto-append.');
    }

} catch (e) {
    console.error('Failed to write to .env:', e);
}
