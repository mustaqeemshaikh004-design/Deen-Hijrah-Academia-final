import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Video,
  Globe,
  Lock,
  ExternalLink,
  Plus,
  Play,
  BookOpen,
} from 'lucide-react';
import { Course, CourseEvent, Lesson } from '../types.ts';
import { resolveThumbnailUrl, ACADEMY_ASSETS } from '../lib/assets.ts';
import {
  getDetectedUserTimezone,
  WORLD_TIMEZONES,
  convertClassTimeToRegion,
} from '../lib/timezone.ts';

export interface UnifiedCalendarItem {
  id: string;
  courseId?: number | null;
  courseTitle?: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD (converted to viewer's local timezone!)
  originalDate: string;
  localTimeDisplay: string;
  sourceTimeSummary: string;
  duration: string;
  category: 'orientation' | 'course_launch' | 'zoom_session' | 'recording_release';
  thumbnailUrl: string;
  instructorName: string;
  zoomJoinUrl?: string | null;
  zoomMeetingId?: string | null;
  zoomPasscode?: string | null;
  videoUrl?: string | null;
  isPublic: boolean;
}

interface InteractiveCalendarProps {
  courses: Course[];
  events: CourseEvent[];
  lessons: Lesson[];
  enrolledCourseIds: number[];
  isAdmin: boolean;
  fixedCourseId?: number | null;
  externalTimezone?: string;
  onExternalTimezoneChange?: (tz: string) => void;
  onEnrollCourse?: (courseId: number) => void;
  onOpenWatchCourse?: (courseId: number, lessonId?: number) => void;
  onOpenAdminSchedule?: () => void;
}

export const InteractiveCalendar: React.FC<InteractiveCalendarProps> = ({
  courses,
  events,
  lessons,
  enrolledCourseIds,
  isAdmin,
  fixedCourseId = null,
  externalTimezone,
  onExternalTimezoneChange,
  onEnrollCourse,
  onOpenWatchCourse,
  onOpenAdminSchedule,
}) => {
  const detectedTz = useMemo(() => getDetectedUserTimezone(), []);
  const [internalTimezone, setInternalTimezone] = useState<string>(detectedTz);
  const viewerTimezone = externalTimezone || internalTimezone;
  const setViewerTimezone = (tz: string) => {
    setInternalTimezone(tz);
    if (onExternalTimezoneChange) {
      onExternalTimezoneChange(tz);
    }
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }, []);

  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>(
    fixedCourseId ? String(fixedCourseId) : 'all'
  );
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const courseMap = useMemo(() => {
    const map = new Map<number, Course>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  const activeSpecificCourse = useMemo(() => {
    const cId = fixedCourseId || (selectedCourseFilter !== 'all' ? Number(selectedCourseFilter) : null);
    return cId ? courseMap.get(cId) || null : null;
  }, [fixedCourseId, selectedCourseFilter, courseMap]);

  // Combine CourseEvents, Course Launch Dates, and Scheduled Lesson Recordings with Automatic Country Timezone Conversion
  const allUnifiedItems: UnifiedCalendarItem[] = useMemo(() => {
    const list: UnifiedCalendarItem[] = [];

    // 1. Explicit CourseEvents (Zoom sessions, Orientations, Launches)
    events.forEach((ev) => {
      const parentCourse = ev.courseId ? courseMap.get(ev.courseId) : undefined;
      const converted = convertClassTimeToRegion(
        ev.eventDate,
        ev.startTime,
        ev.sourceTimezone || parentCourse?.classTimezone || 'America/New_York',
        viewerTimezone
      );

      list.push({
        id: `event-${ev.id}`,
        courseId: ev.courseId,
        courseTitle: parentCourse?.title || 'Academy-Wide Session',
        title: ev.title,
        description: ev.description,
        date: converted.formattedLocalDate,
        originalDate: ev.eventDate,
        localTimeDisplay: `${converted.formattedLocalTime}${converted.dayShiftLabel}`,
        sourceTimeSummary: converted.sourceSummary,
        duration: ev.duration,
        category: ev.eventType,
        thumbnailUrl: ev.thumbnailUrl || parentCourse?.thumbnailUrl || 'preset:orientation',
        instructorName: ev.instructorName || 'Mustaqeem Shaikh',
        zoomJoinUrl: ev.zoomJoinUrl,
        zoomMeetingId: ev.zoomMeetingId,
        zoomPasscode: ev.zoomPasscode,
        isPublic: ev.isPublic,
      });
    });

    // 2. Course Launch Dates
    courses.forEach((course) => {
      if (course.launchDate) {
        const alreadyHasLaunchEvent = events.some(
          (e) =>
            e.courseId === course.id &&
            e.eventDate === course.launchDate &&
            e.eventType === 'course_launch'
        );
        if (!alreadyHasLaunchEvent) {
          const converted = convertClassTimeToRegion(
            course.launchDate,
            course.classStartTime || '14:00',
            course.classTimezone || 'America/New_York',
            viewerTimezone
          );
          list.push({
            id: `course-launch-${course.id}`,
            courseId: course.id,
            courseTitle: course.title,
            title: `Course Launch: ${course.title}`,
            description: course.description,
            date: converted.formattedLocalDate,
            originalDate: course.launchDate,
            localTimeDisplay: `${converted.formattedLocalTime}${converted.dayShiftLabel}`,
            sourceTimeSummary: converted.sourceSummary,
            duration: course.duration,
            category: 'course_launch',
            thumbnailUrl: course.thumbnailUrl,
            instructorName: course.instructorName,
            isPublic: true,
          });
        }
      }
    });

    // 3. Scheduled Lesson Recordings
    lessons.forEach((lesson) => {
      if (lesson.scheduledDate) {
        const parentCourse = courseMap.get(lesson.courseId);
        const converted = convertClassTimeToRegion(
          lesson.scheduledDate,
          parentCourse?.classStartTime || '14:00',
          parentCourse?.classTimezone || 'America/New_York',
          viewerTimezone
        );
        list.push({
          id: `lesson-${lesson.id}`,
          courseId: lesson.courseId,
          courseTitle: parentCourse?.title || 'Course Curriculum',
          title: `${lesson.isFreePreview ? 'Orientation Recording' : 'Class Recording'}: ${
            lesson.title
          }`,
          description: lesson.description,
          date: converted.formattedLocalDate,
          originalDate: lesson.scheduledDate,
          localTimeDisplay: lesson.isFreePreview
            ? `Public Orientation · ${converted.formattedLocalTime}`
            : `Enrolled Class · ${converted.formattedLocalTime}`,
          sourceTimeSummary: converted.sourceSummary,
          duration: lesson.duration,
          category: 'recording_release',
          thumbnailUrl:
            lesson.thumbnailUrl || parentCourse?.thumbnailUrl || 'preset:seerah',
          instructorName: parentCourse?.instructorName || 'Mustaqeem Shaikh',
          videoUrl: lesson.videoUrl,
          isPublic: lesson.isFreePreview,
        });
      }
    });

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [events, courses, lessons, courseMap, viewerTimezone]);

  const filteredItems = useMemo(() => {
    return allUnifiedItems.filter((item) => {
      const targetCourseId = fixedCourseId ? String(fixedCourseId) : selectedCourseFilter;
      if (targetCourseId !== 'all' && String(item.courseId) !== targetCourseId) {
        return false;
      }
      if (selectedTypeFilter !== 'all' && item.category !== selectedTypeFilter) {
        return false;
      }
      return true;
    });
  }, [allUnifiedItems, fixedCourseId, selectedCourseFilter, selectedTypeFilter]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, UnifiedCalendarItem[]>();
    filteredItems.forEach((item) => {
      const arr = map.get(item.date) || [];
      arr.push(item);
      map.set(item.date, arr);
    });
    return map;
  }, [filteredItems]);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const monthLabel = currentMonthDate.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarCells = useMemo(() => {
    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(
        2,
        '0'
      )}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [year, month, firstDayOfWeek, daysInMonth]);

  const selectedDateItems = itemsByDate.get(selectedDate) || [];

  const getCategoryLabel = (cat: UnifiedCalendarItem['category']) => {
    switch (cat) {
      case 'orientation':
        return 'Orientation Session';
      case 'course_launch':
        return 'Course Launch';
      case 'zoom_session':
        return 'Live Zoom Class';
      case 'recording_release':
        return 'Lecture Recording';
    }
  };

  // Convert activeSpecificCourse weekly class time into viewer's timezone
  const specificCourseConvertedWeeklyTime = useMemo(() => {
    if (!activeSpecificCourse) return null;
    return convertClassTimeToRegion(
      todayStr,
      activeSpecificCourse.classStartTime || '14:00',
      activeSpecificCourse.classTimezone || 'America/New_York',
      viewerTimezone
    );
  }, [activeSpecificCourse, todayStr, viewerTimezone]);

  return (
    <div className="space-y-6">
      {/* Top Filter, Course Selector & Automatic Region Timezone Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b academy-divider">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-teal-400">
            <Globe className="w-3.5 h-3.5" />
            <span>
              Times Automatically Converted to Your Region:{' '}
              <strong className="font-mono-tabular">{viewerTimezone}</strong>
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold mt-1">
            {fixedCourseId && activeSpecificCourse
              ? `${activeSpecificCourse.title} — Course Calendar`
              : 'Master Academy Calendar & Global Class Times'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Country / Region Timezone Switcher */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg academy-elevated border border-teal-500/30">
            <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <select
              value={viewerTimezone}
              onChange={(e) => setViewerTimezone(e.target.value)}
              title="All scheduled class times are automatically converted into the selected country/region timezone"
              className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value={detectedTz} className="bg-slate-900 text-white">
                My Local Time ({detectedTz})
              </option>
              {WORLD_TIMEZONES.filter((w) => w.tz !== detectedTz).map((w) => (
                <option key={w.tz} value={w.tz} className="bg-slate-900 text-white">
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          {!fixedCourseId && (
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
            >
              <option value="all">All Academy Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  Course Calendar: {c.title}
                </option>
              ))}
            </select>
          )}

          {/* Event Category Segmented Filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg academy-elevated overflow-x-auto">
            {[
              { id: 'all', label: 'All Events' },
              { id: 'orientation', label: 'Orientations' },
              { id: 'course_launch', label: 'Launches' },
              { id: 'zoom_session', label: 'Zoom Live' },
              { id: 'recording_release', label: 'Recordings' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTypeFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedTypeFilter === tab.id
                    ? 'bg-teal-400 text-slate-950 font-semibold'
                    : 'academy-text-secondary hover:text-teal-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isAdmin && onOpenAdminSchedule && (
            <button
              type="button"
              onClick={onOpenAdminSchedule}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Course-Specific Weekly Class Day & Converted Local Time Banner */}
      {activeSpecificCourse && specificCourseConvertedWeeklyTime && (
        <div className="p-4 rounded-xl academy-elevated border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-teal-400">
              Course Weekly Class Schedule ({activeSpecificCourse.title})
            </div>
            <div className="text-sm font-bold">
              Class Days: <span className="text-teal-300">{activeSpecificCourse.classDays || 'Saturday & Wednesday'}</span>{' '}
              · Your Local Time:{' '}
              <span className="text-amber-300 font-mono-tabular">
                {specificCourseConvertedWeeklyTime.formattedLocalTime}
              </span>{' '}
              <span className="text-xs academy-text-secondary font-normal">
                ({viewerTimezone})
              </span>
            </div>
          </div>
          <div className="text-xs academy-text-muted font-mono-tabular">
            Instructor Base Time: {specificCourseConvertedWeeklyTime.sourceSummary}
          </div>
        </div>
      )}

      {/* Main 2-Column Calendar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Interactive Calendar Grid with Embedded Thumbnails on Dates */}
        <div className="lg:col-span-7 rounded-xl academy-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-teal-400">{monthLabel}</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(todayStr);
                }}
                className="px-2.5 py-1 text-xs font-medium rounded-md academy-elevated hover:border-teal-400/50 whitespace-nowrap"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-md academy-elevated hover:border-teal-400/50"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-md academy-elevated hover:border-teal-400/50"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium academy-text-muted mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell, idx) => {
              if (!cell.day || !cell.dateStr) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-20 sm:h-24 rounded-lg bg-transparent border border-transparent"
                  />
                );
              }

