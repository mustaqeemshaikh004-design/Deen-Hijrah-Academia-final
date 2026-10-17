import React, { useState, useRef, useMemo } from 'react';
import {
  Play,
  Sparkles,
  Users,
  Globe,
  BookOpen,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
} from 'lucide-react';
import { Course, Lesson, Enrollment, parseCourseTags } from '../types.ts';
import { resolveThumbnailUrl, ACADEMY_ASSETS } from '../lib/assets.ts';
import { convertClassTimeToRegion, getDetectedUserTimezone } from '../lib/timezone.ts';

interface InfiniteCourseMarqueeProps {
  courses: Course[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  enrolledCourseIds: number[];
  onWatchCourse: (course: Course) => void;
  onEnrollCourse: (course: Course) => void;
  onViewCourseDetails: (course: Course) => void;
}

export const InfiniteCourseMarquee: React.FC<InfiniteCourseMarqueeProps> = ({
  courses,
  lessons,
  enrollments,
  enrolledCourseIds,
  onWatchCourse,
  onEnrollCourse,
  onViewCourseDetails,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'coming_soon' | 'live'>('all');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const detectedTz = useMemo(() => getDetectedUserTimezone(), []);

  // Filter courses that are published or coming soon or open for enrollment
  const visibleCourses = useMemo(() => {
    let list = courses.filter((c) => {
      const isComingSoon = c.enrollmentStatus === 'coming_soon' || (c as any).status === 'coming_soon';
      const isOpenEnrollment = c.enrollmentStatus === 'open' || !c.enrollmentStatus;
      const isLive = c.enrollmentStatus === 'live';
      return c.status === 'published' || isComingSoon || isOpenEnrollment || isLive;
    });
    if (statusFilter === 'open') {
      list = list.filter((c) => c.enrollmentStatus === 'open' || (!c.enrollmentStatus && c.status === 'published'));
    } else if (statusFilter === 'coming_soon') {
      list = list.filter((c) => c.enrollmentStatus === 'coming_soon' || (c as any).status === 'coming_soon');
    } else if (statusFilter === 'live') {
      list = list.filter((c) => c.enrollmentStatus === 'live');
    }
    return list;
  }, [courses, statusFilter]);

  // Duplicate items to create infinite looping stream
  const marqueeItems = useMemo(() => {
    if (visibleCourses.length === 0) return [];
    // If fewer than 6, repeat multiple times so it stretches and scrolls seamlessly
    const multiplier = visibleCourses.length < 4 ? 4 : visibleCourses.length < 8 ? 3 : 2;
    const duplicated: Course[] = [];
    for (let i = 0; i < multiplier; i++) {
      duplicated.push(...visibleCourses);
    }
    return duplicated;
  }, [visibleCourses]);

  const handleScrollManual = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const amount = direction === 'left' ? -260 : 260;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (visibleCourses.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full overflow-hidden border-y border-teal-500/20 bg-gradient-to-b from-[#050C17] via-[#081528] to-[#050C17] py-6 select-none">
      {/* Decorative ambient glowing backdrops */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar with Stream Title, Filters, and Navigation Controls */}
      <div className="w-full max-w-[1920px] 2xl:max-w-[2400px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mb-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-3 border-b academy-divider">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-400">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Sacred Knowledge Programs in Motion</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
              Continuous Curriculum Showcase
            </h2>
            <p className="text-[11px] academy-text-secondary max-w-xl">
              Live cohorts, open enrollments, and upcoming academic programs. Class times convert to your local region ({detectedTz}).
            </p>
          </div>

          {/* Filter Pills & Interactive Stream Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg academy-elevated border border-teal-500/20">
              {[
                { key: 'all', label: 'All' },
                { key: 'open', label: '🟢 Open' },
                { key: 'live', label: '🔴 Live' },
                { key: 'coming_soon', label: '🟡 Coming Soon' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setStatusFilter(pill.key as any)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === pill.key
                      ? 'bg-teal-400 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Play/Pause & Scroll buttons */}
            <div className="flex items-center gap-1 academy-elevated p-0.5 rounded-lg border border-teal-500/20">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="p-1 rounded-md text-slate-300 hover:text-teal-300 hover:bg-white/5 transition-colors cursor-pointer"
                title={isPaused ? 'Resume Infinite Scroll' : 'Pause Infinite Scroll'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => handleScrollManual('left')}
                className="p-1 rounded-md text-slate-300 hover:text-teal-300 hover:bg-white/5 transition-colors cursor-pointer"
                title="Scroll Left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleScrollManual('right')}
                className="p-1 rounded-md text-slate-300 hover:text-teal-300 hover:bg-white/5 transition-colors cursor-pointer"
                title="Scroll Right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Infinite Horizontal Running Track */}
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto no-scrollbar scroll-smooth px-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`flex gap-4 w-max py-1 ${
            isPaused ? '' : 'animate-marquee-infinite'
          }`}
          style={{
            animationDuration: `${Math.max(25, marqueeItems.length * 4)}s`,
          }}
        >
          {marqueeItems.map((course, idx) => {
            const isEnrolled = enrolledCourseIds.includes(course.id);
            const courseLessons = lessons.filter((l) => l.courseId === course.id);
            const dbEnrollmentsCount = enrollments.filter((e) => e.courseId === course.id).length;
            const studentsTaken = dbEnrollmentsCount + (course.initialEnrolledCount || 0);
            const maxStudents = course.maxStudents || 25;
            const enrollmentRate =
              maxStudents > 0
                ? Math.min(100, Math.round((studentsTaken / maxStudents) * 100))
                : 0;
            const isCourseFull = maxStudents > 0 && studentsTaken >= maxStudents;

            const convertedClassTime = convertClassTimeToRegion(
              course.launchDate,
              course.classStartTime || '14:00',
              course.classTimezone || 'America/New_York',
              detectedTz
            );

            const isComingSoon = course.enrollmentStatus === 'coming_soon';
            const isLive = course.enrollmentStatus === 'live';

            return (
              <div
                key={`marquee-${course.id}-${idx}`}
                onClick={() => onViewCourseDetails(course)}
                className="relative w-[220px] sm:w-[260px] md:w-[300px] aspect-[16/10] shrink-0 rounded-2xl overflow-hidden border-2 border-slate-800/80 hover:border-amber-400/80 transition-all duration-300 group shadow-xl hover:shadow-[0_10px_30px_rgba(250,204,21,0.25)] hover:scale-105 cursor-pointer bg-slate-950"
                title={`${course.title} — Click to view details & enroll`}
              >
                {/* Course Thumbnail Image */}
                <img
                  src={resolveThumbnailUrl(course.thumbnailUrl)}
                  alt={course.title}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = ACADEMY_ASSETS.courseSeerah;
                  }}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Ambient vignette and darkening gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent group-hover:via-slate-950/15 transition-all" />

                {/* Status Badge */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 z-10">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-lg backdrop-blur-md ${
                      isLive
                        ? 'bg-rose-500/90 text-white border border-rose-400/40'
                        : isComingSoon
                        ? 'bg-amber-400/95 text-slate-950 border border-amber-300'
                        : 'bg-emerald-500/90 text-white border border-emerald-400/40'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span>
                      {isLive
                        ? 'Live'
                        : isComingSoon
                        ? 'Coming Soon'
                        : 'Open'}
                    </span>
                  </span>
                </div>

                {/* Course Price / Duration Pill */}
                <div className="absolute top-2.5 right-2.5 z-10">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono-tabular font-bold bg-slate-950/80 text-teal-300 border border-teal-500/30 backdrop-blur-sm shadow">
                    {course.price || 'Free'}
                  </span>
                </div>

                {/* Floating Title on bottom edge */}
                <div className="absolute bottom-0 inset-x-0 p-3 z-10 space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 drop-shadow-md">
                    {course.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-300">
                    <span className="text-teal-400 truncate max-w-[140px]">{course.category}</span>
                    <span className="text-slate-400 font-mono-tabular">{course.duration}</span>
                  </div>
                </div>

                {/* Hover Play / View Overlay Icon */}
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/30 backdrop-blur-[1px]">
                  <div className="w-11 h-11 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
