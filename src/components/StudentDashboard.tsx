import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Video,
  Calendar,
  Mail,
  Send,
  Play,
  ExternalLink,
  CheckCircle2,
  Circle,
  Inbox,
  Plus,
  FileText,
  Upload,
  Download,
  Globe,
  MessageSquarePlus,
  Compass,
  Sparkles,
} from 'lucide-react';
import { AnimatedPdfViewer } from './AnimatedPdfViewer.tsx';
import {
  Course,
  Enrollment,
  CourseEvent,
  Lesson,
  Message,
  Profile,
  HomeworkSubmission,
  HomeworkGradeStatus,
} from '../types.ts';
import { resolveThumbnailUrl, ACADEMY_ASSETS } from '../lib/assets.ts';
import { InteractiveCalendar } from './InteractiveCalendar.tsx';
import { PathOfKnowledgeRoadmap } from './PathOfKnowledgeRoadmap.tsx';
import { CourseCompletionChart } from './CourseCompletionChart.tsx';
import { AttendanceStreakCard } from './AttendanceStreakCard.tsx';
import { GRADE_STATUS_META } from './CourseWatchView.tsx';
import {
  convertClassTimeToRegion,
  getDetectedUserTimezone,
  WORLD_TIMEZONES,
} from '../lib/timezone.ts';

