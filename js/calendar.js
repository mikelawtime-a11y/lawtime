// Calendar functionality - Shows 4 weeks centered on today (2 weeks before, 2 weeks after)

function generateCalendar() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate date range: 2 weeks before to 2 weeks after today
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 14);
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 14);
    
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
    
    // Add day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarEl.appendChild(dayHeader);
    });
    
    // Find the Sunday before startDate to align the grid properly
    const gridStartDate = new Date(startDate);
    const dayOfWeek = startDate.getDay();
    gridStartDate.setDate(startDate.getDate() - dayOfWeek);
    
    // Generate calendar grid (up to 5 weeks to cover the range)
    const currentDate = new Date(gridStartDate);
    for (let i = 0; i < 35; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        // Check if this date is within our range
        if (currentDate >= startDate && currentDate <= endDate) {
            dayCell.textContent = currentDate.getDate();
            
            // Highlight today
            if (currentDate.getTime() === today.getTime()) {
                dayCell.classList.add('today');
            }
            
            // Show different styling for different months
            if (currentDate.getMonth() !== today.getMonth()) {
                dayCell.classList.add('other-month');
            }
        } else {
            dayCell.classList.add('empty');
        }
        
        calendarEl.appendChild(dayCell);
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// Initialize calendar when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', generateCalendar);
} else {
    generateCalendar();
}
