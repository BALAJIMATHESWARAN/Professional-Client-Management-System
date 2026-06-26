import React, { useState, useMemo } from 'react';

interface CalendarWidgetProps {
  value: Date;
  onChange: (date: Date) => void;
  holidays: Array<{ date: string; name: string; localName: string }>;
  accentColor: string;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  value,
  onChange,
  holidays,
  accentColor,
}) => {
  const [viewDate, setViewDate] = useState(new Date(value.getFullYear(), value.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper: Format Date to YYYY-MM-DD
  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Get total days in month
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  // Get weekday of first day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const getFirstDayOfMonth = (y: number, m: number) => {
    return new Date(y, m, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Generate 42 cells for 7x6 calendar grid
  const days = useMemo(() => {
    const arr: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Trailing days of previous month
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);
    for (let i = firstDay - 1; i >= 0; i--) {
      arr.push({
        date: new Date(prevMonthYear, prevMonth, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Leading days of next month (fill the grid to 42 cells)
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const remainingCells = 42 - arr.length;
    for (let i = 1; i <= remainingCells; i++) {
      arr.push({
        date: new Date(nextMonthYear, nextMonth, i),
        isCurrentMonth: false,
      });
    }

    return arr;
  }, [year, month, firstDay, daysInMonth]);

  // Map of date string to holiday name
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach(h => {
      map.set(h.date, h.name || h.localName);
    });
    return map;
  }, [holidays]);



  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(date);
    // Keep calendar showing in view if month didn't change
    if (date.getMonth() !== month || date.getFullYear() !== year) {
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === value.getDate() &&
      date.getMonth() === value.getMonth() &&
      date.getFullYear() === value.getFullYear();
  };

  return (
    <div className="pcms-calendar" onClick={(e) => e.stopPropagation()}>
      {/* Header controls */}
      <div className="pcms-calendar-header">
        <button 
          type="button"
          onClick={handlePrevMonth}
          className="pcms-calendar-nav-btn"
          title="Previous Month"
        >
          ‹
        </button>
        <span className="pcms-calendar-month-title">
          {monthNames[month]} {year}
        </span>
        <button 
          type="button"
          onClick={handleNextMonth}
          className="pcms-calendar-nav-btn"
          title="Next Month"
        >
          ›
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="pcms-calendar-weekdays">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Day Cells Grid */}
      <div className="pcms-calendar-grid">
        {days.map(({ date, isCurrentMonth }, idx) => {
          const dateStr = formatDateStr(date);
          const holidayName = holidayMap.get(dateStr);
          const active = isSelected(date);
          const current = isToday(date);

          return (
            <button
              key={`${dateStr}-${idx}`}
              type="button"
              className={`pcms-calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${active ? 'selected' : ''} ${current ? 'today' : ''}`}
              style={{
                '--calendar-day-accent': accentColor,
              } as React.CSSProperties}
              onClick={(e) => handleDayClick(date, e)}
              title={holidayName ? `${holidayName}${current ? ' (Today)' : ''}` : current ? 'Today' : undefined}
            >
              <span className="day-number">{date.getDate()}</span>
              {holidayName && <span className="pcms-calendar-holiday-dot" />}
            </button>
          );
        })}
      </div>


    </div>
  );
};
