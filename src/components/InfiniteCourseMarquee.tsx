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
    let list = courses.filter((c) => c.status === 'published' || c.enrollmentStatus);
    if (statusFilter === 'open') {
      list = list.filter((c) => c.enrollmentStatus === 'open' || !c.enrollmentStatus);
    } else if (statusFilter === 'coming_soon') {
      list = list.filter((c) => c.enrollmentStatus === 'coming_soon');
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
    const amount = direction === 'left' ? -380 : 380;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (visibleCourses.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full overflow-hidden border-y border-teal-500/20 bg-gradient-to-b from-[#050C17] via-[#081528] to-[#050C17] py-8 lg:py-12 select-none">
      {/* Decorative ambient glowing backdrops */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar with Stream Title, Filters, and Navigation Controls */}
      <div className="w-full max-w-[1920px] 2xl:max-w-[2400px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b academy-divider">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Continuous Curriculum Showcase · Source Code Stream</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-white">
              Sacred Knowledge Programs in Motion
            </h2>
            <p className="text-xs academy-text-secondary max-w-2xl">
              Browse live cohorts, open enrollments, and upcoming academic programs. Class times automatically convert to your local region ({detectedTz}).
            </p>
          </div>

          {/* Filter Pills & Interactive Stream Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl academy-elevated border border-teal-500/20">
              {[
                { key: 'all', label: 'All Programs' },
                { key: 'open', label: '🟢 Open for Enrollment' },
                { key: 'live', label: '🔴 Live Cohorts' },
                { key: 'coming_soon', label: '🟡 Coming Soon' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setStatusFilter(pill.key as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
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
            <div className="flex items-center gap-1.5 academy-elevated p-1 rounded-xl border border-teal-500/20">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-teal-300 hover:bg-white/5 transition-colors cursor-pointer"
                title={isPaused ? 'Resume Infinite Scroll' : 'Pause Infinite Scroll'}
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handleScrollManual('left')}
                className="p-1.5 rounded-lg text-slate-300 hover:text-teal-300 hover:bg-white/5 transition-colors cursor-pointer"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScrollManual('right')}
                className="p-1.5 rounded-lg text-slate-300 hover:text-teal-300 hover:bg-white/5 transition-colors cursor-pointer"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
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
          className={`flex gap-6 w-max py-2 ${
            isPaused ? '' : 'animate-marquee-infinite'
          }`}
          style={{
            animationDuration: `${Math.max(30, marqueeItems.length * 5)}s`,
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
            const isOpen = !isComingSoon && !isLive;

            return (
              <div
                key={`marquee-${course.id}-${idx}`}
                className="w-[340px] sm:w-[380px] shrink-0 rounded-2xl overflow-hidden academy-surface border border-slate-800 hover:border-teal-400/50 transition-all duration-300 flex flex-col justify-between group shadow-xl hover:shadow-2xl hover:-translate-y-1 bg-[#061224]/90 backdrop-blur-md"
              >
                <div>
                  {/* Thumbnail with overlay badges */}
                  <div
                    onClick={() => onViewCourseDetails(course)}
                    className="relative h-44 overflow-hidden bg-slate-950 cursor-pointer"
                  >
                    <img
                      src={resolveThumbnailUrl(course.thumbnailUrl)}
                      alt={course.title}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = ACADEMY_ASSETS.courseSeerah;
                      }}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#061224] via-[#061224]/30 to-transparent" />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-lg backdrop-blur-md ${
                          isLive
                            ? 'bg-rose-500/90 text-white'
                            : isComingSoon
                            ? 'bg-amber-400/90 text-slate-950'
                            : 'bg-emerald-500/90 text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>
                          {isLive
                            ? 'Live Cohort'
                            : isComingSoon
                            ? 'Coming Soon'
                            : 'Open for Enrollment'}
                        </span>
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-teal-300 font-mono-tabular">
                      <span className="bg-slate-950/70 px-2 py-0.5 rounded backdrop-blur-sm border border-slate-800">
                        {course.duration}
                      </span>
                      <span className="bg-slate-950/70 px-2 py-0.5 rounded font-bold text-white backdrop-blur-sm border border-slate-800">
                        {course.price || 'Free'}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-teal-400 font-medium">
                      <span>{course.category}</span>
                      <span className="text-slate-400 truncate max-w-[150px]">
                        Faculty: {course.instructorName}
                      </span>
                    </div>

                    <h3
                      onClick={() => onViewCourseDetails(course)}
                      className="font-display text-lg font-bold text-white hover:text-teal-300 transition-colors cursor-pointer line-clamp-1"
                    >
                      {course.title}
                    </h3>

                    <p className="text-xs academy-text-secondary line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    {/* Converted Local Timezone Schedule */}
                    <div className="flex items-center gap-1.5 text-[11px] text-teal-300 font-mono-tabular bg-teal-950/30 px-2.5 py-1.5 rounded-lg border border-teal-500/20">
                      <Globe className="w-3.5 h-3.5 shrink-0 text-teal-400" />
                      <span className="truncate">
                        {course.classDays || 'Sat & Wed'} · {convertedClassTime.formattedLocalTime}
                      </span>
                    </div>

                    {/* Student Capacity Progress Bar */}
                    <div className="space-y-1 text-xs font-mono-tabular">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 academy-text-secondary">
                          <Users className="w-3 h-3 text-teal-400" />
                          <span>
                            {studentsTaken}/{maxStudents} Students
                          </span>
                        </span>
                        <span className={isCourseFull ? 'text-rose-400 font-bold' : 'text-teal-400'}>
                          {enrollmentRate}% Enrolled
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isCourseFull ? 'bg-rose-500' : 'bg-teal-400'
                          }`}
                          style={{ width: `${enrollmentRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onWatchCourse(course)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Recordings ({courseLessons.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onViewCourseDetails(course)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 text-teal-300 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                  </div>

                  {!isEnrolled && !isComingSoon && !isCourseFull && (
                    <button
                      type="button"
                      onClick={() => onEnrollCourse(course)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 shadow-md transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Enroll in Course ({course.price || 'Free'})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
