/**
 * Calendar Link Generator
 *
 * Generates calendar links (iCal format and web calendar URLs) for events.
 */

export interface CalendarEvent {
  title: string;
  description: string;
  location?: string;
  startTime: Date;
  endTime?: Date;
  url: string;
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDateForGoogle(event.startTime)}/${formatDateForGoogle(event.endTime || addHours(event.startTime, 2))}`,
    details: event.description,
    location: event.location || '',
    sf: 'true',
    output: 'xml',
  });

  if (event.url) {
    params.append('add', event.url);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    subject: event.title,
    startdt: event.startTime.toISOString(),
    enddt: (event.endTime || addHours(event.startTime, 2)).toISOString(),
    body: event.description,
    location: event.location || '',
    path: '/calendar/action/compose',
    rru: 'addevent',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate iCal file content
 */
export function generateICalContent(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escape = (text: string): string => {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  };

  const start = formatDate(event.startTime);
  const end = formatDate(event.endTime || addHours(event.startTime, 2));

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FieldView.Live//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.startTime.getTime()}@fieldview.live`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    event.location ? `LOCATION:${escape(event.location)}` : '',
    `URL:${event.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter((line) => line !== '')
    .join('\r\n');
}

function formatDateForGoogle(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}


