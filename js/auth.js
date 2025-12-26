// Authentication and token management

// Prompt for master password
async function promptForMasterPassword() {
    const password = await showModal(
        'Master Password',
        'Enter your master password to unlock:',
        'Password',
        true
    );
    
    if (password && password.trim()) {
        const trimmed = password.trim();
        if (trimmed.length < CONFIG.MIN_PASSWORD_LENGTH) {
            showStatus(`⚠ Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`, 'error');
            return null;
        }
        resetInactivityTimer(); // Reset timer on successful password entry
        return trimmed;
    }
    return null;
}

// Initialize and load token on startup
// Returns: { hasStoredToken: boolean, unlocked: boolean }
async function loadStoredToken() {
    let tokenData = null;
    try {
        tokenData = localStorage.getItem('githubToken');
    } catch (e) {
        console.error('Failed to read from localStorage:', e);
        showStatus('⚠ Cannot access storage. Check browser settings.', 'error', true);
        return { hasStoredToken: false, unlocked: false };
    }
    
    if (tokenData) {
        try {
            const parsed = JSON.parse(tokenData);
            const now = Date.now();
            
            // Check if token is expired
            if (parsed.expiry && now < parsed.expiry) {
                // Prompt for master password to decrypt
                if (!AppState.getPassword()) {
                    AppState.setPassword(await promptForMasterPassword());
                    if (!AppState.getPassword()) {
                        showStatus('⚠ Password required to unlock stored token', 'error');
                        return { hasStoredToken: true, unlocked: false };
                    }
                }
                
                const decryptedToken = await decryptToken(parsed.token, AppState.getPassword());
                if (!decryptedToken) {
                    // Decryption failed - wrong password
                    showStatus('⚠ Incorrect password. Please reload and try again.', 'error');
                    AppState.clearCredentials();
                    // Keep token stored, allow retry
                    return { hasStoredToken: true, unlocked: false };
                }
                AppState.setToken(decryptedToken);
                return { hasStoredToken: true, unlocked: true };
            } else {
                // Token expired, remove it
                try {
                    localStorage.removeItem('githubToken');
                } catch (e) {
                    console.error('Failed to remove expired token:', e);
                }
                showStatus('ℹ Stored token expired', 'info');
            }
        } catch (e) {
            // Invalid format, remove it
            try {
                localStorage.removeItem('githubToken');
            } catch (err) {
                console.error('Failed to remove invalid token:', err);
            }
        }
    }
    return { hasStoredToken: false, unlocked: false };
}

// Check if stored token has expired
function isTokenExpired() {
    try {
        const tokenData = localStorage.getItem('githubToken');
        if (!tokenData) return false; // No token stored
        
        const parsed = JSON.parse(tokenData);
        const now = Date.now();
        
        if (parsed.expiry && now >= parsed.expiry) {
            // Token has expired, clear it
            try {
                localStorage.removeItem('githubToken');
            } catch (e) {
                console.error('Failed to remove expired token:', e);
            }
            AppState.clearCredentials();
            return true;
        }
        return false;
    } catch (e) {
        console.error('Error checking token expiry:', e);
        return false;
    }
}

// Validate token against GitHub API
async function validateToken(token) {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            return { valid: true, error: null };
        } else if (response.status === 401) {
            return { valid: false, error: 'Invalid token or token expired' };
        } else if (response.status === 403) {
            const data = await response.json();
            if (data.message && data.message.includes('rate limit')) {
                return { valid: false, error: 'Rate limit exceeded. Please try again later.' };
            }
            return { valid: false, error: 'Access forbidden. Check token permissions.' };
        } else {
            return { valid: false, error: `Validation failed: ${response.status}` };
        }
    } catch (error) {
        return { valid: false, error: 'Network error during validation' };
    }
}

// Prompt for token on first load
async function promptForToken() {
    const token = await showModal(
        'GitHub Token',
        'Enter your GitHub Fine-grained Personal Access Token:',
        'ghp_...',
        false
    );
    if (token && token.trim()) {
        const tokenValue = token.trim();
        
        // Validate token before storing
        showStatus('⏳ Validating token...', 'info');
        const validation = await validateToken(tokenValue);
        
        if (!validation.valid) {
            showStatus(`⚠ ${validation.error}`, 'error', true);
            return false;
        }
        
        // Prompt for master password if not already set
        if (!AppState.getPassword()) {
            const password = await showModal(
                'Create Master Password',
                `Create a master password to encrypt your token (min ${CONFIG.MIN_PASSWORD_LENGTH} characters):`,
                'Password',
                true
            );
            
            if (!password) {
                showStatus('⚠ Password is required', 'error');
                return false;
            }
            const trimmedPassword = password.trim();
            if (trimmedPassword.length < CONFIG.MIN_PASSWORD_LENGTH) {
                showStatus(`⚠ Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`, 'error');
                return false;
            }
            
            // Confirm password
            const confirmPassword = await showModal(
                'Confirm Password',
                'Re-enter your master password to confirm:',
                'Password',
                true
            );
            
            if (!confirmPassword) {
                showStatus('⚠ Password confirmation required', 'error');
                return false;
            }
            if (confirmPassword.trim() !== trimmedPassword) {
                showStatus('⚠ Passwords do not match', 'error');
                return false;
            }
            
            AppState.setPassword(trimmedPassword);
        }
        
        const encrypted = await encryptToken(tokenValue, AppState.getPassword());
        
        if (!encrypted) {
            showStatus('⚠ Encryption failed', 'error');
            AppState.setPassword(null);
            return false;
        }
        
        // Only set token after successful encryption
        AppState.setToken(tokenValue);
        
        // Store token with error handling
        try {
            const expiryDate = Date.now() + (CONFIG.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
            const tokenData = JSON.stringify({
                token: encrypted,
                expiry: expiryDate
            });
            localStorage.setItem('githubToken', tokenData);
            showStatus(`✓ Token validated and saved securely (expires in ${CONFIG.TOKEN_EXPIRY_DAYS} days)`, 'success');
            return true;
        } catch (e) {
            showStatus('⚠ Failed to save token. Storage may be full or disabled.', 'error', true);
            console.error('localStorage error:', e);
            AppState.clearCredentials();
            return false;
        }
    } else {
        showStatus('⚠ Token is required to use this app', 'error');
        return false;
    }
}

// Change token
async function changeToken() {
    resetInactivityTimer(); // Reset timer on user action
    
    // Clear existing credentials to force new password creation
    const oldToken = AppState.getToken();
    const oldPassword = AppState.getPassword();
    
    AppState.clearCredentials();
    
    const success = await promptForToken();
    
    if (!success) {
        // Restore old credentials if user cancels
        AppState.setToken(oldToken);
        AppState.setPassword(oldPassword);
        showStatus('⚠ Token change cancelled', 'info');
    } else {
        // Re-enable Add button if it was disabled
        document.getElementById('btnAddItem').disabled = false;
        document.getElementById('btnChangeToken').textContent = 'Change Token';
        // Note: Old credentials will be garbage collected eventually
        // JavaScript doesn't allow forcing memory clearing
        showStatus('✓ Token and password updated successfully', 'success');
    }
}
