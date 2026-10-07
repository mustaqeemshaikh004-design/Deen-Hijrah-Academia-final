import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { AnimatedPdfViewer } from './AnimatedPdfViewer.tsx';
import {
  Course,
  Lesson,
  Enrollment,
  CourseEvent,
  SyllabusBox,
  HomeworkSubmission,
  HomeworkGradeStatus,
  Message,
} from '../types.ts';
import { resolveThumbnailUrl, ACADEMY_ASSETS } from '../lib/assets.ts';
import { InteractiveCalendar } from './InteractiveCalendar.tsx';
import {
  convertClassTimeToRegion,
  getDetectedUserTimezone,
} from '../lib/timezone.ts';

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
  isAdmin: boolean;
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
  isAdmin,
  onBack,
  onEnroll,
  onToggleLessonComplete,
  onSubmitHomework,
  onGradeHomework,
  onSubmitFeedback,
  onUploadFile,
}) => {
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
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}`;
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
  const getLessonDownloadableResources = (lesson: Lesson): CurriculumResourceItem[] => {
    const defaultPdfUrl =
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    const rawAttachment = (lesson.attachmentUrl || '').trim();

    // Generate a real downloadable .doc study worksheet tailored to this lesson
    const docBody = [
      `${course.title.toUpperCase()} — SEMINAR STUDY WORKSHEET (.DOC)`,
      `Faculty: Ustadh ${course.instructorName}`,
      `Lesson #${lesson.positionOrder}: ${lesson.title}`,
      `Duration: ${lesson.duration}`,
      ``,
      `1. LECTURE SYNOPSIS & CORE THEMES`,
      `${lesson.description}`,
      ``,
      `2. GUIDED SEMINAR REFLECTION QUESTIONS`,
      `- Summarize the primary textual proofs and historical context discussed in "${lesson.title}".`,
      `- Note key Arabic terminology, morphological roots, or legal maxims covered in this session.`,
      `- Prepare two analytical questions for the upcoming live Zoom seminar with Ustadh ${course.instructorName}.`,
    ].join('\n');

    const generatedDocDataUri = `data:application/msword;charset=utf-8,${encodeURIComponent(
      docBody
    )}`;
    const safeSlug =
      lesson.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `lesson-${lesson.positionOrder}`;

    // If the admin pasted a JSON list of resources, parse and return them
    if (rawAttachment.startsWith('[')) {
      try {
        const parsed = JSON.parse(rawAttachment);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => {
            const type: ResourceFileType =
              item.type === 'PDF' || item.type === 'Doc' || item.type === 'Link'
                ? item.type
                : detectResourceFileType(item.url);
            return {
              id: `${lesson.id}-custom-${idx}`,
              type,
              title: item.title || `${type} Resource`,
              url: item.url || defaultPdfUrl,
            };
          });
        }
      } catch {
        // Fall through to standard resource list
      }
    }

    const customType = rawAttachment ? detectResourceFileType(rawAttachment) : 'PDF';
    const pdfUrl =
      rawAttachment && customType === 'PDF' ? rawAttachment : defaultPdfUrl;
    const docUrl =
      rawAttachment && customType === 'Doc' ? rawAttachment : generatedDocDataUri;
    const linkUrl =
      rawAttachment && customType === 'Link'
        ? rawAttachment
        : `https://quran.com/?ref=deenhijrah-lesson-${lesson.positionOrder}`;

    return [
      {
        id: `${lesson.id}-pdf`,
        type: 'PDF',
        title: `Lecture Folio & Slides.pdf`,
        url: pdfUrl,
      },
      {
        id: `${lesson.id}-doc`,
        type: 'Doc',
        title: `Seminar Study Guide.docx`,
        url: docUrl,
        downloadFilename:
          rawAttachment && customType === 'Doc' ? undefined : `${safeSlug}-study-guide.doc`,
      },
      {
        id: `${lesson.id}-link`,
        type: 'Link',
        title: `Primary Source Archive`,
        url: linkUrl,
      },
    ];
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
    if (!hwTitle.trim() || !hwContent.trim()) return;
    setSubmittingHw(true);
    try {
      await onSubmitHomework(
        course.id,
        hwLessonId ? Number(hwLessonId) : null,
        hwTitle.trim(),
        hwContent.trim(),
        hwAttachmentUrl || null
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-7xl mx-auto px-6 lg:px-10 py-8 space-y-6"
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
          <h1 className="font-display text-2xl sm:text-3xl font-bold">{course.title}</h1>

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

            {/* 2. HOMEWORK SUBMISSION & FACULTY FEEDBACK / GRADE STATUSES */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 6 Cols: Submit Homework Form */}
              <div className="lg:col-span-5 rounded-xl academy-surface p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-teal-400">
                  Submit Course Homework &amp; Assignment
                </h2>
                <p className="text-xs academy-text-secondary">
                  Submit your written assignment or upload your homework file directly to Ustadh{' '}
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
                                const uploadedUrl = await onUploadFile(file);
                                setHwAttachmentUrl(uploadedUrl);
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
                        Written Response / Notes *
                      </label>
                      <textarea
                        rows={5}
                        required
                        value={hwContent}
                        onChange={(e) => setHwContent(e.target.value)}
                        placeholder="Write your homework answer, textual analysis, or notes for Ustadh Mustaqeem Shaikh..."
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
                      View tutor comments, grade scores, and grade statuses from Ustadh{' '}
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
                                Faculty Feedback Section · Tutor: Ustadh {course.instructorName}
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
                                Awaiting tutor comment and grade evaluation from Ustadh{' '}
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
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
              {/* Left Side (70% -> 7 of 10 columns): Video Player, Lesson Details, PDF Download & Mark as Complete */}
              <div className="lg:col-span-7 space-y-6">
                {currentLesson ? (
                  <>
                    <div className="rounded-xl overflow-hidden academy-surface border border-teal-500/30 bg-black">
                      {isEmbedUrl(currentLesson.videoUrl) ? (
                        <iframe
                          src={getEmbedUrl(currentLesson.videoUrl)}
                          title={currentLesson.title}
                          className="w-full aspect-video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          key={currentLesson.videoUrl}
                          src={currentLesson.videoUrl}
                          poster={resolveThumbnailUrl(
                            currentLesson.thumbnailUrl || course.thumbnailUrl
                          )}
                          controls
                          className="w-full aspect-video bg-black object-cover"
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

              {/* Right Side (30% -> 3 of 10 columns): Interactive Curriculum & Downloadable Resources Sidebar */}
              <div className="lg:col-span-3 rounded-xl academy-surface p-5 space-y-4">
                <div className="pb-3 border-b academy-divider space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-teal-400">
                      Curriculum &amp; Resources
                    </h3>
                    <span className="text-xs font-mono-tabular academy-text-secondary">
                      {completedIds.length}/{courseLessons.length} Done
                    </span>
                  </div>
                  <p className="text-[11px] academy-text-secondary">
                    All class recordings and resources are 100% free and open for everyone to watch.
                  </p>

                  {/* File-Type Icon Legend (PDF, Doc, Link) */}
                  <div className="flex items-center gap-3 pt-0.5 text-[11px] academy-text-secondary">
                    <span className="inline-flex items-center gap-1.5 font-medium text-rose-300">
                      <ResourceFileTypeIcon type="PDF" size="sm" />
                      <span>PDF</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-sky-300">
                      <ResourceFileTypeIcon type="Doc" size="sm" />
                      <span>Doc</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-teal-300">
                      <ResourceFileTypeIcon type="Link" size="sm" />
                      <span>Link</span>
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-teal-400 transition-all duration-300"
                      style={{ width: `${enrollment?.progressPercentage || 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                  {courseLessons.map((lesson) => {
                    const isSelected = currentLesson?.id === lesson.id;
                    const isDone = completedIds.includes(lesson.id);
                    const isUnlocked = isEnrolled || lesson.isFreePreview;
                    const lessonResources = getLessonDownloadableResources(lesson);

                    return (
                      <div
                        key={lesson.id}
                        className={`rounded-lg p-3 transition-all border ${
                          isSelected
                            ? 'academy-elevated border-teal-400'
                            : 'border-transparent hover:bg-teal-500/5'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(lesson.id)}
                            title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                            className="mt-0.5 text-teal-400 hover:text-teal-300 shrink-0"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 fill-teal-400/20" />
                            ) : (
                              <Circle className="w-4 h-4 academy-text-muted" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0 space-y-2.5">
                            <button
                              type="button"
                              onClick={() => setSelectedLessonId(lesson.id)}
                              className="w-full text-left min-w-0 space-y-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src={resolveThumbnailUrl(
                                    lesson.thumbnailUrl || course.thumbnailUrl
                                  )}
                                  alt={lesson.title}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      ACADEMY_ASSETS.courseSeerah;
                                  }}
                                  className="w-12 h-8 rounded object-cover shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold line-clamp-2">
                                    {lesson.title}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] academy-text-muted font-mono-tabular">
                                <span>{lesson.duration}</span>
                                <span className="text-emerald-400 font-semibold">
                                  Free to Watch
                                </span>
                              </div>
                            </button>

                            {/* Downloadable Resource Items in Curriculum Sidebar with Specific, Distinct File-Type Icons (PDF, Doc, Link) */}
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
      {/* Fullscreen Interactive Animated PDF Reader Modal */}
      {activePdfModal && (
        <AnimatedPdfViewer
          url={activePdfModal.url}
          title={activePdfModal.title}
          onClose={() => setActivePdfModal(null)}
          variant="modal"
        />
      )}
    </motion.div>
  );
};
