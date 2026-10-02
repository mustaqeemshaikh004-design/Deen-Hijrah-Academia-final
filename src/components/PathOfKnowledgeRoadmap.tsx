import React, { useState, useMemo } from 'react';
import {
  Compass,
  CheckCircle2,
  Circle,
  Play,
  Video,
  Calendar,
  Award,
  BookOpen,
  FileText,
  ExternalLink,
  ArrowRight,
  Lock,
  Sparkles,
  Clock,
} from 'lucide-react';
import {
  Course,
  Lesson,
  Enrollment,
  CourseEvent,
  HomeworkSubmission,
  SyllabusBox,
} from '../types.ts';
import { convertClassTimeToRegion } from '../lib/timezone.ts';

export interface RoadmapModuleNode {
  index: number;
  stageCode: string;
  weekLabel: string;
  moduleTitle: string;
  topics: string;
  deliverable?: string;
  lesson: Lesson | null;
  status: 'completed' | 'current' | 'upcoming' | 'locked';
}

export interface CourseRoadmapTrack {
  course: Course;
  isEnrolled: boolean;
  progressPercentage: number;
  completedLessonIds: number[];
  nodes: RoadmapModuleNode[];
  currentNode: RoadmapModuleNode | null;
  completedNodesCount: number;
  nextSession: CourseEvent | null;
}

interface PathOfKnowledgeRoadmapProps {
  courses: Course[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  enrolledCourseIds: number[];
  events: CourseEvent[];
  homework: HomeworkSubmission[];
  selectedTimezone: string;
  isAdmin?: boolean;
  onWatchCourse: (course: Course) => void;
  onEnrollCourse: (courseId: number) => Promise<void>;
  onToggleLessonProgress?: (courseId: number, lessonId: number) => Promise<void>;
  onOpenHomeworkForCourse: (courseId: number, lessonId?: number | null) => void;
  onOpenCalendarForCourse: (courseId: number | null) => void;
}

function parseSyllabusBoxes(raw: string | undefined | null): SyllabusBox[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore malformed json
  }
  return [];
}

function parseCompletedLessonIds(raw: string | undefined | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(Number).filter((n) => !Number.isNaN(n));
    }
  } catch {
    // ignore
  }
  return [];
}

