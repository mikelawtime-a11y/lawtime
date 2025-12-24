// Maximum complexity pure JavaScript encryption
const SECRET_KEY = 'gh-token-secret-key-2025';
const ROUNDS = 12; // Number of encryption rounds

// S-Box for byte substitution (256 values, scrambled 0-255)
const SBOX = [
    99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118,
    202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192,
    183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21,
    4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117,
    9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132,
    83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207,
    208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168,
    81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210,
    205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115,
    96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219,
    224, 50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121,
    231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8,
    186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138,
    112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158,
    225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223,
    140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22
];

// Inverse S-Box for decryption
const INV_SBOX = new Array(256);
for (let i = 0; i < 256; i++) {
    INV_SBOX[SBOX[i]] = i;
}

// Simple hash function for key derivation
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

// Derive multiple round keys from base key
function deriveRoundKeys(baseKey, salt, rounds) {
    const keys = [];
    let current = baseKey + salt;
    
    for (let i = 0; i < rounds; i++) {
        // Hash multiple times for key strengthening
        for (let j = 0; j < 100; j++) {
            current = simpleHash(current + i);
        }
        keys.push(current);
    }
    return keys;
}

// Generate pseudo-random salt (deterministic for consistency)
function generateSalt() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let salt = '';
    const timestamp = Date.now();
    
    for (let i = 0; i < 16; i++) {
        const randomValue = Math.sin(timestamp + i) * 10000;
        const index = Math.floor((randomValue - Math.floor(randomValue)) * chars.length);
        salt += chars[index];
    }
    return salt;
}

// XOR operation with key
function xorWithKey(data, key) {
    let result = '';
    for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
}

// S-Box substitution
function substituteBytes(data) {
    let result = '';
    for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(SBOX[data.charCodeAt(i) % 256]);
    }
    return result;
}

// Inverse S-Box substitution
function inverseSubstituteBytes(data) {
    let result = '';
    for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(INV_SBOX[data.charCodeAt(i) % 256]);
    }
    return result;
}

// Bit rotation
function rotateBytes(data, shift) {
    let result = '';
    for (let i = 0; i < data.length; i++) {
        const byte = data.charCodeAt(i);
        const rotated = ((byte << shift) | (byte >> (8 - shift))) & 0xFF;
        result += String.fromCharCode(rotated);
    }
    return result;
}

// Block mixing (diffusion)
function mixBlocks(data) {
    if (data.length < 2) return data;
    
    let result = '';
    let previous = 0;
    
    for (let i = 0; i < data.length; i++) {
        const current = data.charCodeAt(i);
        const next = data.charCodeAt((i + 1) % data.length);
        const mixed = (current ^ previous ^ next) & 0xFF;
        result += String.fromCharCode(mixed);
        previous = current;
    }
    return result;
}

// Reverse block mixing
function unmixBlocks(data) {
    if (data.length < 2) return data;
    
    let result = new Array(data.length);
    let previous = 0;
    
    for (let i = 0; i < data.length; i++) {
        const mixed = data.charCodeAt(i);
        const next = data.charCodeAt((i + 1) % data.length);
        const current = (mixed ^ previous ^ next) & 0xFF;
        result[i] = String.fromCharCode(current);
        previous = current;
    }
    return result.join('');
}

// Main encryption function
function encryptToken(token) {
    try {
        // Generate salt for this encryption
        const salt = generateSalt();
        
        // Derive round keys
        const roundKeys = deriveRoundKeys(SECRET_KEY, salt, ROUNDS);
        
        // Start with original data
        let encrypted = token;
        
        // Multiple encryption rounds
        for (let round = 0; round < ROUNDS; round++) {
            // 1. XOR with round key
            encrypted = xorWithKey(encrypted, roundKeys[round]);
            
            // 2. S-Box substitution
            encrypted = substituteBytes(encrypted);
            
            // 3. Bit rotation (different for each round)
            encrypted = rotateBytes(encrypted, (round % 7) + 1);
            
            // 4. Block mixing for diffusion
            encrypted = mixBlocks(encrypted);
            
            // 5. XOR with reversed key (additional layer)
            encrypted = xorWithKey(encrypted, roundKeys[round].split('').reverse().join(''));
        }
        
        // Prepend salt (needed for decryption)
        const combined = salt + encrypted;
        
        // Base64 encode for safe storage
        return btoa(combined);
    } catch (e) {
        console.error('Encryption error:', e);
        return null;
    }
}

// Main decryption function
function decryptToken(encryptedData) {
    try {
        // Base64 decode
        const decoded = atob(encryptedData);
        
        // Extract salt (first 16 characters)
        const salt = decoded.substring(0, 16);
        let encrypted = decoded.substring(16);
        
        // Derive same round keys using extracted salt
        const roundKeys = deriveRoundKeys(SECRET_KEY, salt, ROUNDS);
        
        // Reverse the encryption rounds
        for (let round = ROUNDS - 1; round >= 0; round--) {
            // Reverse operations in opposite order
            
            // 5. Reverse XOR with reversed key
            encrypted = xorWithKey(encrypted, roundKeys[round].split('').reverse().join(''));
            
            // 4. Reverse block mixing
            encrypted = unmixBlocks(encrypted);
            
            // 3. Reverse bit rotation
            encrypted = rotateBytes(encrypted, 8 - ((round % 7) + 1));
            
            // 2. Inverse S-Box substitution
            encrypted = inverseSubstituteBytes(encrypted);
            
            // 1. Reverse XOR with round key
            encrypted = xorWithKey(encrypted, roundKeys[round]);
        }
        
        return encrypted;
    } catch (e) {
        console.error('Decryption error:', e);
        return null;
    }
}
