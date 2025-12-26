// Application initialization and event handling

// SECURITY: Enforce HTTPS in production
if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    location.replace(`https:${location.href.substring(location.protocol.length)}`);
}

// Initialize application
async function init() {
    // Load stored token first
    const tokenStatus = await loadStoredToken();
    
    // If stored token exists but wasn't unlocked, don't proceed
    if (tokenStatus.hasStoredToken && !tokenStatus.unlocked) {
        showStatus('⚠ Please reload and enter correct password', 'error', true);
        return;
    }
    
    // Only prompt for new token if no stored token exists
    if (!AppState.getToken() && !tokenStatus.hasStoredToken) {
        const hasToken = await promptForToken();
        if (!hasToken) {
            showStatus('⚠ Cannot proceed without authentication', 'error', true);
            return;
        }
    }
    
    // Load existing data only if we have a valid token
    if (AppState.getToken()) {
        await pullFromGitHub();
    }
}

// Clear references when page unloads (garbage collector will handle actual cleanup)
window.addEventListener('beforeunload', () => {
    clearTimeout(AppState.getInactivityTimer());
    AppState.clearCredentials();
});

// Event listeners
document.getElementById('btnAddItem').addEventListener('click', addTestItem);
document.getElementById('btnChangeToken').addEventListener('click', changeToken);

// Run on page load
init();
