import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Film,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  RotateCcw,
  ExternalLink,
  Download,
  BookOpen,
  Sparkles,
  MessageSquare,
  Award,
  Layers,
  ChevronRight,
  Eye,
  FileText,
} from 'lucide-react';
import { Course, Lesson, Enrollment, LessonComment, Profile } from '../types.ts';
import { resolveThumbnailUrl } from '../lib/assets.ts';
import { resolvePlayableVideoUrl } from '../lib/mediaStorage.ts';
import { LessonThreadedComments } from './LessonThreadedComments.tsx';
import { ClassSessionSurveyWidget } from './ClassSessionSurveyWidget.tsx';
import { smartApiFetch } from '../lib/fallbackStore.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ClassRecordingsVaultProps {
  courses: Course[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  initialCourseId?: number | null;
  initialLessonId?: number | null;
  currentProfile?: Profile | null;
  onToggleLessonProgress?: (courseId: number, lessonId: number) => Promise<void>;
  onAskFaculty?: (subject: string) => void;
  onOpenCourseCatalog?: () => void;
  onSubmitSurvey?: (
    rating: 'satisfactory' | 'unsatisfactory',
    comment: string,
    courseId: number,
    lessonId?: number
  ) => Promise<void>;
}

export const ClassRecordingsVault: React.FC<ClassRecordingsVaultProps> = ({
  courses,
  lessons,
  enrollments,
  initialCourseId,
  initialLessonId,
  currentProfile,
  onToggleLessonProgress,
  onAskFaculty,
  onOpenCourseCatalog,
  onSubmitSurvey,
}) => {
  const { authFetch } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<number | 'all'>(
    initialCourseId || 'all'
  );
  const [selectedVisibilityFilter, setSelectedVisibilityFilter] = useState<'all' | 'free' | 'enrolled'>('all');
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [videoHasError, setVideoHasError] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');

  const [lessonComments, setLessonComments] = useState<LessonComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const enrolledCourseIds = useMemo(
    () => enrollments.map((e) => e.courseId),
    [enrollments]
  );

  // Completed lesson IDs across enrollments
  const completedLessonIds = useMemo(() => {
    const ids = new Set<number>();
    enrollments.forEach((e) => {
      try {
        if (e.completedLessonIds) {
          const parsed = JSON.parse(e.completedLessonIds);
          if (Array.isArray(parsed)) {
            parsed.forEach((id) => ids.add(Number(id)));
          }
        }
      } catch {
        // ignore
      }
    });
    return ids;
  }, [enrollments]);

  // Filter lessons according to search, course filter, and visibility
  const filteredLessons = useMemo(() => {
    return lessons
      .filter((lesson) => {
        const parentCourse = courses.find((c) => c.id === lesson.courseId);
        if (!parentCourse) return false;

        // Course filter
        if (selectedCourseFilter !== 'all' && lesson.courseId !== selectedCourseFilter) {
          return false;
        }

        // Visibility filter
        if (selectedVisibilityFilter === 'free' && !lesson.isFreePreview) {
          return false;
        }
        if (selectedVisibilityFilter === 'enrolled' && !enrolledCourseIds.includes(lesson.courseId)) {
          return false;
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = lesson.title.toLowerCase().includes(q);
          const matchDesc = (lesson.description || '').toLowerCase().includes(q);
          const matchCourse = parentCourse.title.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchCourse) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.courseId !== b.courseId) return a.courseId - b.courseId;
        return a.positionOrder - b.positionOrder || a.id - b.id;
      });
  }, [lessons, courses, selectedCourseFilter, selectedVisibilityFilter, searchQuery, enrolledCourseIds]);

  // Active Selected Lesson
  const [activeLessonId, setActiveLessonId] = useState<number | null>(() => {
    if (initialLessonId && lessons.some((l) => l.id === initialLessonId)) {
      return initialLessonId;
    }
    return filteredLessons[0]?.id || lessons[0]?.id || null;
  });

  const activeLesson = useMemo(() => {
    return lessons.find((l) => l.id === activeLessonId) || filteredLessons[0] || lessons[0] || null;
  }, [lessons, activeLessonId, filteredLessons]);

  const activeCourse = useMemo(() => {
    if (!activeLesson) return null;
    return courses.find((c) => c.id === activeLesson.courseId) || null;
  }, [courses, activeLesson]);

  const isCurrentLessonCompleted = activeLesson
    ? completedLessonIds.has(activeLesson.id)
    : false;

  const isEnrolledInActiveCourse = activeCourse
    ? enrolledCourseIds.includes(activeCourse.id)
    : false;

  // Resolve video url (handles indexeddb://, uploads, external)
  useEffect(() => {
    setVideoHasError(false);
    if (!activeLesson?.videoUrl) {
      setResolvedVideoUrl('');
      return;
    }
    let isCancelled = false;
    resolvePlayableVideoUrl(activeLesson.videoUrl).then((url) => {
      if (!isCancelled) {
        setResolvedVideoUrl(url);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [activeLesson?.videoUrl]);

  // Fetch comments for active recording
  useEffect(() => {
    if (!activeLesson?.id) {
      setLessonComments([]);
      return;
    }
    let isCancelled = false;
    setLoadingComments(true);
    const fetchFn = authFetch || smartApiFetch;
    fetchFn(`/api/comments?lessonId=${activeLesson.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!isCancelled) {
          setLessonComments(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!isCancelled) setLessonComments([]);
      })
      .finally(() => {
        if (!isCancelled) setLoadingComments(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeLesson?.id, authFetch]);

  const handlePostComment = async (
    lessonId: number,
    content: string,
    parentId?: number | null
  ) => {
    try {
      const fetchFn = authFetch || smartApiFetch;
      const res = await fetchFn('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          content,
          parentId: parentId || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setLessonComments((prev) => [...prev, created]);
      } else {
        const fallbackComment: LessonComment = {
          id: Date.now(),
          courseId: activeLesson?.courseId || 1,
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
        courseId: activeLesson?.courseId || 1,
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

  const isEmbed = (url?: string) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  const getEmbedSrc = (url: string) => {
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      const id = ytMatch[1];
      return `https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1&rel=0`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }
    return url;
  };

  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoElementRef.current) {
      videoElementRef.current.playbackRate = speed;
    }
  };

  return (
    <div className="w-full max-w-[1920px] 2xl:max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 md:py-8 space-y-6 animate-fade-in">
      {/* Top Header / Sub-Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b academy-divider">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30 mb-1.5">
            <Film className="w-3.5 h-3.5" />
            <span>Class Recordings Vault &amp; Cinema Player</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Sacred Lecture Recordings
          </h1>
          <p className="text-xs academy-text-secondary mt-0.5">
            Click any recording on the sidebar to watch on the high-definition cinema screen on the right.
          </p>
        </div>

        {/* Global Action Badges */}
        <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            Total Recordings: <strong className="text-teal-400">{lessons.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            Completed: <strong className="text-emerald-400">{completedLessonIds.size}</strong>
          </span>
          {onOpenCourseCatalog && (
            <button
              type="button"
              onClick={onOpenCourseCatalog}
              className="px-3.5 py-1.5 rounded-xl bg-teal-400 text-slate-950 font-semibold hover:bg-teal-300 transition-colors shadow-sm"
            >
              Browse Catalog
            </button>
          )}
        </div>
      </div>

      {/* Master-Detail Layout: Left Side Playlist + Right Side Big Screen Player */}
      <div
        className={`grid grid-cols-1 ${
          isTheaterMode ? 'lg:grid-cols-1' : 'lg:grid-cols-12'
        } gap-6 items-start`}
      >
        {/* ======================================================== */}
        {/* LEFT SIDE (Playlist & Filter Sidebar): 4 of 12 columns    */}
        {/* ======================================================== */}
        <div
          className={`${
            isTheaterMode
              ? 'order-2 w-full mt-6'
              : 'order-2 lg:order-1 lg:col-span-4 xl:col-span-4'
          } rounded-2xl academy-surface border border-teal-500/25 p-4 sm:p-5 space-y-4 shadow-xl sticky top-24 max-h-[calc(100vh-120px)] flex flex-col`}
        >
          {/* Search & Filter Header */}
          <div className="space-y-3 pb-3 border-b academy-divider shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-teal-400 flex items-center gap-2">
                <Film className="w-4 h-4 text-teal-300" />
                <span>Recordings Playlist ({filteredLessons.length})</span>
              </h3>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lectures, topics, instructors..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={selectedCourseFilter === 'all' ? 'all' : String(selectedCourseFilter)}
                onChange={(e) =>
                  setSelectedCourseFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="px-2 py-1.5 text-[11px] rounded-lg academy-elevated focus:outline-none focus:border-teal-400 truncate"
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              <select
                value={selectedVisibilityFilter}
                onChange={(e) => setSelectedVisibilityFilter(e.target.value as any)}
                className="px-2 py-1.5 text-[11px] rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
              >
                <option value="all">All Visibility</option>
                <option value="free">Orientations Only</option>
                <option value="enrolled">My Enrolled Only</option>
              </select>
            </div>
          </div>

          {/* Scrollable Recording Items List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {filteredLessons.length === 0 ? (
              <div className="p-6 text-center text-xs academy-text-secondary space-y-2">
                <Film className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No class recordings matched your search filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCourseFilter('all');
                    setSelectedVisibilityFilter('all');
                  }}
                  className="px-3 py-1 rounded-md text-[11px] bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 font-semibold"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              filteredLessons.map((lesson) => {
                const isSelected = activeLesson?.id === lesson.id;
                const isDone = completedLessonIds.has(lesson.id);
                const parentCourse = courses.find((c) => c.id === lesson.courseId);
                const isEnrolled = enrolledCourseIds.includes(lesson.courseId);

                return (
                  <div
                    key={lesson.id}
                    onClick={() => {
                      setActiveLessonId(lesson.id);
                      setVideoHasError(false);
                    }}
                    className={`group relative p-2.5 rounded-xl cursor-pointer transition-all duration-200 border flex items-center gap-3 ${
                      isSelected
                        ? 'bg-teal-500/15 border-teal-400/60 shadow-md ring-1 ring-teal-400/40'
                        : 'bg-black/25 border-white/5 hover:bg-white/5 hover:border-teal-500/30'
                    }`}
                  >
                    {/* Thumbnail with Duration Badge */}
                    <div className="relative w-24 h-16 sm:w-28 sm:h-18 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/10">
                      <img
                        src={resolveThumbnailUrl(
                          lesson.thumbnailUrl || parentCourse?.thumbnailUrl
                        )}
                        alt={lesson.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/35 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                            isSelected
                              ? 'bg-teal-400 text-slate-950 scale-110 shadow-lg'
                              : 'bg-black/60 text-white group-hover:scale-110'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Duration Tag */}
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[9px] font-mono-tabular text-teal-300">
                        {lesson.duration || '45m'}
                      </span>
                    </div>

                    {/* Meta Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono-tabular text-teal-400 font-bold uppercase truncate max-w-[130px]">
                          {parentCourse?.title || 'Course'}
                        </span>
                        {lesson.isFreePreview ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Orientation
                          </span>
                        ) : !isEnrolled ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300">
                            Enrolled
                          </span>
                        ) : null}
                      </div>

                      <h4
                        className={`text-xs font-bold leading-snug line-clamp-2 transition-colors ${
                          isSelected ? 'text-white' : 'text-slate-300 group-hover:text-teal-200'
                        }`}
                      >
                        Lesson #{lesson.positionOrder}: {lesson.title}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] academy-text-muted">
                        <span>{parentCourse?.instructorName}</span>
                        {isDone && (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Done</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT SIDE (Big Screen Cinema Stage): 8 of 12 columns   */}
        {/* ======================================================== */}
        <div
          className={`${
            isTheaterMode
              ? 'order-1 w-full'
              : 'order-1 lg:order-2 lg:col-span-8 xl:col-span-8'
          } space-y-6`}
        >
          {activeLesson ? (
            <div className="space-y-5">
              {/* Cinema Player Stage */}
              <div className="relative rounded-2xl overflow-hidden academy-surface border border-teal-500/35 bg-black shadow-2xl">
                {/* Scale Bigger / Theater Mode Floating Toggle Button */}
                <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTheaterMode(!isTheaterMode)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950/85 hover:bg-slate-900 text-teal-300 border border-teal-500/40 backdrop-blur-md transition-all flex items-center gap-1.5 shadow-xl cursor-pointer"
                    title={isTheaterMode ? 'Standard Layout' : 'Scale Bigger (Theater Mode)'}
                  >
                    {isTheaterMode ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline font-mono-tabular">
                      {isTheaterMode ? 'Standard View' : 'Scale Bigger (Theater)'}
                    </span>
                  </button>
                </div>

                {/* Player Frame or Embed */}
                {videoHasError ? (
                  <div className="w-full aspect-video flex flex-col items-center justify-center p-8 text-center bg-slate-950 space-y-3">
                    <p className="text-sm text-slate-300">
                      Recording stream momentarily unavailable or network interrupted.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setVideoHasError(false)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry Playback</span>
                      </button>
                      {activeLesson.videoUrl && (
                        <a
                          href={activeLesson.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium academy-elevated hover:border-teal-400 text-teal-300 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Direct Link</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : isEmbed(activeLesson.videoUrl) ? (
                  <iframe
                    src={getEmbedSrc(activeLesson.videoUrl)}
                    title={activeLesson.title}
                    className="w-full aspect-video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                    <video
                      ref={videoElementRef}
                      key={resolvedVideoUrl || activeLesson.id}
                      src={resolvedVideoUrl || activeLesson.videoUrl}
                      controls
                      autoPlay
                      preload="metadata"
                      playsInline
                      onError={() => setVideoHasError(true)}
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>
                )}

                {/* Player Speed & HD Bar */}
                <div className="bg-slate-950/90 border-t border-teal-500/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-tabular">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] academy-text-muted">SPEED:</span>
                    {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSpeedChange(s)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                          playbackSpeed === s
                            ? 'bg-teal-400 text-slate-950'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold">
                      1080p HD Ultra-Clear
                    </span>
                    <span className="academy-text-muted text-[11px]">
                      Duration: {activeLesson.duration || '45m'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lesson Details & Actions Bar */}
              <div className="p-6 rounded-2xl academy-surface border border-teal-500/25 space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b academy-divider">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-teal-400 font-mono-tabular uppercase">
                        {activeCourse?.title}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-400">
                        Lesson #{activeLesson.positionOrder}
                      </span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-white">
                      {activeLesson.title}
                    </h2>
                    <p className="text-xs text-amber-300 font-medium mt-0.5">
                      Taught by {activeCourse?.instructorName || 'Mustaqeem Shaikh'}
                    </p>
                  </div>

                  {/* Actions: Mark Completed & Ask Instructor */}
                  <div className="flex flex-wrap items-center gap-3">
                    {onToggleLessonProgress && (
                      <button
                        type="button"
                        onClick={() =>
                          onToggleLessonProgress(activeLesson.courseId, activeLesson.id)
                        }
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                          isCurrentLessonCompleted
                            ? 'bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400'
                            : 'bg-teal-400 text-slate-950 hover:bg-teal-300'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {isCurrentLessonCompleted ? 'Completed ✓' : 'Mark Lesson Complete'}
                        </span>
                      </button>
                    )}

                    {onAskFaculty && (
                      <button
                        type="button"
                        onClick={() => {
                          onAskFaculty(
                            `Question regarding Lesson #${activeLesson.positionOrder}: ${activeLesson.title}`
                          );
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 text-teal-300 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Ask Instructor</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Lesson Description & Academic Notes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono-tabular">
                    Lecture Synopsis &amp; Key Themes
                  </h4>
                  <p className="text-xs academy-text-secondary leading-relaxed whitespace-pre-line">
                    {activeLesson.description ||
                      'In this session, the instructor delves into the textual evidence, classical commentaries, and spiritual applications of the topic.'}
                  </p>
                </div>

                {/* Downloadable Attachment (if provided) */}
                {activeLesson.attachmentUrl && (
                  <div className="pt-2 flex items-center gap-3">
                    <a
                      href={activeLesson.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 border border-rose-500/35 text-rose-300 hover:bg-rose-500/25 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Lesson Study Worksheet / PDF</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Quick Class & Teacher Feedback Survey for this Session */}
              {activeCourse && (
                <ClassSessionSurveyWidget
                  courseId={activeCourse.id}
                  courseTitle={activeCourse.title}
                  lessonId={activeLesson.id}
                  lessonTitle={activeLesson.title}
                  instructorName={activeCourse.instructorName}
                  currentProfile={currentProfile || null}
                  onSubmitSurvey={async (rating, comment) => {
                    if (onSubmitSurvey) {
                      await onSubmitSurvey(rating, comment, activeCourse.id, activeLesson.id);
                    } else {
                      const fetchFn = authFetch || smartApiFetch;
                      await fetchFn('/api/class-surveys', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          courseId: activeCourse.id,
                          lessonId: activeLesson.id,
                          instructorId: activeCourse.instructorId || null,
                          rating,
                          comment,
                        }),
                      });
                    }
                  }}
                />
              )}

              {/* Threaded Discussion and Student-Instructor Q&A */}
              <LessonThreadedComments
                lessonId={activeLesson.id}
                lessonTitle={activeLesson.title}
                courseId={activeLesson.courseId}
                comments={lessonComments}
                currentProfile={currentProfile || null}
                onPostComment={handlePostComment}
              />
            </div>
          ) : (
            <div className="p-12 text-center academy-surface rounded-2xl border border-slate-800 space-y-3">
              <Film className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-display text-lg font-bold text-white">No Recording Selected</h3>
              <p className="text-xs academy-text-secondary max-w-sm mx-auto">
                Please select a recording from the sidebar playlist to load the cinema screen.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
