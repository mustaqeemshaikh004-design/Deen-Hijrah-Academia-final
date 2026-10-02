import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Sparkles,
  Award,
  ShieldCheck,
  Star,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  Info,
  Check,
  Zap,
} from 'lucide-react';
import {
  StudentAttendanceData,
  ATTENDANCE_MILESTONES,
  AttendanceMilestone,
  loadAttendanceData,
  recordAttendanceCheckIn,
  getLocalDateString,
  offsetDateString,
} from '../lib/attendance.ts';

interface AttendanceStreakCardProps {
  studentId: string | number;
  studentName?: string;
  selectedTimezone?: string;
  onContinueCoursework?: () => void;
  onStreakMilestoneReached?: (milestone: AttendanceMilestone) => void;
}

export const AttendanceStreakCard: React.FC<AttendanceStreakCardProps> = ({
  studentId,
  studentName = 'Scholar',
  selectedTimezone,
  onContinueCoursework,
}) => {
  const [attendance, setAttendance] = useState<StudentAttendanceData>(() =>
    loadAttendanceData(studentId, selectedTimezone)
  );
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  // Sync / reload attendance whenever studentId or timezone changes
  useEffect(() => {
    const updated = loadAttendanceData(studentId, selectedTimezone);
    setAttendance(updated);
  }, [studentId, selectedTimezone]);

  const todayStr = useMemo(() => getLocalDateString(selectedTimezone), [selectedTimezone]);

  // Rolling 7-day strip (from 6 days ago up to today)
  const rollingDays = useMemo(() => {
    const days: {
      dateStr: string;
      dayLabel: string;
      dateNumber: string;
      isToday: boolean;
      hasAttended: boolean;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const dateStr = offsetDateString(todayStr, -i);
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      const dayLabel = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
      });
      const dateNumber = String(dateObj.getUTCDate());

      days.push({
        dateStr,
        dayLabel,
        dateNumber,
        isToday: dateStr === todayStr,
        hasAttended: attendance.dates.includes(dateStr),
      });
    }
    return days;
  }, [todayStr, attendance.dates]);

  // Next milestone calculation
  const nextMilestone = useMemo(() => {
    return (
      ATTENDANCE_MILESTONES.find((m) => m.days > attendance.currentStreak) ||
      ATTENDANCE_MILESTONES[ATTENDANCE_MILESTONES.length - 1]
    );
  }, [attendance.currentStreak]);

  const daysToNextMilestone = useMemo(() => {
    if (!nextMilestone) return 0;
    return Math.max(0, nextMilestone.days - attendance.currentStreak);
  }, [nextMilestone, attendance.currentStreak]);

  const milestoneProgressPct = useMemo(() => {
    if (!nextMilestone) return 100;
    const prevDays =
      ATTENDANCE_MILESTONES.filter((m) => m.days < nextMilestone.days).pop()?.days || 0;
    const totalSpan = nextMilestone.days - prevDays;
    const progressInSpan = Math.max(0, attendance.currentStreak - prevDays);
    return Math.min(100, Math.round((progressInSpan / totalSpan) * 100));
  }, [nextMilestone, attendance.currentStreak]);

  const handleManualCheckIn = () => {
    const updated = recordAttendanceCheckIn(studentId, selectedTimezone);
    setAttendance(updated);
    setJustCheckedIn(true);
    setTimeout(() => setJustCheckedIn(false), 3000);
  };

  const getMilestoneIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-teal-300" />;
      case 'Award':
        return <Award className="w-4 h-4 text-emerald-400" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-4 h-4 text-cyan-300" />;
      case 'Star':
        return <Star className="w-4 h-4 text-amber-300 fill-amber-300/30" />;
      default:
        return <Award className="w-4 h-4 text-teal-400" />;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl academy-surface border border-teal-500/30 shadow-2xl p-6 lg:p-7 space-y-6">
      {/* Decorative Luminous Geometric Background Accents */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER: Streak Badge + Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b academy-divider">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 via-teal-500/20 to-emerald-500/20 border border-amber-400/40 shadow-inner">
            <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 shadow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                Attendance &amp; Istiqamah Streak
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-tabular font-bold bg-teal-400/15 text-teal-300 border border-teal-500/30">
                {attendance.hasCheckedInToday ? 'Checked In Today ✓' : 'Today Pending'}
              </span>
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              {attendance.currentStreak > 0
                ? `${attendance.currentStreak}-Day Study Streak Active`
                : 'Begin Your Daily Study Rhythm'}
            </h3>
          </div>
        </div>

        {/* Action Controls: Check-In Button & Info */}
        <div className="flex items-center gap-2.5 shrink-0">
          {!attendance.hasCheckedInToday ? (
            <button
              type="button"
              onClick={handleManualCheckIn}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-400 to-teal-400 text-slate-950 hover:brightness-110 shadow-lg transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Record Today's Attendance</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Attended Today ({todayStr})</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowMilestonesModal(!showMilestonesModal)}
            className="p-2 rounded-lg academy-elevated hover:text-teal-300 text-xs text-slate-300 transition-colors"
            title="View Scholarly Attendance Milestones"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Check-In Success Toast Flash */}
      {justCheckedIn && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-300 animate-spin" />
            <span>
              MashaAllah, {studentName}! Today's study session is recorded. Your streak is now{' '}
              <strong>{attendance.currentStreak} consecutive days</strong>.
            </span>
          </div>
          <span className="text-[11px] font-mono-tabular font-bold text-emerald-300">
            +1 Day Recorded
          </span>
        </div>
      )}

      {/* CORE STREAK METRICS + 7-DAY ROLLING STRIP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Big Streak Counter & Record (5 Columns) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl lg:text-5xl font-black text-amber-300 tracking-tight font-mono-tabular drop-shadow">
              {attendance.currentStreak}
            </span>
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-white">
                {attendance.currentStreak === 1 ? 'Consecutive Day' : 'Consecutive Days'}
              </div>
              <div className="text-xs academy-text-secondary">
                Longest Record:{' '}
                <strong className="text-teal-300 font-mono-tabular font-bold">
                  {attendance.longestStreak} Days
                </strong>{' '}
                · Total Study Visits:{' '}
                <strong className="text-white font-mono-tabular font-bold">
                  {attendance.totalDays} Days
                </strong>
              </div>
            </div>
          </div>

          {/* Motivational Prophetic Hadith Callout */}
          <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-300">
              <span>Hadith of Istiqamah (Consistency)</span>
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              &ldquo;The most beloved of deeds to Allah are those that are most consistent, even if
              they are small.&rdquo;
            </p>
            <div className="text-[10px] text-teal-400/80 font-mono-tabular">
              — Sahih al-Bukhari &amp; Muslim
            </div>
          </div>
        </div>

        {/* Right Column: 7-Day Rolling Activity Visual Strip (7 Columns) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>7-Day Activity Rhythm</span>
            </span>
            <span className="text-[11px] academy-text-secondary">
              Past 7 Days Study Access
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {rollingDays.map((day) => {
              return (
                <div
                  key={day.dateStr}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    day.isToday
                      ? day.hasAttended
                        ? 'bg-teal-500/20 border-teal-400 text-teal-200 ring-2 ring-teal-400/40 shadow-lg'
                        : 'bg-amber-500/10 border-amber-400/70 text-amber-200 ring-2 ring-amber-400/30'
                      : day.hasAttended
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60'
                  }`}
                >
                  <span className="text-[11px] font-medium uppercase tracking-wider">
                    {day.dayLabel}
                  </span>
                  <span className="text-sm font-bold font-mono-tabular my-0.5">
                    {day.dateNumber}
                  </span>
                  <div className="mt-1">
                    {day.hasAttended ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div
                        className={`w-3.5 h-3.5 rounded-full border border-dashed ${
                          day.isToday ? 'border-amber-400 animate-pulse' : 'border-slate-700'
                        }`}
                      />
                    )}
                  </div>
                  {day.isToday && (
                    <span className="mt-1 text-[9px] font-bold text-teal-300 uppercase">
                      Today
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Next Milestone Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Next Milestone: <strong>{nextMilestone.title}</strong> ({nextMilestone.arabicTitle})</span>
              </span>
              <span className="text-teal-300 font-mono-tabular text-[11px] font-semibold">
                {daysToNextMilestone === 0
                  ? 'Milestone Reached! 🎉'
                  : `${daysToNextMilestone} more ${daysToNextMilestone === 1 ? 'day' : 'days'}`}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-teal-400 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${milestoneProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MILESTONE BADGES ACCORDION / EXPANDABLE DRAWER */}
      {showMilestonesModal && (
        <div className="pt-4 border-t academy-divider space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Sacred Study Attendance Milestones (Tariq al-Mudaawamah)</span>
            </h4>
            <span className="text-xs text-teal-400 font-mono-tabular">
              {attendance.unlockedMilestoneIds.length} of {ATTENDANCE_MILESTONES.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {ATTENDANCE_MILESTONES.map((m) => {
              const isUnlocked = attendance.unlockedMilestoneIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isUnlocked
                      ? 'bg-teal-500/10 border-teal-400/50 shadow-md'
                      : 'bg-slate-900/40 border-slate-800/80 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-lg academy-elevated">
                      {getMilestoneIcon(m.iconName)}
                    </div>
                    <span
                      className={`text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded ${
                        isUnlocked
                          ? 'bg-emerald-400/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {m.days} Days
                    </span>
                  </div>
                  <div className="font-display text-xs font-bold text-white">{m.title}</div>
                  <div className="text-[10px] text-teal-400/90 font-medium mb-1">
                    {m.arabicTitle}
                  </div>
                  <p className="text-[11px] academy-text-secondary leading-snug line-clamp-2">
                    {m.description}
                  </p>
                  <div className="mt-2 text-[10px] font-semibold">
                    {isUnlocked ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        {Math.max(0, m.days - attendance.currentStreak)} days remaining
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FOOTER ACTION: Continue Coursework CTA */}
      {onContinueCoursework && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t academy-divider text-xs">
          <span className="academy-text-secondary">
            Keep your streak shining — continue watching your enrolled lectures or submit homework
            assignments today.
          </span>
          <button
            type="button"
            onClick={onContinueCoursework}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <span>Resume Coursework</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
