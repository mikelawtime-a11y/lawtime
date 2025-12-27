// GitHub API operations

// Helper function for rate limit handling
function handleRateLimitResponse(response) {
    const resetTime = response.headers.get('X-RateLimit-Reset');
    const resetDate = resetTime ? new Date(resetTime * 1000).toLocaleTimeString() : 'soon';
    return `⚠ Rate limit exceeded. Try again after ${resetDate}`;
}

// Unicode-safe base64 encoding
function base64EncodeUnicode(str) {
    try {
        // Use TextEncoder for proper Unicode handling
        const bytes = new TextEncoder().encode(str);
        const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
        return btoa(binString);
    } catch (e) {
        console.error('Base64 encode error:', e);
        // Fallback to regular btoa if TextEncoder fails
        return btoa(str);
    }
}

// Unicode-safe base64 decoding
function base64DecodeUnicode(str) {
    try {
        // Decode from base64 then use TextDecoder
        const binString = atob(str);
        const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
        return new TextDecoder().decode(bytes);
    } catch (e) {
        console.error('Base64 decode error:', e);
        // Fallback to regular atob if TextDecoder fails
        return atob(str);
    }
}

// Pull data from GitHub
async function pullFromGitHub() {
    // Check if token expired before operation
    if (isTokenExpired()) {
        showStatus('⚠ Token expired. Please change token to continue.', 'error', true);
        return false;
    }
    
    resetInactivityTimer(); // Reset timer on API activity
    
    try {
        const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${getGitHubPath()}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AppState.getToken()}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const fileData = await response.json();
            const content = base64DecodeUnicode(fileData.content.replace(/\s/g, ''));
            AppState.setEvents(JSON.parse(content));
            showStatus('✓ Loaded data from GitHub', 'success');
            return true;
        } else if (response.status === 404) {
            // File doesn't exist yet, start with empty data
            AppState.setEvents({});
            showStatus('ℹ File not found, starting fresh', 'info');
            return true;
        } else if (response.status === 403) {
            // Handle rate limiting
            const data = await response.json();
            if (data.message && data.message.includes('rate limit')) {
                showStatus(handleRateLimitResponse(response), 'error', true);
            } else {
                showStatus('⚠ Access forbidden. Check token permissions.', 'error', true);
            }
            return false;
        } else if (response.status === 401) {
            showStatus('⚠ Token expired or invalid. Please change token.', 'error', true);
            return false;
        } else {
            showStatus(`⚠ Failed to load from GitHub (${response.status})`, 'error', true);
            return false;
        }
    } catch (error) {
        console.error('GitHub pull error:', error);
        showStatus('⚠ Network error loading from GitHub', 'error', true);
        return false;
    }
}

