export type SeatingRoom = {
  dateISO: string;
  courseCode: string;
  startMinute: number;
  endMinute: number;
  venue: string;
};

export function examDateISO(value: string): string | null {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(20\d{2})$/);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function clockMinutes(hourText: string, minuteText: string, meridiem: string): number | null {
  let hour = Number(hourText);
  const minute = Number(minuteText);
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  hour %= 12;
  if (meridiem === 'PM') hour += 12;
  return hour * 60 + minute;
}

/** Parse exam-card time labels, including the shared AM/PM suffix format. */
export function examTimeRange(value: string): { startMinute: number; endMinute: number } | null {
  const match = value.match(/^\s*(\d{1,2}):(\d{2})(?:\s*(AM|PM))?\s*(?:-|–|—|to)\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i);
  if (!match) return null;
  const [, startHour, startMinuteText, explicitStartMeridiem, endHour, endMinuteText, explicitEndMeridiem] = match;
  const endMeridiem = explicitEndMeridiem?.toUpperCase() ?? explicitStartMeridiem?.toUpperCase();
  const startHourNumber = Number(startHour);
  const endHourNumber = Number(endHour);
  let startMeridiem = explicitStartMeridiem?.toUpperCase() ?? endMeridiem;
  const endMinute = clockMinutes(endHour, endMinuteText, endMeridiem ?? 'AM');
  if (!explicitStartMeridiem && explicitEndMeridiem?.toUpperCase() === 'PM' && endHourNumber === 12 && startHourNumber < 12) {
    startMeridiem = 'AM';
  } else if (!explicitStartMeridiem && explicitEndMeridiem?.toUpperCase() === 'AM' && startHourNumber > endHourNumber) {
    startMeridiem = 'PM';
  }
  const startMinute = clockMinutes(startHour, startMinuteText, startMeridiem ?? 'AM');
  if (startMinute == null || endMinute == null || endMinute <= startMinute) return null;
  return { startMinute, endMinute };
}

export function seatingRoomKey(dateISO: string, courseCode: string, startMinute: number, endMinute: number): string {
  return `${dateISO}|${courseCode.toUpperCase()}|${startMinute}|${endMinute}`;
}

export function buildSeatingRoomIndex(rows: SeatingRoom[]): Map<string, string[]> {
  const collected = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = seatingRoomKey(row.dateISO, row.courseCode, row.startMinute, row.endMinute);
    const venues = collected.get(key) ?? new Set<string>();
    venues.add(row.venue.trim());
    collected.set(key, venues);
  }
  return new Map([...collected.entries()].map(([key, venues]) => [
    key,
    [...venues].sort((a, b) => a.localeCompare(b)),
  ]));
}
