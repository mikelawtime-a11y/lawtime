// Application initialization and event handling

// SECURITY: Enforce HTTPS in production (but allow file:// for local testing)
if (location.protocol !== 'https:' && location.protocol !== 'file:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
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
        // Populate the schedule with loaded events
        if (typeof populateWeeklySchedule === 'function') {
            populateWeeklySchedule();
        }
        if (typeof updateCalendarWithEvents === 'function') {
            updateCalendarWithEvents();
        }
        // Attach click listeners to schedule cells
        attachScheduleCellListeners();
    }
}

// Clear references when page unloads (garbage collector will handle actual cleanup)
window.addEventListener('beforeunload', () => {
    clearTimeout(AppState.getInactivityTimer());
    AppState.clearCredentials();
});

// Function to add click handlers to schedule cells
function attachScheduleCellListeners() {
    const cells = document.querySelectorAll('.schedule-cell');
    const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    
    cells.forEach((cell, index) => {
        cell.addEventListener('click', async () => {
            if (!AppState.getToken()) {
                showStatus('⚠ Please authenticate first', 'error', true);
                return;
            }
            
            // Calculate which day and time slot this cell represents
            const slotIndex = Math.floor(index / 5); // Which time slot (0-5)
            const dayOffset = index % 5; // Which day (0=Mon, 4=Fri)
            const time = timeSlots[slotIndex];
            
            // Calculate the date for this cell using week offset
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekOffset = AppState.getWeekOffset();
            const referenceDate = new Date(today);
            referenceDate.setDate(today.getDate() + (weekOffset * 7));
            
            const currentWeekStart = new Date(referenceDate);
            const daysSinceMonday = (referenceDate.getDay() + 6) % 7;
            currentWeekStart.setDate(referenceDate.getDate() - daysSinceMonday);
            currentWeekStart.setHours(0, 0, 0, 0);
            
            const cellDate = new Date(currentWeekStart);
            cellDate.setDate(currentWeekStart.getDate() + dayOffset);
            
            const year = cellDate.getFullYear();
            const month = String(cellDate.getMonth() + 1).padStart(2, '0');
            const day = String(cellDate.getDate()).padStart(2, '0');
            
            // Show form with pre-filled date and time
            await addEventToCell(year, month, day, time);
        });
    });
}

// Add event to a specific cell (called when clicking on schedule cell)
async function addEventToCell(year, month, day, time) {
    resetInactivityTimer();
    
    const eventData = await showEventForm(year, month, day, time);
    if (!eventData) {
        return; // User cancelled
    }
    
    const btnAdd = document.getElementById('btnAddItem');
    const btnChange = document.getElementById('btnChangeToken');
    
    btnAdd.disabled = true;
    btnChange.disabled = true;
    
    try {
        showStatus('⏳ Adding event...', 'info');
        
        const pulled = await pullFromGitHub();
        if (!pulled) {
            showStatus('⚠ Failed to load data. Please check your connection or token.', 'error', true);
            return;
        }
        
        const dateKey = `${eventData.year}-${eventData.month}-${eventData.day}`;
        
        const events = AppState.getEvents();
        if (!events[dateKey]) {
            events[dateKey] = [];
        }
        
        events[dateKey].push({
            name: eventData.content,
            time: eventData.time
        });
        
        const synced = await syncToGitHub();
        if (!synced) {
            const lastIndex = events[dateKey].length - 1;
            events[dateKey].splice(lastIndex, 1);
            if (events[dateKey].length === 0) {
                delete events[dateKey];
            }
            showStatus('⚠ Failed to sync. Event not added.', 'error', true);
        } else {
            // Reload from GitHub to ensure we have the latest data
            await pullFromGitHub();
            
            if (typeof populateWeeklySchedule === 'function') {
                populateWeeklySchedule();
            }
            if (typeof updateCalendarWithEvents === 'function') {
                updateCalendarWithEvents();
            }
        }
    } finally {
        // Hide splash screen
        hideSplash();
        
        btnAdd.disabled = false;
        btnChange.disabled = false;
    }
}

// Navigate to previous week
function navigatePreviousWeek() {
    const currentOffset = AppState.getWeekOffset();
    AppState.setWeekOffset(currentOffset - 1);
    
    // Regenerate calendar and schedule
    if (typeof generateCalendar === 'function') {
        generateCalendar();
    }
    if (typeof populateWeeklySchedule === 'function') {
        populateWeeklySchedule();
    }
    if (typeof updateCalendarWithEvents === 'function') {
        updateCalendarWithEvents();
    }
    
    // Re-attach click listeners to new schedule cells
    attachScheduleCellListeners();
}

// Navigate to next week
function navigateNextWeek() {
    const currentOffset = AppState.getWeekOffset();
    AppState.setWeekOffset(currentOffset + 1);
    
    // Regenerate calendar and schedule
    if (typeof generateCalendar === 'function') {
        generateCalendar();
    }
    if (typeof populateWeeklySchedule === 'function') {
        populateWeeklySchedule();
    }
    if (typeof updateCalendarWithEvents === 'function') {
        updateCalendarWithEvents();
    }
    
    // Re-attach click listeners to new schedule cells
    attachScheduleCellListeners();
}