// Sync data to GitHub
async function syncToGitHub() {
    // Check if token expired before operation
    if (isTokenExpired()) {
        showStatus('⚠ Token expired. Please change token to continue.', 'error', true);
        return false;
    }
    
    resetInactivityTimer(); // Reset timer on API activity
    
    try {
        const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${getGitHubPath()}`;
        
        // Get current file SHA
        const getResponse = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AppState.getToken()}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        let sha = null;
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            sha = fileData.sha;
        } else if (getResponse.status === 403) {
            // Handle rate limiting
            const data = await getResponse.json();
            if (data.message && data.message.includes('rate limit')) {
                showStatus(handleRateLimitResponse(getResponse), 'error', true);
                return false;
            }
        }
        
        // Update file
        const content = base64EncodeUnicode(JSON.stringify(AppState.getEvents(), null, 2));
        const updateResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${AppState.getToken()}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Update calendar events',
                content: content,
                sha: sha
            })
        });
        
        if (updateResponse.ok) {
            showStatus('✓ Successfully synced to GitHub', 'success');
            return true;
        } else if (updateResponse.status === 403) {
            // Handle rate limiting
            const data = await updateResponse.json();
            if (data.message && data.message.includes('rate limit')) {
                showStatus(handleRateLimitResponse(updateResponse), 'error', true);
            } else {
                showStatus('⚠ Access forbidden. Check token permissions.', 'error', true);
            }
            return false;
        } else if (updateResponse.status === 401) {
            showStatus('⚠ Token expired or invalid. Please change token.', 'error', true);
            return false;
        } else {
            const errorData = await updateResponse.json();
            console.error('Sync failed:', errorData);
            showStatus('⚠ Sync failed: ' + (errorData.message || 'Unknown error'), 'error', true);
            return false;
        }
    } catch (error) {
        showStatus('⚠ Network error during sync: ' + error.message, 'error', true);
        console.error('GitHub sync error:', error);
        return false;
    }
}

// Show event form modal
function showEventForm() {
    return new Promise((resolve) => {
        const modal = document.getElementById('eventFormModal');
        const yearInput = document.getElementById('eventYear');
        const monthInput = document.getElementById('eventMonth');
        const dayInput = document.getElementById('eventDay');
        const timeSelect = document.getElementById('eventTime');
        const contentInput = document.getElementById('eventContent');
        const okBtn = document.getElementById('eventFormOk');
        const cancelBtn = document.getElementById('eventFormCancel');
        
        // Function to get number of days in a month
        const getDaysInMonth = (year, month) => {
            return new Date(year, month, 0).getDate();
        };
        
        // Function to populate day dropdown
        const populateDays = (year, month, selectedDay = null) => {
            const daysInMonth = getDaysInMonth(year, month);
            const currentDay = selectedDay || dayInput.value || String(new Date().getDate()).padStart(2, '0');
            
            dayInput.innerHTML = '';
            for (let i = 1; i <= daysInMonth; i++) {
                const option = document.createElement('option');
                option.value = String(i).padStart(2, '0');
                option.textContent = i;
                dayInput.appendChild(option);
            }
            
            // Set selected day, or max day if current day is invalid
            const dayNum = parseInt(currentDay);
            if (dayNum <= daysInMonth) {
                dayInput.value = String(dayNum).padStart(2, '0');
            } else {
                dayInput.value = String(daysInMonth).padStart(2, '0');
            }
        };
        
        // Set default values to current date
        const now = new Date();
        yearInput.value = now.getFullYear();
        monthInput.value = String(now.getMonth() + 1).padStart(2, '0');
        
        // Populate days based on current month
        populateDays(now.getFullYear(), now.getMonth() + 1, String(now.getDate()).padStart(2, '0'));
        
        contentInput.value = '';
        
        // Update days when month or year changes
        const updateDays = () => {
            const year = parseInt(yearInput.value);
            const month = parseInt(monthInput.value);
            const currentDay = dayInput.value;
            populateDays(year, month, currentDay);
        };
        
        monthInput.addEventListener('change', updateDays);
        yearInput.addEventListener('change', updateDays);
        
        modal.style.display = 'flex';
        setTimeout(() => contentInput.focus(), 0);
        
        const cleanup = () => {
            modal.style.display = 'none';
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            monthInput.removeEventListener('change', updateDays);
            yearInput.removeEventListener('change', updateDays);
        };
        
        okBtn.onclick = () => {
            const year = yearInput.value;
            const month = monthInput.value; // Already padded from select
            const day = dayInput.value; // Already padded from select
            const time = timeSelect.value;
            const content = contentInput.value.trim();
            
            if (content) {
                cleanup();
                resolve({ year, month, day, time, content });
            } else {
                showStatus('⚠ Please enter event content', 'error');
            }
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            resolve(null);
        };
    });
}

// Add test item
async function addTestItem() {
    if (!AppState.getToken()) {
        showStatus('⚠ Please authenticate first', 'error', true);
        return;
    }
    
    resetInactivityTimer(); // Reset timer on user action
    
    // Show form to get event details
    const eventData = await showEventForm();
    if (!eventData) {
        return; // User cancelled
    }
    
    const btnAdd = document.getElementById('btnAddItem');
    const btnChange = document.getElementById('btnChangeToken');
    
    // Disable buttons during operation
    btnAdd.disabled = true;
    btnChange.disabled = true;
    
    try {
        showStatus('⏳ Adding event...', 'info');
        
        // Pull latest data first
        const pulled = await pullFromGitHub();
        if (!pulled) {
            showStatus('⚠ Failed to load data. Please check your connection or token.', 'error', true);
            return;
        }
        
        // Create date key from form inputs
        const dateKey = `${eventData.year}-${eventData.month}-${eventData.day}`;
        
        const events = AppState.getEvents();
        if (!events[dateKey]) {
            events[dateKey] = [];
        }
        
        events[dateKey].push({
            name: eventData.content,
            time: eventData.time
        });
        
        // Sync to GitHub
        const synced = await syncToGitHub();
        if (!synced) {
            // Roll back the change if sync failed
            const lastIndex = events[dateKey].length - 1;
            events[dateKey].splice(lastIndex, 1);
            if (events[dateKey].length === 0) {
                delete events[dateKey];
            }
            showStatus('⚠ Failed to sync. Event not added.', 'error', true);
        } else {
            // Refresh the schedule display
            if (typeof populateWeeklySchedule === 'function') {
                populateWeeklySchedule();
            }
            if (typeof updateCalendarWithEvents === 'function') {
                updateCalendarWithEvents();
            }
        }
    } finally {
        // Re-enable buttons
        btnAdd.disabled = false;
        btnChange.disabled = false;
    }
}
