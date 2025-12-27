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
