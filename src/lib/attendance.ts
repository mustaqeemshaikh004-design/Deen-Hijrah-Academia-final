/**
 * Attendance & Daily Engagement Streak Tracking
 * Persists consecutive days of study, calculates current/longest streaks,
 * and tracks spiritual study milestones.
 */

export interface AttendanceMilestone {
  id: string;
  days: number;
  title: string;
  arabicTitle: string;
  description: string;
  iconName: string;
}

export const ATTENDANCE_MILESTONES: AttendanceMilestone[] = [
  {
    id: 'streak-3',
    days: 3,
    title: '3-Day Seeker',
    arabicTitle: 'طالب العلم',
    description: 'Beginning the rhythm of daily contemplation and sacred study.',
    iconName: 'Flame',
  },
  {
    id: 'streak-7',
    days: 7,
    title: '7-Day Steadfast',
    arabicTitle: 'الاستقامة',
    description: 'Completed a full week of uninterrupted scholarly discipline.',
    iconName: 'Sparkles',
  },
  {
    id: 'streak-14',
    days: 14,
    title: '14-Day Diligent',
    arabicTitle: 'المتقن',
    description: 'Two continuous weeks cultivating sacred knowledge with precision.',
    iconName: 'Award',
  },
  {
    id: 'streak-30',
    days: 30,
    title: '30-Day Devotion',
    arabicTitle: 'رياضة النفس',
    description: 'A month of unbroken attendance mirroring classical madrasah rigor.',
    iconName: 'ShieldCheck',
  },
  {
    id: 'streak-40',
    days: 40,
    title: "40-Day Arba'in Commendation",
    arabicTitle: 'الأربعين المباركة',
    description: 'Honoring the prophetic 40-day dedication tradition with unwavering resolve.',
    iconName: 'Star',
  },
];

export interface StudentAttendanceData {
  studentId: string | number;
  dates: string[]; // YYYY-MM-DD
  currentStreak: number;
  longestStreak: number;
  lastVisitDate: string; // YYYY-MM-DD
  totalDays: number;
  hasCheckedInToday: boolean;
  unlockedMilestoneIds: string[];
}

/**
 * Returns today's date formatted as YYYY-MM-DD according to local/selected timezone
 */
export function getLocalDateString(targetTimezone?: string): string {
  try {
    const tz = targetTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Outputs YYYY-MM-DD
  } catch {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Adds or subtracts days to a YYYY-MM-DD string
 */
export function offsetDateString(dateStr: string, offsetDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  const nextY = date.getUTCFullYear();
  const nextM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextD = String(date.getUTCDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

const STORAGE_PREFIX = 'deen_hijrah_attendance_';

/**
 * Loads attendance data from localStorage for a given student ID
 */
export function loadAttendanceData(
  studentId: string | number,
  targetTimezone?: string
): StudentAttendanceData {
  const today = getLocalDateString(targetTimezone);
  const yesterday = offsetDateString(today, -1);
  const storageKey = `${STORAGE_PREFIX}${studentId}`;

  let stored: {
    dates?: string[];
    longestStreak?: number;
  } | null = null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      stored = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse stored attendance:', e);
  }

  // If no previous record exists, seed initial demo history for an engaging start
  let dates: string[] = stored?.dates || [];
  if (dates.length === 0) {
    // Seed the previous 3 consecutive days for demo students so they start with an active 3-day streak
    const d3 = offsetDateString(today, -3);
    const d2 = offsetDateString(today, -2);
    const d1 = offsetDateString(today, -1);
    dates = [d3, d2, d1, today];
  }

  // Ensure unique & sorted dates
  dates = Array.from(new Set(dates)).sort();

  const hasCheckedInToday = dates.includes(today);
  const lastVisitDate = dates[dates.length - 1] || '';

  // Calculate current streak backwards from today or yesterday
  let currentStreak = 0;
  let checkDate = hasCheckedInToday ? today : yesterday;

  while (dates.includes(checkDate)) {
    currentStreak += 1;
    checkDate = offsetDateString(checkDate, -1);
  }

  // If user didn't check in today and last visit wasn't yesterday, streak was broken
  if (!hasCheckedInToday && lastVisitDate !== yesterday) {
    currentStreak = 0;
  }

  const previousLongest = stored?.longestStreak || 0;
  const longestStreak = Math.max(previousLongest, currentStreak);

  // Determine unlocked milestones
  const unlockedMilestoneIds = ATTENDANCE_MILESTONES.filter(
    (m) => currentStreak >= m.days || longestStreak >= m.days
  ).map((m) => m.id);

  const result: StudentAttendanceData = {
    studentId,
    dates,
    currentStreak,
    longestStreak,
    lastVisitDate,
    totalDays: dates.length,
    hasCheckedInToday,
    unlockedMilestoneIds,
  };

  // Save back normalized record
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        dates,
        longestStreak,
        lastUpdated: today,
      })
    );
  } catch {}

  return result;
}

/**
 * Registers today's attendance check-in
 */
export function recordAttendanceCheckIn(
  studentId: string | number,
  targetTimezone?: string
): StudentAttendanceData {
  const today = getLocalDateString(targetTimezone);
  const storageKey = `${STORAGE_PREFIX}${studentId}`;

  let currentData = loadAttendanceData(studentId, targetTimezone);
  if (!currentData.dates.includes(today)) {
    const updatedDates = Array.from(new Set([...currentData.dates, today])).sort();
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          dates: updatedDates,
          longestStreak: Math.max(currentData.longestStreak, currentData.currentStreak + 1),
          lastUpdated: today,
        })
      );
    } catch {}
    currentData = loadAttendanceData(studentId, targetTimezone);
  }

  return currentData;
}
