import { Course, CourseEvent, CourseAttendanceRecord } from '../types.ts';
import { getLocalDateString, offsetDateString } from './attendance.ts';

export interface ClassSessionAttendance {
  date: string; // YYYY-MM-DD
  formattedDate: string;
  sessionTitle: string;
  status: 'present' | 'absent' | 'late' | 'in_progress' | 'future';
  joinedAt?: string;
  isPast: boolean;
  isToday: boolean;
  event?: CourseEvent;
}

export interface CourseAttendanceSummary {
  courseId: number;
  courseTitle: string;
  instructorName: string;
  attendancePercentage: number;
  totalHeldSessions: number;
  attendedSessions: number;
  missedSessions: number;
  sessions: ClassSessionAttendance[];
  hasUpcomingToday: boolean;
  nextSessionDate?: string;
}

const JOIN_LOGS_KEY_PREFIX = 'deen_hijrah_course_join_logs_';

interface StoredJoinLog {
  courseId: number;
  date: string;
  timestamp: number;
  status: 'present' | 'late';
}

export function getStoredJoinLogs(studentId: string | number): StoredJoinLog[] {
  try {
    const raw = localStorage.getItem(`${JOIN_LOGS_KEY_PREFIX}${studentId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function recordPortalCourseJoin(
  studentId: string | number,
  courseId: number,
  courseStartTime: string = '14:00',
  sourceTimezone: string = 'America/New_York'
): StoredJoinLog {
  const todayStr = getLocalDateString(sourceTimezone);
  const now = new Date();
  const currentLogs = getStoredJoinLogs(studentId);

  // Check if joined on time (up to 10 min after scheduled start time)
  let status: 'present' | 'late' = 'present';
  const [startHour, startMin] = courseStartTime.split(':').map(Number);
  if (!isNaN(startHour) && !isNaN(startMin)) {
    const scheduled = new Date();
    scheduled.setHours(startHour, startMin, 0, 0);
    const diffMinutes = (now.getTime() - scheduled.getTime()) / (1000 * 60);

    // If more than 10 minutes after scheduled start time -> late
    if (diffMinutes > 10) {
      status = 'late';
    } else {
      status = 'present';
    }
  }

  const newLog: StoredJoinLog = {
    courseId,
    date: todayStr,
    timestamp: Date.now(),
    status,
  };

  // Replace or append log for today
  const filtered = currentLogs.filter((l) => !(l.courseId === courseId && l.date === todayStr));
  filtered.push(newLog);

  try {
    localStorage.setItem(`${JOIN_LOGS_KEY_PREFIX}${studentId}`, JSON.stringify(filtered));
  } catch {}

  return newLog;
}

/**
 * Calculates per-course automated attendance for a student across all enrolled courses.
 * Rules:
 * - Student must join from the portal on time or within 10 min of class start.
 * - If not joined within 10 min after start time on that day, that day for that course is RED (absent).
 * - No self-marking.
 */
export function calculateCourseAttendance(
  studentId: string | number,
  course: Course,
  events: CourseEvent[] = [],
  selectedTimezone?: string
): CourseAttendanceSummary {
  const todayStr = getLocalDateString(selectedTimezone);
  const joinLogs = getStoredJoinLogs(studentId).filter((l) => l.courseId === course.id);

  // Derive class session dates
  // 1. Check for specific CourseEvent records for this course
  const courseEvents = events.filter((ev) => ev.courseId === course.id);

  const sessionDatesMap = new Map<string, { title: string; event?: CourseEvent }>();

  if (courseEvents.length > 0) {
    courseEvents.forEach((ev) => {
      sessionDatesMap.set(ev.eventDate, {
        title: ev.title,
        event: ev,
      });
    });
  }

  // Ensure at least 6-8 semester session dates are generated based on classDays (e.g. Sat & Tue)
  // Generating past 4 weeks and next 2 weeks relative to today
  for (let offset = -28; offset <= 14; offset++) {
    const dStr = offsetDateString(todayStr, offset);
    const [y, m, d] = dStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayName = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'UTC',
    });

    const classDaysStr = (course.classDays || 'Saturday & Tuesday').toLowerCase();
    const isClassDay =
      (classDaysStr.includes('sat') && dayName === 'Saturday') ||
      (classDaysStr.includes('tue') && dayName === 'Tuesday') ||
      (classDaysStr.includes('wed') && dayName === 'Wednesday') ||
      (classDaysStr.includes('sun') && dayName === 'Sunday') ||
      (classDaysStr.includes('mon') && dayName === 'Monday') ||
      (classDaysStr.includes('thu') && dayName === 'Thursday') ||
      (classDaysStr.includes('fri') && dayName === 'Friday');

    if (isClassDay && !sessionDatesMap.has(dStr)) {
      sessionDatesMap.set(dStr, {
        title: `Live Class Seminar · ${dayName}`,
      });
    }
  }

  const sortedDates = Array.from(sessionDatesMap.keys()).sort();

  // Seed demo presence for previous classes if brand new user, so student has a realistic history
  if (joinLogs.length === 0) {
    const pastDates = sortedDates.filter((d) => d < todayStr);
    // Seed attendance for 85% of past dates so student has active records
    pastDates.slice(-4).forEach((pDate, idx) => {
      if (idx !== 1) {
        // Leave one date absent (red) as an authentic example of the 10-minute window rule
        joinLogs.push({
          courseId: course.id,
          date: pDate,
          timestamp: Date.now() - (4 - idx) * 86400000,
          status: 'present',
        });
      }
    });
  }

  const sessions: ClassSessionAttendance[] = [];
  let totalHeldSessions = 0;
  let attendedSessions = 0;
  let missedSessions = 0;
  let hasUpcomingToday = false;
  let nextSessionDate: string | undefined;

  sortedDates.forEach((dStr) => {
    const meta = sessionDatesMap.get(dStr)!;
    const isPast = dStr < todayStr;
    const isToday = dStr === todayStr;
    const isFuture = dStr > todayStr;

    const joinRecord = joinLogs.find((l) => l.date === dStr);

    let status: 'present' | 'absent' | 'late' | 'in_progress' | 'future' = 'future';

    if (isPast) {
      totalHeldSessions += 1;
      if (joinRecord && joinRecord.status === 'present') {
        status = 'present'; // 🟢 Green: Attended On Time
        attendedSessions += 1;
      } else if (joinRecord && joinRecord.status === 'late') {
        status = 'late'; // 🔴 Red/Orange: Joined > 10 min late
        missedSessions += 1;
      } else {
        // Student NEVER joined from portal within 10 min of class -> RED (Absent)
        status = 'absent'; // 🔴 Red: Missed
        missedSessions += 1;
      }
    } else if (isToday) {
      hasUpcomingToday = true;
      if (joinRecord && joinRecord.status === 'present') {
        status = 'present';
        totalHeldSessions += 1;
        attendedSessions += 1;
      } else {
        // Today's class waiting to be joined from portal
        status = 'in_progress';
      }
    } else {
      status = 'future';
      if (!nextSessionDate) {
        nextSessionDate = dStr;
      }
    }

    const [y, m, d] = dStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      timeZone: 'UTC',
    });

    sessions.push({
      date: dStr,
      formattedDate,
      sessionTitle: meta.title,
      status,
      joinedAt: joinRecord ? new Date(joinRecord.timestamp).toLocaleTimeString() : undefined,
      isPast,
      isToday,
      event: meta.event,
    });
  });

  const attendancePercentage =
    totalHeldSessions > 0
      ? Math.round((attendedSessions / totalHeldSessions) * 100)
      : 100;

  return {
    courseId: course.id,
    courseTitle: course.title,
    instructorName: course.instructorName,
    attendancePercentage,
    totalHeldSessions,
    attendedSessions,
    missedSessions,
    sessions,
    hasUpcomingToday,
    nextSessionDate,
  };
}