// Jump to current week
function navigateToCurrentWeek() {
    AppState.setWeekOffset(0);
    
    // Regenerate calendar and schedule
    if (typeof generateCalendar === 'function') {
        generateCalendar();
    }
    if (typeof populateWeeklySchedule === 'function') {
        populateWeeklySchedule();
    }
    if (typeof updateCalendarWithEvents === 'function') {
        updateCalendarWithEvents();
    }
    
    // Re-attach click listeners to new schedule cells
    attachScheduleCellListeners();
}

// Update an existing event
async function updateEvent(dateKey, eventIndex, oldEvent) {
    resetInactivityTimer();
    
    // Parse the date key to get year, month, day
    const [year, month, day] = dateKey.split('-');
    
    // Show the event form with pre-filled data including the event name
    const eventData = await showEventForm(
        parseInt(year),
        month,
        parseInt(day),
        oldEvent.time,
        oldEvent.name
    );
    
    if (!eventData) {
        return; // User cancelled
    }
    
    const btnAdd = document.getElementById('btnAddItem');
    const btnChange = document.getElementById('btnChangeToken');
    
    btnAdd.disabled = true;
    btnChange.disabled = true;
    
    try {
        showSplash();
        showStatus('⏳ Updating event...', 'info');
        
        // Pull latest data
        const pulled = await pullFromGitHub();
        if (!pulled) {
            showStatus('⚠ Failed to load latest data', 'error', true);
            return;
        }
        
        const events = AppState.getEvents();
        const newDateKey = `${eventData.year}-${eventData.month}-${eventData.day}`;
        
        // Remove from old date
        if (events[dateKey] && events[dateKey][eventIndex]) {
            events[dateKey].splice(eventIndex, 1);
            
            // If no more events on this date, remove the date key
            if (events[dateKey].length === 0) {
                delete events[dateKey];
            }
        }
        
        // Add to new date
        if (!events[newDateKey]) {
            events[newDateKey] = [];
        }
        events[newDateKey].push({
            name: eventData.content,
            time: eventData.time
        });
        
        // Sync to GitHub
        const synced = await syncToGitHub();
        
        if (!synced) {
            showStatus('⚠ Failed to update event', 'error', true);
        } else {
            showStatus('✓ Event updated successfully', 'success');
            
            // Refresh display
            if (typeof populateWeeklySchedule === 'function') {
                populateWeeklySchedule();
            }
            if (typeof updateCalendarWithEvents === 'function') {
                updateCalendarWithEvents();
            }
        }
    } finally {
        hideSplash();
        btnAdd.disabled = false;
        btnChange.disabled = false;
    }
}

// Delete an event
async function deleteEvent(dateKey, eventIndex, event) {
    resetInactivityTimer();
    
    // Confirm deletion using browser's confirm dialog
    const confirmed = confirm(`Are you sure you want to delete this event?\n\n${event.time} - ${event.name}`);
    if (!confirmed) {
        return;
    }
    
    const btnAdd = document.getElementById('btnAddItem');
    const btnChange = document.getElementById('btnChangeToken');
    
    btnAdd.disabled = true;
    btnChange.disabled = true;
    
    try {
        showSplash();
        showStatus('⏳ Deleting event...', 'info');
        
        // Pull latest data
        const pulled = await pullFromGitHub();
        if (!pulled) {
            showStatus('⚠ Failed to load latest data', 'error', true);
            return;
        }
        
        const events = AppState.getEvents();
        
        // Remove the event
        if (events[dateKey] && events[dateKey][eventIndex]) {
            events[dateKey].splice(eventIndex, 1);
            
            // If no more events on this date, remove the date key
            if (events[dateKey].length === 0) {
                delete events[dateKey];
            }
        }
        
        // Sync to GitHub
        const synced = await syncToGitHub();
        
        if (!synced) {
            showStatus('⚠ Failed to delete event', 'error', true);
        } else {
            showStatus('✓ Event deleted successfully', 'success');
            
            // Refresh display
            if (typeof populateWeeklySchedule === 'function') {
                populateWeeklySchedule();
            }
            if (typeof updateCalendarWithEvents === 'function') {
                updateCalendarWithEvents();
            }
        }
    } finally {
        hideSplash();
        btnAdd.disabled = false;
        btnChange.disabled = false;
    }
}

// Event listeners
document.getElementById('btnAddItem').addEventListener('click', addTestItem);
document.getElementById('btnChangeToken').addEventListener('click', changeToken);
document.getElementById('btnPrevWeek').addEventListener('click', navigatePreviousWeek);
document.getElementById('btnCurrentWeek').addEventListener('click', navigateToCurrentWeek);
document.getElementById('btnNextWeek').addEventListener('click', navigateNextWeek);

// Run on page load
init();
