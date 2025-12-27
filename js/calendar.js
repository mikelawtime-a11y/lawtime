// Calendar functionality - Shows 4 weeks: 1 week past + current week + 2 weeks future

function generateCalendar() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find the Sunday of the current week
    const currentWeekSunday = new Date(today);
    currentWeekSunday.setDate(today.getDate() - today.getDay());
    
    // Start from Sunday of 1 week before current week
    const startDate = new Date(currentWeekSunday);
    startDate.setDate(currentWeekSunday.getDate() - 7);
    
    // End at Saturday of 2 weeks after current week
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 27); // 28 days total (4 weeks)
    
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
    
    // Generate exactly 4 weeks (28 days) starting from startDate, but only show weekdays
    const currentDate = new Date(startDate);
    for (let i = 0; i < 28; i++) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Skip weekends (Sunday = 0, Saturday = 6)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            dayCell.textContent = currentDate.getDate();
            
            // Highlight today
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
