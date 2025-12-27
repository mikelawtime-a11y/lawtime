// Calendar functionality - Shows 3 weeks: 1 week past + current week + 1 week future

function generateCalendar() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Apply week offset
    const weekOffset = AppState.getWeekOffset();
    const referenceDate = new Date(today);
    referenceDate.setDate(today.getDate() + (weekOffset * 7));
    
    // Find the Monday of the reference week (to put current week in middle)
    const referenceWeekMonday = new Date(referenceDate);
    const daysSinceMonday = (referenceDate.getDay() + 6) % 7; // Convert Sun=0 to Mon=0
    referenceWeekMonday.setDate(referenceDate.getDate() - daysSinceMonday);
    
    // Start from Monday of 1 week before reference week (so reference week is in middle)
    const startDate = new Date(referenceWeekMonday);
    startDate.setDate(referenceWeekMonday.getDate() - 7);
    
    // End 14 days later (3 weeks of weekdays: Mon-Fri)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 14);
    
    // Get calendar elements
    const calendarEl = document.getElementById('calendar');
    const monthEl = document.getElementById('calendarMonth');
    
    // Set header to show date range
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = monthNames[startDate.getMonth()];
    const endMonth = monthNames[endDate.getMonth()];
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    
    if (startDate.getMonth() === endDate.getMonth()) {
        monthEl.textContent = `${startMonth} ${startDay}-${endDay}, ${startDate.getFullYear()}`;
    } else {
        monthEl.textContent = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${endDate.getFullYear()}`;
    }
    
    // Clear calendar
    calendarEl.innerHTML = '';
    
    // Add day headers (weekdays only)
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarEl.appendChild(dayHeader);
    });
    
    // Calculate current week range (Monday to Friday) using reference date
    const currentWeekStart = new Date(referenceWeekMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 4); // Friday
    currentWeekEnd.setHours(23, 59, 59, 999);
    
    // Generate 3 weeks (15 weekdays) starting from startDate (Monday)
    const currentDate = new Date(startDate);
    let daysGenerated = 0;
    while (daysGenerated < 15) {
        const dayOfWeek = currentDate.getDay();
        
        // Only process weekdays (Monday = 1 to Friday = 5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            dayCell.textContent = currentDate.getDate();
            
            // Check if date is in current week
            if (currentDate >= currentWeekStart && currentDate <= currentWeekEnd) {
                dayCell.classList.add('current-week');
            }
            
            // Highlight today (takes priority over current-week)
            if (currentDate.getTime() === today.getTime()) {
                dayCell.classList.add('today');
            }
            
            // Show different styling for different months
            if (currentDate.getMonth() !== today.getMonth()) {
                dayCell.classList.add('other-month');
            }
            
            calendarEl.appendChild(dayCell);
            daysGenerated++;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// Initialize calendar when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', generateCalendar);
} else {
    generateCalendar();
}

// Populate weekly schedule with events for current week
function populateWeeklySchedule() {
    logger.log('=== populateWeeklySchedule called ===');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Apply week offset
    const weekOffset = AppState.getWeekOffset();
    const referenceDate = new Date(today);
    referenceDate.setDate(today.getDate() + (weekOffset * 7));
    
    // Calculate current week range (Monday to Friday) using reference date
    const currentWeekStart = new Date(referenceDate);
    const daysSinceMonday = (referenceDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    currentWeekStart.setDate(referenceDate.getDate() - daysSinceMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const events = AppState.getEvents();
    logger.log('Events loaded:', events);
    logger.log('Current week starts:', currentWeekStart.toISOString());
    
    // Clear existing content in schedule cells
    const cells = document.querySelectorAll('.schedule-cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.style.padding = '4px';
        cell.style.fontSize = '0.75rem';
        cell.style.overflow = 'auto';
        cell.style.textOverflow = 'ellipsis';
        cell.style.maxHeight = '80px';
    });
    
    // Populate each day of the week
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentWeekStart.getDate() + dayOffset);
        
        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        logger.log(`Checking date: ${dateKey}, Day offset: ${dayOffset}`);
        
        if (events[dateKey] && events[dateKey].length > 0) {
            logger.log(`  Found ${events[dateKey].length} events for ${dateKey}:`, events[dateKey]);
            
            // Group events by time slot
            const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
            
            events[dateKey].forEach((event) => {
                logger.log(`    Event: ${event.time} - ${event.name}`);
                const eventHour = parseInt(event.time.split(':')[0]);
                const eventMinute = parseInt(event.time.split(':')[1]);
                
                // Find which time slot this belongs to
                let slotIndex = -1;
                if (eventHour >= 9 && eventHour < 10) slotIndex = 0;
                else if (eventHour >= 10 && eventHour < 11) slotIndex = 1;
                else if (eventHour >= 11 && eventHour < 14) slotIndex = 2;
                else if (eventHour >= 14 && eventHour < 15) slotIndex = 3;
                else if (eventHour >= 15 && eventHour < 16) slotIndex = 4;
                else if (eventHour >= 16 && eventHour < 24) slotIndex = 5; // Evening events go to 16:00 slot
                else if (eventHour >= 0 && eventHour < 9) slotIndex = 0; // Early morning to 09:00 slot
                
                logger.log(`      Event hour: ${eventHour}, assigned to slot: ${slotIndex}`);
                
                if (slotIndex >= 0) {
                    // Calculate cell index: slotIndex * 5 (schedule cells per row) + dayOffset
                    const cellIndex = slotIndex * 5 + dayOffset;
                    const cell = cells[cellIndex];
                    logger.log(`      Cell index: ${cellIndex}`);
                    
                    if (cell) {
                        // Create clickable event item div with accessibility
                        const eventDiv = document.createElement('div');
                        eventDiv.className = 'event-item';
                        eventDiv.textContent = event.name;
                        eventDiv.title = `${event.time} - ${event.name}\nClick or press Enter to edit or delete`;
                        
                        // Accessibility attributes
                        eventDiv.setAttribute('role', 'button');
                        eventDiv.setAttribute('tabindex', '0');
                        eventDiv.setAttribute('aria-label', `Event: ${event.name} at ${event.time}. Press Enter to edit or delete.`);
                        
                        // Store event metadata using ID instead of index
                        eventDiv.dataset.dateKey = dateKey;
                        eventDiv.dataset.eventId = event.id || crypto.randomUUID();
                        eventDiv.dataset.eventName = event.name;
                        eventDiv.dataset.eventTime = event.time;
                        
                        cell.appendChild(eventDiv);
                        logger.log(`      ✓ Added clickable event to cell`);
                    } else {
                        logger.log(`      ✗ Cell not found`);
                    }
                } else {
                    logger.log(`      ✗ No slot assigned`);
                }
            });
        } else {
            logger.log(`  No events for ${dateKey}`);
        }
    }
    logger.log('=== populateWeeklySchedule complete ===');
}

// Add event indicators to calendar days
function updateCalendarWithEvents() {
    logger.log('=== updateCalendarWithEvents called ===');
    const events = AppState.getEvents();
    logger.log('Events:', events);
    const calendarDays = document.querySelectorAll('.calendar-day');
    
    // Calculate the date range being displayed (same logic as generateCalendar)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekOffset = AppState.getWeekOffset();
    const referenceDate = new Date(today);
    referenceDate.setDate(today.getDate() + (weekOffset * 7));
    referenceWeekMonday = new Date(referenceDate);
    const daysSinceMonday = (referenceDate.getDay() + 6) % 7;
    referenceWeekMonday.setDate(referenceDate.getDate() - daysSinceMonday);
    
    const startDate = new Date(referenceWeekMonday);
    startDate.setDate(referenceWeekMonday.getDate() - 7);
    
    // Create array of visible dates (weekdays only - 3 weeks, 15 days)
    const visibleDates = [];
    const currentDate = new Date(startDate);
    let daysCollected = 0;
    while (daysCollected < 15) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            visibleDates.push(new Date(currentDate));
            daysCollected++
            visibleDates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Match calendar cells with their actual dates
    calendarDays.forEach((dayCell, index) => {
        if (index >= visibleDates.length) return;
        
        const cellDate = visibleDates[index];
        const dateKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
        
        if (events[dateKey] && events[dateKey].length > 0) {
            logger.log(`  Day ${cellDate.getDate()} (${dateKey}) has ${events[dateKey].length} events:`, events[dateKey]);
            
            // Add event count badge
            const badge = document.createElement('div');
            badge.textContent = events[dateKey].length;
            badge.style.position = 'absolute';
            badge.style.top = '4px';
            badge.style.right = '4px';
            badge.style.backgroundColor = '#ff6b6b';
            badge.style.color = 'white';
            badge.style.borderRadius = '50%';
            badge.style.width = '18px';
            badge.style.height = '18px';
            badge.style.fontSize = '0.7rem';
            badge.style.fontWeight = 'bold';
            badge.style.display = 'flex';
            badge.style.alignItems = 'center';
            badge.style.justifyContent = 'center';
            badge.style.border = '2px solid white';
            badge.title = events[dateKey].map(e => `${e.time} ${e.name}`).join('\n');
            
            dayCell.style.position = 'relative';
            dayCell.appendChild(badge);
        } else {
            logger.log(`  Day ${cellDate.getDate()} (${dateKey}) has no events`);
        }
    });
    logger.log('=== updateCalendarWithEvents complete ===');
}
