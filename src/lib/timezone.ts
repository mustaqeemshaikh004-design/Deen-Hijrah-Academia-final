export interface WorldTimezoneOption {
  tz: string;
  label: string;
}

export const WORLD_TIMEZONES: WorldTimezoneOption[] = [
  { tz: 'America/New_York', label: 'New York / Toronto (EST/EDT)' },
  { tz: 'America/Chicago', label: 'Chicago / Houston (CST/CDT)' },
  { tz: 'America/Los_Angeles', label: 'Los Angeles / Vancouver (PST/PDT)' },
  { tz: 'Europe/London', label: 'London / Dublin (GMT/BST)' },
  { tz: 'Europe/Istanbul', label: 'Istanbul (TRT)' },
  { tz: 'Africa/Cairo', label: 'Cairo (EET)' },
  { tz: 'Asia/Riyadh', label: 'Makkah / Riyadh / Doha (AST)' },
  { tz: 'Asia/Dubai', label: 'Dubai / Abu Dhabi (GST)' },
  { tz: 'Asia/Karachi', label: 'Karachi / Islamabad (PKT)' },
  { tz: 'Asia/Kolkata', label: 'Delhi / Mumbai (IST)' },
  { tz: 'Asia/Dhaka', label: 'Dhaka (BST)' },
  { tz: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur / Singapore (MYT/SGT)' },
  { tz: 'Asia/Jakarta', label: 'Jakarta (WIB)' },
  { tz: 'Australia/Sydney', label: 'Sydney / Melbourne (AEST)' },
];

export function getDetectedUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
}

/**
 * Parses a time string like "14:00", "19:00 EST", or "7:30 PM" into 24-hour { hours, minutes }.
 */
export function parseTimeHoursMinutes(rawTime?: string | null): { hours: number; minutes: number } {
  if (!rawTime) return { hours: 14, minutes: 0 };
  const cleaned = rawTime.trim();

  // Check 24h or 12h pattern
  const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return { hours: 14, minutes: 0 };

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return {
    hours: Math.min(23, Math.max(0, hours)),
    minutes: Math.min(59, Math.max(0, minutes)),
  };
}

/**
 * Given a YYYY-MM-DD date string, a start time string (e.g. "14:00"), and a source IANA timezone
 * (the instructor's timezone when scheduling), converts the exact moment into the viewer's target
 * country/region IANA timezone.
 */
export function convertClassTimeToRegion(
  dateStr: string | null | undefined,
  rawTime: string | null | undefined,
  sourceTz: string | null | undefined,
  targetTz?: string
): {
  formattedLocalTime: string;
  formattedLocalDate: string;
  dayShiftLabel: string;
  targetTimezone: string;
  sourceSummary: string;
} {
  const viewerTz = targetTz || getDetectedUserTimezone();
  const originTz = sourceTz || 'America/New_York';
  const { hours, minutes } = parseTimeHoursMinutes(rawTime);

  // Use provided date or today's date
  const today = new Date();
  const baseDateStr =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? dateStr
      : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
          today.getDate()
        ).padStart(2, '0')}`;

  const [y, m, d] = baseDateStr.split('-').map(Number);

  try {
    // Determine offset of originTz at this date/time
    const approxUtc = new Date(Date.UTC(y, m - 1, d, hours, minutes, 0));

    const getTzParts = (instant: Date, tz: string) => {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = dtf.formatToParts(instant);
      const map: Record<string, number> = {};
      parts.forEach((p) => {
        if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
      });
      const hr = map.hour === 24 ? 0 : map.hour;
      return Date.UTC(map.year, (map.month || 1) - 1, map.day || 1, hr || 0, map.minute || 0, 0);
    };

    const originWallUtc = getTzParts(approxUtc, originTz);
    const diffMs = approxUtc.getTime() - originWallUtc;
    const exactInstant = new Date(approxUtc.getTime() + diffMs);

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: viewerTz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });

    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: viewerTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const formattedLocalTime = timeFormatter.format(exactInstant);
    const formattedLocalDate = dateFormatter.format(exactInstant);

    let dayShiftLabel = '';
    if (formattedLocalDate > baseDateStr) dayShiftLabel = ' (+1 day in your region)';
    else if (formattedLocalDate < baseDateStr) dayShiftLabel = ' (-1 day in your region)';

    const sourceTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    return {
      formattedLocalTime,
      formattedLocalDate,
      dayShiftLabel,
      targetTimezone: viewerTz,
      sourceSummary: `${sourceTimeStr} (${originTz.split('/').pop()?.replace('_', ' ')})`,
    };
  } catch {
    return {
      formattedLocalTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      formattedLocalDate: baseDateStr,
      dayShiftLabel: '',
      targetTimezone: viewerTz,
      sourceSummary: `${rawTime || '14:00'} (${originTz})`,
    };
  }
}
