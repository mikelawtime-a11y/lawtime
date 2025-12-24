// Simple encryption/decryption functions
const SECRET_KEY = 'gh-token-secret-key-2025';

function encryptToken(token) {
    let encrypted = '';
    for (let i = 0; i < token.length; i++) {
        encrypted += String.fromCharCode(token.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
    }
    return btoa(encrypted); // Base64 encode
}

function decryptToken(encrypted) {
    try {
        const decoded = atob(encrypted); // Base64 decode
        let decrypted = '';
        for (let i = 0; i < decoded.length; i++) {
            decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
        }
        return decrypted;
    } catch (e) {
        return null;
    }
}
  
