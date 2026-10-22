import React, { useState, useMemo, useEffect } from 'react';
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
  Sparkles,
  AlertCircle,
  Eye,
  Tag,
  X,
  Settings2,
  Crown,
  Key,
  Copy,
  Check,
  ExternalLink,
  Megaphone,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Search,
  Award,
  HelpCircle,
} from 'lucide-react';
import { smartApiFetch } from '../lib/fallbackStore.ts';
import { AnimatedPdfViewer } from './AnimatedPdfViewer.tsx';
import { ZoomMeetingLauncherModal } from './ZoomMeetingLauncherModal.tsx';
import {
  generateRealZoomMeeting,
  getZoomEventDetails,
  safeOpenLink,
  generateZoomInvitationText,
  formatZoomMeetingId,
} from '../lib/zoomService.ts';
import { resolvePlayableVideoUrl } from '../lib/mediaStorage.ts';
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
  HomeworkAssignment,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  Announcement,
  RoleApplication,
  ClassSurvey,
  parseCourseTags,
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
  | 'users'
  | 'teacher_students'
  | 'applications'
  | 'announcements'
  | 'surveys';

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
  announcements?: Announcement[];
  roleApplications?: RoleApplication[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onUploadFile: (file: File) => Promise<string>;
  onRefreshData: () => Promise<void>;
  onNavigateToStudentDashboard: () => void;
  onOpenAuthModal?: () => void;
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
  announcements = [],
  roleApplications = [],
  authFetch,
  onUploadFile,
  onRefreshData,
  onNavigateToStudentDashboard,
  onOpenAuthModal,
}) => {
  const detectedTz = useMemo(() => getDetectedUserTimezone(), []);
  const isFullAdmin = profile?.role === 'admin';
  const isInstructor = profile?.role === 'instructor';

  // Toggle between Full Admin View and Dedicated Teacher Dashboard (for admins and teachers)
  const [isTeacherMode, setIsTeacherMode] = useState<boolean>(() => {
    return isInstructor || (!isFullAdmin ? true : false);
  });

  // State for inspecting an individual student's course dashboard (showing ONLY the course this teacher teaches!)
  const [selectedStudentCourseDashboard, setSelectedStudentCourseDashboard] = useState<{
    student: Profile;
    course: Course;
    enrollment: Enrollment;
  } | null>(null);

  // New Course Announcement state
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnCourseId, setNewAnnCourseId] = useState<number | 'all'>('all');
  const [newAnnPriority, setNewAnnPriority] = useState<'normal' | 'important'>('normal');
  const [isPostingAnn, setIsPostingAnn] = useState(false);

  // Teacher Student Roster & Dashboard inspection state
  const [teacherStudentSearch, setTeacherStudentSearch] = useState('');
  const [teacherCourseFilter, setTeacherCourseFilter] = useState<number | 'all'>('all');
  const [directStudentMessage, setDirectStudentMessage] = useState('');
  const [sendingDirectMessage, setSendingDirectMessage] = useState(false);

  // Role applications filter
  const [appStatusFilter, setAppStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Class Surveys state
  const [classSurveys, setClassSurveys] = useState<ClassSurvey[]>([]);
  const [surveyCourseFilter, setSurveyCourseFilter] = useState<number | 'all'>('all');
  const [loadingSurveys, setLoadingSurveys] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingSurveys(true);
    authFetch('/api/class-surveys')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted) setClassSurveys(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (isMounted) setClassSurveys([]);
      })
      .finally(() => {
        if (isMounted) setLoadingSurveys(false);
      });
    return () => {
      isMounted = false;
    };
  }, [authFetch]);

  // Dedicated Teacher Instructed Courses resolution
  const teacherInstructedCourses = useMemo(() => {
    if (!profile) return courses;
    const cleanProfileName = profile.fullName.trim().toLowerCase();
    const isFounderOrAdmin =
      isFullAdmin ||
      profile.email.toLowerCase() === 'mustaqeemshaikh004@gmail.com' ||
      profile.email.toLowerCase() === 'mustaqeem.sca@gmail.com' ||
      profile.email.toLowerCase() === 'faculty@deenhijrah.edu' ||
      cleanProfileName.includes('mustaqeem') ||
      cleanProfileName.includes('shaikh');

    const exactMatched = courses.filter(
      (c) =>
        c.instructorId === profile.id ||
        c.instructorName.trim().toLowerCase() === cleanProfileName ||
        (isFounderOrAdmin &&
          (c.instructorName.toLowerCase().includes('mustaqeem') ||
            c.instructorName.toLowerCase().includes('shaikh') ||
            !c.instructorId))
    );

    if (exactMatched.length > 0) return exactMatched;
    return courses;
  }, [courses, isFullAdmin, profile]);

  const managedCourses = useMemo(() => {
    if (!isTeacherMode && isFullAdmin) return courses;
    return teacherInstructedCourses;
  }, [courses, isFullAdmin, isTeacherMode, teacherInstructedCourses]);

  const managedCourseIds = useMemo(() => managedCourses.map((c) => c.id), [managedCourses]);

  const managedLessons = useMemo(() => {
    if (isFullAdmin) return lessons;
    return lessons.filter((l) => managedCourseIds.includes(l.courseId));
  }, [lessons, isFullAdmin, managedCourseIds]);

  const managedEvents = useMemo(() => {
    if (isFullAdmin) return events;
    return events.filter(
      (ev) =>
        !ev.courseId ||
        managedCourseIds.includes(ev.courseId) ||
        (ev.instructorName &&
          profile?.fullName &&
          ev.instructorName.trim().toLowerCase() === profile.fullName.trim().toLowerCase())
    );
  }, [events, isFullAdmin, managedCourseIds, profile]);

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
  const [courseCategory, setCourseCategory] = useState('Islamic Studies');
  const [coursePrice, setCoursePrice] = useState('Free');
  const [courseDuration, setCourseDuration] = useState('');
  const [courseInstructor, setCourseInstructor] = useState(() =>
    isInstructor && profile ? profile.fullName : 'Mustaqeem Shaikh'
  );
  const [courseLaunchDate, setCourseLaunchDate] = useState('');
  const [courseMaxStudents, setCourseMaxStudents] = useState<number>(30);
  const [courseInitialEnrolled, setCourseInitialEnrolled] = useState<number>(0);
  const [courseClassDays, setCourseClassDays] = useState('');
  const [courseClassStartTime, setCourseClassStartTime] = useState('14:00');
  const [courseClassTimezone, setCourseClassTimezone] = useState(detectedTz || 'America/New_York');
  const [courseShortDesc, setCourseShortDesc] = useState('');
  const [courseLongDesc, setCourseLongDesc] = useState('');
  const [courseSyllabusText, setCourseSyllabusText] = useState('');
  const [courseSyllabusFileUrl, setCourseSyllabusFileUrl] = useState('');
  const [uploadedSyllabusFileObj, setUploadedSyllabusFileObj] = useState<File | null>(null);
  const [uploadedSyllabusFileName, setUploadedSyllabusFileName] = useState<string>('');
  const [uploadingSyllabusFile, setUploadingSyllabusFile] = useState(false);
  const [inlinePdfPreviewOpen, setInlinePdfPreviewOpen] = useState(true);
  const [activePdfPreview, setActivePdfPreview] = useState<{
    url?: string;
    file?: File;
    title: string;
  } | null>(null);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [courseSaveError, setCourseSaveError] = useState<string | null>(null);
  const [courseSyllabusBoxes, setCourseSyllabusBoxes] = useState<SyllabusBox[]>([]);
  const [courseThumb, setCourseThumb] = useState('preset:seerah');
  const [courseStatus, setCourseStatus] = useState<'published' | 'draft'>('published');
  const [courseEnrollmentStatus, setCourseEnrollmentStatus] = useState<'open' | 'coming_soon' | 'live'>('open');
  const [courseTags, setCourseTags] = useState<string[]>(['Open for Enrollment', 'Live Cohort']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [confirmDeleteCourseId, setConfirmDeleteCourseId] = useState<number | null>(null);

  // Reset course form cleanly with no forced dummy data
  const resetCourseFormClean = () => {
    setEditingCourseId(null);
    setCourseTitle('');
    setCourseCategory('Islamic Studies');
    setCoursePrice('Free');
    setCourseDuration('');
    setCourseInstructor(isInstructor && profile ? profile.fullName : 'Mustaqeem Shaikh');
    setCourseLaunchDate('');
    setCourseMaxStudents(25);
    setCourseInitialEnrolled(0);
    setCourseClassDays('');
    setCourseClassStartTime('14:00');
    setCourseClassTimezone(detectedTz || 'America/New_York');
    setCourseShortDesc('');
    setCourseLongDesc('');
    setCourseSyllabusText('');
    setCourseSyllabusFileUrl('');
    setUploadedSyllabusFileObj(null);
    setUploadedSyllabusFileName('');
    setCourseSyllabusBoxes([]);
    setCourseThumb('preset:seerah');
    setCourseStatus('published');
    setCourseEnrollmentStatus('open');
    setCourseTags(['Open for Enrollment']);
    setCustomTagInput('');
    setCourseSaveError(null);
  };

  const handleStartEditingCourse = (course: Course) => {
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
    setCourseClassTimezone(course.classTimezone || 'America/New_York');
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
    setCourseEnrollmentStatus(course.enrollmentStatus || 'open');
    const existingTags = parseCourseTags(course);
    setCourseTags(existingTags.length > 0 ? existingTags : ['Open for Enrollment']);
    setActiveModule('courses');
  };

  // Lesson & Recording Form State
  const [selectedLessonCourseId, setSelectedLessonCourseId] = useState<number>(
    managedCourses[0]?.id || courses[0]?.id || 0
  );
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [resolvedLessonVideoUrl, setResolvedLessonVideoUrl] = useState('');
  const [uploadingLessonVideo, setUploadingLessonVideo] = useState(false);
  const [uploadingLessonAttachment, setUploadingLessonAttachment] = useState(false);
  const [uploadingLessonThumb, setUploadingLessonThumb] = useState(false);
  const [lessonThumb, setLessonThumb] = useState('preset:seerah');
  const [lessonDuration, setLessonDuration] = useState('45:00');
  const [lessonOrder, setLessonOrder] = useState<number>(1);
  const [lessonFreePreview, setLessonFreePreview] = useState<boolean>(false); // True = Public Orientation Recording, False = Enrolled Class Recording ONLY
  const [lessonAttachment, setLessonAttachment] = useState('');
  const [lessonScheduledDate, setLessonScheduledDate] = useState('');

  // Resolve preview video URL (resolves indexeddb:// into playable ObjectURL)
  useEffect(() => {
    if (!lessonVideoUrl) {
      setResolvedLessonVideoUrl('');
      return;
    }
    let isMounted = true;
    resolvePlayableVideoUrl(lessonVideoUrl).then((url) => {
      if (isMounted) setResolvedLessonVideoUrl(url);
    });
    return () => {
      isMounted = false;
    };
  }, [lessonVideoUrl]);

  // Zoom Live Session & Course-Specific Calendar Event Form State (with Source Timezone)
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventCourseId, setEventCourseId] = useState<string>(() => {
    if (isInstructor && managedCourses[0]) return String(managedCourses[0].id);
    return courses[0] ? String(courses[0].id) : '';
  });
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
  const [eventZoomUrl, setEventZoomUrl] = useState('');
  const [eventMeetingId, setEventMeetingId] = useState('');
  const [eventPasscode, setEventPasscode] = useState('');
  const [eventStartUrl, setEventStartUrl] = useState('');
  const [eventAppStartUrl, setEventAppStartUrl] = useState('');
  const [eventHostKey, setEventHostKey] = useState('');
  const [showManualZoomInputs, setShowManualZoomInputs] = useState(false);
  const [eventThumb, setEventThumb] = useState('preset:orientation');
  const [eventInstructor, setEventInstructor] = useState(() => {
    return isInstructor && profile?.fullName ? profile.fullName : 'Mustaqeem Shaikh';
  });
  const [eventAudience, setEventAudience] = useState<'everyone' | 'enrolled'>('everyone');
  const [activeZoomLauncherEvent, setActiveZoomLauncherEvent] = useState<CourseEvent | null>(null);
  const [activeZoomLauncherHostMode, setActiveZoomLauncherHostMode] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleAutoProvisionZoom = (overrideCourseId?: number | string, overrideTitle?: string) => {
    const rawCid = overrideCourseId !== undefined ? overrideCourseId : eventCourseId;
    const cid = rawCid ? Number(rawCid) : null;
    const parentCourse = courses.find((c) => c.id === cid);
    const teacherName =
      eventInstructor ||
      parentCourse?.instructorName ||
      profile?.fullName ||
      'Mustaqeem Shaikh';
    const targetTitle =
      overrideTitle ||
      eventTitle ||
      (parentCourse ? `Live Class: ${parentCourse.title}` : 'Live Class Session');

    const gen = generateRealZoomMeeting({
      title: targetTitle,
      courseId: cid,
      instructorName: teacherName,
    });
    setEventZoomUrl(gen.zoomJoinUrl);
    setEventMeetingId(gen.meetingId);
    setEventPasscode(gen.passcode);
    setEventStartUrl(gen.zoomStartUrl);
    setEventAppStartUrl(gen.zoomAppStartUrl);
    setEventHostKey(gen.hostKey);
    return gen;
  };

  // Auto-generate Zoom credentials on mount if empty
  useEffect(() => {
    if (!editingEventId && !eventMeetingId && eventType === 'zoom_session') {
      handleAutoProvisionZoom();
    }
  }, [editingEventId, eventType]);

  // Homepage Slide / Video Form State
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [slideBadge, setSlideBadge] = useState('Orientation Session');
  const [slideMediaType, setSlideMediaType] = useState<'video' | 'image'>('video');
  const [slideThumb, setSlideThumb] = useState('preset:hero_academy');
  const [slideVideoUrl, setSlideVideoUrl] = useState('');
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

  // Homework, Quizzes & Assessments Studio State
  const [hwStudioTab, setHwStudioTab] = useState<'submissions' | 'assign' | 'quizzes' | 'quiz_assessments'>('submissions');
  const [assignedHomeworkList, setAssignedHomeworkList] = useState<HomeworkAssignment[]>([]);
  const [quizList, setQuizList] = useState<Quiz[]>([]);
  const [quizAttemptsList, setQuizAttemptsList] = useState<QuizAttempt[]>([]);
  const [loadingHwStudio, setLoadingHwStudio] = useState(false);

  // Assign Homework Form State
  const [hwCourseId, setHwCourseId] = useState<number>(() => (isInstructor ? managedCourses[0]?.id : courses[0]?.id) || 1);
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDueDate, setHwDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [hwMaxPoints, setHwMaxPoints] = useState<number>(100);
  const [hwRubric, setHwRubric] = useState('Textual synthesis (50pts), Scholarly reflection (30pts), Precision (20pts).');
  const [hwAttachmentUrl, setHwAttachmentUrl] = useState('');
  const [isAssigningHw, setIsAssigningHw] = useState(false);

  // Create Quiz Form State
  const [newQuizCourseId, setNewQuizCourseId] = useState<number>(() => (isInstructor ? managedCourses[0]?.id : courses[0]?.id) || 1);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizDesc, setNewQuizDesc] = useState('');
  const [newQuizTimeLimit, setNewQuizTimeLimit] = useState<number>(10);
  const [newQuizPassingScore, setNewQuizPassingScore] = useState<number>(70);
  const [newQuizBadge, setNewQuizBadge] = useState('Certified Course Scholar');
  const [newQuizQuestions, setNewQuizQuestions] = useState<QuizQuestion[]>([]);

  // Draft Question Builder State
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftType, setDraftType] = useState<'multiple_choice' | 'true_false' | 'short_answer'>('multiple_choice');
  const [draftOptionA, setDraftOptionA] = useState('');
  const [draftOptionB, setDraftOptionB] = useState('');
  const [draftOptionC, setDraftOptionC] = useState('');
  const [draftOptionD, setDraftOptionD] = useState('');
  const [draftCorrectIndex, setDraftCorrectIndex] = useState<number>(0);
  const [draftExplanation, setDraftExplanation] = useState('');
  const [draftPoints, setDraftPoints] = useState<number>(25);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);

  // Load Homework Studio data (assignments, quizzes, attempts)
  const loadHwStudioData = async () => {
    try {
      setLoadingHwStudio(true);
      const [assRes, quizRes, attRes] = await Promise.all([
        smartApiFetch('/api/assignments'),
        smartApiFetch('/api/quizzes'),
        smartApiFetch('/api/quiz-attempts'),
      ]);
      if (assRes.ok) {
        const d = await assRes.json();
        if (Array.isArray(d)) setAssignedHomeworkList(d);
      }
      if (quizRes.ok) {
        const d = await quizRes.json();
        if (Array.isArray(d)) setQuizList(d);
      }
      if (attRes.ok) {
        const d = await attRes.json();
        if (Array.isArray(d)) setQuizAttemptsList(d);
      }
    } catch (e) {
      console.warn('Failed to load homework studio data:', e);
    } finally {
      setLoadingHwStudio(false);
    }
  };

  useEffect(() => {
    if (activeModule === 'homework') {
      loadHwStudioData();
    }
  }, [activeModule]);

  // Manual Enrollment & Faculty Avatar State
  const [enrollStudentId, setEnrollStudentId] = useState<number>(profiles[0]?.id || 1);
  const [enrollCourseId, setEnrollCourseId] = useState<number>(courses[0]?.id || 0);
  const [uploadingFounderAvatar, setUploadingFounderAvatar] = useState(false);

  // Project Settings & Backup State
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [academyProjectTitle, setAcademyProjectTitle] = useState('Deen Hijrah Academia');
  const [academyProjectMotto, setAcademyProjectMotto] = useState(
    'Sacred Knowledge · Classical Pedagogy · Global Guidance'
  );
  const [streamRecordingsSetting, setStreamRecordingsSetting] = useState(true);
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(500);

  const handleExportProjectBackup = () => {
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      academyTitle: academyProjectTitle,
      academyMotto: academyProjectMotto,
      courses,
      lessons,
      events,
      slides,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deen-hijrah-project-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice('Project configuration & state exported to JSON backup file!');
  };

  const handleImportProjectBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.courses)) {
        await authFetch('/api/admin/save-state', { method: 'POST' });
        await onRefreshData();
        showNotice(`Imported project backup successfully (${parsed.courses.length} courses, ${parsed.lessons?.length || 0} recordings)!`);
        setIsProjectSettingsOpen(false);
      } else {
        showNotice('Invalid project backup format.');
      }
    } catch {
      showNotice('Error reading project JSON backup file.');
    }
  };

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
    setUploadedSyllabusFileObj(file);
    setUploadedSyllabusFileName(file.name);
    setInlinePdfPreviewOpen(true);
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
      showNotice(`Syllabus file "${file.name}" uploaded and animated pages generated!`);
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
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors shadow-sm"
              >
                Sign In as Faculty / Teacher
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateToStudentDashboard}
              className="px-6 py-2.5 rounded-lg text-xs font-semibold academy-surface hover:text-white transition-colors"
            >
              Return to Student Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Course CRUD Handlers
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCourseSaveError(null);

    const titleClean = courseTitle.trim();
    if (!titleClean) {
      setCourseSaveError('Please enter a course title to create the course.');
      showNotice('Please enter a course title.');
      return;
    }

    const safeCategory = courseCategory.trim() || 'Islamic Studies';
    const safeShort =
      courseShortDesc.trim() || `${titleClean} — Comprehensive sacred knowledge program.`;
    const safeLong = courseLongDesc.trim() || safeShort;
    const finalInstructorName = (
      isInstructor && profile ? profile.fullName : courseInstructor
    ).trim() || 'Mustaqeem Shaikh';

    setIsSavingCourse(true);
    try {
      const payload = {
        title: titleClean,
        category: safeCategory,
        price: coursePrice.trim() || 'Free',
        duration: courseDuration.trim() || '8 Weeks',
        instructorId: profile?.id || null,
        instructorName: finalInstructorName,
        launchDate: courseLaunchDate || null,
        maxStudents: Number(courseMaxStudents) || 25,
        initialEnrolledCount: Number(courseInitialEnrolled) || 0,
        classDays: courseClassDays.trim() || 'Saturday & Wednesday',
        classStartTime: courseClassStartTime || '14:00',
        classTimezone: courseClassTimezone || 'America/New_York',
        description: safeShort,
        longDescription: safeLong,
        syllabusText: courseSyllabusText.trim() || null,
        syllabusBoxes: JSON.stringify(courseSyllabusBoxes),
        syllabusFileUrl: courseSyllabusFileUrl.trim() || null,
        thumbnailUrl: courseThumb,
        status: courseStatus,
        enrollmentStatus: courseEnrollmentStatus,
        tags: JSON.stringify(courseTags),
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

      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        resetCourseFormClean();
        await onRefreshData();
        showNotice(
          editingCourseId
            ? 'Course, syllabus boxes, student limit & timezone schedule updated.'
            : 'New course created and published successfully!'
        );
      } else {
        const errorMsg =
          resData.error || 'Failed to create course. Please review the form fields.';
        setCourseSaveError(errorMsg);
        showNotice(errorMsg);
      }
    } catch (err: any) {
      console.error('Error saving course:', err);
      const msg = err.message || 'Network connection failed while creating course.';
      setCourseSaveError(msg);
      showNotice(msg);
    } finally {
      setIsSavingCourse(false);
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
      setLessonVideoUrl('');
      setResolvedLessonVideoUrl('');
      setLessonAttachment('');
      setLessonThumb('preset:seerah');
      setLessonDuration('45:00');
      setLessonScheduledDate('');
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

    // Ensure real Zoom credentials exist if this is a live zoom class
    let finalZoomUrl = eventZoomUrl.trim();
    let finalMeetingId = eventMeetingId.trim();
    let finalPasscode = eventPasscode.trim();
    let finalStartUrl = eventStartUrl.trim();
    let finalAppStartUrl = eventAppStartUrl.trim();
    let finalHostKey = eventHostKey.trim();

    if (eventType === 'zoom_session' && (!finalZoomUrl || !finalMeetingId)) {
      const generated = handleAutoProvisionZoom();
      finalZoomUrl = generated.zoomJoinUrl;
      finalMeetingId = generated.meetingId;
      finalPasscode = generated.passcode;
      finalStartUrl = generated.zoomStartUrl;
      finalAppStartUrl = generated.zoomAppStartUrl;
      finalHostKey = generated.hostKey;
    }

    const payload = {
      courseId: eventCourseId ? Number(eventCourseId) : null,
      title: eventTitle.trim(),
      description: eventDesc.trim(),
      eventType,
      eventDate,
      startTime: eventStartTime.trim() || '14:00',
      sourceTimezone: eventSourceTimezone || 'America/New_York',
      duration: eventDuration.trim(),
      zoomJoinUrl: finalZoomUrl || null,
      zoomMeetingId: finalMeetingId || null,
      zoomPasscode: finalPasscode || null,
      zoomStartUrl: finalStartUrl || null,
      zoomAppStartUrl: finalAppStartUrl || null,
      zoomHostKey: finalHostKey || null,
      thumbnailUrl: eventThumb,
      instructorName:
        eventInstructor.trim() ||
        (isInstructor && profile?.fullName ? profile.fullName : 'Mustaqeem Shaikh'),
      isPublic: eventAudience === 'everyone',
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
      handleAutoProvisionZoom();
      await onRefreshData();
      showNotice(
        'Actual Real Zoom meeting & calendar session successfully scheduled! Students can now join, and faculty can start as Host.'
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

  const handleAssignHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim() || !hwCourseId) {
      showNotice('Please provide a Homework Title and Course.');
      return;
    }
    try {
      setIsAssigningHw(true);
      const parentCourse = courses.find((c) => c.id === Number(hwCourseId));
      const res = await authFetch('/api/admin/assignments', {
        method: 'POST',
        body: JSON.stringify({
          courseId: Number(hwCourseId),
          title: hwTitle.trim(),
          description: hwDesc.trim(),
          dueDate: hwDueDate,
          maxPoints: Number(hwMaxPoints) || 100,
          rubric: hwRubric.trim(),
          attachmentUrl: hwAttachmentUrl.trim() || null,
          instructorId: profile?.id || 1,
          instructorName: profile?.fullName || parentCourse?.instructorName || 'Mustaqeem Shaikh',
        }),
      });
      if (res.ok) {
        setHwTitle('');
        setHwDesc('');
        setHwAttachmentUrl('');
        await loadHwStudioData();
        showNotice('Homework assignment dispatched to enrolled cohort with notification!');
      } else {
        showNotice('Failed to assign homework.');
      }
    } catch {
      showNotice('Error assigning homework.');
    } finally {
      setIsAssigningHw(false);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    try {
      const res = await authFetch(`/api/admin/assignments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAssignedHomeworkList((prev) => prev.filter((a) => a.id !== id));
        showNotice('Assignment deleted.');
      }
    } catch {
      showNotice('Failed to delete assignment.');
    }
  };

  const handleAddQuestionToQuiz = () => {
    if (!draftPrompt.trim()) {
      showNotice('Please write a Question Prompt.');
      return;
    }
    let options: string[] | undefined = undefined;
    if (draftType === 'multiple_choice') {
      if (!draftOptionA.trim() || !draftOptionB.trim()) {
        showNotice('Please provide at least Option A and Option B.');
        return;
      }
      options = [draftOptionA.trim(), draftOptionB.trim()];
      if (draftOptionC.trim()) options.push(draftOptionC.trim());
      if (draftOptionD.trim()) options.push(draftOptionD.trim());
    } else if (draftType === 'true_false') {
      options = ['True', 'False'];
    }

    const newQ: QuizQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      prompt: draftPrompt.trim(),
      type: draftType,
      options,
      correctOptionIndex: draftType !== 'short_answer' ? draftCorrectIndex : undefined,
      explanation: draftExplanation.trim() || 'Refer to primary source reading for analysis.',
      points: Number(draftPoints) || 25,
    };

    setNewQuizQuestions((prev) => [...prev, newQ]);
    setDraftPrompt('');
    setDraftOptionA('');
    setDraftOptionB('');
    setDraftOptionC('');
    setDraftOptionD('');
    setDraftExplanation('');
    showNotice('Question added to quiz outline!');
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) {
      showNotice('Please specify a Quiz / Assessment Title.');
      return;
    }
    if (newQuizQuestions.length === 0) {
      showNotice('Please add at least 1 question to the quiz before saving.');
      return;
    }
    try {
      setIsCreatingQuiz(true);
      const parentCourse = courses.find((c) => c.id === Number(newQuizCourseId));
      const res = await authFetch('/api/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          courseId: Number(newQuizCourseId),
          title: newQuizTitle.trim(),
          description: newQuizDesc.trim(),
          timeLimitMinutes: Number(newQuizTimeLimit) || 10,
          passingScore: Number(newQuizPassingScore) || 70,
          badgeReward: newQuizBadge.trim() || 'Course Scholar',
          questions: newQuizQuestions,
          instructorId: profile?.id || 1,
          instructorName: profile?.fullName || parentCourse?.instructorName || 'Mustaqeem Shaikh',
        }),
      });

      if (res.ok) {
        setNewQuizTitle('');
        setNewQuizDesc('');
        setNewQuizQuestions([]);
        await loadHwStudioData();
        showNotice('Interactive Quiz published to student curriculum with cool transitions!');
      } else {
        showNotice('Failed to create quiz.');
      }
    } catch {
      showNotice('Error creating quiz.');
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (id: number) => {
    try {
      const res = await authFetch(`/api/admin/quizzes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setQuizList((prev) => prev.filter((q) => q.id !== id));
        showNotice('Quiz deleted.');
      }
    } catch {
      showNotice('Failed to delete quiz.');
    }
  };

  const handleGradeAssessmentAttempt = async (attemptId: number, feedback: string, status: string, score: number) => {
    try {
      const res = await authFetch(`/api/admin/assessments/${attemptId}/grade`, {
        method: 'PUT',
        body: JSON.stringify({
          assessmentFeedback: feedback,
          assessmentStatus: status,
          score,
          assessedBy: profile?.fullName || 'Mustaqeem Shaikh',
        }),
      });
      if (res.ok) {
        await loadHwStudioData();
        showNotice('Assessment score and certification status updated!');
      }
    } catch {
      showNotice('Failed to update assessment.');
    }
  };

  return (
    <div className="w-full max-w-[1920px] 2xl:max-w-[2400px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 2xl:px-12 py-6 md:py-8 space-y-6">
      {/* Top Admin / Teacher Studio Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-6 border-b academy-divider">
        <div>
          <div className="text-xs font-semibold text-teal-400 font-mono-tabular">
            {isTeacherMode
              ? `Faculty & Teacher Portal · Instructor Workspace · ${profile?.fullName || 'Mustaqeem Shaikh'}`
              : 'Academy Director Portal (/admin) · Principal Faculty: Mustaqeem Shaikh'}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1 text-white">
            {isTeacherMode
              ? 'Course Teaching Studio, Student Dashboards & Grading'
              : 'Academy Curriculum, Syllabi, Recordings, Access & Schedule Manager'}
          </h1>
          <p className="text-xs academy-text-secondary mt-1">
            {isTeacherMode
              ? `Teacher Dashboard: Manage course recordings, grade student homework, view session surveys, and inspect student dashboards for your courses.`
              : 'Director Portal: Full academy administrative access, course creation, user roles, access applications, and site configuration.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isFullAdmin && (
            <button
              type="button"
              onClick={() => {
                const nextMode = !isTeacherMode;
                setIsTeacherMode(nextMode);
                setActiveModule(nextMode ? 'teacher_students' : 'courses');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                isTeacherMode
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 ring-2 ring-amber-400/50'
                  : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>{isTeacherMode ? 'Switch to Full Admin Director' : 'Switch to Teacher Dashboard'}</span>
            </button>
          )}

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

          <button
            type="button"
            onClick={() => setIsProjectSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold academy-elevated hover:border-teal-400 text-teal-300 transition-colors whitespace-nowrap shadow-sm"
          >
            <Settings2 className="w-4 h-4 text-teal-400" />
            <span>Project Save Settings</span>
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
          {(isTeacherMode
            ? [
                {
                  id: 'teacher_students',
                  label: 'Students & Course Dashboards',
                  icon: Users,
                  count: enrollments.filter((e) => managedCourseIds.includes(e.courseId)).length,
                },
                {
                  id: 'courses',
                  label: 'My Courses & Syllabi',
                  icon: BookOpen,
                  count: managedCourses.length,
                },
                {
                  id: 'lessons',
                  label: 'Upload Class Recordings',
                  icon: Video,
                  count: managedLessons.length,
                },
                {
                  id: 'homework',
                  label: 'Grade Student Homework',
                  icon: FileText,
                  count: managedHomework.length,
                },
                {
                  id: 'announcements',
                  label: 'Post Course Announcements',
                  icon: Megaphone,
                  count: announcements.filter(
                    (a) => !a.courseId || managedCourseIds.includes(a.courseId)
                  ).length,
                },
                {
                  id: 'surveys',
                  label: 'Daily Session Surveys',
                  icon: ThumbsUp,
                  count: classSurveys.filter((s) => managedCourseIds.includes(s.courseId)).length,
                },
                {
                  id: 'zoom_calendar',
                  label: 'Live Zoom Schedule',
                  icon: Calendar,
                  count: managedEvents.length,
                },
                {
                  id: 'inbox',
                  label: 'Student Messages',
                  icon: Mail,
                  count: unreadMessagesCount,
                },
              ]
            : [
                {
                  id: 'courses',
                  label: 'Courses & Syllabus Manager',
                  icon: BookOpen,
                  count: courses.length,
                },
                {
                  id: 'lessons',
                  label: 'Lecture Recordings Vault',
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
                  label: 'All Student Homework',
                  icon: FileText,
                  count: homework.length,
                },
                {
                  id: 'announcements',
                  label: 'Academy Announcements',
                  icon: Megaphone,
                  count: announcements.length,
                },
                {
                  id: 'surveys',
                  label: 'Student Feedback & Surveys',
                  icon: ThumbsUp,
                  count: classSurveys.length,
                },
                {
                  id: 'applications',
                  label: 'Admin Access Requests',
                  icon: ShieldCheck,
                  count: roleApplications.filter((a) => a.status === 'pending').length,
                },
                {
                  id: 'users',
                  label: 'Faculty (MS) & User Roles',
                  icon: Users,
                  count: profiles.length,
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
          {/* TEACHER DASHBOARD: COURSES YOU INSTRUCT SHOWCASE */}
          <section className="rounded-2xl academy-surface p-5 sm:p-6 border border-teal-500/25 space-y-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b academy-divider">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-400/10 text-teal-400">
                    <GraduationCap className="w-5 h-5" />
                  </span>
                  <h2 className="font-display text-base sm:text-lg font-bold text-white">
                    Courses You Instruct ({teacherInstructedCourses.length})
                  </h2>
                </div>
                <p className="text-xs academy-text-secondary mt-1">
                  Active academic programs instructed by{' '}
                  <strong className="text-teal-300 font-semibold">{profile?.fullName || 'Principal Faculty'}</strong>.
                  Manage syllabi, class recordings, coursework, and review enrolled students.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs font-semibold text-teal-300">
                  {teacherInstructedCourses.reduce(
                    (acc, c) =>
                      acc + enrollments.filter((e) => e.courseId === c.id).length,
                    0
                  )}{' '}
                  Enrolled Students
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300">
                  {lessons.filter((l) =>
                    teacherInstructedCourses.some((c) => c.id === l.courseId)
                  ).length}{' '}
                  Recordings
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetCourseFormClean();
                    setActiveModule('courses');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Course</span>
                </button>
              </div>
            </div>

            {teacherInstructedCourses.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs academy-text-secondary">
                  No courses are currently assigned to your instructor profile.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetCourseFormClean();
                    setActiveModule('courses');
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 cursor-pointer"
                >
                  Create Your First Course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherInstructedCourses.map((c) => {
                  const courseEnrolledCount = enrollments.filter(
                    (e) => e.courseId === c.id
                  ).length;
                  const courseLessonsCount = lessons.filter(
                    (l) => l.courseId === c.id
                  ).length;
                  const maxCap = c.maxStudents || 25;
                  const capPercent = Math.min(
                    100,
                    Math.round((courseEnrolledCount / maxCap) * 100)
                  );

                  return (
                    <div
                      key={c.id}
                      className="rounded-xl academy-elevated border border-slate-800 hover:border-teal-500/40 p-4 space-y-3 flex flex-col justify-between transition-all group shadow-sm"
                    >
                      <div className="space-y-3">
                        {/* Course Thumbnail & Status Banner */}
                        <div className="relative rounded-lg overflow-hidden aspect-video bg-black/60">
                          <img
                            src={resolveThumbnailUrl(c.thumbnailUrl)}
                            alt={c.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                ACADEMY_ASSETS.courseSeerah;
                            }}
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-teal-300 border border-teal-500/30">
                              {c.category}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                                c.status === 'published'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {c.status}
                            </span>
                          </div>
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-amber-300 border border-amber-500/30">
                            {c.price || 'Free'}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="font-display text-sm font-bold text-white line-clamp-1 group-hover:text-teal-300 transition-colors">
                            {c.title}
                          </h3>
                          <p className="text-[11px] academy-text-secondary line-clamp-2 mt-1">
                            {c.description}
                          </p>
                        </div>

                        {/* Class Timing & Schedule */}
                        <div className="p-2.5 rounded-lg academy-surface border border-slate-800 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="academy-text-muted flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-teal-400" />
                              <span>{c.classDays || 'Flexible Schedule'}</span>
                            </span>
                            <span className="font-mono text-teal-300 font-semibold">
                              {c.classStartTime || '14:00'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            TZ: {c.classTimezone || 'America/New_York'}
                          </div>
                        </div>

                        {/* Enrollment Capacity Progress */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="academy-text-secondary flex items-center gap-1">
                              <Users className="w-3 h-3 text-teal-400" />
                              <span>Enrolled Students</span>
                            </span>
                            <span className="font-mono font-bold text-white">
                              {courseEnrolledCount} / {maxCap}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                capPercent >= 90
                                  ? 'bg-rose-400'
                                  : capPercent >= 60
                                  ? 'bg-amber-400'
                                  : 'bg-teal-400'
                              }`}
                              style={{ width: `${capPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Key Count Badges */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-center">
                            <div className="font-mono font-bold text-teal-300">
                              {courseLessonsCount}
                            </div>
                            <div className="text-[10px] text-slate-400">Recordings</div>
                          </div>
                          <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-center">
                            <div className="font-mono font-bold text-amber-300">
                              {c.duration || '8 Weeks'}
                            </div>
                            <div className="text-[10px] text-slate-400">Duration</div>
                          </div>
                        </div>
                      </div>

                      {/* Teacher Quick Action Buttons */}
                      <div className="pt-2 border-t border-slate-800 space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLessonCourseId(c.id);
                              setActiveModule('lessons');
                              showNotice(`Viewing recordings for "${c.title}"`);
                            }}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors cursor-pointer"
                            title="Upload and manage recordings for this course"
                          >
                            <Video className="w-3 h-3" />
                            <span>Recordings</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditingCourse(c)}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold academy-surface hover:text-white border border-slate-700 hover:border-teal-400 transition-colors cursor-pointer"
                            title="Edit course syllabus and information"
                          >
                            <Edit3 className="w-3 h-3 text-teal-400" />
                            <span>Syllabus</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setHwCourseId(c.id);
                              setNewQuizCourseId(c.id);
                              setActiveModule('homework');
                              setHwStudioTab('assign');
                              showNotice(`Coursework studio opened for "${c.title}"`);
                            }}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium academy-surface hover:text-white border border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer"
                            title="Assign homework or create quizzes for this course"
                          >
                            <FileText className="w-3 h-3 text-amber-400" />
                            <span>Homework/Quiz</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModule('teacher_students');
                              showNotice(`Inspecting students for "${c.title}"`);
                            }}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium academy-surface hover:text-white border border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer"
                            title="Inspect student enrollments and attendance"
                          >
                            <Users className="w-3 h-3 text-teal-400" />
                            <span>Students ({courseEnrolledCount})</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetCourseFormClean}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-teal-300 border border-teal-500/30 transition-colors"
                      title="Clear all fields and start a fresh course without any pre-filled dummy data"
                    >
                      + Blank Course Form
                    </button>
                    {editingCourseId && (
                      <button
                        type="button"
                        onClick={resetCourseFormClean}
                        className="text-xs academy-text-secondary hover:text-teal-400"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </div>

                {courseSaveError && (
                  <div className="p-3.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{courseSaveError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCourseSaveError(null)}
                      className="text-rose-400 hover:text-rose-200"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Multi-Tag Options & Badges (Live, Open for Enrollment, Orientations Free, etc.) */}
                <div className="p-4 rounded-xl academy-elevated border border-teal-500/30 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold text-teal-300 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-teal-400" />
                        <span>Course Multi-Tags &amp; Status Badges (Visible on Cards &amp; Filters)</span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Assign multiple tags at once (e.g. &ldquo;Live Cohort&rdquo;, &ldquo;Open for Enrollment&rdquo;, &ldquo;Orientations Free&rdquo;). Click presets to toggle or type any custom tag.
                      </p>
                    </div>
                    <div className="text-[11px] font-mono-tabular text-teal-300 font-semibold shrink-0">
                      {courseTags.length} Tag{courseTags.length === 1 ? '' : 's'} Active
                    </div>
                  </div>

                  {/* Active Selected Tags Chips */}
                  <div className="flex flex-wrap items-center gap-2 min-h-10 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    {courseTags.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">No tags selected. Click presets below or add a custom tag.</span>
                    ) : (
                      courseTags.map((tag, idx) => {
                        const isLive = tag.toLowerCase().includes('live');
                        const isOpen = tag.toLowerCase().includes('open');
                        const isComing = tag.toLowerCase().includes('coming');
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm transition-all ${
                              isLive
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                                : isOpen
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                                : isComing
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                : 'bg-teal-500/20 text-teal-200 border border-teal-500/50'
                            }`}
                          >
                            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                            {isOpen && !isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                            {isComing && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => setCourseTags((prev) => prev.filter((t) => t !== tag))}
                              className="hover:text-white p-0.5 ml-0.5 rounded hover:bg-white/10"
                              title="Remove tag"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Quick Preset Tags to Click and Toggle */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Preset Tags (Click to Toggle):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Open for Enrollment' },
                        { label: 'Live Cohort' },
                        { label: 'Live Now' },
                        { label: 'Coming Soon' },
                        { label: 'Orientations Free' },
                        { label: 'Weekend Intensive' },
                        { label: 'Self-Paced / Recorded' },
                        { label: 'Certificate Program' },
                        { label: 'Flagship Program' },
                      ].map((preset) => {
                        const isSelected = courseTags.includes(preset.label);
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setCourseTags((prev) => prev.filter((t) => t !== preset.label));
                              } else {
                                setCourseTags((prev) => [...prev, preset.label]);
                                if (preset.label.toLowerCase().includes('live')) setCourseEnrollmentStatus('live');
                                else if (preset.label.toLowerCase().includes('open')) setCourseEnrollmentStatus('open');
                                else if (preset.label.toLowerCase().includes('coming')) setCourseEnrollmentStatus('coming_soon');
                              }
                            }}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                              isSelected
                                ? 'bg-teal-400 text-slate-950 font-bold border-teal-300 shadow-sm'
                                : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Tag Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = customTagInput.trim();
                          if (val && !courseTags.includes(val)) {
                            setCourseTags((prev) => [...prev, val]);
                            setCustomTagInput('');
                          }
                        }
                      }}
                      placeholder="Type custom tag (e.g. Ramadan Intensive, Foundational, Arabic Beginners)..."
                      className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = customTagInput.trim();
                        if (val && !courseTags.includes(val)) {
                          setCourseTags((prev) => [...prev, val]);
                          setCustomTagInput('');
                        }
                      }}
                      disabled={!customTagInput.trim()}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      + Add Tag
                    </button>
                  </div>
                </div>

                {/* Cohort Admissions & Enrollment Status */}
                <div>
                  <label className="block text-xs font-semibold text-teal-400 mb-1.5">
                    Primary Enrollment Mode (Synced with Admissions Wizard) *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'open',
                        label: 'Open for Enrollment',
                        sub: 'Admissions active; students can enroll via multi-step wizard',
                      },
                      {
                        id: 'coming_soon',
                        label: 'Coming Soon',
                        sub: 'Waitlist open; cohort starting soon',
                      },
                      {
                        id: 'live',
                        label: 'Live Cohort In-Session',
                        sub: 'Current cohort underway; lectures in progress',
                      },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setCourseEnrollmentStatus(st.id as any);
                          // Also automatically add tag if not yet present
                          if (st.id === 'live' && !courseTags.includes('Live Cohort') && !courseTags.includes('Live Now')) {
                            setCourseTags((prev) => [...prev, 'Live Cohort']);
                          } else if (st.id === 'open' && !courseTags.includes('Open for Enrollment')) {
                            setCourseTags((prev) => [...prev, 'Open for Enrollment']);
                          } else if (st.id === 'coming_soon' && !courseTags.includes('Coming Soon')) {
                            setCourseTags((prev) => [...prev, 'Coming Soon']);
                          }
                        }}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          courseEnrollmentStatus === st.id
                            ? 'border-teal-400 bg-teal-400/20 text-teal-200 ring-2 ring-teal-400/40 shadow-sm'
                            : 'border-slate-800 academy-elevated text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              st.id === 'open'
                                ? 'bg-emerald-400 animate-pulse'
                                : st.id === 'coming_soon'
                                ? 'bg-amber-400'
                                : 'bg-teal-400'
                            }`}
                          />
                          <span>{st.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">{st.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      value={courseTitle}
                      onChange={(e) => {
                        setCourseTitle(e.target.value);
                        if (courseSaveError) setCourseSaveError(null);
                      }}
                      placeholder="e.g. The Prophetic Seerah: Analytical Chronicles"
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Category
                    </label>
                    <input
                      type="text"
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                        placeholder="e.g. 12 Weeks"
                        className="w-full px-3 py-2 text-sm rounded-lg academy-elevated"
                      />
                    </div>
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">Enrollment State</label>
                      <select
                        value={courseEnrollmentStatus}
                        onChange={(e) =>
                          setCourseEnrollmentStatus(e.target.value as 'open' | 'coming_soon' | 'live')
                        }
                        className="w-full px-2 py-2 text-sm rounded-lg academy-elevated font-medium text-teal-300"
                      >
                        <option value="open">🟢 Open for Enrollment</option>
                        <option value="coming_soon">🟡 Coming Soon</option>
                        <option value="live">🔴 Live Now</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">Visibility</label>
                      <select
                        value={courseStatus}
                        onChange={(e) =>
                          setCourseStatus(e.target.value as 'published' | 'draft')
                        }
                        className="w-full px-2 py-2 text-sm rounded-lg academy-elevated"
                      >
                        <option value="published">Published (Visible to All)</option>
                        <option value="draft">Draft (Admin Only)</option>
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
                    Short Summary Description
                  </label>
                  <input
                    type="text"
                    value={courseShortDesc}
                    onChange={(e) => setCourseShortDesc(e.target.value)}
                    placeholder="Concise 1-2 sentence overview for the course card (auto-generated if left blank)..."
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
                        Upload a syllabus file (.txt, .md, .pdf) with animated page-turn transitions,
                        or type syllabus text and modular boxes.
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
                    <div className="rounded-xl academy-surface p-4 border border-teal-500/30 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b academy-divider">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white truncate max-w-[220px] sm:max-w-xs">
                                {uploadedSyllabusFileName || 'Course_Syllabus.pdf'}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                                <Sparkles className="w-2.5 h-2.5" />
                                Animated Pages Ready
                              </span>
                            </div>
                            <span className="text-[11px] academy-text-secondary">
                              Uploaded syllabus document will animate with page-turn transitions for students.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setActivePdfPreview({
                                url: courseSyllabusFileUrl,
                                file: uploadedSyllabusFileObj || undefined,
                                title: `${courseTitle.trim() || 'Course'} — Syllabus Document`,
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview Animated Pages</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCourseSyllabusFileUrl('');
                              setUploadedSyllabusFileObj(null);
                              setUploadedSyllabusFileName('');
                            }}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Embedded Animated Page Reader inside the form */}
                      {inlinePdfPreviewOpen && (
                        <div className="rounded-lg overflow-hidden border border-teal-500/20 bg-slate-950/80">
                          <div className="p-2.5 bg-slate-900/90 border-b border-teal-500/20 flex items-center justify-between text-xs">
                            <span className="font-semibold text-teal-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Interactive Animated Page Turn Preview
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setActivePdfPreview({
                                    url: courseSyllabusFileUrl,
                                    file: uploadedSyllabusFileObj || undefined,
                                    title: `${courseTitle.trim() || 'Course'} — Syllabus Document`,
                                  })
                                }
                                className="text-[11px] text-teal-400 hover:underline flex items-center gap-1"
                              >
                                <span>Fullscreen Reader</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlinePdfPreviewOpen(false)}
                                className="text-[11px] academy-text-muted hover:text-white"
                              >
                                Hide Preview
                              </button>
                            </div>
                          </div>
                          <AnimatedPdfViewer
                            url={courseSyllabusFileUrl}
                            file={uploadedSyllabusFileObj}
                            title={`${courseTitle.trim() || 'Course'} — Syllabus`}
                            variant="embedded"
                          />
                        </div>
                      )}
                      {!inlinePdfPreviewOpen && (
                        <button
                          type="button"
                          onClick={() => setInlinePdfPreviewOpen(true)}
                          className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show Animated Page Preview</span>
                        </button>
                      )}
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

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSavingCourse}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap shadow-md cursor-pointer"
                  >
                    {isSavingCourse ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Uploading Course &amp; Syllabus...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>
                          {editingCourseId
                            ? 'Save Course, Syllabus & Capacity Changes'
                            : 'Create Course with Syllabus & Capacity Limit'}
                        </span>
                      </>
                    )}
                  </button>

                  {editingCourseId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourseId(null);
                        setCourseTitle('');
                        setCourseShortDesc('');
                        setCourseLongDesc('');
                        setCourseSyllabusText('');
                        setCourseSyllabusFileUrl('');
                        setUploadedSyllabusFileObj(null);
                        setUploadedSyllabusFileName('');
                        setCourseSaveError(null);
                      }}
                      className="px-4 py-2.5 rounded-lg text-xs font-medium academy-elevated hover:bg-white/10"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
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
                              loading="lazy"
                              decoding="async"
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
                              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                {parseCourseTags(course).map((tag, tIdx) => {
                                  const isLive = tag.toLowerCase().includes('live');
                                  const isOpen = tag.toLowerCase().includes('open');
                                  return (
                                    <span
                                      key={tIdx}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        isLive
                                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                          : isOpen
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                                      }`}
                                    >
                                      {tag}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveModule('zoom_calendar');
                                setEditingEventId(null);
                                setEventCourseId(String(course.id));
                                setEventTitle(`Live Zoom Class: ${course.title}`);
                                setEventInstructor(
                                  course.instructorName || profile?.fullName || 'Mustaqeem Shaikh'
                                );
                                setEventType('zoom_session');
                                handleAutoProvisionZoom(course.id, `Live Zoom Class: ${course.title}`);
                                window.scrollTo({ top: 300, behavior: 'smooth' });
                                showNotice(
                                  `Ready to schedule Zoom session for "${course.title}". Real Zoom session auto-generated!`
                                );
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-teal-400/20 text-teal-300 border border-teal-400/40 hover:bg-teal-400/30 whitespace-nowrap transition-colors"
                              title="Schedule an actual Live Zoom session for this course"
                            >
                              <Video className="w-3.5 h-3.5 text-teal-400" />
                              <span>+ Schedule Zoom</span>
                            </button>
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
                                setCourseEnrollmentStatus(course.enrollmentStatus || 'open');
                                const existingTags = parseCourseTags(course);
                                setCourseTags(existingTags.length > 0 ? existingTags : ['Open for Enrollment']);
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
                                  showNotice(`Video recording "${file.name}" uploaded successfully!`);
                                } catch (err: any) {
                                  showNotice(`Upload error: ${err.message || 'Could not upload recording'}`);
                                } finally {
                                  setUploadingLessonVideo(false);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Live Video Preview Box for Admin/Teacher verification */}
                      {lessonVideoUrl.trim() && (
                        <div className="mt-2.5 p-3 rounded-xl bg-black/70 border border-teal-500/30 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-teal-300">
                            <span className="font-semibold flex items-center gap-1.5">
                              <Film className="w-3.5 h-3.5 text-teal-400" />
                              <span>Recording Preview Ready</span>
                            </span>
                            <span className="truncate max-w-xs text-slate-400 font-mono-tabular">
                              {lessonVideoUrl}
                            </span>
                          </div>
                          <video
                            src={resolvedLessonVideoUrl || lessonVideoUrl}
                            controls
                            preload="metadata"
                            playsInline
                            className="w-full max-h-48 rounded-lg bg-black object-contain"
                          />
                        </div>
                      )}
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

                    {/* Advanced Recording Thumbnail & Cover Uploader with Live 16:9 Preview */}
                    <div className="p-4 rounded-xl academy-elevated border border-teal-500/25 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                          <span>Recording Video Thumbnail / Cover Artwork</span>
                        </label>
                        {lessonThumb && (
                          <span className="text-[11px] text-teal-300 font-mono">
                            {lessonThumb.startsWith('preset:')
                              ? 'Preset Cover'
                              : lessonThumb.startsWith('data:') || lessonThumb.includes('/uploads/')
                              ? 'Custom Uploaded'
                              : 'Custom Image'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        {/* Live 16:9 Aspect Ratio Thumbnail Preview Box */}
                        <div className="md:col-span-5 relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center group shadow-md">
                          <img
                            src={resolveThumbnailUrl(lessonThumb || 'preset:seerah')}
                            alt="Recording Thumbnail Preview"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = ACADEMY_ASSETS.courseSeerah;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2.5">
                            <div className="text-[10px] font-medium text-slate-200 truncate flex items-center gap-1">
                              <Film className="w-3 h-3 text-teal-400" />
                              <span>Player Thumbnail Preview</span>
                            </div>
                          </div>
                        </div>

                        {/* Controls: Upload Image, Course Cover Copy, URL, and Presets */}
                        <div className="md:col-span-7 space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-all shadow-sm">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{uploadingLessonThumb ? 'Uploading Image...' : 'Upload Image from Computer'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingLessonThumb}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setUploadingLessonThumb(true);
                                  try {
                                    const url = await onUploadFile(file);
                                    setLessonThumb(url);
                                    showNotice(`Recording cover artwork "${file.name}" uploaded successfully!`);
                                  } catch (err: any) {
                                    showNotice(`Thumbnail upload error: ${err.message || 'Could not upload image'}`);
                                  } finally {
                                    setUploadingLessonThumb(false);
                                  }
                                }}
                              />
                            </label>
                            {courses.find((c) => c.id === activeCourseIdForLessons)?.thumbnailUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const c = courses.find((item) => item.id === activeCourseIdForLessons);
                                  if (c?.thumbnailUrl) {
                                    setLessonThumb(c.thumbnailUrl);
                                    showNotice('Applied course thumbnail as recording cover.');
                                  }
                                }}
                                className="px-3 py-2.5 rounded-lg text-[11px] font-medium academy-surface border border-slate-700 hover:text-white hover:border-teal-400 transition-colors whitespace-nowrap cursor-pointer"
                                title="Use this course's primary thumbnail"
                              >
                                Use Course Cover
                              </button>
                            )}
                          </div>

                          <div>
                            <input
                              type="text"
                              value={lessonThumb}
                              onChange={(e) => setLessonThumb(e.target.value)}
                              placeholder="Or paste custom image link (https://...)"
                              className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400 font-mono"
                            />
                          </div>

                          {/* Preset Buttons */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 mr-1">Presets:</span>
                            {PRESET_THUMBNAILS.map((p) => {
                              const isSelected = lessonThumb === p.id;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setLessonThumb(p.id)}
                                  className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                                    isSelected
                                      ? 'border-teal-400 text-teal-300 bg-teal-500/20 font-semibold'
                                      : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  {p.label.split(' ')[0]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
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
                                  showNotice(`Attachment "${file.name}" uploaded and animated pages generated!`);
                                } finally {
                                  setUploadingLessonAttachment(false);
                                }
                              }}
                            />
                          </label>
                        </div>
                        {lessonAttachment && (
                          <div className="flex items-center justify-between gap-2 mt-2 p-2 rounded bg-teal-500/10 border border-teal-500/20 text-xs">
                            <span className="text-teal-300 truncate">
                              Notes Attached: {lessonAttachment.split('?name=')[1] ? decodeURIComponent(lessonAttachment.split('?name=')[1]) : 'PDF Document'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setActivePdfPreview({
                                  url: lessonAttachment.split('?name=')[0],
                                  title: `${lessonTitle || 'Lesson'} — Notes Document`,
                                })
                              }
                              className="inline-flex items-center gap-1 text-teal-400 hover:underline font-semibold shrink-0"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Preview Animated Pages</span>
                            </button>
                          </div>
                        )}
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

                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          {editingLessonId ? 'Save Recording Changes' : 'Add Recording to Course'}
                        </span>
                      </button>
                      {editingLessonId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLessonId(null);
                            setLessonTitle('');
                            setLessonDesc('');
                            setLessonVideoUrl('');
                            setResolvedLessonVideoUrl('');
                            setLessonAttachment('');
                            setLessonThumb('preset:seerah');
                            setLessonDuration('45:00');
                            setLessonScheduledDate('');
                          }}
                          className="px-4 py-2.5 rounded-lg text-xs font-medium academy-surface hover:text-white transition-colors"
                        >
                          Cancel Editing
                        </button>
                      )}
                    </div>
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
                            loading="lazy"
                            decoding="async"
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

                  {/* Target Audience Option - Saved for Everyone vs Enrolled Only */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-teal-400 font-semibold mb-1.5">
                      Session Audience &amp; Visibility (Saved on Calendar) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEventAudience('everyone')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          eventAudience === 'everyone'
                            ? 'border-teal-400 bg-teal-400/20 text-teal-200 ring-1 ring-teal-400/40'
                            : 'border-slate-800 academy-elevated text-slate-400'
                        }`}
                      >
                        <div className="font-bold text-white flex items-center gap-2 text-xs">
                          <Users className="w-3.5 h-3.5 text-teal-400" />
                          <span>Open to Everyone (Public Master Calendar)</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Visible to all academy students, visitors, and guest scholars. Anyone can view and join.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEventAudience('enrolled')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          eventAudience === 'enrolled'
                            ? 'border-teal-400 bg-teal-400/20 text-teal-200 ring-1 ring-teal-400/40'
                            : 'border-slate-800 academy-elevated text-slate-400'
                        }`}
                      >
                        <div className="font-bold text-white flex items-center gap-2 text-xs">
                          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>Enrolled Cohort Students Only</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Live Zoom join links and recordings reserved for registered students of this course.
                        </div>
                      </button>
                    </div>
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

                {/* AUTOMATIC REAL ZOOM LIVE SESSION PROVISIONING CARD */}
                {eventType === 'zoom_session' && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-teal-950/60 via-slate-900/90 to-teal-950/40 border border-teal-500/30 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-teal-500/20">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                        </span>
                        <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                          Actual Real Zoom Session Auto-Provisioned
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const gen = handleAutoProvisionZoom();
                            showNotice(`Fresh Real Zoom meeting provisioned: ID ${gen.meetingId}`);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-400/20 hover:bg-teal-400/30 text-teal-300 border border-teal-400/30 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Re-Generate Session</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowManualZoomInputs(!showManualZoomInputs)}
                          className="text-xs text-slate-400 hover:text-white underline"
                        >
                          {showManualZoomInputs ? 'Hide Custom Inputs' : 'Edit Credentials'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg academy-elevated space-y-1">
                        <div className="text-[11px] academy-text-muted">Real Meeting ID</div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-white">
                            {formatZoomMeetingId(eventMeetingId) || '849 2038 4921'}
                          </span>
                          {eventMeetingId && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(eventMeetingId.replace(/\D/g, ''), 'form-id')}
                              className="text-teal-400 hover:text-teal-300"
                              title="Copy ID"
                            >
                              {copiedKey === 'form-id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg academy-elevated space-y-1">
                        <div className="text-[11px] academy-text-muted">Passcode</div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-white">
                            {eventPasscode || 'Deen2026'}
                          </span>
                          {eventPasscode && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(eventPasscode, 'form-pass')}
                              className="text-teal-400 hover:text-teal-300"
                              title="Copy Passcode"
                            >
                              {copiedKey === 'form-pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg academy-elevated border border-amber-500/30 bg-amber-500/5 space-y-1">
                        <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>Faculty Host PIN</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-black text-amber-300">
                            {eventHostKey || '786144'}
                          </span>
                          {eventHostKey && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(eventHostKey, 'form-hostkey')}
                              className="text-amber-400 hover:text-amber-300"
                              title="Copy Host PIN"
                            >
                              {copiedKey === 'form-hostkey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span>
                        ✅ <strong>Auto-configured</strong>: Students can click to join; Faculty &amp; Admin start meeting as Host with automated host token.
                      </span>

                      {eventStartUrl && (
                        <button
                          type="button"
                          onClick={() => safeOpenLink(eventStartUrl)}
                          className="inline-flex items-center gap-1 text-teal-400 hover:underline"
                        >
                          <span>Test Host Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Optional Manual Zoom Overrides */}
                {showManualZoomInputs && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl academy-surface border border-slate-800">
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Zoom Join URL (Override)
                      </label>
                      <input
                        type="text"
                        value={eventZoomUrl}
                        onChange={(e) => setEventZoomUrl(e.target.value)}
                        placeholder="https://zoom.us/j/..."
                        className="w-full px-3 py-2 text-xs rounded-lg academy-elevated font-mono"
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
                )}

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
                      const zoomDetails = getZoomEventDetails(ev, profile);
                      const hasZoom = Boolean(ev.zoomJoinUrl || ev.zoomMeetingId);

                      return (
                      <div
                        key={ev.id}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl academy-elevated border border-teal-500/20 hover:border-teal-500/40 transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={resolveThumbnailUrl(ev.thumbnailUrl)}
                            alt={ev.title}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                ACADEMY_ASSETS.orientationLive;
                            }}
                            className="w-16 h-11 rounded object-cover shrink-0"
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="text-xs text-teal-400 font-mono-tabular">
                              {ev.eventDate} · {ev.startTime} ({ev.sourceTimezone}) ·{' '}
                              <strong className="text-white">{parentCourse?.title || 'All Courses'}</strong>
                            </div>
                            <h4 className="font-display text-sm font-bold truncate text-white">{ev.title}</h4>

                            {hasZoom && (
                              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-mono-tabular">
                                <span className="inline-flex items-center gap-1 text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
                                  <Video className="w-3 h-3 text-teal-400" />
                                  <span>ID: {zoomDetails.formattedMeetingId}</span>
                                </span>
                                <span className="text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                                  Pass: {zoomDetails.passcode}
                                </span>
                                <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">
                                  <Crown className="w-3 h-3 text-amber-400" />
                                  <span>Host PIN: {zoomDetails.hostKey}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                          {hasZoom && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveZoomLauncherEvent(ev);
                                  setActiveZoomLauncherHostMode(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all shadow-sm shadow-amber-500/20"
                                title="Start Zoom Meeting as Faculty Host"
                              >
                                <Crown className="w-3.5 h-3.5" />
                                <span>Start as Host</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveZoomLauncherEvent(ev);
                                  setActiveZoomLauncherHostMode(false);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium academy-surface hover:border-teal-400 text-teal-300"
                                title="Join Meeting in Student Mode"
                              >
                                <Video className="w-3 h-3" />
                                <span>Join</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const text = generateZoomInvitationText({
                                    eventTitle: ev.title,
                                    courseTitle: parentCourse?.title,
                                    eventDate: ev.eventDate,
                                    startTime: ev.startTime,
                                    timezone: ev.sourceTimezone,
                                    joinUrl: zoomDetails.joinUrl,
                                    meetingId: zoomDetails.formattedMeetingId,
                                    passcode: zoomDetails.passcode,
                                    hostKey: zoomDetails.hostKey,
                                  });
                                  handleCopyText(text, `ev-${ev.id}`);
                                  showNotice('Student Zoom invite copied to clipboard!');
                                }}
                                className="p-1.5 rounded-lg academy-surface text-slate-400 hover:text-white hover:border-teal-400"
                                title="Copy Student Zoom Invite"
                              >
                                {copiedKey === `ev-${ev.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}

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
                              setEventStartUrl(ev.zoomStartUrl || '');
                              setEventAppStartUrl(ev.zoomAppStartUrl || '');
                              setEventHostKey(ev.zoomHostKey || '');
                              setEventThumb(ev.thumbnailUrl || 'preset:orientation');
                              setEventAudience(ev.isPublic ? 'everyone' : 'enrolled');
                              window.scrollTo({ top: 300, behavior: 'smooth' });
                            }}
                            className="p-1.5 rounded academy-surface hover:text-teal-400"
                            title="Edit Event"
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
                            title="Delete Event"
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
        {/* MODULE D: HOMEWORK, QUIZZES & ASSESSMENTS STUDIO */}
          {activeModule === 'homework' && (
            <div className="rounded-xl academy-surface p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b academy-divider">
                <div>
                  <h2 className="font-display text-lg font-bold text-teal-400 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-amber-400" />
                    <span>Homework, Quizzes &amp; Assessments Studio</span>
                  </h2>
                  <p className="text-xs academy-text-secondary mt-0.5">
                    Assign coursework to cohorts, design interactive quizzes with cool transitions, and evaluate student assessments.
                  </p>
                </div>

                {/* Sub-tab Navigation */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs overflow-x-auto no-scrollbar">
                  {[
                    { id: 'assign', label: 'Assign Homework', icon: Plus },
                    { id: 'quizzes', label: 'Create Quizzes', icon: Award },
                    { id: 'quiz_assessments', label: `Quiz Assessments (${quizAttemptsList.length})`, icon: ShieldCheck },
                    { id: 'submissions', label: `Homework Submissions (${(isInstructor ? managedHomework : homework).length})`, icon: FileText },
                  ].map((tab) => {
                    const active = hwStudioTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setHwStudioTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                          active
                            ? 'bg-teal-400 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TAB 1: ASSIGN HOMEWORK */}
              {hwStudioTab === 'assign' && (
                <div className="space-y-6">
                  <form onSubmit={handleAssignHomework} className="p-5 rounded-xl academy-elevated border border-teal-500/25 space-y-4">
                    <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-400" />
                      <span>Assign New Coursework / Research Folio</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Target Academic Course *</label>
                        <select
                          value={hwCourseId}
                          onChange={(e) => setHwCourseId(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800"
                        >
                          {(isInstructor ? managedCourses : courses).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Homework Title *</label>
                        <input
                          type="text"
                          required
                          value={hwTitle}
                          onChange={(e) => setHwTitle(e.target.value)}
                          placeholder="e.g. Module 2: Sarf Verb Conjugation & Morphological Folio"
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Submission Deadline *</label>
                        <input
                          type="date"
                          required
                          value={hwDueDate}
                          onChange={(e) => setHwDueDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Maximum Points / Score</label>
                        <input
                          type="number"
                          value={hwMaxPoints}
                          onChange={(e) => setHwMaxPoints(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">Assignment Instructions &amp; Prompts *</label>
                      <textarea
                        rows={3}
                        required
                        value={hwDesc}
                        onChange={(e) => setHwDesc(e.target.value)}
                        placeholder="Detail the research questions, required pages, and source citations..."
                        className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Grading Rubric / Evaluation Criteria</label>
                        <input
                          type="text"
                          value={hwRubric}
                          onChange={(e) => setHwRubric(e.target.value)}
                          placeholder="e.g. Textual analysis (50pts), Scholarly reflection (30pts)..."
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Starter Resource / Template URL (Optional)</label>
                        <input
                          type="text"
                          value={hwAttachmentUrl}
                          onChange={(e) => setHwAttachmentUrl(e.target.value)}
                          placeholder="https://... or PDF folio download"
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isAssigningHw}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAssigningHw ? 'Assigning...' : 'Dispatch Homework to Cohort'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Active Assigned Homework List */}
                  <div className="space-y-3">
                    <h4 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Currently Assigned Coursework ({assignedHomeworkList.length})
                    </h4>
                    {assignedHomeworkList.length === 0 ? (
                      <div className="py-8 text-center text-xs academy-text-secondary rounded-xl academy-surface">
                        No active homework assignments yet. Use the form above to assign coursework.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assignedHomeworkList.map((item) => {
                          const courseObj = courses.find((c) => c.id === item.courseId);
                          return (
                            <div key={item.id} className="p-4 rounded-xl academy-elevated border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-bold text-teal-400">{courseObj?.title || 'Course'}</span>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-amber-300 font-mono text-[11px]">Due: {item.dueDate}</span>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-slate-400 text-[11px]">{item.maxPoints} pts max</span>
                                </div>
                                <h5 className="font-display text-sm font-bold text-white">{item.title}</h5>
                                <p className="text-xs academy-text-secondary line-clamp-2">{item.description}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteAssignment(item.id)}
                                className="p-2 rounded-lg academy-surface text-rose-400 hover:bg-rose-500/10 shrink-0 self-end sm:self-center"
                                title="Delete Assignment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CREATE QUIZZES & ASSESSMENTS */}
              {hwStudioTab === 'quizzes' && (
                <div className="space-y-6">
                  <form onSubmit={handleSaveQuiz} className="p-5 rounded-xl academy-elevated border border-teal-500/25 space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>Interactive Quiz &amp; Milestone Assessment Creator</span>
                      </h3>
                      <span className="text-xs text-teal-300 font-mono font-bold">
                        {newQuizQuestions.length} Question{newQuizQuestions.length === 1 ? '' : 's'} Staged
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Target Academic Course *</label>
                        <select
                          value={newQuizCourseId}
                          onChange={(e) => setNewQuizCourseId(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800"
                        >
                          {(isInstructor ? managedCourses : courses).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Quiz / Assessment Title *</label>
                        <input
                          type="text"
                          required
                          value={newQuizTitle}
                          onChange={(e) => setNewQuizTitle(e.target.value)}
                          placeholder="e.g. Seerah Milestone Assessment: Early Revelation & Hijrah"
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Time Limit (Minutes)</label>
                        <input
                          type="number"
                          value={newQuizTimeLimit}
                          onChange={(e) => setNewQuizTimeLimit(Number(e.target.value))}
                          placeholder="10 (0 for untimed)"
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Passing Threshold (%)</label>
                        <input
                          type="number"
                          value={newQuizPassingScore}
                          onChange={(e) => setNewQuizPassingScore(Number(e.target.value))}
                          placeholder="70"
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Earned Badge Award</label>
                        <input
                          type="text"
                          value={newQuizBadge}
                          onChange={(e) => setNewQuizBadge(e.target.value)}
                          placeholder="e.g. Certified Seerah Scholar"
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                        />
                      </div>
                    </div>

                    {/* DYNAMIC QUESTION BUILDER */}
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Question Builder</span>
                        </span>
                        <div className="flex items-center gap-2">
                          {(['multiple_choice', 'true_false', 'short_answer'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setDraftType(t)}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition-colors ${
                                draftType === t
                                  ? 'bg-teal-400 text-slate-950 font-bold'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {t.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Question Prompt *</label>
                        <input
                          type="text"
                          value={draftPrompt}
                          onChange={(e) => setDraftPrompt(e.target.value)}
                          placeholder="e.g. Which treaty was enacted to defend the oppressed in pre-Islamic Mecca?"
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                        />
                      </div>

                      {draftType === 'multiple_choice' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            { label: 'Option A', val: draftOptionA, setVal: setDraftOptionA, idx: 0 },
                            { label: 'Option B', val: draftOptionB, setVal: setDraftOptionB, idx: 1 },
                            { label: 'Option C', val: draftOptionC, setVal: setDraftOptionC, idx: 2 },
                            { label: 'Option D', val: draftOptionD, setVal: setDraftOptionD, idx: 3 },
                          ].map((opt) => (
                            <div key={opt.label} className="flex items-center gap-2 p-2 rounded-lg academy-surface border border-slate-800">
                              <input
                                type="radio"
                                name="correctOption"
                                checked={draftCorrectIndex === opt.idx}
                                onChange={() => setDraftCorrectIndex(opt.idx)}
                                title="Mark as Correct Answer"
                                className="accent-teal-400"
                              />
                              <input
                                type="text"
                                value={opt.val}
                                onChange={(e) => opt.setVal(e.target.value)}
                                placeholder={`${opt.label} text...`}
                                className="w-full bg-transparent text-xs text-white outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {draftType === 'true_false' && (
                        <div className="flex items-center gap-4 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="tfCorrect"
                              checked={draftCorrectIndex === 0}
                              onChange={() => setDraftCorrectIndex(0)}
                              className="accent-teal-400"
                            />
                            <span className="text-white font-semibold">True is Correct</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="tfCorrect"
                              checked={draftCorrectIndex === 1}
                              onChange={() => setDraftCorrectIndex(1)}
                              className="accent-teal-400"
                            />
                            <span className="text-white font-semibold">False is Correct</span>
                          </label>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs academy-text-secondary mb-1">Scholarly Explanation for Students</label>
                        <input
                          type="text"
                          value={draftExplanation}
                          onChange={(e) => setDraftExplanation(e.target.value)}
                          placeholder="Explain the classical textual evidence and historic context..."
                          className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-slate-800 text-white"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddQuestionToQuiz}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-teal-500/30 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Question to Staged Quiz</span>
                        </button>
                      </div>
                    </div>

                    {/* Staged Questions List */}
                    {newQuizQuestions.length > 0 && (
                      <div className="space-y-2 p-3 rounded-xl academy-surface border border-slate-800">
                        <span className="text-xs font-bold text-amber-300">Staged Questions ({newQuizQuestions.length}):</span>
                        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                          {newQuizQuestions.map((q, idx) => (
                            <div key={q.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 text-xs">
                              <span className="truncate text-white">
                                <strong>Q{idx + 1}:</strong> {q.prompt}
                              </span>
                              <button
                                type="button"
                                onClick={() => setNewQuizQuestions((prev) => prev.filter((item) => item.id !== q.id))}
                                className="text-rose-400 hover:text-rose-300 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isCreatingQuiz || newQuizQuestions.length === 0}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isCreatingQuiz ? 'Publishing...' : 'Publish Interactive Quiz to Students'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Active Quizzes List */}
                  <div className="space-y-3">
                    <h4 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Published Quizzes &amp; Assessments ({quizList.length})
                    </h4>
                    {quizList.length === 0 ? (
                      <div className="py-8 text-center text-xs academy-text-secondary rounded-xl academy-surface">
                        No quizzes published yet. Use the creator above to stage questions.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quizList.map((q) => {
                          const courseObj = courses.find((c) => c.id === q.courseId);
                          return (
                            <div key={q.id} className="p-4 rounded-xl academy-elevated border border-slate-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-teal-400 truncate">{courseObj?.title || 'Course'}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuiz(q.id)}
                                  className="text-rose-400 hover:text-rose-300 p-1"
                                  title="Delete Quiz"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <h5 className="font-display text-sm font-bold text-white">{q.title}</h5>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                <span>{q.questions.length} Questions</span>
                                <span>•</span>
                                <span>{q.timeLimitMinutes > 0 ? `${q.timeLimitMinutes} mins` : 'Untimed'}</span>
                                <span>•</span>
                                <span>Pass: {q.passingScore}%</span>
                              </div>
                              {q.badgeReward && (
                                <div className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                                  <Award className="w-3 h-3" />
                                  <span>Reward: {q.badgeReward}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: GIVE ASSESSMENTS & STUDENT QUIZ ATTEMPTS */}
              {hwStudioTab === 'quiz_assessments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-sm font-bold text-white">Student Quiz Assessment Attempts</h3>
                      <p className="text-xs academy-text-secondary">Review student attempt scorecards, adjust marks, and issue certification endorsements.</p>
                    </div>
                  </div>

                  {quizAttemptsList.length === 0 ? (
                    <div className="py-12 text-center text-xs academy-text-secondary rounded-xl academy-surface">
                      No student quiz attempts recorded yet. Once students take quizzes, their evaluations appear here.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quizAttemptsList.map((att) => {
                        return (
                          <div key={att.id} className="p-5 rounded-xl academy-elevated border border-slate-800 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div>
                                <span className="font-bold text-white">{att.studentName}</span>
                                <span className="text-slate-400"> ({att.studentEmail}) · {att.quizTitle}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                  att.passed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}>
                                  Score: {att.score}% · {att.passed ? 'PASSED' : 'REVISION'}
                                </span>
                                <span className="text-[10px] text-slate-500">{att.completedAt?.slice(0, 10)}</span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950 p-3 rounded-lg border border-slate-800">
                              &ldquo;{att.assessmentFeedback}&rdquo;
                            </p>

                            <div className="pt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleGradeAssessmentAttempt(att.id, 'Passed with Distinction. Excellent textual synthesis.', 'certified', Math.max(att.score, 95))}
                                className="px-3 py-1.5 rounded-lg bg-teal-400 text-slate-950 font-bold text-xs hover:bg-teal-300 transition-colors"
                              >
                                Endorse Distinction &amp; Certify
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGradeAssessmentAttempt(att.id, 'Assessment evaluated. Revisit lecture folio for refinement.', 'evaluated', att.score)}
                                className="px-3 py-1.5 rounded-lg academy-surface text-slate-300 hover:text-white text-xs border border-slate-700 transition-colors"
                              >
                                Mark Evaluated
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: HOMEWORK SUBMISSIONS & GRADING */}
              {hwStudioTab === 'submissions' && (
                <div className="space-y-4">
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
                        loading="lazy"
                        decoding="async"
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
                      <h3 className="font-display text-lg font-bold">Mustaqeem Shaikh</h3>
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

          {/* MODULE: TEACHER STUDENTS & DEDICATED STUDENT COURSE DASHBOARD */}
          {activeModule === 'teacher_students' && (
            <div className="space-y-6">
              {selectedStudentCourseDashboard ? (
                /* Dedicated Student Course Dashboard (STRICTLY scoped to the course this teacher teaches!) */
                <div className="rounded-xl academy-surface p-6 space-y-6">
                  {/* Top Bar with Back Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b academy-divider">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentCourseDashboard(null)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl academy-elevated hover:border-teal-400 text-teal-300 text-xs font-semibold transition-colors cursor-pointer w-fit"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Student Roster</span>
                    </button>

                    <div className="text-right">
                      <span className="text-[11px] font-mono-tabular text-teal-400 uppercase font-semibold">
                        Instructor View · Course-Scoped Dashboard
                      </span>
                      <h2 className="text-base font-bold text-white">
                        {selectedStudentCourseDashboard.course.title}
                      </h2>
                    </div>
                  </div>

                  {/* Student Profile & Progress Card */}
                  <div className="p-5 rounded-xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-950 border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 font-bold text-xl uppercase shrink-0">
                        {selectedStudentCourseDashboard.student.fullName.charAt(0) || 'S'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg font-bold text-white">
                            {selectedStudentCourseDashboard.student.fullName}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-400/20 text-teal-300 border border-teal-400/30 font-mono-tabular">
                            {selectedStudentCourseDashboard.student.role}
                          </span>
                        </div>
                        <p className="text-xs academy-text-secondary">
                          {selectedStudentCourseDashboard.student.email} · Enrolled since{' '}
                          {selectedStudentCourseDashboard.enrollment.enrolledAt
                            ? new Date(selectedStudentCourseDashboard.enrollment.enrolledAt).toLocaleDateString()
                            : 'Cohort Start'}
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-64 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-teal-400 font-semibold">Course Progress</span>
                        <span className="font-mono-tabular font-bold text-white">
                          {selectedStudentCourseDashboard.enrollment.progressPercentage}% Completed
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-300"
                          style={{
                            width: `${selectedStudentCourseDashboard.enrollment.progressPercentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tabbed / Grid breakdown for this Course */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Left Column: Course Curriculum & Lesson Completion Checklist */}
                    <div className="rounded-xl academy-elevated p-5 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b academy-divider">
                        <h4 className="font-display text-sm font-bold text-teal-300 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-teal-400" />
                          <span>Course Lessons Checklist</span>
                        </h4>
                        <span className="text-xs font-mono-tabular academy-text-muted">
                          {
                            lessons.filter((l) => l.courseId === selectedStudentCourseDashboard.course.id)
                              .length
                          }{' '}
                          Total Lectures
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {lessons
                          .filter((l) => l.courseId === selectedStudentCourseDashboard.course.id)
                          .sort((a, b) => a.positionOrder - b.positionOrder)
                          .map((l) => {
                            // Check completed IDs
                            let isCompleted = false;
                            try {
                              if (selectedStudentCourseDashboard.enrollment.completedLessonIds) {
                                const parsed = JSON.parse(
                                  selectedStudentCourseDashboard.enrollment.completedLessonIds
                                );
                                isCompleted = Array.isArray(parsed) && parsed.includes(l.id);
                              }
                            } catch {
                              // ignore
                            }

                            return (
                              <div
                                key={l.id}
                                className="flex items-center justify-between p-3 rounded-lg academy-surface border border-slate-800/80 gap-3 text-xs"
                              >
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="font-semibold text-slate-200 truncate">
                                    Lecture #{l.positionOrder}: {l.title}
                                  </div>
                                  <div className="text-[11px] academy-text-muted font-mono-tabular">
                                    Duration: {l.duration || '45m'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {isCompleted ? (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Done</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                                      Incomplete
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Right Column: Homework Submissions & Direct Grading */}
                    <div className="rounded-xl academy-elevated p-5 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b academy-divider">
                        <h4 className="font-display text-sm font-bold text-teal-300 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-400" />
                          <span>Student Homework Submissions</span>
                        </h4>
                        <span className="text-xs font-mono-tabular academy-text-muted">
                          {
                            homework.filter(
                              (h) =>
                                h.studentId === selectedStudentCourseDashboard.student.id &&
                                h.courseId === selectedStudentCourseDashboard.course.id
                            ).length
                          }{' '}
                          Submitted
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {homework.filter(
                          (h) =>
                            h.studentId === selectedStudentCourseDashboard.student.id &&
                            h.courseId === selectedStudentCourseDashboard.course.id
                        ).length === 0 ? (
                          <div className="py-8 text-center text-xs academy-text-secondary">
                            No homework submitted by this student for this course yet.
                          </div>
                        ) : (
                          homework
                            .filter(
                              (h) =>
                                h.studentId === selectedStudentCourseDashboard.student.id &&
                                h.courseId === selectedStudentCourseDashboard.course.id
                            )
                            .map((hw) => {
                              const currentInput = gradingInputs[hw.id] || {
                                status: hw.status || 'graded',
                                grade: hw.grade || 'A (95%)',
                                feedback: hw.feedback || '',
                              };

                              return (
                                <div
                                  key={hw.id}
                                  className="p-4 rounded-xl academy-surface border border-teal-500/20 space-y-2.5 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <h5 className="font-bold text-white text-sm">{hw.title}</h5>
                                    <span className="font-mono-tabular uppercase px-2 py-0.5 rounded text-[10px] font-bold bg-teal-400/20 text-teal-300">
                                      {hw.status} {hw.grade ? `(${hw.grade})` : ''}
                                    </span>
                                  </div>
                                  <p className="academy-text-secondary whitespace-pre-line leading-relaxed">
                                    {hw.content}
                                  </p>
                                  {hw.attachmentUrl && (
                                    <a
                                      href={hw.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-teal-400 hover:underline"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download Student Attachment</span>
                                    </a>
                                  )}

                                  {/* Direct Grade Form */}
                                  <div className="pt-2 border-t academy-divider space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-[10px] academy-text-secondary mb-1">
                                          Status
                                        </label>
                                        <select
                                          value={currentInput.status}
                                          onChange={(e) =>
                                            setGradingInputs((prev) => ({
                                              ...prev,
                                              [hw.id]: { ...currentInput, status: e.target.value },
                                            }))
                                          }
                                          className="w-full px-2 py-1 text-xs rounded academy-surface"
                                        >
                                          <option value="graded">Graded / Approved</option>
                                          <option value="exemplary">Exemplary / A+</option>
                                          <option value="needs_revision">Revision Requested</option>
                                          <option value="under_review">Under Review</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-[10px] academy-text-secondary mb-1">
                                          Grade Score
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
                                          placeholder="A (95%)"
                                          className="w-full px-2 py-1 text-xs rounded academy-surface font-mono-tabular"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] academy-text-secondary mb-1">
                                        Feedback Comments
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
                                        placeholder="MashaAllah, great progress..."
                                        className="w-full px-2 py-1 text-xs rounded academy-surface"
                                      />
                                    </div>
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
                                          showNotice(`Grade saved for ${selectedStudentCourseDashboard.student.fullName}!`);
                                        }
                                      }}
                                      className="w-full py-1.5 px-3 rounded text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300"
                                    >
                                      Save Grade &amp; Send Feedback
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Student's Daily Session Surveys for this Course */}
                  <div className="rounded-xl academy-elevated p-5 space-y-3">
                    <h4 className="font-display text-sm font-bold text-teal-300 flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4 text-teal-400" />
                      <span>Daily Class Feedback from this Student for {selectedStudentCourseDashboard.course.title}</span>
                    </h4>
                    {classSurveys.filter(
                      (s) =>
                        s.studentId === selectedStudentCourseDashboard.student.id &&
                        s.courseId === selectedStudentCourseDashboard.course.id
                    ).length === 0 ? (
                      <p className="text-xs academy-text-secondary py-4 text-center">
                        No session feedback submitted by this student yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {classSurveys
                          .filter(
                            (s) =>
                              s.studentId === selectedStudentCourseDashboard.student.id &&
                              s.courseId === selectedStudentCourseDashboard.course.id
                          )
                          .map((s) => (
                            <div
                              key={s.id}
                              className="p-3 rounded-lg academy-surface border border-slate-800 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      s.rating === 'satisfactory'
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-rose-500/20 text-rose-300'
                                    }`}
                                  >
                                    {s.rating}
                                  </span>
                                  <span className="text-slate-300">
                                    {s.comment || 'Satisfactory session overall.'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono-tabular academy-text-muted">
                                {new Date(s.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Direct Instructor Message to Student */}
                  <div className="rounded-xl academy-elevated p-5 space-y-3">
                    <h4 className="font-display text-sm font-bold text-teal-300 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-teal-400" />
                      <span>Send Direct Academic Message to {selectedStudentCourseDashboard.student.fullName}</span>
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={directStudentMessage}
                        onChange={(e) => setDirectStudentMessage(e.target.value)}
                        placeholder="Write a private note, lesson follow-up, or encouragement..."
                        className="flex-1 px-3 py-2 text-xs rounded-xl academy-surface"
                      />
                      <button
                        type="button"
                        disabled={sendingDirectMessage || !directStudentMessage.trim()}
                        onClick={async () => {
                          setSendingDirectMessage(true);
                          try {
                            const res = await authFetch('/api/messages', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                receiverId: selectedStudentCourseDashboard.student.id,
                                subject: `Message from Instructor regarding ${selectedStudentCourseDashboard.course.title}`,
                                body: directStudentMessage.trim(),
                              }),
                            });
                            if (res.ok) {
                              setDirectStudentMessage('');
                              showNotice(`Direct message sent to ${selectedStudentCourseDashboard.student.fullName}!`);
                              await onRefreshData();
                            }
                          } finally {
                            setSendingDirectMessage(false);
                          }
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Student Roster List across Instructor's Assigned Courses */
                <div className="rounded-xl academy-surface p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b academy-divider">
                    <div>
                      <h2 className="font-display text-lg font-bold text-teal-400">
                        Enrolled Students &amp; Individual Course Dashboards
                      </h2>
                      <p className="text-xs academy-text-secondary mt-0.5">
                        Click on any enrolled student to enter their personal course dashboard (showing{' '}
                        <strong>only the course you teach</strong>).
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Course Filter */}
                      <select
                        value={teacherCourseFilter}
                        onChange={(e) =>
                          setTeacherCourseFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                        }
                        className="px-3 py-1.5 text-xs rounded-xl academy-elevated font-medium"
                      >
                        <option value="all">All My Courses ({managedCourses.length})</option>
                        {managedCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>

                      {/* Search */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={teacherStudentSearch}
                          onChange={(e) => setTeacherStudentSearch(e.target.value)}
                          placeholder="Search student by name or email..."
                          className="pl-8 pr-3 py-1.5 text-xs rounded-xl academy-elevated w-52 focus:w-64 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Enrolled Students Table / Cards */}
                  {(() => {
                    const filteredEnrollments = enrollments.filter((e) => {
                      if (!managedCourseIds.includes(e.courseId)) return false;
                      if (teacherCourseFilter !== 'all' && e.courseId !== teacherCourseFilter) return false;
                      const studentObj = profiles.find((p) => p.id === e.studentId);
                      if (teacherStudentSearch.trim()) {
                        const q = teacherStudentSearch.toLowerCase();
                        const matchName = (studentObj?.fullName || '').toLowerCase().includes(q);
                        const matchEmail = (studentObj?.email || '').toLowerCase().includes(q);
                        if (!matchName && !matchEmail) return false;
                      }
                      return true;
                    });

                    if (filteredEnrollments.length === 0) {
                      return (
                        <div className="py-12 text-center text-xs academy-text-secondary">
                          No students found matching your course filter or search query.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredEnrollments.map((enr) => {
                          const student: Profile = profiles.find((p) => p.id === enr.studentId) || {
                            id: enr.studentId,
                            uid: `student-${enr.studentId}`,
                            fullName: `Student #${enr.studentId}`,
                            email: 'student@deenhijrah.edu',
                            role: 'student' as const,
                            avatarUrl: null,
                            createdAt: enr.enrolledAt,
                          };
                          const courseObj = courses.find((c) => c.id === enr.courseId);
                          if (!courseObj) return null;

                          const courseLessons = lessons.filter((l) => l.courseId === courseObj.id);
                          const studentHw = homework.filter(
                            (h) => h.studentId === student.id && h.courseId === courseObj.id
                          );

                          return (
                            <div
                              key={`${enr.studentId}-${enr.courseId}`}
                              className="p-5 rounded-xl academy-elevated border border-teal-500/25 hover:border-teal-400/60 transition-all space-y-4 flex flex-col justify-between"
                            >
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 font-bold uppercase shrink-0">
                                    {student.fullName.charAt(0) || 'S'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-white text-sm truncate">
                                      {student.fullName}
                                    </div>
                                    <div className="text-[11px] academy-text-muted truncate">
                                      {student.email}
                                    </div>
                                  </div>
                                </div>

                                <div className="p-2.5 rounded-lg academy-surface space-y-1.5 text-xs">
                                  <div className="text-[11px] font-semibold text-teal-300 truncate">
                                    {courseObj.title}
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] font-mono-tabular academy-text-secondary">
                                    <span>Course Progress</span>
                                    <span className="font-bold text-white">
                                      {enr.progressPercentage}%
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                      className="h-full bg-teal-400"
                                      style={{ width: `${enr.progressPercentage}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
                                  <span>{courseLessons.length} Lectures</span>
                                  <span>{studentHw.length} HW Submissions</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedStudentCourseDashboard({
                                    student,
                                    course: courseObj,
                                    enrollment: enr,
                                  })
                                }
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors cursor-pointer shadow-sm"
                              >
                                <span>Inspect Student Course Dashboard</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* MODULE: ANNOUNCEMENTS MANAGER */}
          {activeModule === 'announcements' && (
            <div className="space-y-6">
              {/* Post Announcement Form */}
              <div className="rounded-xl academy-surface p-6 space-y-4">
                <div className="pb-3 border-b academy-divider">
                  <h2 className="font-display text-lg font-bold text-teal-400 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-teal-400" />
                    <span>Publish Course Announcement</span>
                  </h2>
                  <p className="text-xs academy-text-secondary mt-0.5">
                    Announcements are immediately visible in the Student Portal for all enrolled students.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Announcement Title *
                      </label>
                      <input
                        type="text"
                        value={newAnnTitle}
                        onChange={(e) => setNewAnnTitle(e.target.value)}
                        placeholder="e.g. Mid-term review session scheduled on Wednesday"
                        className="w-full px-3 py-2 text-xs rounded-xl academy-elevated"
                      />
                    </div>

                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Target Course
                      </label>
                      <select
                        value={newAnnCourseId}
                        onChange={(e) =>
                          setNewAnnCourseId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl academy-elevated"
                      >
                        <option value="all">General / Academy-Wide (All Courses)</option>
                        {managedCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Announcement Content &amp; Details *
                    </label>
                    <textarea
                      rows={3}
                      value={newAnnContent}
                      onChange={(e) => setNewAnnContent(e.target.value)}
                      placeholder="Enter detailed notice, links, Zoom reminders, or homework guidelines..."
                      className="w-full px-3 py-2 text-xs rounded-xl academy-elevated"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="academy-text-secondary">Priority:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          checked={newAnnPriority === 'normal'}
                          onChange={() => setNewAnnPriority('normal')}
                          className="accent-teal-400"
                        />
                        <span className="text-slate-300">Normal</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          checked={newAnnPriority === 'important'}
                          onChange={() => setNewAnnPriority('important')}
                          className="accent-rose-400"
                        />
                        <span className="text-rose-300 font-semibold">Important / Urgent</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      disabled={isPostingAnn || !newAnnTitle.trim() || !newAnnContent.trim()}
                      onClick={async () => {
                        setIsPostingAnn(true);
                        try {
                          const res = await authFetch('/api/announcements', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              title: newAnnTitle.trim(),
                              content: newAnnContent.trim(),
                              courseId: newAnnCourseId === 'all' ? null : newAnnCourseId,
                              priority: newAnnPriority,
                              instructorName: profile?.fullName || 'Mustaqeem Shaikh',
                            }),
                          });
                          if (res.ok) {
                            setNewAnnTitle('');
                            setNewAnnContent('');
                            showNotice('Announcement published successfully to Student Portal!');
                            await onRefreshData();
                          }
                        } finally {
                          setIsPostingAnn(false);
                        }
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isPostingAnn ? 'Publishing...' : 'Publish Announcement'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Announcements Feed */}
              <div className="rounded-xl academy-surface p-6 space-y-4">
                <h3 className="font-display text-base font-bold text-white">
                  Active Announcements ({announcements.length})
                </h3>

                {announcements.length === 0 ? (
                  <div className="py-8 text-center text-xs academy-text-secondary">
                    No announcements published yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((ann) => {
                      const courseObj = courses.find((c) => c.id === ann.courseId);
                      return (
                        <div
                          key={ann.id}
                          className="p-4 rounded-xl academy-elevated border border-teal-500/25 space-y-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono-tabular ${
                                  ann.priority === 'important'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-teal-400/20 text-teal-300'
                                }`}
                              >
                                {ann.priority}
                              </span>
                              <span className="font-semibold text-teal-300">
                                {courseObj ? courseObj.title : 'Academy-Wide'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="academy-text-muted font-mono-tabular text-[11px]">
                                By {ann.instructorName} · {new Date(ann.createdAt).toLocaleDateString()}
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await authFetch(`/api/announcements/${ann.id}`, {
                                    method: 'DELETE',
                                  });
                                  if (res.ok) {
                                    showNotice('Announcement deleted.');
                                    await onRefreshData();
                                  }
                                }}
                                className="text-rose-400 hover:text-rose-300 p-1"
                                title="Delete announcement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h4 className="font-bold text-white text-sm">{ann.title}</h4>
                          <p className="academy-text-secondary leading-relaxed whitespace-pre-line">
                            {ann.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODULE: ADMIN & FACULTY ACCESS APPLICATIONS */}
          {activeModule === 'applications' && (
            <div className="rounded-xl academy-surface p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b academy-divider">
                <div>
                  <h2 className="font-display text-lg font-bold text-teal-400 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-400" />
                    <span>Admin &amp; Teacher Access Applications</span>
                  </h2>
                  <p className="text-xs academy-text-secondary mt-0.5">
                    Review and approve submitted requests for Administrator or Faculty permissions.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl academy-elevated text-xs">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setAppStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                        appStatusFilter === status
                          ? 'bg-teal-400 text-slate-950 font-bold'
                          : 'academy-text-secondary hover:text-teal-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Applications List */}
              {(() => {
                const filtered = roleApplications.filter(
                  (a) => appStatusFilter === 'all' || a.status === appStatusFilter
                );

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs academy-text-secondary">
                      No applications found with status: {appStatusFilter}.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filtered.map((app) => (
                      <div
                        key={app.id}
                        className="p-5 rounded-xl academy-elevated border border-teal-500/25 space-y-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-white text-sm">{app.applicantName}</span>
                            <span className="text-teal-400 font-mono-tabular">({app.applicantEmail})</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                app.requestedRole === 'admin'
                                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                  : 'bg-teal-400/20 text-teal-300 border border-teal-400/30'
                              }`}
                            >
                              Requesting: {app.requestedRole}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono-tabular ${
                                app.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : app.status === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-amber-400/20 text-amber-300 animate-pulse'
                              }`}
                            >
                              {app.status}
                            </span>
                            <span className="text-[11px] font-mono-tabular academy-text-muted">
                              {new Date(app.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-teal-400 uppercase">
                            Reason for Request
                          </div>
                          <p className="academy-text-secondary whitespace-pre-line leading-relaxed">
                            {app.reason}
                          </p>
                        </div>

                        {app.credentialsBio && (
                          <div className="space-y-1 pt-1">
                            <div className="text-[11px] font-semibold text-teal-400 uppercase">
                              Credentials &amp; Background
                            </div>
                            <p className="academy-text-secondary whitespace-pre-line leading-relaxed">
                              {app.credentialsBio}
                            </p>
                          </div>
                        )}

                        {app.status === 'pending' && (
                          <div className="flex items-center gap-2 pt-2 border-t academy-divider">
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await authFetch(`/api/role-applications/${app.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    status: 'approved',
                                    applicantId: app.applicantId,
                                    requestedRole: app.requestedRole,
                                  }),
                                });
                                if (res.ok) {
                                  showNotice(`Approved ${app.applicantName} as ${app.requestedRole}!`);
                                  await onRefreshData();
                                }
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm cursor-pointer"
                            >
                              Approve &amp; Upgrade Role to {app.requestedRole}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await authFetch(`/api/role-applications/${app.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'rejected' }),
                                });
                                if (res.ok) {
                                  showNotice(`Rejected application #${app.id}`);
                                  await onRefreshData();
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl text-xs font-medium academy-elevated hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                            >
                              Reject Application
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* MODULE: DAILY SESSION SURVEYS & TEACHER FEEDBACK */}
          {activeModule === 'surveys' && (
            <div className="rounded-xl academy-surface p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b academy-divider">
                <div>
                  <h2 className="font-display text-lg font-bold text-teal-400 flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-teal-400" />
                    <span>Daily Class Session Feedback &amp; Surveys</span>
                  </h2>
                  <p className="text-xs academy-text-secondary mt-0.5">
                    Student ratings on whether each class day session was satisfactory or unsatisfactory.
                  </p>
                </div>

                <select
                  value={surveyCourseFilter}
                  onChange={(e) =>
                    setSurveyCourseFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="px-3 py-1.5 text-xs rounded-xl academy-elevated font-medium"
                >
                  <option value="all">All Courses ({courses.length})</option>
                  {(isInstructor ? managedCourses : courses).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Statistics Metric Cards */}
              {(() => {
                const filtered = classSurveys.filter(
                  (s) => surveyCourseFilter === 'all' || s.courseId === surveyCourseFilter
                );
                const total = filtered.length;
                const satisfactoryCount = filtered.filter((s) => s.rating === 'satisfactory').length;
                const unsatisfactoryCount = filtered.filter((s) => s.rating === 'unsatisfactory').length;
                const satPercent = total > 0 ? Math.round((satisfactoryCount / total) * 100) : 100;

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl academy-elevated border border-teal-500/20 space-y-1">
                        <div className="text-[11px] academy-text-muted">Total Responses</div>
                        <div className="text-2xl font-bold font-mono-tabular text-white">{total}</div>
                      </div>
                      <div className="p-4 rounded-xl academy-elevated border border-emerald-500/30 space-y-1">
                        <div className="text-[11px] text-emerald-400 font-semibold">
                          Satisfactory ({satPercent}%)
                        </div>
                        <div className="text-2xl font-bold font-mono-tabular text-emerald-300">
                          {satisfactoryCount}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl academy-elevated border border-rose-500/30 space-y-1">
                        <div className="text-[11px] text-rose-400 font-semibold">Unsatisfactory</div>
                        <div className="text-2xl font-bold font-mono-tabular text-rose-300">
                          {unsatisfactoryCount}
                        </div>
                      </div>
                    </div>

                    {/* Table / Card List */}
                    <div className="space-y-3">
                      {filtered.length === 0 ? (
                        <div className="py-10 text-center text-xs academy-text-secondary">
                          No student surveys submitted yet for this course selection.
                        </div>
                      ) : (
                        filtered.map((s) => {
                          const courseObj = courses.find((c) => c.id === s.courseId);
                          const lessonObj = lessons.find((l) => l.id === s.lessonId);
                          return (
                            <div
                              key={s.id}
                              className="p-4 rounded-xl academy-elevated border border-teal-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono-tabular ${
                                      s.rating === 'satisfactory'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    }`}
                                  >
                                    {s.rating}
                                  </span>
                                  <span className="font-semibold text-white">{s.studentName}</span>
                                  <span className="academy-text-muted">· {courseObj?.title || 'Course'}</span>
                                  {lessonObj && (
                                    <span className="academy-text-muted font-mono-tabular">
                                      (Lecture #{lessonObj.positionOrder})
                                    </span>
                                  )}
                                </div>
                                {s.comment && (
                                  <p className="text-slate-300 italic pt-0.5">
                                    &ldquo;{s.comment}&rdquo;
                                  </p>
                                )}
                              </div>

                              <span className="text-[11px] font-mono-tabular academy-text-muted shrink-0">
                                {new Date(s.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Fullscreen Animated PDF Reader Modal */}
      {activePdfPreview && (
        <AnimatedPdfViewer
          url={activePdfPreview.url}
          file={activePdfPreview.file}
          title={activePdfPreview.title}
          onClose={() => setActivePdfPreview(null)}
          variant="modal"
        />
      )}

      {/* PROJECT SAVE SETTINGS & BACKUP MODAL */}
      {isProjectSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#030914] rounded-2xl border border-teal-500/40 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b academy-divider">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    Project Save Settings &amp; Academy Configuration
                  </h3>
                  <p className="text-xs academy-text-secondary">
                    Cloud SQL persistence, recording upload limits, and JSON backup/restore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProjectSettingsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Academy Project Identity */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono-tabular">
                Academy Project Identity
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] academy-text-secondary mb-1">
                    Academy Title
                  </label>
                  <input
                    type="text"
                    value={academyProjectTitle}
                    onChange={(e) => setAcademyProjectTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] academy-text-secondary mb-1">
                    Tagline / Motto
                  </label>
                  <input
                    type="text"
                    value={academyProjectMotto}
                    onChange={(e) => setAcademyProjectMotto(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Persistence & Cloud SQL State */}
            <div className="p-4 rounded-xl academy-surface border border-teal-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-300 font-mono-tabular">
                  Database &amp; Storage Architecture
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono-tabular">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cloud SQL / Fallback Active</span>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-tabular">
                <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                  <span className="academy-text-muted text-[10px] block">COURSES</span>
                  <span className="text-white font-bold">{courses.length}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                  <span className="academy-text-muted text-[10px] block">RECORDINGS</span>
                  <span className="text-teal-400 font-bold">{lessons.length}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                  <span className="academy-text-muted text-[10px] block">SESSIONS</span>
                  <span className="text-amber-400 font-bold">{events.length}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                  <span className="academy-text-muted text-[10px] block">SLIDES</span>
                  <span className="text-white font-bold">{slides.length}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Recording Upload Engine */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono-tabular">
                Recording Upload &amp; Video Engine
              </h4>
              <div className="p-3.5 rounded-xl academy-surface border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">Zero-Buffer HTTP Binary Streaming:</span>
                  <span className="text-emerald-400 font-bold font-mono-tabular">Enabled (/api/upload-media-raw)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">Offline / Browser Fallback Engine:</span>
                  <span className="text-teal-300 font-bold font-mono-tabular">IndexedDB Large Blob Vault</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">Max Video File Size:</span>
                  <span className="text-amber-300 font-bold font-mono-tabular">Up to 500 MB per recording</span>
                </div>
              </div>
            </div>

            {/* Section 4: Export & Import Project State */}
            <div className="space-y-3 pt-2 border-t academy-divider">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono-tabular">
                Project Backup &amp; Recovery
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportProjectBackup}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Project Backup (.json)</span>
                </button>

                <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 text-teal-300 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Import Project Backup (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportProjectBackup}
                  />
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t academy-divider">
              <button
                type="button"
                onClick={async () => {
                  await handleSaveAllPortalState();
                  setIsProjectSettingsOpen(false);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 hover:opacity-90 transition-opacity"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save All Project Settings</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProjectSettingsOpen(false)}
                className="px-4 py-2 text-xs rounded-xl academy-elevated hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real Zoom Meeting Launcher Modal (Host Mode & Attendee Mode) */}
      <ZoomMeetingLauncherModal
        isOpen={Boolean(activeZoomLauncherEvent)}
        event={activeZoomLauncherEvent}
        course={
          activeZoomLauncherEvent
            ? courses.find((c) => c.id === activeZoomLauncherEvent.courseId)
            : null
        }
        currentUserProfile={profile}
        initialHostMode={activeZoomLauncherHostMode}
        onClose={() => setActiveZoomLauncherEvent(null)}
      />
    </div>
  );
};
