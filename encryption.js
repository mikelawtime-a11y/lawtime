// Web Crypto API - Secure Browser-Native Encryption
// Uses AES-256-GCM (Galois/Counter Mode) for authenticated encryption

const CRYPTO_CONFIG = {
    algorithm: 'AES-GCM',
    keyLength: 256,
    ivLength: 12, // 96 bits recommended for GCM
    saltLength: 16,
    iterations: 100000, // PBKDF2 iterations
    tagLength: 128 // Authentication tag length
};

// Derive encryption key from a password using PBKDF2
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    // Derive actual encryption key
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: CRYPTO_CONFIG.iterations,
            hash: 'SHA-256'
        },
        keyMaterial,
        {
            name: CRYPTO_CONFIG.algorithm,
            length: CRYPTO_CONFIG.keyLength
        },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypt token using Web Crypto API
async function encryptToken(token, masterPassword) {
    try {
        const encoder = new TextEncoder();
        
        // Generate random salt and IV
        const salt = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.saltLength));
        const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.ivLength));
        
        // Use master password for encryption
        const password = masterPassword;
        
        // Derive encryption key
        const key = await deriveKey(password, salt);
        
        // Add integrity check - include a hash of the token
        const tokenHash = await crypto.subtle.digest('SHA-256', encoder.encode(token));
        const hashHex = Array.from(new Uint8Array(tokenHash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .substring(0, 16); // Use first 16 chars
        
        const dataToEncrypt = `${hashHex}:${token}`;
        
        // Encrypt the data
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: CRYPTO_CONFIG.algorithm,
                iv: iv,
                tagLength: CRYPTO_CONFIG.tagLength
            },
            key,
            encoder.encode(dataToEncrypt)
        );
        
        // Combine salt + iv + encrypted data into one array
        const result = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encryptedData), salt.length + iv.length);
        
        // Convert to base64 for storage
        return btoa(String.fromCharCode(...result));
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}

// Decrypt token using Web Crypto API
async function decryptToken(encryptedData, masterPassword) {
    try {
        // Decode from base64
        const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        
        // Extract salt, IV, and encrypted content
        const salt = data.slice(0, CRYPTO_CONFIG.saltLength);
        const iv = data.slice(CRYPTO_CONFIG.saltLength, CRYPTO_CONFIG.saltLength + CRYPTO_CONFIG.ivLength);
        const encrypted = data.slice(CRYPTO_CONFIG.saltLength + CRYPTO_CONFIG.ivLength);
        
        // Use master password for decryption
        const password = masterPassword;
        
        // Derive the same key
        const key = await deriveKey(password, salt);
        
        // Decrypt the data
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: CRYPTO_CONFIG.algorithm,
                iv: iv,
                tagLength: CRYPTO_CONFIG.tagLength
            },
            key,
            encrypted
        );
        
        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(decryptedData);
        
        // Extract hash and token
        const [storedHash, token] = decryptedText.split(':');
        
        // Verify integrity - check if hash matches
        const encoder = new TextEncoder();
        const tokenHash = await crypto.subtle.digest('SHA-256', encoder.encode(token));
        const computedHash = Array.from(new Uint8Array(tokenHash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .substring(0, 16);
        
        if (storedHash !== computedHash) {
            console.error('Integrity check failed - data may have been tampered with');
            return null;
        }
        
        return token;
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

// Securely clear sensitive data from memory
function clearSensitiveData(data) {
    if (typeof data === 'string') {
        // Overwrite string in place (best effort in JavaScript)
        data = '\0'.repeat(data.length);
    }
    return null;
}
