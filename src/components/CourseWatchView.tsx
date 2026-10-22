import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  Lock,
  Play,
  Calendar,
  ExternalLink,
  BookOpen,
  FileText,
  FileSpreadsheet,
  Link2,
  Upload,
  Send,
  Users,
  Globe,
  Sparkles,
  Eye,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Film,
  Megaphone,
  HelpCircle,
  X,
  AlertCircle,
} from 'lucide-react';
import { AnimatedPdfViewer } from './AnimatedPdfViewer.tsx';
import { LessonThreadedComments } from './LessonThreadedComments.tsx';
import { ClassSessionSurveyWidget } from './ClassSessionSurveyWidget.tsx';
import {
  Course,
  Lesson,
  Enrollment,
  CourseEvent,
  SyllabusBox,
  HomeworkSubmission,
  HomeworkGradeStatus,
  HomeworkAssignment,
  Quiz,
  QuizAttempt,
  Message,
  Profile,
  Announcement,
  LessonComment,
  parseCourseTags,
} from '../types.ts';
import { resolveThumbnailUrl, ACADEMY_ASSETS } from '../lib/assets.ts';
import { resolvePlayableVideoUrl } from '../lib/mediaStorage.ts';
import { InteractiveCalendar } from './InteractiveCalendar.tsx';
import {
  convertClassTimeToRegion,
  getDetectedUserTimezone,
  WORLD_TIMEZONES,
} from '../lib/timezone.ts';
import { smartApiFetch } from '../lib/fallbackStore.ts';
import { QuizAssessmentModal } from './QuizAssessmentModal.tsx';

export type ResourceFileType = 'PDF' | 'Doc' | 'Link';

export interface CurriculumResourceItem {
  id: string;
  type: ResourceFileType;
  title: string;
  url: string;
  downloadFilename?: string;
}

export const GRADE_STATUS_META: Record<
  HomeworkGradeStatus,
  { label: string; colorClass: string }
> = {
  submitted: {
    label: 'Submitted · Pending Review',
    colorClass: 'text-amber-300',
  },
  under_review: {
    label: 'Under Tutor Review',
    colorClass: 'text-sky-300',
  },
  needs_revision: {
    label: 'Revision Requested',
    colorClass: 'text-rose-400',
  },
  graded: {
    label: 'Approved / Graded',
    colorClass: 'text-emerald-400',
  },
  exemplary: {
    label: 'Exemplary / Distinction',
    colorClass: 'text-teal-300',
  },
};

/**
 * Renders a specific, visually distinct file-type icon (PDF, Doc, Link)
 * for downloadable curriculum resource items.
 */
export const ResourceFileTypeIcon: React.FC<{
  type: ResourceFileType;
  size?: 'sm' | 'md';
}> = ({ type, size = 'sm' }) => {
  const iconSizeClass = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const boxSizeClass = size === 'md' ? 'w-7 h-7 rounded-md' : 'w-6 h-6 rounded';

  if (type === 'PDF') {
    return (
      <span
        title="PDF Document Resource"
        className={`inline-flex items-center justify-center shrink-0 border bg-rose-500/15 border-rose-500/35 text-rose-400 ${boxSizeClass}`}
      >
        <FileText className={iconSizeClass} />
      </span>
    );
  }

  if (type === 'Doc') {
    return (
      <span
        title="Word / Study Doc Resource"
        className={`inline-flex items-center justify-center shrink-0 border bg-sky-500/15 border-sky-500/35 text-sky-400 ${boxSizeClass}`}
      >
        <FileSpreadsheet className={iconSizeClass} />
      </span>
    );
  }

  return (
    <span
      title="External Reference Link"
      className={`inline-flex items-center justify-center shrink-0 border bg-teal-500/15 border-teal-500/35 text-teal-400 ${boxSizeClass}`}
    >
      <Link2 className={iconSizeClass} />
    </span>
  );
};

interface CourseWatchViewProps {
  course: Course;
  lessons: Lesson[];
  events: CourseEvent[];
  allCourseEnrollmentsCount: number;
  enrollment?: Enrollment;
  homeworkList: HomeworkSubmission[];
  messages?: Message[];
  announcements?: Announcement[];
  isAdmin: boolean;
  currentProfile?: Profile | null;
  authFetch?: (url: string, options?: RequestInit) => Promise<Response>;
  onBack: () => void;
  onEnroll: (courseId: number) => Promise<void>;
  onToggleLessonComplete: (lessonId: number) => Promise<void>;
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
}

const syllabusContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const syllabusBoxVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export const CourseWatchView: React.FC<CourseWatchViewProps> = ({
  course,
  lessons,
  events,
  allCourseEnrollmentsCount,
  enrollment,
  homeworkList,
  messages = [],
  announcements = [],
  isAdmin,
  currentProfile = null,
  authFetch,
  onBack,
  onEnroll,
  onToggleLessonComplete,
  onSubmitHomework,
  onGradeHomework,
  onSubmitFeedback,
  onUploadFile,
}) => {
  // Course-specific announcements
  const courseAnnouncements = useMemo(() => {
    return announcements.filter(
      (a) => !a.courseId || a.courseId === course.id
    );
  }, [announcements, course.id]);

  // Threaded Comments state for active lesson
  const [lessonComments, setLessonComments] = useState<LessonComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const courseLessons = useMemo(
    () =>
      lessons
        .filter((l) => l.courseId === course.id)
        .sort((a, b) => a.positionOrder - b.positionOrder || a.id - b.id),
    [lessons, course.id]
  );

  const courseEvents = useMemo(
    () => events.filter((ev) => ev.courseId === course.id),
    [events, course.id]
  );

  const parsedSyllabusBoxes: SyllabusBox[] = useMemo(() => {
    try {
      const parsed = JSON.parse(course.syllabusBoxes || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [course.syllabusBoxes]);

  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(
    courseLessons[0]?.id || null
  );
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [videoHasError, setVideoHasError] = useState(false);
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<
    'lecture' | 'syllabus' | 'calendar' | 'homework'
  >('lecture');
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [activePdfModal, setActivePdfModal] = useState<{ url: string; title: string } | null>(
    null
  );

  // Homework Submission Form State
  const [hwTitle, setHwTitle] = useState('');
  const [hwLessonId, setHwLessonId] = useState<string>('');
  const [hwContent, setHwContent] = useState('');
  const [hwAttachmentUrl, setHwAttachmentUrl] = useState('');
  const [uploadingHwFile, setUploadingHwFile] = useState(false);
  const [submittingHw, setSubmittingHw] = useState(false);

  // Quizzes & Assigned Homework State
  const [courseQuizzes, setCourseQuizzes] = useState<Quiz[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<HomeworkAssignment[]>([]);
  const [courseAttempts, setCourseAttempts] = useState<QuizAttempt[]>([]);
  const [activeQuizModal, setActiveQuizModal] = useState<Quiz | null>(null);

  const fetchCourseQuizzesAndAssignments = async () => {
    try {
      const [qRes, aRes, attRes] = await Promise.all([
        smartApiFetch(`/api/quizzes?courseId=${course.id}`),
        smartApiFetch(`/api/assignments?courseId=${course.id}`),
        smartApiFetch(`/api/quiz-attempts?courseId=${course.id}`),
      ]);
      if (qRes.ok) {
        const d = await qRes.json();
        if (Array.isArray(d)) setCourseQuizzes(d);
      }
      if (aRes.ok) {
        const d = await aRes.json();
        if (Array.isArray(d)) setCourseAssignments(d);
      }
      if (attRes.ok) {
        const d = await attRes.json();
        if (Array.isArray(d)) setCourseAttempts(d);
      }
    } catch {}
  };

  useEffect(() => {
    fetchCourseQuizzesAndAssignments();
  }, [course.id]);

  // Faculty Feedback & Grade Status Form State per Homework Submission
  const [openTutorEditorId, setOpenTutorEditorId] = useState<number | null>(null);
  const [tutorFeedbackDrafts, setTutorFeedbackDrafts] = useState<
    Record<number, { status: HomeworkGradeStatus; grade: string; feedback: string }>
  >({});
  const [savingTutorFeedbackId, setSavingTutorFeedbackId] = useState<number | null>(null);

  // Student Class & Website Feedback Form State
  const [studentFeedbackType, setStudentFeedbackType] = useState<'class' | 'website'>('class');
  const [studentFeedbackAspect, setStudentFeedbackAspect] = useState<string>(
    'Live Zoom Sessions & Pedagogy'
  );
  const [studentFeedbackRating, setStudentFeedbackRating] = useState<number>(5);
  const [studentFeedbackComment, setStudentFeedbackComment] = useState<string>('');
  const [submittingStudentFeedback, setSubmittingStudentFeedback] = useState<boolean>(false);
  const [localFeedbackHistory, setLocalFeedbackHistory] = useState<
    Array<{
      id: string;
      type: 'class' | 'website';
      aspect: string;
      rating: number;
      comment: string;
      createdAt: string;
    }>
  >([]);

  const currentLesson =
    courseLessons.find((l) => l.id === selectedLessonId) || courseLessons[0] || null;

  // Floating Ask Question Modal State (Direct Message to Course Instructor)
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [questionLessonId, setQuestionLessonId] = useState<number | null>(null);
  const [questionSubject, setQuestionSubject] = useState('');
  const [questionBody, setQuestionBody] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [questionStatusMsg, setQuestionStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleOpenAskModal = (lessonId?: number | null) => {
    const targetId =
      lessonId !== undefined && lessonId !== null
        ? lessonId
        : currentLesson?.id || courseLessons[0]?.id || null;
    setQuestionLessonId(targetId);
    const targetLesson = courseLessons.find((l) => l.id === targetId);
    setQuestionSubject(
      targetLesson
        ? `Clarification regarding Lesson ${targetLesson.positionOrder}: ${targetLesson.title}`
        : `Question regarding ${course.title}`
    );
    setQuestionBody('');
    setQuestionStatusMsg(null);
    setIsAskModalOpen(true);
  };

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionSubject.trim() || !questionBody.trim()) return;

    setSubmittingQuestion(true);
    setQuestionStatusMsg(null);

    const targetLesson = courseLessons.find((l) => l.id === questionLessonId);
    const lessonPrefix = targetLesson
      ? `[Lesson ${targetLesson.positionOrder}: ${targetLesson.title}] `
      : `[${course.title}] `;
    const finalSubject = `${lessonPrefix}${questionSubject.trim()}`;

    try {
      const fetchFn = authFetch || smartApiFetch;
      const res = await fetchFn('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: course.instructorId || 1,
          subject: finalSubject,
          body: questionBody.trim(),
        }),
      });

      if (res.ok) {
        setQuestionStatusMsg({
          type: 'success',
          text: `Your question has been sent directly to ${
            course.instructorName || 'Mustaqeem Shaikh'
          }! Replies will appear in your Student Inbox.`,
        });
        setTimeout(() => {
          setIsAskModalOpen(false);
          setQuestionBody('');
          setQuestionStatusMsg(null);
        }, 2200);
      } else {
        const data = await res.json().catch(() => ({}));
        setQuestionStatusMsg({
          type: 'error',
          text: data.error || 'Failed to send message. Please ensure you are logged in.',
        });
      }
    } catch (err: any) {
      setQuestionStatusMsg({
        type: 'error',
        text: err.message || 'Network error while delivering your question.',
      });
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Close Ask Question Modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAskModalOpen) {
        setIsAskModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAskModalOpen]);

  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>(currentLesson?.videoUrl || '');

  // Resolve playable video url (supports direct HTTP links, /uploads/*, and indexeddb://)
  React.useEffect(() => {
    setVideoHasError(false);
    if (!currentLesson?.videoUrl) {
      setResolvedVideoUrl('');
      return;
    }
    let isCancelled = false;
    resolvePlayableVideoUrl(currentLesson.videoUrl).then((url) => {
      if (!isCancelled) {
        setResolvedVideoUrl(url);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [currentLesson?.videoUrl]);

  const completedIds: number[] = useMemo(() => {
    if (!enrollment?.completedLessonIds) return [];
    try {
      const parsed = JSON.parse(enrollment.completedLessonIds);
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return [];
    }
  }, [enrollment]);

  // Student Capacity & Enrollment Rate Math
  const studentsTaken = allCourseEnrollmentsCount + (course.initialEnrolledCount || 0);
  const maxStudents = course.maxStudents || 25;
  const enrollmentRate =
    maxStudents > 0 ? Math.min(100, Math.round((studentsTaken / maxStudents) * 100)) : 0;
  const isCourseFull = maxStudents > 0 && studentsTaken >= maxStudents;

  const isEnrolled = Boolean(enrollment) || isAdmin;

  // Every recording on the homepage and academy is 100% free and unlocked for everyone to watch!
  const canWatchCurrentLesson = true;

  const detectedTz = useMemo(() => getDetectedUserTimezone(), []);
  const convertedClassSchedule = useMemo(
    () =>
      convertClassTimeToRegion(
        course.launchDate,
        course.classStartTime || '14:00',
        course.classTimezone || 'America/New_York',
        detectedTz
      ),
    [course.launchDate, course.classStartTime, course.classTimezone, detectedTz]
  );

  const myCourseHomework = useMemo(
    () => homeworkList.filter((h) => h.courseId === course.id),
    [homeworkList, course.id]
  );

  const isEmbedUrl = (url?: string | null) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return url;
  };

  // Detect specific resource file type (PDF, Doc, or Link) from URL or filename
  const detectResourceFileType = (url?: string | null): ResourceFileType => {
    const lower = (url || '').toLowerCase();
    if (lower.includes('.pdf') || lower.includes('application/pdf')) {
      return 'PDF';
    }
    if (
      lower.includes('.doc') ||
      lower.includes('.docx') ||
      lower.includes('.txt') ||
      lower.includes('.md') ||
      lower.includes('.rtf') ||
      lower.includes('application/msword') ||
      lower.startsWith('/api/media/')
    ) {
      return 'Doc';
    }
    return 'Link';
  };

  // Build downloadable curriculum resource items (PDF, Doc, Link) for a lesson
  // STRICT RULE: ONLY return resources if actually uploaded/added by the instructor!
  const getLessonDownloadableResources = (lesson: Lesson): CurriculumResourceItem[] => {
    const rawAttachment = (lesson.attachmentUrl || '').trim();
    if (!rawAttachment) {
      return [];
    }

    // Never return the dummy.pdf placeholder
    if (rawAttachment.includes('dummy.pdf')) {
      return [];
    }

    // If the instructor provided a JSON list of resources, parse and return them
    if (rawAttachment.startsWith('[')) {
      try {
        const parsed = JSON.parse(rawAttachment);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => {
            const type: ResourceFileType =
              item.type === 'PDF' || item.type === 'Doc' || item.type === 'Link'
                ? item.type
                : detectResourceFileType(item.url || '');
            return {
              id: `${lesson.id}-custom-${idx}`,
              type,
              title: item.title || `${type} Resource`,
              url: item.url,
              downloadFilename: item.downloadFilename,
            };
          });
        }
      } catch {
        // Fall through
      }
    }

    const customType = detectResourceFileType(rawAttachment);
    const fileName =
      rawAttachment.split('/').pop()?.split('?')[0] || `${customType} Resource`;

    return [
      {
        id: `${lesson.id}-resource`,
        type: customType,
        title: fileName,
        url: rawAttachment,
        downloadFilename: customType !== 'Link' ? fileName : undefined,
      },
    ];
  };

  // Fetch comments whenever active lesson changes
  useEffect(() => {
    if (!currentLesson?.id) return;
    let isMounted = true;
    setLoadingComments(true);
    smartApiFetch(`/api/lessons/${currentLesson.id}/comments`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted) setLessonComments(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (isMounted) setLessonComments([]);
      })
      .finally(() => {
        if (isMounted) setLoadingComments(false);
      });
    return () => {
      isMounted = false;
    };
  }, [currentLesson?.id]);

  const handlePostComment = async (
    lessonId: number,
    content: string,
    parentId?: number | null
  ) => {
    const fetchFn = authFetch || smartApiFetch;
    try {
      const res = await fetchFn(`/api/lessons/${lessonId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          parentId: parentId || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setLessonComments((prev) => [...prev, created]);
      } else {
        // Optimistic local fallback comment
        const fallbackComment: LessonComment = {
          id: Date.now(),
          courseId: course.id,
          lessonId,
          authorId: currentProfile?.id || 1,
          authorName: currentProfile?.fullName || 'Student',
          authorRole: currentProfile?.role || 'student',
          authorAvatar: currentProfile?.avatarUrl || null,
          content,
          parentId: parentId || null,
          createdAt: new Date().toISOString(),
        };
        setLessonComments((prev) => [...prev, fallbackComment]);
      }
    } catch {
      const fallbackComment: LessonComment = {
        id: Date.now(),
        courseId: course.id,
        lessonId,
        authorId: currentProfile?.id || 1,
        authorName: currentProfile?.fullName || 'Student',
        authorRole: currentProfile?.role || 'student',
        authorAvatar: currentProfile?.avatarUrl || null,
        content,
        parentId: parentId || null,
        createdAt: new Date().toISOString(),
      };
      setLessonComments((prev) => [...prev, fallbackComment]);
    }
  };

  const handleToggleComplete = async (lessonId: number) => {
    if (!enrollment) {
      if (!isCourseFull) {
        await onEnroll(course.id);
      }
      return;
    }
    setUpdatingProgress(true);
    try {
      await onToggleLessonComplete(lessonId);
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleHomeworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim()) return;
    const cleanContent = hwContent.trim();
    const cleanAttachment = hwAttachmentUrl.trim();
    if (!cleanContent && !cleanAttachment) return;
    setSubmittingHw(true);
    try {
      await onSubmitHomework(
        course.id,
        hwLessonId ? Number(hwLessonId) : null,
        hwTitle.trim(),
        cleanContent || `Homework document attached: ${cleanAttachment.split('/').pop() || 'File'}`,
        cleanAttachment || null
      );
      setHwTitle('');
      setHwContent('');
      setHwAttachmentUrl('');
    } finally {
      setSubmittingHw(false);
    }
  };

  const courseProgressPct = useMemo(() => {
    if (enrollment?.progressPercentage !== undefined) {
      return enrollment.progressPercentage;
    }
    if (courseLessons.length === 0) return 0;
    return Math.min(100, Math.round((completedIds.length / courseLessons.length) * 100));
  }, [enrollment?.progressPercentage, completedIds.length, courseLessons.length]);

  const gradedHomeworkCount = useMemo(
    () =>
      myCourseHomework.filter(
        (h) => h.status === 'graded' || h.status === 'exemplary'
      ).length,
    [myCourseHomework]
  );

  const parsedFeedbackMessages = useMemo(() => {
    return messages.filter(
      (m) =>
        m.subject.startsWith('[CLASS_FEEDBACK]') ||
        m.subject.startsWith('[WEBSITE_FEEDBACK]')
    );
  }, [messages]);

  const handleSaveTutorGradeFeedback = async (hw: HomeworkSubmission) => {
    if (!onGradeHomework) return;
    const draft = tutorFeedbackDrafts[hw.id] || {
      status: hw.status === 'submitted' ? 'graded' : hw.status,
      grade: hw.grade || 'A (95%)',
      feedback:
        hw.feedback ||
        'MashaAllah, well-structured analysis of primary sources. Keep up the diligent scholarship.',
    };
    setSavingTutorFeedbackId(hw.id);
    try {
      await onGradeHomework(hw.id, draft.status, draft.grade, draft.feedback);
      setOpenTutorEditorId(null);
    } finally {
      setSavingTutorFeedbackId(null);
    }
  };

  const handleStudentFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFeedbackComment.trim()) return;
    setSubmittingStudentFeedback(true);
    try {
      const categoryLabel =
        studentFeedbackType === 'class'
          ? `${course.title} (${studentFeedbackAspect})`
          : `Portal Website (${studentFeedbackAspect})`;

      if (onSubmitFeedback) {
        await onSubmitFeedback(
          studentFeedbackType,
          categoryLabel,
          studentFeedbackRating,
          studentFeedbackComment.trim()
        );
      }

      setLocalFeedbackHistory((prev) => [
        {
          id: `${Date.now()}`,
          type: studentFeedbackType,
          aspect: categoryLabel,
          rating: studentFeedbackRating,
          comment: studentFeedbackComment.trim(),
          createdAt: new Date().toLocaleDateString(),
        },
        ...prev,
      ]);
      setStudentFeedbackComment('');
    } finally {
      setSubmittingStudentFeedback(false);
    }
  };

  const courseTags = parseCourseTags(course);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[1920px] 2xl:max-w-[2400px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 2xl:px-12 py-6 md:py-8 space-y-6"
    >
      {/* Top Breadcrumb, Course Capacity, Student Course Progress & Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b academy-divider">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Academy Catalog</span>
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold">{course.title}</h1>
            {courseTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {courseTags.map((tag, tIdx) => {
                  const isLive = tag.toLowerCase().includes('live');
                  const isOpen = tag.toLowerCase().includes('open');
                  const isComing = tag.toLowerCase().includes('coming');
                  return (
                    <span
                      key={`${tag}-${tIdx}`}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide shadow-sm ${
                        isLive
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : isOpen
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isComing
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                      {isOpen && !isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {isComing && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      <span>{tag}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs academy-text-secondary">
            <span>{course.category}</span>
            <span aria-hidden="true">·</span>
            <span>Faculty: {course.instructorName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{course.duration}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-teal-300 font-mono-tabular">
              <Globe className="w-3.5 h-3.5" />
              <span>
                Classes: {course.classDays || 'Sat & Wed'} at{' '}
                {convertedClassSchedule.formattedLocalTime} ({detectedTz})
              </span>
            </span>
          </div>

          {/* Enrollment Rate, Student Capacity & Personal Course Progress Bar */}
          <div className="pt-1 flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2 text-xs font-mono-tabular">
              <Users className="w-3.5 h-3.5 text-teal-400" />
              <span>
                <strong>
                  {studentsTaken} / {maxStudents}
                </strong>{' '}
                Students Taken
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={`font-semibold ${
                  isCourseFull ? 'text-rose-400' : 'text-teal-400'
                }`}
              >
                {enrollmentRate}% Enrollment Rate {isCourseFull ? '(COHORT FULL)' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs font-mono-tabular">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Course Progress: <strong className="text-emerald-400">{courseProgressPct}%</strong> ({completedIds.length}/{courseLessons.length} Lessons)
              </span>
              <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${courseProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mode Switcher: Video Classroom | Animated Syllabus Boxes | Course Calendar | Homework, Progress & Feedback */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-lg academy-elevated overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('lecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'lecture'
                  ? 'bg-teal-400 text-slate-950 font-semibold'
                  : 'academy-text-secondary hover:text-teal-300'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Recordings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('syllabus')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'syllabus'
                  ? 'bg-teal-400 text-slate-950 font-semibold'
                  : 'academy-text-secondary hover:text-teal-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Syllabus ({parsedSyllabusBoxes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'calendar'
                  ? 'bg-teal-400 text-slate-950 font-semibold'
                  : 'academy-text-secondary hover:text-teal-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Course Calendar ({courseEvents.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('homework')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'homework'
                  ? 'bg-teal-400 text-slate-950 font-semibold'
                  : 'academy-text-secondary hover:text-teal-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Homework, Progress &amp; Feedback ({myCourseHomework.length})</span>
            </button>
          </div>

          {!enrollment && (
            <button
              type="button"
              disabled={isCourseFull}
              onClick={() => onEnroll(course.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                isCourseFull
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed'
                  : 'bg-teal-400 text-slate-950 hover:bg-teal-300'
              }`}
            >
              {isCourseFull
                ? `Enrollment Closed (${studentsTaken}/${maxStudents} Full)`
                : `Enroll in Course (${course.price})`}
            </button>
          )}
        </div>
      </div>

      {/* Animated Syllabus Boxes Preview Strip on top of Classroom */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'syllabus' ? (
          <motion.div
            key="syllabus-tab"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Syllabus Text & Document Header */}
            <div className="rounded-xl academy-surface p-6 space-y-4 border border-teal-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b academy-divider">
                <div>
                  <div className="text-xs font-medium text-teal-400">
                    Official Course Syllabus · Faculty: {course.instructorName}
                  </div>
                  <h2 className="font-display text-xl font-bold mt-0.5">
                    {course.title} — Curriculum &amp; Module Breakdown
                  </h2>
                </div>
                {course.syllabusFileUrl && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setActivePdfModal({
                          url: course.syllabusFileUrl!,
                          title: `${course.title} — Official Syllabus Document`,
                        })
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 shadow-md transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Read Syllabus (Animated Page Reader)</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={course.syllabusFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400 whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-400" />
                      <span>Download File</span>
                    </a>
                  </div>
                )}
              </div>

              <p className="text-sm academy-text-secondary leading-relaxed whitespace-pre-line">
                {course.syllabusText || course.longDescription}
              </p>
            </div>

            {/* Animated Syllabus Module Boxes */}
            {parsedSyllabusBoxes.length > 0 ? (
              <motion.div
                variants={syllabusContainerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                {parsedSyllabusBoxes.map((box, index) => (
                  <motion.div
                    key={index}
                    variants={syllabusBoxVariants}
                    whileHover={{ y: -4 }}
                    className="rounded-xl academy-surface p-6 border border-teal-500/25 hover:border-teal-400/60 transition-colors flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono-tabular text-teal-400">
                        <span>{box.week || `Module 0${index + 1}`}</span>
                        <span>Box {String(index + 1).padStart(2, '0')}</span>
                      </div>
                      <h3 className="font-display text-lg font-bold">{box.title}</h3>
                      <p className="text-xs academy-text-secondary leading-relaxed whitespace-pre-line">
                        {box.topics}
                      </p>
                    </div>

                    {box.deliverable && (
                      <div className="pt-3 border-t academy-divider flex items-center justify-between gap-2 text-xs">
                        <span className="text-teal-300 font-medium">
                          Homework / Deliverable: {box.deliverable}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-xl academy-surface p-8 text-center text-xs academy-text-secondary">
                No syllabus module boxes added yet.
              </div>
            )}
          </motion.div>
        ) : activeSubTab === 'calendar' ? (
          <motion.div
            key="calendar-tab"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <InteractiveCalendar
              courses={[course]}
              events={events}
              lessons={lessons}
              enrolledCourseIds={isEnrolled ? [course.id] : []}
              isAdmin={isAdmin}
              currentProfile={currentProfile}
              isInstructor={currentProfile?.role === 'instructor'}
              fixedCourseId={course.id}
              onEnrollCourse={onEnroll}
              onOpenWatchCourse={() => setActiveSubTab('lecture')}
            />
          </motion.div>
        ) : activeSubTab === 'homework' ? (
          <motion.div
            key="homework-tab"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-8"
          >
            {/* 1. STUDENT COURSE PROGRESS & INTERACTIVE MILESTONE TRACKER */}
            <div className="rounded-xl academy-surface p-6 border border-teal-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b academy-divider">
                <div>
                  <div className="text-xs font-medium text-teal-400">
                    Course Progress &amp; Milestone Tracker
                  </div>
                  <h2 className="font-display text-lg font-bold mt-0.5">
                    {course.title} — Completion &amp; Academic Standing
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono-tabular">
                  <span>
                    Progress: <strong className="text-emerald-400">{courseProgressPct}%</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Recordings Done:{' '}
                    <strong className="text-teal-300">
                      {completedIds.length}/{courseLessons.length}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Homework Graded:{' '}
                    <strong className="text-teal-300">
                      {gradedHomeworkCount}/{myCourseHomework.length}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${courseProgressPct}%` }}
                />
              </div>

              {courseLessons.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {courseLessons.map((lesson) => {
                    const isDone = completedIds.includes(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => handleToggleComplete(lesson.id)}
                        className={`flex items-center justify-between gap-2.5 p-3 rounded-lg text-left text-xs transition-colors border ${
                          isDone
                            ? 'academy-elevated border-emerald-500/40 text-emerald-300'
                            : 'academy-elevated border-transparent academy-text-secondary hover:border-teal-400/40'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 academy-text-muted shrink-0" />
                          )}
                          <span className="truncate font-medium">{lesson.title}</span>
                        </span>
                        <span className="font-mono-tabular text-[11px] shrink-0">
                          {isDone ? 'Done' : lesson.duration}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. INTERACTIVE COURSE QUIZZES & ASSESSMENTS */}
            {courseQuizzes.length > 0 && (
              <div className="rounded-xl academy-surface p-6 border border-teal-500/25 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-teal-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Interactive Course Quizzes &amp; Milestone Assessments</span>
                    </h3>
                    <p className="text-xs academy-text-secondary mt-0.5">
                      Test your understanding of {course.title} with timed questions, cool transitions, and earn verified certification badges.
                    </p>
                  </div>
                  <span className="text-xs text-amber-300 font-mono font-bold">
                    {courseQuizzes.length} Assessment{courseQuizzes.length === 1 ? '' : 's'} Available
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courseQuizzes.map((quiz) => {
                    const studentAttempt = courseAttempts.find((a) => a.quizId === quiz.id);
                    return (
                      <motion.div
                        key={quiz.id}
                        whileHover={{ scale: 1.01 }}
                        className="p-4 rounded-xl academy-elevated border border-slate-800 hover:border-teal-400/50 transition-all flex flex-col justify-between space-y-3 group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-slate-400">
                              {quiz.questions.length} Questions • {quiz.timeLimitMinutes > 0 ? `${quiz.timeLimitMinutes}m` : 'Untimed'}
                            </span>
                            <span className="text-teal-400 font-bold">Passing: {quiz.passingScore}%</span>
                          </div>
                          <h4 className="font-display text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                            {quiz.title}
                          </h4>
                          <p className="text-xs academy-text-secondary line-clamp-2">{quiz.description}</p>
                          {studentAttempt && (
                            <div className={`p-2 rounded-lg text-xs font-bold flex items-center justify-between ${
                              studentAttempt.passed
                                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                                : 'bg-amber-950/40 border border-amber-500/40 text-amber-300'
                            }`}>
                              <span>Score: {studentAttempt.score}%</span>
                              <span className="uppercase text-[10px] tracking-wider">
                                {studentAttempt.passed ? 'PASSED ✓' : 'REVIEW'}
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveQuizModal(quiz)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{studentAttempt ? 'Retake Assessment' : 'Take Quiz Assessment'}</span>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. ASSIGNED HOMEWORK FROM FACULTY FOR THIS COURSE */}
            {courseAssignments.length > 0 && (
              <div className="rounded-xl academy-surface p-6 border border-teal-500/25 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-400" />
                      <span>Assigned Coursework for {course.title}</span>
                    </h3>
                    <p className="text-xs academy-text-secondary mt-0.5">
                      Required submissions and research folios evaluated by {course.instructorName}.
                    </p>
                  </div>
                  <span className="text-xs text-teal-300 font-mono font-bold">
                    {courseAssignments.length} Assigned
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courseAssignments.map((asgn) => (
                    <div key={asgn.id} className="p-4 rounded-xl academy-elevated border border-slate-800 space-y-2 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-amber-300 font-mono font-bold">Due: {asgn.dueDate}</span>
                          <span className="text-slate-400">{asgn.maxPoints} pts max</span>
                        </div>
                        <h4 className="font-display text-sm font-bold text-white">{asgn.title}</h4>
                        <p className="text-xs academy-text-secondary line-clamp-3">{asgn.description}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setHwTitle(`Submission: ${asgn.title}`);
                          const el = document.getElementById('watch-hw-form');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-teal-400 hover:text-slate-950 text-xs font-bold text-teal-300 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Submit for this assignment</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. HOMEWORK SUBMISSION & FACULTY FEEDBACK / GRADE STATUSES */}
            <div id="watch-hw-form" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 6 Cols: Submit Homework Form */}
              <div className="lg:col-span-5 rounded-xl academy-surface p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-teal-400">
                  Submit Course Homework &amp; Assignment
                </h2>
                <p className="text-xs academy-text-secondary">
                  Submit your written assignment or upload your homework file directly to instructor{' '}
                  {course.instructorName}.
                </p>

                {!isEnrolled ? (
                  <div className="p-6 rounded-lg academy-elevated text-center space-y-3">
                    <Lock className="w-7 h-7 text-amber-400 mx-auto" />
                    <div className="text-sm font-semibold">
                      Homework Submission Requires Course Enrollment
                    </div>
                    <p className="text-xs academy-text-secondary">
                      Please enroll in {course.title} to submit homework assignments to faculty.
                    </p>
                    {!isCourseFull && (
                      <button
                        type="button"
                        onClick={() => onEnroll(course.id)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950"
                      >
                        Enroll Now
                      </button>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleHomeworkSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Homework / Assignment Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={hwTitle}
                        onChange={(e) => setHwTitle(e.target.value)}
                        placeholder="e.g. Module 1 Reflection Paper on Cave Hira"
                        className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
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
                        {courseLessons.map((l) => (
                          <option key={l.id} value={String(l.id)}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Upload Homework File (PDF, Document, or Image)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={hwAttachmentUrl}
                          onChange={(e) => setHwAttachmentUrl(e.target.value)}
                          placeholder="Paste link or click Upload File ->"
                          className="flex-1 px-3 py-2 text-xs rounded-lg academy-elevated"
                        />
                        <label className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 whitespace-nowrap transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingHwFile ? 'Uploading...' : 'Upload File'}</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingHwFile(true);
                              try {
                                const uploadedUrl = await onUploadFile(file);
                                setHwAttachmentUrl(uploadedUrl);
                              } finally {
                                setUploadingHwFile(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                      {hwAttachmentUrl && (
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-teal-400">
                          <span>File Attached: {hwAttachmentUrl.split('/').pop()}</span>
                          <button
                            type="button"
                            onClick={() => setHwAttachmentUrl('')}
                            className="text-slate-400 hover:text-rose-400 underline ml-auto"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        Written Response / Notes {hwAttachmentUrl ? '(Optional)' : '*'}
                      </label>
                      <textarea
                        rows={5}
                        required={!hwAttachmentUrl.trim()}
                        value={hwContent}
                        onChange={(e) => setHwContent(e.target.value)}
                        placeholder={
                          hwAttachmentUrl
                            ? 'Optional notes or questions regarding your attached document...'
                            : 'Write your homework answer, textual analysis, or notes for Mustaqeem Shaikh...'
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingHw}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingHw ? 'Submitting...' : 'Submit Homework to Tutor'}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Right 7 Cols: Student Submissions + Interactive Faculty Feedback & Grade Status Section */}
              <div className="lg:col-span-7 rounded-xl academy-surface p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b academy-divider">
                  <div>
                    <h3 className="font-display text-lg font-bold">
                      Student Submissions &amp; Faculty Feedback ({myCourseHomework.length})
                    </h3>
                    <p className="text-xs academy-text-secondary">
                      View instructor comments, grade scores, and grade statuses from{' '}
                      {course.instructorName}.
                    </p>
                  </div>
                </div>

                {myCourseHomework.length === 0 ? (
                  <p className="text-xs academy-text-secondary py-8 text-center">
                    No homework submitted for this course yet. Submit your first assignment on the
                    left to receive faculty feedback and grade status updates.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {myCourseHomework.map((hw) => {
                      const statusMeta =
                        GRADE_STATUS_META[hw.status] || GRADE_STATUS_META.submitted;
                      const isEditingFeedback = isAdmin || openTutorEditorId === hw.id;
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
                              <span className="font-semibold text-teal-400">{hw.title}</span>
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
                                  <span className="font-semibold text-white">
                                    Grade: {hw.grade}
                                  </span>
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
                                Faculty Feedback Section · Instructor: {course.instructorName}
                              </div>
                              {!isAdmin && onGradeHomework && (
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
                                  <span>Status: {statusMeta.label}</span>
                                  <span>Assigned Grade: {hw.grade || 'Reviewed'}</span>
                                </div>
                                <p className="text-xs academy-text-secondary whitespace-pre-line leading-relaxed">
                                  {hw.feedback}
                                </p>
                              </div>
                            ) : (
                              <div className="p-3 rounded-lg academy-surface text-xs academy-text-muted">
                                Awaiting instructor comment and grade evaluation from{' '}
                                {course.instructorName}.
                              </div>
                            )}

                            {/* Interactive Tutor Comment & Grade Status Controls */}
                            {isEditingFeedback && onGradeHomework && (
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
                                    Faculty Feedback Comments
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
                                    placeholder="Write detailed faculty feedback and scholarly guidance for the student..."
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

            {/* 3. STUDENT CLASS & WEBSITE FEEDBACK SECTION */}
            <div className="rounded-xl academy-surface p-6 border border-teal-500/25 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b academy-divider">
                <div>
                  <h3 className="font-display text-lg font-bold text-teal-400">
                    Student Class &amp; Website Feedback
                  </h3>
                  <p className="text-xs academy-text-secondary">
                    Share your feedback on {course.title} classes, live Zoom seminars, or the Deen
                    Hijrah Academia website experience.
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-lg academy-elevated shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentFeedbackType('class');
                      setStudentFeedbackAspect('Live Zoom Sessions & Pedagogy');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      studentFeedbackType === 'class'
                        ? 'bg-teal-400 text-slate-950 font-semibold'
                        : 'academy-text-secondary hover:text-teal-300'
                    }`}
                  >
                    Class Feedback
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentFeedbackType('website');
                      setStudentFeedbackAspect('Video Player & Curriculum Sidebar');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      studentFeedbackType === 'website'
                        ? 'bg-teal-400 text-slate-950 font-semibold'
                        : 'academy-text-secondary hover:text-teal-300'
                    }`}
                  >
                    Website Feedback
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <form
                  onSubmit={handleStudentFeedbackSubmit}
                  className="lg:col-span-6 space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs academy-text-secondary mb-1">
                        {studentFeedbackType === 'class'
                          ? 'Class Area / Topic'
                          : 'Website Feature / Area'}
                      </label>
                      <select
                        value={studentFeedbackAspect}
                        onChange={(e) => setStudentFeedbackAspect(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg academy-elevated"
                      >
                        {studentFeedbackType === 'class' ? (
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
                        Rating (1 to 5)
                      </label>
                      <select
                        value={studentFeedbackRating}
                        onChange={(e) => setStudentFeedbackRating(Number(e.target.value))}
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
                      Your {studentFeedbackType === 'class' ? 'Class' : 'Website'} Feedback &amp;
                      Suggestions *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={studentFeedbackComment}
                      onChange={(e) => setStudentFeedbackComment(e.target.value)}
                      placeholder={
                        studentFeedbackType === 'class'
                          ? `Share your thoughts on ${course.title}, the pace of the seminar, or study resources...`
                          : 'Share your thoughts on the website usability, video classroom, or features you would like to see...'
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg academy-elevated"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingStudentFeedback}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {submittingStudentFeedback
                        ? 'Submitting Feedback...'
                        : `Submit ${
                            studentFeedbackType === 'class' ? 'Class' : 'Website'
                          } Feedback`}
                    </span>
                  </button>
                </form>

                <div className="lg:col-span-6 space-y-3">
                  <div className="text-xs font-semibold text-teal-300">
                    Recent Class &amp; Website Feedback Log
                  </div>
                  {localFeedbackHistory.length === 0 && parsedFeedbackMessages.length === 0 ? (
                    <div className="p-5 rounded-lg academy-elevated text-xs academy-text-secondary text-center">
                      No class or website feedback submitted yet. Use the form on the left to share
                      your review.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {localFeedbackHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-lg academy-elevated border border-teal-500/20 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between font-mono-tabular">
                            <span className="font-semibold text-teal-400">
                              {item.type === 'class' ? 'Class Feedback' : 'Website Feedback'} ·{' '}
                              {item.aspect}
                            </span>
                            <span className="text-emerald-400">Rating: {item.rating}/5</span>
                          </div>
                          <p className="academy-text-secondary">{item.comment}</p>
                        </div>
                      ))}
                      {parsedFeedbackMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-3.5 rounded-lg academy-elevated border border-teal-500/20 space-y-1 text-xs"
                        >
                          <div className="font-semibold text-teal-400">{msg.subject}</div>
                          <p className="academy-text-secondary whitespace-pre-line">{msg.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* LECTURE RECORDINGS & INTERACTIVE SYLLABUS SIDEBAR */
          <motion.div
            key="lecture-tab"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            {/* Instructor Course Announcements */}
            {courseAnnouncements.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-950 border border-teal-500/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-300 font-display">
                    <Megaphone className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Instructor Announcements ({courseAnnouncements.length})</span>
                  </div>
                  <span className="text-[11px] font-mono-tabular text-teal-400/80">
                    {course.instructorName}
                  </span>
                </div>
                <div className="space-y-2">
                  {courseAnnouncements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3.5 rounded-xl academy-elevated border border-slate-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                        {ann.priority === 'important' && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Important
                          </span>
                        )}
                      </div>
                      <p className="text-xs academy-text-secondary leading-relaxed">
                        {ann.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className={`grid grid-cols-1 ${
                isTheaterMode ? 'lg:grid-cols-1' : 'lg:grid-cols-12'
              } gap-6 items-start`}
            >
              {/* Right Side (or Full Width in Theater Mode): Video Player Stage on the Right */}
              <div
                className={`${
                  isTheaterMode
                    ? 'order-1 w-full'
                    : 'order-1 lg:order-2 lg:col-span-8 xl:col-span-8'
                } space-y-6`}
              >
                {currentLesson ? (
                  <>
                    <div className="relative rounded-xl overflow-hidden academy-surface border border-teal-500/30 bg-black shadow-2xl">
                      {/* Theater Mode & Scale Toggle Button */}
                      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsTheaterMode(!isTheaterMode)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-950/85 hover:bg-slate-900 text-teal-300 border border-teal-500/40 backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg cursor-pointer"
                          title={isTheaterMode ? 'Standard Layout' : 'Scale Bigger (Theater Mode)'}
                        >
                          {isTheaterMode ? (
                            <Minimize2 className="w-3.5 h-3.5" />
                          ) : (
                            <Maximize2 className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {isTheaterMode ? 'Standard Layout' : 'Scale Bigger'}
                          </span>
                        </button>
                      </div>

                      {videoHasError ? (
                        <div className="w-full aspect-video flex flex-col items-center justify-center p-6 text-center bg-slate-950 space-y-3">
                          <p className="text-sm text-slate-300">
                            Video playback stream momentarily unavailable or network interrupted.
                          </p>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setVideoHasError(false)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Retry Video</span>
                            </button>
                            <a
                              href={resolvedVideoUrl || currentLesson.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400 text-teal-300 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Direct Stream Link</span>
                            </a>
                          </div>
                        </div>
                      ) : isEmbedUrl(currentLesson.videoUrl) ? (
                        <iframe
                          src={getEmbedUrl(currentLesson.videoUrl)}
                          title={currentLesson.title}
                          className="w-full aspect-video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : !(resolvedVideoUrl || currentLesson.videoUrl) ? (
                        <div className="w-full aspect-video flex flex-col items-center justify-center p-8 text-center bg-slate-950/95 border border-slate-800 space-y-3">
                          <div className="p-3.5 rounded-2xl bg-teal-500/10 text-teal-400">
                            <Film className="w-8 h-8" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-200 font-display">
                            Lecture Recording in Preparation
                          </h4>
                          <p className="text-xs academy-text-secondary max-w-md">
                            The instructor uploads the official high-definition lecture recording following the live class. Check back shortly or attend the upcoming live Zoom session.
                          </p>
                        </div>
                      ) : (
                        <video
                          key={`${resolvedVideoUrl || currentLesson.videoUrl}-${currentLesson.id}`}
                          src={resolvedVideoUrl || currentLesson.videoUrl}
                          poster={resolveThumbnailUrl(
                            currentLesson.thumbnailUrl || course.thumbnailUrl
                          )}
                          controls
                          preload="metadata"
                          playsInline
                          onError={() => setVideoHasError(true)}
                          className="w-full aspect-video bg-black object-contain sm:object-cover transform-gpu"
                        />
                      )}
                    </div>

                    {/* Lesson Metadata, Mark as Complete Button, and PDF Resource */}
                    <div className="rounded-xl academy-surface p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b academy-divider">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
                            <span>
                              {currentLesson.isFreePreview
                                ? 'Public Orientation Recording'
                                : `Enrolled Class Recording #${currentLesson.positionOrder}`}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">{currentLesson.duration}</span>
                            {currentLesson.scheduledDate && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono-tabular">
                                  Date: {currentLesson.scheduledDate}
                                </span>
                              </>
                            )}
                          </div>
                          <h2 className="font-display text-xl font-bold mt-1">
                            {currentLesson.title}
                          </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {canWatchCurrentLesson &&
                            getLessonDownloadableResources(currentLesson).length > 0 &&
                            getLessonDownloadableResources(currentLesson).map((res) => (
                              <div key={res.id} className="flex items-center gap-1.5">
                                {(res.type === 'PDF' || res.url.includes('.pdf') || res.url.startsWith('data:') || res.url.startsWith('/api/media/')) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActivePdfModal({
                                        url: res.url,
                                        title: `${currentLesson.title} — ${res.title}`,
                                      })
                                    }
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>Read Animated PDF</span>
                                    <Sparkles className="w-3 h-3" />
                                  </button>
                                )}
                                <a
                                  href={res.url}
                                  download={res.downloadFilename}
                                  target={res.downloadFilename ? undefined : '_blank'}
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400/60 transition-colors whitespace-nowrap"
                                >
                                  <ResourceFileTypeIcon type={res.type} size="sm" />
                                  <span className="font-mono-tabular font-semibold">{res.type}:</span>
                                  <span>{res.title}</span>
                                  {res.type === 'Link' ? (
                                    <ExternalLink className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                  )}
                                </a>
                              </div>
                            ))}

                          {isEnrolled && (
                            <button
                              type="button"
                              disabled={updatingProgress}
                              onClick={() => handleToggleComplete(currentLesson.id)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                                completedIds.includes(currentLesson.id)
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-teal-400 text-slate-950 hover:bg-teal-300'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>
                                {completedIds.includes(currentLesson.id)
                                  ? 'Completed (Click to Undo)'
                                  : 'Mark as Complete'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                          Lecture Synopsis &amp; Study Notes
                        </h3>
                        <p className="text-sm academy-text-secondary leading-relaxed">
                          {currentLesson.description}
                        </p>
                      </div>
                    </div>

                    {/* Daily Quick Session Survey (Satisfactory / Unsatisfactory) */}
                    <ClassSessionSurveyWidget
                      courseId={course.id}
                      courseTitle={course.title}
                      lessonId={currentLesson.id}
                      lessonTitle={currentLesson.title}
                      instructorName={course.instructorName}
                      currentProfile={currentProfile}
                      onSubmitSurvey={async (rating, comment) => {
                        const fetchFn = authFetch || smartApiFetch;
                        await fetchFn('/api/class-surveys', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            courseId: course.id,
                            lessonId: currentLesson.id,
                            instructorId: course.instructorId || null,
                            rating,
                            comment,
                          }),
                        });
                      }}
                    />

                    {/* Threaded Comment System Under Lesson & Recording */}
                    <LessonThreadedComments
                      lessonId={currentLesson.id}
                      lessonTitle={currentLesson.title}
                      courseId={course.id}
                      comments={lessonComments}
                      currentProfile={currentProfile}
                      onPostComment={handlePostComment}
                    />
                  </>
                ) : (
                  <div className="rounded-xl academy-surface p-10 text-center">
                    <BookOpen className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                    <h3 className="font-display text-lg font-bold">No Recorded Lessons Yet</h3>
                    <p className="text-xs academy-text-secondary mt-1">
                      Orientation and class recordings will appear here once uploaded.
                    </p>
                  </div>
                )}

                {/* Animated Syllabus Boxes Section right below the video player */}
                {parsedSyllabusBoxes.length > 0 && (
                  <div className="rounded-xl academy-surface p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display text-base font-bold text-teal-400">
                          Structured Course Syllabus Modules
                        </h3>
                        <p className="text-xs academy-text-secondary">
                          Module boxes and homework deliverables for {course.title}
                        </p>
                      </div>
                      {course.syllabusFileUrl && (
                        <a
                          href={course.syllabusFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-teal-400 hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Syllabus File</span>
                        </a>
                      )}
                    </div>

                    {course.syllabusText && (
                      <p className="text-xs academy-text-secondary leading-relaxed p-3.5 rounded-lg academy-elevated">
                        {course.syllabusText}
                      </p>
                    )}

                    <motion.div
                      variants={syllabusContainerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {parsedSyllabusBoxes.map((box, idx) => (
                        <motion.div
                          key={idx}
                          variants={syllabusBoxVariants}
                          className="p-4 rounded-xl academy-elevated border border-teal-500/20 space-y-2"
                        >
                          <div className="text-[11px] font-mono-tabular text-teal-400">
                            {box.week || `Module 0${idx + 1}`}
                          </div>
                          <div className="font-display text-sm font-bold">{box.title}</div>
                          <p className="text-xs academy-text-secondary leading-relaxed">
                            {box.topics}
                          </p>
                          {box.deliverable && (
                            <div className="pt-2 border-t academy-divider text-[11px] text-amber-300">
                              Homework: {box.deliverable}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Left Side (Playlist on the Side): Interactive Recordings Playlist */}
              <div
                className={`${
                  isTheaterMode
                    ? 'order-2 w-full'
                    : 'order-2 lg:order-1 lg:col-span-4 xl:col-span-4'
                } rounded-2xl academy-surface p-4 sm:p-5 space-y-4 shadow-xl border border-teal-500/25 sticky top-24`}
              >
                <div className="pb-3 border-b academy-divider space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-teal-400 flex items-center gap-2">
                      <Film className="w-4 h-4 text-teal-300" />
                      <span>Course Recordings</span>
                    </h3>
                    <span className="text-xs font-mono-tabular text-emerald-400 font-semibold">
                      {completedIds.length}/{courseLessons.length} Done
                    </span>
                  </div>

                  <p className="text-[11px] academy-text-secondary">
                    Click any lecture in the side playlist to play on the big screen.
                  </p>

                  {/* Playlist Search Box */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={playlistSearch}
                      onChange={(e) => setPlaylistSearch(e.target.value)}
                      placeholder="Search lecture by title or topic..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-teal-400 transition-all duration-300"
                      style={{ width: `${enrollment?.progressPercentage || 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                  {courseLessons
                    .filter(
                      (l) =>
                        !playlistSearch.trim() ||
                        l.title.toLowerCase().includes(playlistSearch.toLowerCase()) ||
                        l.description.toLowerCase().includes(playlistSearch.toLowerCase())
                    )
                    .map((lesson) => {
                      const isSelected = currentLesson?.id === lesson.id;
                      const isDone = completedIds.includes(lesson.id);
                      const isUnlocked = isEnrolled || lesson.isFreePreview;
                      const lessonResources = getLessonDownloadableResources(lesson);

                      return (
                        <div
                          key={lesson.id}
                          onClick={() => {
                            setSelectedLessonId(lesson.id);
                            setVideoHasError(false);
                          }}
                          className={`rounded-xl p-3 transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-950 border-teal-400 shadow-lg shadow-teal-500/10 ring-1 ring-teal-400/40'
                              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleComplete(lesson.id);
                              }}
                              title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                              className="mt-1 text-teal-400 hover:text-teal-300 shrink-0"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 fill-teal-400/20" />
                              ) : (
                                <Circle className="w-4 h-4 academy-text-muted" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2.5">
                                <div className="relative w-16 h-11 rounded-lg overflow-hidden shrink-0 bg-slate-950 border border-white/10">
                                  <img
                                    src={resolveThumbnailUrl(
                                      lesson.thumbnailUrl || course.thumbnailUrl
                                    )}
                                    alt={lesson.title}
                                    loading="lazy"
                                    decoding="async"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src =
                                        ACADEMY_ASSETS.courseSeerah;
                                    }}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/20" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-mono-tabular text-teal-400 font-semibold">
                                      Lecture #{lesson.positionOrder}
                                    </span>
                                    {isSelected ? (
                                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-400 text-slate-950">
                                        <span className="flex items-end gap-0.5 h-2">
                                          <span className="w-0.5 h-full bg-slate-950 animate-pulse" />
                                          <span className="w-0.5 h-1.5 bg-slate-950 animate-pulse delay-75" />
                                          <span className="w-0.5 h-full bg-slate-950 animate-pulse delay-150" />
                                        </span>
                                        <span>Now Playing</span>
                                      </span>
                                    ) : (
                                      <span
                                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                          lesson.isFreePreview
                                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                            : 'bg-emerald-500/15 text-emerald-300'
                                        }`}
                                      >
                                        {lesson.isFreePreview ? 'Orientation' : 'Enrolled'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs font-semibold text-slate-100 line-clamp-2 leading-snug">
                                    {lesson.title}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] academy-text-muted font-mono-tabular pt-1 border-t border-slate-800/60">
                                <span>{lesson.duration}</span>
                                <span className="text-emerald-400 font-semibold">
                                  Free to Watch
                                </span>
                              </div>

                            {/* Downloadable Resource Items in Curriculum Sidebar (ONLY IF INSTRUCTOR ADDED ATTACHMENT) */}
                            {lessonResources.length > 0 && (
                              <div className="pt-2 border-t academy-divider space-y-1.5">
                                <div className="text-[10px] font-semibold uppercase tracking-wider academy-text-muted">
                                  Downloadable Resources
                                </div>
                                <div className="space-y-1">
                                  {lessonResources.map((res) => {
                                    const typeColorClass =
                                      res.type === 'PDF'
                                        ? 'text-rose-400'
                                        : res.type === 'Doc'
                                        ? 'text-sky-400'
                                        : 'text-teal-400';

                                    return isUnlocked ? (
                                      <a
                                        key={res.id}
                                        href={res.url}
                                        download={res.downloadFilename}
                                        target={res.downloadFilename ? undefined : '_blank'}
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md academy-surface hover:border-teal-400/50 transition-colors text-[11px] group"
                                      >
                                        <span className="flex items-center gap-2 min-w-0">
                                          <ResourceFileTypeIcon type={res.type} size="sm" />
                                          <span
                                            className={`font-mono-tabular font-semibold shrink-0 ${typeColorClass}`}
                                          >
                                            {res.type}
                                          </span>
                                          <span aria-hidden="true" className="academy-text-muted">
                                            ·
                                          </span>
                                          <span className="truncate font-medium academy-text-secondary group-hover:text-white transition-colors">
                                            {res.title}
                                          </span>
                                        </span>
                                        {res.type === 'Link' ? (
                                          <ExternalLink className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                        ) : (
                                          <Download className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                        )}
                                      </a>
                                    ) : (
                                      <div
                                        key={res.id}
                                        title="Enroll in this course to unlock downloadable resources"
                                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md academy-surface opacity-75 text-[11px]"
                                      >
                                        <span className="flex items-center gap-2 min-w-0">
                                          <ResourceFileTypeIcon type={res.type} size="sm" />
                                          <span
                                            className={`font-mono-tabular font-semibold shrink-0 ${typeColorClass}`}
                                          >
                                            {res.type}
                                          </span>
                                          <span aria-hidden="true" className="academy-text-muted">
                                            ·
                                          </span>
                                          <span className="truncate academy-text-muted">
                                            {res.title}
                                          </span>
                                        </span>
                                        <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Homework & Calendar shortcuts for Enrolled Students */}
                <div className="pt-3 border-t academy-divider grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('syllabus')}
                    className="py-2 px-3 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400 text-center"
                  >
                    Full Syllabus
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('homework')}
                    className="py-2 px-3 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 text-center"
                  >
                    Submit Homework
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating 'Ask Question' Button to send a direct message to Course Instructor */}
      <div className="fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleOpenAskModal(currentLesson?.id)}
          className="group flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-[0_12px_35px_rgba(250,204,21,0.35)] ring-2 ring-amber-400/70 hover:shadow-[0_18px_45px_rgba(250,204,21,0.55)] border border-amber-200 transition-all cursor-pointer"
          title={`Ask ${course.instructorName || 'Instructor'} a question about ${
            currentLesson ? currentLesson.title : 'this course'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-slate-950/15 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform shadow-sm">
            <HelpCircle className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span>Ask Question</span>
              {currentLesson && (
                <span className="text-[10px] bg-slate-950/20 px-1.5 py-0.2 rounded font-mono-tabular font-bold">
                  L{currentLesson.positionOrder}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold text-slate-900/80 tracking-normal hidden sm:inline">
              To {course.instructorName || 'Instructor'}
            </span>
          </div>
        </motion.button>
      </div>

      {/* Ask Question to Instructor Modal */}
      <AnimatePresence>
        {isAskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!submittingQuestion) setIsAskModalOpen(false);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ask-question-title"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-xl rounded-3xl bg-gradient-to-b from-[#091528] via-[#050C17] to-[#040A14] border-2 border-amber-400/60 p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.85)] space-y-5 overflow-hidden text-white"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-400/25">
                    <HelpCircle className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3
                      id="ask-question-title"
                      className="font-display text-lg sm:text-xl font-bold text-white"
                    >
                      Ask Instructor a Question
                    </h3>
                    <p className="text-xs text-slate-400">
                      Direct message to{' '}
                      <span className="text-amber-300 font-semibold">
                        {course.instructorName || 'Mustaqeem Shaikh'}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAskModalOpen(false)}
                  disabled={submittingQuestion}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Notice */}
              {questionStatusMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 ${
                    questionStatusMsg.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-400/40 text-rose-300'
                  }`}
                >
                  {questionStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{questionStatusMsg.text}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSendQuestion} className="space-y-4">
                {/* Specific Lesson Selector */}
                <div>
                  <label className="block text-xs font-semibold text-teal-300 mb-1.5">
                    Specific Lesson Reference:
                  </label>
                  <select
                    value={questionLessonId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setQuestionLessonId(val);
                      const target = courseLessons.find((l) => l.id === val);
                      if (target) {
                        setQuestionSubject(
                          `Clarification regarding Lesson ${target.positionOrder}: ${target.title}`
                        );
                      } else {
                        setQuestionSubject(`Question regarding ${course.title}`);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-teal-500/30 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {courseLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        Lesson {l.positionOrder}: {l.title} ({l.duration || 'Recording'})
                      </option>
                    ))}
                    <option value="">General Course Discussion / Inquiry</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Question Subject / Topic:
                  </label>
                  <input
                    type="text"
                    required
                    value={questionSubject}
                    onChange={(e) => setQuestionSubject(e.target.value)}
                    placeholder="e.g. Question on historical context in Lesson 2..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
                  />
                </div>

                {/* Question Details */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Question for Faculty:
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={questionBody}
                    onChange={(e) => setQuestionBody(e.target.value)}
                    placeholder="Type your question or clarification request here. The faculty member will receive this directly and reply to your student inbox..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400 placeholder:text-slate-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Instructor Info Box */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400">
                  <div className="w-8 h-8 rounded-full bg-teal-400/20 text-teal-300 flex items-center justify-center font-bold text-xs shrink-0">
                    MS
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-300 font-semibold">
                      Recipient: {course.instructorName || 'Mustaqeem Shaikh'}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Replies will appear directly in your Student Inbox
                    </span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAskModalOpen(false)}
                    disabled={submittingQuestion}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      submittingQuestion ||
                      !questionSubject.trim() ||
                      !questionBody.trim()
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 hover:scale-102 active:scale-98 transition-all shadow-lg shadow-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingQuestion ? 'Sending...' : 'Send to Instructor'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Interactive Animated PDF Reader Modal */}
      {activePdfModal && (
        <AnimatedPdfViewer
          url={activePdfModal.url}
          title={activePdfModal.title}
          onClose={() => setActivePdfModal(null)}
          variant="modal"
        />
      )}

      {/* Interactive Quiz & Knowledge Assessment Modal with Cool Transitions */}
      {activeQuizModal && (
        <QuizAssessmentModal
          quiz={activeQuizModal}
          isOpen={Boolean(activeQuizModal)}
          onClose={() => setActiveQuizModal(null)}
          currentProfile={currentProfile || null}
          onCompleted={async (attempt) => {
            setCourseAttempts((prev) => [attempt, ...prev.filter((a) => a.id !== attempt.id)]);
            await fetchCourseQuizzesAndAssignments();
          }}
          showToast={() => {}}
        />
      )}
    </motion.div>
  );
};
