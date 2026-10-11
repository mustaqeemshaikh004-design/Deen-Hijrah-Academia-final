import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  BookOpen,
  Calendar,
  Clock,
  User,
  Mail,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Heart,
  Globe,
  Video,
  CheckCircle2,
  Lock,
  Layers,
  GraduationCap,
  Download,
  Share2,
} from 'lucide-react';
import { Course, Profile, parseCourseTags } from '../types.ts';
import { resolveThumbnailUrl } from '../lib/assets.ts';
import { getDetectedUserTimezone, convertClassTimeToRegion } from '../lib/timezone.ts';

interface CoolEnrollmentViewProps {
  courses: Course[];
  initialSelectedCourseId?: number | null;
  profile: Profile | null;
  enrolledCourseIds: number[];
  onCompleteEnrollment: (courseId: number, data?: any) => Promise<void>;
  onOpenClassroom: (courseId: number) => void;
  onOpenDashboard: () => void;
  onBackToCatalog?: () => void;
}

export const CoolEnrollmentView: React.FC<CoolEnrollmentViewProps> = ({
  courses,
  initialSelectedCourseId,
  profile,
  enrolledCourseIds,
  onCompleteEnrollment,
  onOpenClassroom,
  onOpenDashboard,
  onBackToCatalog,
}) => {
  const publishedCourses = useMemo(
    () => courses.filter((c) => c.status === 'published' && c.enrollmentStatus !== 'coming_soon'),
    [courses]
  );

  const [selectedCourseId, setSelectedCourseId] = useState<number>(() => {
    if (initialSelectedCourseId && courses.some((c) => c.id === initialSelectedCourseId)) {
      return initialSelectedCourseId;
    }
    const openCourses = publishedCourses.filter((c) => !enrolledCourseIds.includes(c.id));
    return openCourses[0]?.id || publishedCourses[0]?.id || 0;
  });

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || publishedCourses[0],
    [courses, selectedCourseId, publishedCourses]
  );

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [cohortTrack, setCohortTrack] = useState<'interactive' | 'self_paced'>('interactive');
  const [studentName, setStudentName] = useState(profile?.fullName || '');
  const [studentEmail, setStudentEmail] = useState(profile?.email || '');
  const [knowledgeLevel, setKnowledgeLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [weeklyCommitmentHours, setWeeklyCommitmentHours] = useState('3-5');
  const [niyyahText, setNiyyahText] = useState(
    'Seeking authentic sacred knowledge to deepen understanding of Allah’s revelation and implement Prophetic wisdom with ikhlas (sincerity).'
  );

  // Adab & Honor Code Pledges
  const [pledgeSincerity, setPledgeSincerity] = useState(true);
  const [pledgeAttendance, setPledgeAttendance] = useState(true);
  const [pledgeAdab, setPledgeAdab] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrolledCourseData, setEnrolledCourseData] = useState<Course | null>(null);

  const detectedTz = useMemo(() => getDetectedUserTimezone(), []);

  const convertedTime = useMemo(() => {
    if (!selectedCourse) return null;
    return convertClassTimeToRegion(
      selectedCourse.launchDate || '2026-10-15',
      selectedCourse.classStartTime || '14:00',
      selectedCourse.classTimezone || 'America/New_York',
      detectedTz
    );
  }, [selectedCourse, detectedTz]);

  const alreadyEnrolled = selectedCourse ? enrolledCourseIds.includes(selectedCourse.id) : false;

  const handleEnrollSubmit = async () => {
    if (!selectedCourse) return;
    setIsSubmitting(true);
    try {
      await onCompleteEnrollment(selectedCourse.id, {
        cohortTrack,
        knowledgeLevel,
        weeklyCommitmentHours,
        niyyahText,
      });
      setEnrolledCourseData(selectedCourse);
      setStep(5);
    } catch (err) {
      console.error('Enrollment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Select Course', desc: 'Curriculum & Schedule' },
    { num: 2, title: 'Cohort Track', desc: 'Live vs Self-Paced' },
    { num: 3, title: 'Sacred Intention', desc: 'Niyyah & Background' },
    { num: 4, title: 'Adab Pledge', desc: 'Honor Code' },
    { num: 5, title: 'Mubarak!', desc: 'Cohort Matriculation' },
  ];

  return (
    <div className="w-full max-w-[1720px] 2xl:max-w-[2100px] mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12 space-y-8 animate-fade-in">
      {/* Top Banner & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b academy-divider">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>2026 / 1447 Academic Cohort Matriculation</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Sacred Knowledge Enrollment Portal
          </h1>
          <p className="text-sm academy-text-secondary mt-1.5 max-w-2xl">
            Formalize your commitment to traditional Islamic studies under qualified scholars with direct guidance and interactive class recordings.
          </p>
        </div>

        {onBackToCatalog && (
          <button
            type="button"
            onClick={onBackToCatalog}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 text-teal-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Catalog</span>
          </button>
        )}
      </div>

      {/* Cool Interactive Stepper Header */}
      <div className="w-full academy-surface p-4 sm:p-6 rounded-2xl border border-teal-500/25 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stepsList.map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div
                key={s.num}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-teal-500/15 border border-teal-400/50 shadow-md shadow-teal-500/10'
                    : isCompleted
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-black/20 border border-white/5 opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 font-mono-tabular transition-transform ${
                    isActive
                      ? 'bg-teal-400 text-slate-950 scale-105 ring-2 ring-teal-400/30'
                      : isCompleted
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-xs font-bold truncate ${
                      isActive ? 'text-teal-300' : isCompleted ? 'text-emerald-300' : 'text-slate-300'
                    }`}
                  >
                    {s.title}
                  </div>
                  <div className="text-[10px] academy-text-muted truncate">{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form Body by Step */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          {/* STEP 1: SELECT COURSE & REVIEW SCHEDULE */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-teal-400" />
                    <span>Step 1: Choose Your Sacred Course</span>
                  </h2>
                  <p className="text-xs academy-text-secondary mt-0.5">
                    Select an open cohort to view its live syllabus, schedule converted to your local time, and faculty details.
                  </p>
                </div>
                <span className="text-xs font-mono-tabular text-teal-400">
                  {publishedCourses.length} Open Courses Available
                </span>
              </div>

              {/* Course Selection Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {publishedCourses.map((c) => {
                  const isSelected = selectedCourse?.id === c.id;
                  const isEnrolled = enrolledCourseIds.includes(c.id);
                  const tags = parseCourseTags(c);
                  const seatsFilled = c.initialEnrolledCount || 18;
                  const maxSeats = c.maxStudents || 25;
                  const percentFilled = Math.min(100, Math.round((seatsFilled / maxSeats) * 100));

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCourseId(c.id)}
                      className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col p-5 ${
                        isSelected
                          ? 'academy-surface border-2 border-teal-400 ring-4 ring-teal-500/20 shadow-2xl scale-[1.01]'
                          : 'academy-surface border border-slate-800 hover:border-teal-500/40 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {/* Active Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full bg-teal-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Selected</span>
                        </div>
                      )}

                      {/* Header & Badges */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30">
                          {c.category}
                        </span>
                        {isEnrolled && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Already Enrolled
                          </span>
                        )}
                      </div>

                      {/* Title & Instructor */}
                      <h3 className="font-display text-lg font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-1">
                        {c.title}
                      </h3>
                      <p className="text-xs text-amber-300 font-medium mt-0.5">
                        Ustadh {c.instructorName}
                      </p>

                      <p className="text-xs academy-text-secondary mt-2 line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-300 border border-white/5"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Seats Progress */}
                      <div className="mt-auto pt-4 border-t academy-divider space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                          <span className="academy-text-secondary">Seats Remaining:</span>
                          <span className="text-teal-400 font-bold">
                            {Math.max(0, maxSeats - seatsFilled)} of {maxSeats} spots left
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                            style={{ width: `${percentFilled}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Course Deep Dive Summary */}
              {selectedCourse && (
                <div className="p-5 sm:p-6 rounded-2xl bg-teal-950/20 border border-teal-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
                        Active Selection Summary
                      </span>
                      <h3 className="font-display text-xl font-bold text-white">
                        {selectedCourse.title}
                      </h3>
                    </div>
                    {convertedTime && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-teal-500/40 text-xs text-teal-300 font-mono-tabular">
                        <Globe className="w-4 h-4 text-teal-400" />
                        <span>Converts to: {convertedTime.formattedLocalTime} ({convertedTime.targetTimezone})</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono-tabular">
                    <div className="p-3 rounded-xl academy-surface border border-white/5">
                      <span className="academy-text-muted block text-[10px]">FACULTY</span>
                      <span className="font-bold text-white">Ustadh {selectedCourse.instructorName}</span>
                    </div>
                    <div className="p-3 rounded-xl academy-surface border border-white/5">
                      <span className="academy-text-muted block text-[10px]">RECORDINGS ARCHIVE</span>
                      <span className="font-bold text-teal-300">Full Lifetime Access Included</span>
                    </div>
                    <div className="p-3 rounded-xl academy-surface border border-white/5">
                      <span className="academy-text-muted block text-[10px]">TUITION / SPONSORSHIP</span>
                      <span className="font-bold text-emerald-400">100% Free · Waqf Endowed</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={!selectedCourse || alreadyEnrolled}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-teal-500/20"
                >
                  <span>{alreadyEnrolled ? 'Already Enrolled' : 'Proceed to Track Selection'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: COHORT TRACK */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-teal-400" />
                  <span>Step 2: Choose Your Academic Track</span>
                </h2>
                <p className="text-xs academy-text-secondary mt-0.5">
                  Decide how you will engage with Ustadh {selectedCourse?.instructorName} and the course materials.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Track 1: Interactive Live Cohort */}
                <div
                  onClick={() => setCohortTrack('interactive')}
                  className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border flex flex-col space-y-4 ${
                    cohortTrack === 'interactive'
                      ? 'academy-surface border-2 border-teal-400 ring-4 ring-teal-500/20 shadow-2xl'
                      : 'academy-surface border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-400/20 text-teal-300 border border-teal-400/40">
                      Recommended
                    </span>
                    {cohortTrack === 'interactive' && (
                      <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                      <Video className="w-5 h-5 text-teal-400" />
                      <span>Interactive Live Cohort</span>
                    </h3>
                    <p className="text-xs academy-text-secondary mt-1 leading-relaxed">
                      Attend live interactive Zoom seminars, engage in real-time Q&A with the Ustadh, participate in homework reviews, and maintain an attendance streak.
                    </p>
                  </div>
                  <ul className="space-y-2 text-xs academy-text-secondary pt-2 border-t academy-divider">
                    <li className="flex items-center gap-2 text-slate-200">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Weekly Live Zoom Seminars</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-200">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Tutor Graded Homework & Direct Feedback</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-200">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Full Access to All Recorded Lectures</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-200">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Official Certificate of Completion</span>
                    </li>
                  </ul>
                </div>

                {/* Track 2: Self-Paced Sanctuary */}
                <div
                  onClick={() => setCohortTrack('self_paced')}
                  className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border flex flex-col space-y-4 ${
                    cohortTrack === 'self_paced'
                      ? 'academy-surface border-2 border-teal-400 ring-4 ring-teal-500/20 shadow-2xl'
                      : 'academy-surface border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      Self-Paced
                    </span>
                    {cohortTrack === 'self_paced' && (
                      <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <span>Self-Paced Sanctuary Track</span>
                    </h3>
                    <p className="text-xs academy-text-secondary mt-1 leading-relaxed">
                      Watch HD class recordings at your own speed with downloadable worksheets and reading packets. Ideal for busy professionals or differing timezones.
                    </p>
                  </div>
                  <ul className="space-y-2 text-xs academy-text-secondary pt-2 border-t academy-divider">
                    <li className="flex items-center gap-2 text-slate-200">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Lifetime HD Class Recordings Vault</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-200">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Interactive Syllabus Modules & Worksheets</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-200">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Study Notes & Video Bookmarking</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-200">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Ask Tutors via Asynchronous Student Chat</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Course</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-all shadow-lg shadow-teal-500/20"
                >
                  <span>Continue to Sacred Intention</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: SACRED INTENTION & PROFILE */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-400" />
                  <span>Step 3: Student Profile & Sacred Niyyah (Intention)</span>
                </h2>
                <p className="text-xs academy-text-secondary mt-0.5">
                  The Prophet ﷺ said: &quot;Actions are judged by intentions.&quot; Formulate your objective for seeking this knowledge.
                </p>
              </div>

              <div className="p-6 rounded-2xl academy-surface border border-teal-500/30 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Legal / Student Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Tariq Ibn Ziyad"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Current Knowledge Level in this Topic
                    </label>
                    <select
                      value={knowledgeLevel}
                      onChange={(e) => setKnowledgeLevel(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400"
                    >
                      <option value="beginner">Foundational / Beginner Seeker</option>
                      <option value="intermediate">Intermediate / Previous Islamic Studies</option>
                      <option value="advanced">Advanced Student / Madrasah Background</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Estimated Weekly Study Commitment
                    </label>
                    <select
                      value={weeklyCommitmentHours}
                      onChange={(e) => setWeeklyCommitmentHours(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400"
                    >
                      <option value="1-2">1–2 Hours Weekly (Audio & Review)</option>
                      <option value="3-5">3–5 Hours Weekly (Standard Cohort)</option>
                      <option value="6+">6+ Hours Weekly (Intensive Research)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Sacred Niyyah (Personal Intention Statement)
                  </label>
                  <textarea
                    rows={3}
                    value={niyyahText}
                    onChange={(e) => setNiyyahText(e.target.value)}
                    placeholder="Write your intention for learning..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400 leading-relaxed"
                  />
                  <span className="text-[11px] academy-text-muted mt-1 block">
                    This will be preserved in your student portfolio to periodically renew your sincere purpose.
                  </span>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={!studentName.trim() || !studentEmail.trim()}
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 disabled:opacity-40 transition-all shadow-lg shadow-teal-500/20"
                >
                  <span>Review Adab Pledge</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: ADAB PLEDGE & HONOR CODE */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                  <span>Step 4: Academic Honor Code &amp; Adab Pledge</span>
                </h2>
                <p className="text-xs academy-text-secondary mt-0.5">
                  Adab (spiritual decorum) precedes knowledge. Agree to the traditional student pledges before final matriculation.
                </p>
              </div>

              <div className="p-6 rounded-2xl academy-surface border border-teal-500/30 space-y-4">
                <label className="flex items-start gap-3 p-3.5 rounded-xl academy-elevated border border-white/5 cursor-pointer hover:border-teal-500/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={pledgeSincerity}
                    onChange={(e) => setPledgeSincerity(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-teal-400 focus:ring-teal-400 accent-teal-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      1. Pledge of Sincerity (Ikhlas)
                    </span>
                    <span className="text-[11px] academy-text-secondary leading-relaxed">
                      I pledge to seek this sacred knowledge purely for the pleasure of Allah, to remove ignorance from myself, and to embody the teachings of the Messenger of Allah ﷺ.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl academy-elevated border border-white/5 cursor-pointer hover:border-teal-500/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={pledgeAttendance}
                    onChange={(e) => setPledgeAttendance(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-teal-400 focus:ring-teal-400 accent-teal-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      2. Pledge of Diligence &amp; Consistency (Istiqamah)
                    </span>
                    <span className="text-[11px] academy-text-secondary leading-relaxed">
                      I will treat recordings and live sessions with seriousness, complete readings on time, and avoid frivolous absent-mindedness during sacred study.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl academy-elevated border border-white/5 cursor-pointer hover:border-teal-500/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={pledgeAdab}
                    onChange={(e) => setPledgeAdab(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-teal-400 focus:ring-teal-400 accent-teal-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      3. Decorum Towards Teachers &amp; Peers
                    </span>
                    <span className="text-[11px] academy-text-secondary leading-relaxed">
                      I will maintain humility and utmost respect in all forum messages, student chat rooms, and live Q&A interactions with teachers and fellow seekers.
                    </span>
                  </div>
                </label>
              </div>

              {/* Navigation & Submit */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !pledgeSincerity || !pledgeAttendance || !pledgeAdab}
                  onClick={handleEnrollSubmit}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 hover:from-teal-300 hover:to-emerald-300 disabled:opacity-40 transition-all shadow-xl shadow-teal-500/30"
                >
                  {isSubmitting ? (
                    <span>Registering Enrollment...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Complete Enrollment Now</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: CELEBRATION & MATRICULATION PASS */}
          {step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 max-w-2xl mx-auto text-center"
            >
              {/* Confetti / Celebration Header */}
              <div className="relative p-8 rounded-3xl academy-surface border-2 border-teal-400/60 shadow-2xl space-y-5 overflow-hidden">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/20 border border-teal-400/50 flex items-center justify-center text-teal-400 shadow-xl shadow-teal-500/20">
                  <GraduationCap className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-widest font-mono-tabular">
                    Mubarak! Registration Confirmed
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                    Welcome to the {enrolledCourseData?.title || 'Academic'} Cohort
                  </h2>
                  <p className="text-xs academy-text-secondary mt-1.5 max-w-md mx-auto leading-relaxed">
                    As-salamu alaykum, <strong className="text-teal-300">{studentName}</strong>. Your seat is officially reserved and your student dashboard is unlocked!
                  </p>
                </div>

                {/* Digital Student Matriculation Badge */}
                <div className="p-4 rounded-2xl bg-black/70 border border-teal-500/30 text-left space-y-3 font-mono-tabular text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-teal-500/20">
                    <span className="text-teal-300 font-bold">DEEN HIJRAH ACADEMIA</span>
                    <span className="text-emerald-400">STUDENT MATRICULATION ID: DH-2026-{Math.floor(1000 + Math.random() * 9000)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="academy-text-muted block text-[10px]">STUDENT NAME:</span>
                      <span className="text-white font-bold">{studentName}</span>
                    </div>
                    <div>
                      <span className="academy-text-muted block text-[10px]">TRACK:</span>
                      <span className="text-teal-400 font-bold">
                        {cohortTrack === 'interactive' ? 'Interactive Live Cohort' : 'Self-Paced Sanctuary'}
                      </span>
                    </div>
                    <div>
                      <span className="academy-text-muted block text-[10px]">COURSE:</span>
                      <span className="text-white font-bold">{enrolledCourseData?.title}</span>
                    </div>
                    <div>
                      <span className="academy-text-muted block text-[10px]">STATUS:</span>
                      <span className="text-emerald-400 font-bold">ACTIVE ENROLLMENT</span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (enrolledCourseData) {
                        onOpenClassroom(enrolledCourseData.id);
                      } else {
                        onOpenDashboard();
                      }
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-all shadow-lg shadow-teal-500/20"
                  >
                    <Video className="w-4 h-4" />
                    <span>Watch Class Recordings &amp; Start Learning</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 text-teal-300 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Go to My Student Dashboard</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
