import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Video,
  ShieldAlert,
  Calendar,
  Sparkles,
  Info,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Course, CourseEvent } from '../types.ts';
import {
  calculateCourseAttendance,
  recordPortalCourseJoin,
  CourseAttendanceSummary,
} from '../lib/courseAttendance.ts';

interface CourseAttendanceSectionProps {
  studentId: string | number;
  studentName?: string;
  courses: Course[];
  events: CourseEvent[];
  selectedTimezone?: string;
  onJoinZoomMeeting?: (event: CourseEvent | null, course: Course) => void;
  onBrowseCourses?: () => void;
}

export const CourseAttendanceSection: React.FC<CourseAttendanceSectionProps> = ({
  studentId,
  studentName = 'Scholar',
  courses,
  events,
  selectedTimezone,
  onJoinZoomMeeting,
  onBrowseCourses,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    courses[0]?.id || null
  );
  const [autoJoinedNotice, setAutoJoinedNotice] = useState<string | null>(null);

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl academy-surface p-6 sm:p-8 border border-teal-500/30 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-teal-400/10 text-teal-300 flex items-center justify-center mx-auto">
          <Calendar className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-lg font-bold text-white">
            Automated Course Attendance System
          </h3>
          <p className="text-xs academy-text-secondary max-w-lg mx-auto">
            You are not currently enrolled in any academic programs. Enroll in a course to activate automated class attendance tracking.
          </p>
        </div>
        {onBrowseCourses && (
          <button
            type="button"
            onClick={onBrowseCourses}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors shadow-md"
          >
            Explore Courses to Enroll
          </button>
        )}
      </div>
    );
  }

  const summaries: CourseAttendanceSummary[] = courses.map((course) =>
    calculateCourseAttendance(studentId, course, events, selectedTimezone)
  );

  const activeSummary =
    summaries.find((s) => s.courseId === selectedCourseId) || summaries[0];
  const activeCourse = courses.find((c) => c.id === activeSummary?.courseId) || courses[0];

  const handleLaunchAndAutoAttend = (ev?: CourseEvent) => {
    // Record automated attendance for today
    recordPortalCourseJoin(
      studentId,
      activeCourse.id,
      activeCourse.classStartTime || '14:00',
      activeCourse.classTimezone || 'America/New_York'
    );
    setAutoJoinedNotice(
      `Attendance verified for ${activeCourse.title}! You joined on time via the portal.`
    );
    setTimeout(() => setAutoJoinedNotice(null), 5000);

    if (onJoinZoomMeeting) {
      onJoinZoomMeeting(ev || null, activeCourse);
    }
  };

  return (
    <div className="rounded-2xl academy-surface border border-teal-500/30 shadow-2xl p-6 lg:p-7 space-y-6 bg-gradient-to-br from-[#061224] via-[#091B33] to-[#061224]">
      {/* SECTION HEADER: Automated System Contract */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b academy-divider">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Automated Course Attendance Tracking · No Self-Marking
            </span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            Course Attendance &amp; Class Day Logs
          </h2>
          <p className="text-xs academy-text-secondary max-w-3xl">
            Attendance is automatically recorded when you enter your class from the portal on time or within 10 minutes of class start. If you do not join within 10 minutes after scheduled time, that day for that course is marked red (missed).
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono-tabular shrink-0 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Present (On Time)</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Missed (&gt;10 min late / absent)</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Class Today</span>
          </div>
        </div>
      </div>

      {/* Auto-attend Toast Notification */}
      {autoJoinedNotice && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{autoJoinedNotice}</span>
        </div>
      )}

      {/* Course Selector Tabs (If enrolled in multiple courses) */}
      {courses.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {courses.map((c) => {
            const summary = summaries.find((s) => s.courseId === c.id);
            const isSelected = selectedCourseId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCourseId(c.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-400 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                    : 'academy-elevated text-slate-300 hover:text-white hover:border-teal-500/40'
                }`}
              >
                <span>{c.title}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold ${
                    isSelected
                      ? 'bg-slate-950/20 text-slate-950'
                      : (summary?.attendancePercentage || 0) >= 80
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {summary?.attendancePercentage}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Course Attendance Card */}
      {activeSummary && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#040D1A] border border-slate-800 space-y-6">
          {/* Top Tier: Course Name, Teacher, Attendance Gauge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs text-teal-400 font-medium">
                Faculty: {activeSummary.instructorName}
              </span>
              <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                {activeSummary.courseTitle}
              </h3>
              <p className="text-xs text-slate-400">
                Scheduled:{' '}
                <strong className="text-slate-200">
                  {activeCourse.classDays || 'Saturday & Tuesday'} at{' '}
                  {activeCourse.classStartTime || '14:00'} ({activeCourse.classTimezone || 'EST'})
                </strong>
              </p>
            </div>

            {/* Attendance Percentage Badge & Stats */}
            <div className="flex items-center gap-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="text-right space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  On-Time Attendance
                </div>
                <div className="text-xs text-slate-300 font-mono-tabular">
                  <strong className="text-emerald-400">{activeSummary.attendedSessions}</strong>/
                  {activeSummary.totalHeldSessions} Held Sessions
                </div>
                {activeSummary.missedSessions > 0 && (
                  <div className="text-[10px] text-rose-400 font-mono-tabular">
                    {activeSummary.missedSessions} Missed (&gt;10m)
                  </div>
                )}
              </div>

              <div
                className={`flex items-center justify-center w-14 h-14 rounded-xl font-display text-xl font-black font-mono-tabular border ${
                  activeSummary.attendancePercentage >= 80
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                }`}
              >
                {activeSummary.attendancePercentage}%
              </div>
            </div>
          </div>

          {/* Visual Day-by-Day Timeline Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Session-by-Session Attendance Record</span>
              <span className="text-[11px] text-slate-500 font-mono-tabular">
                Automated Verification
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {activeSummary.sessions.map((sess, sIdx) => {
                const isPresent = sess.status === 'present';
                const isAbsent = sess.status === 'absent' || sess.status === 'late';
                const isInProgress = sess.status === 'in_progress';
                const isFuture = sess.status === 'future';

                return (
                  <div
                    key={sIdx}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2 ${
                      isPresent
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                        : isAbsent
                        ? 'bg-rose-950/20 border-rose-500/50 text-rose-300'
                        : isInProgress
                        ? 'bg-amber-950/25 border-amber-400/60 text-amber-200 shadow-md ring-1 ring-amber-400/30'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono-tabular font-bold">
                        {sess.formattedDate}
                      </span>
                      {isPresent && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {isAbsent && (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      {isInProgress && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      )}
                      {isFuture && (
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold line-clamp-1">
                        {sess.sessionTitle}
                      </div>
                      <div className="text-[10px] font-mono-tabular">
                        {isPresent ? (
                          <span className="text-emerald-400 font-bold">
                            Present ✓ {sess.joinedAt ? `(${sess.joinedAt})` : ''}
                          </span>
                        ) : isAbsent ? (
                          <span className="text-rose-400 font-bold">
                            Missed (Past 10m)
                          </span>
                        ) : isInProgress ? (
                          <span className="text-amber-300 font-bold">
                            Active Class Today
                          </span>
                        ) : (
                          <span className="text-slate-500">Scheduled</span>
                        )}
                      </div>
                    </div>

                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => handleLaunchAndAutoAttend(sess.event)}
                        className="w-full mt-1 py-1.5 px-2 rounded-lg text-[10px] font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors shadow flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Join &amp; Auto-Attend</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Join Banner if Session is Today */}
          {activeSummary.hasUpcomingToday && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-teal-500/10 to-transparent border border-amber-400/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <div className="text-xs">
                  <strong className="text-white block">
                    Today's Class Session is Ready to Join!
                  </strong>
                  <span className="text-amber-200">
                    Joining now will automatically log your on-time attendance in the portal database.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleLaunchAndAutoAttend()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-teal-400 text-slate-950 hover:brightness-110 shadow-lg transition-all cursor-pointer"
              >
                <Video className="w-4 h-4 fill-current" />
                <span>Enter Live Class (Auto-Attend)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
