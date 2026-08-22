const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const MAX_SLOTS = 60;

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const parseIsoDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const formatIsoDate = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getWeekdayName = (isoDate) => {
  return WEEKDAYS[parseIsoDate(isoDate).getDay()];
};

export const expandDateRange = (startIso, endIso, weekdays) => {
  if (!startIso || !endIso) return [];
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (start > end) return [];

  // Same from/to = schedule that one day regardless of weekday filter
  if (startIso === endIso) {
    return [startIso];
  }

  const allowed = weekdays && weekdays.length > 0
    ? new Set(weekdays)
    : new Set(WEEKDAYS);

  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = formatIsoDate(cursor);
    if (allowed.has(getWeekdayName(iso))) {
      dates.push(iso);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

export const getDateRangeHint = (startIso, endIso, weekdays, selectedCount) => {
  if (selectedCount > 0 || !startIso || !endIso) return null;
  if (startIso === endIso) return null;

  const dayName = getWeekdayName(startIso);
  if (weekdays?.length > 0 && !weekdays.includes(dayName)) {
    return `${startIso} is a ${dayName} — not included in your weekday filter.`;
  }
  return 'No dates in this range match the selected weekdays.';
};

export const normalizeTimeForApi = (time) => {
  if (!time) return time;
  return time.length === 5 ? `${time}:00` : time;
};

export const buildSlots = (dates, timeRows) => {
  const uniqueDates = [...new Set(dates)].sort();
  const slots = [];

  for (const date of uniqueDates) {
    for (const row of timeRows) {
      if (!row.startTime || !row.endTime) continue;
      slots.push({
        date,
        startTime: normalizeTimeForApi(row.startTime),
        endTime: normalizeTimeForApi(row.endTime),
      });
    }
  }

  return slots;
};

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const shiftsOverlap = (a, b) => {
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
};

const MIN_GAP_MINUTES = 30;

export const detectSlotOverlaps = (slots) => {
  if (!slots.length) {
    return { valid: false, message: 'Add at least one schedule slot.' };
  }

  if (slots.length > MAX_SLOTS) {
    return { valid: false, message: `Maximum ${MAX_SLOTS} slots per batch.` };
  }

  for (const slot of slots) {
    const start = slot.startTime.slice(0, 5);
    const end = slot.endTime.slice(0, 5);
    if (start >= end) {
      return {
        valid: false,
        message: `${slot.date}: end time must be after start time (${start}–${end}).`,
      };
    }
  }

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (a.date !== b.date) continue;
      if (shiftsOverlap(
        { startTime: a.startTime.slice(0, 5), endTime: a.endTime.slice(0, 5) },
        { startTime: b.startTime.slice(0, 5), endTime: b.endTime.slice(0, 5) }
      )) {
        return {
          valid: false,
          message: `Overlapping slots on ${a.date}: ${a.startTime.slice(0, 5)}–${a.endTime.slice(0, 5)} and ${b.startTime.slice(0, 5)}–${b.endTime.slice(0, 5)}.`,
        };
      }
      const aStart = timeToMinutes(a.startTime.slice(0, 5));
      const aEnd = timeToMinutes(a.endTime.slice(0, 5));
      const bStart = timeToMinutes(b.startTime.slice(0, 5));
      const bEnd = timeToMinutes(b.endTime.slice(0, 5));
      if (aStart >= bEnd && aStart - bEnd < MIN_GAP_MINUTES) {
        return { valid: false, message: `Insufficient gap between slots on ${a.date} (minimum 30 minutes).` };
      }
      if (bStart >= aEnd && bStart - aEnd < MIN_GAP_MINUTES) {
        return { valid: false, message: `Insufficient gap between slots on ${a.date} (minimum 30 minutes).` };
      }
    }
  }

  return { valid: true };
};

export const formatTimeDisplay = (t) => (t ? String(t).slice(0, 5) : '');

export const DEFAULT_TIME_ROWS = [{ id: 1, startTime: '09:00', endTime: '11:00' }];

export const DEFAULT_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
