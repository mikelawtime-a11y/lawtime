// Calendar functionality - Shows 3 weeks: 1 week past + current week + 1 week future

function generateCalendar() {
    const now = new Date();
    // TESTING: Hardcoded to Friday, December 26, 2025
    const today = new Date(2025, 11, 26); // Month is 0-indexed, so 11 = December
    // const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find the Sunday of the current week
    const currentWeekSunday = new Date(today);
    currentWeekSunday.setDate(today.getDate() - today.getDay());
    
    // Start from Sunday of 1 week before current week
    const startDate = new Date(currentWeekSunday);
    startDate.setDate(currentWeekSunday.getDate() - 7);
    
    // End at Saturday of 1 week after current week
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 20); // 21 days total (3 weeks)
    
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
    
    // Calculate current week range (Monday to Friday)
    const currentWeekStart = new Date(today);
    const daysSinceMonday = (today.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    currentWeekStart.setDate(today.getDate() - daysSinceMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 4); // Friday
    currentWeekEnd.setHours(23, 59, 59, 999);
    
    // Generate exactly 3 weeks (21 days) starting from startDate, but only show weekdays
    const currentDate = new Date(startDate);
    for (let i = 0; i < 21; i++) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Skip weekends (Sunday = 0, Saturday = 6)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
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
    console.log('=== populateWeeklySchedule called ===');
    // TESTING: Hardcoded to Friday, December 26, 2025
    const today = new Date(2025, 11, 26); // Month is 0-indexed, so 11 = December
    
    // Calculate current week range (Monday to Friday)
    const currentWeekStart = new Date(today);
    const daysSinceMonday = (today.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    currentWeekStart.setDate(today.getDate() - daysSinceMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const events = AppState.getEvents();
    console.log('Events loaded:', events);
    console.log('Current week starts:', currentWeekStart.toISOString());
    
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
        console.log(`Checking date: ${dateKey}, Day offset: ${dayOffset}`);
        
        if (events[dateKey] && events[dateKey].length > 0) {
            console.log(`  Found ${events[dateKey].length} events for ${dateKey}:`, events[dateKey]);
            
            // Group events by time slot
            const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
            
            events[dateKey].forEach((event, idx) => {
                console.log(`    Event ${idx}: ${event.time} - ${event.name}`);
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
                
                console.log(`      Event hour: ${eventHour}, assigned to slot: ${slotIndex}`);
                
                if (slotIndex >= 0) {
                    // Calculate cell index: slotIndex * 5 (schedule cells per row) + dayOffset
                    const cellIndex = slotIndex * 5 + dayOffset;
                    const cell = cells[cellIndex];
                    console.log(`      Cell index: ${cellIndex}`);
                    
                    if (cell) {
                        const eventDiv = document.createElement('div');
                        eventDiv.textContent = `${event.time} ${event.name}`;
                        eventDiv.style.marginBottom = '2px';
                        eventDiv.style.whiteSpace = 'normal';
                        eventDiv.style.wordBreak = 'break-word';
                        eventDiv.style.backgroundColor = '#e3f2fd';
                        eventDiv.style.padding = '2px 4px';
                        eventDiv.style.borderRadius = '3px';
                        eventDiv.style.borderLeft = '3px solid #2196F3';
                        eventDiv.style.fontSize = '0.7rem';
                        cell.appendChild(eventDiv);
                        console.log(`      ✓ Added event to cell`);
                    } else {
                        console.log(`      ✗ Cell not found`);
                    }
                } else {
                    console.log(`      ✗ No slot assigned`);
                }
            });
        } else {
            console.log(`  No events for ${dateKey}`);
        }
    }
    console.log('=== populateWeeklySchedule complete ===');
}

// Add event indicators to calendar days
function updateCalendarWithEvents() {
    console.log('=== updateCalendarWithEvents called ===');
    const events = AppState.getEvents();
    console.log('Events:', events);
    const calendarDays = document.querySelectorAll('.calendar-day');
    
    calendarDays.forEach(dayCell => {
        const dayNumber = parseInt(dayCell.textContent);
        
        // Find which month this day belongs to
        const isOtherMonth = dayCell.classList.contains('other-month');
        const today = new Date(2025, 11, 26); // TESTING: hardcoded
        
        // Reconstruct the date for this cell
        const cellMonth = isOtherMonth ? 
            (dayNumber > 15 ? today.getMonth() - 1 : today.getMonth() + 1) : 
            today.getMonth();
        const cellYear = today.getFullYear();
        
        const dateKey = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        
        if (events[dateKey] && events[dateKey].length > 0) {
            console.log(`  Day ${dayNumber} (${dateKey}) has ${events[dateKey].length} events:`, events[dateKey]);
            
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
            console.log(`  Day ${dayNumber} (${dateKey}) has no events`);
        }
    });
    console.log('=== updateCalendarWithEvents complete ===');
}
