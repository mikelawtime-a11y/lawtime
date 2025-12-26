// Calendar functionality - Shows 5 weeks: current week + 2 weeks before + 2 weeks after

function generateCalendar() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find the Sunday of the current week
    const currentWeekSunday = new Date(today);
    currentWeekSunday.setDate(today.getDate() - today.getDay());
    
    // Start from Sunday of 2 weeks before current week
    const startDate = new Date(currentWeekSunday);
    startDate.setDate(currentWeekSunday.getDate() - 14);
    
    // End at Saturday of 2 weeks after current week
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 34); // 35 days total (5 weeks)
    
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
    
    // Generate exactly 5 weeks (35 days) starting from startDate
    const currentDate = new Date(startDate);
    for (let i = 0; i < 35; i++) {
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
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// Initialize calendar when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', generateCalendar);
} else {
    generateCalendar();
}
