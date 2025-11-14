// Calendar export utilities for .ics file generation

interface CalendarEvent {
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location?: string;
}

export const generateICSFile = (events: CalendarEvent[]): string => {
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flora Task Manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((event) => {
    // Parse date and time
    const [year, month, day] = event.startDate.split('-');
    const [startHour, startMin] = event.startTime.split(':');
    const [endHour, endMin] = event.endTime.split(':');

    // Format datetime for ICS (YYYYMMDDTHHMMSS)
    const startDateTime = `${year}${month}${day}T${startHour}${startMin}00`;
    const endDateTime = `${year}${month}${day}T${endHour}${endMin}00`;
    
    // Generate UID
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@flora-app`;
    
    // Current timestamp for DTSTAMP
    const now = new Date();
    const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:${escapeICSValue(event.title)}`,
    );

    if (event.description) {
      icsLines.push(`DESCRIPTION:${escapeICSValue(event.description)}`);
    }

    if (event.location) {
      icsLines.push(`LOCATION:${escapeICSValue(event.location)}`);
    }

    icsLines.push('END:VEVENT');
  });

  icsLines.push('END:VCALENDAR');

  return icsLines.join('\r\n');
};

const escapeICSValue = (value: string): string => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

export const downloadICSFile = (icsContent: string, filename: string = 'flora-calendar.ics') => {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
