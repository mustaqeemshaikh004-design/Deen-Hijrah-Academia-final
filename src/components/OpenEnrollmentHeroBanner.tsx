import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Sparkles,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  X,
  Flame,
  Globe,
  Award,
} from 'lucide-react';
import { Course, parseCourseTags } from '../types.ts';
import { resolveThumbnailUrl, ACADEMY_ASSETS } from '../lib/assets.ts';

interface OpenEnrollmentHeroBannerProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  enrolledCourseIds: number[];
  onStartEnroll: (course: Course) => void;
  onExploreCourses: () => void;
}

export const OpenEnrollmentHeroBanner: React.FC<OpenEnrollmentHeroBannerProps> = ({
  isOpen,
  onClose,
  courses,
  enrolledCourseIds,
  onStartEnroll,
  onExploreCourses,
}) => {
  // Filter courses that are published and not coming soon
  const openCourses = courses.filter((c) => {
    return c.status === 'published' && c.enrollmentStatus !== 'coming_soon';
  });

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    openCourses[0]?.id ?? null
  );

  // Keep selected course valid
  useEffect(() => {
    if (openCourses.length > 0) {
      if (!selectedCourseId || !openCourses.some((c) => c.id === selectedCourseId)) {
        setSelectedCourseId(openCourses[0].id);
      }
    }
  }, [openCourses, selectedCourseId]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // If no open courses or modal is not open, return null
  if (!isOpen || openCourses.length === 0) return null;

  const activeCourse =
    openCourses.find((c) => c.id === selectedCourseId) || openCourses[0];

  const isEnrolledInActive = enrolledCourseIds.includes(activeCourse.id);

  // Student capacity math
  const maxCap = activeCourse.maxStudents || 25;
  const currentCount = activeCourse.initialEnrolledCount || 0;
  const seatsLeft = Math.max(0, maxCap - currentCount);
  const percentFilled = Math.min(100, Math.round((currentCount / maxCap) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop: Dark Obsidian Glass Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity"
        />

        {/* THE GRAND FEATURED OPEN FOR ENROLLMENT BOX (Seerahverse / Source Code Style) */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="enrollment-modal-title"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-5xl my-auto rounded-3xl bg-gradient-to-br from-[#040C1A] via-[#071930] to-[#030914] border-2 border-amber-400/80 shadow-[0_25px_80px_rgba(250,204,21,0.22)] p-6 sm:p-8 lg:p-10 space-y-6 ring-2 ring-amber-400/30 overflow-hidden"
        >
          {/* Ambient Decorative Islamic Glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-28 -left-28 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-28 -right-28 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent" />
          </div>

          {/* Top Bar with Tagline & THE PROMINENT CLOSE / CROSS BUTTON */}
          <div className="relative z-10 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25 ring-2 ring-amber-400/60">
                <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                <span>Admissions Open Now · Cohort 2026</span>
              </div>

              <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-teal-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Deen Hijrah Academia · Classical Scholarship</span>
              </div>
            </div>

            {/* THE PROMINENT CROSS (✕) BUTTON: Users can easily dismiss this announcement */}
            <button
              type="button"
              onClick={onClose}
              title="Close Announcement (Cross out)"
              className="group flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-900/90 hover:bg-amber-400 text-slate-300 hover:text-slate-950 border border-amber-400/40 hover:border-amber-400 font-bold text-xs sm:text-sm transition-all shadow-lg active:scale-95 shrink-0 cursor-pointer"
            >
              <span>Close</span>
              <div className="w-5 h-5 rounded-lg bg-white/10 group-hover:bg-slate-950/20 flex items-center justify-center transition-colors">
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </button>
          </div>

          {/* Program Selector Tabs if multiple courses are open */}
          {openCourses.length > 1 && (
            <div className="relative z-10 flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 mr-1 font-medium">Select Cohort:</span>
              {openCourses.map((c) => {
                const isSelected = c.id === activeCourse.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCourseId(c.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/60 shadow-lg'
                        : 'academy-surface text-slate-300 hover:text-white hover:border-teal-400/50'
                    }`}
                  >
                    {c.title}
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Grid: Details + Poster */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 7 Columns: Program Specs, Times & Action CTAs */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/40 uppercase tracking-wider text-[11px]">
                    {activeCourse.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px]">
                    {activeCourse.duration || '8 Weeks Cohort'}
                  </span>
                  {parseCourseTags(activeCourse).map((tag, tIdx) => {
                    const isLive = tag.toLowerCase().includes('live');
                    const isOpen = tag.toLowerCase().includes('open');
                    return (
                      <span
                        key={tIdx}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                          isLive
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                            : isOpen
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/10 text-white border border-white/20'
                        }`}
                      >
                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                        {isOpen && !isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                        <span>{tag}</span>
                      </span>
                    );
                  })}
                  <span className="text-slate-300 text-[11px]">
                    Principal Faculty: Ustadh {activeCourse.instructorName || 'Mustaqeem Shaikh'}
                  </span>
                </div>

                <h2
                  id="enrollment-modal-title"
                  className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md leading-tight"
                >
                  {activeCourse.title}
                </h2>

                <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
                  {activeCourse.description}
                </p>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Spec 1: Class Days */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                  <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-300" />
                    <span>Class Days</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white">
                    {activeCourse.classDays || 'Saturday & Wednesday'}
                  </div>
                </div>

                {/* Spec 2: Live Zoom Seminar */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                  <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-300" />
                    <span>Live Zoom Seminar</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white">
                    {activeCourse.classStartTime || '14:00'} ({activeCourse.classTimezone?.split('/')[1]?.replace('_', ' ') || 'EST'})
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Auto-converts to your local timezone
                  </div>
                </div>

                {/* Spec 3: Capacity & Seats Remaining */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-amber-400/40 space-y-1.5">
                  <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cohort Size</span>
                    </span>
                    <span className="font-mono-tabular text-amber-400 font-black">
                      {seatsLeft > 0 ? `${seatsLeft} Seats Left` : 'Cohort Full'}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-amber-400 transition-all duration-500 rounded-full"
                      style={{ width: `${percentFilled}%` }}
                    />
                  </div>

                  <div className="text-[9px] text-slate-400 flex items-center justify-between font-mono-tabular">
                    <span>{currentCount} Enrolled</span>
                    <span>Max {maxCap} Students</span>
                  </div>
                </div>
              </div>

              {/* Big Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                {isEnrolledInActive ? (
                  <div className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-300 text-sm font-black shadow-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>You Are Enrolled in This Cohort</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartEnroll(activeCourse);
                    }}
                    className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm sm:text-base bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow-2xl shadow-amber-400/30 hover:shadow-amber-400/50 hover:scale-102 active:scale-98 transition-all cursor-pointer"
                  >
                    <GraduationCap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span>ENROLL NOW — RESERVE YOUR SEAT</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    const el =
                      document.getElementById(`course-${activeCourse.id}`) ||
                      document.getElementById('courses-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else onExploreCourses();
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-teal-400" />
                  <span>View Full Syllabus &amp; Modules</span>
                </button>
              </div>
            </div>

            {/* Right 5 Columns: Poster & Desk Tag */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-video sm:aspect-[4/3] rounded-3xl overflow-hidden border-2 border-amber-400/60 shadow-2xl group">
                <img
                  src={resolveThumbnailUrl(activeCourse.thumbnailUrl)}
                  alt={activeCourse.title}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = ACADEMY_ASSETS.courseSeerah;
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Floating Badges */}
                <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-lg">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>Cohort Registration Open</span>
                  </span>
                </div>

                <div className="absolute bottom-4 inset-x-4 z-10 p-3.5 rounded-2xl bg-[#040A14]/90 backdrop-blur-md border border-white/10 space-y-1">
                  <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                    Official Admissions Desk
                  </div>
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Includes Live Zoom, Folios &amp; LMS Portal</span>
                    <span className="text-teal-300 font-mono-tabular font-bold">
                      {activeCourse.price || 'Free Tuition'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