interface StudentDashboardProps {
  profile: Profile | null;
  courses: Course[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  events: CourseEvent[];
  messages: Message[];
  homework: HomeworkSubmission[];
  allProfiles: Profile[];
  onWatchCourse: (course: Course) => void;
  onEnrollCourse: (courseId: number) => Promise<void>;
  onToggleLessonProgress?: (courseId: number, lessonId: number) => Promise<void>;
  onSendMessage: (receiverId: number, subject: string, body: string) => Promise<void>;
  onMarkMessageRead: (messageId: number) => Promise<void>;
  onSubmitHomework: (
    courseId: number,
    lessonId: number | null,
    title: string,
    content: string,
    attachmentUrl?: string | null
  ) => Promise<void>;
  onGradeHomework?: (
    submissionId: number,
    status: HomeworkGradeStatus,
    grade: string,
    feedback: string
  ) => Promise<void>;
  onSubmitFeedback?: (
    feedbackType: 'class' | 'website',
    categoryLabel: string,
    rating: number,
    comment: string
  ) => Promise<void>;
  onUploadFile: (file: File) => Promise<string>;
  onBrowseCourses: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  profile,
  courses,
  lessons,
  enrollments,
  events,
  messages,
  homework,
  allProfiles,
  onWatchCourse,
  onEnrollCourse,
  onToggleLessonProgress,
  onSendMessage,
  onMarkMessageRead,
  onSubmitHomework,
  onGradeHomework,
  onSubmitFeedback,
  onUploadFile,
  onBrowseCourses,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'roadmap' | 'homework' | 'feedback' | 'zoom' | 'calendar' | 'inbox'
  >('overview');
  const [calendarCourseFilter, setCalendarCourseFilter] = useState<number | null>(null);

  const detectedTz = useMemo(() => getDetectedUserTimezone(), []);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(detectedTz);

  // Tutor Chat / Inbox Compose State
  const [inboxMode, setInboxMode] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [recipientId, setRecipientId] = useState<number>(() => {
    const founder = allProfiles.find(
      (p) =>
        p.uid === 'founder-mustaqeem-shaikh' ||
        p.role === 'admin' ||
        p.role === 'instructor'
    );
    return founder?.id || allProfiles[0]?.id || 1;
  });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const myEnrollments = useMemo(() => {
    if (!profile) return [];
    return enrollments.filter((e) => e.studentId === profile.id);
  }, [enrollments, profile]);

  const enrolledCourseIds = useMemo(
    () => myEnrollments.map((e) => e.courseId),
    [myEnrollments]
  );

  const enrolledCourses = useMemo(
    () => courses.filter((c) => enrolledCourseIds.includes(c.id)),
    [courses, enrolledCourseIds]
  );

  // Homework Form State
  const [hwCourseId, setHwCourseId] = useState<number>(
    enrolledCourses[0]?.id || courses[0]?.id || 0
  );
  const [hwLessonId, setHwLessonId] = useState<string>('');
  const [hwTitle, setHwTitle] = useState('');
  const [hwContent, setHwContent] = useState('');
  const [hwAttachment, setHwAttachment] = useState('');
  const [uploadingHwFile, setUploadingHwFile] = useState(false);
  const [submittingHw, setSubmittingHw] = useState(false);

  // Tutor Feedback & Grade Status Editor State inside Homework Component
  const [openTutorEditorId, setOpenTutorEditorId] = useState<number | null>(null);
  const [activePdfModal, setActivePdfModal] = useState<{ url: string; title: string } | null>(
    null
  );
  const [tutorFeedbackDrafts, setTutorFeedbackDrafts] = useState<
    Record<number, { status: HomeworkGradeStatus; grade: string; feedback: string }>
  >({});
  const [savingTutorFeedbackId, setSavingTutorFeedbackId] = useState<number | null>(null);

  // Student Class & Website Feedback State
  const [feedbackType, setFeedbackType] = useState<'class' | 'website'>('class');
  const [feedbackCourseId, setFeedbackCourseId] = useState<number>(
    enrolledCourses[0]?.id || courses[0]?.id || 0
  );
  const [feedbackAspect, setFeedbackAspect] = useState<string>('Live Zoom Sessions & Pedagogy');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const [localFeedbackEntries, setLocalFeedbackEntries] = useState<
    Array<{
      id: string;
      type: 'class' | 'website';
      categoryLabel: string;
      rating: number;
      comment: string;
      createdAt: string;
    }>
  >([]);

  // Overall Academy Course Progress Metrics
  const overallProgressStats = useMemo(() => {
    let totalLessons = 0;
    let totalCompleted = 0;

    enrolledCourses.forEach((c) => {
      const cLessons = lessons.filter((l) => l.courseId === c.id);
      totalLessons += cLessons.length;
      const enrollment = myEnrollments.find((e) => e.courseId === c.id);
      if (enrollment?.completedLessonIds) {
        try {
          const parsed = JSON.parse(enrollment.completedLessonIds);
          if (Array.isArray(parsed)) {
            totalCompleted += parsed.length;
          }
        } catch {
          // ignore
        }
      }
    });

    const avgPercentage =
      myEnrollments.length > 0
        ? Math.round(
            myEnrollments.reduce((acc, e) => acc + (e.progressPercentage || 0), 0) /
              myEnrollments.length
          )
        : 0;

    const gradedHwCount = homework.filter(
      (h) => h.status === 'graded' || h.status === 'exemplary'
    ).length;

    return {
      totalLessons,
      totalCompleted,
      avgPercentage,
      gradedHwCount,
    };
  }, [enrolledCourses, lessons, myEnrollments, homework]);

  const feedbackMessages = useMemo(
    () =>
      messages.filter(
        (m) =>
          m.subject.startsWith('[CLASS_FEEDBACK]') ||
          m.subject.startsWith('[WEBSITE_FEEDBACK]')
      ),
    [messages]
  );

  // Scheduled Zoom Meetings for Enrolled Courses + Public Orientation Sessions
  const myScheduledZoomMeetings = useMemo(() => {
    return events.filter(
      (ev) =>
        (ev.courseId && enrolledCourseIds.includes(ev.courseId)) ||
        ev.eventType === 'orientation' ||
        profile?.role === 'admin'
    );
  }, [events, enrolledCourseIds, profile]);

  const profileMap = useMemo(() => {
    const m = new Map<number, Profile>();
    allProfiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [allProfiles]);

  const incomingMessages = useMemo(() => {
    if (!profile) return [];
    return messages.filter((m) => m.receiverId === profile.id);
  }, [messages, profile]);

  const sentMessages = useMemo(() => {
    if (!profile) return [];
    return messages.filter((m) => m.senderId === profile.id);
  }, [messages, profile]);

  const unreadCount = useMemo(
    () => incomingMessages.filter((m) => !m.readStatus).length,
    [incomingMessages]
  );

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSendingMsg(true);
    try {
      await onSendMessage(recipientId, subject.trim(), body.trim());
      setSubject('');
      setBody('');
      setInboxMode('sent');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleHomeworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCourseId = hwCourseId || enrolledCourses[0]?.id;
    if (!targetCourseId || !hwTitle.trim() || !hwContent.trim()) return;
    setSubmittingHw(true);
    try {
      await onSubmitHomework(
        targetCourseId,
        hwLessonId ? Number(hwLessonId) : null,
        hwTitle.trim(),
        hwContent.trim(),
        hwAttachment || null
      );
      setHwTitle('');
      setHwContent('');
      setHwAttachment('');
    } finally {
      setSubmittingHw(false);
    }
  };

  const handleSaveTutorGradeFeedback = async (hw: HomeworkSubmission) => {
    if (!onGradeHomework) return;
    const draft = tutorFeedbackDrafts[hw.id] || {
      status: hw.status === 'submitted' ? 'graded' : hw.status,
      grade: hw.grade || 'A (95%)',
      feedback:
        hw.feedback ||
        'MashaAllah, insightful reflection and strong command of primary sources.',
    };
    setSavingTutorFeedbackId(hw.id);
    try {
      await onGradeHomework(hw.id, draft.status, draft.grade, draft.feedback);
      setOpenTutorEditorId(null);
    } finally {
      setSavingTutorFeedbackId(null);
    }
  };

  const handleFeedbackFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComment.trim()) return;
    setSubmittingFeedback(true);
    try {
      const selectedCourseObj =
        courses.find((c) => c.id === feedbackCourseId) || enrolledCourses[0] || courses[0];
      const categoryLabel =
        feedbackType === 'class'
          ? `${selectedCourseObj?.title || 'Academy Course'} — ${feedbackAspect}`
          : `Deen Hijrah Website — ${feedbackAspect}`;

      if (onSubmitFeedback) {
        await onSubmitFeedback(
          feedbackType,
          categoryLabel,
          feedbackRating,
          feedbackComment.trim()
        );
      } else {
        await onSendMessage(
          recipientId,
          `[${feedbackType === 'class' ? 'CLASS_FEEDBACK' : 'WEBSITE_FEEDBACK'}] ${categoryLabel} (${feedbackRating}/5)`,
          feedbackComment.trim()
        );
      }

      setLocalFeedbackEntries((prev) => [
        {
          id: `${Date.now()}`,
          type: feedbackType,
          categoryLabel,
          rating: feedbackRating,
          comment: feedbackComment.trim(),
          createdAt: new Date().toLocaleDateString(),
        },
        ...prev,
      ]);
      setFeedbackComment('');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 space-y-8">
      {/* Top Student Dashboard Header with Country Timezone Sync */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b academy-divider">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-teal-400">
            <Globe className="w-3.5 h-3.5" />
            <span>
              Student Learning Portal · Synced Country Timezone:{' '}
              <strong className="font-mono-tabular">{selectedTimezone}</strong>
            </span>
            <select
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              title="Sync all course class times, Zoom meetings, and course calendars to your country timezone"
              className="ml-1 px-2.5 py-1 rounded-md academy-elevated border border-teal-500/30 text-xs font-medium text-white focus:outline-none focus:border-teal-400 cursor-pointer"
            >
              <option value={detectedTz} className="bg-slate-900 text-white">
                Auto-Detected ({detectedTz})
              </option>
              {WORLD_TIMEZONES.filter((w) => w.tz !== detectedTz).map((w) => (
                <option key={w.tz} value={w.tz} className="bg-slate-900 text-white">
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <h1 className="font-display text-3xl font-bold">
            As-salamu alaykum, {profile?.fullName || 'Scholar'}
          </h1>
          <p className="text-sm academy-text-secondary">
            Watch class recordings for your enrolled courses, join scheduled live Zoom sessions in
            your local country time, submit homework assignments, and chat directly with Ustadh
            Mustaqeem Shaikh.
          </p>
        </div>

        {/* Dashboard Section Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg academy-elevated shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-teal-400 text-slate-950 font-semibold'
                : 'academy-text-secondary hover:text-teal-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>My Courses &amp; Progress ({enrolledCourses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roadmap')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'roadmap'
                ? 'bg-teal-400 text-slate-950 font-semibold'
                : 'academy-text-secondary hover:text-teal-300'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Path of Knowledge</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('homework')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'homework'
                ? 'bg-teal-400 text-slate-950 font-semibold'
                : 'academy-text-secondary hover:text-teal-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Homework &amp; Faculty Feedback ({homework.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'feedback'
                ? 'bg-teal-400 text-slate-950 font-semibold'
                : 'academy-text-secondary hover:text-teal-300'
            }`}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Class &amp; Website Feedback</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('zoom')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'zoom'
                ? 'bg-teal-400 text-slate-950 font-semibold'
                : 'academy-text-secondary hover:text-teal-300'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Zoom Meetings ({myScheduledZoomMeetings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCalendarCourseFilter(null);
              setActiveTab('calendar');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-teal-400 text-slate-950 font-semibold'
                : 'academy-text-secondary hover:text-teal-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Course Calendars</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'inbox'
                ? 'bg-teal-400 text-slate-950 font-semibold'
                : 'academy-text-secondary hover:text-teal-300'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Chat with Tutor {unreadCount > 0 ? `(${unreadCount})` : ''}</span>
          </button>
        </div>
      </div>

      {/* ATTENDANCE STREAK COUNTER & DAILY ISTIQAMAH CARD */}
      <AttendanceStreakCard
        studentId={profile?.id || profile?.uid || 'guest-seeker'}
        studentName={profile?.fullName || 'Scholar'}
        selectedTimezone={selectedTimezone}
        onContinueCoursework={() => {
          if (enrolledCourses.length > 0) {
            onWatchCourse(enrolledCourses[0]);
          } else {
            onBrowseCourses();
          }
        }}
      />

      {/* OVERALL COURSE PROGRESS SUMMARY BAR */}
      <div className="rounded-xl academy-surface p-5 border border-teal-500/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-teal-400">
              Academic Course Progress &amp; Completion Tracker
            </div>
            <p className="text-xs academy-text-secondary mt-0.5">
              Track your completed lecture recordings, overall course progress percentage, and
              graded homework status across all enrolled courses.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono-tabular shrink-0">
            <span>
              Overall Progress:{' '}
              <strong className="text-emerald-400">{overallProgressStats.avgPercentage}%</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Lessons Completed:{' '}
              <strong className="text-teal-300">
                {overallProgressStats.totalCompleted}/{overallProgressStats.totalLessons}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Homework Graded:{' '}
              <strong className="text-teal-300">
                {overallProgressStats.gradedHwCount}/{homework.length}
              </strong>
            </span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${overallProgressStats.avgPercentage}%` }}
          />
        </div>
      </div>

      {/* VISUAL 'PATH OF KNOWLEDGE' PROGRESS ROADMAP + RECHARTS COMPLETION BAR CHART */}
      {(activeTab === 'overview' || activeTab === 'roadmap') && (
        <div className="space-y-8">
          <CourseCompletionChart
            courses={courses}
            enrolledCourses={enrolledCourses}
            enrollments={myEnrollments}
            lessons={lessons}
            onWatchCourse={onWatchCourse}
            onEnrollCourse={onEnrollCourse}
            onToggleLessonProgress={onToggleLessonProgress}
          />

          <PathOfKnowledgeRoadmap
            courses={courses}
            lessons={lessons}
            enrollments={myEnrollments}
            enrolledCourseIds={enrolledCourseIds}
            events={events}
            homework={homework}
            selectedTimezone={selectedTimezone}
            isAdmin={profile?.role === 'admin'}
            onWatchCourse={onWatchCourse}
            onEnrollCourse={onEnrollCourse}
            onToggleLessonProgress={onToggleLessonProgress}
            onOpenHomeworkForCourse={(courseId, lessonId) => {
              setHwCourseId(courseId);
              setHwLessonId(lessonId ? String(lessonId) : '');
              setActiveTab('homework');
            }}
            onOpenCalendarForCourse={(courseId) => {
              setCalendarCourseFilter(courseId);
              setActiveTab('calendar');
            }}
          />
        </div>
      )}

      {/* TAB 1: OVERVIEW (Enrolled Courses + Course Progress + Upcoming Live Zoom Meetings Summary) */}
      {activeTab === 'overview' && (
        <div className="space-y-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">
                My Enrolled Courses, Progress &amp; Recordings
              </h2>
              <button
                type="button"
                onClick={onBrowseCourses}
                className="text-xs font-semibold text-teal-400 hover:underline whitespace-nowrap"
              >
                + Browse More Courses
              </button>
            </div>

            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => {
                  const enrollment = myEnrollments.find((e) => e.courseId === course.id);
                  const courseLessonsList = lessons
                    .filter((l) => l.courseId === course.id)
                    .sort((a, b) => a.positionOrder - b.positionOrder || a.id - b.id);
                  const courseLessonsCount = courseLessonsList.length;

                  let completedLessonIds: number[] = [];
                  if (enrollment?.completedLessonIds) {
                    try {
                      const parsed = JSON.parse(enrollment.completedLessonIds);
                      if (Array.isArray(parsed)) {
                        completedLessonIds = parsed.map(Number);
                      }
                    } catch {
                      completedLessonIds = [];
                    }
                  }

                  const convertedSchedule = convertClassTimeToRegion(
                    course.launchDate,
                    course.classStartTime || '14:00',
                    course.classTimezone || 'America/New_York',
                    selectedTimezone
                  );

                  // Find scheduled live Zoom sessions for this enrolled course
                  const courseZoomSessions = events.filter(
                    (ev) => ev.courseId === course.id && Boolean(ev.zoomJoinUrl)
                  );
                  const nextLiveSession = courseZoomSessions[0] || null;
                  const convertedZoomTime = nextLiveSession
                    ? convertClassTimeToRegion(
                        nextLiveSession.eventDate,
                        nextLiveSession.startTime,
                        nextLiveSession.sourceTimezone ||
                          course.classTimezone ||
                          'America/New_York',
                        selectedTimezone
                      )
                    : null;

                  return (
                    <div
                      key={course.id}
                      className="rounded-xl overflow-hidden academy-surface flex flex-col justify-between group hover:border-teal-400/50 transition-all"
                    >
                      <div>
                        <div className="relative h-44 overflow-hidden bg-slate-900">
                          <img
                            src={resolveThumbnailUrl(course.thumbnailUrl)}
                            alt={course.title}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                ACADEMY_ASSETS.courseSeerah;
                            }}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#060E1A] via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-teal-300 font-mono-tabular">
                            <span>
                              {completedLessonIds.length}/{courseLessonsCount} Lessons Completed
                            </span>
                            <span className="font-semibold text-emerald-400">
                              {enrollment?.progressPercentage || 0}% Progress
                            </span>
                          </div>
                        </div>

                        <div className="p-5 space-y-3">
                          <div className="text-xs academy-text-secondary">
                            {course.category} · {course.instructorName}
                          </div>
                          <h3 className="font-display text-lg font-bold line-clamp-2">
                            {course.title}
                          </h3>

                          {/* Course Progress Bar & Interactive Lesson Completion Checklist */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                              <span className="academy-text-secondary">Course Progress</span>
                              <span className="text-emerald-400 font-semibold">
                                {enrollment?.progressPercentage || 0}% Complete
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-teal-400 transition-all duration-300"
                                style={{ width: `${enrollment?.progressPercentage || 0}%` }}
                              />
                            </div>

                            {courseLessonsList.length > 0 && onToggleLessonProgress && (
                              <div className="pt-1 space-y-1 max-h-28 overflow-y-auto pr-1">
                                {courseLessonsList.map((lesson) => {
                                  const isDone = completedLessonIds.includes(lesson.id);
                                  return (
                                    <button
                                      key={lesson.id}
                                      type="button"
                                      onClick={() => onToggleLessonProgress(course.id, lesson.id)}
                                      className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded text-[11px] academy-elevated hover:border-teal-400/40 text-left transition-colors"
                                    >
                                      <span className="flex items-center gap-1.5 min-w-0">
                                        {isDone ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        ) : (
                                          <Circle className="w-3.5 h-3.5 academy-text-muted shrink-0" />
                                        )}
                                        <span
                                          className={`truncate ${
                                            isDone
                                              ? 'text-emerald-300 font-medium'
                                              : 'academy-text-secondary'
                                          }`}
                                        >
                                          {lesson.title}
                                        </span>
                                      </span>
                                      <span className="font-mono-tabular text-[10px] shrink-0 academy-text-muted">
                                        {isDone ? 'Done' : lesson.duration}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="pt-1 text-xs text-teal-400 font-mono-tabular">
                            Class Time ({selectedTimezone}): {course.classDays || 'Sat & Wed'} ·{' '}
                            {convertedSchedule.formattedLocalTime}
                          </div>

                          {/* Scheduled Live Zoom Session Box on Enrolled Course Card */}
                          {nextLiveSession && convertedZoomTime && (
                            <div className="p-3 rounded-lg academy-elevated border border-teal-500/30 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-teal-300 font-semibold">
                                <span className="flex items-center gap-1">
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Live Zoom Scheduled</span>
                                </span>
                                <span className="font-mono-tabular">
                                  {convertedZoomTime.formattedLocalDate}
                                </span>
                              </div>
                              <div className="text-xs font-semibold truncate">
                                {nextLiveSession.title}
                              </div>
                              <div className="text-[11px] academy-text-secondary font-mono-tabular">
                                Local Time:{' '}
                                <strong className="text-teal-300">
                                  {convertedZoomTime.formattedLocalTime}
                                </strong>
                                {nextLiveSession.zoomPasscode
                                  ? ` · Passcode: ${nextLiveSession.zoomPasscode}`
                                  : ''}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-5 pt-0 space-y-2">
                        {/* Direct 'Join Meeting' Button for Enrolled Course with Scheduled Live Zoom Session */}
                        {nextLiveSession?.zoomJoinUrl && (
                          <a
                            href={nextLiveSession.zoomJoinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap shadow-sm"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Join Meeting</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onWatchCourse(course)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                              nextLiveSession?.zoomJoinUrl
                                ? 'academy-elevated hover:border-teal-400 text-teal-300'
                                : 'bg-teal-400 text-slate-950 hover:bg-teal-300'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Watch Class Recordings</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarCourseFilter(course.id);
                              setActiveTab('calendar');
                            }}
                            title="Open Course-Specific Calendar (Synced with your country timezone)"
                            className="p-2.5 rounded-lg academy-elevated hover:border-teal-400/50 text-teal-400"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl academy-surface p-8 text-center space-y-4">
                <BookOpen className="w-8 h-8 text-teal-400 mx-auto" />
                <div>
                  <h3 className="font-display text-lg font-bold">
                    You Are Not Enrolled in Any Courses Yet
                  </h3>
                  <p className="text-xs academy-text-secondary max-w-md mx-auto mt-1">
                    Only Orientation recordings are visible prior to enrollment. Enroll in a course
                    below to unlock full class recordings, homework submission, and live Zoom
                    meeting links.
                  </p>
                </div>
                {courses.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    {courses.slice(0, 3).map((c) => {
                      const cEnrollments = enrollments.filter((e) => e.courseId === c.id).length;
                      const taken = cEnrollments + (c.initialEnrolledCount || 0);
                      const isFull = c.maxStudents > 0 && taken >= c.maxStudents;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={isFull}
                          onClick={() => onEnrollCourse(c.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                            isFull
                              ? 'bg-rose-500/20 text-rose-300 cursor-not-allowed'
                              : 'bg-teal-400 text-slate-950 hover:bg-teal-300'
                          }`}
                        >
                          {isFull
                            ? `${c.title} (Full: ${taken}/${c.maxStudents})`
                            : `Enroll in ${c.title}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scheduled Live Zoom Meetings Panel with Automatic Local Country Time */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">
                  Scheduled Course Meetings &amp; Live Zoom Classrooms
                </h2>
                <p className="text-xs academy-text-secondary">
                  All meeting times are automatically converted into your synced country timezone (
                  {selectedTimezone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('zoom')}
                className="text-xs font-medium text-teal-400 hover:underline whitespace-nowrap"
              >
                View All Scheduled Meetings
              </button>
            </div>

            {myScheduledZoomMeetings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {myScheduledZoomMeetings.map((meeting) => {
                  const parentCourse = courses.find((c) => c.id === meeting.courseId);
                  const converted = convertClassTimeToRegion(
                    meeting.eventDate,
                    meeting.startTime,
                    meeting.sourceTimezone || parentCourse?.classTimezone || 'America/New_York',
                    selectedTimezone
                  );
                  return (
                    <div
                      key={meeting.id}
                      className="rounded-xl academy-surface p-5 flex flex-col sm:flex-row items-start gap-4 border border-teal-500/25"
                    >
                      <img
                        src={resolveThumbnailUrl(
                          meeting.thumbnailUrl || parentCourse?.thumbnailUrl
                        )}
                        alt={meeting.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            ACADEMY_ASSETS.orientationLive;
                        }}
                        className="w-full sm:w-36 h-28 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
                          <span>{parentCourse?.title || 'Academy Orientation'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">{converted.formattedLocalDate}</span>
                        </div>
                        <h3 className="font-display text-base font-bold">{meeting.title}</h3>
                        <div className="text-xs academy-text-secondary font-mono-tabular">
                          Your Time:{' '}
                          <strong className="text-teal-300">{converted.formattedLocalTime}</strong> (
                          {meeting.duration}) · Faculty: {meeting.instructorName}
                        </div>
                        {(meeting.zoomMeetingId || meeting.zoomPasscode) && (
                          <div className="text-xs academy-text-muted font-mono-tabular">
                            {meeting.zoomMeetingId && `Meeting ID: ${meeting.zoomMeetingId}`}
                            {meeting.zoomPasscode && ` · Passcode: ${meeting.zoomPasscode}`}
                          </div>
                        )}
                        {meeting.zoomJoinUrl && (
                          <div className="pt-1">
                            <a
                              href={meeting.zoomJoinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Meeting</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl academy-surface p-6 text-center text-xs academy-text-secondary">
                No live Zoom meetings are currently scheduled for your enrolled courses.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HOMEWORK SUBMISSION & FACULTY FEEDBACK / GRADE STATUSES */}
      {activeTab === 'homework' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 rounded-xl academy-surface p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-teal-400">
                Submit Course Homework
              </h2>
              <p className="text-xs academy-text-secondary">
                Upload your completed assignment or written reflection for review and grade status
                evaluation by Ustadh Mustaqeem Shaikh.
              </p>

              {enrolledCourses.length === 0 ? (
                <div className="p-6 rounded-lg academy-elevated text-center space-y-3">
                  <p className="text-xs academy-text-secondary">
                    Please enroll in a course first to submit homework assignments.
                  </p>
                  <button
                    type="button"
                    onClick={onBrowseCourses}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950"
                  >
                    Browse Courses
                  </button>
                </div>
              ) : (
                <form onSubmit={handleHomeworkSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Select Enrolled Course *
                    </label>
                    <select
                      value={hwCourseId || enrolledCourses[0]?.id || ''}
                      onChange={(e) => setHwCourseId(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                    >
                      {enrolledCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Homework Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={hwTitle}
                      onChange={(e) => setHwTitle(e.target.value)}
                      placeholder="e.g. Week 2 Morphological Analysis / Seerah Essay"
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                    />
                  </div>

                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Related Lesson (Optional)
                    </label>
                    <select
                      value={hwLessonId}
                      onChange={(e) => setHwLessonId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                    >
                      <option value="">General Course Syllabus Deliverable</option>
                      {lessons
                        .filter((l) => l.courseId === (hwCourseId || enrolledCourses[0]?.id))
                        .map((l) => (
                          <option key={l.id} value={String(l.id)}>
                            {l.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Upload Homework File (PDF, Word, Image, or Notes)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={hwAttachment}
                        onChange={(e) => setHwAttachment(e.target.value)}
                        placeholder="Upload file from computer or paste link ->"
                        className="flex-1 px-3 py-2 text-xs rounded-lg academy-elevated"
                      />
                      <label className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold academy-elevated hover:border-teal-400 whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5 text-teal-400" />
                        <span>{uploadingHwFile ? 'Uploading...' : 'Upload File'}</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingHwFile(true);
                            try {
                              const url = await onUploadFile(file);
                              setHwAttachment(url);
                            } finally {
                              setUploadingHwFile(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Written Response / Assignment Notes *
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={hwContent}
                      onChange={(e) => setHwContent(e.target.value)}
                      placeholder="Write your homework submission here..."
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingHw}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingHw ? 'Submitting...' : 'Submit Homework'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Right 7 Cols: Homework Submissions + Faculty Feedback & Grade Statuses Section */}
            <div className="lg:col-span-7 rounded-xl academy-surface p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b academy-divider">
                <div>
                  <h3 className="font-display text-lg font-bold">
                    Student Submissions &amp; Faculty Feedback Section ({homework.length})
                  </h3>
                  <p className="text-xs academy-text-secondary">
                    Tutors can leave scholarly comments, grade scores, and grade statuses on student
                    submissions below.
                  </p>
                </div>
              </div>

              {homework.length === 0 ? (
                <p className="text-xs academy-text-secondary py-8 text-center">
                  You have not submitted any homework yet. Submit an assignment on the left to
                  receive faculty feedback and grade status updates.
                </p>
              ) : (
                <div className="space-y-4">
                  {homework.map((hw) => {
                    const courseObj = courses.find((c) => c.id === hw.courseId);
                    const statusMeta =
                      GRADE_STATUS_META[hw.status] || GRADE_STATUS_META.submitted;
                    const isTutorOrEditorOpen =
                      profile?.role === 'admin' ||
                      profile?.role === 'instructor' ||
                      openTutorEditorId === hw.id;
                    const draft = tutorFeedbackDrafts[hw.id] || {
                      status: hw.status || 'graded',
                      grade: hw.grade || 'A (95%)',
                      feedback: hw.feedback || '',
                    };

                    return (
                      <div
                        key={hw.id}
                        className="p-5 rounded-xl academy-elevated space-y-3 border border-teal-500/25"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="text-teal-400 font-semibold">
                              {courseObj?.title || 'Course'} · {hw.title}
                            </span>
                            <span className="academy-text-secondary">
                              {' '}
                              · Student: {hw.studentName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono-tabular">
                            <span className={`font-semibold ${statusMeta.colorClass}`}>
                              {statusMeta.label}
                            </span>
                            {hw.grade && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-white font-semibold">Grade: {hw.grade}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <p className="text-xs academy-text-secondary whitespace-pre-line leading-relaxed">
                          {hw.content}
                        </p>

                        {hw.attachmentUrl && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setActivePdfModal({
                                  url: hw.attachmentUrl!,
                                  title: `${hw.studentName} — ${hw.title}`,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Read in Animated Page Reader</span>
                              <Sparkles className="w-3 h-3" />
                            </button>
                            <a
                              href={hw.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400 text-teal-300"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download File</span>
                            </a>
                          </div>
                        )}

                        {/* Dedicated Faculty Feedback & Grade Status Section */}
                        <div className="pt-3 border-t academy-divider space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-teal-300">
                              Faculty Feedback Section · Tutor: Ustadh{' '}
                              {courseObj?.instructorName || 'Mustaqeem Shaikh'}
                            </div>
                            {profile?.role !== 'admin' &&
                              profile?.role !== 'instructor' &&
                              onGradeHomework && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenTutorEditorId(
                                      openTutorEditorId === hw.id ? null : hw.id
                                    )
                                  }
                                  className="text-[11px] font-medium text-teal-400 hover:underline whitespace-nowrap"
                                >
                                  {openTutorEditorId === hw.id
                                    ? 'Hide Tutor Grading Controls'
                                    : 'Tutor Review / Update Grade Status'}
                                </button>
                              )}
                          </div>

                          {hw.feedback ? (
                            <div className="p-3 rounded-lg academy-surface border border-teal-500/20 text-xs space-y-1">
                              <div className="flex items-center justify-between text-[11px] academy-text-muted font-mono-tabular">
                                <span>Grade Status: {statusMeta.label}</span>
                                <span>Score: {hw.grade || 'Reviewed'}</span>
                              </div>
                              <p className="text-xs academy-text-secondary whitespace-pre-line leading-relaxed">
                                {hw.feedback}
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg academy-surface text-xs academy-text-muted">
                              Awaiting faculty comment and grade status from Ustadh{' '}
                              {courseObj?.instructorName || 'Mustaqeem Shaikh'}.
                            </div>
                          )}

                          {/* Interactive Tutor Comment & Grade Status Controls */}
                          {isTutorOrEditorOpen && onGradeHomework && (
                            <div className="p-3.5 rounded-lg academy-surface border border-teal-500/30 space-y-3">
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
                                Leave Tutor Comment &amp; Set Grade Status
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] academy-text-secondary mb-1">
                                    Grade Status
                                  </label>
                                  <select
                                    value={draft.status}
                                    onChange={(e) =>
                                      setTutorFeedbackDrafts((prev) => ({
                                        ...prev,
                                        [hw.id]: {
                                          ...draft,
                                          status: e.target.value as HomeworkGradeStatus,
                                        },
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg academy-elevated"
                                  >
                                    <option value="graded">Approved / Graded</option>
                                    <option value="exemplary">Exemplary / Distinction</option>
                                    <option value="needs_revision">Revision Requested</option>
                                    <option value="under_review">Under Tutor Review</option>
                                    <option value="submitted">Submitted · Pending Review</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] academy-text-secondary mb-1">
                                    Grade / Score
                                  </label>
                                  <input
                                    type="text"
                                    value={draft.grade}
                                    onChange={(e) =>
                                      setTutorFeedbackDrafts((prev) => ({
                                        ...prev,
                                        [hw.id]: { ...draft, grade: e.target.value },
                                      }))
                                    }
                                    placeholder="e.g. A+ (98%) / Pass / Resubmit"
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg academy-elevated font-mono-tabular"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] academy-text-secondary mb-1">
                                  Tutor Comments &amp; Scholarly Feedback
                                </label>
                                <textarea
                                  rows={2}
                                  value={draft.feedback}
                                  onChange={(e) =>
                                    setTutorFeedbackDrafts((prev) => ({
                                      ...prev,
                                      [hw.id]: { ...draft, feedback: e.target.value },
                                    }))
                                  }
                                  placeholder="Write faculty feedback comments and guidance for the student..."
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg academy-elevated"
                                />
                              </div>
                              <button
                                type="button"
                                disabled={savingTutorFeedbackId === hw.id}
                                onClick={() => handleSaveTutorGradeFeedback(hw)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  {savingTutorFeedbackId === hw.id
                                    ? 'Saving Feedback...'
                                    : 'Save Faculty Feedback & Grade Status'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2B: STUDENT CLASS & WEBSITE FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 rounded-xl academy-surface p-6 space-y-5 border border-teal-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b academy-divider">
              <div>
                <h2 className="font-display text-lg font-bold text-teal-400">
                  Student Class &amp; Website Feedback
                </h2>
                <p className="text-xs academy-text-secondary">
                  Share your feedback on your enrolled classes, live Zoom seminars, or the Deen
                  Hijrah Academia website experience.
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg academy-elevated shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackType('class');
                    setFeedbackAspect('Live Zoom Sessions & Pedagogy');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    feedbackType === 'class'
                      ? 'bg-teal-400 text-slate-950 font-semibold'
                      : 'academy-text-secondary hover:text-teal-300'
                  }`}
                >
                  Class Feedback
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackType('website');
                    setFeedbackAspect('Video Player & Curriculum Sidebar');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    feedbackType === 'website'
                      ? 'bg-teal-400 text-slate-950 font-semibold'
                      : 'academy-text-secondary hover:text-teal-300'
                  }`}
                >
                  Website Feedback
                </button>
              </div>
            </div>

            <form onSubmit={handleFeedbackFormSubmit} className="space-y-4">
              {feedbackType === 'class' && (
                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Select Course / Class *
                  </label>
                  <select
                    value={feedbackCourseId || enrolledCourses[0]?.id || courses[0]?.id || ''}
                    onChange={(e) => setFeedbackCourseId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                  >
                    {(enrolledCourses.length > 0 ? enrolledCourses : courses).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.instructorName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    {feedbackType === 'class' ? 'Class Area / Aspect' : 'Website Feature / Area'}
                  </label>
                  <select
                    value={feedbackAspect}
                    onChange={(e) => setFeedbackAspect(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg academy-elevated"
                  >
                    {feedbackType === 'class' ? (
                      <>
                        <option value="Live Zoom Sessions & Pedagogy">
                          Live Zoom Sessions &amp; Pedagogy
                        </option>
                        <option value="Class Recordings & Audio Quality">
                          Class Recordings &amp; Audio Quality
                        </option>
                        <option value="Syllabus Modules & Reading Folios">
                          Syllabus Modules &amp; Reading Folios
                        </option>
                        <option value="Homework & Tutor Guidance">
                          Homework &amp; Tutor Guidance
                        </option>
                      </>
                    ) : (
                      <>
                        <option value="Video Player & Curriculum Sidebar">
                          Video Player &amp; Curriculum Sidebar
                        </option>
                        <option value="Country Timezone Calendar Sync">
                          Country Timezone Calendar Sync
                        </option>
                        <option value="Student Dashboard & Progress Tracker">
                          Student Dashboard &amp; Progress Tracker
                        </option>
                        <option value="Overall Website Design & Navigation">
                          Overall Website Design &amp; Navigation
                        </option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Overall Rating (1 to 5)
                  </label>
                  <select
                    value={feedbackRating}
                    onChange={(e) => setFeedbackRating(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg academy-elevated font-mono-tabular"
                  >
                    <option value={5}>5 / 5 — Excellent</option>
                    <option value={4}>4 / 5 — Very Good</option>
                    <option value={3}>3 / 5 — Satisfactory</option>
                    <option value={2}>2 / 5 — Needs Improvement</option>
                    <option value={1}>1 / 5 — Poor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs academy-text-secondary mb-1">
                  Your {feedbackType === 'class' ? 'Class' : 'Website'} Feedback &amp; Suggestions *
                </label>
                <textarea
                  rows={4}
                  required
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder={
                    feedbackType === 'class'
                      ? 'Share your feedback on the class lectures, Q&A discussions, or study materials...'
                      : 'Share your feedback on website navigation, video playback, or features you would like added...'
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                />
              </div>

              <button
                type="submit"
                disabled={submittingFeedback}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {submittingFeedback
                    ? 'Submitting Feedback...'
                    : `Submit ${feedbackType === 'class' ? 'Class' : 'Website'} Feedback`}
                </span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 rounded-xl academy-surface p-6 space-y-4">
            <h3 className="font-display text-lg font-bold">
              Submitted Class &amp; Website Feedback Log
            </h3>
            {localFeedbackEntries.length === 0 && feedbackMessages.length === 0 ? (
              <p className="text-xs academy-text-secondary py-8 text-center">
                You have not submitted any class or website feedback yet.
              </p>
            ) : (
              <div className="space-y-3">
                {localFeedbackEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-lg academy-elevated border border-teal-500/20 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-mono-tabular">
                      <span className="font-semibold text-teal-400">
                        {entry.type === 'class' ? 'Class Feedback' : 'Website Feedback'} ·{' '}
                        {entry.categoryLabel}
                      </span>
                      <span className="text-emerald-400">Rating: {entry.rating}/5</span>
                    </div>
                    <p className="academy-text-secondary whitespace-pre-line">{entry.comment}</p>
                  </div>
                ))}
                {feedbackMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-lg academy-elevated border border-teal-500/20 space-y-1.5 text-xs"
                  >
                    <div className="font-semibold text-teal-400">{msg.subject}</div>
                    <p className="academy-text-secondary whitespace-pre-line">{msg.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DEDICATED ZOOM MEETINGS VIEW */}
      {activeTab === 'zoom' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold">
              All Live Zoom Sessions &amp; Orientation Links ({selectedTimezone})
            </h2>
            <p className="text-xs academy-text-secondary mt-1">
              Click &ldquo;Join Meeting&rdquo; at the scheduled local time in your country to enter
              the live Zoom session with Ustadh Mustaqeem Shaikh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((meeting) => {
              const parentCourse = courses.find((c) => c.id === meeting.courseId);
              const isEnrolled =
                !meeting.courseId ||
                enrolledCourseIds.includes(meeting.courseId) ||
                meeting.eventType === 'orientation' ||
                profile?.role === 'admin';
              const converted = convertClassTimeToRegion(
                meeting.eventDate,
                meeting.startTime,
                meeting.sourceTimezone || parentCourse?.classTimezone || 'America/New_York',
                selectedTimezone
              );

              return (
                <div
                  key={meeting.id}
                  className="rounded-xl academy-surface p-5 flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <img
                      src={resolveThumbnailUrl(
                        meeting.thumbnailUrl || parentCourse?.thumbnailUrl
                      )}
                      alt={meeting.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          ACADEMY_ASSETS.orientationLive;
                      }}
                      className="w-full sm:w-40 h-28 rounded-lg object-cover shrink-0"
                    />
                    <div className="space-y-1.5 flex-1">
                      <div className="text-xs text-teal-400 font-medium">
                        {parentCourse?.title || 'Academy Orientation'} ·{' '}
                        <span className="font-mono-tabular">{converted.formattedLocalDate}</span>
                      </div>
                      <h3 className="font-display text-base font-bold">{meeting.title}</h3>
                      <p className="text-xs academy-text-secondary line-clamp-2">
                        {meeting.description}
                      </p>
                      <div className="text-xs font-mono-tabular text-teal-300">
                        Your Time: {converted.formattedLocalTime} ({meeting.duration})
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t academy-divider flex items-center justify-between gap-3">
                    <div className="text-xs font-mono-tabular academy-text-secondary">
                      {meeting.zoomMeetingId
                        ? `ID: ${meeting.zoomMeetingId} ${
                            meeting.zoomPasscode ? `· Pass: ${meeting.zoomPasscode}` : ''
                          }`
                        : 'Live Zoom Seminar'}
                    </div>
                    {isEnrolled && meeting.zoomJoinUrl ? (
                      <a
                        href={meeting.zoomJoinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join Meeting</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : meeting.courseId ? (
                      <button
                        type="button"
                        onClick={() => onEnrollCourse(meeting.courseId!)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold academy-elevated text-teal-400 hover:border-teal-400 whitespace-nowrap"
                      >
                        Enroll to Unlock Zoom Link
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: COURSE-SPECIFIC OR MASTER STUDENT CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {calendarCourseFilter && (
            <div className="flex items-center justify-between p-3 rounded-lg academy-elevated">
              <span className="text-xs">
                Showing specific calendar for:{' '}
                <strong className="text-teal-400">
                  {courses.find((c) => c.id === calendarCourseFilter)?.title}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setCalendarCourseFilter(null)}
                className="text-xs text-teal-400 hover:underline"
              >
                Show All Courses Calendar
              </button>
            </div>
          )}

          <InteractiveCalendar
            courses={courses}
            events={events}
            lessons={lessons}
            enrolledCourseIds={enrolledCourseIds}
            isAdmin={profile?.role === 'admin'}
            fixedCourseId={calendarCourseFilter}
            externalTimezone={selectedTimezone}
            onExternalTimezoneChange={setSelectedTimezone}
            onEnrollCourse={onEnrollCourse}
            onOpenWatchCourse={(cId) => {
              const found = courses.find((c) => c.id === cId);
              if (found) onWatchCourse(found);
            }}
          />
        </div>
      )}

      {/* TAB 5: CHAT WITH TUTOR / STUDENT INBOX */}
      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 rounded-xl academy-surface p-5 space-y-3">
            <h3 className="font-display text-base font-bold text-teal-400">
              Chat with Tutor &amp; Inbox
            </h3>
            <p className="text-xs academy-text-secondary">
              Send academic questions directly to Ustadh Mustaqeem Shaikh and view tutor replies.
            </p>
            <div className="space-y-1.5 pt-2">
              <button
                type="button"
                onClick={() => setInboxMode('inbox')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  inboxMode === 'inbox'
                    ? 'bg-teal-400 text-slate-950 font-semibold'
                    : 'academy-elevated hover:border-teal-400/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Inbox className="w-4 h-4" />
                  <span>Tutor Replies (Inbox)</span>
                </span>
                <span className="font-mono-tabular">{incomingMessages.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setInboxMode('sent')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  inboxMode === 'sent'
                    ? 'bg-teal-400 text-slate-950 font-semibold'
                    : 'academy-elevated hover:border-teal-400/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>My Sent Messages</span>
                </span>
                <span className="font-mono-tabular">{sentMessages.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setInboxMode('compose')}
                className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  inboxMode === 'compose'
                    ? 'bg-teal-400 text-slate-950'
                    : 'academy-surface border border-teal-500/40 text-teal-400 hover:bg-teal-500/10'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Message Tutor (Mustaqeem Shaikh)</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 rounded-xl academy-surface p-6">
            {inboxMode === 'compose' ? (
              <form onSubmit={handleComposeSubmit} className="space-y-4">
                <h3 className="font-display text-lg font-bold text-teal-400">
                  Send Message to Tutor
                </h3>
                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Recipient Tutor / Faculty
                  </label>
                  <select
                    value={recipientId}
                    onChange={(e) => setRecipientId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                  >
                    {allProfiles
                      .filter((p) => p.role === 'admin' || p.role === 'instructor')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.title || 'Principal Faculty'})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs academy-text-secondary mb-1">Topic / Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Question regarding lesson recording or homework..."
                    className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs academy-text-secondary mb-1">Message</label>
                  <textarea
                    rows={5}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your question to Ustadh Mustaqeem Shaikh..."
                    className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingMsg}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingMsg ? 'Sending...' : 'Send Message to Tutor'}</span>
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <h3 className="font-display text-lg font-bold">
                  {inboxMode === 'inbox' ? 'Tutor Replies' : 'My Sent Messages'}
                </h3>
                {(inboxMode === 'inbox' ? incomingMessages : sentMessages).length === 0 ? (
                  <div className="py-8 text-center text-xs academy-text-secondary">
                    No messages in this folder yet. Click &ldquo;Message Tutor (Mustaqeem
                    Shaikh)&rdquo; to start a conversation.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(inboxMode === 'inbox' ? incomingMessages : sentMessages).map((msg) => {
                      const otherParty =
                        inboxMode === 'inbox'
                          ? profileMap.get(msg.senderId)
                          : profileMap.get(msg.receiverId);
                      return (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-lg academy-elevated border ${
                            !msg.readStatus && inboxMode === 'inbox'
                              ? 'border-teal-400'
                              : 'border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs academy-text-secondary mb-1">
                            <span>
                              {inboxMode === 'inbox' ? 'From: ' : 'To: '}
                              <strong className="text-teal-400">
                                {otherParty?.fullName || 'Ustadh Mustaqeem Shaikh'}
                              </strong>
                            </span>
                            <div className="flex items-center gap-3">
                              {!msg.readStatus && inboxMode === 'inbox' && (
                                <button
                                  type="button"
                                  onClick={() => onMarkMessageRead(msg.id)}
                                  className="inline-flex items-center gap-1 text-teal-400 hover:underline"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Mark Read</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-sm font-semibold">{msg.subject}</div>
                          <p className="text-xs academy-text-secondary mt-1.5 whitespace-pre-line">
                            {msg.body}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Interactive Fullscreen Animated PDF Reader Modal */}
      {activePdfModal && (
        <AnimatedPdfViewer
          url={activePdfModal.url}
          title={activePdfModal.title}
          onClose={() => setActivePdfModal(null)}
          variant="modal"
        />
      )}
    </div>
  );
};
