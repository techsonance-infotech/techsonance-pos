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
    const signer = crypto.createSign('SHA256');
    signer.update(data);
    const signature = signer.sign(privateKeyPem, 'base64');

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

        const verifier = crypto.createVerify('SHA256');
        verifier.update(JSON.stringify(licenseData.data));
        const isValid = verifier.verify(publicKeyPem, licenseData.sig, 'base64');

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
        return { valid: false, error: 'Malformed license key' };
    }
}
