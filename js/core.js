// Application configuration constants
const CONFIG = {
    GITHUB_OWNER: 'mikelawtime-a11y',
    GITHUB_REPO: 'datarepo',
    TOKEN_EXPIRY_DAYS: 7, // Token expires after 7 days (change to 30 for a month)
    STATUS_HIDE_DELAY: 5000, // milliseconds
    INACTIVITY_TIMEOUT: 15 * 60 * 1000, // 15 minutes
    MIN_PASSWORD_LENGTH: 8,
    DEBUG: false // Set to true for development logging
};

// Conditional logger utility
const logger = {
    log: (...args) => CONFIG.DEBUG && console.log(...args),
    warn: (...args) => CONFIG.DEBUG && console.warn(...args),
    error: (...args) => console.error(...args) // Always log errors
};

// Generate file path based on current year and month (e.g., 202512.json for Dec 2025)
function getGitHubPath() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}.json`;
}

// Generate file path for a specific year and month
function getGitHubPathForMonth(year, month) {
    return `${year}${String(month).padStart(2, '0')}.json`;
}

// Encapsulate sensitive data in a module pattern
const AppState = (() => {
    let _token = null;
    let _password = null;
    let _events = {};
    let _inactivityTimer = null;
    let _weekOffset = 0; // 0 = current week, -1 = previous week, +1 = next week
    let _operationInProgress = false; // Race condition prevention
    
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
        },
        getWeekOffset: () => _weekOffset,
        setWeekOffset: (val) => {
            _weekOffset = val;
        },
        isOperationInProgress: () => _operationInProgress,
        setOperationInProgress: (val) => {
            _operationInProgress = val;
        }
    };
})();

// Utility function to refresh calendar display
function refreshCalendarDisplay() {
    if (typeof generateCalendar === 'function') generateCalendar();
    if (typeof populateWeeklySchedule === 'function') populateWeeklySchedule();
    if (typeof updateCalendarWithEvents === 'function') updateCalendarWithEvents();
    if (typeof attachScheduleCellListeners === 'function') attachScheduleCellListeners();
}

// Helper function to get event by ID
function getEventById(dateKey, eventId) {
    const events = AppState.getEvents();
    if (!events[dateKey]) return null;
    return events[dateKey].find(e => e.id === eventId);
}

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

// Update current date/time display
function updateDateTime() {
    const dateTimeEl = document.getElementById('currentDateTime');
    if (dateTimeEl) {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        dateTimeEl.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Initialize date/time display and update every second
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updateDateTime();
        setInterval(updateDateTime, 1000);
    });
} else {
    updateDateTime();
    setInterval(updateDateTime, 1000);
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

// Show cell action modal (Add New or Select Event)
function showCellActionModal(dateKey, time, existingEvents) {
    resetInactivityTimer();
    return new Promise((resolve) => {
        const modal = document.getElementById('eventOptionsModal');
        const modalTitle = document.getElementById('eventOptionsTitle');
        const modalMessage = document.getElementById('eventOptionsMessage');
        const buttonsContainer = modal.querySelector('.modal-buttons');
        
        modalTitle.textContent = 'Choose Action';
        modalMessage.textContent = `${time} - ${existingEvents.length} event(s) found`;
        modal.style.display = 'flex';
        
        // Clear existing buttons
        buttonsContainer.innerHTML = '';
        
        // Create "Add New Event" button
        const addNewBtn = document.createElement('button');
        addNewBtn.textContent = '+ Add New Event';
        addNewBtn.className = 'modal-btn-primary';
        addNewBtn.style.backgroundColor = '#4CAF50';
        addNewBtn.style.marginBottom = '10px';
        addNewBtn.style.width = '100%';
        buttonsContainer.appendChild(addNewBtn);
        
        // Create list of existing events
        existingEvents.forEach((event, index) => {
            const eventBtn = document.createElement('button');
            eventBtn.textContent = `${event.time} - ${event.name}`;
            eventBtn.className = 'modal-btn-secondary';
            eventBtn.style.marginBottom = '5px';
            eventBtn.style.width = '100%';
            eventBtn.style.textAlign = 'left';
            eventBtn.style.padding = '12px';
            buttonsContainer.appendChild(eventBtn);
            
            eventBtn.onclick = async () => {
                cleanup();
                await showEventOptions(dateKey, event.id, event);
                resolve({ action: 'select', index });
            };
        });
        
        // Create Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'modal-btn-secondary';
        cancelBtn.style.marginTop = '10px';
        cancelBtn.style.width = '100%';
        buttonsContainer.appendChild(cancelBtn);
        
        const cleanup = () => {
            modal.style.display = 'none';
            buttonsContainer.innerHTML = `
                <button id="eventEditBtn" class="modal-btn-primary">Edit</button>
                <button id="eventDeleteBtn" class="modal-btn-delete">Delete</button>
                <button id="eventCancelBtn" class="modal-btn-secondary">Cancel</button>
            `;
        };
        
        addNewBtn.onclick = () => {
            cleanup();
            resolve({ action: 'addNew' });
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            resolve({ action: 'cancel' });
        };
        
        // ESC key to cancel
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEscape);
                cleanup();
                resolve({ action: 'cancel' });
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Focus first button
        setTimeout(() => addNewBtn.focus(), 0);
    });
}

// Show event options dialog (Edit/Delete/Cancel)
function showEventOptions(dateKey, eventIdOrIndex, event) {
    resetInactivityTimer();
    return new Promise((resolve) => {
        const modal = document.getElementById('eventOptionsModal');
        const modalTitle = document.getElementById('eventOptionsTitle');
        const modalMessage = document.getElementById('eventOptionsMessage');
        const editBtn = document.getElementById('eventEditBtn');
        const deleteBtn = document.getElementById('eventDeleteBtn');
        const cancelBtn = document.getElementById('eventCancelBtn');
        
        modalTitle.textContent = 'Event Options';
        modalMessage.textContent = `${event.time} - ${event.name}`;
        modal.style.display = 'flex';
        
        // Focus edit button
        setTimeout(() => editBtn.focus(), 0);
        
        const cleanup = () => {
            modal.style.display = 'none';
            editBtn.onclick = null;
            deleteBtn.onclick = null;
            cancelBtn.onclick = null;
        };
        
        editBtn.onclick = async () => {
            cleanup();
            resolve('edit');
            await updateEvent(dateKey, eventIdOrIndex, event);
        };
        
        deleteBtn.onclick = async () => {
            cleanup();
            resolve('delete');
            await deleteEvent(dateKey, eventIdOrIndex, event);
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            resolve('cancel');
        };
        
        // ESC key to cancel
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEscape);
                cleanup();
                resolve('cancel');
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}
