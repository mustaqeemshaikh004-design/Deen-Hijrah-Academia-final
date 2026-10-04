import React, { useState, useMemo, useEffect } from 'react';
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
  Sparkles,
  Clock,
  Settings2,
  Maximize2,
  Minimize2,
  Check,
  CheckCircle2,
  List,
  Grid3X3,
  Columns3,
  X,
  Search,
  Users,
} from 'lucide-react';
import { Course, CourseEvent, Lesson, CalendarSettings } from '../types.ts';
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
  date: string; // YYYY-MM-DD (converted to viewer's local timezone)
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
  calendarSettings?: CalendarSettings;
  onUpdateCalendarSettings?: (settings: CalendarSettings) => Promise<void>;
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
  calendarSettings,
  onUpdateCalendarSettings,
}) => {
  const detectedTz = useMemo(() => getDetectedUserTimezone(), []);
  const [internalTimezone, setInternalTimezone] = useState<string>(
    calendarSettings?.defaultTimezone || detectedTz
  );
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

  // Calendar View Mode: 'expanded_month' (Default spacious), 'split_month', 'week', 'agenda'
  const [viewMode, setViewMode] = useState<'expanded_month' | 'split_month' | 'week' | 'agenda'>(
    () => calendarSettings?.defaultViewMode || 'expanded_month'
  );

  // Full-width expand toggle
  const [isFullWidth, setIsFullWidth] = useState(true);

  // Filters & Selected State
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>(
    fixedCourseId ? String(fixedCourseId) : (calendarSettings?.defaultCourseFilter || 'all')
  );
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>(
    calendarSettings?.defaultCategoryFilter || 'all'
  );
  const [agendaSearch, setAgendaSearch] = useState<string>('');

  // Selected Day Details Modal (for expanded views)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [inspectedItem, setInspectedItem] = useState<UnifiedCalendarItem | null>(null);

  // Global Calendar Options Modal State (for saving for everyone)
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [savingOptions, setSavingOptions] = useState(false);
  const [optionsNotice, setOptionsNotice] = useState<string | null>(null);

  // Option Form State
  const [optTimezone, setOptTimezone] = useState(
    calendarSettings?.defaultTimezone || 'America/New_York'
  );
  const [optViewMode, setOptViewMode] = useState<'expanded_month' | 'split_month' | 'week' | 'agenda'>(
    calendarSettings?.defaultViewMode || 'expanded_month'
  );
  const [optFilter, setOptFilter] = useState(
    calendarSettings?.defaultCategoryFilter || 'all'
  );
  const [optPublicZoom, setOptPublicZoom] = useState(
    calendarSettings?.allowPublicZoom !== undefined ? calendarSettings.allowPublicZoom : true
  );
  const [optShowWeekends, setOptShowWeekends] = useState(
    calendarSettings?.showWeekends !== undefined ? calendarSettings.showWeekends : true
  );
  const [optAnnouncementTitle, setOptAnnouncementTitle] = useState(
    calendarSettings?.announcementTitle || 'Academy Master Schedule & Global Converted Timezones'
  );
  const [optAnnouncementText, setOptAnnouncementText] = useState(
    calendarSettings?.announcementText ||
      'All class times, orientations, and live Zoom webinars automatically convert to your local region.'
  );

  // Sync settings if updated from parent
  useEffect(() => {
    if (calendarSettings) {
      if (calendarSettings.defaultTimezone) {
        setOptTimezone(calendarSettings.defaultTimezone);
      }
      if (calendarSettings.defaultViewMode) {
        setOptViewMode(calendarSettings.defaultViewMode);
      }
      if (calendarSettings.defaultCategoryFilter) {
        setOptFilter(calendarSettings.defaultCategoryFilter);
      }
      if (calendarSettings.allowPublicZoom !== undefined) {
        setOptPublicZoom(calendarSettings.allowPublicZoom);
      }
      if (calendarSettings.showWeekends !== undefined) {
        setOptShowWeekends(calendarSettings.showWeekends);
      }
      if (calendarSettings.announcementTitle) {
        setOptAnnouncementTitle(calendarSettings.announcementTitle);
      }
      if (calendarSettings.announcementText) {
        setOptAnnouncementText(calendarSettings.announcementText);
      }
    }
  }, [calendarSettings]);

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
        isPublic: ev.isPublic !== undefined ? ev.isPublic : true,
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
            title: `Cohort Launch: ${course.title}`,
            description: `Official launch of ${course.title}. Term begins with live orientation, course syllabus release, and initial cohort group discussions.`,
            date: converted.formattedLocalDate,
            originalDate: course.launchDate,
            localTimeDisplay: `${converted.formattedLocalTime}${converted.dayShiftLabel}`,
            sourceTimeSummary: converted.sourceSummary,
            duration: course.duration,
            category: 'course_launch',
            thumbnailUrl: course.thumbnailUrl || 'preset:orientation',
            instructorName: course.instructorName || 'Mustaqeem Shaikh',
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
          courseTitle: parentCourse?.title || 'Academy Lecture',
          title: lesson.isFreePreview
            ? `Orientation Recording: ${lesson.title}`
            : `Class Recording: ${lesson.title}`,
          description:
            lesson.description ||
            `Lecture recording published for ${parentCourse?.title || 'Academy'}.`,
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
      if (agendaSearch.trim()) {
        const q = agendaSearch.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCourse = item.courseTitle?.toLowerCase().includes(q);
        const matchesInstructor = item.instructorName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCourse && !matchesInstructor) return false;
      }
      return true;
    });
  }, [allUnifiedItems, fixedCourseId, selectedCourseFilter, selectedTypeFilter, agendaSearch]);

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

  // Week Schedule View Data
  const currentWeekDays = useMemo(() => {
    const target = new Date(selectedDate || todayStr);
    const dayOfWeek = target.getDay();
    const sunday = new Date(target);
    sunday.setDate(target.getDate() - dayOfWeek);

    const week: Array<{ dateStr: string; dayName: string; dayNum: number; isToday: boolean }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      week.push({
        dateStr,
        dayName: d.toLocaleString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return week;
  }, [selectedDate, todayStr]);

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

  const getCategoryTheme = (cat: UnifiedCalendarItem['category']) => {
    switch (cat) {
      case 'orientation':
        return {
          bg: 'bg-amber-400/15 hover:bg-amber-400/25',
          border: 'border-amber-400/50',
          text: 'text-amber-300',
          badge: 'bg-amber-400/20 text-amber-300',
          icon: Sparkles,
        };
      case 'course_launch':
        return {
          bg: 'bg-emerald-400/15 hover:bg-emerald-400/25',
          border: 'border-emerald-400/50',
          text: 'text-emerald-300',
          badge: 'bg-emerald-400/20 text-emerald-300',
          icon: BookOpen,
        };
      case 'zoom_session':
        return {
          bg: 'bg-teal-400/15 hover:bg-teal-400/25',
          border: 'border-teal-400/50',
          text: 'text-teal-300',
          badge: 'bg-teal-400/20 text-teal-300',
          icon: Video,
        };
      case 'recording_release':
        return {
          bg: 'bg-indigo-400/15 hover:bg-indigo-400/25',
          border: 'border-indigo-400/50',
          text: 'text-indigo-300',
          badge: 'bg-indigo-400/20 text-indigo-300',
          icon: Play,
        };
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

  // Handle saving global options for everyone
  const handleSaveOptionsForEveryone = async () => {
    setSavingOptions(true);
    setOptionsNotice(null);

    const payload: CalendarSettings = {
      defaultTimezone: optTimezone,
      defaultViewMode: optViewMode,
      defaultCategoryFilter: optFilter,
      defaultCourseFilter: selectedCourseFilter,
      allowPublicZoom: optPublicZoom,
      showWeekends: optShowWeekends,
      announcementTitle: optAnnouncementTitle.trim(),
      announcementText: optAnnouncementText.trim(),
    };

    try {
      if (onUpdateCalendarSettings) {
        await onUpdateCalendarSettings(payload);
      } else {
        const res = await fetch('/api/calendar/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('deen_auth_token') || ''}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error('Failed to save settings on server');
        }
      }

      // Apply locally as well
      setViewMode(optViewMode);
      setSelectedTypeFilter(optFilter);
      setViewerTimezone(optTimezone);

      setOptionsNotice(
        'Success! Calendar options have been saved to the database for EVERYONE. All students and visitors worldwide will now see these defaults.'
      );
      setTimeout(() => {
        setOptionsModalOpen(false);
        setOptionsNotice(null);
      }, 2400);
    } catch (err: any) {
      setOptionsNotice(`Error saving options: ${err.message || 'Please check your connection.'}`);
    } finally {
      setSavingOptions(false);
    }
  };

  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    if (viewMode === 'expanded_month') {
      setDetailModalOpen(true);
    }
  };

  const handleInspectItem = (item: UnifiedCalendarItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDate(item.date);
    setInspectedItem(item);
    setDetailModalOpen(true);
  };

  return (
    <div className={`space-y-6 ${isFullWidth ? 'w-full' : 'max-w-7xl mx-auto'}`}>
      {/* Top Header & Announcement Banner */}
      {optAnnouncementTitle && (
        <div className="p-4 sm:p-5 rounded-2xl academy-elevated border border-teal-500/30 bg-gradient-to-r from-teal-950/40 via-slate-900 to-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-400/20 text-teal-300 border border-teal-400/40">
                <Globe className="w-3 h-3" />
                <span>Global Timezone Synchronization</span>
              </span>
              <span className="text-xs font-mono-tabular text-amber-300">
                Viewer: {viewerTimezone}
              </span>
            </div>
            <h3 className="font-display text-base font-bold text-white">
              {optAnnouncementTitle}
            </h3>
            <p className="text-xs academy-text-secondary leading-relaxed max-w-3xl">
              {optAnnouncementText}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Calendar Options & Save for Everyone Button */}
            <button
              type="button"
              onClick={() => setOptionsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold academy-elevated border border-teal-400/40 hover:border-teal-300 hover:text-teal-200 transition-colors"
            >
              <Settings2 className="w-4 h-4 text-teal-400" />
              <span>Calendar Options</span>
              {isAdmin && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-400 text-slate-950">
                  Save for Everyone
                </span>
              )}
            </button>

            {/* Expand / Minimize Full Width Toggle */}
            <button
              type="button"
              onClick={() => setIsFullWidth(!isFullWidth)}
              title={isFullWidth ? 'Standard Width' : 'Expand to Full Width'}
              className="p-2.5 rounded-xl academy-elevated border border-slate-700/60 hover:border-teal-400 text-teal-300"
            >
              {isFullWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Main Filter & Navigation Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl academy-surface border academy-divider">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher: Spacious Month, Split View, Week Schedule, Agenda */}
          <div className="flex items-center p-1 rounded-xl academy-elevated border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('expanded_month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'expanded_month'
                  ? 'bg-teal-400 text-slate-950 shadow-md'
                  : 'academy-text-secondary hover:text-white'
              }`}
              title="Expansive 7-column calendar grid where dates and event chips are not squeezed"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Spacious Month</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('split_month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'split_month'
                  ? 'bg-teal-400 text-slate-950 shadow-md'
                  : 'academy-text-secondary hover:text-white'
              }`}
              title="Side-by-side view with month grid on left and detail panel on right"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'week'
                  ? 'bg-teal-400 text-slate-950 shadow-md'
                  : 'academy-text-secondary hover:text-white'
              }`}
              title="Spacious 7-day weekly schedule timetable"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Week Schedule</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'agenda'
                  ? 'bg-teal-400 text-slate-950 shadow-md'
                  : 'academy-text-secondary hover:text-white'
              }`}
              title="Chronological timeline list of all upcoming classes and sessions"
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda Timeline</span>
            </button>
          </div>

          {/* Timezone Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl academy-elevated border border-teal-500/30">
            <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <select
              value={viewerTimezone}
              onChange={(e) => setViewerTimezone(e.target.value)}
              title="All scheduled class times automatically convert to your selected region"
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
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Course Filter Dropdown */}
          {!fixedCourseId && (
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl academy-elevated border border-slate-700 focus:outline-none focus:border-teal-400"
            >
              <option value="all">All Academy Courses ({courses.length})</option>
              {courses.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl academy-elevated overflow-x-auto">
            {[
              { id: 'all', label: 'All Events' },
              { id: 'zoom_session', label: 'Zoom Live' },
              { id: 'orientation', label: 'Orientations' },
              { id: 'course_launch', label: 'Launches' },
              { id: 'recording_release', label: 'Recordings' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTypeFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  selectedTypeFilter === tab.id
                    ? 'bg-teal-400 text-slate-950'
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
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Course-Specific Weekly Class Day & Converted Local Time Banner */}
      {activeSpecificCourse && specificCourseConvertedWeeklyTime && (
        <div className="p-4 rounded-xl academy-elevated border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-teal-950/20">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-teal-400">
              Weekly Course Schedule · {activeSpecificCourse.title}
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
            Instructor Base: {specificCourseConvertedWeeklyTime.sourceSummary}
          </div>
        </div>
      )}

      {/* VIEW 1: SPACIOUS EXPANDED MONTH GRID (NOT SQUEEZED!) */}
      {viewMode === 'expanded_month' && (
        <div className="rounded-2xl academy-surface p-5 sm:p-6 border academy-divider space-y-4">
          {/* Month Navigator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b academy-divider">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide">
                {monthLabel}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono-tabular font-medium bg-teal-400/20 text-teal-300 border border-teal-400/30">
                {filteredItems.length} Sessions Available
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(todayStr);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg academy-elevated hover:border-teal-400 whitespace-nowrap"
              >
                Jump to Today
              </button>
              <div className="flex items-center gap-1 academy-elevated rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
                  className="p-1.5 rounded hover:text-teal-300"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
                  className="p-1.5 rounded hover:text-teal-300"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-teal-400/80">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
              (day) => (
                <div key={day} className="py-2 rounded-lg bg-[#060E1A]/60 border border-slate-800">
                  <span className="hidden md:inline">{day}</span>
                  <span className="md:hidden">{day.slice(0, 3)}</span>
                </div>
              )
            )}
          </div>

          {/* Days Grid - Spacious, un-squeezed cells */}
          <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
            {calendarCells.map((cell, idx) => {
              if (!cell.day || !cell.dateStr) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[120px] sm:min-h-[145px] lg:min-h-[160px] rounded-xl bg-slate-950/20 border border-slate-900/50 opacity-40"
                  />
                );
              }

              const dayEvents = itemsByDate.get(cell.dateStr) || [];
              const isSelected = selectedDate === cell.dateStr;
              const isToday = todayStr === cell.dateStr;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => handleSelectDay(cell.dateStr!)}
                  className={`group relative min-h-[120px] sm:min-h-[145px] lg:min-h-[160px] rounded-xl p-2 sm:p-2.5 flex flex-col justify-between transition-all cursor-pointer border ${
                    isSelected
                      ? 'border-teal-400 ring-2 ring-teal-400/40 bg-teal-950/30'
                      : isToday
                      ? 'border-amber-400/60 bg-amber-950/20 ring-1 ring-amber-400/30'
                      : dayEvents.length > 0
                      ? 'border-teal-500/30 bg-[#07111E] hover:border-teal-400'
                      : 'border-slate-800 bg-[#050D18]/70 hover:border-slate-700'
                  }`}
                >
                  {/* Top Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono-tabular font-bold px-2 py-0.5 rounded-md ${
                        isToday
                          ? 'bg-amber-400 text-slate-950 font-extrabold shadow-sm'
                          : isSelected
                          ? 'bg-teal-400 text-slate-950 font-extrabold'
                          : 'text-slate-300 group-hover:text-white'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                        {dayEvents.length} {dayEvents.length === 1 ? 'class' : 'classes'}
                      </span>
                    )}
                  </div>

                  {/* Event Chips List inside the Day Box */}
                  <div className="my-1.5 space-y-1.5 overflow-hidden flex-1 flex flex-col justify-start">
                    {dayEvents.slice(0, 3).map((item) => {
                      const theme = getCategoryTheme(item.category);
                      const Icon = theme.icon;
                      return (
                        <div
                          key={item.id}
                          onClick={(e) => handleInspectItem(item, e)}
                          title={`${item.title} (${item.localTimeDisplay}) - Click to inspect`}
                          className={`flex items-center gap-1.5 p-1 sm:p-1.5 rounded-lg border text-[11px] font-medium transition-transform group-hover:translate-x-0.5 ${theme.bg} ${theme.border} ${theme.text}`}
                        >
                          <Icon className="w-3 h-3 shrink-0" />
                          <div className="truncate flex-1">
                            <span className="font-mono-tabular font-semibold mr-1">
                              {item.localTimeDisplay.split('·')[0]}
                            </span>
                            <span className="text-white/90 truncate">{item.title}</span>
                          </div>
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <div className="text-[10px] font-semibold text-teal-300/80 px-1">
                        +{dayEvents.length - 3} more session{dayEvents.length - 3 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Bottom Day Footer hint */}
                  <div className="text-[10px] academy-text-muted flex items-center justify-between pt-1 border-t border-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Click to inspect</span>
                    <span className="font-mono-tabular">{cell.dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: SPLIT VIEW (WIDER 8/4 GRID + DETAIL SIDEBAR) */}
      {viewMode === 'split_month' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Columns: Spacious Month Grid */}
          <div className="lg:col-span-8 rounded-2xl academy-surface p-5 border academy-divider space-y-4">
            <div className="flex items-center justify-between pb-3 border-b academy-divider">
              <h3 className="font-display text-xl font-bold text-teal-400">{monthLabel}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelectedDate(todayStr);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg academy-elevated whitespace-nowrap"
                >
                  Today
                </button>
                <div className="flex items-center gap-1 academy-elevated rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
                    className="p-1 rounded hover:text-teal-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
                    className="p-1 rounded hover:text-teal-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-teal-400/80 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell, idx) => {
                if (!cell.day || !cell.dateStr) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[95px] sm:min-h-[110px] rounded-lg bg-transparent"
                    />
                  );
                }

                const dayEvents = itemsByDate.get(cell.dateStr) || [];
                const isSelected = selectedDate === cell.dateStr;
                const isToday = todayStr === cell.dateStr;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateStr!)}
                    className={`min-h-[95px] sm:min-h-[110px] rounded-xl p-2 text-left flex flex-col justify-between transition-all border ${
                      isSelected
                        ? 'border-teal-400 ring-2 ring-teal-400/40 bg-teal-950/40'
                        : isToday
                        ? 'border-amber-400/50 bg-amber-950/20'
                        : dayEvents.length > 0
                        ? 'border-teal-500/35 bg-[#06101B] hover:border-teal-400'
                        : 'border-slate-800/80 bg-[#050D18]/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-mono-tabular font-bold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-teal-400 text-slate-950'
                            : isToday
                            ? 'bg-amber-400 text-slate-950'
                            : 'text-slate-300'
                        }`}
                      >
                        {cell.day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-mono-tabular font-semibold text-teal-300 bg-teal-950/80 border border-teal-500/40 px-1 rounded">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 my-1 w-full">
                      {dayEvents.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="text-[10px] font-medium truncate text-teal-300/90 font-mono-tabular"
                        >
                          • {item.title}
                        </div>
                      ))}
                    </div>

                    <div className="text-[9px] font-mono-tabular academy-text-muted">
                      {dayEvents.length > 0 ? `${dayEvents.length} items` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 4 Columns: Selected Day Full Details */}
          <div className="lg:col-span-4 rounded-2xl academy-surface p-5 border academy-divider space-y-4">
            <div className="flex items-center justify-between pb-3 border-b academy-divider">
              <div>
                <div className="text-xs font-semibold text-teal-400">Selected Date Schedule</div>
                <h4 className="font-display text-lg font-bold font-mono-tabular">{selectedDate}</h4>
              </div>
              <span className="text-xs font-mono-tabular academy-text-secondary">
                {selectedDateItems.length} session{selectedDateItems.length === 1 ? '' : 's'}
              </span>
            </div>

            {selectedDateItems.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {selectedDateItems.map((item) => renderSessionDetailCard(item))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <CalendarIcon className="w-8 h-8 text-teal-400/50 mx-auto" />
                <div className="text-sm font-semibold text-white">No sessions on {selectedDate}</div>
                <p className="text-xs academy-text-secondary max-w-xs mx-auto">
                  Click on any highlighted day with an event count badge to inspect its details and
                  access live Zoom links.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: WEEK SCHEDULE TIMETABLE */}
      {viewMode === 'week' && (
        <div className="rounded-2xl academy-surface p-5 sm:p-6 border academy-divider space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b academy-divider">
            <div>
              <h3 className="font-display text-xl font-bold text-white">Weekly Schedule Timetable</h3>
              <p className="text-xs academy-text-secondary mt-0.5">
                Full 7-day overview with automatic timezone conversions into{' '}
                <strong className="text-teal-400">{viewerTimezone}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg academy-elevated hover:border-teal-400"
              >
                Current Week
              </button>
            </div>
          </div>

          {/* 7 Columns for the active week */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {currentWeekDays.map((w) => {
              const dayItems = itemsByDate.get(w.dateStr) || [];
              const isSelected = selectedDate === w.dateStr;

              return (
                <div
                  key={w.dateStr}
                  onClick={() => setSelectedDate(w.dateStr)}
                  className={`rounded-xl p-3 min-h-[320px] flex flex-col transition-all border ${
                    isSelected
                      ? 'border-teal-400 ring-2 ring-teal-400/40 bg-teal-950/20'
                      : w.isToday
                      ? 'border-amber-400/60 bg-amber-950/15'
                      : 'border-slate-800 bg-[#06101B]/80'
                  }`}
                >
                  <div className="pb-2 border-b academy-divider flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-teal-400 uppercase">{w.dayName}</div>
                      <div className="text-base font-bold font-mono-tabular">{w.dayNum}</div>
                    </div>
                    {w.isToday && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2.5 flex-1">
                    {dayItems.length > 0 ? (
                      dayItems.map((item) => {
                        const theme = getCategoryTheme(item.category);
                        const Icon = theme.icon;
                        return (
                          <div
                            key={item.id}
                            onClick={(e) => handleInspectItem(item, e)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all hover:scale-[1.02] ${theme.bg} ${theme.border}`}
                          >
                            <div className="flex items-center gap-1.5 font-bold mb-1">
                              <Icon className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-mono-tabular">
                                {item.localTimeDisplay.split('·')[0]}
                              </span>
                            </div>
                            <div className="font-semibold text-white leading-tight">{item.title}</div>
                            <div className="text-[10px] academy-text-secondary mt-1 truncate">
                              {item.courseTitle}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-xs academy-text-muted">
                        No scheduled classes
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: AGENDA TIMELINE LIST */}
      {viewMode === 'agenda' && (
        <div className="rounded-2xl academy-surface p-5 sm:p-6 border academy-divider space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b academy-divider">
            <div>
              <h3 className="font-display text-xl font-bold text-white">Academy Agenda &amp; Timeline</h3>
              <p className="text-xs academy-text-secondary mt-0.5">
                All scheduled orientations, live Zoom lectures, and launches ordered chronologically.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={agendaSearch}
                onChange={(e) => setAgendaSearch(e.target.value)}
                placeholder="Search classes or faculty..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl academy-elevated border border-slate-700 focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl academy-elevated border border-slate-800 hover:border-teal-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <img
                      src={resolveThumbnailUrl(item.thumbnailUrl)}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = ACADEMY_ASSETS.orientationLive;
                      }}
                      className="w-20 h-14 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-400/20 text-teal-300 font-mono-tabular">
                          {item.date} · {item.localTimeDisplay}
                        </span>
                        <span className="text-xs academy-text-secondary">
                          {item.courseTitle} · {item.instructorName}
                        </span>
                      </div>
                      <h4 className="font-display text-base font-bold text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs academy-text-secondary line-clamp-1">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleInspectItem(item)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                    >
                      View Details &amp; Links
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs academy-text-secondary">
                No events found matching your filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* DATE & SESSION DETAIL INSPECTOR MODAL (FOR SPACIOUS POPUP VIEW) */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-950 rounded-2xl border border-teal-500/40 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b academy-divider">
              <div>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  Session Inspector ({viewerTimezone})
                </span>
                <h3 className="font-display text-xl font-bold font-mono-tabular mt-0.5">
                  {selectedDate}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white academy-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {inspectedItem ? (
                renderSessionDetailCard(inspectedItem, true)
              ) : selectedDateItems.length > 0 ? (
                selectedDateItems.map((item) => renderSessionDetailCard(item, true))
              ) : (
                <div className="py-8 text-center text-xs academy-text-secondary">
                  No sessions scheduled for this date.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t academy-divider">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold academy-elevated hover:bg-slate-800"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACADEMY CALENDAR OPTIONS MODAL (SAVING FOR EVERYONE) */}
      {optionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-950 rounded-2xl border border-teal-500/40 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b academy-divider">
              <div>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  Master Calendar Configuration
                </span>
                <h3 className="font-display text-lg font-bold text-white mt-0.5">
                  Calendar Options &amp; Global Academy Defaults
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOptionsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white academy-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {optionsNotice && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  optionsNotice.startsWith('Success')
                    ? 'bg-teal-950/60 text-teal-300 border border-teal-500/40'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                }`}
              >
                {optionsNotice}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-teal-400 mb-1">
                  Default Academy Base Timezone
                </label>
                <p className="text-[11px] academy-text-muted mb-2">
                  This timezone serves as the reference standard. All class dates convert from this
                  reference to each student’s country timezone.
                </p>
                <select
                  value={optTimezone}
                  onChange={(e) => setOptTimezone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl academy-elevated border border-slate-700"
                >
                  {WORLD_TIMEZONES.map((w) => (
                    <option key={w.tz} value={w.tz}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-teal-400 mb-1">
                  Default Calendar View for Everyone
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'expanded_month', label: 'Spacious Month' },
                    { id: 'split_month', label: 'Split View' },
                    { id: 'week', label: 'Week Schedule' },
                    { id: 'agenda', label: 'Agenda Timeline' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setOptViewMode(v.id as any)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        optViewMode === v.id
                          ? 'border-teal-400 bg-teal-400/20 text-teal-300'
                          : 'border-slate-800 academy-elevated text-slate-400'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-teal-400 mb-1">
                  Default Category Filter
                </label>
                <select
                  value={optFilter}
                  onChange={(e) => setOptFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl academy-elevated border border-slate-700"
                >
                  <option value="all">All Events</option>
                  <option value="zoom_session">Live Zoom Class Sessions</option>
                  <option value="orientation">Orientation Sessions</option>
                  <option value="course_launch">Course Launch Dates</option>
                  <option value="recording_release">Lecture Recordings</option>
                </select>
              </div>

              <div className="p-3 rounded-xl academy-elevated border border-slate-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optPublicZoom}
                    onChange={(e) => setOptPublicZoom(e.target.checked)}
                    className="w-4 h-4 text-teal-400 rounded focus:ring-teal-400 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white">
                      Allow All Students &amp; Visitors to Join Public Live Sessions
                    </span>
                    <p className="text-[11px] academy-text-muted">
                      When enabled, open Zoom links are displayed without requiring enrollment locks.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-slate-800">
                  <input
                    type="checkbox"
                    checked={optShowWeekends}
                    onChange={(e) => setOptShowWeekends(e.target.checked)}
                    className="w-4 h-4 text-teal-400 rounded focus:ring-teal-400 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white">Show Weekend Days</span>
                    <p className="text-[11px] academy-text-muted">
                      Displays Saturday and Sunday columns on the calendar grid.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-teal-400 mb-1">
                  Calendar Announcement Notice Title
                </label>
                <input
                  type="text"
                  value={optAnnouncementTitle}
                  onChange={(e) => setOptAnnouncementTitle(e.target.value)}
                  placeholder="Academy Schedule Announcement"
                  className="w-full px-3 py-2 text-xs rounded-xl academy-elevated border border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-teal-400 mb-1">
                  Announcement Notice Text
                </label>
                <textarea
                  rows={2}
                  value={optAnnouncementText}
                  onChange={(e) => setOptAnnouncementText(e.target.value)}
                  placeholder="Notice message visible above the calendar..."
                  className="w-full px-3 py-2 text-xs rounded-xl academy-elevated border border-slate-700"
                />
              </div>
            </div>

            <div className="pt-4 border-t academy-divider flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] academy-text-secondary">
                {isAdmin ? (
                  <span>
                    <strong className="text-teal-400">Admin Mode:</strong> Saving will persist these
                    options in the database for all academy users.
                  </span>
                ) : (
                  <span>You are customizing your local view preferences.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOptionsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold academy-elevated hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingOptions}
                  onClick={handleSaveOptionsForEveryone}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors shadow-md disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {savingOptions
                      ? 'Saving Globally...'
                      : isAdmin
                      ? '💾 Save Options for Everyone'
                      : 'Apply Preferences'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper to render session details consistently
  function renderSessionDetailCard(item: UnifiedCalendarItem, inModal = false) {
    const isEnrolled = isAdmin || !item.courseId || enrolledCourseIds.includes(item.courseId);
    const canJoinZoom =
      Boolean(item.zoomJoinUrl) &&
      (isEnrolled || item.category === 'orientation' || item.isPublic || optPublicZoom);
    const canWatchRecording = isEnrolled || item.category === 'orientation' || item.isPublic;

    return (
      <div
        key={item.id}
        className="rounded-2xl overflow-hidden academy-elevated border border-teal-500/30 bg-[#071220]"
      >
        <div className={`relative ${inModal ? 'h-48' : 'h-40'} w-full overflow-hidden bg-slate-950`}>
          <img
            src={resolveThumbnailUrl(item.thumbnailUrl)}
            alt={item.title}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = ACADEMY_ASSETS.orientationLive;
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071220] via-[#071220]/50 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-teal-300 font-semibold">
            <span className="px-2 py-0.5 rounded-full bg-slate-950/80 border border-teal-500/40">
              {getCategoryLabel(item.category)}
            </span>
            <span className="font-mono-tabular bg-slate-950/80 px-2 py-0.5 rounded-full">
              {item.localTimeDisplay} · {item.duration}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs academy-text-secondary">
            <span>
              {item.courseTitle} · Faculty: <strong className="text-white">{item.instructorName}</strong>
            </span>
            <span className="font-mono-tabular text-[11px] academy-text-muted">
              Source: {item.sourceTimeSummary}
            </span>
          </div>

          <h4 className="font-display text-base font-bold text-white">{item.title}</h4>
          <p className="text-xs academy-text-secondary leading-relaxed">{item.description}</p>

          {/* Zoom Meeting Links */}
          {item.zoomJoinUrl && (
            <div className="pt-2 border-t academy-divider space-y-2">
              {canJoinZoom ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-xs academy-text-secondary font-mono-tabular">
                    {item.zoomMeetingId && <span>Meeting ID: {item.zoomMeetingId}</span>}
                    {item.zoomPasscode && <span>Passcode: {item.zoomPasscode}</span>}
                  </div>
                  <a
                    href={item.zoomJoinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-teal-400 hover:bg-teal-300 text-slate-950 transition-colors whitespace-nowrap shadow-sm"
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
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300"
                    >
                      Enroll Now
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Watch Recording Action */}
          {item.category === 'recording_release' && item.courseId && onOpenWatchCourse && (
            <div className="pt-2 border-t academy-divider">
              {canWatchRecording ? (
                <button
                  type="button"
                  onClick={() => onOpenWatchCourse(item.courseId!)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-teal-400 hover:bg-teal-300 text-slate-950 transition-colors whitespace-nowrap shadow-sm"
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
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-400 text-slate-950"
                    >
                      Enroll Now
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Course Launch Action */}
          {item.category === 'course_launch' &&
            item.courseId &&
            !enrolledCourseIds.includes(item.courseId) &&
            onEnrollCourse && (
              <div className="pt-2 border-t academy-divider">
                <button
                  type="button"
                  onClick={() => onEnrollCourse(item.courseId!)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-teal-400 hover:bg-teal-300 text-slate-950 transition-colors whitespace-nowrap shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Enroll in Launching Cohort</span>
                </button>
              </div>
            )}
        </div>
      </div>
    );
  }
};