export const PathOfKnowledgeRoadmap: React.FC<PathOfKnowledgeRoadmapProps> = ({
  courses,
  lessons,
  enrollments,
  enrolledCourseIds,
  events,
  homework,
  selectedTimezone,
  isAdmin = false,
  onWatchCourse,
  onEnrollCourse,
  onToggleLessonProgress,
  onOpenHomeworkForCourse,
  onOpenCalendarForCourse,
}) => {
  // 'all' or specific course.id
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<number | 'all'>('all');
  // Track which node is inspected per courseId
  const [inspectedNodeByCourse, setInspectedNodeByCourse] = useState<Record<number, number>>({});
  const [togglingLessonId, setTogglingLessonId] = useState<number | null>(null);

  // Build structured roadmap tracks across all courses
  const courseTracks: CourseRoadmapTrack[] = useMemo(() => {
    // Sort so enrolled courses appear first, preserving curriculum order
    const sortedCourses = [...courses].sort((a, b) => {
      const aEnrolled = enrolledCourseIds.includes(a.id) ? 0 : 1;
      const bEnrolled = enrolledCourseIds.includes(b.id) ? 0 : 1;
      if (aEnrolled !== bEnrolled) return aEnrolled - bEnrolled;
      return a.id - b.id;
    });

    return sortedCourses.map((course) => {
      const isEnrolled = enrolledCourseIds.includes(course.id) || isAdmin;
      const enrollment = enrollments.find((e) => e.courseId === course.id);
      const completedLessonIds = parseCompletedLessonIds(enrollment?.completedLessonIds);
      const courseLessons = lessons
        .filter((l) => l.courseId === course.id)
        .sort((a, b) => a.positionOrder - b.positionOrder || a.id - b.id);
      const syllabusBoxes = parseSyllabusBoxes(course.syllabusBoxes);

      const totalStages = Math.max(courseLessons.length, syllabusBoxes.length, 1);
      let foundCurrent = false;

      const nodes: RoadmapModuleNode[] = Array.from({ length: totalStages }).map((_, idx) => {
        const lesson = courseLessons[idx] || null;
        const box = syllabusBoxes[idx] || null;
        const isLessonDone = lesson ? completedLessonIds.includes(lesson.id) : false;

        let status: RoadmapModuleNode['status'] = 'upcoming';
        if (!isEnrolled && !lesson?.isFreePreview) {
          status = idx === 0 ? 'current' : 'locked';
        } else if (isLessonDone) {
          status = 'completed';
        } else if (!foundCurrent) {
          status = 'current';
          foundCurrent = true;
        } else {
          status = 'upcoming';
        }

        return {
          index: idx,
          stageCode: String(idx + 1).padStart(2, '0'),
          weekLabel: box?.week || `Module ${idx + 1}`,
          moduleTitle: box?.title || lesson?.title || `Curriculum Stage ${idx + 1}`,
          topics:
            box?.topics ||
            lesson?.description ||
            'Primary text analysis, chain of transmission commentary, and seminar discussion.',
          deliverable: box?.deliverable,
          lesson,
          status,
        };
      });

      const completedNodesCount = nodes.filter((n) => n.status === 'completed').length;
      const computedProgress =
        enrollment?.progressPercentage ??
        (courseLessons.length > 0
          ? Math.round((completedLessonIds.length / courseLessons.length) * 100)
          : 0);

      const currentNode =
        nodes.find((n) => n.status === 'current') ||
        nodes[nodes.length - 1] ||
        null;

      const courseEvents = events.filter(
        (ev) => ev.courseId === course.id || (ev.eventType === 'orientation' && !ev.courseId)
      );

      return {
        course,
        isEnrolled,
        progressPercentage: computedProgress,
        completedLessonIds,
        nodes,
        currentNode,
        completedNodesCount,
        nextSession: courseEvents[0] || null,
      };
    });
  }, [courses, lessons, enrollments, enrolledCourseIds, events, isAdmin]);

  const visibleTracks = useMemo(() => {
    if (selectedCourseFilter === 'all') return courseTracks;
    return courseTracks.filter((t) => t.course.id === selectedCourseFilter);
  }, [courseTracks, selectedCourseFilter]);

  // Primary spotlight track (first enrolled track, or selected course track, or first academy course)
  const spotlightTrack = useMemo(() => {
    if (selectedCourseFilter !== 'all') {
      return courseTracks.find((t) => t.course.id === selectedCourseFilter) || courseTracks[0] || null;
    }
    return (
      courseTracks.find((t) => t.isEnrolled && t.progressPercentage < 100) ||
      courseTracks.find((t) => t.isEnrolled) ||
      courseTracks[0] ||
      null
    );
  }, [courseTracks, selectedCourseFilter]);

  // Upcoming sessions across all courses (or filtered course), sorted by date
  const upcomingRoadmapSessions = useMemo(() => {
    const filtered = events.filter((ev) => {
      if (selectedCourseFilter !== 'all') {
        return ev.courseId === selectedCourseFilter || ev.eventType === 'orientation';
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const keyA = `${a.eventDate || ''}T${a.startTime || '00:00'}`;
      const keyB = `${b.eventDate || ''}T${b.startTime || '00:00'}`;
      return keyA.localeCompare(keyB);
    });
  }, [events, selectedCourseFilter]);

  // Aggregate metrics & Milestones Reached across all courses
  const aggregateMetrics = useMemo(() => {
    const enrolledCount = enrolledCourseIds.length;
    const totalLessonsAllCourses = lessons.length;
    const totalCompletedLessons = courseTracks.reduce(
      (sum, t) => sum + t.completedLessonIds.length,
      0
    );
    const highestCourseProgress = courseTracks.reduce(
      (max, t) => Math.max(max, t.progressPercentage),
      0
    );
    const completedCoursesCount = courseTracks.filter(
      (t) => t.isEnrolled && t.progressPercentage >= 100
    ).length;
    const submittedHwCount = homework.length;
    const commendedHwCount = homework.filter(
      (h) => h.status === 'graded' || h.status === 'exemplary'
    ).length;
    const unlockedLiveSessions = events.filter(
      (ev) =>
        ev.eventType === 'orientation' ||
        (ev.courseId && enrolledCourseIds.includes(ev.courseId))
    ).length;

    const milestones = [
      {
        id: 'm1-initiation',
        order: '01',
        title: "Covenant of the Seeker (Talib al-'Ilm)",
        subtitle: 'Enroll in your first Deen Hijrah Academia course to unlock its curriculum path.',
        reached: enrolledCount >= 1,
        progressLabel: `${Math.min(enrolledCount, 1)}/1 Course Enrolled`,
        progressPercent: enrolledCount >= 1 ? 100 : 0,
        category: 'Enrollment Milestone',
        ctaLabel: 'Enroll in First Course',
        onAction: () => {
          const firstUnenrolled = courses.find((c) => !enrolledCourseIds.includes(c.id));
          if (firstUnenrolled) {
            onEnrollCourse(firstUnenrolled.id);
          }
        },
      },
      {
        id: 'm2-first-module',
        order: '02',
        title: 'First Lecture Mastered',
        subtitle: 'Complete your first recorded class module along the Path of Knowledge.',
        reached: totalCompletedLessons >= 1,
        progressLabel: `${Math.min(totalCompletedLessons, 1)}/1 Module Completed`,
        progressPercent: totalCompletedLessons >= 1 ? 100 : 0,
        category: 'Curriculum Milestone',
        ctaLabel: 'Watch & Complete Module',
        onAction: () => {
          if (spotlightTrack) {
            onWatchCourse(spotlightTrack.course);
          }
        },
      },
      {
        id: 'm3-live-majlis',
        order: '03',
        title: 'Majlis & Live Seminar Access',
        subtitle: 'Unlock live Zoom seminar links and timezone-synced sessions across courses.',
        reached: unlockedLiveSessions >= 2 || enrolledCount >= 1,
        progressLabel: `${unlockedLiveSessions} Live Sessions Unlocked`,
        progressPercent: unlockedLiveSessions >= 2 || enrolledCount >= 1 ? 100 : 50,
        category: 'Live Seminar Milestone',
        ctaLabel: 'Open Course Calendar',
        onAction: () => onOpenCalendarForCourse(null),
      },
      {
        id: 'm4-scholarly-deliverable',
        order: '04',
        title: 'Written Scholarly Reflection',
        subtitle: 'Submit your first module essay, morphological analysis, or homework reflection.',
        reached: submittedHwCount >= 1,
        progressLabel: `${Math.min(submittedHwCount, 1)}/1 Deliverable Submitted`,
        progressPercent: submittedHwCount >= 1 ? 100 : 0,
        category: 'Assessment Milestone',
        ctaLabel: 'Submit Module Homework',
        onAction: () => {
          if (spotlightTrack) {
            onOpenHomeworkForCourse(
              spotlightTrack.course.id,
              spotlightTrack.currentNode?.lesson?.id || null
            );
          }
        },
      },
      {
        id: 'm5-midpoint-istiqamah',
        order: '05',
        title: 'Mid-Curriculum Steadfastness (Istiqamah)',
        subtitle: 'Reach at least 50% completion in any course or complete 3+ total modules.',
        reached: highestCourseProgress >= 50 || totalCompletedLessons >= 3,
        progressLabel: `${Math.max(
          highestCourseProgress,
          Math.min(100, Math.round((totalCompletedLessons / 3) * 100))
        )}% Toward Midpoint`,
        progressPercent: Math.min(
          100,
          Math.max(highestCourseProgress * 2, Math.round((totalCompletedLessons / 3) * 100))
        ),
        category: 'Continuity Milestone',
        ctaLabel: 'Continue Current Module',
        onAction: () => {
          if (spotlightTrack) {
            onWatchCourse(spotlightTrack.course);
          }
        },
      },
      {
        id: 'm6-sanad-mastery',
        order: '06',
        title: 'Sanad Commendation & Course Mastery',
        subtitle:
          'Complete 100% of a course curriculum or earn a Graded / Exemplary faculty evaluation.',
        reached: completedCoursesCount >= 1 || commendedHwCount >= 1,
        progressLabel:
          completedCoursesCount >= 1
            ? `${completedCoursesCount} Course Mastered (100%)`
            : commendedHwCount >= 1
            ? `${commendedHwCount} Faculty Commendation`
            : `${highestCourseProgress}% Best Course Progress`,
        progressPercent:
          completedCoursesCount >= 1 || commendedHwCount >= 1 ? 100 : highestCourseProgress,
        category: 'Ijazah Readiness',
        ctaLabel: 'View Curriculum Track',
        onAction: () => {
          if (spotlightTrack) {
            onWatchCourse(spotlightTrack.course);
          }
        },
      },
    ];

    const reachedCount = milestones.filter((m) => m.reached).length;

    return {
      enrolledCount,
      totalLessonsAllCourses,
      totalCompletedLessons,
      highestCourseProgress,
      completedCoursesCount,
      milestones,
      reachedCount,
    };
  }, [
    enrolledCourseIds,
    lessons.length,
    courseTracks,
    homework,
    events,
    courses,
    spotlightTrack,
    onEnrollCourse,
    onWatchCourse,
    onOpenCalendarForCourse,
    onOpenHomeworkForCourse,
  ]);

  const handleQuickToggleLesson = async (courseId: number, lessonId: number) => {
    if (!onToggleLessonProgress) return;
    setTogglingLessonId(lessonId);
    try {
      await onToggleLessonProgress(courseId, lessonId);
    } finally {
      setTogglingLessonId(null);
    }
  };

  return (
    <section
      aria-label="Path of Knowledge Progress Roadmap"
      className="rounded-xl academy-surface border border-teal-500/30 p-6 lg:p-8 space-y-8"
    >
      {/* Top Section Header & Course Path Selector */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-6 border-b academy-divider">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-teal-400 font-medium">
            <Compass className="w-4 h-4 shrink-0" />
            <span>Path of Knowledge (Tariq al-&lsquo;Ilm)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {aggregateMetrics.reachedCount}/{aggregateMetrics.milestones.length} Milestones Reached
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {aggregateMetrics.totalCompletedLessons}/{aggregateMetrics.totalLessonsAllCourses}{' '}
              Total Modules Completed
            </span>
          </div>
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-balance">
            Visual Path of Knowledge &amp; Curriculum Roadmap
          </h2>
          <p className="text-xs sm:text-sm academy-text-secondary max-w-3xl">
            Navigate your active module, upcoming timezone-synced live seminars, and scholarly
            milestones across every Deen Hijrah Academia course. Click any stage node below to
            inspect its syllabus topics, mark lectures complete, or launch class recordings.
          </p>
        </div>

        {/* Interactive Course Filter Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg academy-elevated shrink-0">
          <button
            type="button"
            onClick={() => setSelectedCourseFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              selectedCourseFilter === 'all'
                ? 'bg-teal-400 text-slate-950 font-semibold'
                : 'academy-text-secondary hover:text-teal-300'
            }`}
          >
            All Courses ({courseTracks.length})
          </button>
          {courseTracks.map((track, idx) => (
            <button
              key={track.course.id}
              type="button"
              onClick={() => setSelectedCourseFilter(track.course.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap font-mono-tabular ${
                selectedCourseFilter === track.course.id
                  ? 'bg-teal-400 text-slate-950 font-semibold'
                  : 'academy-text-secondary hover:text-teal-300'
              }`}
            >
              0{idx + 1}. {track.course.category.split(' ')[0]} ({track.progressPercentage}%)
            </button>
          ))}
        </div>
      </div>

      {/* PILLAR 1A: CURRENT ACTIVE MODULE SPOTLIGHT + UPCOMING NEXT SESSION */}
      {spotlightTrack && spotlightTrack.currentNode && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 7 Cols: Active Module Spotlight */}
          <div className="lg:col-span-7 rounded-xl academy-elevated p-5 sm:p-6 border border-teal-500/35 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 text-teal-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Current Active Module</span>
                  <span aria-hidden="true">·</span>
                  <span>{spotlightTrack.course.title}</span>
                </div>
                <span className="font-mono-tabular text-emerald-400 font-semibold">
                  {spotlightTrack.isEnrolled
                    ? `● ENROLLED · ${spotlightTrack.progressPercentage}% COMPLETE`
                    : '○ ORIENTATION TRACK'}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-mono-tabular academy-text-secondary">
                  Stage {spotlightTrack.currentNode.stageCode} ·{' '}
                  {spotlightTrack.currentNode.weekLabel} · Instructor: Ustadh{' '}
                  {spotlightTrack.course.instructorName}
                </div>
                <h3 className="font-display text-xl font-bold text-white">
                  {spotlightTrack.currentNode.moduleTitle}
                </h3>
                <p className="text-xs sm:text-sm academy-text-secondary leading-relaxed">
                  {spotlightTrack.currentNode.topics}
                </p>
              </div>

              {spotlightTrack.currentNode.deliverable && (
                <div className="pt-1 text-xs academy-text-secondary">
                  <strong className="text-teal-300">Module Deliverable:</strong>{' '}
                  {spotlightTrack.currentNode.deliverable}
                </div>
              )}

              {spotlightTrack.currentNode.lesson && (
                <div className="pt-2 border-t academy-divider flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
                  <span className="text-teal-300 truncate">
                    Lecture Recording: {spotlightTrack.currentNode.lesson.title}
                  </span>
                  <span className="academy-text-secondary shrink-0">
                    Duration: {spotlightTrack.currentNode.lesson.duration}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onWatchCourse(spotlightTrack.course)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  {spotlightTrack.isEnrolled
                    ? 'Resume Current Module Recording'
                    : 'Watch Orientation Recording'}
                </span>
              </button>

              {spotlightTrack.isEnrolled &&
              spotlightTrack.currentNode.lesson &&
              onToggleLessonProgress ? (
                <button
                  type="button"
                  disabled={togglingLessonId === spotlightTrack.currentNode.lesson.id}
                  onClick={() =>
                    handleQuickToggleLesson(
                      spotlightTrack.course.id,
                      spotlightTrack.currentNode!.lesson!.id
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold academy-surface border border-teal-500/35 text-teal-300 hover:border-teal-400 transition-colors whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {togglingLessonId === spotlightTrack.currentNode.lesson.id
                      ? 'Updating...'
                      : spotlightTrack.currentNode.status === 'completed'
                      ? 'Completed (Click to Undo)'
                      : 'Mark Current Module Complete'}
                  </span>
                </button>
              ) : !spotlightTrack.isEnrolled ? (
                <button
                  type="button"
                  onClick={() => onEnrollCourse(spotlightTrack.course.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold academy-surface border border-teal-500/35 text-teal-300 hover:border-teal-400 transition-colors whitespace-nowrap"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Enroll to Unlock Full Course Path</span>
                </button>
              ) : null}

              {spotlightTrack.isEnrolled && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenHomeworkForCourse(
                      spotlightTrack.course.id,
                      spotlightTrack.currentNode?.lesson?.id || null
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium academy-text-secondary hover:text-teal-300 transition-colors whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Submit Deliverable</span>
                </button>
              )}
            </div>
          </div>

          {/* Right 5 Cols: Upcoming Live Sessions Timeline Along the Path */}
          <div className="lg:col-span-5 rounded-xl academy-elevated p-5 sm:p-6 border border-teal-500/25 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Upcoming Live Sessions Along Your Path</span>
                </div>
                <span className="text-[11px] font-mono-tabular academy-text-muted">
                  {selectedTimezone}
                </span>
              </div>

              {upcomingRoadmapSessions.length === 0 ? (
                <p className="text-xs academy-text-secondary py-6 text-center">
                  No upcoming live sessions found for this filter.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingRoadmapSessions.slice(0, 3).map((session, sIdx) => {
                    const sessionCourse = courses.find((c) => c.id === session.courseId);
                    const isSessionUnlocked =
                      session.eventType === 'orientation' ||
                      !session.courseId ||
                      enrolledCourseIds.includes(session.courseId) ||
                      isAdmin;
                    const converted = convertClassTimeToRegion(
                      session.eventDate,
                      session.startTime,
                      session.sourceTimezone || sessionCourse?.classTimezone || 'America/New_York',
                      selectedTimezone
                    );

                    return (
                      <div
                        key={session.id}
                        className="relative pl-4 border-l-2 border-teal-500/40 space-y-1"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono-tabular">
                          <span className="text-teal-300 font-semibold">
                            0{sIdx + 1}. {converted.formattedLocalDate} ·{' '}
                            {converted.formattedLocalTime}
                          </span>
                          <span className="academy-text-muted">{session.duration}</span>
                        </div>
                        <div className="text-xs font-semibold text-white truncate">
                          {session.title}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] academy-text-secondary">
                          <span className="truncate">
                            {sessionCourse?.title || 'Public Academy Orientation'} · Ustadh{' '}
                            {session.instructorName}
                          </span>
                          {isSessionUnlocked && session.zoomJoinUrl ? (
                            <a
                              href={session.zoomJoinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-teal-400 font-semibold hover:underline shrink-0"
                            >
                              <Video className="w-3 h-3" />
                              <span>Join Live</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : session.courseId ? (
                            <button
                              type="button"
                              onClick={() => onEnrollCourse(session.courseId!)}
                              className="text-teal-400 hover:underline font-medium shrink-0"
                            >
                              Enroll for Zoom Link
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t academy-divider flex items-center justify-between gap-2">
              <span className="text-[11px] academy-text-secondary">
                All seminar times auto-synced to your local timezone
              </span>
              <button
                type="button"
                onClick={() =>
                  onOpenCalendarForCourse(
                    selectedCourseFilter === 'all' ? null : selectedCourseFilter
                  )
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:underline whitespace-nowrap"
              >
                <span>Open Full Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 1B: VISUAL NODE-BY-NODE CURRICULUM ROADMAP ACROSS COURSES */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold">
              Course-by-Course Module Progression Pathways
            </h3>
            <p className="text-xs academy-text-secondary">
              Select any stage node along a course track to inspect its weekly syllabus topics,
              deliverables, and lecture status.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono-tabular academy-text-secondary">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completed Module</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Current Active Module</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 academy-text-muted" />
              <span>Upcoming / Locked</span>
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {visibleTracks.map((track) => {
            const inspectedIdx =
              inspectedNodeByCourse[track.course.id] ??
              track.currentNode?.index ??
              0;
            const inspectedNode =
              track.nodes[inspectedIdx] || track.currentNode || track.nodes[0];

            const convertedRegularClass = convertClassTimeToRegion(
              track.course.launchDate,
              track.course.classStartTime || '14:00',
              track.course.classTimezone || 'America/New_York',
              selectedTimezone
            );

            return (
              <div
                key={track.course.id}
                className="rounded-xl academy-elevated p-5 sm:p-6 border border-teal-500/25 space-y-5"
              >
                {/* Course Track Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b academy-divider">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-teal-400 font-semibold">{track.course.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="academy-text-secondary">
                        Ustadh {track.course.instructorName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular academy-text-secondary">
                        {track.course.classDays || 'Sat & Wed'} at{' '}
                        {convertedRegularClass.formattedLocalTime}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-mono-tabular font-semibold ${
                          track.isEnrolled ? 'text-emerald-400' : 'academy-text-muted'
                        }`}
                      >
                        {track.isEnrolled ? '● ENROLLED TRACK' : '○ NOT YET ENROLLED'}
                      </span>
                    </div>
                    <h4 className="font-display text-lg font-bold text-white">
                      {track.course.title}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="text-right font-mono-tabular">
                      <div className="text-xs font-semibold text-emerald-400">
                        {track.progressPercentage}% Complete
                      </div>
                      <div className="text-[11px] academy-text-secondary">
                        {track.completedNodesCount}/{track.nodes.length} Modules Mastered
                      </div>
                    </div>

                    {track.isEnrolled ? (
                      <button
                        type="button"
                        onClick={() => onWatchCourse(track.course)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Open Classroom</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEnrollCourse(track.course.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Enroll to Begin Path</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Connected Visual Roadmap Nodes Rail */}
                <div className="space-y-3">
                  {/* Horizontal Progress Connector Bar */}
                  <div className="relative h-2 w-full rounded-full bg-slate-800/90 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.max(6, track.progressPercentage)}%` }}
                    />
                  </div>

                  {/* Responsive Node Cards Along the Path */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    {track.nodes.map((node) => {
                      const isInspected = inspectedNode?.index === node.index;
                      const isCompleted = node.status === 'completed';
                      const isCurrent = node.status === 'current';
                      const isLocked = node.status === 'locked';

                      return (
                        <button
                          key={node.stageCode}
                          type="button"
                          onClick={() =>
                            setInspectedNodeByCourse((prev) => ({
                              ...prev,
                              [track.course.id]: node.index,
                            }))
                          }
                          className={`text-left p-3.5 rounded-lg transition-all flex flex-col justify-between gap-2.5 border ${
                            isInspected
                              ? 'academy-surface border-teal-400 shadow-sm'
                              : isCompleted
                              ? 'academy-surface border-emerald-500/35 hover:border-emerald-400/60'
                              : isCurrent
                              ? 'academy-surface border-teal-500/45 hover:border-teal-400'
                              : 'academy-surface border-slate-800 hover:border-teal-500/30 opacity-85'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular">
                              <span
                                className={`font-semibold ${
                                  isCompleted
                                    ? 'text-emerald-400'
                                    : isCurrent
                                    ? 'text-teal-300'
                                    : 'academy-text-muted'
                                }`}
                              >
                                {node.stageCode} · {node.weekLabel}
                              </span>
                              <span className="shrink-0">
                                {isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : isCurrent ? (
                                  <Sparkles className="w-4 h-4 text-teal-400" />
                                ) : isLocked ? (
                                  <Lock className="w-3.5 h-3.5 academy-text-muted" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 academy-text-muted" />
                                )}
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-white line-clamp-2">
                              {node.moduleTitle}
                            </div>
                          </div>

                          <div className="pt-2 border-t academy-divider flex items-center justify-between gap-2 text-[10px] font-mono-tabular">
                            <span
                              className={
                                isCompleted
                                  ? 'text-emerald-300 font-semibold'
                                  : isCurrent
                                  ? 'text-teal-300 font-semibold'
                                  : 'academy-text-muted'
                              }
                            >
                              {isCompleted
                                ? '● COMPLETED'
                                : isCurrent
                                ? '◆ CURRENT MODULE'
                                : isLocked
                                ? '🔒 LOCKED'
                                : '○ UPCOMING'}
                            </span>
                            {node.lesson && (
                              <span className="academy-text-muted">{node.lesson.duration}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Stage Node Inspector Drawer */}
                {inspectedNode && (
                  <div className="p-4 rounded-lg academy-surface border border-teal-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
                        <span className="text-teal-400 font-semibold">
                          Selected Stage {inspectedNode.stageCode} ({inspectedNode.weekLabel})
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="academy-text-secondary">
                          {inspectedNode.status === 'completed'
                            ? 'Status: Completed'
                            : inspectedNode.status === 'current'
                            ? 'Status: Current Active Module'
                            : inspectedNode.status === 'locked'
                            ? 'Status: Enroll to Unlock'
                            : 'Status: Upcoming Stage'}
                        </span>
                        {inspectedNode.deliverable && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-teal-300">
                              Deliverable: {inspectedNode.deliverable}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-sm font-bold text-white">
                        {inspectedNode.moduleTitle}
                        {inspectedNode.lesson &&
                        inspectedNode.lesson.title !== inspectedNode.moduleTitle
                          ? ` — ${inspectedNode.lesson.title}`
                          : ''}
                      </div>
                      <p className="text-xs academy-text-secondary">{inspectedNode.topics}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {track.isEnrolled && inspectedNode.lesson && onToggleLessonProgress && (
                        <button
                          type="button"
                          disabled={togglingLessonId === inspectedNode.lesson.id}
                          onClick={() =>
                            handleQuickToggleLesson(track.course.id, inspectedNode.lesson!.id)
                          }
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                            inspectedNode.status === 'completed'
                              ? 'academy-elevated text-emerald-300 hover:border-emerald-400'
                              : 'bg-teal-400 text-slate-950 hover:bg-teal-300'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {togglingLessonId === inspectedNode.lesson.id
                              ? 'Saving...'
                              : inspectedNode.status === 'completed'
                              ? 'Completed · Mark Incomplete'
                              : 'Mark Stage Complete'}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onWatchCourse(track.course)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold academy-elevated hover:border-teal-400 text-teal-300 transition-colors whitespace-nowrap"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>
                          {track.isEnrolled || inspectedNode.lesson?.isFreePreview
                            ? 'Watch Lecture'
                            : 'Preview Orientation'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PILLAR 3: MILESTONES REACHED ACROSS ALL COURSES */}
      <div className="pt-4 border-t academy-divider space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
              <Award className="w-4 h-4 shrink-0" />
              <span>Scholarly Sanad &amp; Curriculum Milestones</span>
            </div>
            <h3 className="font-display text-xl font-bold mt-0.5">
              Milestones Reached Across All Courses ({aggregateMetrics.reachedCount}/
              {aggregateMetrics.milestones.length})
            </h3>
          </div>
          <div className="text-xs font-mono-tabular academy-text-secondary">
            Milestone Completion:{' '}
            <strong className="text-emerald-400">
              {Math.round(
                (aggregateMetrics.reachedCount / aggregateMetrics.milestones.length) * 100
              )}
              %
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aggregateMetrics.milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`rounded-xl p-5 flex flex-col justify-between gap-4 border transition-colors ${
                milestone.reached
                  ? 'academy-elevated border-emerald-500/40'
                  : 'academy-elevated border-teal-500/20'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular">
                  <span className="academy-text-secondary">
                    {milestone.order}. {milestone.category}
                  </span>
                  <span
                    className={`flex items-center gap-1 font-semibold ${
                      milestone.reached ? 'text-emerald-400' : 'text-teal-300'
                    }`}
                  >
                    {milestone.reached ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>REACHED</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5" />
                        <span>IN PROGRESS</span>
                      </>
                    )}
                  </span>
                </div>

                <h4 className="font-display text-base font-bold text-white">{milestone.title}</h4>
                <p className="text-xs academy-text-secondary leading-relaxed">
                  {milestone.subtitle}
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t academy-divider">
                <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                  <span className="academy-text-secondary">{milestone.progressLabel}</span>
                  <span
                    className={
                      milestone.reached ? 'text-emerald-400 font-semibold' : 'text-teal-300'
                    }
                  >
                    {milestone.progressPercent}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      milestone.reached ? 'bg-emerald-400' : 'bg-teal-400'
                    }`}
                    style={{ width: `${Math.max(8, milestone.progressPercent)}%` }}
                  />
                </div>

                {!milestone.reached && (
                  <button
                    type="button"
                    onClick={milestone.onAction}
                    className="w-full mt-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold academy-surface border border-teal-500/30 text-teal-300 hover:border-teal-400 transition-colors whitespace-nowrap"
                  >
                    <span>{milestone.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