              const dayEvents = itemsByDate.get(cell.dateStr) || [];
              const isSelected = selectedDate === cell.dateStr;
              const isToday = todayStr === cell.dateStr;
              const primaryItem = dayEvents[0];

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr!)}
                  className={`relative h-20 sm:h-24 rounded-lg p-1.5 text-left flex flex-col justify-between overflow-hidden transition-all border group ${
                    isSelected
                      ? 'border-teal-400 ring-2 ring-teal-400/40 academy-elevated'
                      : dayEvents.length > 0
                      ? 'border-teal-500/35 academy-surface hover:border-teal-400'
                      : 'academy-surface hover:border-teal-500/30'
                  }`}
                >
                  {primaryItem && (
                    <>
                      <img
                        src={resolveThumbnailUrl(primaryItem.thumbnailUrl)}
                        alt={primaryItem.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            ACADEMY_ASSETS.orientationLive;
                        }}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                          isSelected
                            ? 'opacity-65 scale-105'
                            : 'opacity-30 group-hover:opacity-50'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#040A12]/95 via-[#060E1A]/55 to-[#060E1A]/30" />
                    </>
                  )}

                  <div className="relative z-10 flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono-tabular font-semibold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-teal-400 text-slate-950'
                          : isToday
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : primaryItem
                          ? 'text-white'
                          : 'academy-text-secondary'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-mono-tabular font-semibold text-teal-300 bg-[#060E1A]/80 px-1 rounded">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {primaryItem && (
                    <div className="relative z-10 mt-auto">
                      <div className="text-[10px] font-medium text-teal-300 truncate font-mono-tabular">
                        {primaryItem.localTimeDisplay}
                      </div>
                      <div className="text-[11px] font-semibold text-white truncate">
                        {primaryItem.title}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 Columns: Selected Date Thumbnail Showcase & Regional Time Details */}
        <div className="lg:col-span-5 rounded-xl academy-surface p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b academy-divider">
            <div>
              <div className="text-xs font-medium text-teal-400">
                Selected Date ({viewerTimezone})
              </div>
              <h3 className="font-display text-lg font-bold font-mono-tabular mt-0.5">
                {selectedDate}
              </h3>
            </div>
            <span className="text-xs font-mono-tabular academy-text-secondary">
              {selectedDateItems.length}{' '}
              {selectedDateItems.length === 1 ? 'scheduled item' : 'scheduled items'}
            </span>
          </div>

          {selectedDateItems.length > 0 ? (
            <div className="space-y-4">
              {selectedDateItems.map((item) => {
                const isEnrolled =
                  isAdmin ||
                  !item.courseId ||
                  enrolledCourseIds.includes(item.courseId);
                const canJoinZoom =
                  Boolean(item.zoomJoinUrl) &&
                  (isEnrolled || item.category === 'orientation');
                const canWatchRecording =
                  isEnrolled || item.category === 'orientation' || item.isPublic;

                return (
                  <div
                    key={item.id}
                    className="rounded-xl overflow-hidden academy-elevated border border-teal-500/30"
                  >
                    {/* Prominent Thumbnail Display for the Selected Date Item */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                      <img
                        src={resolveThumbnailUrl(item.thumbnailUrl)}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            ACADEMY_ASSETS.orientationLive;
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#060E1A] via-[#060E1A]/45 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-teal-300 font-medium">
                        <span>{getCategoryLabel(item.category)}</span>
                        <span className="font-mono-tabular">
                          {item.localTimeDisplay} · {item.duration}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs academy-text-secondary">
                        <span>
                          {item.courseTitle} · Faculty: {item.instructorName}
                        </span>
                        <span className="font-mono-tabular text-[11px] academy-text-muted">
                          Set at: {item.sourceTimeSummary}
                        </span>
                      </div>
                      <h4 className="font-display text-base font-bold">{item.title}</h4>
                      <p className="text-xs academy-text-secondary leading-relaxed">
                        {item.description}
                      </p>

                      {/* Zoom Meeting Details & Join Button */}
                      {item.zoomJoinUrl && (
                        <div className="pt-2 border-t academy-divider space-y-2">
                          {canJoinZoom ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-3 text-xs academy-text-secondary font-mono-tabular">
                                {item.zoomMeetingId && (
                                  <span>Meeting ID: {item.zoomMeetingId}</span>
                                )}
                                {item.zoomPasscode && (
                                  <span>Passcode: {item.zoomPasscode}</span>
                                )}
                              </div>
                              <a
                                href={item.zoomJoinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 transition-colors whitespace-nowrap"
                              >
                                <Video className="w-4 h-4" />
                                <span>Join Live Zoom Meeting</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3 pt-1">
                              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span>Enroll in course to unlock Zoom link</span>
                              </div>
                              {item.courseId && onEnrollCourse && (
                                <button
                                  type="button"
                                  onClick={() => onEnrollCourse(item.courseId!)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 whitespace-nowrap"
                                >
                                  Enroll Now
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recording Watch Action (Orientation open to all; Class Recording requires enrollment) */}
                      {item.category === 'recording_release' &&
                        item.courseId &&
                        onOpenWatchCourse && (
                          <div className="pt-2 border-t academy-divider">
                            {canWatchRecording ? (
                              <button
                                type="button"
                                onClick={() => onOpenWatchCourse(item.courseId!)}
                                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 transition-colors whitespace-nowrap"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>
                                  {item.isPublic
                                    ? 'Watch Orientation Recording'
                                    : 'Watch Enrolled Class Recording'}
                                </span>
                              </button>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-xs text-amber-400">
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Class Recording (Enroll to Watch)</span>
                                </span>
                                {onEnrollCourse && (
                                  <button
                                    type="button"
                                    onClick={() => onEnrollCourse(item.courseId!)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950"
                                  >
                                    Enroll Now
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                      {/* Course Launch Enroll Action */}
                      {item.category === 'course_launch' &&
                        item.courseId &&
                        !enrolledCourseIds.includes(item.courseId) &&
                        onEnrollCourse && (
                          <div className="pt-2 border-t academy-divider">
                            <button
                              type="button"
                              onClick={() => onEnrollCourse(item.courseId!)}
                              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 transition-colors whitespace-nowrap"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Enroll in Launching Cohort</span>
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <CalendarIcon className="w-8 h-8 text-teal-400/60 mx-auto" />
              <div>
                <div className="text-sm font-semibold">
                  No Sessions Scheduled on {selectedDate}
                </div>
                <p className="text-xs academy-text-secondary mt-1 max-w-xs mx-auto">
                  Select a highlighted date with a thumbnail on the calendar grid or jump to an
                  upcoming session below.
                </p>
              </div>

              {filteredItems.length > 0 && (
                <div className="pt-4 border-t academy-divider text-left space-y-2">
                  <div className="text-xs font-semibold text-teal-400">
                    Upcoming Dates in Your Timezone ({viewerTimezone}):
                  </div>
                  {filteredItems.slice(0, 4).map((upcoming) => (
                    <button
                      key={upcoming.id}
                      type="button"
                      onClick={() => {
                        setSelectedDate(upcoming.date);
                        const parts = upcoming.date.split('-');
                        if (parts.length === 3) {
                          setCurrentMonthDate(
                            new Date(Number(parts[0]), Number(parts[1]) - 1, 1)
                          );
                        }
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg academy-elevated hover:border-teal-400 transition-colors text-left"
                    >
                      <img
                        src={resolveThumbnailUrl(upcoming.thumbnailUrl)}
                        alt={upcoming.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            ACADEMY_ASSETS.orientationLive;
                        }}
                        className="w-12 h-9 rounded object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{upcoming.title}</div>
                        <div className="text-[11px] academy-text-secondary font-mono-tabular">
                          {upcoming.date} · {upcoming.localTimeDisplay}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
