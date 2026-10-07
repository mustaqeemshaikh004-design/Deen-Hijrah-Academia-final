import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
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
} from 'lucide-react';
import { Course, Profile } from '../types.ts';
import { resolveThumbnailUrl, ACADEMY_ASSETS } from '../lib/assets.ts';
import { getDetectedUserTimezone, convertClassTimeToRegion } from '../lib/timezone.ts';

interface CourseEnrollmentModalProps {
  course: Course;
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteEnrollment: (courseId: number, enrollmentData?: any) => Promise<void>;
  onOpenClassroom: (courseId: number) => void;
  onOpenDashboard: () => void;
}

export const CourseEnrollmentModal: React.FC<CourseEnrollmentModalProps> = ({
  course,
  profile,
  isOpen,
  onClose,
  onCompleteEnrollment,
  onOpenClassroom,
  onOpenDashboard,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const detectedTz = getDetectedUserTimezone();
  const convertedTime = convertClassTimeToRegion(
    course.launchDate || '2026-10-15',
    course.classStartTime || '14:00',
    course.classTimezone || 'America/New_York',
    detectedTz
  );

  // Step 1: Cohort Track Mode
  const [cohortTrack, setCohortTrack] = useState<'interactive' | 'self_paced'>('interactive');

  // Step 2: Student Profile & Academic Intention
  const [studentName, setStudentName] = useState(profile?.fullName || '');
  const [studentEmail, setStudentEmail] = useState(profile?.email || '');
  const [knowledgeLevel, setKnowledgeLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [studyCommitment, setStudyCommitment] = useState(true);
  const [niyyahText, setNiyyahText] = useState(
    'Seeking authentic sacred knowledge to deepen understanding of Allah’s revelation and implement Prophetic wisdom.'
  );

  // Step 3: Honor Code & Adab Pledge
  const [pledgeSincerity, setPledgeSincerity] = useState(true);
  const [pledgeAttendance, setPledgeAttendance] = useState(true);
  const [pledgeRespect, setPledgeRespect] = useState(true);

  const canProceedStep2 =
    studentName.trim().length > 0 &&
    studentEmail.trim().length > 0 &&
    studyCommitment;

  const canProceedStep3 =
    pledgeSincerity && pledgeAttendance && pledgeRespect;

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onCompleteEnrollment(course.id, {
        cohortTrack,
        knowledgeLevel,
        niyyahText,
      });
      setIsSuccess(true);
      setStep(4);
    } catch (err) {
      console.error('Enrollment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-[#050D1A] border border-teal-500/40 rounded-3xl shadow-2xl overflow-hidden my-8"
      >
        {/* Header Bar */}
        <div className="p-6 bg-gradient-to-r from-teal-950/60 via-[#071324] to-slate-900 border-b border-teal-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-400/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                Official Admissions Portal · Step {step} of 4
              </span>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
                {step === 1 && 'Cohort & Program Confirmation'}
                {step === 2 && 'Student Academic Profile & Intention'}
                {step === 3 && 'Sacred Knowledge Pledge & Honor Code'}
                {step === 4 && 'Mubarak! Official Enrollment Complete'}
              </h2>
            </div>
          </div>

          {!isSuccess && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 4-Step Progress Bar Indicator */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-[#030811] border-b border-white/10 text-center text-[10px] font-semibold">
          {[
            { num: 1, label: '1. Program' },
            { num: 2, label: '2. Profile' },
            { num: 3, label: '3. Pledge' },
            { num: 4, label: '4. Confirmed' },
          ].map((s) => (
            <div
              key={s.num}
              className={`py-1.5 rounded-lg transition-all ${
                step === s.num
                  ? 'bg-teal-400 text-slate-950 font-bold shadow'
                  : step > s.num
                  ? 'bg-teal-950/60 text-teal-300 border border-teal-500/30'
                  : 'text-slate-500'
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: PROGRAM OVERVIEW & COHORT SELECTION */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Course Banner */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl academy-elevated border border-teal-500/30 bg-[#071324]/60">
                  <img
                    src={resolveThumbnailUrl(course.thumbnailUrl)}
                    alt={course.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = ACADEMY_ASSETS.courseSeerah;
                    }}
                    className="w-full sm:w-36 h-28 rounded-xl object-cover"
                  />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-400/20 text-teal-300">
                      {course.category}
                    </span>
                    <h3 className="font-display text-lg font-bold text-white truncate">
                      {course.title}
                    </h3>
                    <p className="text-xs academy-text-secondary line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-teal-300 font-medium">
                      <span>Faculty: {course.instructorName}</span>
                      <span>·</span>
                      <span>{course.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Schedule & Timezone Converted Timing */}
                <div className="p-4 rounded-2xl bg-[#040A14] border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <Globe className="w-4 h-4 text-teal-400" />
                    <span>Live Class Times in Your Timezone ({detectedTz})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <span className="text-slate-400 block text-[11px]">Class Days</span>
                      <strong className="text-white text-sm">
                        {course.classDays || 'Saturday & Wednesday'}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <span className="text-slate-400 block text-[11px]">Local Class Time</span>
                      <strong className="text-amber-300 font-mono-tabular text-sm">
                        {convertedTime.formattedLocalTime}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Cohort Track Option */}
                <div>
                  <label className="block text-xs font-bold text-white mb-2 uppercase tracking-wider">
                    Select Your Enrollment Track
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCohortTrack('interactive')}
                      className={`p-4 rounded-2xl text-left border transition-all ${
                        cohortTrack === 'interactive'
                          ? 'border-teal-400 bg-teal-400/15 ring-2 ring-teal-400/30'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-white flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-teal-400" />
                          Interactive Cohort
                        </span>
                        {cohortTrack === 'interactive' && (
                          <Check className="w-4 h-4 text-teal-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Join live Zoom webinars, submit weekly homework assignments, and receive 1-on-1 tutor feedback.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCohortTrack('self_paced')}
                      className={`p-4 rounded-2xl text-left border transition-all ${
                        cohortTrack === 'self_paced'
                          ? 'border-teal-400 bg-teal-400/15 ring-2 ring-teal-400/30'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-white flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-amber-400" />
                          Self-Paced Track
                        </span>
                        {cohortTrack === 'self_paced' && (
                          <Check className="w-4 h-4 text-teal-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Watch recorded lectures on demand and study syllabi at your own pace without homework deadlines.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 shadow-lg transition-transform hover:scale-102"
                  >
                    <span>Continue to Academic Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: STUDENT PROFILE & SACRED INTENTION (NIYYAH) */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-teal-400 mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Fatima Al-Zahra"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl academy-elevated border border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-teal-400 mb-1">
                      Student Academic Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl academy-elevated border border-slate-700 font-mono-tabular"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-teal-400 mb-1">
                    Prior Background in Islamic Studies
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'beginner', label: 'Beginner / First Term' },
                      { id: 'intermediate', label: 'Intermediate' },
                      { id: 'advanced', label: 'Advanced Student' },
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setKnowledgeLevel(lvl.id as any)}
                        className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                          knowledgeLevel === lvl.id
                            ? 'border-teal-400 bg-teal-400/20 text-teal-200 font-bold'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-teal-400 mb-1 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sacred Intention (Niyyah) for Seeking Knowledge</span>
                  </label>
                  <p className="text-[11px] academy-text-muted mb-1.5">
                    In classical pedagogy, clarifying one’s intention is the first step of learning.
                  </p>
                  <textarea
                    rows={2}
                    value={niyyahText}
                    onChange={(e) => setNiyyahText(e.target.value)}
                    placeholder="State your goal and intention for this course..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl academy-elevated border border-slate-700 leading-relaxed"
                  />
                </div>

                {/* Time Commitment Checkbox */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-teal-950/20 border border-teal-500/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={studyCommitment}
                    onChange={(e) => setStudyCommitment(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-teal-400 rounded focus:ring-teal-400 bg-slate-900 border-slate-700"
                  />
                  <div className="text-xs">
                    <strong className="text-white block font-semibold">
                      Time Commitment Agreement (3–5 Hours / Week)
                    </strong>
                    <span className="text-slate-300 text-[11px]">
                      I commit to dedicating sufficient study time each week to attend classes, review syllabi, and reflect on assigned readings.
                    </span>
                  </div>
                </label>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold academy-elevated text-slate-300 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    disabled={!canProceedStep2}
                    onClick={() => setStep(3)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 shadow-lg disabled:opacity-50 transition-transform hover:scale-102"
                  >
                    <span>Proceed to Honor Code Pledge</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: SACRED KNOWLEDGE PLEDGE & HONOR CODE */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-950/40 via-[#06101D] to-slate-950 border border-teal-500/30 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold uppercase tracking-wider text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <span>Deen Hijrah Academia Student Honor Code</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Seeking sacred knowledge (Talab al-Ilm) is an act of worship demanding sincerity, humility, and rigorous ethics. As an enrolled student of this academy, you agree to the following sacred covenants:
                  </p>

                  <div className="space-y-2.5 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pledgeSincerity}
                        onChange={(e) => setPledgeSincerity(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-teal-400 rounded focus:ring-teal-400 bg-slate-900 border-slate-700"
                      />
                      <span className="text-[11px] text-slate-200">
                        <strong>1. Ikhlas (Sincerity):</strong> I seek knowledge sincerely to understand the Deen, benefit society, and draw nearer to Allah.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pledgeAttendance}
                        onChange={(e) => setPledgeAttendance(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-teal-400 rounded focus:ring-teal-400 bg-slate-900 border-slate-700"
                      />
                      <span className="text-[11px] text-slate-200">
                        <strong>2. Adab &amp; Discipline:</strong> I will conduct myself with utmost respect towards faculty scholars, teaching assistants, and fellow cohort peers.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pledgeRespect}
                        onChange={(e) => setPledgeRespect(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-teal-400 rounded focus:ring-teal-400 bg-slate-900 border-slate-700"
                      />
                      <span className="text-[11px] text-slate-200">
                        <strong>3. Academic Integrity:</strong> All reflections, exam submissions, and homework will be my own earnest work.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Final Summary Card before submission */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Enrolling Student</span>
                    <strong className="text-white">{studentName}</strong> ({studentEmail})
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">Tuition Status</span>
                    <strong className="text-emerald-400 font-bold">Complimentary Scholarship</strong>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold academy-elevated text-slate-300 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    disabled={!canProceedStep3 || isSubmitting}
                    onClick={handleFinalSubmit}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 shadow-xl disabled:opacity-50 transition-all hover:scale-102"
                  >
                    {isSubmitting ? (
                      <span>Submitting Official Enrollment...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Sign Pledge &amp; Finalize Enrollment</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: CELEBRATION & ACCESS CONFIRMATION */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center space-y-5"
              >
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-teal-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-2xl shadow-teal-500/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Officially Admitted · Cohort 2026
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
                    Mubarak, {studentName}!
                  </h3>
                  <p className="text-xs sm:text-sm academy-text-secondary max-w-md mx-auto leading-relaxed">
                    You are officially enrolled in <strong className="text-teal-300">{course.title}</strong>. Your student credentials and lecture access have been activated.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#06101D] border border-teal-500/30 text-xs max-w-md mx-auto space-y-2 text-left">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Program:</span>
                    <strong className="text-white">{course.title}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Faculty Scholar:</span>
                    <strong className="text-white">{course.instructorName}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Cohort Schedule:</span>
                    <strong className="text-amber-300 font-mono-tabular">
                      {course.classDays || 'Sat & Wed'} · {convertedTime.formattedLocalTime}
                    </strong>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenClassroom(course.id);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 shadow-xl transition-all"
                  >
                    <Video className="w-4 h-4" />
                    <span>Enter Course Classroom Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDashboard();
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-semibold academy-elevated text-white hover:border-teal-400 transition-colors"
                  >
                    Go to Student Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
