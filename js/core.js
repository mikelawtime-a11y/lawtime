// Application configuration constants
const CONFIG = {
    GITHUB_OWNER: 'mikelawtime-a11y',
    GITHUB_REPO: 'datarepo',
    TOKEN_EXPIRY_DAYS: 7, // Token expires after 7 days (change to 30 for a month)
    STATUS_HIDE_DELAY: 5000, // milliseconds
    INACTIVITY_TIMEOUT: 15 * 60 * 1000, // 15 minutes
    MIN_PASSWORD_LENGTH: 8
};

// Generate file path based on current year and month (e.g., 202512.json for Dec 2025)
function getGitHubPath() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}.json`;
}

// Encapsulate sensitive data in a module pattern
const AppState = (() => {
    let _token = null;
    let _password = null;
    let _events = {};
    let _inactivityTimer = null;
    
    return {
        getToken: () => _token,
        setToken: (val) => {
            _token = val;
            resetInactivityTimer();
        },
        getPassword: () => _password,
        setPassword: (val) => {
            _password = val;
            resetInactivityTimer();
        },
        getEvents: () => _events,
        setEvents: (val) => {
            _events = val;
        },
        clearCredentials: () => {
            _token = null;
            _password = null;
        },
        getInactivityTimer: () => _inactivityTimer,
        setInactivityTimer: (val) => {
            _inactivityTimer = val;
        }
    };
})();

// Session timeout - auto-lock after inactivity
function resetInactivityTimer() {
    clearTimeout(AppState.getInactivityTimer());
    const timer = setTimeout(() => {
        AppState.clearCredentials();
        showStatus('🔒 Session locked due to inactivity', 'info', true);
        // Disable buttons
        document.getElementById('btnAddItem').disabled = true;
        document.getElementById('btnChangeToken').textContent = 'Unlock / Change Token';
    }, CONFIG.INACTIVITY_TIMEOUT);
    AppState.setInactivityTimer(timer);
}

// Show splash screen
function showSplash() {
    const splash = document.getElementById('splashScreen');
    if (splash) {
        splash.style.display = 'flex';
    }
}

// Hide splash screen
function hideSplash() {
    const splash = document.getElementById('splashScreen');
    if (splash) {
        splash.style.display = 'none';
    }
}

// Show status message
function showStatus(message, type, persistent = false) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    if (!persistent) {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, CONFIG.STATUS_HIDE_DELAY);
    }
}

// Custom modal dialog helper
function showModal(title, message, placeholder = '', isPassword = false) {
    resetInactivityTimer(); // Reset timer on user interaction
    return new Promise((resolve) => {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalInput = document.getElementById('modalInput');
        const modalOk = document.getElementById('modalOk');
        const modalCancel = document.getElementById('modalCancel');
        const modalContent = modal.querySelector('.modal-content');
        
        // Store previously focused element to restore later
        const previouslyFocused = document.activeElement;
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalInput.value = '';
        modalInput.placeholder = placeholder;
        modalInput.type = isPassword ? 'password' : 'text';
        modal.style.display = 'flex';
        
        // Focus input after modal is visible
        setTimeout(() => modalInput.focus(), 0);
        
        // Focus trap - keep focus within modal
        const focusableElements = [modalInput, modalOk, modalCancel];
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        const handleTabKey = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        lastFocusable.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        firstFocusable.focus();
                        e.preventDefault();
                    }
                }
            }
        };
        
        const cleanup = () => {
            modal.style.display = 'none';
            modalOk.onclick = null;
            modalCancel.onclick = null;
            modalInput.onkeydown = null;
            modal.onclick = null;
            document.removeEventListener('keydown', handleTabKey);
            // Restore focus to previously focused element
            if (previouslyFocused) {
                previouslyFocused.focus();
            }
        };
        
        // Click outside modal content to close
        modal.onclick = (e) => {
            if (e.target === modal) {
                cleanup();
                resolve(null);
            }
        };
        
        // Prevent clicks inside modal content from closing
        modalContent.onclick = (e) => {
            e.stopPropagation();
        };
        
        modalOk.onclick = () => {
            const value = modalInput.value;
            cleanup();
            resolve(value);
        };
        
        modalCancel.onclick = () => {
            cleanup();
            resolve(null);
        };
        
        modalInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const value = modalInput.value;
                cleanup();
                resolve(value);
            } else if (e.key === 'Escape') {
                cleanup();
                resolve(null);
            }
        };
        
        // Enable focus trap
        document.addEventListener('keydown', handleTabKey);
    });
}
