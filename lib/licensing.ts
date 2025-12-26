import crypto from 'node:crypto';

// Types
export interface LicensePayload {
    storeId: string;
    productKeyId: string; // The ID of the License record
    expiry: number; // Timestamp
    type: 'TRIAL' | 'ANNUAL' | 'PERPETUAL';
    issuedAt: number;
}

export interface LicenseResult {
    valid: boolean;
    error?: string;
    payload?: LicensePayload;
}

// Generate a Key Pair (Utility for Admin Setup)
export function generateKeyPair() {
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

/**
 * Generates a signed product key (Base64 encoded)
 */
export function generateProductKey(payload: LicensePayload, privateKeyPem: string): string {
    const data = JSON.stringify(payload);

    // Ensure the private key is properly formatted
    // Remove any extra whitespace and ensure proper newlines
    let formattedKey = privateKeyPem.trim();

    // If the key doesn't have proper newlines (common in env vars), add them
    if (!formattedKey.includes('\n')) {
        formattedKey = formattedKey
            .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
            .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
            .replace(/-----BEGIN RSA PRIVATE KEY-----/, '-----BEGIN RSA PRIVATE KEY-----\n')
            .replace(/-----END RSA PRIVATE KEY-----/, '\n-----END RSA PRIVATE KEY-----');
    }

    const signer = crypto.createSign('SHA256');
    signer.update(data);
    signer.end();

    const signature = signer.sign({
        key: formattedKey,
        format: 'pem',
        type: 'pkcs8'
    }, 'base64');

    // Combine payload and signature
    const licenseData = {
        data: payload,
        sig: signature
    };

    return Buffer.from(JSON.stringify(licenseData)).toString('base64');
}

/**
 * Verifies a product key using the Public Key
 * This can be run offline if the Public Key is embedded/local.
 */
export function verifyProductKey(productKey: string, publicKeyPem: string): LicenseResult {
    try {
        const decoded = Buffer.from(productKey, 'base64').toString('utf-8');
        const licenseData = JSON.parse(decoded);

        if (!licenseData.data || !licenseData.sig) {
            return { valid: false, error: 'Invalid license format' };
        }

        // Ensure the public key is properly formatted
        let formattedKey = publicKeyPem.trim();

        // If the key doesn't have proper newlines (common in env vars), add them
        if (!formattedKey.includes('\n')) {
            formattedKey = formattedKey
                .replace(/-----BEGIN PUBLIC KEY-----/, '-----BEGIN PUBLIC KEY-----\n')
                .replace(/-----END PUBLIC KEY-----/, '\n-----END PUBLIC KEY-----')
                .replace(/-----BEGIN RSA PUBLIC KEY-----/, '-----BEGIN RSA PUBLIC KEY-----\n')
                .replace(/-----END RSA PUBLIC KEY-----/, '\n-----END RSA PUBLIC KEY-----');
        }

        const verifier = crypto.createVerify('SHA256');
        verifier.update(JSON.stringify(licenseData.data));
        verifier.end();

        const isValid = verifier.verify({
            key: formattedKey,
            format: 'pem',
            type: 'spki'
        }, licenseData.sig, 'base64');

        if (!isValid) {
            return { valid: false, error: 'Invalid signature' };
        }

        const payload = licenseData.data as LicensePayload;

        // Check Expiry
        if (payload.type !== 'PERPETUAL' && payload.expiry < Date.now()) {
            return { valid: false, error: 'License expired', payload };
        }

        return { valid: true, payload };

    } catch (e) {
        console.error('License verification error:', e);
        return { valid: false, error: 'Malformed license key' };
    }
}
