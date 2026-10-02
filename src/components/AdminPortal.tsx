import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Video,
  Calendar,
  Film,
  Mail,
  Users,
  Plus,
  Trash2,
  Edit3,
  Upload,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Send,
  ShieldAlert,
  FileText,
  Globe,
  CheckCircle2,
  UserCheck,
  Download,
} from 'lucide-react';
import {
  Course,
  Lesson,
  CourseEvent,
  HomepageSlide,
  Profile,
  Enrollment,
  Message,
  SyllabusBox,
  HomeworkSubmission,
} from '../types.ts';
import { PRESET_THUMBNAILS, resolveThumbnailUrl, ACADEMY_ASSETS } from '../lib/assets.ts';
import { WORLD_TIMEZONES, getDetectedUserTimezone } from '../lib/timezone.ts';

export type AdminModule =
  | 'courses'
  | 'lessons'
  | 'zoom_calendar'
  | 'homework'
  | 'homepage_media'
  | 'inbox'
  | 'users';

interface AdminPortalProps {
  initialModule?: AdminModule;
  profile: Profile | null;
  courses: Course[];
  lessons: Lesson[];
  events: CourseEvent[];
  slides: HomepageSlide[];
  profiles: Profile[];
  enrollments: Enrollment[];
  messages: Message[];
  homework: HomeworkSubmission[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onUploadFile: (file: File) => Promise<string>;
  onRefreshData: () => Promise<void>;
  onNavigateToStudentDashboard: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  initialModule = 'courses',
  profile,
  courses,
  lessons,
  events,
  slides,
  profiles,
  enrollments,
  messages,
  homework,
  authFetch,
  onUploadFile,
  onRefreshData,
  onNavigateToStudentDashboard,
}) => {
  const detectedTz = useMemo(() => getDetectedUserTimezone(), []);
  const isFullAdmin = profile?.role === 'admin';
  const isInstructor = profile?.role === 'instructor';

  // Strict Scoped Teacher Permissions: Teachers only see & manage their assigned courses
  const managedCourses = useMemo(() => {
    if (isFullAdmin) return courses;
    if (isInstructor && profile) {
      return courses.filter(
        (c) =>
          c.instructorId === profile.id ||
          c.instructorName.trim().toLowerCase() === profile.fullName.trim().toLowerCase()
      );
    }
    return [];
  }, [courses, isFullAdmin, isInstructor, profile]);

  const managedCourseIds = useMemo(() => managedCourses.map((c) => c.id), [managedCourses]);

  const managedLessons = useMemo(() => {
    if (isFullAdmin) return lessons;
    return lessons.filter((l) => managedCourseIds.includes(l.courseId));
  }, [lessons, isFullAdmin, managedCourseIds]);

  const managedEvents = useMemo(() => {
    if (isFullAdmin) return events;
    return events.filter((ev) => ev.courseId && managedCourseIds.includes(ev.courseId));
  }, [events, isFullAdmin, managedCourseIds]);

  const managedHomework = useMemo(() => {
    if (isFullAdmin) return homework;
    return homework.filter((h) => managedCourseIds.includes(h.courseId));
  }, [homework, isFullAdmin, managedCourseIds]);

  const [activeModule, setActiveModule] = useState<AdminModule>(() => {
    if (isInstructor && initialModule === 'courses') return 'lessons';
    return initialModule;
  });
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [confirmClearBlank, setConfirmClearBlank] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>('Auto-saved to Cloud SQL');

  // Course Form State
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState('Seerah & History');
  const [coursePrice, setCoursePrice] = useState('Free');
  const [courseDuration, setCourseDuration] = useState('12 Weeks');
  const [courseInstructor, setCourseInstructor] = useState(() =>
    isInstructor && profile ? profile.fullName : 'Mustaqeem Shaikh'
  );
  const [courseLaunchDate, setCourseLaunchDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  });
  const [courseMaxStudents, setCourseMaxStudents] = useState<number>(30);
  const [courseInitialEnrolled, setCourseInitialEnrolled] = useState<number>(0);
  const [courseClassDays, setCourseClassDays] = useState('Saturday & Wednesday');
  const [courseClassStartTime, setCourseClassStartTime] = useState('14:00');
  const [courseClassTimezone, setCourseClassTimezone] = useState(detectedTz || 'America/New_York');
  const [courseShortDesc, setCourseShortDesc] = useState('');
  const [courseLongDesc, setCourseLongDesc] = useState('');
  const [courseSyllabusText, setCourseSyllabusText] = useState('');
  const [courseSyllabusFileUrl, setCourseSyllabusFileUrl] = useState('');
  const [uploadingSyllabusFile, setUploadingSyllabusFile] = useState(false);
  const [courseSyllabusBoxes, setCourseSyllabusBoxes] = useState<SyllabusBox[]>([
    {
      week: 'Module 01 · Weeks 1–3',
      title: 'Foundational Sources & Methodology',
      topics: 'Introduction to primary classical texts, historical context, and weekly analytical framework.',
      deliverable: 'Module 1 Written Reflection',
    },
  ]);
  const [courseThumb, setCourseThumb] = useState('preset:seerah');
  const [courseStatus, setCourseStatus] = useState<'published' | 'draft'>('published');
  const [confirmDeleteCourseId, setConfirmDeleteCourseId] = useState<number | null>(null);

  // Lesson & Recording Form State
  const [selectedLessonCourseId, setSelectedLessonCourseId] = useState<number>(
    managedCourses[0]?.id || courses[0]?.id || 0
  );
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  );
  const [uploadingLessonVideo, setUploadingLessonVideo] = useState(false);
  const [uploadingLessonAttachment, setUploadingLessonAttachment] = useState(false);
  const [lessonThumb, setLessonThumb] = useState('preset:seerah');
  const [lessonDuration, setLessonDuration] = useState('45:00');
  const [lessonOrder, setLessonOrder] = useState<number>(1);
  const [lessonFreePreview, setLessonFreePreview] = useState<boolean>(false); // True = Public Orientation Recording, False = Enrolled Class Recording ONLY
  const [lessonAttachment, setLessonAttachment] = useState('');
  const [lessonScheduledDate, setLessonScheduledDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  });

  // Zoom Live Session & Course-Specific Calendar Event Form State (with Source Timezone)
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventCourseId, setEventCourseId] = useState<string>(
    courses[0] ? String(courses[0].id) : ''
  );
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState<
    'zoom_session' | 'orientation' | 'course_launch' | 'recording_release'
  >('zoom_session');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  });
  const [eventStartTime, setEventStartTime] = useState('14:00');
  const [eventSourceTimezone, setEventSourceTimezone] = useState(
    detectedTz || 'America/New_York'
  );
  const [eventDuration, setEventDuration] = useState('60 min');
  const [eventZoomUrl, setEventZoomUrl] = useState('https://zoom.us/j/94827165011');
  const [eventMeetingId, setEventMeetingId] = useState('948 2716 5011');
  const [eventPasscode, setEventPasscode] = useState('HIJRAH26');
  const [eventThumb, setEventThumb] = useState('preset:orientation');
  const [eventInstructor, setEventInstructor] = useState('Mustaqeem Shaikh');

  // Homepage Slide / Video Form State
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [slideBadge, setSlideBadge] = useState('Orientation Session');
  const [slideMediaType, setSlideMediaType] = useState<'video' | 'image'>('video');
  const [slideThumb, setSlideThumb] = useState('preset:hero_academy');
  const [slideVideoUrl, setSlideVideoUrl] = useState(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  );
  const [uploadingSlideVideo, setUploadingSlideVideo] = useState(false);
  const [slideCtaText, setSlideCtaText] = useState('Explore Curriculum');
  const [slideInstructor, setSlideInstructor] = useState('Mustaqeem Shaikh');

  // Admin Inbox State
  const [inboxTab, setInboxTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [replyToProfileId, setReplyToProfileId] = useState<number>(profiles[0]?.id || 1);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');

  // Homework Grading State (supports grade status, score, and tutor feedback comments)
  const [gradingInputs, setGradingInputs] = useState<
    Record<number, { status: string; grade: string; feedback: string }>
  >({});

  // Manual Enrollment & Faculty Avatar State
  const [enrollStudentId, setEnrollStudentId] = useState<number>(profiles[0]?.id || 1);
  const [enrollCourseId, setEnrollCourseId] = useState<number>(courses[0]?.id || 0);
  const [uploadingFounderAvatar, setUploadingFounderAvatar] = useState(false);

  const showNotice = (msg: string) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastSavedAt(`Saved at ${nowTime}`);
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 4500);
  };

  const handleSaveAllPortalState = async () => {
    setIsSavingAll(true);
    try {
      const res = await authFetch('/api/admin/save-state', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        await onRefreshData();
        showNotice(
          `All changes saved permanently (${data.counts?.courses ?? courses.length} courses, ${
            data.counts?.lessons ?? lessons.length
          } recordings, ${data.counts?.events ?? events.length} calendar events, ${
            data.counts?.slides ?? slides.length
          } homepage slides). Added items stay and deleted items remain permanently removed.`
        );
      }
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await onUploadFile(file);
    setter(url);
  };

  // Helper to read uploaded text/markdown syllabus files directly into syllabusText
  const handleSyllabusDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSyllabusFile(true);
    try {
      if (
        file.type.startsWith('text/') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.md')
      ) {
        const textContent = await file.text();
        if (textContent.trim()) {
          setCourseSyllabusText(textContent.trim());
        }
      }
      const uploadedUrl = await onUploadFile(file);
      setCourseSyllabusFileUrl(uploadedUrl);
      showNotice(`Syllabus file "${file.name}" uploaded!`);
    } finally {
      setUploadingSyllabusFile(false);
    }
  };

  const unreadMessagesCount = useMemo(
    () => messages.filter((m) => !m.readStatus).length,
    [messages]
  );

  const founderProfile = useMemo(
    () =>
      profiles.find(
        (p) => p.uid === 'founder-mustaqeem-shaikh' || p.role === 'admin'
      ) || profiles[0],
    [profiles]
  );

  // STRICT RBAC: Students are strictly forbidden from accessing the Admin Portal or adding/modifying anything
  if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-5">
        <div className="rounded-xl academy-surface p-10 border border-rose-500/30 space-y-4">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
          <h1 className="font-display text-2xl font-bold">
            Restricted Area — Faculty &amp; Administrator Access Only
          </h1>
          <p className="text-sm academy-text-secondary max-w-lg mx-auto leading-relaxed">
            Student accounts do not have permission to access the Admin Portal or add/edit academy
            content. As a student, you can watch enrolled course recordings, submit homework
            assignments, view class schedules in your local timezone, and chat directly with your
            tutor in the Student Dashboard.
          </p>
          <button
            type="button"
            onClick={onNavigateToStudentDashboard}
            className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors"
          >
            Return to Student Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Course CRUD Handlers
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;
    const payload = {
      title: courseTitle.trim(),
      category: courseCategory.trim(),
      price: coursePrice.trim(),
      duration: courseDuration.trim(),
      instructorName: courseInstructor.trim() || 'Mustaqeem Shaikh',
      launchDate: courseLaunchDate || null,
      maxStudents: Number(courseMaxStudents) || 25,
      initialEnrolledCount: Number(courseInitialEnrolled) || 0,
      classDays: courseClassDays.trim() || 'Saturday & Wednesday',
      classStartTime: courseClassStartTime || '14:00',
      classTimezone: courseClassTimezone || 'America/New_York',
      description: courseShortDesc.trim(),
      longDescription: courseLongDesc.trim() || courseShortDesc.trim(),
      syllabusText: courseSyllabusText.trim() || null,
      syllabusBoxes: JSON.stringify(courseSyllabusBoxes),
      syllabusFileUrl: courseSyllabusFileUrl.trim() || null,
      thumbnailUrl: courseThumb,
      status: courseStatus,
    };

    const res = editingCourseId
      ? await authFetch(`/api/admin/courses/${editingCourseId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      : await authFetch('/api/admin/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      setEditingCourseId(null);
      setCourseTitle('');
      setCourseShortDesc('');
      setCourseLongDesc('');
      setCourseSyllabusText('');
      setCourseSyllabusFileUrl('');
      await onRefreshData();
      showNotice(
        editingCourseId
          ? 'Course, syllabus boxes, student limit & timezone schedule updated.'
          : 'New course created with syllabus boxes, student limit & global schedule.'
      );
    }
  };

  const handleDeleteCourse = async (id: number) => {
    const res = await authFetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConfirmDeleteCourseId(null);
      await onRefreshData();
      showNotice('Course deleted.');
    }
  };

  const handleToggleCourseStatus = async (course: Course) => {
    const nextStatus = course.status === 'published' ? 'draft' : 'published';
    const res = await authFetch(`/api/admin/courses/${course.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      await onRefreshData();
      showNotice(`Course marked as ${nextStatus}.`);
    }
  };

  // Lesson CRUD Handlers
  const activeCourseIdForLessons =
    selectedLessonCourseId ||
    (isInstructor ? managedCourses[0]?.id : courses[0]?.id) ||
    0;
  const filteredCourseLessons = lessons
    .filter((l) => l.courseId === activeCourseIdForLessons)
    .sort((a, b) => a.positionOrder - b.positionOrder || a.id - b.id);

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim() || !activeCourseIdForLessons) return;
    const payload = {
      courseId: activeCourseIdForLessons,
      title: lessonTitle.trim(),
      description: lessonDesc.trim(),
      videoUrl: lessonVideoUrl.trim(),
      thumbnailUrl: lessonThumb,
      duration: lessonDuration.trim(),
      positionOrder: Number(lessonOrder) || filteredCourseLessons.length + 1,
      isFreePreview: lessonFreePreview,
      attachmentUrl: lessonAttachment.trim() || null,
      scheduledDate: lessonScheduledDate || null,
    };

    const res = editingLessonId
      ? await authFetch(`/api/admin/lessons/${editingLessonId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      : await authFetch('/api/admin/lessons', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      setEditingLessonId(null);
      setLessonTitle('');
      setLessonDesc('');
      await onRefreshData();
      showNotice(
        editingLessonId
          ? 'Recording updated.'
          : lessonFreePreview
          ? 'Public Orientation Recording uploaded.'
          : 'Enrolled-Only Class Recording uploaded.'
      );
    }
  };

  const handleMoveLesson = async (lesson: Lesson, direction: 'up' | 'down') => {
    const delta = direction === 'up' ? -1 : 1;
    const newOrder = Math.max(1, lesson.positionOrder + delta);
    await authFetch(`/api/admin/lessons/${lesson.id}`, {
      method: 'PUT',
      body: JSON.stringify({ positionOrder: newOrder }),
    });
    await onRefreshData();
  };

  // Zoom & Calendar Event CRUD Handlers
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;
    const payload = {
      courseId: eventCourseId ? Number(eventCourseId) : null,
      title: eventTitle.trim(),
      description: eventDesc.trim(),
      eventType,
      eventDate,
      startTime: eventStartTime.trim() || '14:00',
      sourceTimezone: eventSourceTimezone || 'America/New_York',
      duration: eventDuration.trim(),
      zoomJoinUrl: eventZoomUrl.trim() || null,
      zoomMeetingId: eventMeetingId.trim() || null,
      zoomPasscode: eventPasscode.trim() || null,
      thumbnailUrl: eventThumb,
      instructorName: eventInstructor.trim() || 'Mustaqeem Shaikh',
      isPublic: eventType === 'orientation' || eventType === 'course_launch',
    };

    const res = editingEventId
      ? await authFetch(`/api/admin/events/${editingEventId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      : await authFetch('/api/admin/events', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      setEditingEventId(null);
      setEventTitle('');
      setEventDesc('');
      await onRefreshData();
      showNotice(
        'Course calendar session saved! Its time will automatically convert to every student’s local country timezone.'
      );
    }
  };

  // Homepage Slide / Video CRUD Handlers
  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideTitle.trim()) return;
    const payload = {
      title: slideTitle.trim(),
      subtitle: slideSubtitle.trim(),
      mediaType: slideMediaType,
      badgeText: slideBadge,
      thumbnailUrl: slideThumb,
      videoUrl: slideMediaType === 'video' ? slideVideoUrl.trim() : null,
      ctaText: slideCtaText.trim() || 'Explore Curriculum',
      ctaLink: slideBadge === 'Orientation Session' ? '#calendar' : '#courses',
      instructorName: slideInstructor.trim() || 'Mustaqeem Shaikh',
      positionOrder: slides.length + 1,
    };

    const res = editingSlideId
      ? await authFetch(`/api/admin/slides/${editingSlideId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      : await authFetch('/api/admin/slides', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      setEditingSlideId(null);
      setSlideTitle('');
      setSlideSubtitle('');
      await onRefreshData();
      showNotice('Homepage media slide saved.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
      {/* Top Admin / Teacher Studio Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-6 border-b academy-divider">
        <div>
          <div className="text-xs font-medium text-teal-400">
            {isFullAdmin
              ? 'Admin Portal (/admin) · Faculty Control Center · Principal Faculty: Mustaqeem Shaikh'
              : `Teacher Studio · Course Instructor Workspace · ${profile?.fullName || 'Faculty'}`}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">
            {isFullAdmin
              ? 'Academy Curriculum, Syllabi, Recordings & Global Calendar Manager'
              : 'Course Recordings, Syllabi & Student Homework Workspace'}
          </h1>
          {isInstructor && (
            <p className="text-xs academy-text-secondary mt-1">
              Scoped Teacher Access: You can upload lecture recordings, manage course syllabus modules,
              schedule live Zoom seminars, and grade student submissions for your assigned courses (
              <strong className="text-teal-300">
                {managedCourses.map((c) => c.title).join(', ') || 'Assigned Course'}
              </strong>
              ). Full Academy Admin privileges remain exclusively with Founder Mustaqeem Shaikh.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {lastSavedAt && (
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{lastSavedAt}</span>
            </span>
          )}

          <button
            type="button"
            disabled={isSavingAll}
            onClick={handleSaveAllPortalState}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSavingAll
                ? 'Saving Changes...'
                : isFullAdmin
                ? 'Save All Changes'
                : 'Save My Course Changes'}
            </span>
          </button>

          {isFullAdmin && (
            <>
              {!confirmClearBlank ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearBlank(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Start Blank Canvas (Clear All Demo Content)</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-rose-950/50 border border-rose-500/50">
                  <span className="text-xs text-rose-200 px-2">Clear all courses &amp; slides?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await authFetch('/api/admin/clear-all', { method: 'POST' });
                      if (res.ok) {
                        setConfirmClearBlank(false);
                        await onRefreshData();
                        showNotice(
                          'Portal reset to a 100% Blank Canvas! Add your own courses, recordings & Zoom events below.'
                        );
                      }
                    }}
                    className="px-3 py-1 rounded text-xs font-semibold bg-rose-500 text-white hover:bg-rose-400 whitespace-nowrap"
                  >
                    Yes, Make Everything Blank
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearBlank(false)}
                    className="px-2.5 py-1 rounded text-xs text-slate-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={async () => {
                  const res = await authFetch('/api/admin/seed-demo', { method: 'POST' });
                  if (res.ok) {
                    await onRefreshData();
                    showNotice('Sample courses, syllabi, recordings, and Zoom sessions restored.');
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400/50 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
                <span>Restore Sample Showcase</span>
              </button>
            </>
          )}
        </div>
      </div>

      {statusBanner && (
        <div className="mb-6 p-3.5 rounded-lg bg-teal-500/15 border border-teal-400/40 text-xs font-medium text-teal-300 flex items-center justify-between">
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-teal-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dedicated Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Navigation (3 Columns) */}
        <aside className="lg:col-span-3 rounded-xl academy-surface p-4 space-y-1.5">
          {(isInstructor
            ? [
                {
                  id: 'lessons',
                  label: 'Upload Recordings',
                  icon: Video,
                  count: managedLessons.length,
                },
                {
                  id: 'courses',
                  label: 'My Courses & Syllabus',
                  icon: BookOpen,
                  count: managedCourses.length,
                },
                {
                  id: 'zoom_calendar',
                  label: 'Live Zoom & Schedule',
                  icon: Calendar,
                  count: managedEvents.length,
                },
                {
                  id: 'homework',
                  label: 'Grade Homework',
                  icon: FileText,
                  count: managedHomework.length,
                },
                {
                  id: 'inbox',
                  label: 'Tutor Chat & Inbox',
                  icon: Mail,
                  count: unreadMessagesCount,
                },
              ]
            : [
                {
                  id: 'courses',
                  label: 'Courses, Syllabus & Limits',
                  icon: BookOpen,
                  count: courses.length,
                },
                {
                  id: 'lessons',
                  label: 'Upload Recordings',
                  icon: Video,
                  count: lessons.length,
                },
                {
                  id: 'zoom_calendar',
                  label: 'Course Calendar & Timezones',
                  icon: Calendar,
                  count: events.length,
                },
                {
                  id: 'homework',
                  label: 'Student Homework',
                  icon: FileText,
                  count: homework.length,
                },
                {
                  id: 'homepage_media',
                  label: 'Homepage Video & Slides',
                  icon: Film,
                  count: slides.length,
                },
                {
                  id: 'inbox',
                  label: 'Tutor Chat & Inbox',
                  icon: Mail,
                  count: unreadMessagesCount,
                },
                {
                  id: 'users',
                  label: 'Faculty (MS) & Enrollments',
                  icon: Users,
                  count: profiles.length,
                },
              ]
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id as AdminModule)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-400 text-slate-950 font-semibold'
                    : 'academy-text-secondary hover:text-teal-300 hover:bg-teal-500/5'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                <span className="font-mono-tabular text-[11px]">{item.count}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Main Content Area (9 Columns) */}
        <div className="lg:col-span-9 space-y-6">
          {/* MODULE A: COURSE MANAGER (Syllabus Upload + Boxes, Student Limit, Class Schedule + Timezone) */}
          {activeModule === 'courses' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveCourse}
                className="rounded-xl academy-surface p-6 space-y-5"
              >
                <div className="flex items-center justify-between pb-3 border-b academy-divider">
                  <div>
                    <h2 className="font-display text-lg font-bold text-teal-400">
                      {editingCourseId
                        ? 'Edit Course, Syllabus Boxes, Student Limit & Class Time'
                        : '+ Add New Course (with Syllabus Boxes, Student Cap & Global Schedule)'}
                    </h2>
                    <p className="text-xs academy-text-secondary mt-0.5">
                      Configure enrollment limits, weekly class days &amp; timezone, and interactive
                      syllabus boxes that animate when clicked.
                    </p>
                  </div>
                  {editingCourseId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourseId(null);
                        setCourseTitle('');
                        setCourseShortDesc('');
                        setCourseLongDesc('');
                        setCourseSyllabusText('');
                      }}
                      className="text-xs academy-text-secondary hover:text-teal-400"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      placeholder="e.g. The Prophetic Seerah: Analytical Chronicles"
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      required
                      value={courseCategory}
                      onChange={(e) => setCourseCategory(e.target.value)}
                      placeholder="e.g. Seerah & History, Classical Arabic"
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Faculty Instructor Name {isInstructor && '(Assigned to your Profile)'}
                    </label>
                    <input
                      type="text"
                      disabled={isInstructor}
                      value={isInstructor ? (profile.fullName || courseInstructor) : courseInstructor}
                      onChange={(e) => setCourseInstructor(e.target.value)}
                      placeholder="Mustaqeem Shaikh"
                      className={`w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400 ${
                        isInstructor ? 'opacity-80 cursor-not-allowed bg-slate-900/50' : ''
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">Price</label>
                      <input
                        type="text"
                        value={coursePrice}
                        onChange={(e) => setCoursePrice(e.target.value)}
                        placeholder="Free or $49"
                        className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                      />
                    </div>
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">Duration</label>
                      <input
                        type="text"
                        value={courseDuration}
                        onChange={(e) => setCourseDuration(e.target.value)}
                        placeholder="12 Weeks"
                        className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                      />
                    </div>
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">Status</label>
                      <select
                        value={courseStatus}
                        onChange={(e) =>
                          setCourseStatus(e.target.value as 'published' | 'draft')
                        }
                        className="w-full px-2 py-2 text-sm rounded-lg academy-elevated"
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Student Capacity Limit & Enrollment Rate Controls */}
                <div className="p-4 rounded-xl academy-elevated border border-teal-500/25 space-y-3">
                  <div className="text-xs font-semibold text-teal-400">
                    Student Capacity Limit &amp; Enrollment Rate Control
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Maximum Student Limit (Course closes once reached)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={courseMaxStudents}
                        onChange={(e) => setCourseMaxStudents(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg academy-surface font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Base Students Already Taken (Offline / Prior Seats)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={courseInitialEnrolled}
                        onChange={(e) => setCourseInitialEnrolled(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg academy-surface font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Cohort Launch Date (Calendar)
                      </label>
                      <input
                        type="date"
                        value={courseLaunchDate}
                        onChange={(e) => setCourseLaunchDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg academy-surface font-mono-tabular"
                      />
                    </div>
                  </div>
                </div>

                {/* Course Weekly Class Day & Automatic World Timezone Schedule */}
                <div className="p-4 rounded-xl academy-elevated border border-teal-500/25 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-teal-400">
                    <Globe className="w-3.5 h-3.5" />
                    <span>
                      Course Class Days &amp; Time (Automatically Converted to Every Student&apos;s
                      Country Timezone)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Weekly Class Days
                      </label>
                      <input
                        type="text"
                        value={courseClassDays}
                        onChange={(e) => setCourseClassDays(e.target.value)}
                        placeholder="e.g. Saturday & Wednesday"
                        className="w-full px-3 py-2 text-sm rounded-lg academy-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Class Start Time (Your Time)
                      </label>
                      <input
                        type="time"
                        value={courseClassStartTime}
                        onChange={(e) => setCourseClassStartTime(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg academy-surface font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Your Timezone (Source Timezone)
                      </label>
                      <select
                        value={courseClassTimezone}
                        onChange={(e) => setCourseClassTimezone(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg academy-surface"
                      >
                        <option value={detectedTz}>My Current Timezone ({detectedTz})</option>
                        {WORLD_TIMEZONES.filter((w) => w.tz !== detectedTz).map((w) => (
                          <option key={w.tz} value={w.tz}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Course Thumbnail Upload */}
                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Course Thumbnail (Upload Image, Paste URL, or Pick Preset)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={courseThumb}
                      onChange={(e) => setCourseThumb(e.target.value)}
                      placeholder="Image URL or preset"
                      className="flex-1 px-3 py-2 text-xs rounded-lg academy-elevated"
                    />
                    <label className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400 whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5 text-teal-400" />
                      <span>Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setCourseThumb)}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {PRESET_THUMBNAILS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setCourseThumb(p.id)}
                        className={`px-2 py-1 text-[11px] rounded border ${
                          courseThumb === p.id
                            ? 'border-teal-400 text-teal-300 bg-teal-500/10'
                            : 'border-white/10 academy-text-muted'
                        }`}
                      >
                        {p.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Short Summary Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={courseShortDesc}
                    onChange={(e) => setCourseShortDesc(e.target.value)}
                    placeholder="Concise 1-2 sentence overview for the course card..."
                    className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                  />
                </div>

                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Course Long Description
                  </label>
                  <textarea
                    rows={2}
                    value={courseLongDesc}
                    onChange={(e) => setCourseLongDesc(e.target.value)}
                    placeholder="Detailed program overview..."
                    className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                  />
                </div>

                {/* SYLLABUS UPLOAD (TEXT + FILE + ANIMATED SYLLABUS BOXES BUILDER) */}
                <div className="p-5 rounded-xl academy-elevated border border-teal-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b academy-divider">
                    <div>
                      <h3 className="font-display text-base font-bold text-teal-400">
                        Course Syllabus Upload (Text Form, Document Upload &amp; Animated Boxes)
                      </h3>
                      <p className="text-xs academy-text-secondary">
                        Upload a syllabus file (.txt, .md, .pdf) or type syllabus text and modular
                        boxes that animate with smooth transitions when a student clicks the course.
                      </p>
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingSyllabusFile ? 'Uploading Syllabus...' : 'Upload Syllabus File'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.md,image/*"
                        className="hidden"
                        onChange={handleSyllabusDocumentUpload}
                      />
                    </label>
                  </div>

                  {courseSyllabusFileUrl && (
                    <div className="text-xs text-teal-300 flex items-center justify-between p-2.5 rounded bg-teal-500/10 border border-teal-500/30">
                      <span>Uploaded Syllabus Document Ready for Students</span>
                      <button
                        type="button"
                        onClick={() => setCourseSyllabusFileUrl('')}
                        className="text-rose-400 hover:underline"
                      >
                        Remove File
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Syllabus Overview in Text Form
                    </label>
                    <textarea
                      rows={3}
                      value={courseSyllabusText}
                      onChange={(e) => setCourseSyllabusText(e.target.value)}
                      placeholder="Paste or write your course syllabus text here (or upload a .txt/.md file above to auto-fill)..."
                      className="w-full px-3 py-2 text-sm rounded-lg academy-surface"
                    />
                  </div>

                  {/* Syllabus Boxes Builder */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-teal-400">
                        Syllabus Module Boxes ({courseSyllabusBoxes.length} Boxes)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setCourseSyllabusBoxes((prev) => [
                            ...prev,
                            {
                              week: `Module 0${prev.length + 1}`,
                              title: '',
                              topics: '',
                              deliverable: '',
                            },
                          ])
                        }
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold academy-surface text-teal-400 hover:border-teal-400"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Syllabus Box</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {courseSyllabusBoxes.map((box, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg academy-surface border border-teal-500/20 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={box.week}
                              onChange={(e) => {
                                const next = [...courseSyllabusBoxes];
                                next[idx] = { ...next[idx], week: e.target.value };
                                setCourseSyllabusBoxes(next);
                              }}
                              placeholder="Week / Module Label (e.g. Weeks 1-3)"
                              className="flex-1 px-2.5 py-1 text-xs rounded academy-elevated font-mono-tabular text-teal-300"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setCourseSyllabusBoxes((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="p-1 text-rose-400 hover:bg-rose-500/10 rounded"
                              title="Remove Box"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={box.title}
                            onChange={(e) => {
                              const next = [...courseSyllabusBoxes];
                              next[idx] = { ...next[idx], title: e.target.value };
                              setCourseSyllabusBoxes(next);
                            }}
                            placeholder="Box Title (e.g. The Meccan Period)"
                            className="w-full px-2.5 py-1.5 text-xs font-semibold rounded academy-elevated"
                          />
                          <textarea
                            rows={2}
                            value={box.topics}
                            onChange={(e) => {
                              const next = [...courseSyllabusBoxes];
                              next[idx] = { ...next[idx], topics: e.target.value };
                              setCourseSyllabusBoxes(next);
                            }}
                            placeholder="Topics covered in this syllabus box..."
                            className="w-full px-2.5 py-1.5 text-xs rounded academy-elevated"
                          />
                          <input
                            type="text"
                            value={box.deliverable || ''}
                            onChange={(e) => {
                              const next = [...courseSyllabusBoxes];
                              next[idx] = { ...next[idx], deliverable: e.target.value };
                              setCourseSyllabusBoxes(next);
                            }}
                            placeholder="Homework / Deliverable (optional)"
                            className="w-full px-2.5 py-1 text-xs rounded academy-elevated"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {editingCourseId
                      ? 'Save Course, Syllabus & Capacity Changes'
                      : 'Create Course with Syllabus & Capacity Limit'}
                  </span>
                </button>
              </form>

              {/* Existing Courses Table */}
              <div className="rounded-xl academy-surface p-6 space-y-4">
                <h3 className="font-display text-base font-bold">
                  {isInstructor
                    ? `My Assigned Courses (${managedCourses.length})`
                    : `All Academy Courses (${courses.length})`}
                </h3>
                {(isInstructor ? managedCourses : courses).length === 0 ? (
                  <p className="text-xs academy-text-secondary py-4">
                    {isInstructor
                      ? 'No courses are currently assigned to your teacher profile.'
                      : 'No courses currently in database. Use the form above to add your first course.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(isInstructor ? managedCourses : courses).map((course) => {
                      const dbCount = enrollments.filter((e) => e.courseId === course.id).length;
                      const taken = dbCount + (course.initialEnrolledCount || 0);
                      const max = course.maxStudents || 25;
                      const rate = max > 0 ? Math.min(100, Math.round((taken / max) * 100)) : 0;

                      return (
                        <div
                          key={course.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg academy-elevated"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={resolveThumbnailUrl(course.thumbnailUrl)}
                              alt={course.title}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  ACADEMY_ASSETS.courseSeerah;
                              }}
                              className="w-20 h-14 rounded object-cover shrink-0"
                            />
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-teal-400">
                                <span>{course.category}</span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {taken}/{max} Students ({rate}%)
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="uppercase font-mono-tabular">{course.status}</span>
                              </div>
                              <h4 className="font-display text-sm font-bold truncate">
                                {course.title}
                              </h4>
                              <div className="text-xs academy-text-muted font-mono-tabular">
                                {course.price} · {course.classDays || 'Sat & Wed'} at{' '}
                                {course.classStartTime || '14:00'} ({course.classTimezone || 'EST'})
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleCourseStatus(course)}
                              className="px-3 py-1.5 rounded text-xs font-medium academy-surface hover:border-teal-400 whitespace-nowrap"
                            >
                              {course.status === 'published' ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCourseId(course.id);
                                setCourseTitle(course.title);
                                setCourseCategory(course.category);
                                setCoursePrice(course.price);
                                setCourseDuration(course.duration);
                                setCourseInstructor(course.instructorName);
                                setCourseLaunchDate(course.launchDate || '');
                                setCourseMaxStudents(course.maxStudents || 25);
                                setCourseInitialEnrolled(course.initialEnrolledCount || 0);
                                setCourseClassDays(course.classDays || 'Saturday & Wednesday');
                                setCourseClassStartTime(course.classStartTime || '14:00');
                                setCourseClassTimezone(
                                  course.classTimezone || 'America/New_York'
                                );
                                setCourseShortDesc(course.description);
                                setCourseLongDesc(course.longDescription);
                                setCourseSyllabusText(course.syllabusText || '');
                                setCourseSyllabusFileUrl(course.syllabusFileUrl || '');
                                try {
                                  const parsed = JSON.parse(course.syllabusBoxes || '[]');
                                  setCourseSyllabusBoxes(Array.isArray(parsed) ? parsed : []);
                                } catch {
                                  setCourseSyllabusBoxes([]);
                                }
                                setCourseThumb(course.thumbnailUrl);
                                setCourseStatus(course.status);
                              }}
                              className="p-2 rounded academy-surface hover:text-teal-400"
                              title="Edit Course"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {isFullAdmin && (
                              confirmDeleteCourseId === course.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCourse(course.id)}
                                    className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-500 text-white"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteCourseId(null)}
                                    className="px-2 py-1 rounded text-xs academy-text-secondary"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteCourseId(course.id)}
                                  className="p-2 rounded academy-surface text-rose-400 hover:bg-rose-500/10"
                                  title="Delete Course"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODULE B: LESSON & RECORDINGS UPLOADER (Direct Video File Upload + Orientation vs Enrolled Class Toggle) */}
          {activeModule === 'lessons' && (
            <div className="space-y-6">
              <div className="rounded-xl academy-surface p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b academy-divider">
                  <div>
                    <h2 className="font-display text-lg font-bold text-teal-400">
                      Lesson &amp; Recordings Uploader
                    </h2>
                    <p className="text-xs academy-text-secondary">
                      Upload video recording files directly from your computer or paste a video link.
                      Choose whether the recording is a <strong>Public Orientation</strong> or an{' '}
                      <strong>Enrolled-Only Class Recording</strong>.
                    </p>
                  </div>
                  <select
                    value={activeCourseIdForLessons}
                    onChange={(e) => setSelectedLessonCourseId(Number(e.target.value))}
                    className="px-3 py-2 text-xs font-semibold rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                  >
                    {(isInstructor ? managedCourses : courses).map((c) => (
                      <option key={c.id} value={c.id}>
                        Course: {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {(isInstructor ? managedCourses : courses).length === 0 ? (
                  <p className="text-xs academy-text-secondary py-4">
                    {isInstructor
                      ? 'No courses are currently assigned to your teacher profile. Join or request course assignment first.'
                      : 'Create a course first in the Course Manager tab before adding lesson recordings.'}
                  </p>
                ) : (
                  <form onSubmit={handleSaveLesson} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">
                          Recording Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={lessonTitle}
                          onChange={(e) => setLessonTitle(e.target.value)}
                          placeholder="e.g. Orientation Recording / Class Recording 01"
                          className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                        />
                      </div>

                      {/* Direct Video Upload OR Video Link */}
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">
                          Recording Video (Upload Video File from Computer or Paste Link) *
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            value={lessonVideoUrl}
                            onChange={(e) => setLessonVideoUrl(e.target.value)}
                            placeholder="https://... or click Upload Recording"
                            className="flex-1 px-3 py-2 text-xs rounded-lg academy-elevated"
                          />
                          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 whitespace-nowrap">
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {uploadingLessonVideo ? 'Uploading...' : 'Upload Recording'}
                            </span>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingLessonVideo(true);
                                try {
                                  const uploadedUrl = await onUploadFile(file);
                                  setLessonVideoUrl(uploadedUrl);
                                  showNotice(`Video file "${file.name}" uploaded!`);
                                } finally {
                                  setUploadingLessonVideo(false);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Recording Visibility Selector: Orientation (Public) vs Class Recording (Enrolled Students ONLY) */}
                    <div className="p-4 rounded-xl academy-elevated border border-teal-500/30 space-y-2">
                      <label className="block text-xs font-semibold text-teal-400">
                        Recording Access Level (Strict Visibility Rule)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setLessonFreePreview(false)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            !lessonFreePreview
                              ? 'border-teal-400 bg-teal-500/15'
                              : 'border-white/10 academy-surface'
                          }`}
                        >
                          <div className="text-xs font-bold text-white">
                            Class Recording (Enrolled Students ONLY)
                          </div>
                          <div className="text-[11px] academy-text-secondary mt-0.5">
                            Locked for public visitors. Only students enrolled in this course can
                            watch this recording.
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLessonFreePreview(true)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            lessonFreePreview
                              ? 'border-teal-400 bg-teal-500/15'
                              : 'border-white/10 academy-surface'
                          }`}
                        >
                          <div className="text-xs font-bold text-teal-300">
                            Orientation Recording (Open to Everyone)
                          </div>
                          <div className="text-[11px] academy-text-secondary mt-0.5">
                            Publicly viewable orientation recording so prospective students can
                            preview the course.
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={lessonDuration}
                          onChange={(e) => setLessonDuration(e.target.value)}
                          placeholder="45:00"
                          className="w-full px-3 py-2 text-sm rounded-lg academy-elevated font-mono-tabular"
                        />
                      </div>
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Order #</label>
                        <input
                          type="number"
                          min={1}
                          value={lessonOrder}
                          onChange={(e) => setLessonOrder(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm rounded-lg academy-elevated font-mono-tabular"
                        />
                      </div>
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">
                          Calendar Date
                        </label>
                        <input
                          type="date"
                          value={lessonScheduledDate}
                          onChange={(e) => setLessonScheduledDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg academy-elevated font-mono-tabular"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">
                          Recording Thumbnail (Upload Image or URL)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={lessonThumb}
                            onChange={(e) => setLessonThumb(e.target.value)}
                            className="flex-1 px-3 py-2 text-xs rounded-lg academy-elevated"
                          />
                          <label className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400">
                            <Upload className="w-3.5 h-3.5 text-teal-400" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, setLessonThumb)}
                            />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">
                          Lesson Notes / PDF Attachment (Upload File or Link)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={lessonAttachment}
                            onChange={(e) => setLessonAttachment(e.target.value)}
                            placeholder="https://... or upload PDF"
                            className="flex-1 px-3 py-2 text-xs rounded-lg academy-elevated"
                          />
                          <label className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400 whitespace-nowrap">
                            <Upload className="w-3.5 h-3.5 text-teal-400" />
                            <span>
                              {uploadingLessonAttachment ? 'Uploading...' : 'Upload PDF'}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingLessonAttachment(true);
                                try {
                                  const url = await onUploadFile(file);
                                  setLessonAttachment(
                                    `${url}?name=${encodeURIComponent(file.name)}`
                                  );
                                } finally {
                                  setUploadingLessonAttachment(false);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Lesson Description &amp; Summary
                      </label>
                      <textarea
                        rows={2}
                        value={lessonDesc}
                        onChange={(e) => setLessonDesc(e.target.value)}
                        placeholder="Summary of topics covered in this recording..."
                        className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                      />
                    </div>

                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {editingLessonId ? 'Save Recording Changes' : 'Add Recording to Course'}
                      </span>
                    </button>
                  </form>
                )}
              </div>

              {/* Current Course Lessons List */}
              <div className="rounded-xl academy-surface p-6 space-y-4">
                <h3 className="font-display text-base font-bold">
                  Course Recordings ({filteredCourseLessons.length})
                </h3>
                {filteredCourseLessons.length === 0 ? (
                  <p className="text-xs academy-text-secondary py-4">
                    No recordings added for this course yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {filteredCourseLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg academy-elevated"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={resolveThumbnailUrl(lesson.thumbnailUrl)}
                            alt={lesson.title}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                ACADEMY_ASSETS.courseSeerah;
                            }}
                            className="w-16 h-11 rounded object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-mono-tabular text-teal-400">
                              Order #{lesson.positionOrder} · {lesson.duration} ·{' '}
                              {lesson.isFreePreview
                                ? 'Orientation (Publicly Visible)'
                                : 'Class Recording (Enrolled Students Only)'}
                            </div>
                            <h4 className="font-display text-sm font-bold truncate">
                              {lesson.title}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveLesson(lesson, 'up')}
                            className="p-1.5 rounded academy-surface hover:text-teal-400"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveLesson(lesson, 'down')}
                            className="p-1.5 rounded academy-surface hover:text-teal-400"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLessonId(lesson.id);
                              setLessonTitle(lesson.title);
                              setLessonDesc(lesson.description);
                              setLessonVideoUrl(lesson.videoUrl);
                              setLessonThumb(lesson.thumbnailUrl || 'preset:seerah');
                              setLessonDuration(lesson.duration);
                              setLessonOrder(lesson.positionOrder);
                              setLessonFreePreview(lesson.isFreePreview);
                              setLessonAttachment(lesson.attachmentUrl || '');
                              setLessonScheduledDate(lesson.scheduledDate || '');
                            }}
                            className="p-1.5 rounded academy-surface hover:text-teal-400"
                            title="Edit Recording"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await authFetch(`/api/admin/lessons/${lesson.id}`, {
                                method: 'DELETE',
                              });
                              await onRefreshData();
                              showNotice('Recording removed.');
                            }}
                            className="p-1.5 rounded academy-surface text-rose-400 hover:bg-rose-500/10"
                            title="Delete Recording"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODULE C: COURSE-SPECIFIC CALENDAR & AUTOMATIC WORLD TIMEZONE SCHEDULER */}
          {activeModule === 'zoom_calendar' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveEvent}
                className="rounded-xl academy-surface p-6 space-y-4"
              >
                <div className="pb-3 border-b academy-divider">
                  <h2 className="font-display text-lg font-bold text-teal-400">
                    {editingEventId
                      ? 'Edit Course Calendar Session'
                      : '+ Schedule Course Calendar Class / Live Zoom Session'}
                  </h2>
                  <p className="text-xs academy-text-secondary mt-0.5">
                    Set the class date and time in <strong>your country timezone</strong>. Every
                    visitor and student worldwide will see the date and time automatically converted
                    into their own local country timezone!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Session / Class Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g. Live Zoom Class: Seerah Cohort Session 02"
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                    />
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Specific Course Calendar
                    </label>
                    <select
                      value={eventCourseId}
                      onChange={(e) => setEventCourseId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                    >
                      {!isInstructor && (
                        <option value="">General Academy Orientation (All Courses)</option>
                      )}
                      {(isInstructor ? managedCourses : courses).map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">Event Type</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                    >
                      <option value="zoom_session">Live Zoom Class Session</option>
                      <option value="orientation">Orientation Session (Open to All)</option>
                      <option value="course_launch">Course Launch Date</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Class Date (Placed on Course Calendar) *
                    </label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated font-mono-tabular"
                    />
                  </div>
                </div>

                {/* Instructor Time & Source Timezone Box */}
                <div className="p-4 rounded-xl academy-elevated border border-teal-500/30 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-teal-400 font-semibold mb-1">
                      Class Start Time (In Your Timezone) *
                    </label>
                    <input
                      type="time"
                      required
                      value={eventStartTime}
                      onChange={(e) => setEventStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg academy-surface font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-teal-400 font-semibold mb-1">
                      Your Country / Timezone *
                    </label>
                    <select
                      value={eventSourceTimezone}
                      onChange={(e) => setEventSourceTimezone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg academy-surface"
                    >
                      <option value={detectedTz}>My Local Timezone ({detectedTz})</option>
                      {WORLD_TIMEZONES.filter((w) => w.tz !== detectedTz).map((w) => (
                        <option key={w.tz} value={w.tz}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">Duration</label>
                    <input
                      type="text"
                      value={eventDuration}
                      onChange={(e) => setEventDuration(e.target.value)}
                      placeholder="60 min"
                      className="w-full px-3 py-2 text-sm rounded-lg academy-surface font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Zoom Join URL
                    </label>
                    <input
                      type="text"
                      value={eventZoomUrl}
                      onChange={(e) => setEventZoomUrl(e.target.value)}
                      placeholder="https://zoom.us/j/..."
                      className="w-full px-3 py-2 text-xs rounded-lg academy-elevated"
                    />
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Zoom Meeting ID
                    </label>
                    <input
                      type="text"
                      value={eventMeetingId}
                      onChange={(e) => setEventMeetingId(e.target.value)}
                      placeholder="948 2716 5011"
                      className="w-full px-3 py-2 text-xs rounded-lg academy-elevated font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Zoom Passcode
                    </label>
                    <input
                      type="text"
                      value={eventPasscode}
                      onChange={(e) => setEventPasscode(e.target.value)}
                      placeholder="HIJRAH26"
                      className="w-full px-3 py-2 text-xs rounded-lg academy-elevated font-mono-tabular"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Calendar Date Thumbnail Image (Upload or URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={eventThumb}
                      onChange={(e) => setEventThumb(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-lg academy-elevated"
                    />
                    <label className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400">
                      <Upload className="w-3.5 h-3.5 text-teal-400" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setEventThumb)}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Session Description
                  </label>
                  <textarea
                    rows={2}
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="Agenda for this live session..."
                    className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {editingEventId
                      ? 'Update Scheduled Session'
                      : 'Add Session to Course Calendar'}
                  </span>
                </button>
              </form>

              <div className="rounded-xl academy-surface p-6 space-y-4">
                <h3 className="font-display text-base font-bold">
                  Scheduled Course Calendar &amp; Zoom Sessions (
                  {(isInstructor ? managedEvents : events).length})
                </h3>
                {(isInstructor ? managedEvents : events).length === 0 ? (
                  <p className="text-xs academy-text-secondary py-4">
                    {isInstructor
                      ? 'No calendar sessions scheduled for your assigned courses yet.'
                      : 'No calendar sessions scheduled yet.'}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {(isInstructor ? managedEvents : events).map((ev) => {
                      const parentCourse = courses.find((c) => c.id === ev.courseId);
                      return (
                      <div
                        key={ev.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg academy-elevated"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={resolveThumbnailUrl(ev.thumbnailUrl)}
                            alt={ev.title}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                ACADEMY_ASSETS.orientationLive;
                            }}
                            className="w-16 h-11 rounded object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs text-teal-400 font-mono-tabular">
                              {ev.eventDate} · {ev.startTime} ({ev.sourceTimezone}) ·{' '}
                              {parentCourse?.title || 'All Courses'}
                            </div>
                            <h4 className="font-display text-sm font-bold truncate">{ev.title}</h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEventId(ev.id);
                              setEventCourseId(ev.courseId ? String(ev.courseId) : '');
                              setEventTitle(ev.title);
                              setEventDesc(ev.description);
                              setEventType(ev.eventType);
                              setEventDate(ev.eventDate);
                              setEventStartTime(ev.startTime);
                              setEventSourceTimezone(ev.sourceTimezone || 'America/New_York');
                              setEventDuration(ev.duration);
                              setEventZoomUrl(ev.zoomJoinUrl || '');
                              setEventMeetingId(ev.zoomMeetingId || '');
                              setEventPasscode(ev.zoomPasscode || '');
                              setEventThumb(ev.thumbnailUrl || 'preset:orientation');
                            }}
                            className="p-1.5 rounded academy-surface hover:text-teal-400"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await authFetch(`/api/admin/events/${ev.id}`, {
                                method: 'DELETE',
                              });
                              await onRefreshData();
                              showNotice('Calendar session deleted.');
                            }}
                            className="p-1.5 rounded academy-surface text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODULE D: STUDENT HOMEWORK SUBMISSIONS & GRADING */}
          {activeModule === 'homework' && (
            <div className="rounded-xl academy-surface p-6 space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-teal-400">
                  Student Homework Submissions ({(isInstructor ? managedHomework : homework).length})
                </h2>
                <p className="text-xs academy-text-secondary">
                  Review homework submitted by enrolled students, download their attached files, and
                  send back grades &amp; tutor feedback.
                </p>
              </div>

              {(isInstructor ? managedHomework : homework).length === 0 ? (
                <div className="py-10 text-center text-xs academy-text-secondary">
                  {isInstructor
                    ? 'No student homework submissions for your courses yet.'
                    : 'No student homework submissions received yet.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {(isInstructor ? managedHomework : homework).map((hw) => {
                    const courseObj = courses.find((c) => c.id === hw.courseId);
                    const currentInput = gradingInputs[hw.id] || {
                      status: hw.status || 'graded',
                      grade: hw.grade || 'A (95%)',
                      feedback: hw.feedback || '',
                    };

                    return (
                      <div
                        key={hw.id}
                        className="p-5 rounded-xl academy-elevated border border-teal-500/25 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-semibold text-teal-400">{hw.studentName}</span>
                            <span className="academy-text-secondary">
                              {' '}
                              · {courseObj?.title || 'Course'}
                            </span>
                          </div>
                          <span
                            className={`font-mono-tabular uppercase ${
                              hw.status === 'graded' || hw.status === 'exemplary'
                                ? 'text-emerald-400'
                                : hw.status === 'needs_revision'
                                ? 'text-rose-400'
                                : 'text-amber-300'
                            }`}
                          >
                            {hw.status} {hw.grade ? `(${hw.grade})` : ''}
                          </span>
                        </div>

                        <h3 className="font-display text-base font-bold">{hw.title}</h3>
                        <p className="text-xs academy-text-secondary whitespace-pre-line leading-relaxed">
                          {hw.content}
                        </p>

                        {hw.attachmentUrl && (
                          <a
                            href={hw.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:underline"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Open Student Homework Attachment</span>
                          </a>
                        )}

                        <div className="pt-3 border-t academy-divider grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-3">
                            <label className="block text-[11px] academy-text-secondary mb-1">
                              Grade Status
                            </label>
                            <select
                              value={currentInput.status}
                              onChange={(e) =>
                                setGradingInputs((prev) => ({
                                  ...prev,
                                  [hw.id]: { ...currentInput, status: e.target.value },
                                }))
                              }
                              className="w-full px-3 py-1.5 text-xs rounded-lg academy-surface"
                            >
                              <option value="graded">Approved / Graded</option>
                              <option value="exemplary">Exemplary / Distinction</option>
                              <option value="needs_revision">Revision Requested</option>
                              <option value="under_review">Under Tutor Review</option>
                              <option value="submitted">Submitted · Pending Review</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] academy-text-secondary mb-1">
                              Grade / Score
                            </label>
                            <input
                              type="text"
                              value={currentInput.grade}
                              onChange={(e) =>
                                setGradingInputs((prev) => ({
                                  ...prev,
                                  [hw.id]: { ...currentInput, grade: e.target.value },
                                }))
                              }
                              placeholder="A+ / Completed"
                              className="w-full px-3 py-1.5 text-xs rounded-lg academy-surface"
                            />
                          </div>
                          <div className="md:col-span-5">
                            <label className="block text-[11px] academy-text-secondary mb-1">
                              Tutor Feedback Comments for Student
                            </label>
                            <input
                              type="text"
                              value={currentInput.feedback}
                              onChange={(e) =>
                                setGradingInputs((prev) => ({
                                  ...prev,
                                  [hw.id]: { ...currentInput, feedback: e.target.value },
                                }))
                              }
                              placeholder="MashaAllah, excellent textual analysis..."
                              className="w-full px-3 py-1.5 text-xs rounded-lg academy-surface"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await authFetch(
                                  `/api/admin/homework/${hw.id}/grade`,
                                  {
                                    method: 'PUT',
                                    body: JSON.stringify(currentInput),
                                  }
                                );
                                if (res.ok) {
                                  await onRefreshData();
                                  showNotice('Homework graded and feedback sent to student!');
                                }
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Save Grade</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MODULE E: HOMEPAGE DYNAMIC VIDEO & SLIDESHOW MANAGER */}
          {activeModule === 'homepage_media' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveSlide}
                className="rounded-xl academy-surface p-6 space-y-4"
              >
                <div className="pb-3 border-b academy-divider">
                  <h2 className="font-display text-lg font-bold text-teal-400">
                    {editingSlideId
                      ? 'Edit Homepage Showcase Slide'
                      : '+ Add Homepage Video / Slideshow Item'}
                  </h2>
                  <p className="text-xs academy-text-secondary mt-0.5">
                    Promote featured courses, highlight recordings, and showcase orientation
                    sessions on the homepage hero player
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Slide Headline *
                    </label>
                    <input
                      type="text"
                      required
                      value={slideTitle}
                      onChange={(e) => setSlideTitle(e.target.value)}
                      placeholder="e.g. Autumn Term Orientation & Live Q&A"
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Category Type
                      </label>
                      <select
                        value={slideBadge}
                        onChange={(e) => setSlideBadge(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg academy-elevated"
                      >
                        <option value="Orientation Session">Orientation Session</option>
                        <option value="Featured Course">Featured Course</option>
                        <option value="Highlight Recording">Highlight Recording</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Media Mode
                      </label>
                      <select
                        value={slideMediaType}
                        onChange={(e) => setSlideMediaType(e.target.value as 'video' | 'image')}
                        className="w-full px-3 py-2 text-xs rounded-lg academy-elevated"
                      >
                        <option value="video">Video Player + Poster</option>
                        <option value="image">High-Res Slideshow Image</option>
                      </select>
                    </div>
                  </div>
                </div>

                {slideMediaType === 'video' && (
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Video Recording File (Upload Video or Paste MP4/YouTube Link)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={slideVideoUrl}
                        onChange={(e) => setSlideVideoUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 text-xs rounded-lg academy-elevated"
                      />
                      <label className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingSlideVideo ? 'Uploading...' : 'Upload Video'}</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingSlideVideo(true);
                            try {
                              const url = await onUploadFile(file);
                              setSlideVideoUrl(url);
                            } finally {
                              setUploadingSlideVideo(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Slide Poster / Thumbnail (Upload Image or URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={slideThumb}
                      onChange={(e) => setSlideThumb(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-lg academy-elevated"
                    />
                    <label className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400">
                      <Upload className="w-3.5 h-3.5 text-teal-400" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setSlideThumb)}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Subtitle / Description
                  </label>
                  <textarea
                    rows={2}
                    value={slideSubtitle}
                    onChange={(e) => setSlideSubtitle(e.target.value)}
                    placeholder="Compelling description for the homepage showcase..."
                    className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingSlideId ? 'Update Slide' : 'Add Slide to Homepage'}</span>
                </button>
              </form>

              <div className="rounded-xl academy-surface p-6 space-y-3">
                <h3 className="font-display text-base font-bold">
                  Active Homepage Slides ({slides.length})
                </h3>
                {slides.map((sl) => (
                  <div
                    key={sl.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-lg academy-elevated"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={resolveThumbnailUrl(sl.thumbnailUrl)}
                        alt={sl.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            ACADEMY_ASSETS.heroAcademy;
                        }}
                        className="w-20 h-12 rounded object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs text-teal-400">
                          {sl.badgeText} · {sl.mediaType.toUpperCase()}
                        </div>
                        <h4 className="font-display text-sm font-bold truncate">{sl.title}</h4>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await authFetch(`/api/admin/slides/${sl.id}`, { method: 'DELETE' });
                        await onRefreshData();
                        showNotice('Slide removed.');
                      }}
                      className="p-1.5 rounded academy-surface text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODULE F: TUTOR CHAT & INBOX MESSAGING SYSTEM */}
          {activeModule === 'inbox' && (
            <div className="rounded-xl academy-surface p-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b academy-divider">
                <div>
                  <h2 className="font-display text-lg font-bold text-teal-400">
                    Faculty Inbox &amp; Student Chat
                  </h2>
                  <p className="text-xs academy-text-secondary">
                    Read student questions and send direct tutor replies
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-lg academy-elevated">
                  {(['inbox', 'sent', 'compose'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setInboxTab(t)}
                      className={`px-3 py-1.5 rounded text-xs font-medium capitalize ${
                        inboxTab === t
                          ? 'bg-teal-400 text-slate-950 font-semibold'
                          : 'academy-text-secondary'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {inboxTab === 'compose' ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!msgSubject.trim() || !msgBody.trim()) return;
                    const res = await authFetch('/api/messages', {
                      method: 'POST',
                      body: JSON.stringify({
                        receiverId: replyToProfileId,
                        subject: msgSubject.trim(),
                        body: msgBody.trim(),
                      }),
                    });
                    if (res.ok) {
                      setMsgSubject('');
                      setMsgBody('');
                      setInboxTab('sent');
                      await onRefreshData();
                      showNotice('Reply dispatched to student.');
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Select Student / Recipient
                    </label>
                    <select
                      value={replyToProfileId}
                      onChange={(e) => setReplyToProfileId(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.email} · {p.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                    />
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">Message</label>
                    <textarea
                      rows={4}
                      required
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-xs academy-text-secondary py-6 text-center">
                      No messages in the system yet.
                    </p>
                  ) : (
                    messages.map((m) => {
                      const sender = profiles.find((p) => p.id === m.senderId);
                      return (
                        <div key={m.id} className="p-4 rounded-lg academy-elevated space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-teal-400 font-semibold">
                              From: {sender?.fullName || 'Student'} ({sender?.email})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (sender) setReplyToProfileId(sender.id);
                                setMsgSubject(`Re: ${m.subject}`);
                                setInboxTab('compose');
                              }}
                              className="text-teal-400 hover:underline"
                            >
                              Reply to Student
                            </button>
                          </div>
                          <div className="font-semibold text-sm">{m.subject}</div>
                          <p className="text-xs academy-text-secondary">{m.body}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODULE G: MUSTAQEEM SHAIKH ("MS" OR CUSTOM UPLOAD) & STUDENT ENROLLMENTS */}
          {activeModule === 'users' && (
            <div className="space-y-6">
              {/* Principal Faculty Mustaqeem Shaikh Profile Image Manager ("MS" by default or custom upload) */}
              <div className="rounded-xl academy-surface p-6 space-y-4 border border-teal-500/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {founderProfile?.avatarUrl ? (
                      <img
                        src={founderProfile.avatarUrl}
                        alt="Mustaqeem Shaikh"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-400 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400/25 to-cyan-500/15 border-2 border-teal-400 flex items-center justify-center font-display text-2xl font-bold text-teal-300 shrink-0">
                        MS
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-teal-400">
                        Principal Faculty &amp; Founder Emblem
                      </div>
                      <h3 className="font-display text-lg font-bold">Ustadh Mustaqeem Shaikh</h3>
                      <p className="text-xs academy-text-secondary">
                        Currently displaying:{' '}
                        <strong>
                          {founderProfile?.avatarUrl
                            ? 'Custom Uploaded Portrait'
                            : '“MS” Monogram Emblem (Default)'}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingFounderAvatar ? 'Uploading...' : 'Upload Custom Photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingFounderAvatar(true);
                          try {
                            const url = await onUploadFile(file);
                            const res = await authFetch('/api/admin/founder-avatar', {
                              method: 'PUT',
                              body: JSON.stringify({ avatarUrl: url }),
                            });
                            if (res.ok) {
                              await onRefreshData();
                              showNotice('Mustaqeem Shaikh portrait updated!');
                            }
                          } finally {
                            setUploadingFounderAvatar(false);
                          }
                        }}
                      />
                    </label>
                    {founderProfile?.avatarUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await authFetch('/api/admin/founder-avatar', {
                            method: 'PUT',
                            body: JSON.stringify({ avatarUrl: null }),
                          });
                          if (res.ok) {
                            await onRefreshData();
                            showNotice('Reset Mustaqeem Shaikh avatar back to "MS" monogram.');
                          }
                        }}
                        className="px-3.5 py-2 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400"
                      >
                        Reset to &ldquo;MS&rdquo; Monogram
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Manual Student Enrollment */}
              <div className="rounded-xl academy-surface p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-teal-400">
                  Manually Enroll Student in Course
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">Student</label>
                    <select
                      value={enrollStudentId}
                      onChange={(e) => setEnrollStudentId(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg academy-elevated"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">Course</label>
                    <select
                      value={enrollCourseId || courses[0]?.id || 0}
                      onChange={(e) => setEnrollCourseId(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg academy-elevated"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const targetCourseId = enrollCourseId || courses[0]?.id;
                      if (!targetCourseId) return;
                      const res = await authFetch('/api/enrollments', {
                        method: 'POST',
                        body: JSON.stringify({
                          studentId: enrollStudentId,
                          courseId: targetCourseId,
                        }),
                      });
                      if (res.ok) {
                        await onRefreshData();
                        showNotice('Student enrolled in course.');
                      }
                    }}
                    className="py-2 px-4 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 whitespace-nowrap"
                  >
                    Enroll Student
                  </button>
                </div>
              </div>

              {/* Registered Users Table */}
              <div className="rounded-xl academy-surface p-6 space-y-4">
                <h3 className="font-display text-base font-bold">
                  Registered Academy Users ({profiles.length})
                </h3>
                <div className="space-y-2.5">
                  {profiles.map((p) => {
                    const userEnrollments = enrollments.filter((e) => e.studentId === p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg academy-elevated"
                      >
                        <div>
                          <div className="text-sm font-semibold">{p.fullName}</div>
                          <div className="text-xs academy-text-secondary">
                            {p.email} · Enrolled in {userEnrollments.length} course(s)
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={p.role}
                            onChange={async (e) => {
                              await authFetch(`/api/admin/profiles/${p.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({ role: e.target.value }),
                              });
                              await onRefreshData();
                              showNotice(`Updated ${p.fullName} role.`);
                            }}
                            className="px-2.5 py-1.5 text-xs rounded academy-surface font-mono-tabular"
                          >
                            <option value="student">student</option>
                            <option value="instructor">instructor</option>
                            <option value="admin">admin</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
