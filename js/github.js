// GitHub API operations

// Helper function for rate limit handling
function handleRateLimitResponse(response) {
    const resetTime = response.headers.get('X-RateLimit-Reset');
    const resetDate = resetTime ? new Date(resetTime * 1000).toLocaleTimeString() : 'soon';
    return `⚠ Rate limit exceeded. Try again after ${resetDate}`;
}

// Calculate which months are visible in the current 3-week view
function getVisibleMonths() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekOffset = AppState.getWeekOffset();
    const referenceDate = new Date(today);
    referenceDate.setDate(today.getDate() + (weekOffset * 7));
    
    // Find the Sunday of the reference week
    const currentWeekSunday = new Date(referenceDate);
    currentWeekSunday.setDate(referenceDate.getDate() - referenceDate.getDay());
    
    // Start from Sunday of 1 week before reference week
    const startDate = new Date(currentWeekSunday);
    startDate.setDate(currentWeekSunday.getDate() - 7);
    
    // End at Saturday of 1 week after current week (21 days total)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 20);
    
    // Collect unique year-month combinations
    const months = new Set();
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        months.add(`${year}-${month}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Convert to array of {year, month} objects
    return Array.from(months).map(ym => {
        const [year, month] = ym.split('-');
        return { year: parseInt(year), month: parseInt(month) };
    });
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

// Pull data from GitHub - loads all month files visible in current 3-week view
async function pullFromGitHub() {
    // Check if token expired before operation
    if (isTokenExpired()) {
        showStatus('⚠ Token expired. Please change token to continue.', 'error', true);
        return false;
    }
    
    resetInactivityTimer(); // Reset timer on API activity
    
    try {
        // Get all months that are visible in the current view
        const visibleMonths = getVisibleMonths();
        console.log('Loading data for months:', visibleMonths);
        
        // Load data from each month file
        const allEvents = {};
        
        for (const {year, month} of visibleMonths) {
            const filePath = getGitHubPathForMonth(year, month);
            const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${filePath}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AppState.getToken()}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const fileData = await response.json();
                const content = base64DecodeUnicode(fileData.content.replace(/\s/g, ''));
                const monthEvents = JSON.parse(content);
                
                // Merge events from this month into allEvents
                Object.assign(allEvents, monthEvents);
                console.log(`Loaded ${Object.keys(monthEvents).length} event dates from ${filePath}`);
            } else if (response.status === 404) {
                // File doesn't exist yet for this month - that's okay
                console.log(`No file found for ${filePath} (this is normal for new months)`);
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
                console.error(`Error loading ${filePath}:`, response.status);
            }
        }
        
        AppState.setEvents(allEvents);
        showStatus('✓ Loaded data from GitHub', 'success');
        console.log(`Total events loaded: ${Object.keys(allEvents).length} dates`);
        return true;
    } catch (error) {
        console.error('GitHub pull error:', error);
        showStatus('⚠ Network error loading from GitHub', 'error', true);
        return false;
    }
}

// Sync data to GitHub - saves events to their respective month files
async function syncToGitHub() {
    // Check if token expired before operation
    if (isTokenExpired()) {
        showStatus('⚠ Token expired. Please change token to continue.', 'error', true);
        return false;
    }
    
    resetInactivityTimer(); // Reset timer on API activity
    
    try {
        // Group events by month
        const eventsByMonth = {};
        const allEvents = AppState.getEvents();
        
        for (const dateKey in allEvents) {
            // Parse date key (format: YYYY-MM-DD)
            const [year, month] = dateKey.split('-');
            const monthKey = `${year}-${month}`;
            
            if (!eventsByMonth[monthKey]) {
                eventsByMonth[monthKey] = {};
            }
            eventsByMonth[monthKey][dateKey] = allEvents[dateKey];
        }
        
        console.log('Syncing events to months:', Object.keys(eventsByMonth));
        
        // Save each month's events to its respective file
        for (const monthKey in eventsByMonth) {
            const [year, month] = monthKey.split('-');
            const filePath = getGitHubPathForMonth(year, month);
            const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${filePath}`;
            
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
            
            // Update file with this month's events
            const content = base64EncodeUnicode(JSON.stringify(eventsByMonth[monthKey], null, 2));
            const updateResponse = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${AppState.getToken()}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Update calendar events for ${year}-${month}`,
                    content: content,
                    sha: sha
                })
            });
            
            if (updateResponse.ok) {
                console.log(`Successfully synced ${filePath}`);
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
        }
        
        showStatus('✓ Successfully synced to GitHub', 'success');
        return true;
    } catch (error) {
        showStatus('⚠ Network error during sync: ' + error.message, 'error', true);
        console.error('GitHub sync error:', error);
        return false;
    }
}

// Show event form modal
function showEventForm(prefillYear = null, prefillMonth = null, prefillDay = null, prefillTime = null, prefillContent = '') {
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
        
        // Set default values to current date or use prefilled values
        const now = new Date();
        yearInput.value = prefillYear || now.getFullYear();
        monthInput.value = prefillMonth || String(now.getMonth() + 1).padStart(2, '0');
        
        // Populate days based on selected month
        const selectedYear = parseInt(yearInput.value);
        const selectedMonth = parseInt(monthInput.value);
        const selectedDay = prefillDay || String(now.getDate()).padStart(2, '0');
        populateDays(selectedYear, selectedMonth, selectedDay);
        
        // Set time if prefilled
        if (prefillTime) {
            timeSelect.value = prefillTime;
        }
        
        // Set content if prefilled (for editing)
        contentInput.value = prefillContent || '';
        
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
                // Show splash immediately when user confirms
                showSplash();
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
            // Reload from GitHub to ensure we have the latest data
            await pullFromGitHub();
            
            // Refresh the schedule display
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
        
        // Re-enable buttons
        btnAdd.disabled = false;
        btnChange.disabled = false;
    }
}
